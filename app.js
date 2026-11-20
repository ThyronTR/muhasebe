'use strict';
/* ========== Yardımcılar ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const tl = (n, cur = 'TRY') => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: cur, maximumFractionDigits: 2 }).format(n || 0);
const num = v => { const n = parseFloat(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };
// Tarihler yerel saatle (toISOString UTC'ye çevirip Türkiye'de günü bir geri kaydırıyordu)
const isoLocal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => isoLocal(new Date());
const addDaysIso = (iso, n) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return isoLocal(d); };
const addYearsIso = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y + n, m - 1, d); if (t.getMonth() !== m - 1) t.setDate(0); return isoLocal(t); };
const thisMonth = () => today().slice(0, 7);
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
const fmtMonth = m => new Date(m + '-01T00:00').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
const addMonths = (m, k) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + k, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const monthDiff = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };
const daysUntil = d => Math.round((new Date(d + 'T00:00') - new Date(today() + 'T00:00')) / 864e5);
const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600); }

/* ========== Simgeler (çizgi simgeler, renk yazı renginden gelir) ========== */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
  flows: '<path d="M7 3v18M3 7l4-4 4 4M17 21V3M13 17l4 4 4-4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  save: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9M8 16l4-4 4 4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  wallet: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5"/><circle cx="16.5" cy="13.5" r="1.5"/>',
  coins: '<circle cx="9" cy="9" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.4 18"/><path d="M8 7h2v4"/>',
  back: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>', arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7.1-.9l.5.3a2 2 0 0 0 1.5.2L21 4"/><path d="m21 3 1 11h-2M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3M3 4h8"/>'
};
const ic = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
// Alt menü: sekme, kısa etiket, simge
const NAV = [['ana', 'Ana Sayfa', 'home'], ['harcama', 'Şirket İçi', 'briefcase'], ['gelirgider', 'Gelir-Gider', 'flows'], ['yatirim', 'Yatırım', 'trend'], ['taksit', 'Taksitler', 'card'], ['varlik', 'Varlıklar', 'shield']];
$('#tabs').innerHTML = NAV.map(([t, l, i]) => `<button data-tab="${t}">${ic(i)}<span>${l}</span></button>`).join('');
$('#gearBtn').innerHTML = ic('gear');
$('#bellBtn').innerHTML = ic('bell') + '<span class="badge" id="bellBadge" hidden></span>';
$('#saveBtn').innerHTML = ic('save') + '<span class="lbl">Kaydet</span>';

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
    expenses: [], gold: [], notes: [], installments: [], assets: [], flows: []
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
function setSync(st, title) {
  const s = $('#sync'); s.className = 'sync ' + st; s.title = title || '';
  const b = $('#saveBtn'); if (!b) return;
  b.classList.toggle('busy', st === 'busy');
  b.classList.toggle('pending', dirty && st !== 'busy');
  b.classList.toggle('ok', !dirty && st === 'ok');
  b.title = dirty ? 'Kaydedilmemiş değişiklik var — kaydet ve eşitle' : (title || 'Kaydet ve eşitle');
}
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
    setSync('ok', 'Güncel'); softRender();
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
function commit() { dirty = true; saveLocal(); setSync('', 'Kaydedilmemiş değişiklik'); clearTimeout(pushT); pushT = setTimeout(push, 1500); render(true); }
// Kaydet düğmesi: bekleyen değişiklikleri gönder, sunucudaki son hali al, Google Takvim'i eşitle
async function saveAll() {
  const b = $('#saveBtn'); if (b.disabled) return; b.disabled = true;
  clearTimeout(pushT);
  try {
    if (dirty) await push();
    if (dirty) return toast('Kaydedilemedi: ' + ($('#sync').title || 'bağlantı yok'));
    await pull();
    let msg = 'Kaydedildi ve eşitlendi ✓';
    if (gConnected()) {
      try { const r = await api('/api/google/sync', { method: 'POST' }); msg = r.error ? 'Kaydedildi · takvim: ' + r.error : `Kaydedildi · takvim güncel (${(r.created || 0) + (r.updated || 0) + (r.deleted || 0)} değişiklik) ✓`; }
      catch (e) { msg = 'Kaydedildi · takvim eşitlenemedi'; }
    }
    toast(msg);
  } finally { b.disabled = false; }
}
document.addEventListener('click', e => { if (e.target.closest('#saveBtn')) saveAll(); });
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
  // Fiş okunur kalsın ama yer kaplamasın: uzun kenar en fazla 1280 px, JPEG %60 → genelde 100-250 KB
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.6, out = c.toDataURL('image/jpeg', q);
  while (out.length > 600e3 && q > 0.3) { q -= 0.1; out = c.toDataURL('image/jpeg', q); } // çok büyükse biraz daha sıkıştır
  return out.split(',')[1];
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
    if (state.tab === 'yatirim' || state.tab === 'ana') softRender();
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
const TITLES = { ana: 'Ana Sayfa', harcama: 'Şirket İçi Harcamalar', gelirgider: 'Gelir-Gider', yatirim: 'Yatırım', taksit: 'Taksitler', varlik: 'Varlıklar', ayar: 'Ayarlar', yonetim: 'Yönetim Paneli' };
// Her sayfanın sağ alttaki yazılı ekle düğmesi
const FAB = { ana: 'Hızlı Ekle', harcama: 'Harcama Ekle', gelirgider: 'Gelir / Gider Ekle', yatirim: 'Altın / Döviz Ekle', taksit: 'Taksit Ekle', varlik: 'Varlık Ekle' };

