'use strict';
/* ========== Yardımcılar ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const tl = (n, cur = 'TRY') => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n || 0);
const num = v => { const n = parseFloat(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => today().slice(0, 7);
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtMonth = m => new Date(m + '-01T00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const addMonths = (m, k) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const monthDiff = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
const daysUntil = d => Math.round((new Date(d + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }

/* ========== Veri ========== */
const GOLD_TYPES = {
  GRA: 'Gram altın (24 ayar)', HAS: 'Has altın (gram)', CEYREKALTIN: 'Çeyrek altın', YARIMALTIN: 'Yarım altın',
  TAMALTIN: 'Tam altın', CUMHURIYETALTINI: 'Cumhuriyet altını', ATAALTIN: 'Ata altın', GUMUS: 'Gümüş (gram)'
};
const ASSET_EVENTS = ['Trafik sigortası', 'Kasko', 'Muayene', 'MTV', 'Konut sigortası', 'DASK', 'Bakım', 'Diğer'];
function defaultData() {
  return {
    version: 2,
    categories: ['Yemek', 'Ulaşım', 'Yakıt', 'Konaklama', 'Malzeme / ekipman', 'Yazılım / abonelik', 'Kargo', 'Diğer'],
    expenses: [], gold: [], notes: [], installments: [], assets: []
  };
}
const cfg = Object.assign({ owner: 'ThyronTR', repo: 'muhasebe-veri', token: '' }, load('mh_cfg') || {});
let data = Object.assign(defaultData(), load('mh_data') || {});
let sha = load('mh_sha');
let dirty = !!load('mh_dirty');
let prices = load('mh_prices'); // {at, items:{KEY:{buy,sell,change}}}

