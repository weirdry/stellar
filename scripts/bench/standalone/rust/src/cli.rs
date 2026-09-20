use super::*;
use jsonschema::{Draft, Registry, Validator};
use std::{
    fs,
    path::{Path, PathBuf},
};
use url::Url;
type R<T> = Result<T, String>;
fn arr(v: &V) -> R<&Vec<V>> {
    v.as_array().ok_or("expected array".into())
}
fn check_url(v: &V) -> R<Url> {
    let s = text(v);
    if !(s.starts_with("http://") || s.starts_with("https://")) {
        return Err("HTTP(S) URL required".into());
    };
    Url::parse(s).map_err(|_| "invalid URL".into())
}
fn namespace(v: &V) -> R<String> {
    let u = check_url(v)?;
    let host = u.host_str().ok_or("URL host missing")?;
    let host = if let Some(port) = u.port() {
        format!("{host}:{port}")
    } else {
        host.to_string()
    };
    Ok(format!(
        "{host}/{}",
        u.path()
            .split('/')
            .skip(1)
            .take(2)
            .collect::<Vec<_>>()
            .join("/")
    )
    .to_lowercase())
}
fn github_ref(r: &V) -> R<()> {
    let n = r["number"].as_f64().ok_or("number")?;
    if n < 1.0 || n > 9007199254740991.0 || n.fract() != 0.0 || truth(&r["pull_request"]) {
        return Err("invalid GitHub issue".into());
    };
    check_url(&r["html_url"])?;
    Ok(())
}
fn brief(s: &V) -> V {
    json!({"id":s["id"],"provider":s["provider"]})
}
fn add(rels: &mut Vec<V>, sources: &[V], s: &V, r: V, kind: &str, reverse: bool) -> R<()> {
    if !r.is_object() {
        return Err("reference object".into());
    };
    let target = if linear(s) {
        s
    } else {
        github_ref(&r)?;
        let ns = namespace(&r["html_url"])?;
        sources
            .iter()
            .find(|s| s["provider"] == "github" && text(&s["namespace"]).to_lowercase() == ns)
            .ok_or("undeclared endpoint repository")?
    };
    if !nonblank(&json!(native(target, &r))) {
        return Err("endpoint identity".into());
    };
    rels.push(obj([
        ("source", brief(target)),
        ("ref", r),
        ("kind", json!(kind)),
        ("reverse", V::Bool(reverse)),
    ]));
    Ok(())
}
fn list(
    rels: &mut Vec<V>,
    sources: &[V],
    s: &V,
    obj: &mut V,
    key: &str,
    kind: &str,
    reverse: bool,
    complete: bool,
) -> R<()> {
    let Some(v) = obj.get_mut(key) else {
        if complete {
            return Err("missing relation lookup".into());
        };
        return Ok(());
    };
    let values = v.as_array_mut().ok_or("relation array")?;
    for r in std::mem::take(values) {
        add(rels, sources, s, r, kind, reverse)?
    }
    Ok(())
}
fn prepare(c: &mut V) -> R<V> {
    let sources = c["sources"].as_array().ok_or("sources")?.clone();
    let mut records = vec![];
    for entry in c["records"].as_array_mut().ok_or("records")? {
        let s = sources
            .iter()
            .find(|s| s["id"] == entry["sourceId"])
            .ok_or("undeclared source")?;
        let mut raw = entry["data"].take();
        if !matches!(text(&s["provider"]), "linear" | "github") {
            return Err("unsupported provider".into());
        };
        if !nonblank(&raw["title"]) || !nonblank(&json!(native(s, &raw))) {
            return Err("missing title or identity".into());
        };
        if linear(s) && !nonblank(&raw["id"]) {
            return Err("missing Linear identifier".into());
        };
        if !linear(s) {
            github_ref(&raw)?;
            if raw["state"] != "open" && raw["state"] != "closed" {
                return Err("invalid state".into());
            };
            if namespace(&raw["html_url"])? != text(&s["namespace"]).to_lowercase() {
                return Err("wrong repository".into());
            }
        }
        let complete = s["coverage"]["relations"] == "complete" && entry["scope"] == "assigned";
        let mut rels = vec![];
        let mut links = entry["links"].take();
        if linear(s) {
            let mut rel = raw["relations"].take();
            list(
                &mut rels, &sources, s, &mut rel, "blocks", "blocks", false, complete,
            )?;
            list(
                &mut rels,
                &sources,
                s,
                &mut rel,
                "blockedBy",
                "blocks",
                true,
                complete,
            )?;
            list(
                &mut rels,
                &sources,
                s,
                &mut rel,
                "relatedTo",
                "related",
                false,
                complete,
            )?;
            if complete && rel.get("duplicateOf").is_none() {
                return Err("missing duplicate lookup".into());
            };
            if truth(&rel["duplicateOf"]) {
                add(
                    &mut rels,
                    &sources,
                    s,
                    rel["duplicateOf"].take(),
                    "duplicate",
                    false,
                )?
            };
            if truth(&raw["parentId"]) {
                add(
                    &mut rels,
                    &sources,
                    s,
                    json!({"id":raw["parentId"].take()}),
                    "parent",
                    true,
                )?
            };
            list(
                &mut rels, &sources, s, &mut links, "children", "parent", false, complete,
            )?;
        } else {
            if complete && links.get("parent").is_none() {
                return Err("missing parent lookup".into());
            };
            if truth(&links["parent"]) {
                add(
                    &mut rels,
                    &sources,
                    s,
                    links["parent"].take(),
                    "parent",
                    true,
                )?
            };
            list(
                &mut rels, &sources, s, &mut links, "children", "parent", false, complete,
            )?;
            list(
                &mut rels, &sources, s, &mut links, "blocks", "blocks", false, complete,
            )?;
            list(
                &mut rels,
                &sources,
                s,
                &mut links,
                "blockedBy",
                "blocks",
                true,
                complete,
            )?
        };
        records.push(obj([
            ("source", brief(s)),
            ("raw", raw),
            ("scope", entry["scope"].clone()),
            ("rels", V::Array(rels)),
        ]));
    }
    Ok(obj([
        ("locale", c["locale"].clone()),
        ("records", V::Array(records)),
    ]))
}
fn metadata(m: &V) -> R<()> {
    let mut ids = HashSet::new();
    let mut namespaces = HashSet::new();
    for s in arr(&m["sources"])? {
        if !ids.insert(text(&s["id"])) {
            return Err("duplicate source id".into());
        };
        let ns = text(&s["namespace"]);
        if s["provider"] == "github" {
            let parts = ns.split('/').collect::<Vec<_>>();
            if ns != ns.to_lowercase()
                || parts.len() != 3
                || parts.iter().any(|v| v.is_empty())
                || ns.chars().any(|c| !nonblank(&json!(c.to_string())))
            {
                return Err("source namespace".into());
            }
        };
        if !namespaces.insert((text(&s["provider"]), ns)) {
            return Err("duplicate namespace".into());
        }
    }
    Ok(())
}
fn validate_draft(m: &V) -> R<()> {
    metadata(m)?;
    let sources = arr(&m["sources"])?
        .iter()
        .map(|s| text(&s["id"]))
        .collect::<HashSet<_>>();
    let mut ids = HashSet::new();
    let mut native_ids = HashSet::new();
    for i in arr(&m["issues"])? {
        if !ids.insert(text(&i["id"])) {
            return Err("duplicate issue".into());
        };
        if !sources.contains(text(&i["sourceId"])) {
            return Err("unknown source".into());
        };
        if !native_ids.insert((text(&i["sourceId"]), text(&i["nativeId"]))) {
            return Err("duplicate native identity".into());
        };
        if i["detail"] == "unqueried" && i["status"]["type"] != "unknown" {
            return Err("unqueried status".into());
        };
        if truth(&i["url"]) {
            let u = check_url(&i["url"])?;
            if !u.username().is_empty() || u.password().is_some_and(|p| !p.is_empty()) {
                return Err("credentials in URL".into());
            }
        }
        // Empty taxonomy/unclassified draft is the only output of normalization.
    }
    let mut seen = HashSet::new();
    let mut parents = HashMap::new();
    let mut order = vec![];
    for e in arr(&m["relations"])? {
        let mut a = text(&e["source"]);
        let mut b = text(&e["target"]);
        let kind = text(&e["kind"]);
        if !ids.contains(a) || !ids.contains(b) {
            return Err("unknown endpoint".into());
        };
        if a == b {
            return Err("self relation".into());
        };
        if kind == "related" && less(b, a) {
            std::mem::swap(&mut a, &mut b)
        };
        if !seen.insert(format!("{kind}|{a}|{b}")) {
            return Err("duplicate relation".into());
        };
        if kind == "parent" {
            if let Some(old) = parents.insert(b, a) {
                if old != a {
                    return Err("multiple parents".into());
                }
            } else {
                order.push(b)
            }
        }
    }
    for start in order {
        let mut path = HashSet::new();
        let mut at = start;
        while let Some(next) = parents.get(at) {
            if !path.insert(at) {
                return Err("parent cycle".into());
            };
            at = next;
        }
    }
    Ok(())
}
fn schema_pattern(v: &mut V) {
    match v {
        V::Object(o) => {
            if o.get("pattern").and_then(V::as_str) == Some("\\S") {
                o.insert("pattern".into(),json!("[^\\t\\n\\v\\f\\r \u{a0}\u{1680}\u{2000}-\u{200a}\u{2028}\u{2029}\u{202f}\u{205f}\u{3000}\u{feff}]"));
            };
            for x in o.values_mut() {
                schema_pattern(x)
            }
        }
        V::Array(a) => {
            for x in a {
                schema_pattern(x)
            }
        }
        _ => {}
    }
}
fn schemas(dir: &Path) -> R<(Validator, Validator)> {
    let mut map: V = serde_json::from_slice(
        &fs::read(dir.join("work-map.schema.json")).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    let capture: V = serde_json::from_slice(
        &fs::read(dir.join("capture.schema.json")).map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())?;
    schema_pattern(&mut map);
    let work = jsonschema::options()
        .with_draft(Draft::Draft7)
        .should_validate_formats(true)
        .with_base_uri("https://stellar.test/work-map.schema.json")
        .build(&map)
        .map_err(|e| e.to_string())?;
    let registry = Registry::new()
        .add("https://stellar.test/work-map.schema.json", map)
        .map_err(|e| e.to_string())?
        .prepare()
        .map_err(|e| e.to_string())?;
    let cap = jsonschema::options()
        .with_draft(Draft::Draft7)
        .should_validate_formats(true)
        .with_base_uri("https://stellar.test/capture.schema.json")
        .with_registry(&registry)
        .build(&capture)
        .map_err(|e| e.to_string())?;
    Ok((cap, work))
}
fn atomic_write(input: &Path, output: &Path, bytes: &[u8]) -> R<()> {
    let a = fs::canonicalize(input).map_err(|e| e.to_string())?;
    if fs::canonicalize(output).is_ok_and(|b| a == b) {
        return Err("input and output must differ".into());
    };
    let parent = output
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let mut temp = tempfile::NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    temp.write_all(bytes).map_err(|e| e.to_string())?;
    temp.persist(output).map_err(|e| e.to_string())?;
    Ok(())
}
pub fn execute() -> R<()> {
    let args = std::env::args().collect::<Vec<_>>();
    if args.len() != 4 {
        return Err("Usage: core INPUT OUTPUT SCHEMAS".into());
    };
    let (cap, work) = schemas(&PathBuf::from(&args[3]))?;
    let mut capture: V = serde_json::from_slice(&fs::read(&args[1]).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    cap.validate(&capture).map_err(|e| e.to_string())?;
    let mut map = json!({"schemaVersion":1,"owner":capture["owner"],"locale":capture["locale"],"sources":capture["sources"],"view":capture["view"],"domains":[],"categories":[],"issues":[],"relations":[]});
    work.validate(&map).map_err(|e| e.to_string())?;
    metadata(&map)?;
    let mut result = run(prepare(&mut capture)?)?;
    map["issues"] = result["issues"].take();
    map["relations"] = result["relations"].take();
    work.validate(&map).map_err(|e| e.to_string())?;
    validate_draft(&map)?;
    let mut bytes = serde_json::to_vec_pretty(&map).map_err(|e| e.to_string())?;
    bytes.push(b'\n');
    atomic_write(Path::new(&args[1]), Path::new(&args[2]), &bytes)?;
    let issues = arr(&map["issues"])?;
    println!(
        "{}",
        json!({"normalized":true,"issues":issues.len(),"relations":arr(&map["relations"])?.len(),"needsClassification":issues.iter().filter(|i|i["scope"]=="assigned").count()})
    );
    Ok(())
}