function render(keepScroll) {
  $('#title').textContent = TITLES[state.tab];
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
  document.body.dataset.page = state.tab; // menü rengi (data-tab DEĞİL: o, tıklanınca sekme değiştiren düğmelerin işareti)
  if (!session) return;
  const y = window.scrollY;
  $('#view').innerHTML = VIEWS[state.tab]();
  $('#fabWrap').innerHTML = FAB[state.tab] ? `<button class="fab" id="fab">${ic('plus')}${FAB[state.tab]}</button>` : '';
  if (state.tab === 'ayar') { loadGoogle(); loadIcs(); }
  if (state.tab === 'yonetim') loadAdmin();
  if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
}
// Arka planda gelen güncellemeler açık formu bozmasın, kaydırmayı korusun
function softRender() { if (session && !dlg.open) render(true); }
function go(tab) { state.tab = tab; render(); if (tab === 'yatirim' || tab === 'ana') fetchPrices(); }
document.addEventListener('click', e => {
  if (!e.target.closest('#fab')) return;
  const t = state.tab;
  if (t === 'harcama') expenseForm();
  else if (t === 'gelirgider') flowForm();
  else if (t === 'taksit') instForm();
  else if (t === 'varlik') assetForm();
  else if (t === 'yatirim') chooser('Ne eklemek istiyorsun?', [['metal', 'coins', 'Altın / gümüş', 'var(--gold)'], ['fx', 'wallet', 'Döviz (dolar, euro…)', 'var(--usd)']], k => goldForm(null, k));
  else if (t === 'ana') chooser('Hızlı ekle', [['harcama', 'briefcase', 'Şirket içi harcama', 'var(--c-harcama)'], ['gelirgider', 'flows', 'Gelir / gider', 'var(--c-gelirgider)'], ['yatirim', 'trend', 'Altın / döviz', 'var(--c-yatirim)'], ['taksit', 'card', 'Taksit', 'var(--c-taksit)'], ['varlik', 'shield', 'Varlık', 'var(--c-varlik)']],
    k => { go(k); setTimeout(() => $('#fab')?.click(), 0); });
});
function chooser(title, opts, cb) {
  openDlg(`<h3>${title}</h3><div class="chooser">${opts.map(([k, i, l, c]) => `<button data-ch="${k}" style="color:${c}">${ic(i)}<span style="color:var(--fg)">${l}</span></button>`).join('')}</div>
    <div class="btns"><button class="btn ghost" data-close>Vazgeç</button></div>`);
  $$('[data-ch]').forEach(b => b.onclick = () => { closeDlg(); cb(b.dataset.ch); });
}
// Ay seçici (ok düğmeleri + ayın adına tıklayınca tarayıcının ay seçicisi)
const monthNav = () => `<div class="monthnav"><button data-mnav="-1" aria-label="Önceki ay">‹</button><label class="m">${fmtMonth(state.month)}<input type="month" id="mPick" value="${state.month}" aria-label="Ay seç"></label><button data-mnav="1" aria-label="Sonraki ay">›</button></div>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-mnav]'); if (b) { state.month = addMonths(state.month, +b.dataset.mnav); render(true); }
  const p = e.target.closest('#mPick'); if (p && p.showPicker) { e.preventDefault(); try { p.showPicker(); } catch {} }
});
document.addEventListener('change', e => { if (e.target.id === 'mPick' && /^\d{4}-\d{2}$/.test(e.target.value)) { state.month = e.target.value; render(true); } });
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
  const fl = flowMonth(m);
  return `
  <div class="tiles">
    <div class="tile" data-tab="harcama"><div class="h">${ic('briefcase')}Şirket içi · bu ay</div><div class="v">${tl(cep + kart)}</div><div class="s">Cebimden ${tl(cep)} · Kart ${tl(kart)}</div></div>
    <div class="tile" data-tab="harcama"><div class="h">${ic('back')}Şirketten alacağım</div><div class="v">${tl(alacak)}</div><div class="s">Cebimden ödenen, geri alınmamış</div></div>
    <div class="tile" data-tab="gelirgider"><div class="h">${ic('flows')}Gelir-gider · bu ay</div><div class="v ${fl.net >= 0 ? 'gelir' : 'gider'}">${fl.net >= 0 ? '+' : ''}${tl(fl.net)}</div><div class="s">Gelir ${tl(fl.gelir)} · Gider ${tl(fl.gider)}</div></div>
    <div class="tile" data-tab="yatirim"><div class="h">${ic('trend')}Altın & döviz</div><div class="v">${data.gold.length ? (prices ? tl(g.value) : '…') : '—'}</div><div class="s">${prices ? 'Güncel alış fiyatıyla' : 'Fiyat bekleniyor'}</div></div>
    <div class="tile" data-tab="taksit"><div class="h">${ic('card')}Bu ay taksit</div><div class="v">${tl(instMonth)}</div><div class="s">${inst.length ? (instLeft ? instLeft + ' ödeme bekliyor' : 'Hepsi ödendi') : 'Aktif taksit yok'}</div></div>
    <div class="tile" data-tab="varlik"><div class="h">${ic('shield')}Varlıklar</div><div class="v">${data.assets.length}</div><div class="s">${up.length ? up.length + ' yenileme 60 gün içinde' : 'Yakın yenileme yok'}</div></div>
  </div>
  <h2>Yaklaşan yenilemeler (60 gün)</h2>
  ${up.length ? `<div class="list">${up.map(({ a, e, d }) => `
    <div class="item" data-tab="varlik"><div class="ic" style="color:var(--c-varlik)">${ic('shield')}</div><div class="t"><b>${esc(a.name)} · ${esc(e.kind)}</b><small>${fmtDate(e.date)}${e.cost ? ' · ' + tl(e.cost) : ''}</small></div>${dayPill(d)}</div>`).join('')}</div>`
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
  <div class="row">${monthNav()}<div class="btns" style="margin:0"><button class="btn" id="exXlsx">Masraf formu (Excel)</button><label class="btn ghost" style="margin:0">İçe aktar<input type="file" id="exImport" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label><button class="btn ghost" id="exCsv">CSV</button></div></div>
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
    <div class="item" data-ex="${x.id}"><div class="ic ${x.source === 'cep' ? 'gider' : 'transfer'}" title="${SRC[x.source]}">${ic(x.source === 'cep' ? 'wallet' : 'card')}</div>
      <div class="t"><b>${esc(x.note || x.category)}</b><small>${esc(x.category)} · ${SRC[x.source]}${x.receipt ? ' · 📎' : ''}${x.source === 'cep' ? (x.reimbursed ? ' <span class="pill good">alındı</span>' : ' <span class="pill warn">alınacak</span>') : ''}</small></div>
      <div class="amt">${tl(x.amount)}</div></div>`; }).join('')}</div>` : '<div class="card empty">Bu ay kayıt yok.</div>'}`;
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
  const it = e.target.closest('[data-ex]'); if (it) expenseForm(data.expenses.find(x => x.id === it.dataset.ex));
  const s = e.target.closest('#srcSeg button'); if (s) { state.src = s.dataset.src; render(true); }
  if (e.target.closest('#exReimb') && confirm('Cebimden yapılan tüm harcamalar "geri alındı" işaretlensin mi?')) { data.expenses.forEach(x => { if (x.source === 'cep') x.reimbursed = true; }); commit(); }
  if (e.target.closest('#exCsv')) {
    const rows = [['Tarih', 'Tür', 'Kategori', 'Açıklama', 'Tutar', 'Geri alındı']].concat(
      data.expenses.filter(x => x.date.startsWith(state.month)).sort((a, b) => a.date.localeCompare(b.date))
        .map(x => [x.date, SRC[x.source], x.category, x.note, String(x.amount).replace('.', ','), x.source === 'cep' ? (x.reimbursed ? 'Evet' : 'Hayır') : '']));
    download(`harcamalar-${state.month}.csv`, '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv');
  }
});

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
  const norm2 = s => String(s).toLocaleLowerCase('tr-TR').trim();
  // Eşleştirme: aynı gün + aynı tür (kart/cep) + aynı tutar = aynı harcama. Açıklama yazımı farklı olsa da yakalanır.
  // Sayaçlı eşleşme: o gün aynı tutarda 2 harcama varsa ve dosyada 3 tane varsa yalnızca 1'i yeni sayılır.
  const key = x => [x.date, x.source, Math.round(x.amount * 100)].join('|');
  const pool = new Map(); for (const x of data.expenses) pool.set(key(x), (pool.get(key(x)) || 0) + 1);
  const take = kk => { const n = pool.get(kk) || 0; if (n > 0) { pool.set(kk, n - 1); return true; } return false; };
  const cats = data.categories.map(norm2);
  const items = res.rows.map((r, i) => {
    // Masraf Adı → kategori, Harcama Nedeni → açıklama. Masraf Adı boşsa ve neden bir kategori adıysa onu kategori say.
    let category = r.item, note = r.reason;
    if (!category && cats.includes(norm2(note))) { category = note; note = ''; }
    if (!category) category = 'Diğer';
    const ci = cats.indexOf(norm2(category)); if (ci >= 0) category = data.categories[ci];
    const rec = { id: uid(), source: r.source, amount: r.amount, date: r.date, category, note, reimbursed: false, receipt: null };
    return { i, rec, dup: take(key(rec)), newCat: !data.categories.includes(category) };
  });
  const newCount = items.filter(x => !x.dup).length;
  const newCats = [...new Set(items.filter(x => x.newCat).map(x => x.rec.category))];
  const sum = s => items.filter(x => x.rec.source === s).reduce((t, x) => t + x.rec.amount, 0);
  openDlg(`<form id="impForm"><h3 style="margin:0">İçe aktar · ${esc(file.name)}</h3>
    <p class="muted">${items.length} harcama bulundu · Şirket kartı ${tl(sum('kart'))} · Cebimden ${tl(sum('cep'))}${res.skipped.length ? ` · ${res.skipped.length} satır atlandı (${res.skipped.map(s => s.row + '. satır: ' + s.why).join(', ')})` : ''}</p>
    <p><b>${newCount ? `${newCount} yeni harcama` : 'Yeni harcama yok'}</b>${items.length - newCount ? ` · ${items.length - newCount} tanesi uygulamada zaten var (aynı gün, aynı tür ve aynı tutar) ve seçili değil` : ''}.</p>
    ${newCats.length ? `<p class="muted">Yeni kategoriler eklenecek: <b>${newCats.map(esc).join(', ')}</b></p>` : ''}
    <div class="list" style="max-height:45vh;overflow:auto">${[...items].sort((a, b) => a.dup - b.dup || a.rec.date.localeCompare(b.rec.date)).map(x => `
      <label class="item" style="margin:0;color:var(--fg)"><input type="checkbox" class="chk" name="sel" value="${x.i}" ${x.dup ? '' : 'checked'}>
        <div class="t"><b>${esc(x.rec.note || x.rec.category)}${x.dup ? ' <span class="pill warn">zaten var</span>' : ''}</b><small>${fmtDate(x.rec.date)} · ${esc(x.rec.category)} · ${SRC[x.rec.source]}</small></div>
        <div class="amt">${tl(x.rec.amount)}</div></label>`).join('')}</div>
    <label><input type="checkbox" class="chk" name="reimb">Cebimden olanları “şirketten geri alındı” işaretle</label>
    <button class="btn block">${newCount ? 'Seçilenleri aktar' : 'Kapat'}</button><div class="btns"><button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  $('#impForm').onsubmit = ev => {
    ev.preventDefault(); const f = new FormData(ev.target);
    const sel = new Set(f.getAll('sel').map(Number)), reimb = !!f.get('reimb');
    const chosen = items.filter(x => sel.has(x.i));
    if (!chosen.length) { closeDlg(); return toast(newCount ? 'Hiç harcama seçilmedi' : 'Dosyadaki harcamaların hepsi zaten uygulamada'); }
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

/* --- Gelir-Gider (düzenli / tek seferlik; burs, kira, elden borç…) --- */
const FREQ = { aylik: 'Düzenli (her ay)', tek: 'Tek seferlik' };
const flowActiveIn = (f, m) => f.freq === 'aylik' ? (f.start <= m && (!f.end || m <= f.end)) : (f.date || '').startsWith(m);
function flowMonth(m) {
  const list = (data.flows || []).filter(f => flowActiveIn(f, m));
  const gelir = list.filter(f => f.type === 'gelir').reduce((s, f) => s + f.amount, 0);
  const gider = list.filter(f => f.type === 'gider').reduce((s, f) => s + f.amount, 0);
  return { list, gelir, gider, net: gelir - gider };
}
VIEWS.gelirgider = () => {
  const fl = data.flows || [];
  const mm = flowMonth(state.month);
  const reg = fl.filter(f => f.freq === 'aylik').sort((a, b) => a.type.localeCompare(b.type) || b.amount - a.amount);
  const once = fl.filter(f => f.freq === 'tek').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const open = once.filter(f => f.track && !f.settled);
  const openIn = open.filter(f => f.type === 'gelir').reduce((s, f) => s + f.amount, 0); // bana verilen → geri ödeyeceğim
  const openOut = open.filter(f => f.type === 'gider').reduce((s, f) => s + f.amount, 0); // benim verdiğim → geri alacağım
  const row = f => {
    const regText = f.freq === 'aylik' ? `her ay${f.day ? ' ' + f.day + '’inde' : ''} · ${fmtMonth(f.start)}${f.end ? ' – ' + fmtMonth(f.end) : ' → devam ediyor'}` : fmtDate(f.date);
    const st = f.freq === 'tek' && f.track ? (f.settled ? '<span class="pill good">kapandı</span>' : `<span class="pill warn">${f.type === 'gelir' ? 'geri ödenecek' : 'geri alınacak'}</span>`) : '';
    const ended = f.freq === 'aylik' && f.end && f.end < thisMonth() ? '<span class="pill">bitti</span>' : '';
    return `<div class="item" data-flow="${f.id}"><div class="ic ${f.type}">${ic(f.type === 'gelir' ? 'arrowDown' : 'arrowUp')}</div>
      <div class="t"><b>${esc(f.name)}${f.person ? ' · ' + esc(f.person) : ''} ${st}${ended}</b><small>${regText}${f.note ? ' · ' + esc(f.note) : ''}</small></div>
      <div style="text-align:right"><div class="amt ${f.type}">${f.type === 'gelir' ? '+' : '−'}${tl(f.amount)}</div>
      ${f.freq === 'tek' && f.track && !f.settled ? `<button class="btn ghost sm" style="margin-top:4px" data-settle="${f.id}">Kapandı</button>` : ''}</div></div>`;
  };
  return `
  <div class="row">${monthNav()}</div>
  <div class="tiles" style="margin-top:10px">
    <div class="tile"><div class="h">${ic('arrowDown')} Gelir</div><div class="v gelir">${tl(mm.gelir)}</div><div class="s">${fmtMonth(state.month)}</div></div>
    <div class="tile"><div class="h">${ic('arrowUp')} Gider</div><div class="v gider">${tl(mm.gider)}</div><div class="s">Net: <b class="${mm.net >= 0 ? 'gelir' : 'gider'}">${mm.net >= 0 ? '+' : ''}${tl(mm.net)}</b></div></div>
  </div>
  ${open.length ? `<div class="card" style="margin-top:10px"><b>${ic('handshake')} Açık hesaplar</b>
    <div class="kv"><span>Geri ödeyeceğim (bana verilen)</span><b class="gider">${tl(openIn)}</b></div>
    <div class="kv"><span>Geri alacağım (benim verdiğim)</span><b class="gelir">${tl(openOut)}</b></div></div>` : ''}
  <h2>${fmtMonth(state.month)} hareketleri</h2>
  ${mm.list.length ? `<div class="list">${mm.list.map(row).join('')}</div>` : '<div class="card empty">Bu ay gelir ya da gider yok.</div>'}
  <h2>Düzenli kaynaklar</h2>
  ${reg.length ? `<div class="list">${reg.map(row).join('')}</div>` : '<div class="card empty">Burs, maaş, kira, abonelik gibi her ay tekrar edenleri ekle.</div>'}
  <h2>Tek seferlik</h2>
  ${once.length ? `<div class="list">${once.map(row).join('')}</div>` : '<div class="card empty">Elden borç, satış, hediye gibi bir kerelik kayıtlar burada görünür.</div>'}`;
};
function flowForm(x) {
  const e = x || { type: 'gelir', freq: 'aylik', name: '', person: '', amount: '', start: state.month, end: '', day: '', date: today(), track: false, settled: false, note: '' };
  openDlg(`<form id="flForm"><h3>${x ? 'Kaydı düzenle' : 'Gelir / gider ekle'}</h3>
    <div class="seg wide" id="flType" style="margin-top:12px"><button type="button" data-v="gelir" class="${e.type === 'gelir' ? 'on' : ''}">Gelir</button><button type="button" data-v="gider" class="${e.type === 'gider' ? 'on' : ''}">Gider</button></div>
    <div class="seg wide" id="flFreq" style="margin-top:8px">${Object.entries(FREQ).map(([k, v]) => `<button type="button" data-v="${k}" class="${e.freq === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <label>Kaynak / ne için?</label><input name="name" required value="${esc(e.name)}" placeholder="Burs, maaş, kira, borç…">
    <div class="two"><div><label>Tutar (₺)</label><input name="amount" inputmode="decimal" required value="${e.amount || ''}"></div>
      <div><label>Kişi / kurum (ops.)</label><input name="person" value="${esc(e.person || '')}" placeholder="ör. KYK, Ali"></div></div>
    <div id="flReg" style="${e.freq === 'aylik' ? '' : 'display:none'}">
      <div class="two"><div><label>Başlangıç ayı</label><input type="month" name="start" value="${e.start || state.month}"></div>
        <div><label>Bitiş ayı (ops.)</label><input type="month" name="end" value="${e.end || ''}"></div></div>
      <label>Ayın kaçında? (ops.)</label><input name="day" type="number" min="1" max="31" value="${e.day || ''}">
    </div>
    <div id="flOnce" style="${e.freq === 'tek' ? '' : 'display:none'}">
      <label>Tarih</label><input type="date" name="date" value="${e.date || today()}">
      <label><input type="checkbox" class="chk" name="track" ${e.track ? 'checked' : ''}>Elden borç — geri ödenene kadar takip et</label>
      ${x && e.track ? `<label><input type="checkbox" class="chk" name="settled" ${e.settled ? 'checked' : ''}>Kapandı (geri ödendi)</label>` : ''}
    </div>
    <label>Not</label><input name="note" value="${esc(e.note || '')}">
    <button class="btn block">Kaydet</button>
    <div class="btns">${x ? '<button type="button" class="btn danger" id="flDel">Sil</button>' : ''}<button type="button" class="btn ghost" data-close>Vazgeç</button></div></form>`);
  let type = e.type, freq = e.freq;
  const seg = (id, fn) => $$(`#${id} button`).forEach(b => b.onclick = () => { $$(`#${id} button`).forEach(o => o.classList.toggle('on', o === b)); fn(b.dataset.v); });
  seg('flType', v => type = v);
  seg('flFreq', v => { freq = v; $('#flReg').style.display = v === 'aylik' ? '' : 'none'; $('#flOnce').style.display = v === 'tek' ? '' : 'none'; });
  if ($('#flDel')) $('#flDel').onclick = () => { if (confirm('Bu kayıt silinsin mi?')) { data.flows = data.flows.filter(o => o.id !== x.id); closeDlg(); commit(); } };
  $('#flForm').onsubmit = ev => { ev.preventDefault(); const f = new FormData(ev.target);
    const rec = { id: e.id || uid(), type, freq, name: f.get('name').trim(), person: f.get('person').trim(), amount: num(f.get('amount')), note: f.get('note').trim() };
    if (!rec.amount) return toast('Tutar gir');
    if (freq === 'aylik') { Object.assign(rec, { start: f.get('start') || thisMonth(), end: f.get('end') || '', day: parseInt(f.get('day')) || null }); if (rec.end && rec.end < rec.start) return toast('Bitiş ayı başlangıçtan önce olamaz'); }
    else Object.assign(rec, { date: f.get('date') || today(), track: !!f.get('track'), settled: !!f.get('settled') });
    data.flows ||= [];
    if (x) { for (const k of Object.keys(x)) delete x[k]; Object.assign(x, rec); } else data.flows.push(rec);
    closeDlg(); commit(); };
}
document.addEventListener('click', e => {
  const st = e.target.closest('[data-settle]');
  if (st) { const f = data.flows.find(o => o.id === st.dataset.settle); f.settled = true; f.settledDate = today(); toast('Kapandı olarak işaretlendi'); return commit(); }
  const it = e.target.closest('[data-flow]'); if (it) flowForm(data.flows.find(o => o.id === it.dataset.flow));
});

/* --- Yatırım --- */
VIEWS.yatirim = () => {
  const g = goldTotals(); const pl = g.value - g.cost;
  const part = fx => data.gold.filter(x => isFx(x.type) === fx).reduce((s, x) => s + goldValue(x), 0);
  const hasMetal = data.gold.some(x => !isFx(x.type)), hasFx = data.gold.some(x => isFx(x.type));
  const qtyText = x => isFx(x.type) ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(x.qty) + ' ' + x.type : '× ' + String(x.qty).replace('.', ',');
  const rate = v => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: v < 1 ? 4 : 2 }).format(v);
  // Renkler: altın sarı, gümüş gri, dolar yeşil, euro kahverengi, sterlin mavi, frank kırmızı, diğer dövizler camgöbeği
  const holdColor = t => ({ USD: 'var(--usd)', EUR: 'var(--eur)', GBP: 'var(--gbp)', CHF: 'var(--chf)', GUMUS: 'var(--muted)' })[t] || (isFx(t) ? 'var(--fx)' : 'var(--gold)');
  const chg = c => `<span class="${c >= 0 ? 'up' : 'down'}">${c >= 0 ? '▲' : '▼'} %${Math.abs(c).toLocaleString('tr-TR')}</span>`;
  const holdRow = x => { const p = prices?.items[x.type]; const fx = isFx(x.type); return `
      <div class="item" data-gold="${x.id}"><div class="ic" style="color:${holdColor(x.type)}">${fx ? (FX_SYMBOL[x.type] || x.type.slice(0, 1)) : ic('coins')}</div>
        <div class="t"><b>${fx ? esc(FX_TYPES[x.type]) : esc(METAL_TYPES[x.type])} ${qtyText(x)}</b><small>${p ? (fx ? 'Kur ' : 'Birim ') + rate(p.buy) + ' · ' + chg(p.change) : ''}${x.note ? ' · ' + esc(x.note) : ''}</small></div>
        <div class="amt">${p ? tl(goldValue(x)) : '…'}</div></div>`; };
  const market = (types, title, cls) => `<div class="subhead ${cls}">${title}</div>` + Object.keys(types).filter(k => prices.items[k]).map(k => `<div class="kv mkt"><span><b style="color:${holdColor(k)}">${isFx(k) ? (FX_SYMBOL[k] || '') + ' ' + k : '◆'}</b> ${types[k]}</span><span class="r">${rate(prices.items[k].buy)} / ${rate(prices.items[k].sell)}<br><small>${chg(prices.items[k].change)}</small></span></div>`).join('');
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
  ${prices ? `<h2>Piyasa</h2><div class="card">${market(METAL_TYPES, 'Altın & gümüş', 'gold')}${market(FX_TYPES, 'Döviz', 'fx')}<div class="muted" style="margin-top:6px">Alış / satış (TL)</div></div>` : ''}
  <h2>Yatırım notları</h2>
  ${data.notes.length ? `<div class="list">${[...data.notes].sort((a, b) => b.date.localeCompare(a.date)).map(n => `
    <div class="item" data-note="${n.id}"><div class="ic">${ic('pencil')}</div><div class="t"><b>${esc(n.title)}</b><small>${fmtDate(n.date)} · ${esc(n.body.slice(0, 70))}</small></div></div>`).join('')}</div>` : '<div class="card empty">Not yok.</div>'}
  <div class="btns"><button class="btn ghost" id="noteAdd">${ic('pencil')} Not ekle</button></div>`;
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
    <div class="item" data-inst="${i.id}"><div class="ic">${ic('card')}</div>
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
  ${all.some(([, f]) => f.finished) ? `<h2>Biten taksitler</h2><div class="list">${all.filter(([, f]) => f.finished).map(row).join('')}</div>` : ''}`;
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
  const p = e.target.closest('[data-pay]');
  if (p) { const i = data.installments.find(x => x.id === p.dataset.pay); if (!i.paid.includes(thisMonth())) i.paid.push(thisMonth()); toast('Bu ayın taksiti ödendi'); return commit(); }
  const it = e.target.closest('[data-inst]'); if (it) instForm(data.installments.find(x => x.id === it.dataset.inst));
});

