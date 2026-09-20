package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	schema "github.com/santhosh-tekuri/jsonschema/v6"
	"io"
	"math"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

const white = "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"

func must(e error) {
	if e != nil {
		panic(e.Error())
	}
}
func object(v any) V {
	m, ok := v.(map[string]any)
	if !ok {
		panic("expected object")
	}
	return m
}
func optionalObject(v any) V {
	if !truth(v) {
		return V{}
	}
	m, _ := v.(map[string]any)
	if m == nil {
		return V{}
	}
	return m
}
func array(v any) []any {
	a, ok := v.([]any)
	if !ok {
		panic("expected array")
	}
	return a
}
func source(v V) Source { return Source{ID: str(v["id"]), Provider: str(v["provider"])} }
func parseURL(value any) *url.URL {
	s := str(value)
	if !strings.HasPrefix(s, "http://") && !strings.HasPrefix(s, "https://") {
		panic("HTTP(S) URL required")
	}
	u, e := url.Parse(s)
	if e != nil || u.Host == "" {
		panic("invalid URL")
	}
	return u
}
func namespace(value any) string {
	u := parseURL(value)
	host := strings.ToLower(u.Host)
	if u.Scheme == "https" && strings.HasSuffix(host, ":443") {
		host = strings.TrimSuffix(host, ":443")
	}
	if u.Scheme == "http" && strings.HasSuffix(host, ":80") {
		host = strings.TrimSuffix(host, ":80")
	}
	parts := strings.Split(u.EscapedPath(), "/")
	if len(parts) < 3 {
		return host + "/" + strings.Join(parts[1:], "/")
	}
	return strings.ToLower(host + "/" + parts[1] + "/" + parts[2])
}
func githubRef(r V) {
	n, ok := r["number"].(float64)
	if !ok || n < 1 || n > 9007199254740991 || math.Trunc(n) != n || truth(r["pull_request"]) {
		panic("invalid GitHub issue")
	}
	parseURL(r["html_url"])
}
func prepare(c V) Input {
	sources := array(c["sources"])
	byID := map[string]V{}
	for _, v := range sources {
		s := object(v)
		byID[str(s["id"])] = s
	}
	input := Input{Locale: str(c["locale"]), Records: []Record{}}
	for _, v := range array(c["records"]) {
		entry := object(v)
		s, ok := byID[str(entry["sourceId"])]
		if !ok {
			panic("undeclared source")
		}
		src := source(s)
		raw := object(entry["data"])
		if src.Provider != "linear" && src.Provider != "github" {
			panic("unsupported provider")
		}
		if !nonblank(raw["title"]) || !nonblank(native(src, raw)) {
			panic("missing title or identity")
		}
		if src.Provider == "linear" && !nonblank(raw["id"]) {
			panic("missing Linear identifier")
		}
		if src.Provider == "github" {
			githubRef(raw)
			if raw["state"] != "open" && raw["state"] != "closed" {
				panic("invalid state")
			}
			if namespace(raw["html_url"]) != strings.ToLower(str(s["namespace"])) {
				panic("wrong repository")
			}
		}
		complete := object(s["coverage"])["relations"] == "complete" && entry["scope"] == "assigned"
		rec := Record{Source: src, Raw: raw, Scope: str(entry["scope"]), Rels: []Rel{}}
		add := func(value any, kind string, reverse bool) {
			ref := object(value)
			target := src
			if src.Provider == "github" {
				githubRef(ref)
				found := false
				for _, v := range sources {
					candidate := object(v)
					if candidate["provider"] == "github" && strings.ToLower(str(candidate["namespace"])) == namespace(ref["html_url"]) {
						target = source(candidate)
						found = true
						break
					}
				}
				if !found {
					panic("undeclared relation repository")
				}
			}
			if !nonblank(native(target, ref)) {
				panic("missing endpoint identity")
			}
			rec.Rels = append(rec.Rels, Rel{Source: target, Ref: ref, Kind: kind, Reverse: reverse})
		}
		list := func(obj V, key, kind string, reverse bool) {
			value, present := obj[key]
			if !present && !complete {
				return
			}
			for _, r := range array(value) {
				add(r, kind, reverse)
			}
		}
		links := optionalObject(entry["links"])
		if src.Provider == "linear" {
			rels := optionalObject(raw["relations"])
			list(rels, "blocks", "blocks", false)
			list(rels, "blockedBy", "blocks", true)
			list(rels, "relatedTo", "related", false)
			if _, ok := rels["duplicateOf"]; complete && !ok {
				panic("missing duplicate lookup")
			}
			if truth(rels["duplicateOf"]) {
				add(rels["duplicateOf"], "duplicate", false)
			}
			if truth(raw["parentId"]) {
				add(V{"id": raw["parentId"]}, "parent", true)
			}
			list(links, "children", "parent", false)
		} else {
			if _, ok := links["parent"]; complete && !ok {
				panic("missing parent lookup")
			}
			if truth(links["parent"]) {
				add(links["parent"], "parent", true)
			}
			list(links, "children", "parent", false)
			list(links, "blocks", "blocks", false)
			list(links, "blockedBy", "blocks", true)
		}
		input.Records = append(input.Records, rec)
	}
	return input
}
func validateMetadata(m V) {
	ids := map[string]bool{}
	names := map[[2]string]bool{}
	for _, v := range array(m["sources"]) {
		s := object(v)
		id := str(s["id"])
		if ids[id] {
			panic("duplicate source id")
		}
		ids[id] = true
		ns := str(s["namespace"])
		if s["provider"] == "github" {
			parts := strings.Split(ns, "/")
			if ns != strings.ToLower(ns) || len(parts) != 3 || strings.ContainsAny(ns, white) || parts[0] == "" || parts[1] == "" || parts[2] == "" {
				panic("source namespace")
			}
		}
		key := [2]string{str(s["provider"]), ns}
		if names[key] {
			panic("duplicate namespace")
		}
		names[key] = true
	}
}
func validateDraft(m V) {
	validateMetadata(m)
	sources := map[string]bool{}
	for _, v := range array(m["sources"]) {
		sources[str(object(v)["id"])] = true
	}
	ids := map[string]bool{}
	nativeIDs := map[[2]string]bool{}
	for _, v := range array(m["issues"]) {
		i := object(v)
		key := str(i["id"])
		if ids[key] {
			panic("duplicate issue")
		}
		ids[key] = true
		if !sources[str(i["sourceId"])] {
			panic("unknown source")
		}
		nk := [2]string{str(i["sourceId"]), str(i["nativeId"])}
		if nativeIDs[nk] {
			panic("duplicate native identity")
		}
		nativeIDs[nk] = true
		if i["detail"] == "unqueried" && object(i["status"])["type"] != "unknown" {
			panic("unqueried status")
		}
		if truth(i["url"]) {
			u := parseURL(i["url"])
			if u.User != nil {
				password, _ := u.User.Password()
				if u.User.Username() != "" || password != "" {
					panic("credentials in URL")
				}
			}
		}
		// Drafts deliberately have empty taxonomy and no classifications, as in the reference.
	}
	seen := map[string]bool{}
	parents := map[string]string{}
	order := []string{}
	for _, v := range array(m["relations"]) {
		e := object(v)
		a, b, kind := str(e["source"]), str(e["target"]), str(e["kind"])
		if !ids[a] || !ids[b] {
			panic("unknown endpoint")
		}
		if a == b {
			panic("self relation")
		}
		if kind == "related" && less(b, a) {
			a, b = b, a
		}
		key := kind + "|" + a + "|" + b
		if seen[key] {
			panic("duplicate relation")
		}
		seen[key] = true
		if kind == "parent" {
			old, ok := parents[b]
			if ok && old != a {
				panic("multiple parents")
			}
			if !ok {
				order = append(order, b)
			}
			parents[b] = a
		}
	}
	for _, start := range order {
		path := map[string]bool{}
		at := start
		for {
			next, ok := parents[at]
			if !ok {
				break
			}
			if path[at] {
				panic("parent cycle")
			}
			path[at] = true
			at = next
		}
	}
}
func schemaCompiler(dir string) (*schema.Schema, *schema.Schema) {
	compiler := schema.NewCompiler()
	compiler.DefaultDraft(schema.Draft7)
	compiler.AssertFormat()
	compiler.UseRegexpEngine(func(p string) (schema.Regexp, error) {
		if p == `\S` {
			p = "[^" + white + "]"
		}
		return regexp.Compile(p)
	})
	for _, name := range []string{"work-map.schema.json", "capture.schema.json"} {
		raw, e := os.ReadFile(filepath.Join(dir, name))
		must(e)
		var value any
		must(json.Unmarshal(raw, &value))
		must(compiler.AddResource("https://stellar.test/"+name, value))
	}
	mapSchema, e := compiler.Compile("https://stellar.test/work-map.schema.json")
	must(e)
	captureSchema, e := compiler.Compile("https://stellar.test/capture.schema.json")
	must(e)
	return captureSchema, mapSchema
}
func atomicWrite(input, output string, content []byte) {
	a, e := filepath.Abs(input)
	must(e)
	b, e := filepath.Abs(output)
	must(e)
	if a == b {
		panic("input and output must differ")
	}
	ra, ea := filepath.EvalSymlinks(a)
	rb, eb := filepath.EvalSymlinks(b)
	if ea == nil && eb == nil && ra == rb {
		panic("input and output must differ")
	}
	must(os.MkdirAll(filepath.Dir(b), 0755))
	f, e := os.CreateTemp(filepath.Dir(b), ".stellar-*.tmp")
	must(e)
	defer os.Remove(f.Name())
	_, e = f.Write(content)
	if e != nil {
		f.Close()
		panic(e.Error())
	}
	must(f.Close())
	must(os.Rename(f.Name(), b))
}
func main() {
	defer func() {
		if e := recover(); e != nil {
			fmt.Fprintln(os.Stderr, e)
			os.Exit(1)
		}
	}()
	if len(os.Args) != 4 {
		fmt.Fprintln(os.Stderr, "Usage: core INPUT OUTPUT SCHEMAS")
		os.Exit(2)
	}
	captureSchema, mapSchema := schemaCompiler(os.Args[3])
	raw, e := os.ReadFile(os.Args[1])
	must(e)
	// Reject unsupported lone-surrogate escapes rather than silently replacing them.
	checkSurrogates(raw)
	dec := json.NewDecoder(bytes.NewReader(raw))
	var value any
	must(dec.Decode(&value))
	var extra any
	if dec.Decode(&extra) != io.EOF {
		panic("trailing JSON")
	}
	must(captureSchema.Validate(value))
	c := object(value)
	m := V{"schemaVersion": float64(1), "owner": c["owner"], "locale": c["locale"], "sources": c["sources"], "view": c["view"], "domains": []any{}, "categories": []any{}, "issues": []any{}, "relations": []any{}}
	must(mapSchema.Validate(m))
	validateMetadata(m)
	result := run(prepare(c))
	m["issues"] = result["issues"]
	m["relations"] = result["relations"]
	must(mapSchema.Validate(m))
	validateDraft(m)
	var buffer bytes.Buffer
	enc := json.NewEncoder(&buffer)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	must(enc.Encode(m))
	atomicWrite(os.Args[1], os.Args[2], buffer.Bytes())
	count := 0
	for _, v := range array(m["issues"]) {
		if object(v)["scope"] == "assigned" {
			count++
		}
	}
	must(json.NewEncoder(os.Stdout).Encode(V{"normalized": true, "issues": len(array(m["issues"])), "relations": len(array(m["relations"])), "needsClassification": count}))
}

// encoding/json replaces unpaired UTF-16 escapes; reject that unsupported input
// instead of silently changing data. Valid pairs and escaped backslashes pass.
func checkSurrogates(raw []byte) {
	for i := 0; i+1 < len(raw); i++ {
		if raw[i] != 92 {
			continue
		}
		if raw[i+1] != 'u' {
			i++
			continue
		}
		if i+6 > len(raw) {
			continue
		}
		n, e := strconv.ParseUint(string(raw[i+2:i+6]), 16, 16)
		if e != nil {
			continue
		}
		if n >= 0xd800 && n <= 0xdbff {
			if i+12 > len(raw) || raw[i+6] != 92 || raw[i+7] != 'u' {
				panic("unsupported lone surrogate")
			}
			low, e := strconv.ParseUint(string(raw[i+8:i+12]), 16, 16)
			if e != nil || low < 0xdc00 || low > 0xdfff {
				panic("unsupported lone surrogate")
			}
			i += 11
		} else if n >= 0xdc00 && n <= 0xdfff {
			panic("unsupported lone surrogate")
		} else {
			i += 5
		}
	}
}
