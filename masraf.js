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

  const api = { fill, rowsFromExpenses };
  if (typeof module !== 'undefined') module.exports = api; else root.Masraf = api;
})(this);