/* --- Varlıklar --- */
function gcalUrl(a, ev) {
  const d = ev.date.replace(/-/g, ''), d2 = addDaysIso(ev.date, 1).replace(/-/g, '');
  const p = new URLSearchParams({ action: 'TEMPLATE', text: `${a.name} — ${ev.kind} yenileme`, dates: `${d}/${d2}`,
    details: [ev.company && 'Şirket: ' + ev.company, ev.cost && 'Son tutar: ' + tl(ev.cost), ev.note].filter(Boolean).join('\n'), recur: 'RRULE:FREQ=YEARLY' });
  return 'https://calendar.google.com/calendar/render?' + p.toString();
}
VIEWS.varlik = () => `
  ${data.assets.length ? data.assets.map(a => `
    <h2>${esc(a.name)}${a.detail ? ' · ' + esc(a.detail) : ''}</h2>
    <div class="list">
      ${a.events.length ? [...a.events].sort((x, y) => x.date.localeCompare(y.date)).map(ev => `
        <div class="item" data-ev="${a.id}|${ev.id}"><div class="ic">${ic('calendar')}</div>
          <div class="t"><b>${esc(ev.kind)}</b><small>${fmtDate(ev.date)}${ev.cost ? ' · ' + tl(ev.cost) : ''}${ev.company ? ' · ' + esc(ev.company) : ''}</small></div>${dayPill(daysUntil(ev.date))}</div>`).join('')
      : '<div class="empty">Henüz kayıt yok.</div>'}
    </div>
    <div class="btns"><button class="btn ghost" data-evadd="${a.id}">${ic('plus')} Sigorta / kasko / tarih ekle</button><button class="btn ghost" data-asset="${a.id}">${ic('pencil')} Düzenle</button></div>`).join('')
  : '<div class="card empty">Araba, ev, laptop gibi varlıklarını ekle; sigorta, kasko, muayene, bakım tarihlerini takip et.</div>'}`;
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
    (x.history ||= []).push({ date: x.date, cost: x.cost });
    x.date = addYearsIso(x.date, 1); x.cost = num(c) || x.cost; closeDlg(); commit(); toast('Yeni tarih: ' + fmtDate(x.date));
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
  ${session.user.isAdmin ? `<h2>Yönetim</h2>
  <div class="card"><div class="row"><div><b>${ic('users')} Yönetim paneli</b><div class="muted">Kullanıcılar, davetler ve duyurular</div></div>
    <button class="btn" data-tab="yonetim" style="background:var(--c-yonetim)">Aç</button></div></div>` : ''}
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
  if (gStatus.needsReconnect) return `<div><b class="gider">Bağlantı koptu</b> <span class="pill bad">eşitlenmiyor</span></div>
    <p class="muted">Google izni kaldırıldığı için yeni değişiklikler takvime gitmiyor. Takvimdeki mevcut etkinlikler duruyor; yeniden bağlanınca aynı “Muhasebe” takvimi kaldığı yerden güncellenir.</p>
    <button class="btn" id="gConnect">Yeniden bağlan</button>`;
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

