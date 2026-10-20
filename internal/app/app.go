package app

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
)

type App struct {
	H      *apphost.Host
	ocr    chan struct{}
	writes chan struct{}
}
type Source struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Format  string `json:"format"`
	Size    int64  `json:"size"`
	Hash    string `json:"sha256"`
	Created string `json:"created"`
}
type Project struct {
	ID       string          `json:"id"`
	Name     string          `json:"name"`
	Revision int             `json:"revision"`
	Source   string          `json:"source"`
	Updated  string          `json:"updated"`
	Template bool            `json:"template"`
	Scene    json.RawMessage `json:"scene,omitempty"`
}

func New(h *apphost.Host) (*App, error) {
	a := &App{H: h, ocr: make(chan struct{}, 1), writes: make(chan struct{}, 1)}
	if e := h.Migrate(1, `CREATE TABLE create_sources(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,format TEXT NOT NULL,size INTEGER NOT NULL,hash TEXT NOT NULL,blob TEXT NOT NULL,created TEXT NOT NULL);
 CREATE INDEX create_sources_owner ON create_sources(owner);
 CREATE TABLE create_projects(id TEXT PRIMARY KEY,owner TEXT NOT NULL,name TEXT NOT NULL,source TEXT NOT NULL,revision INTEGER NOT NULL,updated TEXT NOT NULL,template INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX create_projects_owner ON create_projects(owner);
 CREATE TABLE create_revisions(project TEXT NOT NULL REFERENCES create_projects(id),revision INTEGER NOT NULL,scene BLOB NOT NULL,created TEXT NOT NULL,PRIMARY KEY(project,revision));`); e != nil {
		return nil, e
	}
	h.Mux.HandleFunc("GET /api/config", h.Require(a.config))
	h.Mux.HandleFunc("GET /api/sources", h.Require(a.sources))
	h.Mux.HandleFunc("POST /api/sources", h.Require(a.writeLimit(a.upload)))
	h.Mux.HandleFunc("GET /api/sources/{id}", h.Require(a.sourceFile))
	h.Mux.HandleFunc("POST /api/sources/{id}/ocr", h.Require(a.recognize))
	h.Mux.HandleFunc("GET /api/projects", h.Require(a.projects))
	h.Mux.HandleFunc("POST /api/projects", h.Require(a.writeLimit(a.save)))
	h.Mux.HandleFunc("GET /api/projects/{id}", h.Require(a.project))
	h.Mux.HandleFunc("GET /api/projects/{id}/revisions", h.Require(a.revisions))
	return a, nil
}
func (a *App) Run(ctx context.Context) error { <-ctx.Done(); return nil }

