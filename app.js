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
// Altın/gümüş ve dövizler: hepsi canlı fiyatla TL'ye çevrilir (veri alanı geriye uyum için "gold")
const METAL_TYPES = {
  GRA: 'Gram altın (24 ayar)', HAS: 'Has altın (gram)', CEYREKALTIN: 'Çeyrek altın', YARIMALTIN: 'Yarım altın',
  TAMALTIN: 'Tam altın', CUMHURIYETALTINI: 'Cumhuriyet altını', ATAALTIN: 'Ata altın', GUMUS: 'Gümüş (gram)'
};
const FX_TYPES = {
  USD: 'Amerikan doları', EUR: 'Euro', GBP: 'İngiliz sterlini', CHF: 'İsviçre frangı', CAD: 'Kanada doları', AUD: 'Avustralya doları',
  JPY: 'Japon yeni', SAR: 'Suudi riyali', AED: 'BAE dirhemi', QAR: 'Katar riyali', KWD: 'Kuveyt dinarı', CNY: 'Çin yuanı',
  RUB: 'Rus rublesi', DKK: 'Danimarka kronu', SEK: 'İsveç kronu', NOK: 'Norveç kronu', PLN: 'Polonya zlotisi', AZN: 'Azerbaycan manatı', GEL: 'Gürcistan larisi'
};
const FX_SYMBOL = { USD: '$', EUR: '€', GBP: '£', CHF: '₣', JPY: '¥', CNY: '¥', RUB: '₽', AZN: '₼', GEL: '₾' };
const GOLD_TYPES = { ...METAL_TYPES, ...FX_TYPES };
const isFx = t => t in FX_TYPES;
const holdingLabel = t => isFx(t) ? `${t} · ${FX_TYPES[t]}` : (METAL_TYPES[t] || t);
const ASSET_EVENTS = ['Trafik sigortası', 'Kasko', 'Muayene', 'MTV', 'Konut sigortası', 'DASK', 'Bakım', 'Diğer'];
function defaultData() {
  return {
    version: 2,
    categories: ['Yemek', 'Ulaşım', 'Yakıt', 'Konaklama', 'Malzeme / ekipman', 'Yazılım / abonelik', 'Kargo', 'Diğer'],
    expenses: [], gold: [], notes: [], installments: [], assets: []
  };
}
/* ========== Sunucu (Cloudflare Worker) ========== */
const API = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:8787' : 'https://muhasebe-api.muhasebe-api.workers.dev';
let session = load('mh_session'); // {token, user:{id, username, isAdmin}}
const k = name => `mh_${name}_${session?.user.id}`;
let data = defaultData(), version = 0, dirty = false;
let prices = load('mh_prices'); // {at, items:{KEY:{buy,sell,change}}}

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (session) headers.Authorization = 'Bearer ' + session.token;
  if (opts.body && typeof opts.body === 'string') headers['Content-Type'] = 'application/json';
  let r;
  try { r = await fetch(API + path, { ...opts, headers, cache: 'no-store' }); }
  catch { const e = new Error('Sunucuya ulaşılamadı'); e.offline = true; throw e; }
  if (r.status === 401 && session && !path.startsWith('/api/login')) { signOut(true); }
  if (!r.ok) { let msg = 'Hata ' + r.status, extra = {}; try { extra = await r.json(); msg = extra.error || msg; } catch {} const e = new Error(msg); e.status = r.status; e.body = extra; throw e; }
  return (r.headers.get('Content-Type') || '').includes('json') ? r.json() : r;
}
function setSync(state, title) { const s = $('#sync'); s.className = 'sync ' + state; s.title = title || ''; }
function loadLocal() {
  data = Object.assign(defaultData(), load(k('data')) || {});
  version = load(k('ver')) || 0; dirty = !!load(k('dirty'));
}
function saveLocal() { store(k('data'), data); store(k('ver'), version); store(k('dirty'), dirty); }
async function pull() {
  setSync('busy', 'Yükleniyor…');
  try {
    const r = await api('/api/data');
    if (r.data) { data = Object.assign(defaultData(), r.data); version = r.version; dirty = false; saveLocal(); }
    else if (version === 0) { dirty = true; saveLocal(); return push(); }
    setSync('ok', 'Güncel'); render();
  } catch (e) { if (session) setSync('err', e.offline ? 'Çevrimdışı — bu cihazdaki veri gösteriliyor' : e.message); }
}
let pushing = null;
async function push() {
  if (!session || !dirty) return;
  if (pushing) return pushing.then(push);
  setSync('busy', 'Kaydediliyor…');
  pushing = (async () => {
    try {
      const r = await api('/api/data', { method: 'PUT', body: JSON.stringify({ data, version }) });
      version = r.version; dirty = false; saveLocal(); setSync('ok', 'Kaydedildi');
    } catch (e) {
      if (e.status === 409) { setSync('err', 'Başka cihazda değişiklik var'); toast('Başka bir cihazda değişiklik yapılmış. Ayarlar → Sunucudan yükle.'); }
      else setSync('err', e.offline ? 'Çevrimdışı — bu cihazda saklandı, bağlanınca gönderilecek' : e.message);
    } finally { pushing = null; }
  })();
  return pushing;
}
let pushT;
function commit() { dirty = true; saveLocal(); clearTimeout(pushT); pushT = setTimeout(push, 700); render(); }
window.addEventListener('online', push);