/* ========== Yönetim paneli (yalnızca yönetici) ========== */
const ANN_LEVEL = { info: 'Bilgi', guncelleme: 'Güncelleme', onemli: 'Önemli' };
const dt = t => t ? new Date(t).toLocaleString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const kb = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round((b || 0) / 1024)) + ' KB';
VIEWS.yonetim = () => {
  if (!session.user.isAdmin) return '<div class="card empty">Bu sayfa yalnızca yönetici içindir.</div>';
  return `
  <div class="btns" style="margin-top:0"><button class="btn ghost sm" data-tab="ayar">${ic('back')} Ayarlara dön</button></div>
  <h2>Kullanıcılar</h2><div id="admUsers" class="muted">Yükleniyor…</div>
  <h2>Duyuru gönder</h2>
  <div class="card"><form id="annForm">
    <label>Başlık</label><input name="title" required maxlength="120" placeholder="ör. Yeni özellik: Gelir-Gider">
    <label>Metin</label><textarea name="body" rows="4" maxlength="4000" placeholder="Kullanıcıların zil simgesinde göreceği mesaj"></textarea>
    <label>Tür</label><select name="level">${Object.entries(ANN_LEVEL).map(([k, v]) => opt(k, v, 'info')).join('')}</select>
    <button class="btn block">Duyuruyu gönder</button></form>
    <div id="admAnn" style="margin-top:12px"></div></div>
  <h2>Davetler</h2>
  <div class="card">
    <p class="muted" style="margin-top:0">Hesaplar yalnızca davet linkiyle açılır. Her link tek kişilik ve süreli; her kullanıcının verisi kendine özeldir.</p>
    <form id="invForm"><div class="two"><input name="note" placeholder="Kimin için? (ops.)" maxlength="80"><select name="days" aria-label="Geçerlilik süresi">${[1, 3, 7, 14, 30].map(d => opt(String(d), d + ' gün geçerli', '7')).join('')}</select></div>
      <button class="btn block" style="margin-top:10px">Davet linki oluştur</button></form>
    <div id="invList" class="muted" style="margin-top:12px">Yükleniyor…</div>
  </div>`;
};
async function loadAdmin() {
  loadInvites(); loadAdminAnn();
  const box = $('#admUsers'); if (!box) return;
  try {
    const { users } = await api('/api/admin/users');
    box.innerHTML = users.map(u => {
      const me = u.id === session.user.id;
      const how = u.invited_by_name ? `${esc(u.invited_by_name)} davetiyle${u.invite_note ? ' (“' + esc(u.invite_note) + '”)' : ''}` : 'ilk yönetici daveti';
      return `<div class="user"><div class="row"><div><b>${esc(u.username)}</b>${u.is_admin ? '<span class="pill good">yönetici</span>' : ''}${u.disabled ? '<span class="pill bad">erişim kapalı</span>' : ''}${me ? '<span class="pill info">sen</span>' : ''}</div>
          <span class="muted">${u.sessions} açık oturum</span></div>
        <div class="muted" style="margin-top:4px;line-height:1.6">Giriş yolu: ${how}<br>Kayıt: ${dt(u.created_at)} · Son giriş: ${dt(u.last_login)} · Son görülme: ${dt(u.last_seen)}<br>
          Veri: ${kb(u.data_size)} · Fiş: ${u.receipts} adet (${kb(u.receipt_bytes)})${u.google ? ' · Google Takvim bağlı' : ''}</div>
        ${me ? '' : `<div class="btns"><button class="btn ghost sm" data-adm="logout" data-id="${u.id}">Oturumlarını kapat</button>
          ${u.disabled ? `<button class="btn sm" data-adm="enable" data-id="${u.id}">Erişimi aç</button>` : `<button class="btn ghost sm" data-adm="disable" data-id="${u.id}">Erişimi kes</button>`}
          <button class="btn danger sm" data-adm="delete" data-id="${u.id}" data-name="${esc(u.username)}">Hesabı sil</button></div>`}</div>`;
    }).join('');
  } catch (e) { box.textContent = e.message; }
}
async function loadAdminAnn() {
  const box = $('#admAnn'); if (!box) return;
  try {
    const { announcements } = await api('/api/announcements');
    box.innerHTML = announcements.length ? '<div class="muted"><b>Gönderilen duyurular</b></div>' + announcements.map(a => `<div class="ann ${a.level}"><div class="row"><b>${esc(a.title)}</b><button class="btn ghost sm" data-anndel="${a.id}">Sil</button></div>
      ${a.body ? `<div class="note">${esc(a.body)}</div>` : ''}<small>${ANN_LEVEL[a.level] || ''} · ${dt(a.created_at)}</small></div>`).join('') : '<div class="muted">Henüz duyuru yok.</div>';
  } catch (e) { box.textContent = e.message; }
}
const ADM_CONFIRM = { logout: 'Bu kullanıcının tüm cihazlardaki oturumları kapatılsın mı? (Tekrar giriş yapabilir)', disable: 'Bu kullanıcının erişimi kesilsin mi? Oturumları kapanır ve sen açana kadar giriş yapamaz.', enable: 'Bu kullanıcının erişimi tekrar açılsın mı?' };
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-adm]');
  if (b) {
    const a = b.dataset.adm;
    if (a === 'delete') { const n = prompt(`"${b.dataset.name}" hesabı ve TÜM verileri (harcamalar, fişler, takvim bağlantısı) kalıcı olarak silinecek. Bu geri alınamaz.\n\nOnaylamak için kullanıcı adını yaz:`); if (n !== b.dataset.name) return n !== null && toast('Kullanıcı adı eşleşmedi, silinmedi'); }
    else if (!confirm(ADM_CONFIRM[a])) return;
    try { await api('/api/admin/user', { method: 'POST', body: JSON.stringify({ id: b.dataset.id, action: a }) }); toast({ logout: 'Oturumlar kapatıldı', disable: 'Erişim kesildi', enable: 'Erişim açıldı', delete: 'Hesap silindi' }[a]); loadAdmin(); }
    catch (err) { toast(err.message); }
  }
  const d = e.target.closest('[data-anndel]');
  if (d && confirm('Bu duyuru herkesten kaldırılsın mı?')) { try { await api('/api/admin/announcements?id=' + d.dataset.anndel, { method: 'DELETE' }); loadAdminAnn(); loadAnnouncements(); } catch (err) { toast(err.message); } }
});
document.addEventListener('submit', async e => {
  if (e.target.id !== 'annForm') return; e.preventDefault(); const f = new FormData(e.target);
  try { await api('/api/admin/announcements', { method: 'POST', body: JSON.stringify({ title: f.get('title'), body: f.get('body'), level: f.get('level') }) }); e.target.reset(); toast('Duyuru gönderildi'); loadAdminAnn(); loadAnnouncements(); }
  catch (err) { toast(err.message); }
});