/* ========== GitHub senkron ========== */
const toB64 = str => { const b = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), c => c.charCodeAt(0)));
async function gh(path, opts = {}, raw = false) {
  const r = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${path}`, {
    ...opts, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }
  });
  if (!r.ok) { const e = new Error('GitHub ' + r.status); e.status = r.status; throw e; }
  return raw ? r.text() : r.json();
}
function setSync(state, title) { const s = $('#sync'); s.className = 'sync ' + state; s.title = title || ''; }
function saveLocal() { store('mh_data', data); store('mh_sha', sha); store('mh_dirty', dirty); }
async function pull() {
  if (!cfg.token) return setSync('', 'GitHub bağlı değil — veriler yalnızca bu cihazda');
  setSync('busy', 'Yükleniyor…');
  try {
    const meta = await gh('data.json');
    const text = meta.content ? fromB64(meta.content) : await gh('data.json', {}, true);
    data = Object.assign(defaultData(), JSON.parse(text)); sha = meta.sha; dirty = false; saveLocal();
    setSync('ok', 'Güncel'); render();
  } catch (e) {
    if (e.status === 404) { sha = null; dirty = true; saveLocal(); return push(); }
    setSync('err', e.status === 401 ? 'Token geçersiz' : 'Bağlantı yok — yerel veri gösteriliyor');
  }
}
let pushing = null;
async function push() {
  if (!cfg.token || !dirty) return;
  if (pushing) return pushing.then(push);
  setSync('busy', 'Kaydediliyor…');
  pushing = (async () => {
    try {
      const body = { message: 'Veri güncellendi ' + new Date().toISOString(), content: toB64(JSON.stringify(data, null, 1)) };
      if (sha) body.sha = sha;
      const res = await gh('data.json', { method: 'PUT', body: JSON.stringify(body) });
      sha = res.content.sha; dirty = false; saveLocal(); setSync('ok', 'Kaydedildi');
    } catch (e) {
      if (e.status === 409 || e.status === 422) { setSync('err', 'Başka cihazda değişiklik var'); toast('Başka bir cihazda değişiklik var. Ayarlar → Sunucudan yükle.'); }
      else setSync('err', 'Çevrimdışı — bu cihazda saklandı, sonra gönderilecek');
    } finally { pushing = null; }
  })();
  return pushing;
}
let pushT;
function commit() { dirty = true; saveLocal(); clearTimeout(pushT); pushT = setTimeout(push, 700); render(); }
window.addEventListener('online', push);

/* Fiş fotoğrafı */
async function compressImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72).split(',')[1];
}
async function uploadReceipt(file, id) {
  if (!cfg.token) throw new Error('GitHub bağlı değil');
  const content = await compressImage(file);
  const path = `fisler/${id}.jpg`;
  await gh(path, { method: 'PUT', body: JSON.stringify({ message: 'Fiş eklendi', content }) });
  return path;
}
async function showReceipt(path) {
  openDlg('<p class="muted">Fiş yükleniyor…</p>');
  try { const m = await gh(path); $('#dlgBody').innerHTML = `<img src="data:image/jpeg;base64,${m.content.replace(/\s/g, '')}" alt="Fiş"><div class="btns"><button class="btn ghost" data-close>Kapat</button></div>`; }
  catch { $('#dlgBody').innerHTML = '<p>Fiş açılamadı (bağlantıyı kontrol et).</p><div class="btns"><button class="btn ghost" data-close>Kapat</button></div>'; }
}

/* Altın fiyatları */
async function fetchPrices(force) {
  if (!force && prices && Date.now() - prices.at < 5 * 60e3) return;
  try {
    const r = await fetch('https://finans.truncgil.com/v4/today.json', { cache: 'no-store' });
    const text = await r.text(); let j;
    try { j = JSON.parse(text); }
    catch { // servis bazen yarım cevap döndürüyor: anahtarları tek tek çıkar
      j = {}; for (const m of text.matchAll(/"([A-Z_]+)":(\{[^{}]*\})/g)) { try { j[m[1]] = JSON.parse(m[2]); } catch {} }
      const u = text.match(/"Update_Date":"([^"]+)"/); if (u) j.Update_Date = u[1];
    }
    const items = {};
    for (const k of Object.keys(GOLD_TYPES)) if (j[k] && j[k].Buying) items[k] = { buy: j[k].Buying, sell: j[k].Selling, change: j[k].Change };
    if (j.USD) items.USD = { buy: j.USD.Buying, sell: j.USD.Selling, change: j.USD.Change };
    prices = { at: Date.now(), src: j.Update_Date, items }; store('mh_prices', prices);
    if (state.tab === 'yatirim' || state.tab === 'ana') render();
  } catch { if (force) toast('Fiyatlar alınamadı'); }
}
setInterval(() => fetchPrices(true), 5 * 60e3);

/* ========== Hesaplamalar ========== */
const goldValue = g => (prices?.items[g.type]?.buy || 0) * g.qty;
function goldTotals() {
  let value = 0, cost = 0, costKnown = true;
  for (const g of data.gold) { value += goldValue(g); if (g.unitCost) cost += g.unitCost * g.qty; else costKnown = false; }
  return { value, cost, costKnown };
}
function instInfo(it) {
  const idx = monthDiff(it.start, thisMonth()); // 0 = ilk taksit ayı
  const end = addMonths(it.start, it.count - 1);
  const paidCount = it.paid.length;
  const remaining = Math.max(0, it.count - paidCount);
  const active = idx >= 0 && idx < it.count;
  const dueThisMonth = active && !it.paid.includes(thisMonth());
  return { idx, end, paidCount, remaining, remainingAmount: remaining * it.monthly, active, dueThisMonth, finished: remaining === 0 };
}
function upcomingEvents(days = 9999) {
  const out = [];
  for (const a of data.assets) for (const e of a.events) { const d = daysUntil(e.date); if (d <= days) out.push({ a, e, d }); }
  return out.sort((x, y) => x.d - y.d);
}
const dayPill = d => d < 0 ? `<span class="pill bad">${-d} gün geçti</span>` : d <= 30 ? `<span class="pill warn">${d === 0 ? 'Bugün' : d + ' gün kaldı'}</span>` : `<span class="pill">${d} gün</span>`;

/* ========== Dialog / form ========== */
const dlg = $('#dlg');
function openDlg(html) { $('#dlgBody').innerHTML = html; if (!dlg.open) dlg.showModal(); }
function closeDlg() { dlg.close(); }
dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-close]')) closeDlg(); });
const opt = (v, label, sel) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(label)}</option>`;

/* ========== Görünümler ========== */
const state = { tab: 'ana', month: thisMonth(), src: 'hepsi' };
const TITLES = { ana: 'Ana Sayfa', harcama: 'Harcamalar', yatirim: 'Yatırım', taksit: 'Taksitler', varlik: 'Varlıklar', ayar: 'Ayarlar' };

function render() {
  $('#title').textContent = TITLES[state.tab];
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  $('#view').innerHTML = VIEWS[state.tab]();
  window.scrollTo(0, 0);
}
function go(tab) { state.tab = tab; render(); if (tab === 'yatirim' || tab === 'ana') fetchPrices(); }
document.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });

const VIEWS = {};