/* ========== Giriş / kayıt ========== */
function startSession(s) { session = s; store('mh_session', s); loadLocal(); boot(); }
function signOut(expired) {
  if (expired) toast('Oturum süresi doldu, tekrar giriş yap');
  else api('/api/logout', { method: 'POST' }).catch(() => {});
  session = null; localStorage.removeItem('mh_session'); showAuth();
}
function showAuth(mode) {
  const invite = new URLSearchParams(location.search).get('davet');
  mode = mode || (invite ? 'kayit' : 'giris');
  document.body.classList.add('authmode');
  $('#title').textContent = mode === 'kayit' ? 'Hesap oluştur' : 'Giriş';
  $('#view').innerHTML = `
  <div class="auth card">
    <div class="authlogo"><img src="icon.svg" alt="" width="56" height="56"></div>
    ${mode === 'kayit' ? `<p class="muted" id="invInfo">Davet kontrol ediliyor…</p>` : '<p class="muted">Kullanıcı adın ve şifrenle giriş yap.</p>'}
    <form id="authForm" autocomplete="on">
      <label>Kullanıcı adı</label><input name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="3" maxlength="32" pattern="[a-zA-Z0-9._\\-]+">
      <label>Şifre</label><input name="password" type="password" autocomplete="${mode === 'kayit' ? 'new-password' : 'current-password'}" required ${mode === 'kayit' ? 'minlength="8"' : ''}>
      ${mode === 'kayit' ? '<label>Şifre (tekrar)</label><input name="password2" type="password" autocomplete="new-password" required minlength="8"><p class="muted">Kullanıcı adı: 3-32 karakter, harf/rakam/. _ - · Şifre: en az 8 karakter</p>' : ''}
      <button class="btn block" id="authBtn">${mode === 'kayit' ? 'Hesabı oluştur' : 'Giriş yap'}</button>
    </form>
    ${mode === 'kayit' ? '<p class="muted" style="text-align:center">Zaten hesabın var mı? <a href="#" id="toLogin">Giriş yap</a></p>' : '<p class="muted" style="text-align:center">Hesaplar yalnızca davetle açılır.</p>'}
  </div>`;
  if ($('#toLogin')) $('#toLogin').onclick = e => { e.preventDefault(); history.replaceState(null, '', location.pathname); showAuth('giris'); };
  if (mode === 'kayit') api('/api/invite?code=' + encodeURIComponent(invite)).then(r => {
    $('#invInfo').innerHTML = r.valid ? 'Davet geçerli. Kendine bir kullanıcı adı ve şifre belirle.' : '<b class="gider">Bu davet linki geçersiz, kullanılmış ya da süresi dolmuş.</b> Yeni bir davet iste.';
    if (!r.valid) $('#authBtn').disabled = true;
  }).catch(() => { $('#invInfo').textContent = 'Sunucuya ulaşılamadı.'; });
  $('#authForm').onsubmit = async ev => {
    ev.preventDefault(); const f = new FormData(ev.target); const btn = $('#authBtn');
    const username = f.get('username').trim(), password = f.get('password');
    if (mode === 'kayit' && password !== f.get('password2')) return toast('Şifreler aynı değil');
    btn.disabled = true;
    try {
      const r = mode === 'kayit'
        ? await api('/api/register', { method: 'POST', body: JSON.stringify({ invite, username, password }) })
        : await api('/api/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      history.replaceState(null, '', location.pathname);
      startSession({ token: r.token, user: r.user });
      toast(mode === 'kayit' ? 'Hoş geldin, ' + r.user.username : 'Giriş yapıldı');
    } catch (e) { toast(e.message); btn.disabled = false; }
  };
}

/* Fiş fotoğrafı */
async function compressImage(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72).split(',')[1];
}
async function uploadReceipt(file) {
  const b64 = await compressImage(file);
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const r = await api('/api/receipts', { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: bytes });
  return r.id;
}
async function showReceipt(id) {
  openDlg('<p class="muted">Fiş yükleniyor…</p>');
  try {
    const r = await api('/api/receipt?id=' + encodeURIComponent(id));
    const url = URL.createObjectURL(await r.blob());
    $('#dlgBody').innerHTML = `<img src="${url}" alt="Fiş"><div class="btns"><button class="btn ghost" data-close>Kapat</button></div>`;
  } catch { $('#dlgBody').innerHTML = '<p>Fiş açılamadı (bağlantıyı kontrol et).</p><div class="btns"><button class="btn ghost" data-close>Kapat</button></div>'; }
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
  if (!session) return;
  $('#view').innerHTML = VIEWS[state.tab]();
  if (state.tab === 'ayar') { loadInvites(); loadGoogle(); loadIcs(); }
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
    <div class="tile" data-tab="yatirim"><div class="h"><span>◆</span>Altın & döviz</div><div class="v">${data.gold.length ? (prices ? tl(g.value) : '…') : '—'}</div><div class="s">${prices ? 'Güncel alış fiyatıyla' : 'Fiyat bekleniyor'}</div></div>
    <div class="tile" data-tab="taksit"><div class="h"><span>▦</span>Bu ay taksit</div><div class="v">${tl(instMonth)}</div><div class="s">${inst.length ? (instLeft ? instLeft + ' ödeme bekliyor' : 'Hepsi ödendi') : 'Aktif taksit yok'}</div></div>
  </div>
  <h2>Yaklaşan yenilemeler (60 gün)</h2>
  ${up.length ? `<div class="list">${up.map(({ a, e, d }) => `
    <div class="item" data-tab="varlik"><div class="ic">⛨</div><div class="t"><b>${esc(a.name)} · ${esc(e.kind)}</b><small>${fmtDate(e.date)}${e.cost ? ' · ' + tl(e.cost) : ''}</small></div>${dayPill(d)}</div>`).join('')}</div>`
    : '<div class="card empty">Önümüzdeki 60 günde yenileme yok.</div>'}
`;
};

/* --- Harcamalar --- */
const SRC = { cep: 'Cebimden', kart: 'Şirket kartı' };
VIEWS.harcama = () => {
  const list = data.expenses.filter(x => x.date.startsWith(state.month) && (state.src === 'hepsi' || x.source === state.src)).sort((a, b) => b.date.localeCompare(a.date));
  const sum = s => data.expenses.filter(x => x.date.startsWith(state.month) && x.source === s).reduce((t, x) => t + x.amount, 0);
  const alacak = data.expenses.filter(x => x.source === 'cep' && !x.reimbursed);
  let lastDay = '';
  return `
  <div class="row"><input type="month" id="exMonth" value="${state.month}" style="max-width:190px"><div class="btns" style="margin:0"><button class="btn" id="exXlsx">Masraf formu (Excel)</button><label class="btn ghost" style="margin:0">İçe aktar<input type="file" id="exImport" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label><button class="btn ghost" id="exCsv">CSV</button></div></div>
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
    if (file && file.size) { toast('Fiş yükleniyor…'); try { rec.receipt = await uploadReceipt(file); } catch (err) { toast('Fiş yüklenemedi (' + err.message + '). Harcama fişsiz kaydedildi.'); } }
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

/* Şirket masraf formu (xlsx) */
// integrity: dosya değiştirilmişse tarayıcı çalıştırmaz (SRI)
const loadScript = (src, integrity) => new Promise((ok, fail) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer'; } s.onload = ok; s.onerror = () => fail(new Error('Yüklenemedi: ' + src)); document.head.appendChild(s); });
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const JSZIP_SRI = 'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==';
const loadXlsxLibs = async () => { await loadScript(JSZIP_URL, JSZIP_SRI); await loadScript('masraf.js?v=202611201513'); };

/* Doldurulmuş masraf formunu içe aktar */
async function importMasraf(file) {
  let res;
  try { await loadXlsxLibs(); res = await Masraf.parse(JSZip, await file.arrayBuffer()); }
  catch (e) { return toast('Dosya okunamadı: ' + e.message); }
  if (!res.rows.length) return toast('Dosyada aktarılacak harcama bulunamadı');
  const key = x => [x.date, x.source, Math.round(x.amount * 100), norm2(x.note || ''), norm2(x.category || '')].join('|');
  const norm2 = s => String(s).toLocaleLowerCase('tr-TR').trim();
  const have = new Set(data.expenses.map(key));
  const cats = data.categories.map(norm2);
  const items = res.rows.map((r, i) => {
    // Masraf Adı → kategori, Harcama Nedeni → açıklama. Masraf Adı boşsa ve neden bir kategori adıysa onu kategori say.
    let category = r.item, note = r.reason;
    if (!category && cats.includes(norm2(note))) { category = note; note = ''; }
    if (!category) category = 'Diğer';
    const ci = cats.indexOf(norm2(category)); if (ci >= 0) category = data.categories[ci];
    const rec = { id: uid(), source: r.source, amount: r.amount, date: r.date, category, note, reimbursed: false, receipt: null };
    return { i, rec, dup: have.has(key(rec)), newCat: !data.categories.includes(category) };
  });
  const newCats = [...new Set(items.filter(x => x.newCat).map(x => x.rec.category))];
  const sum = s => items.filter(x => x.rec.source === s).reduce((t, x) => t + x.rec.amount, 0);
  openDlg(`<form id="impForm"><h3 style="margin:0">İçe aktar · ${esc(file.name)}</h3>
    <p class="muted">${items.length} harcama bulundu · Şirket kartı ${tl(sum('kart'))} · Cebimden ${tl(sum('cep'))}${res.skipped.length ? ` · ${res.skipped.length} satır atlandı (${res.skipped.map(s => s.row + '. satır: ' + s.why).join(', ')})` : ''}</p>
    ${items.some(x => x.dup) ? '<p class="muted">Uygulamada zaten olanlar <span class="pill warn">zaten var</span> olarak işaretli ve seçili değil.</p>' : ''}
    ${newCats.length ? `<p class="muted">Yeni kategoriler eklenecek: <b>${newCats.map(esc).join(', ')}</b></p>` : ''}
    <div class="list" style="max-height:45vh;overflow:auto">${items.map(x => `
      <label class="item" style="margin:0;color:var(--fg)"><input type="checkbox" class="chk" name="sel" value="${x.i}" ${x.dup ? '' : 'checked'}>
        <div class="t"><b>${esc(x.rec.note || x.rec.category)}${x.dup ? ' <span class="pill warn">zaten var</span>' : ''}</b><small>${fmtDate(x.rec.date)} · ${esc(x.rec.category)} · ${SRC[x.rec.source]}</small></div>
        <div class="amt">${tl(x.rec.amount)}</div></label>`).join('')}</div>
    <label><input type="checkbox" class="chk" name="reimb">Cebimden olanları “şirketten geri alındı” işaretle</label>
    <button class="btn block">Seçilenleri aktar</button><div class="btns"><button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  $('#impForm').onsubmit = ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    const sel = new Set(f.getAll('sel').map(Number)), reimb = !!f.get('reimb');
    const chosen = items.filter(x => sel.has(x.i));
    if (!chosen.length) return toast('Hiç harcama seçilmedi');
    for (const c of newCats) if (chosen.some(x => x.rec.category === c) && !data.categories.includes(c)) data.categories.push(c);
    for (const x of chosen) data.expenses.push({ ...x.rec, reimbursed: reimb && x.rec.source === 'cep' });
    const months = [...new Set(chosen.map(x => x.rec.date.slice(0, 7)))].sort();
    if (months.length === 1) state.month = months[0];
    closeDlg(); commit(); toast(`${chosen.length} harcama aktarıldı`);
  };
}
document.addEventListener('change', e => { if (e.target.id === 'exImport' && e.target.files[0]) { importMasraf(e.target.files[0]); e.target.value = ''; } });
function masrafForm() {
  const p = data.profile || {};
  const list = data.expenses.filter(x => x.date.startsWith(state.month));
  const cnt = s => list.filter(x => x.source === s).length;
  if (!list.length) return toast('Bu ay harcama yok');
  openDlg(`<form id="mfForm"><h3 style="margin:0">Masraf formu · ${fmtMonth(state.month)}</h3>
    <p class="muted">Şirketin “TEMA MASRAF FORMU” şablonu doldurulur. Şirket kartı → <b>K.Kartı Masraf</b>, cebimden → <b>Nakit Masraf</b>.</p>
    <label>Masrafı yapan (ad soyad)</label><input name="name" required value="${esc(p.fullName || '')}" placeholder="Ad Soyad">
    <label>Hangi harcamalar?</label><select name="which">
      ${opt('hepsi', `Hepsi (${list.length})`, 'hepsi')}${opt('kart', `Sadece şirket kartı (${cnt('kart')})`)}${opt('cep', `Sadece cebimden (${cnt('cep')})`)}${opt('alinmadi', `Cebimden, geri alınmamış (${list.filter(x => x.source === 'cep' && !x.reimbursed).length})`)}</select>
    <button class="btn block">Excel’i indir</button><div class="btns"><button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  $('#mfForm').onsubmit = async ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    const name = f.get('name').trim(), which = f.get('which');
    const rows = list.filter(x => which === 'hepsi' || (which === 'alinmadi' ? x.source === 'cep' && !x.reimbursed : x.source === which));
    if (!rows.length) return toast('Seçime uyan harcama yok');
    if (name !== p.fullName) { data.profile = { ...p, fullName: name }; commit(); }
    const btn = ev.target.querySelector('.btn.block'); btn.disabled = true; btn.textContent = 'Hazırlanıyor…';
    try {
      await loadXlsxLibs();
      const tpl = await (await fetch('sablon/masraf-formu.xlsx?v=2')).arrayBuffer();
      const z = await Masraf.fill(JSZip, tpl, { name, rows: Masraf.rowsFromExpenses(rows) });
      const blob = await z.generateAsync({ type: 'blob', compression: 'DEFLATE', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const ay = new Date(state.month + '-01T00:00').toLocaleDateString('tr-TR', { month: 'long' });
      const fname = `${name} ${ay.charAt(0).toLocaleUpperCase('tr-TR') + ay.slice(1)} Ayı Masraf Formu.xlsx`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      closeDlg(); toast(fname + ' indirildi');
    } catch (err) { toast('Form oluşturulamadı: ' + err.message); btn.disabled = false; btn.textContent = 'Excel’i indir'; }
  };
}
document.addEventListener('click', e => { if (e.target.closest('#exXlsx')) masrafForm(); });
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

/* --- Yatırım --- */
VIEWS.yatirim = () => {
  const g = goldTotals(); const pl = g.value - g.cost;
  const part = fx => data.gold.filter(x => isFx(x.type) === fx).reduce((s, x) => s + goldValue(x), 0);
  const hasMetal = data.gold.some(x => !isFx(x.type)), hasFx = data.gold.some(x => isFx(x.type));
  const qtyText = x => isFx(x.type) ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(x.qty) + ' ' + x.type : '× ' + String(x.qty).replace('.', ',');
  const rate = v => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: v < 1 ? 4 : 2 }).format(v);
  const holdRow = x => { const p = prices?.items[x.type]; const fx = isFx(x.type); return `
      <div class="item" data-gold="${x.id}"><div class="ic" style="color:${fx ? 'var(--in)' : '#d4a017'}">${fx ? (FX_SYMBOL[x.type] || x.type.slice(0, 1)) : '◆'}</div>
        <div class="t"><b>${fx ? esc(FX_TYPES[x.type]) : esc(METAL_TYPES[x.type])} ${qtyText(x)}</b><small>${p ? (fx ? 'Kur ' : 'Birim ') + rate(p.buy) + ' · ' + (p.change >= 0 ? '▲' : '▼') + Math.abs(p.change) + '%' : ''}${x.note ? ' · ' + esc(x.note) : ''}</small></div>
        <div class="amt">${p ? tl(goldValue(x)) : '…'}</div></div>`; };
  const market = (types, title) => `<div class="muted" style="margin:6px 0 2px;font-weight:600">${title}</div>` + Object.keys(types).filter(k => prices.items[k]).map(k => `<div class="kv"><span>${isFx(k) ? k + ' · ' + types[k] : types[k]}</span><span>${rate(prices.items[k].buy)} / ${rate(prices.items[k].sell)}</span></div>`).join('');
  return `
  <h2>Altın & Döviz</h2>
  <div class="card">
    <div class="row"><div><div class="muted">Toplam değer (alış fiyatıyla)</div><div class="big">${prices ? tl(g.value) : '…'}</div>
      ${g.cost && g.costKnown ? `<div class="${pl >= 0 ? 'gelir' : 'gider'}">${pl >= 0 ? '+' : ''}${tl(pl)} (${((pl / g.cost) * 100).toFixed(1)}%)</div>` : ''}
      ${prices && hasMetal && hasFx ? `<div class="muted">Altın/gümüş ${tl(part(false))} · Döviz ${tl(part(true))}</div>` : ''}</div>
      <button class="btn ghost" id="pxRefresh">Yenile</button></div>
    <div class="muted" style="margin-top:6px">${prices ? 'Fiyat: ' + esc(prices.src || new Date(prices.at).toLocaleString('tr-TR')) : 'Fiyatlar yükleniyor…'}</div>
  </div>
  <div class="list" style="margin-top:10px">
    ${data.gold.length ? [...data.gold].sort((a, b) => isFx(a.type) - isFx(b.type)).map(holdRow).join('') : '<div class="empty">Henüz altın ya da döviz eklenmedi.</div>'}
  </div>
  <div class="btns"><button class="btn" id="goldAdd" data-kind="metal">＋ Altın / gümüş ekle</button><button class="btn" id="fxAdd">＋ Döviz ekle</button></div>
  ${prices ? `<h2>Piyasa</h2><div class="card">${market(METAL_TYPES, 'Altın & gümüş')}${market(FX_TYPES, 'Döviz')}<div class="muted" style="margin-top:6px">Alış / satış (TL)</div></div>` : ''}
  <h2>Yatırım notları</h2>
  ${data.notes.length ? `<div class="list">${[...data.notes].sort((a, b) => b.date.localeCompare(a.date)).map(n => `
    <div class="item" data-note="${n.id}"><div class="ic">✎</div><div class="t"><b>${esc(n.title)}</b><small>${fmtDate(n.date)} · ${esc(n.body.slice(0, 70))}</small></div></div>`).join('')}</div>` : '<div class="card empty">Not yok.</div>'}
  <div class="btns"><button class="btn ghost" id="noteAdd">＋ Not ekle</button></div>`;
};
function goldForm(x, kind) {
  const fx = x ? isFx(x.type) : kind === 'fx';
  const e = x || { type: fx ? 'USD' : 'GRA', qty: '', unitCost: '', date: today(), note: '' };
  const types = fx ? FX_TYPES : METAL_TYPES;
  openDlg(`<form id="gForm"><h3 style="margin:0">${fx ? (x ? 'Dövizi düzenle' : 'Döviz ekle') : (x ? 'Altını düzenle' : 'Altın / gümüş ekle')}</h3>
    <label>${fx ? 'Döviz' : 'Tür'}</label><select name="type">${Object.entries(types).map(([k, v]) => opt(k, fx ? `${k} · ${v}` : v, e.type)).join('')}</select>
    <div class="two"><div><label>${fx ? 'Miktar' : 'Adet / gram'}</label><input name="qty" inputmode="decimal" required value="${e.qty}" placeholder="${fx ? 'ör. 1500' : ''}"></div>
      <div><label>${fx ? 'Alış kuru (ops.)' : 'Alış birim fiyatı (ops.)'}</label><input name="unitCost" inputmode="decimal" value="${e.unitCost || ''}" placeholder="₺"></div></div>
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
  if (e.target.closest('#goldAdd')) goldForm(null, 'metal');
  if (e.target.closest('#fxAdd')) goldForm(null, 'fx');
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
      <div class="t"><b>${esc(i.name)}${i.card ? ' <span class="pill">💳 kredi kartı</span>' : ''}</b><small>${f.paidCount}/${i.count} ödendi · son: ${fmtMonth(f.end)}${i.day && !i.card ? ' · her ayın ' + i.day + '’i' : ''}</small>
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
      <div id="dayWrap" style="${e.card ? 'display:none' : ''}"><label>Ödeme günü (ops.)</label><input name="day" type="number" min="1" max="31" value="${e.day || ''}"></div></div>
    <label><input type="checkbox" class="chk" name="card" ${e.card ? 'checked' : ''}>Kredi kartından ödenecek <span class="muted">(takvime eklenmez)</span></label>
    ${!x ? '<label><input type="checkbox" class="chk" name="autopaid" checked>Geçmiş aylar ödenmiş sayılsın</label>' : `<p class="muted">${e.paid.length} taksit ödendi olarak işaretli. <a href="#" id="iUnpay">Son ödemeyi geri al</a></p>`}
    <button class="btn block">Kaydet</button>
    <div class="btns">${x ? '<button type="button" class="btn danger" id="iDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  if ($('#iDel')) $('#iDel').onclick = () => { if (confirm('Taksit silinsin mi?')) { data.installments = data.installments.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  $('#iForm').card.onchange = ev => { $('#dayWrap').style.display = ev.target.checked ? 'none' : ''; };
  if ($('#iUnpay')) $('#iUnpay').onclick = ev => { ev.preventDefault(); x.paid.sort().pop(); closeDlg(); commit(); };
  $('#iForm').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target);
    const card = !!f.get('card');
    const rec = { id: e.id || uid(), name: f.get('name').trim(), monthly: num(f.get('monthly')), count: parseInt(f.get('count')), start: f.get('start'), day: card ? null : (parseInt(f.get('day')) || null), card, paid: e.paid };
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
    ${x ? `<div class="btns">${gConnected() ? '<span class="muted">📅 Google Takvim’de otomatik</span>' : `<a class="btn ghost" target="_blank" rel="noopener" href="${esc(gcalUrl(a, e))}">📅 Google Takvim’e ekle</a>`}<button type="button" class="btn ghost" id="evRenew">Yenilendi (+1 yıl)</button></div>` : ''}
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
      if (gConnected()) { closeDlg(); return toast('Kaydedildi · Google Takvim’e otomatik eklenecek'); }
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
  <h2>Hesap</h2>
  <div class="card">
    <div class="row"><div><b>${esc(session.user.username)}</b>${session.user.isAdmin ? '<span class="pill good">yönetici</span>' : ''}<div class="muted">Senkron: ${esc($('#sync').title || '—')}</div></div>
      <button class="btn ghost" id="logout">Çıkış yap</button></div>
    <div class="btns"><button class="btn ghost" id="pwBtn">Şifre değiştir</button><button class="btn ghost" id="pullBtn">Sunucudan yükle</button></div>
  </div>
  ${session.user.isAdmin ? `<h2>Davetler</h2>
  <div class="card">
    <p class="muted" style="margin-top:0">Hesaplar yalnızca davet linkiyle açılır. Her link tek kişilik ve süreli. Her kullanıcının verisi kendine özeldir.</p>
    <form id="invForm" class="two"><input name="note" placeholder="Kimin için? (ops.)" maxlength="80"><select name="days">${[1, 3, 7, 14, 30].map(d => opt(String(d), d + ' gün geçerli', '7')).join('')}</select>
      <button class="btn" style="grid-column:1/-1">Davet linki oluştur</button></form>
    <div id="invList" class="muted" style="margin-top:12px">Yükleniyor…</div>
  </div>` : ''}
  <h2>Google Takvim</h2>
  <div class="card" id="gBox">${gBoxHtml()}</div>
  <h2>Takvim abonelik linki</h2>
  <div class="card" id="icsBox"><span class="muted">Yükleniyor…</span></div>
  <h2>Harcama kategorileri</h2>
  <div class="list">${data.categories.map((c, i) => `<div class="item"><div class="t"><b>${esc(c)}</b></div><button class="btn ghost" style="padding:4px 10px" data-catdel="${i}">Sil</button></div>`).join('')}</div>
  <form id="catForm" class="row" style="margin-top:8px"><input name="c" placeholder="Yeni kategori" required><button class="btn">Ekle</button></form>
  <h2>Yedek</h2>
  <div class="btns"><button class="btn ghost" id="bkDown">Yedeği indir (JSON)</button><label class="btn ghost" style="margin:0;color:var(--fg)">Yedekten yükle<input type="file" id="bkUp" accept=".json" hidden></label></div>
  <p class="muted" style="text-align:center;margin-top:24px"><a href="gizlilik.html">Gizlilik Politikası</a> · <a href="kosullar.html">Kullanım Koşulları</a></p>`;
async function loadInvites() {
  const box = $('#invList'); if (!box) return;
  try {
    const { invites, appUrl } = await api('/api/invites');
    box.innerHTML = invites.length ? `<div class="list">${invites.map(i => {
      const st = i.used_at ? `<span class="pill good">${esc(i.used_by_name || 'kullanıldı')}</span>` : i.expires_at < Date.now() ? '<span class="pill bad">süresi doldu</span>' : '<span class="pill warn">bekliyor</span>';
      const link = `${appUrl}/?davet=${i.code}`;
      return `<div class="item" style="cursor:default"><div class="t"><b>${esc(i.note || 'Davet')} ${st}</b><small>${new Date(i.created_at).toLocaleDateString('tr-TR')} · son: ${new Date(i.expires_at).toLocaleDateString('tr-TR')}</small></div>
        ${!i.used_at && i.expires_at > Date.now() ? `<button class="btn ghost" style="padding:4px 10px" data-copy="${esc(link)}">Kopyala</button><button class="btn ghost" style="padding:4px 10px" data-revoke="${i.code}">İptal</button>` : ''}</div>`;
    }).join('')}</div>` : 'Henüz davet oluşturulmadı.';
  } catch (e) { box.textContent = e.message; }
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Link kopyalandı'); } catch { prompt('Linki kopyala:', t); } }
function shareInvite(url, note) {
  openDlg(`<h3 style="margin:0">Davet linki hazır</h3><p class="muted">${note ? esc(note) + ' için · ' : ''}Tek kullanımlık. Linki açan kişi kendi kullanıcı adı ve şifresini belirler.</p>
    <input readonly value="${esc(url)}" onclick="this.select()">
    <div class="btns"><button class="btn" data-copy="${esc(url)}">Kopyala</button>${navigator.share ? '<button class="btn ghost" id="shareBtn">Paylaş</button>' : ''}<button class="btn ghost" data-close>Kapat</button></div>`);
  if ($('#shareBtn')) $('#shareBtn').onclick = () => navigator.share({ title: 'Muhasebe daveti', url }).catch(() => {});
}
function passwordForm() {
  openDlg(`<form id="pwForm"><h3 style="margin:0">Şifre değiştir</h3>
    <input type="text" name="username" value="${esc(session.user.username)}" autocomplete="username" hidden>
    <label>Mevcut şifre</label><input type="password" name="old" autocomplete="current-password" required>
    <label>Yeni şifre (en az 8 karakter)</label><input type="password" name="n1" autocomplete="new-password" minlength="8" required>
    <label>Yeni şifre (tekrar)</label><input type="password" name="n2" autocomplete="new-password" minlength="8" required>
    <p class="muted">Diğer cihazlardaki oturumlar kapanır.</p>
    <button class="btn block">Kaydet</button><div class="btns"><button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  $('#pwForm').onsubmit = async ev => { ev.preventDefault(); const f = new FormData(ev.target);
    if (f.get('n1') !== f.get('n2')) return toast('Yeni şifreler aynı değil');
    try { await api('/api/password', { method: 'POST', body: JSON.stringify({ oldPassword: f.get('old'), newPassword: f.get('n1') }) }); closeDlg(); toast('Şifre değiştirildi'); }
    catch (e) { toast(e.message); } };
}
document.addEventListener('submit', async e => {
  if (e.target.id === 'invForm') { e.preventDefault(); const f = new FormData(e.target);
    try { const r = await api('/api/invites', { method: 'POST', body: JSON.stringify({ note: f.get('note').trim(), days: +f.get('days') }) }); e.target.reset(); shareInvite(r.url, f.get('note').trim()); loadInvites(); }
    catch (err) { toast(err.message); } }
  if (e.target.id === 'catForm') { e.preventDefault(); const c = new FormData(e.target).get('c').trim(); if (c && !data.categories.includes(c)) { data.categories.push(c); commit(); } }
});
document.addEventListener('click', e => {
  if (e.target.closest('#pullBtn') && confirm('Bu cihazdaki gönderilmemiş değişiklikler kaybolabilir. Sunucudaki veri yüklensin mi?')) { dirty = false; version = 0; pull(); }
  if (e.target.closest('#logout') && confirm('Çıkış yapılsın mı?' + (dirty ? ' Gönderilmemiş değişiklikler var!' : ''))) signOut();
  if (e.target.closest('#pwBtn')) passwordForm();
  const cp = e.target.closest('[data-copy]'); if (cp) copyText(cp.dataset.copy);
  const rv = e.target.closest('[data-revoke]'); if (rv && confirm('Bu davet iptal edilsin mi?')) api('/api/invites?code=' + rv.dataset.revoke, { method: 'DELETE' }).then(loadInvites).catch(err => toast(err.message));
  const cd = e.target.closest('[data-catdel]'); if (cd) { data.categories.splice(+cd.dataset.catdel, 1); commit(); }
  if (e.target.closest('#bkDown')) download(`muhasebe-yedek-${today()}.json`, JSON.stringify(data, null, 1), 'application/json');
});
document.addEventListener('change', async e => {
  if (e.target.id !== 'bkUp' || !e.target.files[0]) return;
  try { const d = JSON.parse(await e.target.files[0].text()); if (!confirm('Mevcut verilerin yerine yedek yüklensin mi?')) return; data = Object.assign(defaultData(), d); commit(); toast('Yedek yüklendi'); }
  catch { toast('Geçersiz yedek dosyası'); }
});

/* ========== Google Takvim ========== */
let gStatus = null;
const gConnected = () => !!gStatus?.connected;
function gBoxHtml() {
  if (!gStatus) return '<span class="muted">Durum yükleniyor…</span>';
  if (!gStatus.available) return '<span class="muted">Google bağlantısı henüz hazır değil.</span>';
  if (!gStatus.connected) return `<p class="muted" style="margin-top:0">Bağlanınca sigorta, kasko, muayene tarihleri ve taksit ödeme günleri Google Takvim’inde ayrı bir <b>“Muhasebe”</b> takvimine otomatik eklenir; değişiklikler ve silmeler de yansır. Uygulama yalnızca kendi oluşturduğu bu takvime erişir.</p>
    <button class="btn" id="gConnect">Google Takvim’i bağla</button>`;
  return `<div class="row"><div><b>Bağlı</b> <span class="pill good">otomatik</span><div class="muted">${esc(gStatus.email || '')}${gStatus.lastSync ? ' · son eşitleme ' + new Date(gStatus.lastSync).toLocaleString('tr-TR') : ''}</div>
    ${gStatus.lastError ? `<div class="gider" style="font-size:13px">Son hata: ${esc(gStatus.lastError)}</div>` : ''}</div></div>
    <div class="btns"><button class="btn ghost" id="gSync">Şimdi eşitle</button><button class="btn ghost" id="gDisc">Bağlantıyı kes</button></div>`;
}
async function loadGoogle() {
  try { gStatus = await api('/api/google/status'); } catch { gStatus = gStatus || { available: false }; }
  const box = $('#gBox'); if (box) box.innerHTML = gBoxHtml();
}
document.addEventListener('click', async e => {
  if (e.target.closest('#gConnect')) {
    try { const { url } = await api('/api/google/start', { method: 'POST' }); if (dirty) await push(); location.href = url; } catch (err) { toast(err.message); }
  }
  if (e.target.closest('#gSync')) {
    toast('Eşitleniyor…'); if (dirty) await push();
    try { const r = await api('/api/google/sync', { method: 'POST' }); toast(r.error ? 'Hata: ' + r.error : `Takvim güncel (${r.created || 0} yeni, ${r.updated || 0} güncellendi, ${r.deleted || 0} silindi)`); } catch (err) { toast(err.message); }
    loadGoogle();
  }
  if (e.target.closest('#gDisc') && confirm('Google Takvim bağlantısı kesilsin mi? (“Muhasebe” takvimi Google’da kalır, istersen oradan silebilirsin)')) {
    try { await api('/api/google/disconnect', { method: 'POST' }); toast('Bağlantı kesildi'); } catch (err) { toast(err.message); }
    loadGoogle();
  }
});

/* ========== Takvim abonelik linki (ICS) ========== */
const ICS_HELP = `<details style="margin-top:10px"><summary class="muted" style="cursor:pointer">Nasıl eklenir?</summary><div class="muted" style="margin-top:6px;line-height:1.6">
  <b>Google Takvim</b> (bilgisayardan): calendar.google.com → sol menüde “Diğer takvimler” yanındaki <b>+</b> → <b>URL ile</b> → linki yapıştır → Takvim ekle.<br>
  <b>iPhone</b>: Ayarlar → Takvim → Hesaplar → Hesap ekle → Diğer → <b>Takvim aboneliği ekle</b> → linki yapıştır.<br>
  <b>Outlook</b>: Takvim → Takvim ekle → <b>Web’den abone ol</b> → linki yapıştır.<br>
  Değişiklikler takvim uygulamasının yenileme sıklığına göre gelir (Google’da birkaç saat sürebilir).</div></details>`;
async function loadIcs() {
  const box = $('#icsBox'); if (!box) return;
  try {
    const { url } = await api('/api/ical');
    box.innerHTML = url
      ? `<p class="muted" style="margin-top:0">Bu linki Google, iPhone ya da Outlook takvimine “URL ile abone ol” diyerek ekle. Linki bilen herkes tarihlerini görebilir; kimseyle paylaşma.</p>
        <input readonly value="${esc(url)}" onclick="this.select()">
        <div class="btns"><button class="btn" data-copy="${esc(url)}">Linki kopyala</button><a class="btn ghost" href="${esc(url.replace(/^https:/, 'webcal:'))}">Takvimde aç</a><button class="btn ghost" id="icsNew">Yeni link (eskisi çalışmaz)</button><button class="btn ghost" id="icsOff">Kapat</button></div>${ICS_HELP}`
      : `<p class="muted" style="margin-top:0">Google’a bağlanmadan, her takvim uygulamasında (Google, iPhone, Outlook) çalışan sana özel bir abonelik linki. Sigorta, kasko, muayene ve taksit tarihlerin bu takvimde görünür.</p>
        <button class="btn" id="icsNew">Abonelik linki oluştur</button>${ICS_HELP}`;
  } catch (e) { box.textContent = e.message; }
}
document.addEventListener('click', async e => {
  const nw = e.target.closest('#icsNew');
  if (nw && (nw.textContent.startsWith('Abonelik') || confirm('Yeni link oluşturulsun mu? Eski link artık çalışmaz, takvimlere yeniden eklemen gerekir.'))) {
    try { if (dirty) await push(); await api('/api/ical', { method: 'POST' }); loadIcs(); toast('Link hazır'); } catch (err) { toast(err.message); }
  }
  if (e.target.closest('#icsOff') && confirm('Abonelik linki kapatılsın mı? Takvimlerdeki abonelik güncellenmeyi bırakır.')) {
    try { await api('/api/ical', { method: 'DELETE' }); loadIcs(); } catch (err) { toast(err.message); }
  }
});

/* ========== Başlat ========== */
function boot() {
  document.body.classList.remove('authmode');
  const gq = new URLSearchParams(location.search).get('google');
  if (gq) {
    history.replaceState(null, '', location.pathname);
    toast({ tamam: 'Google Takvim bağlandı ✓', iptal: 'Google bağlantısı iptal edildi', izin: 'Takvim izni verilmedi, tekrar dene ve kutucuğu işaretle', gecersiz: 'Bağlantı süresi doldu, tekrar dene', hata: 'Google bağlantısı kurulamadı' }[gq] || 'Google');
    state.tab = 'ayar';
  } else state.tab = 'ana';
  render(); fetchPrices(); loadGoogle();
  dirty ? push().then(pull) : pull();
}
if (session && !new URLSearchParams(location.search).get('davet')) { loadLocal(); boot(); }
else showAuth();