/* ========== Duyurular (zil) ========== */
let announcements = [];
const annSeenKey = () => 'mh_annseen_' + session?.user.id;
async function loadAnnouncements() {
  if (!session) return;
  try { ({ announcements } = await api('/api/announcements')); } catch { return; }
  const seen = load(annSeenKey()) || 0;
  const n = announcements.filter(a => a.created_at > seen).length;
  const badge = $('#bellBadge'); badge.hidden = !n; badge.textContent = n > 9 ? '9+' : n;
}
setInterval(loadAnnouncements, 10 * 60e3);
document.addEventListener('click', e => {
  if (!e.target.closest('#bellBtn')) return;
  const seen = load(annSeenKey()) || 0;
  openDlg(`<h3>${ic('bell')} Duyurular</h3>${announcements.length ? announcements.map(a => `<div class="ann ${a.level}"><b>${a.created_at > seen ? '<span class="pill bad" style="margin:0 6px 0 0">yeni</span>' : ''}${esc(a.title)}</b>
    ${a.body ? `<div class="note" style="margin-top:4px">${esc(a.body)}</div>` : ''}<small>${ANN_LEVEL[a.level] || ''} · ${dt(a.created_at)}</small></div>`).join('') : '<p class="muted">Henüz duyuru yok.</p>'}
    <div class="btns"><button class="btn ghost" data-close>Kapat</button></div>`);
  if (announcements[0]) { store(annSeenKey(), announcements[0].created_at); $('#bellBadge').hidden = true; }
});

