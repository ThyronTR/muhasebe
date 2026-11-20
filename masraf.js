// Şirket masraf formu (TEMA MASRAF FORMU) şablonunu doldurur.
// Şablon: sablon/masraf-formu.xlsx — biçimi, stilleri, toplam formülleri ve onay kutuları aynen korunur.
// Sütunlar: A Masrafı Yapan · B Harcama Tarihi · C Harcama Nedeni · D Masraf Adı · E K.Kartı Masraf · F Nakit Masraf
(function (root) {
  const FIRST = 3, BASE_ROWS = 20; // şablonda 3-22 arası 20 veri satırı
  const xmlEsc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
  // Excel tarih seri numarası (1900 sistemi)
  const serial = iso => { const [y, m, d] = iso.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5); };
  const shiftRef = (ref, by) => ref.replace(/([A-Z]+)(\d+)/g, (_, c, r) => c + (+r >= 23 ? +r + by : +r));

  async function fill(JSZip, templateBuf, { name, rows }) {
    const z = await JSZip.loadAsync(templateBuf);
    let sh = await z.file('xl/worksheets/sheet1.xml').async('string');
    const rowRe = /<row r="(\d+)"([^>]*)>([\s\S]*?)<\/row>|<row r="(\d+)"([^>]*)\/>/g;
    const tpl = {};
    for (const m of sh.matchAll(rowRe)) tpl[+(m[1] || m[4])] = { attrs: m[2] ?? m[5], cells: m[3] || '' };
    const styleOf = (r, col) => (tpl[r].cells.match(new RegExp(`<c r="${col}${r}" s="(\\d+)"`)) || [])[1];

    const n = Math.max(BASE_ROWS, rows.length), extra = n - BASE_ROWS, last = FIRST + n - 1;
    const out = [];
    const keep = r => `<row r="${r}"${tpl[r].attrs.replace(/spans="[^"]*"/, 'spans="1:6"')}>${tpl[r].cells}</row>`;
    out.push(keep(1), keep(2));
    for (let i = 0; i < n; i++) {
      const r = FIRST + i, src = FIRST + (i % BASE_ROWS); // stil deseni şablondaki 20 satırdan döngüyle alınır
      const it = rows[i];
      const cell = (col, v) => {
        const s = styleOf(src, col), ref = col + r;
        if (!it || v === '' || v == null) return `<c r="${ref}" s="${s}"/>`;
        if (typeof v === 'number') return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
        return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
      };
      out.push(`<row r="${r}"${tpl[src].attrs}>` +
        cell('A', it && name) + cell('B', it && serial(it.date)) + cell('C', it && it.reason) + cell('D', it && it.item) +
        cell('E', it && it.kart ? it.kart : '') + cell('F', it && it.nakit ? it.nakit : '') + '</row>');
    }
    // Toplam ve onay satırları (23-29) aşağı kaydırılır, formüller yeni aralığa göre güncellenir
    const sumE = rows.reduce((s, x) => s + (x.kart || 0), 0), sumF = rows.reduce((s, x) => s + (x.nakit || 0), 0);
    for (let r = 23; r <= 29; r++) {
      let cells = tpl[r].cells.replace(/r="([A-Z]+)(\d+)"/g, (_, c, rr) => `r="${c}${+rr + extra}"`);
      cells = cells.replace(/<f>SUM\(E3:E22\)<\/f><v>[^<]*<\/v>/, `<f>SUM(E${FIRST}:E${last})</f><v>${sumE}</v>`)
                   .replace(/<f>SUM\(F3:F22\)<\/f><v>[^<]*<\/v>/, `<f>SUM(F${FIRST}:F${last})</f><v>${sumF}</v>`);
      out.push(`<row r="${r + extra}"${tpl[r].attrs}>${cells}</row>`);
    }
    sh = sh.replace(/<sheetData>[\s\S]*<\/sheetData>/, `<sheetData>${out.join('')}</sheetData>`)
      .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:F${29 + extra}"/>`)
      .replace(/<mergeCell ref="([^"]+)"\/>/g, (_, ref) => `<mergeCell ref="${shiftRef(ref, extra)}"/>`)
      .replace(/<selection [^>]*\/>/, '<selection activeCell="A3" sqref="A3"/>');
    z.file('xl/worksheets/sheet1.xml', sh);

    // calcChain eski hücre listesini taşır; kaldır ve Excel açılışta yeniden hesaplasın
    z.remove('xl/calcChain.xml');
    let ct = await z.file('[Content_Types].xml').async('string');
    z.file('[Content_Types].xml', ct.replace(/<Override PartName="\/xl\/calcChain.xml"[^>]*\/>/, ''));
    let rels = await z.file('xl/_rels/workbook.xml.rels').async('string');
    z.file('xl/_rels/workbook.xml.rels', rels.replace(/<Relationship [^>]*Target="calcChain.xml"[^>]*\/>/, ''));
    let wb = await z.file('xl/workbook.xml').async('string');
    z.file('xl/workbook.xml', wb.replace(/<calcPr([^>]*)\/>/, (m, a) => `<calcPr${a.replace(/ fullCalcOnLoad="\d"/, '')} fullCalcOnLoad="1"/>`));
    return z;
  }

  // Uygulama verisinden form satırları: Nakit = cebimden, K.Kartı = şirket kartı
  function rowsFromExpenses(list) {
    return [...list].sort((a, b) => a.date.localeCompare(b.date) || 0).map(x => ({
      date: x.date, reason: x.note || x.category, item: x.note ? x.category : '',
      kart: x.source === 'kart' ? x.amount : 0, nakit: x.source === 'cep' ? x.amount : 0
    }));
  }

  /* ---------- İçe aktarma: doldurulmuş masraf formunu oku ---------- */
  const norm = s => String(s || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').replace(/[.:]/g, '').trim();
  const HEAD = { name: ['masrafı yapan'], date: ['harcama tarihi', 'tarih'], reason: ['harcama nedeni', 'açıklama'], item: ['masraf adı', 'kategori'],
    kart: ['kkartı masraf', 'k kartı masraf', 'kredi kartı masraf', 'şirket kartı'], nakit: ['nakit masraf', 'nakit'] };
  const colNum = ref => ref.replace(/\d+/g, '').split('').reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
  function toIso(v) {
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return d.toISOString().slice(0, 10); }
    const s = String(v || '').trim(); let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    if ((m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
    if (/^\d+(\.\d+)?$/.test(s)) return toIso(+s);
    return null;
  }
  function toNum(v) {
    if (typeof v === 'number') return v;
    let s = String(v || '').replace(/[₺\sTLtl]/g, ''); if (!s) return 0;
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    const n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  async function parse(JSZip, buf) {
    const z = await JSZip.loadAsync(buf);
    const wb = await z.file('xl/workbook.xml').async('string');
    const rid = (wb.match(/<sheet [^>]*r:id="([^"]+)"/) || [])[1];
    const rels = await z.file('xl/_rels/workbook.xml.rels').async('string');
    let target = (rels.match(new RegExp(`<Relationship [^>]*Id="${rid}"[^>]*Target="([^"]+)"`)) || rels.match(new RegExp(`<Relationship [^>]*Target="([^"]+)"[^>]*Id="${rid}"`)) || [])[1] || 'worksheets/sheet1.xml';
    target = target.replace(/^\/?xl\//, '').replace(/^\//, '');
    const sh = await z.file('xl/' + target).async('string');
    const ssFile = z.file('xl/sharedStrings.xml');
    const dec = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    const strings = ssFile ? ((await ssFile.async('string')).match(/<si>[\s\S]*?<\/si>/g) || []).map(si => dec((si.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map(t => t.replace(/<[^>]+>/g, '')).join(''))) : [];
    const grid = [];
    for (const rm of sh.matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = {};
      for (const cm of rm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cm[2], inner = cm[3] || '', t = (attrs.match(/t="(\w+)"/) || [])[1];
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = null;
        if (t === 's') val = strings[+v] ?? '';
        else if (t === 'inlineStr') val = dec((inner.match(/<t[^>]*>[\s\S]*?<\/t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join(''));
        else if (t === 'str') val = dec(v || '');
        else if (v != null) val = +v;
        if (val !== null && val !== '') row[colNum(cm[1])] = { val, formula: /<f[ >]/.test(inner) };
      }
      grid.push({ r: +rm[1], row });
    }
    // Başlık satırını bul ve sütunları adlarına göre eşle (sütun yerleri değişse de çalışır)
    let hdrIdx = -1, cols = {};
    for (let i = 0; i < grid.length && hdrIdx < 0; i++) {
      const found = {};
      for (const [c, cell] of Object.entries(grid[i].row)) { const n = norm(cell.val); for (const [k, names] of Object.entries(HEAD)) if (!found[k] && names.some(h => n === h || n.startsWith(h))) found[k] = +c; }
      if (found.date && (found.kart || found.nakit)) { hdrIdx = i; cols = found; }
    }
    if (hdrIdx < 0) throw new Error('Masraf formu başlıkları bulunamadı (Harcama Tarihi, K.Kartı Masraf, Nakit Masraf)');
    const rows = [], skipped = [];
    for (const { r, row } of grid.slice(hdrIdx + 1)) {
      const g = k => cols[k] ? row[cols[k]] : undefined;
      const texts = Object.values(row).map(c => norm(c.val));
      if (texts.some(t => t.includes('toplam') || t.startsWith('onay'))) break; // toplam / onay bölümüne gelindi
      if (Object.values(row).some(c => c.formula)) continue;
      const kart = toNum(g('kart')?.val), nakit = toNum(g('nakit')?.val);
      const hasAny = Object.keys(row).length > 0;
      if (!hasAny) continue;
      const date = toIso(g('date')?.val);
      if (!date || (!kart && !nakit)) { skipped.push({ row: r, why: !date ? 'tarih okunamadı' : 'tutar yok' }); continue; }
      const base = { row: r, date, name: String(g('name')?.val ?? '').trim(), reason: String(g('reason')?.val ?? '').trim(), item: String(g('item')?.val ?? '').trim() };
      if (kart) rows.push({ ...base, source: 'kart', amount: kart });
      if (nakit) rows.push({ ...base, source: 'cep', amount: nakit });
    }
    return { rows, skipped };
  }

  const api = { fill, rowsFromExpenses, parse };
  if (typeof module !== 'undefined') module.exports = api; else root.Masraf = api;
})(this);
