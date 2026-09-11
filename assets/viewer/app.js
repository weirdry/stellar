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
const domainById = new Map(R.domains.map((d) => [d.id, d]));
const categoryById = new Map(R.categories.map((c) => [c.id, c]));
R.items = R.issues.filter((i) => i.scope === 'assigned');
R.context = R.issues.filter((i) => i.scope === 'context');
R.edges = R.relations;
for (const i of R.issues) {
  const c = categoryById.get(i.classification?.category);
  i.statusType = i.status.type;
  i.status = i.status.label;
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
  a.id.localeCompare(b.id, undefined, { numeric: true });
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
  $('#theme').title = light ? '다크 모드' : '라이트 모드';
  $('#theme').setAttribute('aria-label', $('#theme').title);
}
syncTheme();
$('#brand-title').textContent = R.title;
$('#brand-subtitle').textContent = R.source.name + ' · ' + R.owner;
$('#snapshot').textContent = R.source.snapshotAt + ' 스냅샷';
$('#taxonomy-count').textContent =
  R.domains.length + '개 영역 · ' + R.categories.length + '개 세부 묶음';
$('#maps-open').hidden = !R.attachments?.length;
$('#maps-open').textContent = '참고 자료 ' + (R.attachments?.length || 0);
$('#scope').value = state.scope;
$('#target').innerHTML += [...new Set(R.items.flatMap((i) => i.targets))]
  .sort((a, b) => a.localeCompare(b))
  .map((t) => `<option>${esc(t)}</option>`)
  .join('');
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
  if (push) remember();
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
  if (push) remember();
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
  if (push) remember();
  state.mode = 'local';
  state.selected = { type: 'issue', id };
  state.edgeSelection = null;
  const i = all.get(id);
  if (domains.has(i.domain)) {
    state.treeDomains.add(i.domain);
    state.treeCats.add(i.category);
  }
  $('#search').value = '';
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
      subtitle: `${items.length}개 · ${new Set(items.map((i) => i.category)).size}묶음`,
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
          subtitle: ci.length + '개',
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
        subtitle: xs.length + '개',
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
      subtitle: ds.length + '개 · 대상 일치',
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
      da.localeCompare(db) || a.localeCompare(b, undefined, { numeric: true })
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
      subtitle: '작업 영역',
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
      subtitle: '보고서용 분류',
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
        let h = `<div class="tree-domain"><div class="tree-row ${sel ? 'selected' : ''} ${dim ? 'dim' : ''}" data-tree-domain="${esc(d.id)}"><button class="tree-toggle" data-tree-toggle-domain="${esc(d.id)}" aria-label="${esc(d.label)} ${opened ? '접기' : '펼치기'}" aria-expanded="${opened}">${opened ? '⌄' : '›'}</button><button class="tree-title" data-domain="${esc(d.id)}"><i class="domain-dot" style="--dc:${domainColor(d.id)}"></i><span>${esc(d.label)}</span></button><span class="count">${base.filter((i) => i.domain === d.id).length}</span></div>`;
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
                let s = `<div class="tree-category"><div class="tree-row ${cs ? 'selected' : ''} ${cd ? 'dim' : ''}"><button class="tree-toggle" data-tree-toggle-category="${esc(c.id)}" aria-label="${esc(c.label)} ${op ? '접기' : '펼치기'}" aria-expanded="${op}">${op ? '⌄' : '›'}</button><button class="tree-title" data-category="${esc(c.id)}"><span>${esc(c.label)}</span></button><span class="count">${xs.filter((i) => baseIds.has(i.id)).length}</span></div>`;
                if (op)
                  s +=
                    '<div class="tree-children">' +
                    xs
                      .map(
                        (i) =>
                          `<div class="tree-row tree-issue ${selected?.id === i.id ? 'selected' : ''} ${state.target && !isTarget(i) ? 'dim' : ''}"><i class="status-dot ${esc(i.statusType)}"></i><button class="tree-title" data-issue="${esc(i.id)}" title="${esc(i.title)}"><b>${esc(i.id)}${!baseIds.has(i.id) ? ' · 맥락' : ''}</b><span>${esc(i.title)}</span></button></div>`,
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
    '<div class="empty-note" style="padding:15px">표시할 이슈가 없습니다.</div>';
}
function pill(i) {
  return `<span class="pill ${esc(i.statusType)}"><i class="status-dot ${esc(i.statusType)}"></i>${esc(i.status)}</span>`;
}
function relationLabel(e, id) {
  if (e.kind === 'blocks')
    return e.source === id ? '후행 · blocks' : '선행 · blockedBy';
  if (e.kind === 'parent') return e.source === id ? '하위 이슈' : '상위 이슈';
  if (e.kind === 'related') return '연관';
  return e.source === id ? '중복 원본' : '중복 이슈';
}
function targetTags(i) {
  return (i.targets || [])
    .map(
      (t) =>
        `<button class="tag target" data-target="${esc(t)}">${esc(t)}</button>`,
    )
    .join('');
}
function relationRow(otherId, label = '') {
  const x = all.get(otherId);
  return `<button class="relation-row" data-issue="${esc(otherId)}"><i class="status-dot ${esc(x.statusType)}"></i><div><b>${esc(otherId)}</b><span class="title">${esc(x.title)}</span><small>${esc(x.status)}${!baseIds.has(otherId) ? ' · 범위 밖 맥락' : ''}</small></div>${label ? `<span class="rel-kind">${esc(label)}</span>` : ''}</button>`;
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
    const kind = {
      blocks: '선행 관계',
      related: '연관 관계',
      parent: '원본 상하위',
      duplicate: '중복 관계',
    }[e.kind];
    p.innerHTML = `<div class="section-label">RELATIONSHIP</div><h2>${kind} ${e.actual.length}건</h2><p>접힌 노드 사이의 선은 아래 실제 이슈 관계를 모은 것입니다. 영역 전체가 서로 의존한다는 뜻은 아닙니다.</p>${e.actual.map((a) => `<div class="info-note"><p>${esc(a.source)} ${e.kind === 'related' ? '↔' : '→'} ${esc(a.target)}</p></div>${relationRow(a.source)}${relationRow(a.target)}`).join('')}`;
    return;
  }
  const selected = state.selected;
  if (!selected && state.target) {
    const matches = base.filter(isTarget),
      every = R.items.filter(isTarget),
      ds = R.domains.filter((d) => matches.some((i) => i.domain === d.id));
    p.innerHTML = `<div class="section-label">TARGET OVERLAY</div><span class="tag target">보고서용 영향 대상</span><h1>${esc(state.target)}</h1><p>영역을 가로질러 같은 제품·연구에 영향을 주는 작업을 강조했습니다.</p><div class="overview-count"><div><strong>${matches.length}</strong><span>현재 범위</span></div><div><strong>${ds.length}</strong><span>걸쳐 있는 영역</span></div><div><strong>${every.length}</strong><span>전체 이력</span></div></div>${
      ds
        .map(
          (d) =>
            `<h3><i class="domain-dot" style="--dc:${domainColor(d.id)}"></i> ${esc(d.label)} · ${matches.filter((i) => i.domain === d.id).length}</h3>${matches
              .filter((i) => i.domain === d.id)
              .map((i) => relationRow(i.id))
              .join('')}`,
        )
        .join('') ||
      '<p class="empty-note">현재 상태 범위에 해당하는 이슈가 없습니다.</p>'
    }<div class="info-note"><p>대상은 보고서의 해석입니다. 대상이 같다는 이유로 관계선을 추가하지 않습니다.</p></div><button class="primary-button wide" data-target="">강조 해제</button>`;
    return;
  }
  if (!selected) {
    p.innerHTML = `<div class="section-label">YOUR WORK, CONNECTED</div><h1>작업의 위치와<br>연결을 함께.</h1><p class="intro">영역을 누르면 세부 묶음으로,<br>이슈를 누르면 주변 관계로 들어갑니다.</p><div class="overview-count"><div><strong>${base.length}</strong><span>${esc(scopeName())}</span></div><div><strong>${base.filter((i) => blocked(i).length && active(i)).length}</strong><span>미완료 선행 있음</span></div><div><strong>${R.domains.length}</strong><span>작업 영역</span></div></div><h3>여기서 시작해 보세요</h3><div class="quicklinks">${R.domains
      .filter((d) => base.some((i) => i.domain === d.id))
      .slice(0, 4)
      .map(
        (d) =>
          `<button class="quicklink" data-domain="${esc(d.id)}"><i class="domain-dot" style="--dc:${domainColor(d.id)}"></i><div><b>${esc(d.label)}</b><small>${esc(d.description)}</small></div><span>↗</span></button>`,
      )
      .join(
        '',
      )}</div><div class="info-note"><p><b>두 종류의 연결</b><br>분류선은 보고서가 정한 묶음입니다. 선행·연관·상하위 선은 원본에 등록된 관계입니다.</p></div><p class="empty-note">노드 위치는 탐색 중 고정됩니다. 자유롭게 이동·확대하고 F로 화면에 맞춰 보세요.</p>`;
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
    p.innerHTML = `<div class="section-label">${c ? 'SUBGROUP' : 'WORK AREA'}</div><span class="domain-dot" style="--dc:${domainColor(domain.id)};width:11px;height:11px"></span><h2>${esc(c ? c.label : domain.label)}</h2><p>${esc(c ? c.basis : domain.description)}</p><div class="overview-count"><div><strong>${items.length}</strong><span>현재 범위</span></div><div><strong>${every.filter(active).length}</strong><span>전체 미완료</span></div><div><strong>${every.length}</strong><span>전체 이력</span></div></div>${summaryCounts(items)}${c ? `<h3>분류 경로</h3><div class="path-line"><button data-domain="${esc(domain.id)}">${esc(domain.label)}</button> › ${esc(c.label)}</div><h3>이슈 ${items.length}개</h3>${items.map((i) => relationRow(i.id)).join('')}` : `<h3>세부 묶음 ${cs.length}개</h3>${cs.map((x) => `<button class="category-row" data-category="${esc(x.id)}"><span>${esc(x.label)}</span><b>${items.filter((i) => i.category === x.id).length}</b><i>›</i></button>`).join('')}`}<div class="info-note"><p>숫자는 ${esc(scopeName())} 범위입니다. 선을 누르면 묶음 사이의 실제 이슈 관계를 확인할 수 있습니다.</p></div>`;
    return;
  }
  const i = all.get(selected.id),
    rels = incident(i.id),
    byKind = {};
  for (const e of rels) {
    const k = relationLabel(e, i.id);
    (byKind[k] ??= []).push(e);
  }
  const completedParent =
    i.parentId && all.get(i.parentId)?.statusType === 'completed' && active(i);
  p.innerHTML = `<div class="section-label">ISSUE NEIGHBORHOOD</div><span class="id-label">${esc(i.id)}</span><h2>${esc(i.title)}</h2>${pill(i)}${i.detail === 'unqueried' ? '<span class="tag">상세 미조회</span>' : ''}${!baseIds.has(i.id) ? '<span class="tag">범위 밖 맥락</span>' : ''}${blocked(i).length && active(i) ? `<div class="info-note" style="border-color:var(--blocks)"><p>미완료 선행 <b>${blocked(i).length}개</b>가 등록되어 있습니다.</p></div>` : ''}${completedParent ? `<div class="info-note"><p>상위 ${esc(i.parentId)}는 ${esc(all.get(i.parentId).status)}이며, 이 이슈는 미완료입니다.</p></div>` : ''}<h3>작업 목적별 위치</h3><div class="path-line">${domains.has(i.domain) ? `<button data-domain="${esc(i.domain)}">${esc(i.domainLabel)}</button><br>↳ <button data-category="${esc(i.category)}">${esc(i.group)}</button>` : '집계 범위 밖의 연결 이슈'}</div><p>${esc(i.classificationBasis || '기존 이슈와의 관계 맥락으로 표시합니다.')}</p>${i.targets?.length ? `<h3>영향 대상 · 보고서 분류</h3>${targetTags(i)}` : ''}<dl class="kv"><dt>담당자</dt><dd>${esc(i.assignee || '미조회')}</dd><dt>최근 수정</dt><dd>${i.updatedAt ? new Date(i.updatedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' }) : '미조회'}</dd><dt>우선순위</dt><dd>${esc(i.priority || '미조회')}</dd></dl>${i.url ? `<a class="primary-button wide" href="${esc(i.url)}" target="_blank" rel="noopener">원본에서 열기 ↗</a>` : '<p class="empty-note">원본 링크가 제공되지 않았습니다.</p>'}<h3>이번 조회에서 확인된 관계 ${rels.length}건</h3><p class="empty-note">아래 이슈를 선택해 연결을 따라갈 수 있습니다. 현재 상태 범위 밖 이슈도 맥락으로 표시합니다.</p>${
    Object.entries(byKind)
      .map(
        ([name, es]) =>
          `<h3>${esc(name)} · ${es.length}</h3>${es.map((e) => relationRow(e.source === i.id ? e.target : e.source)).join('')}`,
      )
      .join('') || '<p class="empty-note">등록된 직접 관계가 없습니다.</p>'
  }<hr class="info-divider"><p class="empty-note">관계·완료는 원본 스냅샷 기준입니다. 코드·CI·배포 완료를 별도 검증한 결과는 아닙니다.</p>`;
}
function renderCaption() {
  let crumb = '',
    caption;
  if (state.mode === 'local') {
    const i = selectedIssue(),
      others = state.scene.nodes.filter((n) => n.type === 'issue' && !n.center),
      ghosts = others.filter((n) => n.ghost).length;
    crumb = `› <span>${esc(i.id)} 주변</span>`;
    caption = `<b>${others.length}개 이슈와 직접 연결</b> · 분류 경로 함께 표시${ghosts ? ` · 범위 밖 맥락 ${ghosts}개` : ''}`;
  } else if (state.selected?.type === 'domain') {
    const d = domains.get(state.selected.id);
    crumb = `› <span>${esc(d.label)}</span>`;
    caption = `<b>${esc(d.description)}</b> · 세부 묶음을 눌러 이슈 펼치기`;
  } else if (state.selected?.type === 'category') {
    const c = categories.get(state.selected.id);
    crumb = `› <span>${esc(c.label)}</span>`;
    caption = `<b>${esc(domains.get(c.domain).label)}</b> · 이슈를 눌러 주변 관계 탐색`;
  } else
    caption = `<b>${base.length}개 ${esc(scopeName())}</b> · 영역을 눌러 확대하고, 이슈의 연결을 따라가세요`;
  if (state.target && !state.selected) {
    crumb = `› <span>${esc(state.target)}</span>`;
    caption = `<b>${base.filter(isTarget).length}개 대상 작업</b> · ${new Set(base.filter(isTarget).map((i) => i.domain)).size}개 영역에서 모아보기`;
  }
  if (state.target)
    caption += ` <span class="target-note">· ${esc(state.target)} ${base.filter(isTarget).length}개 강조</span>`;
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
        `<g class="graph-node ${n.type} ${n.ghost ? 'ghost' : ''} ${nodeSelected(n) ? 'selected' : ''} ${state.target ? (targetMatch(n) ? 'target-match' : 'dim') : ''} ${!inFocus(n) ? 'out-of-focus' : ''}" tabindex="0" role="button" aria-label="${esc(n.type === 'issue' ? `${n.key} ${n.subtitle} ${n.issue.status}` : n.label)}" data-node="${esc(n.id)}" transform="translate(${n.x} ${n.y})"><circle class="node-halo"/><circle class="node-hit"/><circle class="node-dot" style="fill:${n.type === 'issue' ? nColor(n) : 'var(--canvas)'};stroke:${nColor(n)}"/><text class="node-count"></text>${n.type === 'issue' && active(n.issue) && blocked(n.issue).length ? '<circle class="node-block"/>' : ''}<text class="node-label"></text></g>`,
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
        offset =
          parallels.length > 1
            ? (order - (parallels.length - 1) / 2) * 70
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
      label.textContent =
        e.actual.length > 1
          ? `${{ blocks: '선행', parent: '상하위', related: '연관' }[e.kind] || '관계'} ${e.actual.length}건`
          : {
              blocks: '선행 →',
              parent: '상하위 →',
              related: '연관',
              duplicate: '중복 원본 →',
            }[e.kind] || '';
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
      const mainText = n.type === 'issue' ? n.key : n.label,
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
    notify(`${target} · 현재 범위 ${base.filter(isTarget).length}개 강조`);
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
    panel.hidden = true;
    return;
  }
  const results = R.items
    .filter((i) =>
      [i.id, i.title, i.domainLabel, i.group, ...i.targets]
        .join(' ')
        .toLocaleLowerCase()
        .includes(q),
    )
    .sort((a, b) =>
      a.id.toLowerCase() === q
        ? -1
        : b.id.toLowerCase() === q
          ? 1
          : sortIssues(a, b),
    );
  panel.hidden = false;
  panel.innerHTML =
    results
      .slice(0, 30)
      .map(
        (i) =>
          `<button class="search-result" data-issue="${esc(i.id)}"><b>${esc(i.id)} · ${esc(i.status)}</b><span>${esc(i.title)}</span><small>${esc(i.domainLabel)} › ${esc(i.group)}${!baseIds.has(i.id) ? ' · 현재 범위 밖' : ''}</small></button>`,
      )
      .join('') +
      (results.length > 30
        ? `<p class="empty-note" style="padding:8px 12px">${results.length}개 중 앞 30개 표시 · 검색어를 더 입력해 주세요.</p>`
        : '') ||
    '<p class="empty-note" style="padding:12px">검색 결과가 없습니다.</p>';
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
    '참고 자료',
    `<p class="modal-note">보고서와 함께 제공된 자료입니다. 선택하면 별도 페이지에서 열립니다.</p><div class="mapgrid">${(R.attachments || []).map((m) => `<a class="mapcard" href="${esc(m.href)}" target="_blank" rel="noopener noreferrer"><b>${esc(m.title)} ↗</b><p>${esc(m.note)}</p></a>`).join('')}</div>`,
  );
}
function helpModal() {
  openModal(
    '캔버스 읽는 방법',
    `<div class="help-grid"><div><h3>트리에서 위치를 잡고, 그래프로 연결을 따라갑니다</h3><ul><li>영역 선택: 세부 묶음이 있는 군집으로 확대합니다.</li><li>세부 묶음 선택: 이슈 노드를 펼칩니다.</li><li>이슈 선택: 분류 경로와 직접 연결된 이슈를 함께 보여줍니다.</li><li>이전 버튼으로 탐색을 되돌립니다. 전체 지도는 군집을 접어 한눈에 보여줍니다.</li></ul><p>드래그: 이동 · 휠: 확대/축소 · Shift+휠: 이동<br>F: 화면에 맞춤 · /: 검색 · Esc: 닫기<br>SVG 저장: 현재 보이는 캔버스를 이미지로 저장합니다.</p></div><div><h3>연결의 의미</h3><p>분류선은 이슈의 작업 목적을 나타냅니다. 원본의 상하위 관계와 별개입니다.</p><p>선행 화살표는 선행 이슈에서 후행 이슈를 향합니다. 연관선은 방향이 없습니다. 접힌 묶음의 선을 누르면 실제 이슈 관계를 확인할 수 있습니다.</p><p>대상 강조는 다른 영역에 흩어진 같은 제품·연구의 작업을 함께 강조합니다. 대상이 같다는 이유로 의존 관계를 만들지 않습니다.</p><p>선택 이슈의 주변에는 현재 상태 범위 밖 이슈도 나타납니다. 점선 테두리로 구별하며 집계에 더하지 않습니다.</p><p>분류의 근거는 영역·묶음·이슈를 선택하면 상세 패널에 표시됩니다.</p><p>목록 기준: ${esc(R.source.snapshotAt)}. 실시간 갱신하지 않습니다.</p><p>${esc(R.source.notes)}</p></div></div>`,
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
  title.textContent = `${R.title} · ${state.selected?.id || '전체'} · ${R.source.snapshotAt}`;
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
  notify('현재 캔버스를 SVG로 저장했습니다.');
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
      ? `<b>${esc(n.key)} · ${esc(n.issue.status)}</b>${esc(n.subtitle)}<span>${esc(n.issue.domainLabel || '맥락 이슈')}${n.ghost ? ' · 범위 밖 맥락' : ''}</span>`
      : `<b>${esc(n.label)}</b>${esc(n.subtitle)}<span>${n.type === 'domain' ? '선택해서 세부 묶음 확대' : '선택해서 이슈 펼치기'}</span>`;
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
  if (e.key === 'Enter') {
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
