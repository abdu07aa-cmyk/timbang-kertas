/* Modul Gudang: hasil */
(function(){
const sb = window.sbG, GP = window.GP;
const NS = GP.mods.hasil = {};
let piList = [], items = [], docs = [], fStatus = 'AKTIF';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('id-ID');
const WARNA = { MENUNGGU_QC:'#7c3aed', MENUNGGU_TERIMA:'#b45309', DITERIMA:'#15803d', DIBATALKAN:'#64748b' };
const LABEL = { MENUNGGU_QC:'🔬 Menunggu QC', MENUNGGU_TERIMA:'⏳ Menunggu diterima Admin', DITERIMA:'✅ Diterima & masuk stok', DIBATALKAN:'❌ Dibatalkan' };
const tglKey = d => { d = d ? new Date(d) : new Date(); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
const fWaktu = iso => iso ? new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
const nm = e => String(e || '').split('@')[0];
const perluQcOtomatis = it => /TIPS|\b2[16]\s*MM\b/i.test(`${it.jenis || ''} ${it.paper || ''} ${it.size || ''}`);
const role = () => GP.me.role, admin = () => !!GP.me.admin;
const bisaMesin = () => admin() || role() === 'leader';
const bisaQc = () => admin() || role() === 'qc';
const label = it => `${it.brand || ''} · ${it.jenis || ''}${it.paper ? ' · ' + it.paper : ''}${it.size ? ' · ' + it.size : ''}`;

NS.mount = async function(host){
  host.innerHTML = '<div class="gm-hasil">' +
    (bisaMesin() ? '<div class="card"><div class="card-title">🏭 Serahkan Hasil Diecut</div>' +
      '<div class="hint">Satu nota untuk satu PI, boleh banyak jenis (Filter Kraft, Filter White, Filter Tips, dll). Item bertanda <b>QC</b> (filter tips) diperiksa Leader QC dulu sebelum sampai ke Admin.</div>' +
      '<label>No. PI</label><select id="hsPi" data-ss="1" onchange="GP.mods.hasil.pilihPi()"></select>' +
      '<div id="hsItems"></div>' +
      '<label>Mesin (opsional)</label><input id="hsMesin" placeholder="mis. Diecut 1">' +
      '<label>Catatan (opsional)</label><input id="hsCatatan" placeholder="mis. shift pagi">' +
      '<button class="btn-primary" id="hsKirim" onclick="GP.mods.hasil.serahkan()" style="margin-top:10px">📤 Serahkan</button></div>' : '') +
    '<div class="card"><div class="card-title">📋 Daftar Serah Terima Hasil</div>' +
      '<select id="hsFilter" onchange="GP.mods.hasil.filter(this.value)"><option value="AKTIF">Yang masih berjalan</option><option value="MENUNGGU_QC">Menunggu QC</option><option value="MENUNGGU_TERIMA">Menunggu diterima Admin</option><option value="DITERIMA">Sudah diterima</option><option value="SEMUA">Semua</option></select>' +
      '<div id="hsList" style="margin-top:10px"></div></div></div>';
  await muatPi(); await muatDocs();
};
const canon = x => String(x || '').trim().split(/\s+/)[0].toUpperCase();
const nk = x => String(x == null ? '' : x).trim().toLowerCase();
const kunci = (noPi, it) => [canon(noPi), nk(it.brand), nk(it.jenis), nk(it.paper), nk(it.size)].join('|');
let elig = { det: new Set(), keys: new Set(), pis: new Set() };
async function muatElig() {
  // hanya barang yang sudah tercatat di Proses Diecut
  elig = { det: new Set(), keys: new Set(), pis: new Set() };
  const dp = (await sb.from('diecut_process').select('material_inbound_id').limit(5000)).data || [];
  const mids = [...new Set(dp.map(x => x.material_inbound_id).filter(Boolean))];
  if (!mids.length) return;
  const mi = (await sb.from('material_inbound').select('id,pi_detail_id,no_pi,brand,jenis,paper,size').in('id', mids)).data || [];
  mi.forEach(m => { if (m.pi_detail_id) elig.det.add(m.pi_detail_id); else { elig.keys.add(kunci(m.no_pi, m)); elig.pis.add(canon(m.no_pi)); } });
  if (elig.det.size) { const pd = (await sb.from('pi_detail').select('id,pi_id').in('id', [...elig.det]).limit(5000)).data || []; pd.forEach(x => elig.pis.add('#' + x.pi_id)); }
}
const itemOk = (it, noPi) => elig.det.has(it.id) || elig.keys.has(kunci(noPi, it));
async function muatPi() {
  const sel = document.getElementById('hsPi'); if (!sel) return;
  await muatElig();
  const { data } = await sb.from('pi_header').select('id,no_pi,tanggal').eq('is_archived', false).order('id', { ascending: false }).limit(400);
  piList = (data || []).filter(p => elig.pis.has('#' + p.id) || elig.pis.has(canon(p.no_pi)));
  const dets = piList.length ? (await sb.from('pi_detail').select('id,pi_id,brand,jenis,paper,size').in('pi_id', piList.map(p => p.id)).limit(5000)).data || [] : [];
  piList.forEach(p => { p.items = dets.filter(d => d.pi_id === p.id && itemOk(d, p.no_pi)); });
  piList = piList.filter(p => p.items.length);
  const ringkas = p => { const br = [...new Set(p.items.map(i => i.brand).filter(Boolean))].join(', '), jn = [...new Set(p.items.map(i => i.jenis).filter(Boolean))].join(', '); return `${p.no_pi} — ${br ? br + ' · ' : ''}${jn}`; };
  sel.innerHTML = (piList.length ? '<option value="">— pilih No. PI —</option>' : '<option value="">(belum ada PI yang melalui Proses Diecut)</option>') + piList.map(p => `<option value="${p.id}">${esc(ringkas(p))}</option>`).join('');
}
NS.pilihPi = async function() {
  const id = parseInt(document.getElementById('hsPi').value), box = document.getElementById('hsItems');
  if (!id) { items = []; box.innerHTML = ''; return; }
  const pi = piList.find(p => p.id === id);
  const { data } = await sb.from('pi_detail').select('*').eq('pi_id', id).order('id');
  items = (data || []).filter(it => itemOk(it, pi ? pi.no_pi : ''));
  if (!items.length) { box.innerHTML = '<div class="hint">Belum ada item PI ini yang tercatat di Proses Diecut.</div>'; return; }
  const terima = {}; docs.filter(d => d.status === 'DITERIMA').forEach(d => (d.serah_hasil_item || []).forEach(i => { terima[i.detail_id] = (terima[i.detail_id] || 0) + Number(i.qty_diterima || 0); }));
  box.innerHTML = '<div class="hint">Hanya item yang sudah melalui Proses Diecut yang tampil.</div><div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Item</th><th>Qty PI</th><th>Sudah diterima</th><th>Qty diserahkan (pcs)</th><th>QC?</th></tr></thead><tbody>' +
    items.map((it, i) => `<tr><td style="text-align:left">${esc(label(it))}</td><td>${fmt(it.qty_pi)}</td><td>${fmt(terima[it.id] || 0)}</td>` +
      `<td><input type="number" min="0" id="hsQ${i}" placeholder="0" style="width:110px"></td>` +
      `<td><input type="checkbox" id="hsQc${i}" ${perluQcOtomatis(it) ? 'checked' : ''} style="width:auto"></td></tr>`).join('') + '</tbody></table></div>';
};
NS.serahkan = async function() {
  const piId = parseInt(document.getElementById('hsPi').value); if (!piId) return alert('Pilih No. PI dulu');
  const pilih = items.map((it, i) => ({ it, qty: parseInt(document.getElementById('hsQ' + i).value) || 0, qc: document.getElementById('hsQc' + i).checked })).filter(x => x.qty > 0);
  if (!pilih.length) return alert('Isi jumlah pada minimal satu item.');
  const pi = piList.find(p => p.id === piId), pref = 'HD-' + tglKey() + '-';
  const seq = docs.filter(d => (d.no_dokumen || '').startsWith(pref)).reduce((a, d) => Math.max(a, parseInt(d.no_dokumen.slice(pref.length)) || 0), 0) + 1;
  const ada = pilih.some(x => x.qc);
  const btn = document.getElementById('hsKirim'); btn.disabled = true;
  try {
    const h = await sb.from('serah_hasil').insert([{ no_dokumen: pref + String(seq).padStart(3, '0'), pi_id: piId, no_pi: pi.no_pi, brand: [...new Set(pilih.map(x => x.it.brand).filter(Boolean))].join(', '), status: ada ? 'MENUNGGU_QC' : 'MENUNGGU_TERIMA', mesin: document.getElementById('hsMesin').value.trim() || null, catatan: document.getElementById('hsCatatan').value.trim() || null, diserahkan_oleh: GP.me.email }]).select();
    if (h.error) throw h.error;
    const id = h.data[0].id;
    const r = await sb.from('serah_hasil_item').insert(pilih.map(x => ({ serah_id: id, detail_id: x.it.id, jenis: label(x.it), qty_serah: x.qty, perlu_qc: x.qc })));
    if (r.error) { await sb.from('serah_hasil').delete().eq('id', id); throw r.error; }
    GP.log('SERAH HASIL DIECUT', `${GP.me.email} menyerahkan ${pilih.length} item PI ${pi.no_pi} (${h.data[0].no_dokumen})`);
    GP.toast('Serah terima hasil dibuat: ' + h.data[0].no_dokumen, 'success');
    document.getElementById('hsPi').value = ''; document.getElementById('hsItems').innerHTML = ''; items = [];
    await muatDocs();
  } catch (e) { alert('❌ ' + e.message + '\n\nKalau pesannya menyebut tabel serah_hasil tidak ada, jalankan dulu file supabase_gudang_hasil_diecut.sql di Supabase Gudang Pro.'); }
  finally { btn.disabled = false; }
};
async function muatDocs() {
  const { data, error } = await sb.from('serah_hasil').select('*, serah_hasil_item(*)').order('id', { ascending: false }).limit(200);
  const el = document.getElementById('hsList'); if (!el) return;
  if (error) { el.innerHTML = '<div class="hint" style="color:#b91c1c">❌ ' + esc(error.message) + '<br>Jalankan dulu file supabase_gudang_hasil_diecut.sql di Supabase Gudang Pro.</div>'; return; }
  docs = data || []; gambarDocs();
}
NS.filter = v => { fStatus = v; gambarDocs(); };
function gambarDocs() {
  const el = document.getElementById('hsList'); if (!el) return;
  let l = docs.filter(d => fStatus === 'SEMUA' ? true : fStatus === 'AKTIF' ? (d.status === 'MENUNGGU_QC' || d.status === 'MENUNGGU_TERIMA') : d.status === fStatus);
  if (role() === 'qc') l = l.filter(d => d.status === 'MENUNGGU_QC' || fStatus !== 'AKTIF');
  if (!l.length) { el.innerHTML = '<div class="hint">Belum ada data.</div>'; return; }
  const terimaAwal = {}; docs.filter(d => d.status === 'DITERIMA').forEach(d => (d.serah_hasil_item || []).forEach(i => { terimaAwal[i.detail_id] = (terimaAwal[i.detail_id] || 0) + Number(i.qty_diterima || 0); }));
  el.innerHTML = l.map(d => {
    const its = (d.serah_hasil_item || []).slice().sort((a, b) => a.id - b.id);
    const qcMode = d.status === 'MENUNGGU_QC' && bisaQc(), trmMode = d.status === 'MENUNGGU_TERIMA' && admin();
    const baris = its.map(i => {
      let sel = '';
      if (qcMode && i.perlu_qc) sel = `<td>OK <input type="number" min="0" id="qo${i.id}" value="${i.qty_serah}" style="width:90px"> NG <input type="number" min="0" id="qn${i.id}" value="0" style="width:80px"></td>`;
      else if (i.perlu_qc) sel = `<td>${i.qty_qc_ok != null ? 'OK ' + fmt(i.qty_qc_ok) + ' · NG ' + fmt(i.qty_qc_ng) : '<i>belum QC</i>'}</td>`;
      else sel = '<td>—</td>';
      let tr = '';
      if (trmMode) tr = `<td><input type="number" min="0" id="qt${i.id}" value="${i.perlu_qc ? (i.qty_qc_ok != null ? i.qty_qc_ok : i.qty_serah) : i.qty_serah}" style="width:100px"></td>`;
      else tr = `<td>${i.qty_diterima != null ? '<b>' + fmt(i.qty_diterima) + '</b>' : '—'}</td>`;
      const lebih = d.status === 'DITERIMA' ? '' : '';
      return `<tr><td style="text-align:left">${esc(i.jenis)}${i.perlu_qc ? ' <span class="chip" style="background:#ede9fe;color:#6d28d9">QC</span>' : ''}</td><td>${fmt(i.qty_serah)}</td>${sel}${tr}</tr>`;
    }).join('');
    const aksi = [];
    if (qcMode && its.some(i => i.perlu_qc)) aksi.push(`<button class="btn-primary" onclick="GP.mods.hasil.selesaiQc(${d.id})">🔬 Selesai QC</button>`);
    if (trmMode) aksi.push(`<button class="btn-primary" onclick="GP.mods.hasil.terima(${d.id})">✅ Terima & masuk stok</button>`);
    aksi.push(`<button class="btn-small" onclick="GP.mods.hasil.cetak(${d.id})">🖨️ Cetak nota</button>`);
    if ((d.status === 'MENUNGGU_QC' || d.status === 'MENUNGGU_TERIMA') && (bisaMesin() && (admin() || d.diserahkan_oleh === GP.me.email))) aksi.push(`<button class="btn-small" style="background:#ef4444;color:#fff" onclick="GP.mods.hasil.batal(${d.id})">Batalkan</button>`);
    return `<div class="dokumen" style="border:1px solid #e2e8f0;border-radius:10px;padding:10px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px"><b>${esc(d.no_dokumen)} · PI ${esc(d.no_pi)}</b><span style="color:#fff;background:${WARNA[d.status] || '#64748b'};border-radius:999px;padding:2px 10px;font-size:12px">${LABEL[d.status] || esc(d.status)}</span></div>
      <div class="hint">${esc(d.brand || '')} · diserahkan ${fWaktu(d.diserahkan_at)} oleh ${esc(nm(d.diserahkan_oleh))}${d.mesin ? ' · mesin ' + esc(d.mesin) : ''}${d.qc_at ? ' · QC ' + esc(nm(d.qc_oleh)) + ' ' + fWaktu(d.qc_at) : ''}${d.diterima_at ? ' · diterima ' + esc(nm(d.diterima_oleh)) + ' ' + fWaktu(d.diterima_at) : ''}${d.catatan ? '<br>📝 ' + esc(d.catatan) : ''}</div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Item</th><th>Diserahkan</th><th>QC</th><th>Diterima Admin</th></tr></thead><tbody>${baris}</tbody></table></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${aksi.join('')}</div></div>`;
  }).join('');
}
async function ambil(id) { return docs.find(x => x.id === id); }
NS.selesaiQc = async function(id) {
  const d = await ambil(id); const its = (d.serah_hasil_item || []).filter(i => i.perlu_qc);
  const hasil = its.map(i => ({ i, ok: parseInt(document.getElementById('qo' + i.id).value) || 0, ng: parseInt(document.getElementById('qn' + i.id).value) || 0 }));
  const salah = hasil.find(x => x.ok + x.ng > x.i.qty_serah); if (salah) return alert('OK + NG tidak boleh melebihi jumlah diserahkan (' + fmt(salah.i.qty_serah) + ') pada: ' + salah.i.jenis);
  const kurang = hasil.find(x => x.ok + x.ng < x.i.qty_serah);
  if (kurang && !confirm('OK + NG kurang dari jumlah diserahkan pada: ' + kurang.i.jenis + '. Lanjutkan?')) return;
  for (const x of hasil) { const r = await sb.from('serah_hasil_item').update({ qty_qc_ok: x.ok, qty_qc_ng: x.ng }).eq('id', x.i.id); if (r.error) return alert('❌ ' + r.error.message); }
  const r = await sb.from('serah_hasil').update({ status: 'MENUNGGU_TERIMA', qc_oleh: GP.me.email, qc_at: new Date().toISOString() }).eq('id', id);
  if (r.error) return alert('❌ ' + r.error.message);
  GP.log('QC HASIL DIECUT', `${GP.me.email} selesai QC ${d.no_dokumen}`); GP.toast('QC selesai, menunggu diterima Admin', 'success'); await muatDocs();
};
NS.terima = async function(id) {
  const d = await ambil(id); const its = d.serah_hasil_item || [];
  const hasil = its.map(i => ({ i, q: parseInt(document.getElementById('qt' + i.id).value) || 0 }));
  const sebelumnya = {}; docs.filter(x => x.status === 'DITERIMA').forEach(x => (x.serah_hasil_item || []).forEach(i => { sebelumnya[i.detail_id] = (sebelumnya[i.detail_id] || 0) + Number(i.qty_diterima || 0); }));
  const { data: dets } = await sb.from('pi_detail').select('id,qty_pi').in('id', its.map(i => i.detail_id));
  const qpi = {}; (dets || []).forEach(x => { qpi[x.id] = Number(x.qty_pi || 0); });
  const lebih = hasil.filter(x => x.q > 0 && (sebelumnya[x.i.detail_id] || 0) + x.q > qpi[x.i.detail_id]).map(x => `• ${x.i.jenis}: total ${fmt((sebelumnya[x.i.detail_id] || 0) + x.q)} dari PI ${fmt(qpi[x.i.detail_id])} (lebih ${fmt((sebelumnya[x.i.detail_id] || 0) + x.q - qpi[x.i.detail_id])})`);
  const beda = hasil.filter(x => x.q !== (x.i.perlu_qc ? (x.i.qty_qc_ok != null ? x.i.qty_qc_ok : x.i.qty_serah) : x.i.qty_serah));
  let msg = `Terima ${hasil.filter(x => x.q > 0).length} item dan masukkan ke stok gudang?`;
  if (beda.length) msg += `\n\n⚠️ Jumlah berbeda dari yang diserahkan/QC:\n` + beda.map(x => `• ${x.i.jenis}: diterima ${fmt(x.q)}`).join('\n');
  if (lebih.length) msg += `\n\nℹ️ Melebihi Qty PI (tetap boleh):\n` + lebih.join('\n');
  if (!confirm(msg)) return;
  const tgl = new Date().toISOString().slice(0, 10);
  const masuk = hasil.filter(x => x.q > 0).map(x => ({ detail_id: x.i.detail_id, tanggal: tgl, qty: x.q, keterangan: `Hasil diecut ${d.no_dokumen} (Leader Mesin → Admin)`, created_by: GP.me.email }));
  let bm = [];
  if (masuk.length) { const r = await sb.from('barang_masuk').insert(masuk).select(); if (r.error) return alert('❌ Gagal memasukkan stok: ' + r.error.message); bm = r.data || []; }
  for (const x of hasil) {
    const b = bm.find(m => m.detail_id === x.i.detail_id && Number(m.qty) === x.q);
    const r = await sb.from('serah_hasil_item').update({ qty_diterima: x.q, barang_masuk_id: b ? b.id : null }).eq('id', x.i.id); if (r.error) return alert('❌ ' + r.error.message);
  }
  const r = await sb.from('serah_hasil').update({ status: 'DITERIMA', diterima_oleh: GP.me.email, diterima_at: new Date().toISOString() }).eq('id', id);
  if (r.error) return alert('❌ ' + r.error.message);
  GP.log('TERIMA HASIL DIECUT', `${GP.me.email} menerima ${d.no_dokumen}: ` + hasil.map(x => x.q).join('/')); GP.toast('Diterima dan masuk stok gudang. Nota bisa dicetak di daftar "Sudah diterima".', 'success'); fStatus = 'DITERIMA'; const fs = document.getElementById('hsFilter'); if (fs) fs.value = 'DITERIMA'; await muatDocs();
};
NS.batal = async function(id) {
  const d = await ambil(id); if (!confirm('Batalkan ' + d.no_dokumen + '? Belum ada stok yang masuk.')) return;
  const r = await sb.from('serah_hasil').update({ status: 'DIBATALKAN' }).eq('id', id); if (r.error) return alert('❌ ' + r.error.message);
  await muatDocs();
};
NS.cetak = async function(id) {
  const d = await ambil(id); const its = (d.serah_hasil_item || []).slice().sort((a, b) => a.id - b.id);
  const jawab = prompt('Keterangan yang mau dicetak di nota (boleh dikosongkan):', d.catatan || ''); if (jawab === null) return;
  if (jawab.trim() !== (d.catatan || '')) { const r = await sb.from('serah_hasil').update({ catatan: jawab.trim() || null }).eq('id', id); if (!r.error) { d.catatan = jawab.trim() || null; gambarDocs(); } }
  const adaQc = its.some(i => i.perlu_qc);
  const baris = its.map((i, k) => `<tr><td>${k + 1}</td><td style="text-align:left">${esc(i.jenis)}</td><td><b>${fmt(i.qty_serah)}</b></td>${adaQc ? `<td>${i.perlu_qc ? (i.qty_qc_ok != null ? 'OK ' + fmt(i.qty_qc_ok) + ' / NG ' + fmt(i.qty_qc_ng) : 'perlu QC') : '—'}</td>` : ''}<td>${i.qty_diterima != null ? '<b>' + fmt(i.qty_diterima) + '</b>' : ''}</td><td class="isi"></td></tr>`).join('');
  const total = its.reduce((a, i) => a + Number(i.qty_serah || 0), 0);
  const hal = (lbl, warna) => `<div class="hal"><div class="hd"><div><b class="firma">THE ROLLING PAPER COMPANY</b><br><span class="jdl">SERAH TERIMA HASIL DIECUT</span></div><div class="lbl" style="color:${warna};border-color:${warna}">${lbl}</div></div>
    <div class="nomor">No. ${esc(d.no_dokumen)} &nbsp;|&nbsp; ${esc(fWaktu(d.diserahkan_at))}</div>
    <div class="info"><b>PI:</b> ${esc(d.no_pi)} &nbsp;&nbsp; <b>Brand:</b> ${esc(d.brand)}${d.mesin ? ' &nbsp;&nbsp; <b>Mesin:</b> ' + esc(d.mesin) : ''}</div>
    <table class="items"><thead><tr><th>No</th><th>Item</th><th>Diserahkan (pcs)</th>${adaQc ? '<th>Hasil QC</th>' : ''}<th>Diterima Admin</th><th>Catatan</th></tr></thead><tbody>${baris}</tbody><tfoot><tr><td colspan="2" style="text-align:right"><b>Total</b></td><td><b>${fmt(total)}</b></td><td colspan="${adaQc ? 3 : 2}"></td></tr></tfoot></table>
    ${d.catatan ? '<div class="info"><b>Catatan:</b> ' + esc(d.catatan) + '</div>' : ''}
    <div class="ttd"><div class="tb"><div>Diserahkan (Leader Mesin)</div><div style="height:42px"></div><div class="tl"></div><b>${esc(nm(d.diserahkan_oleh))}</b></div>${adaQc ? `<div class="tb"><div>Diperiksa (Leader QC)</div><div style="height:42px"></div><div class="tl"></div><b>${esc(nm(d.qc_oleh))}</b></div>` : ''}<div class="tb"><div>Diterima (Admin Gudang)</div><div style="height:42px"></div><div class="tl"></div><b>${esc(nm(d.diterima_oleh))}</b></div></div>
    <div class="ft">Dicetak ${new Date().toLocaleString('id-ID')}</div></div>`;
  const css = `@page{size:A4 portrait;margin:7mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#000}.lembar{width:100%;max-width:196mm;height:283mm;display:flex;flex-direction:column}.hal{flex:1;padding:4mm 2mm;overflow:hidden}.hal+.hal{border-top:1.5px dashed #888}.hd{display:flex;justify-content:space-between;border-bottom:2px solid #1e3a8a;padding-bottom:3px}.firma{font-size:14px;color:#1e3a8a;letter-spacing:1px}.jdl{font-size:11px;font-weight:bold}.lbl{font-weight:bold;border:2px solid;padding:2px 8px;border-radius:5px;font-size:10px;height:fit-content}.nomor{background:#f1f5f9;text-align:center;font-weight:bold;padding:2px;margin:4px 0;font-size:10px}.info{border:1px solid #999;padding:3px 6px;margin-bottom:4px}table.items{width:100%;border-collapse:collapse}table.items th,table.items td{border:1px solid #999;padding:2px 4px;text-align:center}table.items th{background:#1e3a8a;color:#fff;font-size:9px}table.items td.isi{width:15%}table.items tfoot td{background:#fef9c3}.ttd{display:flex;justify-content:space-around;text-align:center;font-size:10px;margin-top:6px}.tb{width:30%}.tl{border-top:1px solid #000;margin-bottom:2px}.ft{margin-top:4px;text-align:center;font-size:8px;color:#555}`;
  const w = window.open('', '_blank'); if (!w) return alert('Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(d.no_dokumen)}</title><style>${css}</style></head><body><div class="lembar">${hal('ASLI - arsip Gudang', '#1e3a8a')}${hal('SALINAN - Leader Mesin', '#b45309')}</div></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 300);
};
})();