/* ========== Otomatik güncelleme ==========
   GitHub Pages sayfayı 10 dk önbellekte tutar; telefon eski sürümde kalmasın diye index.html'deki
   sürüm numarasını önbelleksiz kontrol et, değiştiyse (form açık ve kaydedilmemiş değişiklik yoksa) yenile. */
const MY_VER = (document.querySelector('script[src^="app.js"]')?.getAttribute('src').match(/v=(\d+)/) || [])[1];
async function checkUpdate() {
  if (!MY_VER) return;
  try {
    const html = await (await fetch('./?nocache=' + Date.now(), { cache: 'no-store' })).text();
    const v = (html.match(/app\.js\?v=(\d+)/) || [])[1];
    if (!v || v === MY_VER) return;
    if (dlg.open || dirty) { setTimeout(checkUpdate, 30e3); return; }
    toast('Yeni sürüm yükleniyor…'); setTimeout(() => location.reload(), 600);
  } catch {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkUpdate(); });
setInterval(checkUpdate, 5 * 60e3);
setTimeout(checkUpdate, 3000);

/* ========== Başlat ========== */
function boot() {
  document.body.classList.remove('authmode');
  const gq = new URLSearchParams(location.search).get('google');
  if (gq) {
    history.replaceState(null, '', location.pathname);
    toast({ tamam: 'Google Takvim bağlandı ✓', iptal: 'Google bağlantısı iptal edildi', izin: 'Takvim izni verilmedi, tekrar dene ve kutucuğu işaretle', gecersiz: 'Bağlantı süresi doldu, tekrar dene', hata: 'Google bağlantısı kurulamadı' }[gq] || 'Google');
    state.tab = 'ayar';
  } else state.tab = 'ana';
  render(); fetchPrices(); loadGoogle(); loadAnnouncements();
  dirty ? push().then(pull) : pull();
}
if (session && !new URLSearchParams(location.search).get('davet')) { loadLocal(); boot(); }
else showAuth();
