package app

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"
)

//go:embed ocr.ps1
var ocrScript []byte

type limitedBuffer struct{ bytes.Buffer }

func (b *limitedBuffer) Write(p []byte) (int, error) {
	n := len(p)
	if b.Len() < 4<<20 {
		left := (4 << 20) - b.Len()
		if len(p) > left {
			p = p[:left]
		}
		b.Buffer.Write(p)
	}
	return n, nil
}
func (a *App) recognize(w http.ResponseWriter, r *http.Request) {
	select {
	case a.ocr <- struct{}{}:
		defer func() { <-a.ocr }()
	default:
		apphost.Problem(w, 429, "Recognition is busy; retry when it finishes")
		return
	}
	s, blob, e := a.source(apphost.Current(r).User.ID, r.PathValue("id"))
	if e != nil {
		apphost.Problem(w, 404, "Source not found")
		return
	}
	if s.Format != "png" && s.Format != "jpeg" {
		apphost.Problem(w, 400, "Local OCR accepts PNG and JPEG. Export other pages as PNG first.")
		return
	}
	file, e := a.H.BlobPath(blob)
	if e != nil {
		a.H.DBError(w, e)
		return
	}
	script := filepath.Join(a.H.Config.Data, "recognize.ps1")
	if e = os.WriteFile(script, ocrScript, 0600); e != nil {
		a.H.DBError(w, e)
		return
	}
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, filepath.Join(os.Getenv("WINDIR"), "System32/WindowsPowerShell/v1.0/powershell.exe"), "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", script, "-ImagePath", file)
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	cache := filepath.Join(a.H.Config.Data, "ocr-cache")
	if e = os.MkdirAll(cache, 0700); e != nil {
		a.H.DBError(w, e)
		return
	}
	cmd.Dir = a.H.Config.Data
	cmd.Env = []string{"SystemRoot=" + os.Getenv("SystemRoot"), "WINDIR=" + os.Getenv("WINDIR"), "SystemDrive=" + os.Getenv("SystemDrive"), "ProgramData=" + cache, "LOCALAPPDATA=" + cache, "APPDATA=" + cache, "USERPROFILE=" + cache, "TEMP=" + cache, "TMP=" + cache}
	var out, stderr limitedBuffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if e = cmd.Run(); e != nil || !json.Valid(out.Bytes()) {
		apphost.Problem(w, 422, "Windows OCR could not read this image. Check installed recognition languages and use a PNG/JPEG under 2600 pixels per side. Your original is preserved.")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(out.Bytes())
	a.H.Audit(apphost.Current(r).User.ID, "create.ocr", s.ID)
}
