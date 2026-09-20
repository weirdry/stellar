// Experimental worker: only accepts the prepared, synthetic benchmark protocol.
package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"unicode/utf16"
)

type V = map[string]any
type Source struct {
	ID       string `json:"id"`
	Provider string `json:"provider"`
}
type Rel struct {
	Source  Source `json:"source"`
	Ref     V      `json:"ref"`
	Kind    string `json:"kind"`
	Reverse bool   `json:"reverse"`
}
type Record struct {
	Source Source `json:"source"`
	Raw    V      `json:"raw"`
	Scope  string `json:"scope"`
	Rels   []Rel  `json:"rels"`
}
type Input struct {
	Locale  string   `json:"locale"`
	Records []Record `json:"records"`
}

// Ordered objects preserve the canonical JavaScript insertion order.
type Pair struct {
	K string
	V any
}
type Obj []Pair

func (o Obj) MarshalJSON() ([]byte, error) {
	b := []byte{'{'}
	for n, p := range o {
		if n > 0 {
			b = append(b, ',')
		}
		k, _ := json.Marshal(p.K)
		v, e := json.Marshal(p.V)
		if e != nil {
			return nil, e
		}
		b = append(b, k...)
		b = append(b, ':')
		b = append(b, v...)
	}
	return append(b, '}'), nil
}
func str(v any) string { s, _ := v.(string); return s }

// ECMAScript whitespace, deliberately not Go's broader Unicode whitespace set.
func nonblank(v any) bool {
	s, ok := v.(string)
	return ok && strings.Trim(s, "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff") != ""
}
func truth(v any) bool {
	if v == nil {
		return false
	}
	switch x := v.(type) {
	case bool:
		return x
	case string:
		return x != ""
	case float64:
		return x != 0
	}
	return true
}
func native(s Source, r V) string {
	if s.Provider == "linear" {
		if truth(r["uuid"]) {
			return str(r["uuid"])
		}
		return str(r["id"])
	}
	return str(r["node_id"])
}
func display(s Source, r V) any {
	if s.Provider == "linear" {
		return r["id"]
	}
	return "#" + strconv.FormatFloat(r["number"].(float64), 'f', -1, 64)
}
func id(s Source, n string) string {
	return "i:" + base64.RawURLEncoding.EncodeToString([]byte(s.ID)) + ":" + base64.RawURLEncoding.EncodeToString([]byte(n))
}
func less(a, b string) bool {
	x, y := utf16.Encode([]rune(a)), utf16.Encode([]rune(b))
	for i := 0; i < len(x) && i < len(y); i++ {
		if x[i] != y[i] {
			return x[i] < y[i]
		}
	}
	return len(x) < len(y)
}
func status(s Source, r V) Obj {
	label := r["status"]
	t := "unknown"
	if s.Provider == "linear" {
		if !nonblank(label) {
			label = "Unknown"
		}
		switch str(r["statusType"]) {
		case "started", "unstarted", "backlog", "completed", "canceled", "duplicate":
			t = str(r["statusType"])
		}
	} else {
		label = r["state"]
		if truth(r["state_reason"]) {
			reason, ok := r["state_reason"].(string)
			if !ok {
				panic("unsupported status coercion")
			}
			label = str(r["state"]) + " · " + reason
		}
		if r["state"] == "open" {
			t = "unstarted"
		} else {
			switch r["state_reason"] {
			case "completed":
				t = "completed"
			case "not_planned":
				t = "canceled"
			case "duplicate":
				t = "duplicate"
			}
		}
	}
	return Obj{{"label", label}, {"type", t}}
}

type Identity struct {
	ID     string
	Source Source
	Native string
	Refs   []V
}

