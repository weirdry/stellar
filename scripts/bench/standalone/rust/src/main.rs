// Experimental worker for the same prepared-record protocol as the Go probe.
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use serde_json::{Value as V, json};
use std::{
    collections::{HashMap, HashSet},
    io::Write,
};
fn text(v: &V) -> &str {
    v.as_str().unwrap_or("")
}
fn nonblank(v: &V) -> bool {
    v.as_str().is_some_and(|s| {
        !s.trim_matches(|c| {
            matches!(
                c,
                '\t' | '\n' | '\u{b}' | '\u{c}' | '\r' | ' ' | '\u{a0}' | '\u{1680}' | '\u{2000}'
                    ..='\u{200a}'
                        | '\u{2028}'
                        | '\u{2029}'
                        | '\u{202f}'
                        | '\u{205f}'
                        | '\u{3000}'
                        | '\u{feff}'
            )
        })
        .is_empty()
    })
}
fn truth(v: &V) -> bool {
    match v {
        V::Null => false,
        V::Bool(b) => *b,
        V::String(s) => !s.is_empty(),
        V::Number(n) => n.as_f64() != Some(0.0),
        _ => true,
    }
}
fn linear(s: &V) -> bool {
    s["provider"] == "linear"
}
fn native(s: &V, r: &V) -> String {
    text(if linear(s) {
        if truth(&r["uuid"]) {
            &r["uuid"]
        } else {
            &r["id"]
        }
    } else {
        &r["node_id"]
    })
    .into()
}
fn display(s: &V, r: &V) -> V {
    if linear(s) {
        r["id"].clone()
    } else {
        json!(format!("#{}", r["number"]))
    }
}
fn less(a: &str, b: &str) -> bool {
    a.encode_utf16().cmp(b.encode_utf16()).is_lt()
}
fn first(values: impl Iterator<Item = V>) -> Option<String> {
    values
        .filter(nonblank)
        .map(|v| text(&v).to_string())
        .min_by(|a, b| a.encode_utf16().cmp(b.encode_utf16()))
}
fn copy(issue: &mut V, raw: &V, to: &str, from: &str) {
    if let Some(v) = raw.get(from) {
        issue[to] = v.clone();
    }
}
fn status(s: &V, r: &V) -> Result<V, String> {
    let mut label = r["status"].clone();
    let mut kind = "unknown";
    if linear(s) {
        if !nonblank(&label) {
            label = json!("Unknown")
        };
        match text(&r["statusType"]) {
            "started" | "unstarted" | "backlog" | "completed" | "canceled" | "duplicate" => {
                kind = text(&r["statusType"])
            }
            _ => {}
        }
    } else {
        label = r["state"].clone();
        if truth(&r["state_reason"]) {
            let reason = js_string(&r["state_reason"]);
            label = json!(format!("{} · {}", text(&r["state"]), reason))
        };
        kind = if r["state"] == "open" {
            "unstarted"
        } else {
            match text(&r["state_reason"]) {
                "completed" => "completed",
                "not_planned" => "canceled",
                "duplicate" => "duplicate",
                _ => "unknown",
            }
        }
    }
    Ok(json!({"label":label,"type":kind}))
}
struct Identity<'a> {
    id: String,
    source: &'a V,
    native: String,
    refs: Vec<&'a V>,
}
fn identify<'a>(
    s: &'a V,
    r: &'a V,
    aliases: &HashMap<(String, String), String>,
    index: &mut HashMap<String, usize>,
    identities: &mut Vec<Identity<'a>>,
) -> usize {
    let initial = native(s, r);
    let n = aliases
        .get(&(text(&s["id"]).into(), initial.clone()))
        .cloned()
        .unwrap_or(initial);
    let id = format!(
        "i:{}:{}",
        URL_SAFE_NO_PAD.encode(text(&s["id"])),
        URL_SAFE_NO_PAD.encode(&n)
    );
    let at = if let Some(at) = index.get(&id) {
        *at
    } else {
        let at = identities.len();
        index.insert(id.clone(), at);
        identities.push(Identity {
            id,
            source: s,
            native: n,
            refs: vec![],
        });
        at
    };
    identities[at].refs.push(r);
    at
}
fn run(input: V) -> Result<V, String> {
    let records = input["records"].as_array().ok_or("records")?;
    let mut aliases = HashMap::new();
    for record in records {
        let observations = std::iter::once((&record["source"], &record["raw"])).chain(
            record["rels"]
                .as_array()
                .ok_or("rels")?
                .iter()
                .map(|r| (&r["source"], &r["ref"])),
        );
        for (s, r) in observations {
            let n = if linear(s) { &r["uuid"] } else { &r["node_id"] };
            if !nonblank(n) {
                continue;
            };
            for a in [n.clone(), display(s, r)] {
                if !nonblank(&a) {
                    continue;
                };
                let key = (text(&s["id"]).to_string(), text(&a).to_string());
                let native = text(n).to_string();
                if aliases.get(&key).is_some_and(|old| old != &native) {
                    return Err("conflicting alias".into());
                };
                aliases.insert(key, native);
            }
        }
    }
    let mut identities = vec![];
    let mut index = HashMap::new();
    let mut record_ids = vec![];
    let mut relation_ids = vec![];
    for record in records {
        record_ids.push(identify(
            &record["source"],
            &record["raw"],
            &aliases,
            &mut index,
            &mut identities,
        ));
        let mut refs = vec![];
        for r in record["rels"].as_array().unwrap() {
            refs.push(identify(
                &r["source"],
                &r["ref"],
                &aliases,
                &mut index,
                &mut identities,
            ))
        }
        relation_ids.push(refs);
    }
    let mut full = HashSet::new();
    let mut issues = vec![];
    for (at, record) in records.iter().enumerate() {
        let r = &record["raw"];
        let s = &record["source"];
        let ident = &identities[record_ids[at]];
        if !full.insert(ident.id.clone()) {
            return Err("duplicate detail".into());
        };
        let mut issue = json!({"id":ident.id,"sourceId":s["id"],"nativeId":ident.native,"identifier":display(s,r),"title":r["title"],"scope":record["scope"],"detail":"full","status":status(s,r)?,"targets":[]});
        if linear(s) {
            for field in [
                "url",
                "description",
                "updatedAt",
                "assignee",
                "assigneeId",
                "project",
                "team",
                "startedAt",
                "completedAt",
                "archivedAt",
                "dueDate",
                "labels",
            ] {
                copy(&mut issue, r, field, field)
            }
            if let Some(p) = r.get("priority") {
                if p.is_object() {
                    if let Some(n) = p.get("name") {
                        issue["priority"] = n.clone()
                    }
                } else if !p.is_array() {
                    issue["priority"] = p.clone()
                }
            }
        } else {
            copy(&mut issue, r, "url", "html_url");
            copy(&mut issue, r, "description", "body");
            copy(&mut issue, r, "updatedAt", "updated_at");
            let mut names = vec![];
            if let Some(a) = r.get("assignees") {
                for item in a.as_array().ok_or("assignees")? {
                    if !item.is_object() || !nonblank(&item["login"]) {
                        return Err("assignee".into());
                    };
                    names.push(text(&item["login"]))
                }
            };
            issue["assignee"] = if names.is_empty() {
                V::Null
            } else {
                json!(names.join(", "))
            };
            if let Some(a) = r.get("labels") {
                let mut labels = vec![];
                for item in a.as_array().ok_or("labels")? {
                    let name = if item.is_string() {
                        item
                    } else {
                        &item["name"]
                    };
                    if !nonblank(name) {
                        return Err("label".into());
                    };
                    labels.push(name.clone())
                }
                issue["labels"] = json!(labels)
            };
            if r["state_reason"] == "completed" {
                copy(&mut issue, r, "completedAt", "closed_at")
            }
        }
        issues.push(issue);
    }
    for ident in &identities {
        if full.contains(&ident.id) {
            continue;
        };
        let s = &ident.source;
        let identifier = first(
            ident
                .refs
                .iter()
                .map(|r| display(s, r))
                .filter(|v| text(v) != ident.native),
        )
        .unwrap_or(ident.native.clone());
        let title =
            first(ident.refs.iter().map(|r| r["title"].clone())).unwrap_or(identifier.clone());
        let mut issue = json!({"id":ident.id,"sourceId":s["id"],"nativeId":ident.native,"identifier":identifier,"title":title,"scope":"context","detail":"unqueried","status":{"type":"unknown","label":if input["locale"]=="ko"{"미조회"}else{"Not queried"}},"targets":[]});
        let field = if linear(s) { "url" } else { "html_url" };
        if let Some(url) = first(ident.refs.iter().map(|r| r[field].clone())) {
            issue["url"] = json!(url)
        };
        issues.push(issue);
    }
    let mut relations = vec![];
    let mut seen = HashSet::new();
    for (n, r) in records.iter().enumerate() {
        for (k, o) in r["rels"].as_array().unwrap().iter().enumerate() {
            let mut a = &identities[record_ids[n]].id;
            let mut b = &identities[relation_ids[n][k]].id;
            if o["reverse"] == true {
                std::mem::swap(&mut a, &mut b)
            };
            let kind = text(&o["kind"]);
            if kind == "related" && less(b, a) {
                std::mem::swap(&mut a, &mut b)
            };
            if seen.insert((kind, a, b)) {
                relations.push(json!({"kind":kind,"source":a,"target":b}))
            }
        }
    }
    Ok(obj([
        ("issues", V::Array(issues)),
        ("relations", V::Array(relations)),
    ]))
}
mod cli;
fn main() {
    if let Err(e) = cli::execute() {
        eprintln!("{e}");
        std::process::exit(1);
    }
}

fn js_string(v: &V) -> String {
    match v {
        V::String(s) => s.clone(),
        V::Null => "null".into(),
        V::Bool(b) => b.to_string(),
        V::Number(n) => n.to_string(),
        V::Array(a) => a
            .iter()
            .map(|v| {
                if v.is_null() {
                    String::new()
                } else {
                    js_string(v)
                }
            })
            .collect::<Vec<_>>()
            .join(","),
        V::Object(_) => "[object Object]".into(),
    }
}

// Move owned trees into containers. json!(owned_value) serializes through a
// shared reference and would recursively copy large intermediate JSON trees.
fn obj<const N: usize>(fields: [(&str, V); N]) -> V {
    V::Object(
        fields
            .into_iter()
            .map(|(k, v)| (k.to_string(), v))
            .collect(),
    )
}