// Serialize bounded writes so simultaneous uploads cannot multiply their memory
// budget or bypass the per-account stored-source/revision quota.
func (a *App) writeLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		select {
		case a.writes <- struct{}{}:
			defer func() { <-a.writes }()
		default:
			apphost.Problem(w, 429, "Another save or upload is running. Retry shortly.")
			return
		}
		var used int64
		owner := apphost.Current(r).User.ID
		e := a.H.DB.QueryRow(`SELECT COALESCE((SELECT SUM(size) FROM create_sources WHERE owner=?),0)+COALESCE((SELECT SUM(length(r.scene)) FROM create_revisions r JOIN create_projects p ON p.id=r.project WHERE p.owner=?),0)`, owner, owner).Scan(&used)
		if e != nil {
			a.H.DBError(w, e)
			return
		}
		incoming := r.ContentLength
		if incoming < 0 {
			incoming = maxScene
		}
		if incoming > maxScene || used+incoming > 2<<30 {
			apphost.Problem(w, 413, "This account exceeds the 2 GiB source/revision storage budget. Export backups and contact the host administrator.")
			return
		}
		next(w, r)
	}
}
func (a *App) config(w http.ResponseWriter, r *http.Request) {
	fonts := []string{"Arial", "Segoe UI", "Times New Roman", "Georgia", "Courier New", "Verdana", "Tahoma"}
	// Only report installed family labels; never serve or download font files.
	entries, _ := os.ReadDir(filepath.Join(os.Getenv("WINDIR"), "Fonts"))
	for _, e := range entries {
		n := strings.TrimSuffix(e.Name(), filepath.Ext(e.Name()))
		if len(fonts) < 800 {
			fonts = append(fonts, n)
		}
	}
	apphost.JSON(w, 200, map[string]any{"maxUpload": maxUpload, "maxPages": 60, "maxObjects": 12000, "fonts": fonts, "ocr": "Windows installed recognition languages; optional, local", "templates": "https://github.com/oneworkspacestudio/my-create-templates"})
}
func (a *App) upload(w http.ResponseWriter, r *http.Request) {
	b, e := io.ReadAll(http.MaxBytesReader(w, r.Body, maxUpload))
	if e != nil {
		apphost.Problem(w, 413, "File exceeds 32 MiB")
		return
	}
	format, e := detect(b)
	if e != nil {
		apphost.Problem(w, 400, e.Error())
		return
	}
	name := r.URL.Query().Get("name")
	if name == "" {
		name = "Imported design"
	}
	name = filepath.Base(strings.ReplaceAll(name, "\\", "/"))
	if len(name) > 240 {
		name = name[:240]
	}
	blob, size, e := a.H.PutBlob(bytes.NewReader(b), maxUpload)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	s := Source{ID: apphost.ID(), Name: name, Format: format, Size: size, Hash: apphost.Hash(string(b)), Created: time.Now().UTC().Format(time.RFC3339Nano)}
	_, e = a.H.DB.Exec("INSERT INTO create_sources VALUES(?,?,?,?,?,?,?,?)", s.ID, apphost.Current(r).User.ID, s.Name, s.Format, s.Size, s.Hash, blob, s.Created)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	a.H.Audit(apphost.Current(r).User.ID, "create.source", s.ID)
	apphost.JSON(w, 201, s)
}
func (a *App) sources(w http.ResponseWriter, r *http.Request) {
	rows, e := a.H.DB.Query("SELECT id,name,format,size,hash,created FROM create_sources WHERE owner=? ORDER BY created DESC LIMIT 200", apphost.Current(r).User.ID)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	defer rows.Close()
	out := []Source{}
	for rows.Next() {
		var s Source
		if e = rows.Scan(&s.ID, &s.Name, &s.Format, &s.Size, &s.Hash, &s.Created); e != nil {
			a.H.DBError(w, e)
			return
		}
		out = append(out, s)
	}
	apphost.JSON(w, 200, out)
}
func (a *App) source(owner, id string) (Source, string, error) {
	var s Source
	var blob string
	e := a.H.DB.QueryRow("SELECT id,name,format,size,hash,created,blob FROM create_sources WHERE owner=? AND id=?", owner, id).Scan(&s.ID, &s.Name, &s.Format, &s.Size, &s.Hash, &s.Created, &blob)
	return s, blob, e
}
func (a *App) sourceFile(w http.ResponseWriter, r *http.Request) {
	s, b, e := a.source(apphost.Current(r).User.ID, r.PathValue("id"))
	if e != nil {
		apphost.Problem(w, 404, "Source not found")
		return
	}
	p, e := a.H.BlobPath(b)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	f, e := os.Open(p)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	defer f.Close()
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", "attachment")
	http.ServeContent(w, r, s.Name, time.Time{}, f)
}
func (a *App) projects(w http.ResponseWriter, r *http.Request) {
	rows, e := a.H.DB.Query("SELECT id,name,source,revision,updated,template FROM create_projects WHERE owner=? ORDER BY updated DESC LIMIT 500", apphost.Current(r).User.ID)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	defer rows.Close()
	out := []Project{}
	for rows.Next() {
		var p Project
		if e = rows.Scan(&p.ID, &p.Name, &p.Source, &p.Revision, &p.Updated, &p.Template); e != nil {
			a.H.DBError(w, e)
			return
		}
		out = append(out, p)
	}
	apphost.JSON(w, 200, out)
}
func (a *App) owned(owner, id string) (Project, error) {
	var p Project
	e := a.H.DB.QueryRow("SELECT id,name,source,revision,updated,template FROM create_projects WHERE owner=? AND id=?", owner, id).Scan(&p.ID, &p.Name, &p.Source, &p.Revision, &p.Updated, &p.Template)
	return p, e
}
func (a *App) project(w http.ResponseWriter, r *http.Request) {
	p, e := a.owned(apphost.Current(r).User.ID, r.PathValue("id"))
	if e != nil {
		apphost.Problem(w, 404, "Project not found")
		return
	}
	revision := r.URL.Query().Get("revision")
	if revision == "" {
		e = a.H.DB.QueryRow("SELECT scene FROM create_revisions WHERE project=? AND revision=?", p.ID, p.Revision).Scan(&p.Scene)
	} else {
		e = a.H.DB.QueryRow("SELECT scene,revision FROM create_revisions WHERE project=? AND revision=?", p.ID, revision).Scan(&p.Scene, &p.Revision)
	}
	if e != nil {
		apphost.Problem(w, 404, "Revision not found")
		return
	}
	apphost.JSON(w, 200, p)
}
func (a *App) revisions(w http.ResponseWriter, r *http.Request) {
	p, e := a.owned(apphost.Current(r).User.ID, r.PathValue("id"))
	if e != nil {
		apphost.Problem(w, 404, "Project not found")
		return
	}
	rows, e := a.H.DB.Query("SELECT revision,created FROM create_revisions WHERE project=? ORDER BY revision DESC", p.ID)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var n int
		var t string
		rows.Scan(&n, &t)
		out = append(out, map[string]any{"revision": n, "created": t})
	}
	apphost.JSON(w, 200, out)
}

