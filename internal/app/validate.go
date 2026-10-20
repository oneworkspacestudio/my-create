package app

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"path"
	"strings"
)

const maxUpload = 32 << 20
const maxScene = 64 << 20

func detect(b []byte) (string, error) {
	if len(b) < 8 {
		return "", errors.New("File is empty or truncated")
	}
	switch {
	case bytes.HasPrefix(b, []byte("%PDF-")):
		return "pdf", nil
	case bytes.HasPrefix(b, []byte("\x89PNG\r\n\x1a\n")):
		return "png", nil
	case b[0] == 255 && b[1] == 216 && b[2] == 255:
		return "jpeg", nil
	case len(b) > 12 && string(b[:4]) == "RIFF" && string(b[8:12]) == "WEBP":
		return "webp", nil
	case string(b[:4]) == "8BPS":
		return "psd", nil
	case bytes.HasPrefix(b, []byte("PK\x03\x04")):
		return checkZip(b)
	}
	text := strings.TrimSpace(strings.TrimPrefix(string(b), "\ufeff"))
	if strings.HasPrefix(text, "<") {
		d := xml.NewDecoder(strings.NewReader(text))
		n := 0
		depth := 0
		for {
			t, e := d.Token()
			if e == io.EOF {
				break
			}
			if e != nil {
				return "", errors.New("Malformed SVG/XML")
			}
			switch v := t.(type) {
			case xml.Directive:
				return "", errors.New("XML declarations/entities are not allowed")
			case xml.StartElement:
				n++
				depth++
				if depth > 64 || n > 30000 {
					return "", errors.New("SVG nesting/object limit exceeded")
				}
				if n == 1 && v.Name.Local != "svg" {
					return "", errors.New("Not an SVG document")
				}
			case xml.EndElement:
				depth--
			}
		}
		if n > 0 {
			return "svg", nil
		}
	}
	return "", errors.New("Choose SVG, PPTX, PDF, PNG, JPEG, WebP, PSD or a My Create pack")
}

func checkZip(b []byte) (string, error) {
	z, e := zip.NewReader(bytes.NewReader(b), int64(len(b)))
	if e != nil {
		return "", errors.New("Invalid ZIP container")
	}
	if len(z.File) > 4096 {
		return "", errors.New("Archive has too many entries")
	}
	total := uint64(0)
	seen := map[string]bool{}
	ppt, pack := false, false
	for _, f := range z.File {
		name := f.Name
		if strings.ContainsAny(name, "\\\x00:") || strings.HasPrefix(name, "/") || strings.Contains("/"+name+"/", "/../") || path.Clean(name) != strings.TrimSuffix(name, "/") || seen[strings.ToLower(name)] || f.Mode()&os.ModeSymlink != 0 {
			return "", errors.New("Unsafe or duplicate archive path")
		}
		seen[strings.ToLower(name)] = true
		total += f.UncompressedSize64
		if f.UncompressedSize64 > 64<<20 || total > 128<<20 || f.UncompressedSize64 > 1<<20 && f.UncompressedSize64 > f.CompressedSize64*300 {
			return "", errors.New("Archive expansion limit exceeded")
		}
		if name == "ppt/presentation.xml" {
			ppt = true
		}
		if name == "manifest.json" {
			pack = true
		}
		if strings.HasSuffix(name, ".xml") || strings.HasSuffix(name, ".rels") {
			r, e := f.Open()
			if e != nil {
				return "", e
			}
			raw, e := io.ReadAll(io.LimitReader(r, 8<<20+1))
			r.Close()
			if e != nil || len(raw) > 8<<20 {
				return "", errors.New("XML entry is too large")
			}
			dec := xml.NewDecoder(bytes.NewReader(raw))
			depth, count := 0, 0
			for {
				t, e := dec.Token()
				if e == io.EOF {
					break
				}
				if e != nil {
					return "", errors.New("Malformed XML inside archive")
				}
				switch v := t.(type) {
				case xml.Directive:
					return "", errors.New("XML entities/DTD are not allowed")
				case xml.StartElement:
					depth++
					count++
					if depth > 64 || count > 100000 {
						return "", errors.New("XML limits exceeded")
					}
					if v.Name.Local == "Relationship" {
						for _, a := range v.Attr {
							if a.Name.Local == "Target" && (strings.ContainsAny(a.Value, "\\\x00") || strings.HasPrefix(a.Value, "/") || strings.Contains(a.Value, ":") && !strings.HasPrefix(a.Value, "https://") && !strings.HasPrefix(a.Value, "http://")) {
								return "", errors.New("Unsafe relationship target")
							}
						}
					}
				case xml.EndElement:
					depth--
				}
			}
		}
	}
	if ppt {
		return "pptx", nil
	}
	if pack {
		return "pack", nil
	}
	return "", errors.New("This ZIP is neither a PowerPoint presentation nor a My Create pack")
}