/* --- Ana sayfa --- */
VIEWS.ana = () => {
  const m = thisMonth(); const ex = data.expenses.filter(x => x.date.startsWith(m));
  const cep = ex.filter(x => x.source === 'cep').reduce((s, x) => s + x.amount, 0);
  const kart = ex.filter(x => x.source === 'kart').reduce((s, x) => s + x.amount, 0);
  const alacak = data.expenses.filter(x => x.source === 'cep' && !x.reimbursed).reduce((s, x) => s + x.amount, 0);
  const g = goldTotals();
  const inst = data.installments.map(i => [i, instInfo(i)]).filter(([, f]) => f.active);
  const instMonth = inst.reduce((s, [i]) => s + i.monthly, 0);
  const instLeft = inst.filter(([, f]) => f.dueThisMonth).length;
  const up = upcomingEvents(60);
  return `
  <div class="tiles">
    <div class="tile" data-tab="harcama"><div class="h"><span>₺</span>Bu ay harcama</div><div class="v">${tl(cep + kart)}</div><div class="s">Cebimden ${tl(cep)} · Kart ${tl(kart)}</div></div>
    <div class="tile" data-tab="harcama"><div class="h"><span>↩</span>Şirketten alacağım</div><div class="v">${tl(alacak)}</div><div class="s">Cebimden ödenen, geri alınmamış</div></div>
    <div class="tile" data-tab="yatirim"><div class="h"><span>◆</span>Altın değeri</div><div class="v">${data.gold.length ? (prices ? tl(g.value) : '…') : '—'}</div><div class="s">${prices ? 'Güncel alış fiyatıyla' : 'Fiyat bekleniyor'}</div></div>
    <div class="tile" data-tab="taksit"><div class="h"><span>▦</span>Bu ay taksit</div><div class="v">${tl(instMonth)}</div><div class="s">${inst.length ? (instLeft ? instLeft + ' ödeme bekliyor' : 'Hepsi ödendi') : 'Aktif taksit yok'}</div></div>
  </div>
  <h2>Yaklaşan yenilemeler (60 gün)</h2>
  ${up.length ? `<div class="list">${up.map(({ a, e, d }) => `
    <div class="item" data-tab="varlik"><div class="ic">⛨</div><div class="t"><b>${esc(a.name)} · ${esc(e.kind)}</b><small>${fmtDate(e.date)}${e.cost ? ' · ' + tl(e.cost) : ''}</small></div>${dayPill(d)}</div>`).join('')}</div>`
    : '<div class="card empty">Önümüzdeki 60 günde yenileme yok.</div>'}
  ${!cfg.token ? '<h2>Senkron</h2><div class="card">Veriler şu an yalnızca bu cihazda. Telefon ve bilgisayarda aynı veriyi görmek için <a href="#" data-tab="ayar">Ayarlar</a>’dan GitHub’a bağlan.</div>' : ''}`;
};