var validID = regexp.MustCompile(`^[a-f0-9]{48}$`)

func (a *App) save(w http.ResponseWriter, r *http.Request) {
	var p Project
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxScene))
	dec.DisallowUnknownFields()
	if e := dec.Decode(&p); e != nil {
		apphost.Problem(w, 400, "Invalid or oversized project")
		return
	}
	var extra any
	if dec.Decode(&extra) != io.EOF {
		apphost.Problem(w, 400, "Only one project is allowed")
		return
	}
	if len(strings.TrimSpace(p.Name)) == 0 || len(p.Name) > 240 {
		apphost.Problem(w, 400, "Choose a project name up to 240 characters")
		return
	}
	if e := validateScene(p.Scene); e != nil {
		apphost.Problem(w, 400, e.Error())
		return
	}
	owner := apphost.Current(r).User.ID
	if p.Source != "" {
		if _, _, e := a.source(owner, p.Source); e != nil {
			apphost.Problem(w, 404, "Source not found")
			return
		}
	}
	fresh := p.ID == ""
	if fresh {
		p.ID = apphost.ID()
		p.Revision = 0
	} else if !validID.MatchString(p.ID) {
		apphost.Problem(w, 400, "Invalid project identifier")
		return
	}
	tx, e := a.H.DB.BeginTx(r.Context(), nil)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	defer tx.Rollback()
	p.Updated = time.Now().UTC().Format(time.RFC3339Nano)
	if fresh {
		_, e = tx.Exec("INSERT INTO create_projects VALUES(?,?,?,?,?,?,?)", p.ID, owner, p.Name, p.Source, 1, p.Updated, p.Template)
	} else {
		var old int
		var source string
		e = tx.QueryRow("SELECT revision,source FROM create_projects WHERE id=? AND owner=?", p.ID, owner).Scan(&old, &source)
		if errors.Is(e, sql.ErrNoRows) {
			apphost.Problem(w, 404, "Project not found")
			return
		}
		if e != nil {
			a.H.DBError(w, e)
			return
		}
		if old != p.Revision {
			apphost.Problem(w, 409, "A newer revision exists. Reopen it, or save your work as a copy.")
			return
		}
		if source != p.Source {
			apphost.Problem(w, 400, "A project's source is immutable; save as a copy")
			return
		}
		_, e = tx.Exec("UPDATE create_projects SET name=?,revision=?,updated=?,template=? WHERE id=? AND owner=?", p.Name, p.Revision+1, p.Updated, p.Template, p.ID, owner)
	}
	if e == nil {
		_, e = tx.Exec("INSERT INTO create_revisions VALUES(?,?,?,?)", p.ID, p.Revision+1, []byte(p.Scene), p.Updated)
	}
	if e == nil {
		e = tx.Commit()
	}
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	p.Revision++
	p.Scene = nil
	a.H.Audit(owner, "create.save", p.ID)
	apphost.JSON(w, 200, p)
}