func run(in Input) V {
	aliases := map[[2]string]string{}
	bind := func(s Source, alias any, n string) {
		if !nonblank(alias) {
			return
		}
		k := [2]string{s.ID, str(alias)}
		if old, ok := aliases[k]; ok && old != n {
			panic("conflicting alias")
		}
		aliases[k] = n
	}
	for _, r := range in.Records {
		obs := append([]Rel{{Source: r.Source, Ref: r.Raw}}, r.Rels...)
		for _, o := range obs {
			v := o.Ref["node_id"]
			if o.Source.Provider == "linear" {
				v = o.Ref["uuid"]
			}
			if nonblank(v) {
				bind(o.Source, v, str(v))
				bind(o.Source, display(o.Source, o.Ref), str(v))
			}
		}
	}
	identities := []*Identity{}
	index := map[string]*Identity{}
	identify := func(s Source, r V) *Identity {
		n := native(s, r)
		if a, ok := aliases[[2]string{s.ID, n}]; ok {
			n = a
		}
		key := id(s, n)
		v, ok := index[key]
		if !ok {
			v = &Identity{ID: key, Source: s, Native: n}
			index[key] = v
			identities = append(identities, v)
		}
		v.Refs = append(v.Refs, r)
		return v
	}
	recordIDs := []*Identity{}
	relationIDs := [][]*Identity{}
	for _, r := range in.Records {
		recordIDs = append(recordIDs, identify(r.Source, r.Raw))
		rs := []*Identity{}
		for _, o := range r.Rels {
			rs = append(rs, identify(o.Source, o.Ref))
		}
		relationIDs = append(relationIDs, rs)
	}
	full := map[string]bool{}
	issues := []Obj{}
	for n, record := range in.Records {
		r, s, ident := record.Raw, record.Source, recordIDs[n]
		if full[ident.ID] {
			panic("duplicate detail")
		}
		full[ident.ID] = true
		issue := Obj{{"id", ident.ID}, {"sourceId", s.ID}, {"nativeId", ident.Native}, {"identifier", display(s, r)}, {"title", r["title"]}, {"scope", record.Scope}, {"detail", "full"}, {"status", status(s, r)}, {"targets", []any{}}}
		copyField := func(to, from string) {
			if v, ok := r[from]; ok {
				issue = append(issue, Pair{to, v})
			}
		}
		if s.Provider == "linear" {
			for _, p := range [][2]string{{"url", "url"}, {"description", "description"}, {"updatedAt", "updatedAt"}} {
				copyField(p[0], p[1])
			}
			for _, k := range []string{"assignee", "assigneeId", "project", "team", "startedAt", "completedAt", "archivedAt", "dueDate", "labels"} {
				copyField(k, k)
			}
			if p, ok := r["priority"]; ok {
				if m, ok := p.(map[string]any); ok {
					if v, ok := m["name"]; ok {
						issue = append(issue, Pair{"priority", v})
					}
				} else if _, ok := p.([]any); !ok {
					issue = append(issue, Pair{"priority", p})
				}
			}
		} else {
			copyField("url", "html_url")
			copyField("description", "body")
			copyField("updatedAt", "updated_at")
			names := []string{}
			if v, ok := r["assignees"]; ok {
				a, ok := v.([]any)
				if !ok {
					panic("malformed assignees")
				}
				for _, item := range a {
					m, ok := item.(map[string]any)
					if !ok || !nonblank(m["login"]) {
						panic("malformed assignee")
					}
					names = append(names, str(m["login"]))
				}
			}
			var assignee any = nil
			if len(names) > 0 {
				assignee = strings.Join(names, ", ")
			}
			issue = append(issue, Pair{"assignee", assignee})
			if v, ok := r["labels"]; ok {
				a, ok := v.([]any)
				if !ok {
					panic("malformed labels")
				}
				labels := []string{}
				for _, item := range a {
					name := item
					if m, ok := item.(map[string]any); ok {
						name = m["name"]
					}
					if !nonblank(name) {
						panic("malformed label")
					}
					labels = append(labels, str(name))
				}
				issue = append(issue, Pair{"labels", labels})
			}
			if r["state_reason"] == "completed" {
				copyField("completedAt", "closed_at")
			}
		}
		issues = append(issues, issue)
	}
	for _, ident := range identities {
		if full[ident.ID] {
			continue
		}
		s := ident.Source
		displays := []string{}
		for _, r := range ident.Refs {
			d := display(s, r)
			if nonblank(d) && str(d) != ident.Native {
				displays = append(displays, str(d))
			}
		}
		sort.SliceStable(displays, func(i, j int) bool { return less(displays[i], displays[j]) })
		identifier := ident.Native
		if len(displays) > 0 {
			identifier = displays[0]
		}
		first := func(field string) string {
			values := []string{}
			for _, r := range ident.Refs {
				if nonblank(r[field]) {
					values = append(values, str(r[field]))
				}
			}
			sort.SliceStable(values, func(i, j int) bool { return less(values[i], values[j]) })
			if len(values) > 0 {
				return values[0]
			}
			return ""
		}
		title := first("title")
		if title == "" {
			title = identifier
		}
		label := "Not queried"
		if in.Locale == "ko" {
			label = "미조회"
		}
		issue := Obj{{"id", ident.ID}, {"sourceId", s.ID}, {"nativeId", ident.Native}, {"identifier", identifier}, {"title", title}, {"scope", "context"}, {"detail", "unqueried"}, {"status", Obj{{"type", "unknown"}, {"label", label}}}, {"targets", []any{}}}
		field := "url"
		if s.Provider == "github" {
			field = "html_url"
		}
		if u := first(field); u != "" {
			issue = append(issue, Pair{"url", u})
		}
		issues = append(issues, issue)
	}
	edges := []Obj{}
	seen := map[[3]string]bool{}
	for n, r := range in.Records {
		for k, o := range r.Rels {
			a, b := recordIDs[n].ID, relationIDs[n][k].ID
			if o.Reverse {
				a, b = b, a
			}
			if o.Kind == "related" && less(b, a) {
				a, b = b, a
			}
			key := [3]string{o.Kind, a, b}
			if !seen[key] {
				seen[key] = true
				edges = append(edges, Obj{{"kind", o.Kind}, {"source", a}, {"target", b}})
			}
		}
	}
	return V{"issues": issues, "relations": edges}
}
func main() {
	defer func() {
		if recover() != nil {
			fmt.Fprintln(os.Stderr, "worker declined input")
			os.Exit(1)
		}
	}()
	var in Input
	if err := json.NewDecoder(os.Stdin).Decode(&in); err != nil {
		panic(err)
	}
	out := run(in)
	enc := json.NewEncoder(os.Stdout)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(out); err != nil {
		panic(err)
	}
}