func validateScene(raw json.RawMessage) error {
	var doc map[string]any
	if e := json.Unmarshal(raw, &doc); e != nil {
		return errors.New("Invalid scene JSON")
	}
	if doc["schema"] != float64(1) {
		return errors.New("Unsupported scene version; update My Create")
	}
	pages, ok := doc["pages"].([]any)
	if !ok || len(pages) == 0 || len(pages) > 60 {
		return errors.New("Scene needs 1–60 pages")
	}
	ids := map[string]bool{}
	count := 0
	allowed := map[string]bool{"Rect": true, "Ellipse": true, "Circle": true, "Triangle": true, "Line": true, "Polygon": true, "Polyline": true, "Path": true, "Text": true, "IText": true, "Textbox": true, "Image": true, "Group": true}
	var object func(any, int) error
	object = func(v any, depth int) error {
		m, ok := v.(map[string]any)
		if !ok || depth > 32 {
			return errors.New("Invalid object/group depth")
		}
		count++
		if count > 12000 {
			return errors.New("Scene has too many objects")
		}
		typ, _ := m["type"].(string)
		if !allowed[typ] {
			return fmt.Errorf("Unsupported object type: %s", typ)
		}
		id, _ := m["id"].(string)
		if id == "" || len(id) > 100 || ids[id] {
			return errors.New("Objects require unique stable IDs")
		}
		ids[id] = true
		if children, ok := m["objects"].([]any); ok {
			for _, c := range children {
				if e := object(c, depth+1); e != nil {
					return e
				}
			}
		}
		// Fabric clip paths are non-scene objects but must obey the same type/URL limits.
		if clip, ok := m["clipPath"].(map[string]any); ok {
			if !allowed[fmt.Sprint(clip["type"])] {
				return errors.New("Unsafe clip path")
			}
		}
		return nil
	}
	for _, v := range pages {
		p, ok := v.(map[string]any)
		if !ok {
			return errors.New("Invalid page")
		}
		for _, key := range []string{"width", "height"} {
			n, ok := p[key].(float64)
			if !ok || n < 1 || n > 16000 {
				return errors.New("Page dimensions must be 1–16000 pixels")
			}
		}
		if p["width"].(float64)*p["height"].(float64) > 40e6 {
			return errors.New("Page exceeds 40 megapixels")
		}
		canvas, ok := p["canvas"].(map[string]any)
		if !ok {
			return errors.New("Page canvas missing")
		}
		objs, ok := canvas["objects"].([]any)
		if !ok {
			return errors.New("Page objects missing")
		}
		for _, o := range objs {
			if e := object(o, 0); e != nil {
				return e
			}
		}
	}
	var walk func(any, int) error
	walk = func(v any, d int) error {
		if d > 80 {
			return errors.New("Scene nesting exceeded")
		}
		switch x := v.(type) {
		case map[string]any:
			if typ, ok := x["type"].(string); ok && !allowed[typ] && typ != "linear" && typ != "radial" && typ != "pattern" && typ != "layoutManager" {
				return errors.New("Unsupported nested scene type")
			}
			for k, val := range x {
				if k == "__proto__" || k == "constructor" || k == "prototype" {
					return errors.New("Unsafe object key")
				}
				if k == "src" || k == "preview" || (k == "source" && x["type"] == "pattern") {
					s, ok := val.(string)
					if !ok || s != "" && !(strings.HasPrefix(s, "data:image/png;base64,") || strings.HasPrefix(s, "data:image/jpeg;base64,") || strings.HasPrefix(s, "data:image/webp;base64,")) {
						return errors.New("Only embedded PNG/JPEG/WebP assets are allowed")
					}
				}
				if e := walk(val, d+1); e != nil {
					return e
				}
			}
		case []any:
			if len(x) > 200000 {
				return errors.New("Scene array exceeds limit")
			}
			for _, val := range x {
				if e := walk(val, d+1); e != nil {
					return e
				}
			}
		case float64:
			if math.IsNaN(x) || math.IsInf(x, 0) || math.Abs(x) > 1e9 {
				return errors.New("Invalid scene number")
			}
		case string:
			if len(x) > 48<<20 {
				return errors.New("Scene field too large")
			}
		}
		return nil
	}
	return walk(doc, 0)
}
