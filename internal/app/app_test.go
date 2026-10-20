package app

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDetectionUsesContentAndArchiveLimits(t *testing.T) {
	for _, tc := range []struct{ b, format string }{{`<svg xmlns="http://www.w3.org/2000/svg"><text>Hello</text></svg>`, "svg"}, {"%PDF-1.7\n", "pdf"}, {"\x89PNG\r\n\x1a\n", "png"}, {"RIFFxxxxWEBPxxxx", "webp"}} {
		got, e := detect([]byte(tc.b))
		if e != nil || got != tc.format {
			t.Fatalf("%s: %v %s", tc.format, e, got)
		}
	}
	for _, bad := range []string{`<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]><svg>&x;</svg>`, `<html>not an image</html>`, `<svg><g></svg>`} {
		if _, e := detect([]byte(bad)); e == nil {
			t.Fatal("accepted unsafe XML")
		}
	}
	makeZip := func(names []string) []byte {
		var buf bytes.Buffer
		w := zip.NewWriter(&buf)
		for _, name := range names {
			f, _ := w.Create(name)
			f.Write([]byte(`<p:presentation xmlns:p="x"/>`))
		}
		w.Close()
		return buf.Bytes()
	}
	if f, e := detect(makeZip([]string{"ppt/presentation.xml"})); e != nil || f != "pptx" {
		t.Fatal(f, e)
	}
	for _, names := range [][]string{{"../escape", "ppt/presentation.xml"}, {"ppt/presentation.xml", "ppt/presentation.xml"}, {"C:/escape", "manifest.json"}, {"/root", "manifest.json"}} {
		if _, e := detect(makeZip(names)); e == nil {
			t.Fatal("unsafe archive accepted", names)
		}
	}
	var bomb bytes.Buffer
	zw := zip.NewWriter(&bomb)
	f, _ := zw.Create("ppt/presentation.xml")
	f.Write(bytes.Repeat([]byte(" "), 2<<20))
	zw.Close()
	if _, e := detect(bomb.Bytes()); e == nil {
		t.Fatal("ZIP expansion ratio not enforced")
	}
}

const fixtureScene = `{"schema":1,"engine":"fabric@7","title":"Example","pages":[{"id":"p1","width":400,"height":300,"canvas":{"objects":[{"id":"t1","type":"Textbox","text":"Editable","left":10,"top":20,"width":200,"fontSize":24}]},"preview":""}],"report":{"format":"svg","mode":"smart","warnings":[],"fonts":[]}}`

func TestSceneValidation(t *testing.T) {
	if e := validateScene([]byte(fixtureScene)); e != nil {
		t.Fatal(e)
	}
	for _, raw := range []string{strings.Replace(fixtureScene, `"schema":1`, `"schema":2`, 1), strings.Replace(fixtureScene, `"width":400`, `"width":200000`, 1), strings.Replace(fixtureScene, `"type":"Textbox"`, `"type":"Javascript"`, 1), strings.Replace(fixtureScene, `"preview":""`, `"preview":"https://example.test/private"`, 1), strings.Replace(fixtureScene, `"text":"Editable"`, `"src":"data:image/svg+xml;base64,PHN2Zz4="`, 1)} {
		if e := validateScene([]byte(raw)); e == nil {
			t.Fatal("accepted unsafe scene", raw)
		}
	}
}

