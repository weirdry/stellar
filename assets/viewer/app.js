'use strict';
const R = JSON.parse(document.getElementById('data').textContent);
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const messages = JSON.parse(document.getElementById('messages').textContent);
function tr(key, values = {}) {
  const template = messages[key];
  if (typeof template !== 'string')
    throw new Error(`Missing UI message: ${key}`);
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (!Object.hasOwn(values, name))
      throw new Error(`Missing UI value: ${key}.${name}`);
    return String(values[name]);
  });
}
const htmlTr = (key, values) => esc(tr(key, values));
const multiline = (key) => htmlTr(key).replace(/\n/g, '<br>');
const stellarTitle = tr('brand.title', { owner: R.owner });
const domainById = new Map(R.domains.map((d) => [d.id, d]));
const categoryById = new Map(R.categories.map((c) => [c.id, c]));
const sourceById = new Map(R.sources.map((source) => [source.id, source]));
const sourceName = (source) => `${source.name} · ${source.namespace}`;
const sourceSummary = [...new Set(R.sources.map((source) => source.name))].join(
  ' + ',
);
const snapshotSummary = R.sources
  .map((source) => `${sourceName(source)}: ${source.snapshotAt}`)
  .join(' · ');
const repeatedIdentifiers = new Set(
  R.issues
    .filter((issue, index, issues) =>
      issues.some(
        (other, n) => n !== index && other.identifier === issue.identifier,
      ),
    )
    .map((issue) => issue.identifier),
);
const displayId = (issue) => {
  if (!repeatedIdentifiers.has(issue.identifier)) return issue.identifier;
  const source = sourceById.get(issue.sourceId);
  return source.provider === 'github'
    ? source.namespace.replace(/^github\.com\//, '') + issue.identifier
    : `${source.namespace}/${issue.identifier}`;
};
const issueSource = (issue) => sourceName(sourceById.get(issue.sourceId));
R.items = R.issues.filter((i) => i.scope === 'assigned');
R.context = R.issues.filter((i) => i.scope === 'context');
R.edges = R.relations;
for (const i of R.issues) {
  const c = categoryById.get(i.classification?.category);
  i.statusType = i.status.type;
  i.status = i.detail === 'unqueried' ? tr('status.unqueried') : i.status.label;
  i.category = c?.id;
  i.domain = c?.domain;
  i.domainLabel = domainById.get(c?.domain)?.label;
  i.group = c?.label;
  i.classificationBasis = i.classification?.rationale;
  i.parentId = R.edges.find(
    (e) => e.kind === 'parent' && e.target === i.id,
  )?.source;
}
const assigned = new Map(R.items.map((i) => [i.id, i]));
const all = new Map(R.issues.map((i) => [i.id, i]));
const domains = new Map(R.domains.map((d) => [d.id, d])),
  categories = new Map(R.categories.map((c) => [c.id, c]));
const active = (i) =>
  !!i && ['started', 'unstarted', 'backlog'].includes(i.statusType);
const colors = [
  '#aa97e1',
  '#c49bc4',
  '#85abd2',
  '#7cbaae',
  '#b69acb',
  '#9cace1',
  '#85b6c3',
  '#c6af82',
  '#c4a070',
  '#93aaa8',
  '#c395aa',
  '#a9ad88',
];
const domainColor = (id) =>
  colors[
    Math.max(
      0,
      R.domains.findIndex((d) => d.id === id),
    ) % colors.length
  ];
const catItems = (id) => R.items.filter((i) => i.category === id),
  domainItems = (id) => R.items.filter((i) => i.domain === id);
const statusRank = {
  started: 0,
  unstarted: 1,
  backlog: 2,
  completed: 3,
  canceled: 4,
  duplicate: 5,
  unknown: 6,
};
const sortIssues = (a, b) =>
  (statusRank[a.statusType] ?? 9) - (statusRank[b.statusType] ?? 9) ||
  a.identifier.localeCompare(b.identifier, R.locale, { numeric: true }) ||
  issueSource(a).localeCompare(issueSource(b), R.locale, { numeric: true });
const blocked = (i) =>
  R.edges.filter(
    (e) =>
      e.kind === 'blocks' && e.target === i.id && active(all.get(e.source)),
  );
const state = {
  mode: 'global',
  selected: null,
  scope: R.view.initialScope,
  target: '',
  openDomains: new Set(R.domains.map((d) => d.id)),
  openCats: new Set(),
  treeDomains: new Set(),
  treeCats: new Set(),
  visibleEdges: new Set([
    'classification',
    'blocks',
    'related',
    'parent',
    'duplicate',
  ]),
  transform: { x: 0, y: 0, k: 1 },
  history: [],
  scene: { nodes: [], edges: [] },
  edgeSelection: null,
};
let base = [],
  baseIds = new Set(),
  sceneById = new Map(),
  initial = true,
  drag = null,
  skipClick = false,
  toastTimer = null,
  lastModalFocus = null;
try {
  if (localStorage.getItem('stellar-theme') === 'light')
    document.body.classList.add('light');
} catch {
  /* Local storage may be unavailable for file URLs. */
}
function syncTheme() {
  const light = document.body.classList.contains('light');
  $('#theme').textContent = light ? '☾' : '☀';
  $('#theme').title = tr(light ? 'theme.dark' : 'theme.light');
  $('#theme').setAttribute('aria-label', $('#theme').title);
}
syncTheme();
$('#brand-title').textContent = stellarTitle;
$('#brand-title').title = stellarTitle;
$('#brand-subtitle').textContent = sourceSummary;
$('#brand-subtitle').title = R.sources.map(sourceName).join(' + ');
const incomplete = R.sources.some(
  (source) =>
    source.coverage.issues !== 'complete' ||
    source.coverage.relations !== 'complete',
);
$('#snapshot').textContent =
  (R.sources.length === 1
    ? tr('snapshot', { timestamp: R.sources[0].snapshotAt })
    : tr('snapshot.sources', { count: R.sources.length })) +
  (incomplete ? ' · ' + tr('coverage.incomplete') : '');
$('#snapshot').title = snapshotSummary;
$('#taxonomy-count').textContent = tr('taxonomy.count', {
  domains: R.domains.length,
  categories: R.categories.length,
});
$('#maps-open').hidden = !R.attachments?.length;
$('#maps-open').textContent = tr('references.count', {
  count: R.attachments?.length || 0,
});
$('#maps-open').dataset.shortLabel = tr('references.short');
$('#scope').value = state.scope;
const selectableTargets = new Set(R.items.flatMap((i) => i.targets));
for (const target of [...selectableTargets].sort((a, b) =>
  a.localeCompare(b, R.locale),
))
  $('#target').add(new Option(target, target));
function scoped(i) {
  return (
    state.scope === 'all' ||
    (state.scope === 'active' && active(i)) ||
    (state.scope === 'closed' &&
      ['canceled', 'duplicate'].includes(i.statusType)) ||
    i.statusType === state.scope
  );
}
function updateBase() {
  base = R.items.filter(scoped).sort(sortIssues);
  baseIds = new Set(base.map((i) => i.id));
  $('#scope-count').textContent = base.length;
}
function outsideScopeKey(issue) {
  return issue.scope === 'context'
    ? 'context.outside'
    : !baseIds.has(issue.id)
      ? 'scope.outside'
      : null;
}
function scopeName() {
  return $('#scope').selectedOptions[0].textContent;
}
function selectedIssue() {
  return state.selected?.type === 'issue' ? all.get(state.selected.id) : null;
}
function isTarget(i) {
  return !state.target || i?.targets?.includes(state.target);
}
function idsIn(n) {
  return n.type === 'domain'
    ? domainItems(n.key).map((i) => i.id)
    : n.type === 'category'
      ? catItems(n.key).map((i) => i.id)
      : [n.key];
}
function targetMatch(n) {
  return (
    !state.target ||
    idsIn(n).some((id) => baseIds.has(id) && isTarget(all.get(id))) ||
    (n.type === 'issue' && isTarget(all.get(n.key)))
  );
}
function serializeState() {
  return {
    mode: state.mode,
    selected: state.selected ? { ...state.selected } : null,
    scope: state.scope,
    target: state.target,
    openDomains: [...state.openDomains],
    openCats: [...state.openCats],
    treeDomains: [...state.treeDomains],
    treeCats: [...state.treeCats],
    transform: { ...state.transform },
  };
}
function remember() {
  state.history.push(serializeState());
  if (state.history.length > 60) state.history.shift();
  $('#back').disabled = false;
}
function rememberSelection(type, id) {
  if (state.selected?.type !== type || state.selected?.id !== id) remember();
}
function restorePrevious() {
  if (!state.history.length) return;
  const s = state.history.pop();
  Object.assign(state, s);
  for (const k of ['openDomains', 'openCats', 'treeDomains', 'treeCats'])
    state[k] = new Set(s[k]);
  state.edgeSelection = null;
  $('#scope').value = state.scope;
  $('#target').value = state.target;
  render(false);
  $('#back').disabled = !state.history.length;
}
function closeMobileTree() {
  if (innerWidth <= 650) $('#sidebar').classList.remove('visible');
}
function selectDomain(id, push = true) {
  if (!domains.has(id)) return;
  if (push) rememberSelection('domain', id);
  state.mode = 'global';
  state.selected = { type: 'domain', id };
  state.edgeSelection = null;
  state.openDomains.add(id);
  state.treeDomains.add(id);
  render(false);
  fitScene(state.scene.nodes.filter((n) => n.domain === id));
  closeMobileTree();
}
function selectCategory(id, push = true) {
  const c = categories.get(id);
  if (!c) return;
  if (push) rememberSelection('category', id);
  state.mode = 'global';
  state.selected = { type: 'category', id };
  state.edgeSelection = null;
  state.openDomains.add(c.domain);
  state.openCats.add(id);
  state.treeDomains.add(c.domain);
  state.treeCats.add(id);
  render(false);
  fitScene(
    state.scene.nodes.filter(
      (n) =>
        n.id === 'd:' + c.domain || n.id === 'c:' + id || n.category === id,
    ),
  );
  closeMobileTree();
}
function selectIssue(id, push = true) {
  if (!all.has(id)) return;
  if (push) rememberSelection('issue', id);
  state.mode = 'local';
  state.selected = { type: 'issue', id };
  state.edgeSelection = null;
  const i = all.get(id);
  if (domains.has(i.domain)) {
    state.treeDomains.add(i.domain);
    state.treeCats.add(i.category);
  }
  $('#search').value = '';
  $('#search-results').innerHTML = '';
  $('#search-results').hidden = true;
  render(true);
  closeMobileTree();
  const row = $(`#tree [data-issue="${CSS.escape(id)}"]`);
  row?.scrollIntoView({ block: 'nearest' });
}
function overview(push = true) {
  if (push) remember();
  state.mode = 'global';
  state.selected = null;
  state.target = '';
  $('#target').value = '';
  state.edgeSelection = null;
  state.openDomains = new Set(R.domains.map((d) => d.id));
  state.openCats.clear();
  render(true);
}
function incident(id) {
  return R.edges.filter((e) => e.source === id || e.target === id);
}
function makeIssueNode(id, x, y, center = false) {
  const i = all.get(id);
  return {
    id: 'i:' + id,
    key: id,
    type: 'issue',
    domain: i.domain,
    category: i.category,
    x,
    y,
    center,
    ghost: !baseIds.has(id),
    label: id,
    subtitle: i.title,
    status: i.statusType,
    issue: i,
  };
}
function globalScene() {
  if (state.target && !state.selected) return targetScene();
  const nodes = [],
    edges = [],
    byId = new Map(),
    stageW = $('#stage').clientWidth,
    cols = stageW >= 760 ? 4 : stageW >= 490 ? 3 : 2;
  R.domains.forEach((d, di) => {
    const items = base.filter((i) => i.domain === d.id);
    if (!items.length) return;
    const row = Math.floor(di / cols),
      col = di % cols,
      x = col * 2400 + (row % 2 ? 80 : 0),
      y = row * 2250 + ([0, 95, -65, 40][col] || 0);
    const dn = {
      id: 'd:' + d.id,
      key: d.id,
      type: 'domain',
      domain: d.id,
      x,
      y,
      label: d.label,
      subtitle: tr('node.summary', {
        count: items.length,
        groups: new Set(items.map((i) => i.category)).size,
      }),
      count: items.length,
    };
    nodes.push(dn);
    byId.set(dn.id, dn);
    if (!state.openDomains.has(d.id)) return;
    const cs = R.categories.filter(
      (c) => c.domain === d.id && items.some((i) => i.category === c.id),
    );
    cs.forEach((c, j) => {
      const angle = -Math.PI / 2 + (j * Math.PI * 2) / cs.length + 0.17,
        cr = cs.length === 1 ? 500 : 590,
        cx = x + Math.cos(angle) * cr,
        cy = y + Math.sin(angle) * cr;
      const ci = items.filter((i) => i.category === c.id),
        cn = {
          id: 'c:' + c.id,
          key: c.id,
          type: 'category',
          domain: d.id,
          category: c.id,
          x: cx,
          y: cy,
          label: c.label,
          subtitle: tr('node.count', { count: ci.length }),
          count: ci.length,
        };
      nodes.push(cn);
      byId.set(cn.id, cn);
      edges.push({
        id: 'tree:' + c.id,
        source: dn.id,
        target: cn.id,
        kind: 'classification',
        actual: [],
      });
      if (!state.openCats.has(c.id)) return;
      ci.forEach((i, k) => {
        const ncols = Math.min(4, Math.ceil(Math.sqrt(ci.length))),
          rowI = Math.floor(k / ncols),
          thisCols = Math.min(ncols, ci.length - rowI * ncols),
          column = k % ncols;
        const outward = 280 + rowI * 145,
          lateral = (column - (thisCols - 1) / 2) * 190;
        const px = cx + Math.cos(angle) * outward - Math.sin(angle) * lateral,
          py = cy + Math.sin(angle) * outward + Math.cos(angle) * lateral;
        const ni = makeIssueNode(i.id, px, py);
        nodes.push(ni);
        byId.set(ni.id, ni);
        edges.push({
          id: 'tree:' + i.id,
          source: cn.id,
          target: ni.id,
          kind: 'classification',
          actual: [],
        });
      });
    });
  });
  const projection = (id) => {
    const i = all.get(id);
    if (!baseIds.has(id)) return null;
    if (byId.has('i:' + id)) return 'i:' + id;
    if (byId.has('c:' + i.category)) return 'c:' + i.category;
    if (byId.has('d:' + i.domain)) return 'd:' + i.domain;
    return null;
  };
  const agg = new Map();
  for (const e of R.edges) {
    let a = projection(e.source),
      b = projection(e.target);
    if (!a || !b || a === b) continue;
    if (e.kind === 'related' && a > b) [a, b] = [b, a];
    const key = [e.kind, a, b].join('|');
    if (!agg.has(key))
      agg.set(key, {
        id: 'rel:' + key,
        source: a,
        target: b,
        kind: e.kind,
        actual: [],
      });
    agg.get(key).actual.push(e);
  }
  edges.push(...agg.values());
  return { nodes, edges };
}
function targetScene() {
  const matches = base.filter(isTarget),
    nodes = [],
    edges = [],
    matchIds = new Set(matches.map((i) => i.id));
  let yCursor = 0;
  for (const d of R.domains) {
    const ds = matches.filter((i) => i.domain === d.id);
    if (!ds.length) continue;
    const first = yCursor,
      cs = R.categories.filter(
        (c) => c.domain === d.id && ds.some((i) => i.category === c.id),
      );
    for (const c of cs) {
      const xs = ds.filter((i) => i.category === c.id).sort(sortIssues),
        rowH = Math.max(135, xs.length * 100),
        cy = yCursor + rowH / 2;
      const cn = {
        id: 'c:' + c.id,
        key: c.id,
        type: 'category',
        domain: d.id,
        category: c.id,
        x: 350,
        y: cy,
        label: c.label,
        subtitle: tr('node.count', { count: xs.length }),
        count: xs.length,
      };
      nodes.push(cn);
      edges.push({
        id: 'tree:' + c.id,
        source: 'd:' + d.id,
        target: cn.id,
        kind: 'classification',
        actual: [],
      });
      xs.forEach((i, j) => {
        nodes.push(
          makeIssueNode(i.id, 750, cy + (j - (xs.length - 1) / 2) * 100),
        );
        edges.push({
          id: 'tree:' + i.id,
          source: cn.id,
          target: 'i:' + i.id,
          kind: 'classification',
          actual: [],
        });
      });
      yCursor += rowH + 50;
    }
    nodes.push({
      id: 'd:' + d.id,
      key: d.id,
      type: 'domain',
      domain: d.id,
      x: 0,
      y: (first + yCursor - 50) / 2,
      label: d.label,
      subtitle: tr('node.target', { count: ds.length }),
      count: ds.length,
    });
    yCursor += 100;
  }
  for (const e of R.edges)
    if (matchIds.has(e.source) && matchIds.has(e.target))
      edges.push({
        id: 'target:' + e.kind + '|' + e.source + '|' + e.target,
        kind: e.kind,
        source: 'i:' + e.source,
        target: 'i:' + e.target,
        actual: [e],
      });
  return { nodes, edges };
}
function localScene() {
  const id = state.selected.id,
    i = all.get(id),
    rels = incident(id).filter((e) => state.visibleEdges.has(e.kind)),
    neighborIds = [
      ...new Set(rels.map((e) => (e.source === id ? e.target : e.source))),
    ];
  neighborIds.sort((a, b) => {
    const da = all.get(a).domain || 'z',
      db = all.get(b).domain || 'z';
    return (
      da.localeCompare(db, R.locale) ||
      a.localeCompare(b, R.locale, { numeric: true })
    );
  });
  const nodes = [makeIssueNode(id, 0, 0, true)],
    edges = rels.map((e, j) => ({
      ...e,
      id: 'local:' + j,
      source: 'i:' + e.source,
      target: 'i:' + e.target,
      actual: [e],
    }));
  const n = neighborIds.length,
    r = n <= 3 ? 410 : n <= 7 ? 550 : n <= 12 ? 730 : Math.max(850, n * 64);
  neighborIds.forEach((other, j) => {
    const angle =
      n === 1 ? 0 : (-Math.PI * 2) / 3 + (j * ((Math.PI * 4) / 3)) / (n - 1);
    const rr = r * (n > 12 && j % 2 ? 1.14 : 1);
    nodes.push(
      makeIssueNode(other, Math.cos(angle) * rr, Math.sin(angle) * rr),
    );
  });
  if (domains.has(i.domain)) {
    const dx = neighborIds.length > 12 ? -(r * 1.1 + 260) : -640,
      catx = neighborIds.length > 12 ? -(r * 0.6 + 100) : -340,
      dy = 40;
    nodes.push({
      id: 'd:' + i.domain,
      key: i.domain,
      type: 'domain',
      domain: i.domain,
      x: dx,
      y: dy,
      label: domains.get(i.domain).label,
      subtitle: tr('area'),
      count: null,
    });
    nodes.push({
      id: 'c:' + i.category,
      key: i.category,
      type: 'category',
      domain: i.domain,
      category: i.category,
      x: catx,
      y: dy,
      label: categories.get(i.category).label,
      subtitle: tr('classification'),
      count: null,
    });
    edges.push(
      {
        id: 'local:domain',
        source: 'd:' + i.domain,
        target: 'c:' + i.category,
        kind: 'classification',
        actual: [],
      },
      {
        id: 'local:category',
        source: 'c:' + i.category,
        target: 'i:' + id,
        kind: 'classification',
        actual: [],
      },
    );
  }
  return { nodes, edges };
}
function render(fit = false) {
  clearTimeout(toastTimer);
  $('#toast').hidden = true;
  updateBase();
  state.scene =
    state.mode === 'local' && selectedIssue() ? localScene() : globalScene();
  sceneById = new Map(state.scene.nodes.map((n) => [n.id, n]));
  drawScene();
  renderTree();
  renderInspector();
  renderCaption();
  $('#target-clear').hidden = !state.target;
  $('#empty').hidden = !!state.scene.nodes.length;
  $('#back').disabled = !state.history.length;
  if (fit) fitScene();
  else applyTransform(true);
}
function renderTree() {
  const selected = selectedIssue();
  const treeItems = [...base];
  if (selected && assigned.has(selected.id) && !baseIds.has(selected.id))
    treeItems.push(selected);
  $('#tree').innerHTML =
    R.domains
      .map((d) => {
        const items = treeItems.filter((i) => i.domain === d.id);
        if (!items.length) return '';
        const opened = state.treeDomains.has(d.id),
          sel = state.selected?.type === 'domain' && state.selected.id === d.id,
          dim = state.target && !items.some(isTarget);
        let h = `<div class="tree-domain"><div class="tree-row ${sel ? 'selected' : ''} ${dim ? 'dim' : ''}" data-tree-domain="${esc(d.id)}"><button class="tree-toggle" data-tree-toggle-domain="${esc(d.id)}" aria-label="${esc(d.label)} ${htmlTr(opened ? 'collapse' : 'expand')}" aria-expanded="${opened}">${opened ? '⌄' : '›'}</button><button class="tree-title" data-domain="${esc(d.id)}"><i class="domain-dot" style="--dc:${domainColor(d.id)}"></i><span>${esc(d.label)}</span></button><span class="count">${base.filter((i) => i.domain === d.id).length}</span></div>`;
        if (opened)
          h +=
            '<div class="tree-children">' +
            R.categories
              .filter(
                (c) =>
                  c.domain === d.id && items.some((i) => i.category === c.id),
              )
              .map((c) => {
                const xs = items
                    .filter((i) => i.category === c.id)
                    .sort(sortIssues),
                  op = state.treeCats.has(c.id),
                  cs =
                    state.selected?.type === 'category' &&
                    state.selected.id === c.id,
                  cd = state.target && !xs.some(isTarget);
                let s = `<div class="tree-category"><div class="tree-row ${cs ? 'selected' : ''} ${cd ? 'dim' : ''}"><button class="tree-toggle" data-tree-toggle-category="${esc(c.id)}" aria-label="${esc(c.label)} ${htmlTr(op ? 'collapse' : 'expand')}" aria-expanded="${op}">${op ? '⌄' : '›'}</button><button class="tree-title" data-category="${esc(c.id)}"><span>${esc(c.label)}</span></button><span class="count">${xs.filter((i) => baseIds.has(i.id)).length}</span></div>`;
                if (op)
                  s +=
                    '<div class="tree-children">' +
                    xs
                      .map(
                        (i) =>
                          `<div class="tree-row tree-issue ${selected?.id === i.id ? 'selected' : ''} ${state.target && !isTarget(i) ? 'dim' : ''}"><i class="status-dot ${esc(i.statusType)}"></i><button class="tree-title" data-issue="${esc(i.id)}" title="${esc(i.title)}"><b>${esc(displayId(i))}${!baseIds.has(i.id) ? ' · ' + htmlTr('context') : ''}</b><span>${esc(i.title)}</span></button></div>`,
                      )
                      .join('') +
                    '</div>';
                return s + '</div>';
              })
              .join('') +
            '</div>';
        return h + '</div>';
      })
      .join('') ||
    `<div class="empty-note" style="padding:15px">${htmlTr('empty')}</div>`;
}
function pill(i) {
  return `<span class="pill ${esc(i.statusType)}"><i class="status-dot ${esc(i.statusType)}"></i>${esc(i.status)}</span>`;
}
function relationLabel(e, id) {
  if (e.kind === 'blocks')
    return tr(
      e.source === id ? 'relation.dependents' : 'relation.prerequisites',
    );
  if (e.kind === 'parent')
    return tr(e.source === id ? 'relation.children' : 'relation.parent');
  if (e.kind === 'related') return tr('relation.related');
  return tr(e.source === id ? 'relation.original' : 'relation.duplicates');
}
function targetTags(i) {
  return (i.targets || [])
    .map((t) =>
      selectableTargets.has(t)
        ? `<button class="tag target" data-target="${esc(t)}">${esc(t)}</button>`
        : `<span class="tag target" title="${htmlTr('target.contextOnly')}">${esc(t)}</span>`,
    )
    .join('');
}
function relationRow(otherId, label = '') {
  const x = all.get(otherId);
  return `<button class="relation-row" data-issue="${esc(otherId)}"><i class="status-dot ${esc(x.statusType)}"></i><div><b>${esc(displayId(x))}</b><span class="title">${esc(x.title)}</span><small>${esc(x.status)}${outsideScopeKey(x) ? ' · ' + htmlTr(outsideScopeKey(x)) : ''}</small></div>${label ? `<span class="rel-kind">${esc(label)}</span>` : ''}</button>`;
}
function summaryCounts(items) {
  return Object.entries(
    items.reduce(
      (o, i) => ((o[i.status] = (o[i.status] || 0) + 1), o),
      Object.create(null),
    ),
  )
    .map(([s, n]) => `<span class="tag">${esc(s)} ${n}</span>`)
    .join('');
}
function renderInspector() {
  const p = $('#inspector');
  if (state.edgeSelection) {
    const e = state.edgeSelection;
    const key = {
      blocks: 'relation.blocks',
      related: 'relation.related',
      parent: 'relation.parentKind',
      duplicate: 'relation.duplicate',
    }[e.kind];
    p.innerHTML = `<div class="section-label">${htmlTr('section.relation')}</div><h2>${htmlTr('relations.heading', { kind: tr(key), count: e.actual.length })}</h2><p>${htmlTr('relations.explain')}</p>${e.actual.map((a) => `<div class="info-note"><p>${esc(displayId(all.get(a.source)))} ${e.kind === 'related' ? '↔' : '→'} ${esc(displayId(all.get(a.target)))}</p></div>${relationRow(a.source)}${relationRow(a.target)}`).join('')}`;
    return;
  }
  const selected = state.selected;
  if (!selected && state.target) {
    const matches = base.filter(isTarget),
      every = R.items.filter(isTarget),
      ds = R.domains.filter((d) => matches.some((i) => i.domain === d.id));
    p.innerHTML = `<div class="section-label">${htmlTr('section.target')}</div><span class="tag target">${htmlTr('target.interpreted')}</span><h1>${esc(state.target)}</h1><p>${htmlTr('target.explain')}</p><div class="overview-count"><div><strong>${matches.length}</strong><span>${htmlTr('current.scope')}</span></div><div><strong>${ds.length}</strong><span>${htmlTr('spanning.areas')}</span></div><div><strong>${every.length}</strong><span>${htmlTr('scope.all')}</span></div></div>${
      ds
        .map(
          (d) =>
            `<h3><i class="domain-dot" style="--dc:${domainColor(d.id)}"></i> ${esc(d.label)} · ${matches.filter((i) => i.domain === d.id).length}</h3>${matches
              .filter((i) => i.domain === d.id)
              .map((i) => relationRow(i.id))
              .join('')}`,
        )
        .join('') || `<p class="empty-note">${htmlTr('empty.scope')}</p>`
    }<div class="info-note"><p>${htmlTr('target.boundary')}</p></div><button class="primary-button wide" data-target="">${htmlTr('highlight.clear')}</button>`;
    return;
  }
  if (!selected) {
    p.innerHTML = `<div class="section-label">${htmlTr('brand.tagline')}</div><h1>${multiline('overview.heading')}</h1><p class="intro">${multiline('overview.intro')}</p><div class="overview-count"><div><strong>${base.length}</strong><span>${esc(scopeName())}</span></div><div><strong>${base.filter((i) => blocked(i).length && active(i)).length}</strong><span>${htmlTr('blocked.count')}</span></div><div><strong>${R.domains.length}</strong><span>${htmlTr('area')}</span></div></div><h3>${htmlTr('start')}</h3><div class="quicklinks">${R.domains
      .filter((d) => base.some((i) => i.domain === d.id))
      .slice(0, 4)
      .map(
        (d) =>
          `<button class="quicklink" data-domain="${esc(d.id)}"><i class="domain-dot" style="--dc:${domainColor(d.id)}"></i><div><b>${esc(d.label)}</b><small>${esc(d.description)}</small></div><span>↗</span></button>`,
      )
      .join(
        '',
      )}</div><div class="info-note"><p><b>${htmlTr('connections.two')}</b><br>${htmlTr('connections.explain')}</p></div><p class="empty-note">${htmlTr('positions.hint')}</p>`;
    return;
  }
  if (selected.type === 'domain' || selected.type === 'category') {
    const domain =
        selected.type === 'domain'
          ? domains.get(selected.id)
          : domains.get(categories.get(selected.id).domain),
      c = selected.type === 'category' ? categories.get(selected.id) : null;
    const every = c ? catItems(c.id) : domainItems(domain.id),
      items = every.filter(scoped),
      cs = c ? [c] : R.categories.filter((x) => x.domain === domain.id);
    p.innerHTML = `<div class="section-label">${htmlTr(c ? 'section.group' : 'section.area')}</div><span class="domain-dot" style="--dc:${domainColor(domain.id)};width:11px;height:11px"></span><h2>${esc(c ? c.label : domain.label)}</h2><p>${esc(c ? c.basis : domain.description)}</p><div class="overview-count"><div><strong>${items.length}</strong><span>${htmlTr('current.scope')}</span></div><div><strong>${every.filter(active).length}</strong><span>${htmlTr('active.all')}</span></div><div><strong>${every.length}</strong><span>${htmlTr('scope.all')}</span></div></div>${summaryCounts(items)}${c ? `<h3>${htmlTr('path')}</h3><div class="path-line"><button data-domain="${esc(domain.id)}">${esc(domain.label)}</button> › ${esc(c.label)}</div><h3>${htmlTr('issues.count', { count: items.length })}</h3>${items.map((i) => relationRow(i.id)).join('')}` : `<h3>${htmlTr('groups.count', { count: cs.length })}</h3>${cs.map((x) => `<button class="category-row" data-category="${esc(x.id)}"><span>${esc(x.label)}</span><b>${items.filter((i) => i.category === x.id).length}</b><i>›</i></button>`).join('')}`}<div class="info-note"><p>${htmlTr('counts.explain', { scope: scopeName() })}</p></div>`;
    return;
  }
  const i = all.get(selected.id),
    rels = incident(i.id),
    byKind = Object.create(null);
  for (const e of rels) {
    const k = relationLabel(e, i.id);
    (byKind[k] ??= []).push(e);
  }
  const parent = all.get(i.parentId),
    completedParent = parent?.statusType === 'completed' && active(i);
  p.innerHTML = `<div class="section-label">${htmlTr('section.issue')}</div><span class="id-label">${esc(displayId(i))}</span><p class="issue-source">${esc(issueSource(i))}</p><h2>${esc(i.title)}</h2>${pill(i)}${i.detail === 'unqueried' ? `<span class="tag">${htmlTr('detail.unknown')}</span>` : ''}${outsideScopeKey(i) ? `<span class="tag">${htmlTr(outsideScopeKey(i))}</span>` : ''}${blocked(i).length && active(i) ? `<div class="info-note" style="border-color:var(--blocks)"><p>${htmlTr('prerequisites.note', { count: blocked(i).length })}</p></div>` : ''}${completedParent ? `<div class="info-note"><p>${htmlTr('parent.note', { id: displayId(parent), status: parent.status })}</p></div>` : ''}<h3>${htmlTr('purpose')}</h3><div class="path-line">${domains.has(i.domain) ? `<button data-domain="${esc(i.domain)}">${esc(i.domainLabel)}</button><br>↳ <button data-category="${esc(i.category)}">${esc(i.group)}</button>` : htmlTr('context.unclassified')}</div>${i.classificationEvidence === 'previous-observation' ? `<div class="info-note classification-evidence"><p>${htmlTr('classification.previous')}</p></div>` : ''}<p>${esc(i.classificationBasis || tr('context.reason'))}</p>${i.targets?.length ? `<h3>${htmlTr('targets.interpreted')}</h3>${targetTags(i)}` : ''}<dl class="kv"><dt>${htmlTr('assignee')}</dt><dd>${esc(i.assignee || tr('scope.unknown'))}</dd><dt>${htmlTr('updated')}</dt><dd title="${esc(i.updatedAt || '')}">${i.updatedAt ? esc(new Date(i.updatedAt).toLocaleDateString(R.locale, { timeZone: 'UTC' })) : htmlTr('scope.unknown')}</dd><dt>${htmlTr('priority')}</dt><dd>${esc(i.priority || tr('scope.unknown'))}</dd></dl>${i.url ? `<a class="primary-button wide" href="${esc(i.url)}" target="_blank" rel="noopener">${htmlTr('source.open')}</a>` : `<p class="empty-note">${htmlTr('source.noLink')}</p>`}<h3>${htmlTr('relations.count', { count: rels.length })}</h3><p class="empty-note">${htmlTr('relations.follow')}</p>${
    Object.entries(byKind)
      .map(
        ([name, es]) =>
          `<h3>${esc(name)} · ${es.length}</h3>${es.map((e) => relationRow(e.source === i.id ? e.target : e.source)).join('')}`,
      )
      .join('') || `<p class="empty-note">${htmlTr('relations.empty')}</p>`
  }<hr class="info-divider"><p class="empty-note">${htmlTr('source.boundary')}</p>`;
}
function renderCaption() {
  let crumb = '',
    caption;
  if (state.mode === 'local') {
    const i = selectedIssue(),
      others = state.scene.nodes.filter((n) => n.type === 'issue' && !n.center),
      contexts = others.filter((n) => n.issue.scope === 'context').length,
      filtered = others.filter(
        (n) => n.issue.scope === 'assigned' && n.ghost,
      ).length;
    crumb = `› <span>${htmlTr('caption.neighborhood', { id: displayId(i) })}</span>`;
    caption = `<b>${htmlTr('caption.neighbors', { count: others.length })}</b> · ${htmlTr('caption.path')}${contexts ? ' · ' + htmlTr('caption.context', { count: contexts }) : ''}${filtered ? ' · ' + htmlTr('caption.filtered', { count: filtered }) : ''}`;
  } else if (state.selected?.type === 'domain') {
    const d = domains.get(state.selected.id);
    crumb = `› <span>${esc(d.label)}</span>`;
    caption = `<b>${esc(d.description)}</b> · ${htmlTr('caption.expand')}`;
  } else if (state.selected?.type === 'category') {
    const c = categories.get(state.selected.id);
    crumb = `› <span>${esc(c.label)}</span>`;
    caption = `<b>${esc(domains.get(c.domain).label)}</b> · ${htmlTr('caption.explore')}`;
  } else
    caption = `<b>${htmlTr('caption.scope', { count: base.length, scope: scopeName() })}</b> · ${htmlTr('caption.navigate')}`;
  if (state.target && !state.selected) {
    crumb = `› <span>${esc(state.target)}</span>`;
    caption = `<b>${htmlTr('caption.target', { count: base.filter(isTarget).length })}</b> · ${htmlTr('caption.areas', { count: new Set(base.filter(isTarget).map((i) => i.domain)).size })}`;
  }
  if (state.target)
    caption += ` <span class="target-note">· ${htmlTr('caption.highlight', { target: state.target, count: base.filter(isTarget).length })}</span>`;
  $('#breadcrumbs').innerHTML = crumb;
  $('#canvas-caption').innerHTML = caption;
}
function wrapLabel(text, maxWeight = 17, maxLines = 2) {
  const chunks = [];
  let line = '',
    w = 0;
  for (const c of text) {
    const cw = c.codePointAt(0) <= 127 ? 0.53 : 1;
    if (w + cw > maxWeight && line) {
      chunks.push(line.trim());
      line = '';
      w = 0;
      if (chunks.length === maxLines) break;
    }
    line += c;
    w += cw;
  }
  if (chunks.length < maxLines && line) chunks.push(line.trim());
  const consumed = chunks.join('').replace(/\s/g, '').length,
    original = text.replace(/\s/g, '').length;
  if (consumed < original && chunks.length)
    chunks[chunks.length - 1] = chunks.at(-1).slice(0, -1) + '…';
  return chunks;
}
function nColor(n) {
  return n.type === 'issue'
    ? `var(--${['started', 'unstarted', 'backlog', 'completed'].includes(n.status) ? n.status : 'canceled'})`
    : domainColor(n.domain);
}
function nodeRadius(n) {
  const k = state.transform.k;
  if (n.type === 'domain') return Math.min(23 / k, Math.max(12 / k, 60));
  if (n.type === 'category') return Math.min(11 / k, Math.max(5 / k, 18));
  return Math.min(
    (n.center ? 19 : 12) / k,
    Math.max(
      (n.center ? 12 : state.mode === 'local' ? 7 : 4) / k,
      n.center ? 22 : 11,
    ),
  );
}
function inFocus(n) {
  if (state.mode === 'local' || !state.selected) return true;
  const sel = state.selected;
  if (sel.type === 'domain') return n.domain === sel.id;
  if (sel.type === 'category') {
    const c = categories.get(sel.id);
    return n.category === c.id || n.id === 'd:' + c.domain;
  }
  return true;
}
function nodeSelected(n) {
  return (
    state.selected &&
    state.selected.type === n.type &&
    state.selected.id === n.key
  );
}
function drawScene() {
  const { nodes, edges } = state.scene;
  $('#regions').innerHTML =
    state.mode === 'global' && !(state.target && !state.selected)
      ? nodes
          .filter((n) => n.type === 'domain')
          .map(
            (n) =>
              `<circle class="region-circle" cx="${n.x}" cy="${n.y}" r="790" style="--region:${domainColor(n.domain)}08;--region-stroke:${domainColor(n.domain)}16"/>`,
          )
          .join('')
      : '';
  $('#edges').innerHTML = edges
    .map(
      (e) =>
        `<g class="edge-group" data-edge="${esc(e.id)}" ${state.visibleEdges.has(e.kind) ? '' : 'display="none"'}><path class="edge-hit"/><path class="graph-edge ${e.kind}" ${['blocks', 'parent', 'duplicate'].includes(e.kind) ? `marker-end="url(#arrow-${e.kind})"` : ''}/></g>`,
    )
    .join('');
  $('#edge-labels').innerHTML = edges
    .map(
      (e) => `<text class="edge-label" data-label-edge="${esc(e.id)}"></text>`,
    )
    .join('');
  $('#nodes').innerHTML = nodes
    .map(
      (n) =>
        `<g class="graph-node ${n.type} ${n.ghost ? 'ghost' : ''} ${nodeSelected(n) ? 'selected' : ''} ${state.target ? (targetMatch(n) ? 'target-match' : 'dim') : ''} ${!inFocus(n) ? 'out-of-focus' : ''}" tabindex="0" role="button" aria-label="${esc(n.type === 'issue' ? `${displayId(n.issue)} ${issueSource(n.issue)} ${n.subtitle} ${n.issue.status}` : n.label)}" data-node="${esc(n.id)}" transform="translate(${n.x} ${n.y})"><circle class="node-halo"/><circle class="node-hit"/><circle class="node-dot" style="fill:${n.type === 'issue' ? nColor(n) : 'var(--canvas)'};stroke:${nColor(n)}"/><text class="node-count"></text>${n.type === 'issue' && active(n.issue) && blocked(n.issue).length ? '<circle class="node-block"/>' : ''}<text class="node-label"></text></g>`,
    )
    .join('');
  applyTransform(true);
  drawMinimap();
}
function lineGeometry(a, b, offset = 0) {
  const ar = nodeRadius(a) + 4 / state.transform.k,
    br = nodeRadius(b) + 8 / state.transform.k,
    dx = b.x - a.x,
    dy = b.y - a.y,
    len = Math.max(1, Math.hypot(dx, dy)),
    nx = -dy / len,
    ny = dx / len;
  const cx = (a.x + b.x) / 2 + nx * offset,
    cy = (a.y + b.y) / 2 + ny * offset;
  const al = Math.max(1, Math.hypot(cx - a.x, cy - a.y)),
    bl = Math.max(1, Math.hypot(cx - b.x, cy - b.y));
  const ax = a.x + ((cx - a.x) / al) * ar,
    ay = a.y + ((cy - a.y) / al) * ar,
    bx = b.x + ((cx - b.x) / bl) * br,
    by = b.y + ((cy - b.y) / bl) * br;
  return {
    d: `M ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`,
    lx: (ax + 2 * cx + bx) / 4,
    ly: (ay + 2 * cy + by) / 4,
  };
}
function applyTransform(geometry = false) {
  const { x, y, k } = state.transform;
  $('#viewport').setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
  $('#zoom-label').textContent = Math.round(k * 100) + '%';
  if (geometry) {
    const edgeGroups = $$('#edges .edge-group'),
      pairs = new Map();
    state.scene.edges.forEach((e) => {
      const key = [e.source, e.target].sort().join('|');
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push(e.id);
    });
    state.scene.edges.forEach((e, j) => {
      const a = sceneById.get(e.source),
        b = sceneById.get(e.target);
      if (!a || !b) return;
      const parallels = pairs.get([e.source, e.target].sort().join('|')),
        order = parallels.indexOf(e.id),
        // Reverse edges share the pair's curvature orientation.
        direction = e.source < e.target ? 1 : -1,
        // Keep the fixed-size pointer targets apart when zoomed out.
        spacing = Math.max(70, 40 / k),
        offset =
          parallels.length > 1
            ? (order - (parallels.length - 1) / 2) * spacing * direction
            : state.mode === 'local' && e.kind !== 'classification'
              ? 25
              : 0,
        g = lineGeometry(a, b, offset);
      const el = edgeGroups[j];
      el.querySelectorAll('path').forEach((p) => p.setAttribute('d', g.d));
      const dim =
        (state.target && !targetMatch(a) && !targetMatch(b)) ||
        (!inFocus(a) && !inFocus(b));
      el.classList.toggle('dim', !!dim);
      const label = $(`[data-label-edge="${CSS.escape(e.id)}"]`);
      const show =
        state.visibleEdges.has(e.kind) &&
        ((state.mode === 'local' &&
          state.scene.nodes.length <= 13 &&
          e.kind !== 'classification') ||
          (e.actual.length > 1 && k > 0.3));
      label.setAttribute('x', g.lx);
      label.setAttribute('y', g.ly - 7 / k);
      label.setAttribute('font-size', 10 / k);
      label.style.display = show ? '' : 'none';
      const labelKey = {
        blocks: 'edge.blocks',
        parent: 'edge.parentShort',
        related: 'edge.related',
        duplicate: 'edge.original',
      }[e.kind];
      label.textContent = !labelKey
        ? ''
        : e.actual.length > 1
          ? tr('edge.count', { kind: tr(labelKey), count: e.actual.length })
          : tr(labelKey);
    });
    const nodeEls = $$('#nodes .graph-node');
    state.scene.nodes.forEach((n, j) => {
      const el = nodeEls[j],
        r = nodeRadius(n);
      el.querySelector('.node-dot').setAttribute('r', r);
      el.querySelector('.node-halo').setAttribute('r', r + 5 / k);
      el.querySelector('.node-hit').setAttribute(
        'r',
        Math.max(r + 8 / k, 13 / k),
      );
      const count = el.querySelector('.node-count');
      count.setAttribute(
        'font-size',
        Math.min(11, Math.max(8, r * k * 0.8)) / k,
      );
      count.textContent =
        n.type === 'domain' && n.count !== null ? n.count : '';
      count.style.fill = nColor(n);
      const local = state.mode === 'local',
        show =
          n.type === 'domain' ||
          local ||
          (n.type === 'category' && state.scene.nodes.length <= 24) ||
          k > 0.25 ||
          nodeSelected(n) ||
          (state.target && targetMatch(n)),
        label = el.querySelector('.node-label');
      label.style.display = show ? '' : 'none';
      const mainText = n.type === 'issue' ? displayId(n.issue) : n.label,
        lines = wrapLabel(
          mainText,
          n.type === 'category'
            ? $('#stage').clientWidth < 500
              ? 12
              : 19
            : 20,
          n.type === 'issue' ? 1 : 2,
        );
      const font = n.type === 'domain' ? 13 : n.type === 'category' ? 12 : 11.5;
      let labelY = r + 18 / k;
      label.setAttribute('font-size', font / k);
      label.innerHTML = lines
        .map(
          (l, ix) =>
            `<tspan x="0" y="${labelY + (ix * 16) / k}">${esc(l)}</tspan>`,
        )
        .join('');
      if (
        local &&
        $('#stage').clientWidth >= 500 &&
        n.type === 'issue' &&
        (state.scene.nodes.length <= 11 || n.center)
      ) {
        const clean = n.subtitle.replace(/^\[[^\]]+\]\s*/, '');
        wrapLabel(clean, 17, 2).forEach((l, ix) => {
          label.innerHTML += `<tspan class="node-sub" x="0" y="${labelY + ((lines.length + ix) * 16) / k}" font-size="${11 / k}">${esc(l)}</tspan>`;
        });
      } else if (n.type === 'domain' || (n.type === 'category' && k > 0.38)) {
        label.innerHTML += `<tspan class="node-sub" x="0" y="${labelY + (lines.length * 16) / k}" font-size="${9 / k}">${esc(n.subtitle || '')}</tspan>`;
      }
      const bl = el.querySelector('.node-block');
      if (bl) {
        bl.setAttribute('cx', r * 0.7);
        bl.setAttribute('cy', -r * 0.7);
        bl.setAttribute('r', 3.5 / k);
      }
    });
    // Prefer node identities over relation text. Hidden relation labels are
    // reconsidered on zoom; their paths and inspector details remain available.
    const occupied = state.scene.nodes.flatMap((node, index) =>
      [...nodeEls[index].querySelectorAll('.node-label, .node-dot')]
        .filter((el) => el.style.display !== 'none')
        .map((el) => {
          const box = el.getBBox();
          return {
            x: node.x + box.x,
            y: node.y + box.y,
            width: box.width,
            height: box.height,
          };
        }),
    );
    const padding = 3 / k;
    for (const label of $$('#edge-labels .edge-label')) {
      if (label.style.display === 'none') continue;
      const box = label.getBBox();
      if (
        occupied.some(
          (other) =>
            box.x < other.x + other.width + padding &&
            other.x < box.x + box.width + padding &&
            box.y < other.y + other.height + padding &&
            other.y < box.y + box.height + padding,
        )
      )
        label.style.display = 'none';
      else occupied.push(box);
    }
  }
  updateMinimapViewport();
}
function bounds(nodes) {
  if (!nodes.length) return { minX: -100, maxX: 100, minY: -100, maxY: 100 };
  return {
    minX: Math.min(...nodes.map((n) => n.x)) - 85,
    maxX: Math.max(...nodes.map((n) => n.x)) + 85,
    minY: Math.min(...nodes.map((n) => n.y)) - 70,
    maxY: Math.max(...nodes.map((n) => n.y)) + 95,
  };
}
function fitScene(nodes = state.scene.nodes) {
  if (!nodes.length) return;
  const b = bounds(nodes),
    w = $('#stage').clientWidth,
    h = $('#stage').clientHeight,
    marginX = w < 500 ? 65 : 105,
    top = 120,
    bottom = w < 600 ? 190 : 160,
    availW = Math.max(100, w - marginX * 2),
    availH = Math.max(140, h - top - bottom),
    k = Math.min(
      1.65,
      Math.max(
        0.015,
        Math.min(availW / (b.maxX - b.minX), availH / (b.maxY - b.minY)),
      ),
    );
  state.transform = {
    k,
    x: w / 2 - ((b.minX + b.maxX) / 2) * k,
    y: top + availH / 2 - ((b.minY + b.maxY) / 2) * k,
  };
  applyTransform(true);
}
function currentFocusNodes() {
  if (state.mode !== 'global' || !state.selected) return state.scene.nodes;
  const sel = state.selected;
  if (sel.type === 'domain')
    return state.scene.nodes.filter((n) => n.domain === sel.id);
  if (sel.type === 'category') {
    const c = categories.get(sel.id);
    return state.scene.nodes.filter(
      (n) =>
        n.id === 'd:' + c.domain || n.id === 'c:' + c.id || n.category === c.id,
    );
  }
  return state.scene.nodes;
}
function zoomAt(factor, sx, sy) {
  const w = $('#stage').clientWidth,
    h = $('#stage').clientHeight;
  const px = sx ?? w / 2,
    py = sy ?? h / 2,
    t = state.transform,
    k = Math.max(0.015, Math.min(4, t.k * factor)),
    wx = (px - t.x) / t.k,
    wy = (py - t.y) / t.k;
  state.transform = { k, x: px - wx * k, y: py - wy * k };
  applyTransform(true);
}
let miniBounds = null;
function drawMinimap() {
  const b = bounds(state.scene.nodes),
    sx = 142 / (b.maxX - b.minX),
    sy = 78 / (b.maxY - b.minY),
    s = Math.min(sx, sy),
    ox = (160 - (b.maxX - b.minX) * s) / 2,
    oy = (96 - (b.maxY - b.minY) * s) / 2;
  miniBounds = { ...b, s, ox, oy };
  const point = (n) => [ox + (n.x - b.minX) * s, oy + (n.y - b.minY) * s];
  $('#minimap').innerHTML =
    state.scene.edges
      .filter((e) => state.visibleEdges.has(e.kind))
      .map((e) => {
        const a = sceneById.get(e.source),
          b = sceneById.get(e.target);
        if (!a || !b) return '';
        const [x1, y1] = point(a),
          [x2, y2] = point(b);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--classification)" stroke-width=".5" opacity=".6"/>`;
      })
      .join('') +
    state.scene.nodes
      .map((n) => {
        const [cx, cy] = point(n);
        return `<circle cx="${cx}" cy="${cy}" r="${n.type === 'domain' ? 2 : 1}" fill="${nColor(n)}"/>`;
      })
      .join('') +
    '<rect id="mini-camera" fill="var(--accent)" fill-opacity=".07" stroke="var(--accent)" stroke-width=".7"/>';
  updateMinimapViewport();
}
function updateMinimapViewport() {
  if (!miniBounds) return;
  const b = miniBounds,
    t = state.transform,
    w = $('#stage').clientWidth,
    h = $('#stage').clientHeight,
    wx = -t.x / t.k,
    wy = -t.y / t.k,
    el = $('#mini-camera');
  if (!el) return;
  el.setAttribute('x', b.ox + (wx - b.minX) * b.s);
  el.setAttribute('y', b.oy + (wy - b.minY) * b.s);
  el.setAttribute('width', (w / t.k) * b.s);
  el.setAttribute('height', (h / t.k) * b.s);
}
function setTarget(target) {
  if (target && !selectableTargets.has(target)) return;
  remember();
  state.target = target;
  $('#target').value = target;
  state.mode = 'global';
  state.selected = null;
  state.edgeSelection = null;
  state.openDomains = new Set(R.domains.map((d) => d.id));
  state.openCats.clear();
  if (target)
    for (const i of base.filter(isTarget)) state.openCats.add(i.category);
  render(true);
  if (target) {
    const matched = state.scene.nodes.filter(targetMatch);
    if (matched.length) fitScene(matched);
    notify(
      tr('notice.target', { target, count: base.filter(isTarget).length }),
    );
  }
}
function notify(msg) {
  clearTimeout(toastTimer);
  $('#toast').textContent = msg;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => ($('#toast').hidden = true), 2400);
}
function showSearch() {
  const q = $('#search').value.trim().toLocaleLowerCase(),
    panel = $('#search-results');
  if (!q) {
    panel.innerHTML = '';
    panel.hidden = true;
    return;
  }
  const exact = (issue) =>
    [issue.id, issue.identifier, displayId(issue)].some(
      (value) => value.toLocaleLowerCase() === q,
    );
  const results = R.issues
    .filter((i) =>
      [
        i.id,
        i.identifier,
        displayId(i),
        issueSource(i),
        i.title,
        i.domainLabel,
        i.group,
        ...i.targets,
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(q),
    )
    .sort((a, b) => Number(exact(b)) - Number(exact(a)) || sortIssues(a, b));
  panel.hidden = false;
  panel.innerHTML =
    results
      .slice(0, 30)
      .map(
        (i) =>
          `<button class="search-result" data-issue="${esc(i.id)}"><b>${esc(displayId(i))} · ${esc(i.status)}</b><span>${esc(i.title)}</span><small>${esc(issueSource(i))} · ${i.category ? `${esc(i.domainLabel)} › ${esc(i.group)}` : htmlTr('context.unclassified')}${outsideScopeKey(i) ? ' · ' + htmlTr(outsideScopeKey(i)) : ''}</small></button>`,
      )
      .join('') +
      (results.length > 30
        ? `<p class="empty-note" style="padding:8px 12px">${htmlTr('search.more', { count: results.length })}</p>`
        : '') ||
    `<p class="empty-note" style="padding:12px">${htmlTr('search.empty')}</p>`;
}
function openModal(title, html) {
  lastModalFocus = document.activeElement;
  $('#modal-title').textContent = title;
  $('#modal-content').innerHTML = html;
  $('#modal').hidden = false;
  $('#modal-close').focus();
}
function closeModal() {
  $('#modal').hidden = true;
  lastModalFocus?.focus();
}
function mapsModal() {
  openModal(
    tr('references'),
    `<p class="modal-note">${htmlTr('references.note')}</p><div class="mapgrid">${(R.attachments || []).map((m) => `<a class="mapcard" href="${esc(m.href)}" target="_blank" rel="noopener noreferrer"><b>${esc(m.title)} ↗</b><p>${esc(m.note)}</p></a>`).join('')}</div>`,
  );
}
function helpModal() {
  openModal(
    tr('help.title'),
    `<div class="help-grid"><div><h3>${htmlTr('help.explore')}</h3><ul>${['domain', 'group', 'issue', 'history'].map((k) => `<li>${htmlTr('help.' + k)}</li>`).join('')}</ul><p>${multiline('help.controls')}</p></div><div><h3>${htmlTr('help.connections')}</h3>${['classification', 'direction', 'targets', 'context', 'rationale'].map((k) => `<p>${htmlTr('help.' + k)}</p>`).join('')}<h3>${htmlTr('source.heading')}</h3>${R.sources.map((source) => `<section class="source-card"><b>${esc(sourceName(source))}</b><p>${esc(source.scope)}</p><p>${htmlTr('help.snapshot', { timestamp: source.snapshotAt })}</p><p>${htmlTr('coverage.issues')}: ${htmlTr('coverage.' + source.coverage.issues)} · ${htmlTr('coverage.relations')}: ${htmlTr('coverage.' + source.coverage.relations)}</p><p>${esc(source.notes)}</p></section>`).join('')}</div></div>`,
  );
}
function exportSVG() {
  const source = $('#graph'),
    clone = source.cloneNode(true),
    w = $('#stage').clientWidth,
    h = $('#stage').clientHeight;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);
  clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const palette = getComputedStyle(document.body);
  let vars = '';
  for (const name of [
    'canvas',
    'ink',
    'muted',
    'faint',
    'accent',
    'target',
    'blocks',
    'related',
    'parent',
    'classification',
    'started',
    'unstarted',
    'backlog',
    'completed',
    'canceled',
  ])
    vars += `--${name}:${palette.getPropertyValue('--' + name)};`;
  clone.setAttribute('style', vars + 'font-family:' + palette.fontFamily + ';');
  clone.querySelectorAll('.node-hit,.edge-hit').forEach((x) => x.remove());
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = document.querySelector('style').textContent;
  clone.prepend(style);
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', w);
  bg.setAttribute('height', h);
  bg.setAttribute('fill', palette.getPropertyValue('--canvas').trim());
  clone.insertBefore(bg, clone.querySelector('defs'));
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = `${stellarTitle} · ${selectedIssue() ? displayId(selectedIssue()) : state.selected?.id || tr('overview')} · ${snapshotSummary}`;
  clone.prepend(title);
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], {
      type: 'image/svg+xml;charset=utf-8',
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = `${R.view.exportName}-${(state.selected?.id || 'overview').replace(/[^A-Za-z0-9._-]/g, '-')}.svg`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  notify(tr('export.saved'));
}
// Pointer interaction keeps world positions stable. A click selects; dragging changes the camera only.
$('#graph').addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  drag = {
    x: e.clientX,
    y: e.clientY,
    tx: state.transform.x,
    ty: state.transform.y,
    moved: false,
    id: e.pointerId,
  };
});
window.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) > 5) drag.moved = true;
  if (drag.moved) {
    $('#graph').classList.add('dragging');
    $('#tooltip').hidden = true;
    state.transform.x = drag.tx + dx;
    state.transform.y = drag.ty + dy;
    applyTransform(false);
  }
});
window.addEventListener('pointerup', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  skipClick = drag.moved;
  drag = null;
  $('#graph').classList.remove('dragging');
  setTimeout(() => (skipClick = false), 0);
});
window.addEventListener('pointercancel', () => {
  drag = null;
  $('#graph').classList.remove('dragging');
});
$('#graph').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    $('#tooltip').hidden = true;
    if (e.shiftKey) {
      state.transform.x -= e.deltaX || e.deltaY;
      state.transform.y -= e.deltaX ? e.deltaY : 0;
      applyTransform(false);
    } else {
      const b = $('#graph').getBoundingClientRect();
      zoomAt(
        Math.exp(-Math.max(-150, Math.min(150, e.deltaY)) * 0.0028),
        e.clientX - b.left,
        e.clientY - b.top,
      );
    }
  },
  { passive: false },
);
$('#graph').addEventListener('click', (e) => {
  if (skipClick) return;
  const node = e.target.closest('[data-node]');
  if (node) {
    const n = sceneById.get(node.dataset.node);
    if (n.type === 'domain') selectDomain(n.key);
    else if (n.type === 'category') selectCategory(n.key);
    else selectIssue(n.key);
    $('#tooltip').hidden = true;
    return;
  }
  const path = e.target.closest('[data-edge]');
  if (path) {
    const edge = state.scene.edges.find((x) => x.id === path.dataset.edge);
    if (edge.actual.length) {
      state.edgeSelection = edge;
      renderInspector();
      if (innerWidth <= 900) $('#inspector').classList.add('visible');
    }
  }
});
$('#graph').addEventListener('pointermove', (e) => {
  if (drag?.moved) return;
  const hit = e.target.closest('[data-node]');
  if (!hit) {
    $('#tooltip').hidden = true;
    return;
  }
  const n = sceneById.get(hit.dataset.node),
    box = $('#stage').getBoundingClientRect();
  $('#tooltip').innerHTML =
    n.type === 'issue'
      ? `<b>${esc(displayId(n.issue))} · ${esc(n.issue.status)}</b>${esc(n.subtitle)}<span>${esc(n.issue.domainLabel || tr('context.issue'))}${outsideScopeKey(n.issue) ? ' · ' + htmlTr(outsideScopeKey(n.issue)) : ''}</span>`
      : `<b>${esc(n.label)}</b>${esc(n.subtitle)}<span>${htmlTr(n.type === 'domain' ? 'hint.area' : 'hint.group')}</span>`;
  $('#tooltip').hidden = false;
  $('#tooltip').style.left =
    Math.min(
      box.width - $('#tooltip').offsetWidth - 12,
      Math.max(10, e.clientX - box.left + 18),
    ) + 'px';
  $('#tooltip').style.top =
    Math.min(
      box.height - $('#tooltip').offsetHeight - 14,
      Math.max(10, e.clientY - box.top + 15),
    ) + 'px';
});
$('#graph').addEventListener(
  'pointerleave',
  () => ($('#tooltip').hidden = true),
);
$('#minimap').addEventListener('click', (e) => {
  if (!miniBounds) return;
  const r = $('#minimap').getBoundingClientRect(),
    px = ((e.clientX - r.left) * 160) / r.width,
    py = ((e.clientY - r.top) * 96) / r.height,
    b = miniBounds,
    wx = (px - b.ox) / b.s + b.minX,
    wy = (py - b.oy) / b.s + b.minY;
  state.transform.x = $('#stage').clientWidth / 2 - wx * state.transform.k;
  state.transform.y = $('#stage').clientHeight / 2 - wy * state.transform.k;
  applyTransform(false);
});
document.addEventListener('click', (e) => {
  const d = e.target.closest('[data-domain]');
  if (d) {
    selectDomain(d.dataset.domain);
    return;
  }
  const c = e.target.closest('[data-category]');
  if (c) {
    selectCategory(c.dataset.category);
    return;
  }
  const i = e.target.closest('[data-issue]');
  if (i) {
    selectIssue(i.dataset.issue);
    return;
  }
  const t = e.target.closest('[data-target]');
  if (t) {
    setTarget(t.dataset.target);
    return;
  }
  const td = e.target.closest('[data-tree-toggle-domain]');
  if (td) {
    const id = td.dataset.treeToggleDomain;
    if (state.treeDomains.has(id)) state.treeDomains.delete(id);
    else state.treeDomains.add(id);
    renderTree();
    return;
  }
  const tc = e.target.closest('[data-tree-toggle-category]');
  if (tc) {
    const id = tc.dataset.treeToggleCategory;
    if (state.treeCats.has(id)) state.treeCats.delete(id);
    else state.treeCats.add(id);
    renderTree();
  }
});
$('#search').addEventListener('input', showSearch);
$('#search').addEventListener('keydown', (e) => {
  if (
    e.key === 'Enter' &&
    !e.isComposing &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.altKey &&
    !$('#search-results').hidden
  ) {
    const first = $('#search-results [data-issue]');
    if (first) selectIssue(first.dataset.issue);
  }
});
$('#scope').addEventListener('change', () => {
  remember();
  state.scope = $('#scope').value;
  state.edgeSelection = null;
  render(state.mode === 'global');
  showSearch();
});
$('#target').addEventListener('change', () => setTarget($('#target').value));
$('#target-clear').onclick = () => setTarget('');
$$('[data-edge-toggle]').forEach((input) =>
  input.addEventListener('change', () => {
    const kind = input.dataset.edgeToggle;
    if (input.checked) state.visibleEdges.add(kind);
    else state.visibleEdges.delete(kind);
    state.edgeSelection = null;
    render(state.mode === 'local');
  }),
);
$('#back').onclick = restorePrevious;
$('#overview').onclick = () => overview();
$('#brand').onclick = (e) => {
  e.preventDefault();
  overview();
};
$('#fit').onclick = () => fitScene(currentFocusNodes());
$('#zoom-in').onclick = () => zoomAt(1.25);
$('#zoom-out').onclick = () => zoomAt(0.8);
$('#export').onclick = exportSVG;
$('#tree-collapse').onclick = () => {
  state.treeDomains.clear();
  state.treeCats.clear();
  renderTree();
};
$('#theme').onclick = () => {
  document.body.classList.toggle('light');
  syncTheme();
  try {
    localStorage.setItem(
      'stellar-theme',
      document.body.classList.contains('light') ? 'light' : 'dark',
    );
  } catch {
    /* Local storage may be unavailable for file URLs. */
  }
  drawMinimap();
};
$('#tree-toggle').onclick = () => {
  $('#sidebar').classList.toggle('visible');
  $('#inspector').classList.remove('visible');
};
$('#info-toggle').onclick = () => {
  $('#inspector').classList.toggle('visible');
  $('#sidebar').classList.remove('visible');
};
$('#maps-open').onclick = mapsModal;
$('#help-open').onclick = helpModal;
$('#modal-close').onclick = closeModal;
$('#modal').onclick = (e) => {
  if (e.target === $('#modal')) closeModal();
};
document.addEventListener('keydown', (e) => {
  if (e.isComposing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (!$('#modal').hidden) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Tab') {
      const els = $$('#modal button,#modal a[href]'),
        first = els[0],
        last = els.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    return;
  }
  if (e.key === 'Escape') {
    $('#search-results').hidden = true;
    $('#tooltip').hidden = true;
    $('#sidebar').classList.remove('visible');
    $('#inspector').classList.remove('visible');
    return;
  }
  if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
  if (e.key === '/') {
    e.preventDefault();
    if (innerWidth <= 650) $('#sidebar').classList.add('visible');
    $('#search').focus();
  }
  if (e.key.toLowerCase() === 'f') {
    e.preventDefault();
    fitScene(currentFocusNodes());
  }
  if (e.key === 'Enter' && e.target.matches('[data-node]')) {
    const n = sceneById.get(e.target.dataset.node);
    if (n.type === 'domain') selectDomain(n.key);
    else if (n.type === 'category') selectCategory(n.key);
    else selectIssue(n.key);
  }
  if (e.key === '+' || e.key === '=') zoomAt(1.25);
  if (e.key === '-') zoomAt(0.8);
});
let resizeTimer;
new ResizeObserver(() => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (initial) return;
    $('#toast').hidden = true;
    if (state.mode === 'global') {
      state.scene = globalScene();
      sceneById = new Map(state.scene.nodes.map((n) => [n.id, n]));
      drawScene();
    }
    fitScene(currentFocusNodes());
  }, 100);
}).observe($('#stage'));
render(true);
initial = false;
// Read-only diagnostics for reproducible browser verification.
window.stellar = {
  getState: () => ({
    mode: state.mode,
    selected: state.selected,
    scope: state.scope,
    target: state.target,
    baseCount: base.length,
    baseIds: [...baseIds],
    nodes: state.scene.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      key: n.key,
      x: n.x,
      y: n.y,
      ghost: !!n.ghost,
    })),
    edges: state.scene.edges
      .filter((e) => state.visibleEdges.has(e.kind))
      .map((e) => ({
        id: e.id,
        kind: e.kind,
        source: e.source,
        target: e.target,
        actual: e.actual,
      })),
    transform: { ...state.transform },
  }),
};