/* --- Harcamalar --- */
const SRC = { cep: 'Cebimden', kart: 'Şirket kartı' };
VIEWS.harcama = () => {
  const list = data.expenses.filter(x => x.date.startsWith(state.month) && (state.src === 'hepsi' || x.source === state.src)).sort((a, b) => b.date.localeCompare(a.date));
  const sum = s => data.expenses.filter(x => x.date.startsWith(state.month) && x.source === s).reduce((t, x) => t + x.amount, 0);
  const alacak = data.expenses.filter(x => x.source === 'cep' && !x.reimbursed);
  let lastDay = '';
  return `
  <div class="row"><input type="month" id="exMonth" value="${state.month}" style="max-width:190px"><button class="btn ghost" id="exCsv">CSV indir</button></div>
  <div class="tiles" style="margin-top:10px">
    <div class="tile"><div class="h">Cebimden</div><div class="v gider">${tl(sum('cep'))}</div></div>
    <div class="tile"><div class="h">Şirket kartı</div><div class="v transfer">${tl(sum('kart'))}</div></div>
  </div>
  ${alacak.length ? `<div class="card" style="margin-top:10px"><div class="row"><div><b>Şirketten alacağım:</b> ${tl(alacak.reduce((s, x) => s + x.amount, 0))}<div class="muted">${alacak.length} harcama geri alınmadı</div></div><button class="btn ghost" id="exReimb">Hepsi alındı</button></div></div>` : ''}
  <div class="seg wide" style="margin-top:14px" id="srcSeg">
    ${['hepsi', 'cep', 'kart'].map(s => `<button data-src="${s}" class="${state.src === s ? 'on' : ''}">${s === 'hepsi' ? 'Tümü' : SRC[s]}</button>`).join('')}
  </div>
  <h2>${fmtMonth(state.month)}</h2>
  ${list.length ? `<div class="list">${list.map(x => { const day = x.date !== lastDay ? `<div class="day">${fmtDate(lastDay = x.date)}</div>` : ''; return day + `
    <div class="item" data-ex="${x.id}"><div class="ic ${x.source === 'cep' ? 'gider' : 'transfer'}">${x.source === 'cep' ? 'C' : 'K'}</div>
      <div class="t"><b>${esc(x.note || x.category)}</b><small>${esc(x.category)} · ${SRC[x.source]}${x.receipt ? ' · 📎' : ''}${x.source === 'cep' ? (x.reimbursed ? ' <span class="pill good">alındı</span>' : ' <span class="pill warn">alınacak</span>') : ''}</small></div>
      <div class="amt">${tl(x.amount)}</div></div>`; }).join('')}</div>` : '<div class="card empty">Bu ay kayıt yok.</div>'}
  <button class="fab" id="exAdd" aria-label="Harcama ekle">＋</button>`;
};
function expenseForm(x) {
  const e = x || { source: 'cep', date: today(), category: data.categories[0], amount: '', note: '', reimbursed: false };
  openDlg(`<form id="exForm">
    <div class="seg wide" id="fSrc">${Object.entries(SRC).map(([k, v]) => `<button type="button" data-v="${k}" class="${e.source === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <label>Tutar (₺)</label><input name="amount" class="big" inputmode="decimal" required value="${e.amount || ''}" autofocus>
    <div class="two"><div><label>Tarih</label><input type="date" name="date" value="${e.date}" required></div>
      <div><label>Kategori</label><select name="category">${data.categories.map(c => opt(c, c, e.category)).join('')}</select></div></div>
    <label>Açıklama</label><input name="note" value="${esc(e.note)}" placeholder="Ne aldın?">
    <label id="reimbWrap" style="${e.source === 'cep' ? '' : 'display:none'}"><input type="checkbox" class="chk" name="reimbursed" ${e.reimbursed ? 'checked' : ''}>Şirketten geri alındı</label>
    <label>Fiş fotoğrafı ${e.receipt ? '(kayıtlı — <a href="#" id="seeRc">gör</a>)' : ''}</label><input type="file" name="receipt" accept="image/*" capture="environment">
    <button class="btn block">Kaydet</button>
    <div class="btns">${x ? '<button type="button" class="btn danger" id="exDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div>
  </form>`);
  let src = e.source;
  $$('#fSrc button').forEach(b => b.onclick = () => { src = b.dataset.v; $$('#fSrc button').forEach(o => o.classList.toggle('on', o === b)); $('#reimbWrap').style.display = src === 'cep' ? '' : 'none'; });
  if ($('#seeRc')) $('#seeRc').onclick = ev => { ev.preventDefault(); showReceipt(e.receipt); };
  if ($('#exDel')) $('#exDel').onclick = () => { if (confirm('Bu harcama silinsin mi?')) { data.expenses = data.expenses.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  $('#exForm').onsubmit = async ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    const rec = { id: e.id || uid(), source: src, amount: num(f.get('amount')), date: f.get('date'), category: f.get('category'), note: f.get('note').trim(), reimbursed: src === 'cep' && !!f.get('reimbursed'), receipt: e.receipt || null };
    if (!rec.amount) return toast('Tutar gir');
    const file = f.get('receipt');
    if (file && file.size) { toast('Fiş yükleniyor…'); try { rec.receipt = await uploadReceipt(file, rec.id); } catch { toast('Fiş yüklenemedi (GitHub bağlantısı gerekli). Harcama fişsiz kaydedildi.'); } }
    if (x) Object.assign(x, rec); else data.expenses.push(rec);
    closeDlg(); commit();
  };
}
document.addEventListener('click', e => {
  if (e.target.closest('#exAdd')) expenseForm();
  const it = e.target.closest('[data-ex]'); if (it) expenseForm(data.expenses.find(x => x.id === it.dataset.ex));
  const s = e.target.closest('#srcSeg button'); if (s) { state.src = s.dataset.src; render(); }
  if (e.target.closest('#exReimb') && confirm('Cebimden yapılan tüm harcamalar "geri alındı" işaretlensin mi?')) { data.expenses.forEach(x => { if (x.source === 'cep') x.reimbursed = true; }); commit(); }
  if (e.target.closest('#exCsv')) {
    const rows = [['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Tutar', 'Geri alındı']].concat(
      data.expenses.filter(x => x.date.startsWith(state.month)).sort((a, b) => a.date.localeCompare(b.date))
        .map(x => [x.date, SRC[x.source], x.category, x.note, String(x.amount).replace('.', ','), x.source === 'cep' ? (x.reimbursed ? 'Evet' : 'Hayır') : '']));
    download(`harcamalar-${state.month}.csv`, '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv');
  }
});
document.addEventListener('change', e => { if (e.target.id === 'exMonth' && e.target.value) { state.month = e.target.value; render(); } });
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

/* --- Yatırım --- */
VIEWS.yatirim = () => {
  const g = goldTotals(); const pl = g.value - g.cost;
  return `
  <h2>Altın</h2>
  <div class="card">
    <div class="row"><div><div class="muted">Toplam değer (alış fiyatıyla)</div><div class="big">${prices ? tl(g.value) : '…'}</div>
      ${g.cost && g.costKnown ? `<div class="${pl >= 0 ? 'gelir' : 'gider'}">${pl >= 0 ? '+' : ''}${tl(pl)} (${((pl / g.cost) * 100).toFixed(1)}%)</div>` : ''}</div>
      <button class="btn ghost" id="pxRefresh">Yenile</button></div>
    <div class="muted" style="margin-top:6px">${prices ? 'Fiyat: ' + esc(prices.src || new Date(prices.at).toLocaleString('tr-TR')) : 'Fiyatlar yükleniyor…'}</div>
  </div>
  <div class="list" style="margin-top:10px">
    ${data.gold.length ? data.gold.map(x => { const p = prices?.items[x.type]; return `
      <div class="item" data-gold="${x.id}"><div class="ic" style="color:#d4a017">◆</div>
        <div class="t"><b>${esc(GOLD_TYPES[x.type])} × ${String(x.qty).replace('.', ',')}</b><small>${p ? 'Birim ' + tl(p.buy) + ' · ' + (p.change >= 0 ? '▲' : '▼') + Math.abs(p.change) + '%' : ''}${x.note ? ' · ' + esc(x.note) : ''}</small></div>
        <div class="amt">${p ? tl(goldValue(x)) : '…'}</div></div>`; }).join('') : '<div class="empty">Henüz altın eklenmedi.</div>'}
  </div>
  <div class="btns"><button class="btn" id="goldAdd">＋ Altın ekle</button></div>
  ${prices ? `<h2>Piyasa</h2><div class="card">${Object.keys(GOLD_TYPES).filter(k => prices.items[k]).map(k => `<div class="kv"><span>${GOLD_TYPES[k]}</span><span>${tl(prices.items[k].buy)} / ${tl(prices.items[k].sell)}</span></div>`).join('')}
    ${prices.items.USD ? `<div class="kv"><span>Dolar</span><span>${tl(prices.items.USD.buy)} / ${tl(prices.items.USD.sell)}</span></div>` : ''}<div class="muted" style="margin-top:6px">Alış / satış</div></div>` : ''}
  <h2>Yatırım notları</h2>
  ${data.notes.length ? `<div class="list">${[...data.notes].sort((a, b) => b.date.localeCompare(a.date)).map(n => `
    <div class="item" data-note="${n.id}"><div class="ic">✎</div><div class="t"><b>${esc(n.title)}</b><small>${fmtDate(n.date)} · ${esc(n.body.slice(0, 70))}</small></div></div>`).join('')}</div>` : '<div class="card empty">Not yok.</div>'}
  <div class="btns"><button class="btn ghost" id="noteAdd">＋ Not ekle</button></div>`;
};
function goldForm(x) {
  const e = x || { type: 'GRA', qty: '', unitCost: '', date: today(), note: '' };
  openDlg(`<form id="gForm"><h3 style="margin:0">${x ? 'Altını düzenle' : 'Altın ekle'}</h3>
    <label>Tür</label><select name="type">${Object.entries(GOLD_TYPES).map(([k, v]) => opt(k, v, e.type)).join('')}</select>
    <div class="two"><div><label>Adet / gram</label><input name="qty" inputmode="decimal" required value="${e.qty}"></div>
      <div><label>Alış birim fiyatı (ops.)</label><input name="unitCost" inputmode="decimal" value="${e.unitCost || ''}" placeholder="₺"></div></div>
    <label>Alış tarihi</label><input type="date" name="date" value="${e.date}">
    <label>Not (nerede duruyor vs.)</label><input name="note" value="${esc(e.note)}">
    <button class="btn block">Kaydet</button>
    <div class="btns">${x ? '<button type="button" class="btn danger" id="gDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  if ($('#gDel')) $('#gDel').onclick = () => { if (confirm('Silinsin mi?')) { data.gold = data.gold.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  $('#gForm').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target);
    const rec = { id: e.id || uid(), type: f.get('type'), qty: num(f.get('qty')), unitCost: num(f.get('unitCost')) || null, date: f.get('date'), note: f.get('note').trim() };
    if (!rec.qty) return toast('Miktar gir');
    if (x) Object.assign(x, rec); else data.gold.push(rec); closeDlg(); commit(); };
}
function noteForm(x) {
  const e = x || { title: '', body: '', date: today() };
  openDlg(`<form id="nForm"><label>Başlık</label><input name="title" required value="${esc(e.title)}">
    <label>Tarih</label><input type="date" name="date" value="${e.date}">
    <label>Not</label><textarea name="body" rows="8">${esc(e.body)}</textarea>
    <button class="btn block">Kaydet</button>
    <div class="btns">${x ? '<button type="button" class="btn danger" id="nDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  if ($('#nDel')) $('#nDel').onclick = () => { if (confirm('Not silinsin mi?')) { data.notes = data.notes.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  $('#nForm').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target);
    const rec = { id: e.id || uid(), title: f.get('title').trim(), date: f.get('date'), body: f.get('body') };
    if (x) Object.assign(x, rec); else data.notes.push(rec); closeDlg(); commit(); };
}
document.addEventListener('click', e => {
  if (e.target.closest('#goldAdd')) goldForm();
  if (e.target.closest('#noteAdd')) noteForm();
  if (e.target.closest('#pxRefresh')) { toast('Fiyatlar güncelleniyor…'); fetchPrices(true); }
  const g = e.target.closest('[data-gold]'); if (g) goldForm(data.gold.find(x => x.id === g.dataset.gold));
  const n = e.target.closest('[data-note]'); if (n) noteForm(data.notes.find(x => x.id === n.dataset.note));
});

/* --- Taksitler --- */
VIEWS.taksit = () => {
  const all = data.installments.map(i => [i, instInfo(i)]);
  const act = all.filter(([, f]) => !f.finished);
  const monthTotal = all.filter(([, f]) => f.active).reduce((s, [i]) => s + i.monthly, 0);
  const debt = act.reduce((s, [, f]) => s + f.remainingAmount, 0);
  // Önümüzdeki 6 ay
  const next = Array.from({ length: 6 }, (_, k) => { const m = addMonths(thisMonth(), k); return [m, all.reduce((s, [i]) => { const d = monthDiff(i.start, m); return s + (d >= 0 && d < i.count ? i.monthly : 0); }, 0)]; });
  const max = Math.max(1, ...next.map(n => n[1]));
  const row = ([i, f]) => `
    <div class="item" data-inst="${i.id}"><div class="ic">▦</div>
      <div class="t"><b>${esc(i.name)}</b><small>${f.paidCount}/${i.count} ödendi · son: ${fmtMonth(f.end)}${i.day ? ' · her ayın ' + i.day + '’i' : ''}</small>
        <div class="bar" style="color:var(--acc)"><i style="width:${(f.paidCount / i.count) * 100}%"></i></div></div>
      <div style="text-align:right"><div class="amt">${tl(i.monthly)}</div>
        ${f.finished ? '<span class="pill good">bitti</span>' : f.dueThisMonth ? `<button class="btn ghost" style="padding:4px 10px;margin-top:4px" data-pay="${i.id}">Ödendi</button>` : f.active ? '<span class="pill good">bu ay ödendi</span>' : '<span class="pill">başlamadı</span>'}</div></div>`;
  return `
  <div class="tiles"><div class="tile"><div class="h">Bu ay</div><div class="v">${tl(monthTotal)}</div></div>
    <div class="tile"><div class="h">Kalan toplam borç</div><div class="v">${tl(debt)}</div></div></div>
  <h2>Aktif taksitler</h2>
  ${act.length ? `<div class="list">${act.map(row).join('')}</div>` : '<div class="card empty">Aktif taksit yok.</div>'}
  <h2>Önümüzdeki 6 ay</h2>
  <div class="card">${next.map(([m, v]) => `<div style="margin:6px 0"><div class="row"><span>${fmtMonth(m)}</span><b>${tl(v)}</b></div><div class="bar" style="color:var(--acc)"><i style="width:${(v / max) * 100}%"></i></div></div>`).join('')}</div>
  ${all.some(([, f]) => f.finished) ? `<h2>Biten taksitler</h2><div class="list">${all.filter(([, f]) => f.finished).map(row).join('')}</div>` : ''}
  <button class="fab" id="instAdd" aria-label="Taksit ekle">＋</button>`;
};
function instForm(x) {
  const e = x || { name: '', monthly: '', count: '', start: thisMonth(), day: '', paid: [] };
  openDlg(`<form id="iForm"><h3 style="margin:0">${x ? 'Taksiti düzenle' : 'Taksit ekle'}</h3>
    <label>Ne için?</label><input name="name" required value="${esc(e.name)}" placeholder="Telefon, kredi, …">
    <div class="two"><div><label>Aylık tutar (₺)</label><input name="monthly" inputmode="decimal" required value="${e.monthly}"></div>
      <div><label>Taksit sayısı</label><input name="count" type="number" min="1" required value="${e.count}"></div></div>
    <div class="two"><div><label>İlk taksit ayı</label><input type="month" name="start" required value="${e.start}"></div>
      <div><label>Ödeme günü (ops.)</label><input name="day" type="number" min="1" max="31" value="${e.day || ''}"></div></div>
    ${!x ? '<label><input type="checkbox" class="chk" name="autopaid" checked>Geçmiş aylar ödenmiş sayılsın</label>' : `<p class="muted">${e.paid.length} taksit ödendi olarak işaretli. <a href="#" id="iUnpay">Son ödemeyi geri al</a></p>`}
    <button class="btn block">Kaydet</button>
    <div class="btns">${x ? '<button type="button" class="btn danger" id="iDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  if ($('#iDel')) $('#iDel').onclick = () => { if (confirm('Taksit silinsin mi?')) { data.installments = data.installments.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  if ($('#iUnpay')) $('#iUnpay').onclick = ev => { ev.preventDefault(); x.paid.sort().pop(); closeDlg(); commit(); };
  $('#iForm').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target);
    const rec = { id: e.id || uid(), name: f.get('name').trim(), monthly: num(f.get('monthly')), count: parseInt(f.get('count')), start: f.get('start'), day: parseInt(f.get('day')) || null, paid: e.paid };
    if (!x && f.get('autopaid')) { rec.paid = []; for (let k = 0; k < rec.count; k++) { const m = addMonths(rec.start, k); if (m < thisMonth()) rec.paid.push(m); } }
    if (x) Object.assign(x, rec); else data.installments.push(rec); closeDlg(); commit(); };
}
document.addEventListener('click', e => {
  if (e.target.closest('#instAdd')) return instForm();
  const p = e.target.closest('[data-pay]');
  if (p) { const i = data.installments.find(x => x.id === p.dataset.pay); if (!i.paid.includes(thisMonth())) i.paid.push(thisMonth()); toast('Bu ayın taksiti ödendi'); return commit(); }
  const it = e.target.closest('[data-inst]'); if (it) instForm(data.installments.find(x => x.id === it.dataset.inst));
});

/* --- Varlıklar --- */
function gcalUrl(a, ev) {
  const d = ev.date.replace(/-/g, ''); const n = new Date(ev.date + 'T00:00'); n.setDate(n.getDate() + 1);
  const d2 = n.toISOString().slice(0, 10).replace(/-/g, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `${a.name} — ${ev.kind} yenileme`, dates: `${d}/${d2}`,
    details: [ev.company && 'Şirket: ' + ev.company, ev.cost && 'Son tutar: ' + tl(ev.cost), ev.note].filter(Boolean).join('\n'), recur: 'RRULE:FREQ=YEARLY' });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
VIEWS.varlik = () => `
  ${data.assets.length ? data.assets.map(a => `
    <h2>${esc(a.name)}${a.detail ? ' · ' + esc(a.detail) : ''}</h2>
    <div class="list">
      ${a.events.length ? [...a.events].sort((x, y) => x.date.localeCompare(y.date)).map(ev => `
        <div class="item" data-ev="${a.id}|${ev.id}"><div class="ic">⛨</div>
          <div class="t"><b>${esc(ev.kind)}</b><small>${fmtDate(ev.date)}${ev.cost ? ' · ' + tl(ev.cost) : ''}${ev.company ? ' · ' + esc(ev.company) : ''}</small></div>${dayPill(daysUntil(ev.date))}</div>`).join('')
      : '<div class="empty">Henüz kayıt yok.</div>'}
    </div>
    <div class="btns"><button class="btn ghost" data-evadd="${a.id}">＋ Sigorta / kasko / tarih ekle</button><button class="btn ghost" data-asset="${a.id}">Düzenle</button></div>`).join('')
  : '<div class="card empty">Araba, ev gibi varlıklarını ekle; sigorta, kasko, muayene tarihlerini takip et.</div>'}
  <button class="fab" id="assetAdd" aria-label="Varlık ekle">＋</button>`;
function assetForm(x) {
  const e = x || { name: '', detail: '' };
  openDlg(`<form id="aForm"><h3 style="margin:0">${x ? 'Varlığı düzenle' : 'Varlık ekle'}</h3>
    <label>Ad</label><input name="name" required value="${esc(e.name)}" placeholder="Araba, Ev, …">
    <label>Detay (plaka, model…)</label><input name="detail" value="${esc(e.detail)}">
    <button class="btn block">Kaydet</button>
    <div class="btns">${x ? '<button type="button" class="btn danger" id="aDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  if ($('#aDel')) $('#aDel').onclick = () => { if (confirm(`"${x.name}" ve tüm tarihleri silinsin mi?`)) { data.assets = data.assets.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  $('#aForm').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target);
    const rec = { name: f.get('name').trim(), detail: f.get('detail').trim() };
    if (x) Object.assign(x, rec); else data.assets.push({ id: uid(), events: [], ...rec }); closeDlg(); commit(); };
}
function eventForm(a, x) {
  const e = x || { kind: ASSET_EVENTS[0], date: today(), cost: '', company: '', note: '', history: [] };
  openDlg(`<form id="evForm"><h3 style="margin:0">${esc(a.name)}</h3>
    <label>Tür</label><select name="kind">${ASSET_EVENTS.map(k => opt(k, k, e.kind)).join('')}</select>
    <div class="two"><div><label>Bitiş / yenileme tarihi</label><input type="date" name="date" required value="${e.date}"></div>
      <div><label>Tutar (₺)</label><input name="cost" inputmode="decimal" value="${e.cost || ''}"></div></div>
    <label>Şirket / poliçe no</label><input name="company" value="${esc(e.company)}">
    <label>Not</label><input name="note" value="${esc(e.note)}">
    ${e.history?.length ? `<label>Geçmiş</label><div class="card">${e.history.map(h => `<div class="kv"><span>${fmtDate(h.date)}</span><span>${h.cost ? tl(h.cost) : '—'}</span></div>`).join('')}</div>` : ''}
    <button class="btn block">Kaydet</button>
    ${x ? `<div class="btns"><a class="btn ghost" target="_blank" rel="noopener" href="${esc(gcalUrl(a, e))}">📅 Google Takvim’e ekle</a><button type="button" class="btn ghost" id="evRenew">Yenilendi (+1 yıl)</button></div>` : ''}
    <div class="btns">${x ? '<button type="button" class="btn danger" id="evDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  if ($('#evDel')) $('#evDel').onclick = () => { if (confirm('Silinsin mi?')) { a.events = a.events.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  if ($('#evRenew')) $('#evRenew').onclick = () => {
    const c = prompt('Yeni dönemin tutarı (₺)?', x.cost || ''); if (c === null) return;
    (x.history ||= []).push({ date: x.date, cost: x.cost }); const d = new Date(x.date + 'T00:00'); d.setFullYear(d.getFullYear() + 1);
    x.date = d.toISOString().slice(0, 10); x.cost = num(c) || x.cost; closeDlg(); commit(); toast('Yeni tarih: ' + fmtDate(x.date));
  };
  $('#evForm').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target);
    const rec = { kind: f.get('kind'), date: f.get('date'), cost: num(f.get('cost')) || null, company: f.get('company').trim(), note: f.get('note').trim() };
    if (x) { Object.assign(x, rec); closeDlg(); commit(); }
    else { const n = { id: uid(), history: [], ...rec }; a.events.push(n); commit();
      openDlg(`<p><b>${esc(a.name)} · ${esc(n.kind)}</b> kaydedildi.</p><p class="muted">Her yıl hatırlatma için Google Takvim’ine ekle:</p>
        <div class="btns"><a class="btn" target="_blank" rel="noopener" href="${esc(gcalUrl(a, n))}" data-close>📅 Google Takvim’e ekle</a><button class="btn ghost" data-close>Şimdi değil</button></div>`); }
  };
}
document.addEventListener('click', e => {
  if (e.target.closest('#assetAdd')) return assetForm();
  const ed = e.target.closest('[data-asset]'); if (ed) return assetForm(data.assets.find(a => a.id === ed.dataset.asset));
  const ad = e.target.closest('[data-evadd]'); if (ad) return eventForm(data.assets.find(a => a.id === ad.dataset.evadd));
  const ev = e.target.closest('[data-ev]'); if (ev) { const [aid, eid] = ev.dataset.ev.split('|'); const a = data.assets.find(o => o.id === aid); eventForm(a, a.events.find(o => o.id === eid)); }
});

/* --- Ayarlar --- */
VIEWS.ayar = () => `
  <h2>GitHub senkronu</h2>
  <div class="card">
    <p class="muted" style="margin-top:0">Veriler gizli <b>${esc(cfg.owner)}/${esc(cfg.repo)}</b> deposunda saklanır. Her cihazda bir kez token gir.
      Token: GitHub → Settings → Developer settings → <b>Fine-grained tokens</b> → yalnızca <b>${esc(cfg.repo)}</b> deposu, <b>Contents: Read and write</b>.</p>
    <form id="cfgForm">
      <div class="two"><div><label>Kullanıcı</label><input name="owner" value="${esc(cfg.owner)}"></div><div><label>Veri deposu</label><input name="repo" value="${esc(cfg.repo)}"></div></div>
      <label>Token</label><input name="token" type="password" autocomplete="off" placeholder="${cfg.token ? '•••••••• (kayıtlı)' : 'github_pat_…'}">
      <div class="btns"><button class="btn">Kaydet ve bağlan</button>${cfg.token ? '<button type="button" class="btn ghost" id="pullBtn">Sunucudan yükle</button><button type="button" class="btn ghost" id="logout">Bu cihazdan çıkış</button>' : ''}</div>
    </form>
    <p class="muted">Durum: ${esc($('#sync').title || '—')}</p>
  </div>
  <h2>Harcama kategorileri</h2>
  <div class="list">${data.categories.map((c, i) => `<div class="item"><div class="t"><b>${esc(c)}</b></div><button class="btn ghost" style="padding:4px 10px" data-catdel="${i}">Sil</button></div>`).join('')}</div>
  <form id="catForm" class="row" style="margin-top:8px"><input name="c" placeholder="Yeni kategori" required><button class="btn">Ekle</button></form>
  <h2>Yedek</h2>
  <div class="btns"><button class="btn ghost" id="bkDown">Yedeği indir (JSON)</button><label class="btn ghost" style="margin:0;color:var(--fg)">Yedekten yükle<input type="file" id="bkUp" accept=".json" hidden></label></div>`;
document.addEventListener('submit', e => {
  if (e.target.id === 'cfgForm') { e.preventDefault(); const f = new FormData(e.target);
    cfg.owner = f.get('owner').trim(); cfg.repo = f.get('repo').trim(); if (f.get('token').trim()) cfg.token = f.get('token').trim();
    store('mh_cfg', cfg); toast('Bağlanılıyor…'); (dirty && sha ? push() : pull()).then(() => render()); }
  if (e.target.id === 'catForm') { e.preventDefault(); const c = new FormData(e.target).get('c').trim(); if (c && !data.categories.includes(c)) { data.categories.push(c); commit(); } }
});
document.addEventListener('click', e => {
  if (e.target.closest('#pullBtn') && confirm('Bu cihazdaki gönderilmemiş değişiklikler kaybolabilir. Sunucudaki veri yüklensin mi?')) { dirty = false; pull(); }
  if (e.target.closest('#logout') && confirm('Bu cihazdan token ve yerel veri silinsin mi? (GitHub’daki veri kalır)')) { localStorage.clear(); location.reload(); }
  const cd = e.target.closest('[data-catdel]'); if (cd) { data.categories.splice(+cd.dataset.catdel, 1); commit(); }
  if (e.target.closest('#bkDown')) download(`muhasebe-yedek-${today()}.json`, JSON.stringify(data, null, 1), 'application/json');
});
document.addEventListener('change', async e => {
  if (e.target.id !== 'bkUp' || !e.target.files[0]) return;
  try { const d = JSON.parse(await e.target.files[0].text()); if (!confirm('Mevcut verilerin yerine yedek yüklensin mi?')) return; data = Object.assign(defaultData(), d); commit(); toast('Yedek yüklendi'); }
  catch { toast('Geçersiz yedek dosyası'); }
});

/* ========== Başlat ========== */
render();
fetchPrices();
if (cfg.token) (dirty ? push() : pull());
else setSync('', 'GitHub bağlı değil — veriler yalnızca bu cihazda');