func testApp(t *testing.T) (*App, *httptest.Server) {
	t.Helper()
	root := os.Getenv("MYCREATE_TEST_ROOT")
	if root == "" {
		t.Skip("Set MYCREATE_TEST_ROOT to an isolated NTFS test folder")
	}
	data, e := os.MkdirTemp(root, "api-")
	if e != nil {
		t.Fatal(e)
	}
	h, e := apphost.New(apphost.Config{ID: "create", Name: "My Create", Version: "test", Data: data, Listen: "127.0.0.1:29117", Origin: "http://localhost:29117"}, nil)
	if e != nil {
		t.Fatal(e)
	}
	a, e := New(h)
	if e != nil {
		t.Fatal(e)
	}
	if e = h.Bootstrap("owner@example.test", "Synthetic-test-only-243!"); e != nil {
		t.Fatal(e)
	}
	server := httptest.NewServer(h.Handler())
	t.Cleanup(func() { server.Close(); h.Close() })
	return a, server
}
func TestProjectIsolationRevisionsAndPreservedSource(t *testing.T) {
	a, s := testApp(t)
	call := func(method, path, body, cookie, csrf string) (int, []byte, *http.Response) {
		t.Helper()
		req, _ := http.NewRequest(method, s.URL+path, strings.NewReader(body))
		req.Host = "localhost:29117"
		req.Header.Set("Origin", "http://localhost:29117")
		req.Header.Set("Content-Type", "application/json")
		if cookie != "" {
			req.Header.Set("Cookie", cookie)
		}
		req.Header.Set("X-CSRF-Token", csrf)
		res, e := s.Client().Do(req)
		if e != nil {
			t.Fatal(e)
		}
		defer res.Body.Close()
		var b bytes.Buffer
		b.ReadFrom(res.Body)
		return res.StatusCode, b.Bytes(), res
	}
	status, _, login := call("POST", "/api/login", `{"email":"owner@example.test","password":"Synthetic-test-only-243!"}`, "", "")
	if status != 200 {
		t.Fatal("login", status)
	}
	cookie := login.Cookies()[0].String()
	status, b, _ := call("GET", "/api/me", "", cookie, "")
	var session apphost.Session
	json.Unmarshal(b, &session)
	if status != 200 {
		t.Fatal("session", status, string(b))
	}
	csrf := session.CSRF
	status, _, _ = call("POST", "/api/sources?name=test.svg", `<svg xmlns="http://www.w3.org/2000/svg"><text>Preserve</text></svg>`, cookie, "")
	if status != 403 {
		t.Fatal("missing CSRF accepted")
	}
	status, b, _ = call("POST", "/api/sources?name=test.svg", `<svg xmlns="http://www.w3.org/2000/svg"><text>Preserve</text></svg>`, cookie, csrf)
	if status != 201 {
		t.Fatal(status, string(b))
	}
	var src Source
	json.Unmarshal(b, &src)
	payload := Project{Name: "First", Source: src.ID, Scene: json.RawMessage(fixtureScene)}
	raw, _ := json.Marshal(payload)
	status, b, _ = call("POST", "/api/projects", string(raw), cookie, csrf)
	if status != 200 {
		t.Fatal(status, string(b))
	}
	var saved Project
	json.Unmarshal(b, &saved)
	if saved.Revision != 1 {
		t.Fatal(saved)
	}
	payload.ID = saved.ID
	payload.Revision = 1
	payload.Name = "Updated"
	payload.Scene = json.RawMessage(strings.Replace(fixtureScene, "Editable", "Changed text", 1))
	raw, _ = json.Marshal(payload)
	status, b, _ = call("POST", "/api/projects", string(raw), cookie, csrf)
	if status != 200 {
		t.Fatal(status, string(b))
	}
	status, _, _ = call("POST", "/api/projects", string(raw), cookie, csrf)
	if status != 409 {
		t.Fatal("stale save overwrote revision")
	}
	status, b, _ = call("GET", "/api/projects/"+saved.ID+"?revision=1", "", cookie, "")
	if status != 200 || !bytes.Contains(b, []byte("Editable")) {
		t.Fatal("old revision lost", string(b))
	}
	status, b, _ = call("GET", "/api/projects/"+saved.ID, "", cookie, "")
	if status != 200 || !bytes.Contains(b, []byte("Changed text")) {
		t.Fatal("new revision lost")
	}
	status, b, _ = call("GET", "/api/sources/"+src.ID, "", cookie, "")
	if status != 200 || !bytes.Contains(b, []byte("Preserve")) {
		t.Fatal("source lost")
	}
	if _, e := a.owned("other-user", saved.ID); e == nil {
		t.Fatal("cross-account access")
	}
	if _, _, e := a.source("other-user", src.ID); e == nil {
		t.Fatal("cross-account source access")
	}
	status, _, _ = call("GET", "/api/projects/"+saved.ID, "", "", "")
	if status != 401 {
		t.Fatal("anonymous project access")
	}
	// The same database can restart without rerunning migration 1 destructively.
	if e := a.H.Migrate(1, `CREATE TABLE should_not_run(x)`); e != nil {
		t.Fatal(e)
	}
	if _, e := os.Stat(filepath.Join(a.H.Config.Data, "state.sqlite")); e != nil {
		t.Fatal(e)
	}
}
