/* Modul Gudang: sp */
(function(){
const sb = window.sbG, GP = window.GP;
const NS = GP.mods.sp = {};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('id-ID');
let rows = [];
const CSS = `<style>
#gpHost .gm-sp .card{background:#fff;border-radius:12px;padding:18px;margin-bottom:15px;box-shadow:0 1px 3px rgba(0,0,0,.1)}
#gpHost .gm-sp .ct{font-size:16px;font-weight:600;margin-bottom:12px;color:#1e293b;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
#gpHost .gm-sp input,#gpHost .gm-sp select{padding:9px;border:1px solid #ddd;border-radius:8px;font-size:14px;width:100%;margin:3px 0}
#gpHost .gm-sp .b{border:0;border-radius:8px;padding:7px 12px;cursor:pointer;color:#fff;background:#3b82f6;font-size:13px;width:auto;margin:2px}
#gpHost .gm-sp .g{background:#10b981}#gpHost .gm-sp .r{background:#ef4444}#gpHost .gm-sp .o{background:#f59e0b}#gpHost .gm-sp .x{background:#64748b}
#gpHost .gm-sp table{width:100%;border-collapse:collapse}#gpHost .gm-sp th,#gpHost .gm-sp td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:left}
#gpHost .gm-sp th{background:#f8fafc;color:#64748b;font-weight:500}
#gpHost .gm-sp .row{display:flex;gap:8px;flex-wrap:wrap}#gpHost .gm-sp .row>div{flex:1;min-width:150px}
#gpHost .gm-sp .low{background:#fef2f2}#gpHost .gm-sp .tag{display:inline-block;border-radius:10px;padding:1px 8px;font-size:11px;color:#fff}
#gpHost .gm-sp .gen{background:#f59e0b}#gpHost .gm-sp .hab{background:#ef4444}#gpHost .gm-sp .mn{background:#f97316}
#gpHost .gm-sp .mdl{position:fixed;inset:0;background:rgba(0,0,0,.5);display:none;align-items:center;justify-content:center;z-index:3000;padding:12px}
#gpHost .gm-sp .mdl>div{background:#fff;border-radius:12px;padding:18px;width:100%;max-width:460px;max-height:90vh;overflow:auto}
#gpHost .gm-sp label{font-size:13px;color:#475569;display:block;margin-top:6px}
#gpHost .gm-sp .chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}
#gpHost .gm-sp .chip{flex:1;min-width:90px;border-radius:10px;padding:8px 10px;background:#f1f5f9;text-align:center;font-size:12px;color:#475569}
#gpHost .gm-sp .chip b{display:block;font-size:20px;color:#1e293b}
#gpHost .gm-sp .chip.w{background:#fff7ed}#gpHost .gm-sp .chip.w b{color:#c2410c}#gpHost .gm-sp .chip.d{background:#fef2f2}#gpHost .gm-sp .chip.d b{color:#b91c1c}
#gpHost .gm-sp .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
#gpHost .gm-sp .it{border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#fff;border-left:6px solid #10b981}
#gpHost .gm-sp .it.mn{border-left-color:#f97316;background:#fffaf5}#gpHost .gm-sp .it.hb{border-left-color:#ef4444;background:#fff5f5}
#gpHost .gm-sp .it h4{font-size:16px;color:#0f172a;margin:0 0 2px;line-height:1.3}
#gpHost .gm-sp .it .sub{font-size:13px;color:#64748b;line-height:1.5}
#gpHost .gm-sp .it .top{display:flex;justify-content:space-between;align-items:center;gap:10px}
#gpHost .gm-sp .it .big{text-align:right;min-width:80px}#gpHost .gm-sp .it .big b{font-size:28px;line-height:1;color:#15803d;display:block}
#gpHost .gm-sp .it.mn .big b{color:#c2410c}#gpHost .gm-sp .it.hb .big b{color:#b91c1c}#gpHost .gm-sp .it .big span{font-size:11px;color:#64748b}
#gpHost .gm-sp .it .act{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
#gpHost .gm-sp .it .act .b{padding:12px 8px;font-size:14px;margin:0;width:100%}
#gpHost .gm-sp .it .act2{display:flex;gap:14px;margin-top:10px;font-size:13px}
#gpHost .gm-sp .lk{background:none;border:0;color:#2563eb;cursor:pointer;font-size:13px;padding:4px 0;width:auto}
#gpHost .gm-sp .lk.r{color:#dc2626;background:none}
#gpHost .gm-sp input,#gpHost .gm-sp select{font-size:16px;padding:11px}
#gpHost .gm-sp #spQ{position:sticky;top:0;z-index:5}
@media(max-width:600px){#gpHost .gm-sp .chip{min-width:44%}#gpHost .gm-sp .card{padding:12px}#gpHost .gm-sp .grid{grid-template-columns:1fr}#gpHost .gm-sp .mdl{align-items:flex-end;padding:0}#gpHost .gm-sp .mdl>div{border-radius:16px 16px 0 0;max-width:none;max-height:92vh}#gpHost .gm-sp .ct .b{padding:10px 14px;font-size:14px}}

#gpHost .gm-sp #spQ,#gpHost .gm-sp #spF{display:block;width:100%;margin:6px 0}#gpHost .gm-sp .mdl input{display:block;width:100%}#gpHost .gm-sp .mdl .b{padding:12px 18px;font-size:15px}#gpHost .gm-sp .ct .b{padding:10px 14px;font-size:14px}</style>`;
NS.mount = async function(host){
  host.innerHTML = CSS + '<div class="gm-sp"><div class="card"><div class="ct"><span>📦 Stok Pendukung</span><span><button class="b g" id="spAdd">➕ Tambah Stok Baru</button> <button class="b x" id="spCsv">📎 Export</button></span></div>' +
   '<div class="row" style="gap:0 8px"><div style="min-width:220px"><input id="spQ" placeholder="🔍 Cari brand, jenis, size, lokasi..."></div><div><select id="spF"><option value="">Tampilkan semua</option><option value="low">Hampir habis</option><option value="habis">Habis (0)</option><option value="gen">Stok umum (GENERAL)</option></select></div></div>' +
   '<div id="spInfo" style="font-size:13px;color:#475569;margin:8px 0"></div><div id="spList" style="overflow-x:auto"></div></div>' +
   '<div class="mdl" id="spM"><div id="spMc"></div></div></div>';
  document.getElementById('spQ').oninput = render; document.getElementById('spF').onchange = render;
  document.getElementById('spAdd').onclick = () => form(null); document.getElementById('spCsv').onclick = exportCsv;
  await load();
};
async function load(){
  const { data, error } = await sb.from('stok_pendukung').select('*').order('brand').order('jenis');
  if (error) { document.getElementById('spList').innerHTML = '<div style="color:#b91c1c">❌ ' + esc(error.message) + '</div>'; return; }
  rows = data || []; render();
}
function filtered(){
  const q = document.getElementById('spQ').value.toLowerCase().trim(), f = document.getElementById('spF').value;
  return rows.filter(r => (!q || [r.brand, r.jenis, r.size, r.papers, r.lokasi].join(' ').toLowerCase().includes(q)) &&
    (!f || (f === 'low' && Number(r.stok) <= Number(r.stok_minimum || 0) && Number(r.stok) > 0) || (f === 'habis' && Number(r.stok) <= 0) || (f === 'gen' && r.brand === 'GENERAL')));
}
function render(){
  const L = filtered(), tot = L.reduce((a, r) => a + Number(r.stok || 0), 0);
  const habis = rows.filter(r => Number(r.stok) <= 0).length, low = rows.filter(r => Number(r.stok) > 0 && Number(r.stok) <= Number(r.stok_minimum || 0)).length;
  document.getElementById('spInfo').innerHTML = `<div class="chips"><div class="chip"><b>${L.length}</b>item tampil</div><div class="chip"><b>${fmt(tot)}</b>total stok</div><div class="chip w"><b>${low}</b>hampir habis</div><div class="chip d"><b>${habis}</b>habis</div></div>`;
  if (!L.length) { document.getElementById('spList').innerHTML = '<div style="padding:16px;color:#64748b;text-align:center">Tidak ada stok pendukung yang cocok.<br>Tekan ➕ Tambah Stok Baru untuk menambah.</div>'; return; }
  document.getElementById('spList').innerHTML = '<div class="grid">' + L.map(r => {
    const s = Number(r.stok || 0), m = Number(r.stok_minimum || 0), cls = s <= 0 ? 'hb' : s <= m ? 'mn' : '';
    const badge = s <= 0 ? '<span class="tag hab">HABIS</span>' : s <= m ? '<span class="tag mn">HAMPIR HABIS</span>' : '';
    const det = [r.size ? 'Size: ' + esc(r.size) : '', r.papers ? 'Papers: ' + esc(r.papers) : '', r.lokasi ? '📍 ' + esc(r.lokasi) : ''].filter(Boolean).join('<br>');
    return `<div class="it ${cls}"><div class="top"><div><h4>${esc(r.jenis)}</h4><div class="sub"><b>${esc(r.brand || '-')}</b>${r.brand === 'GENERAL' ? ' <span class="tag gen">UMUM</span>' : ''} ${badge}</div></div><div class="big"><b>${fmt(s)}</b><span>stok · min ${fmt(m)}</span></div></div>` +
      (det ? `<div class="sub" style="margin-top:8px">${det}</div>` : '') +
      `<div class="act"><button class="b g" onclick="GP.mods.sp.mutasi(${r.id},'MASUK')">＋ Tambah</button><button class="b o" onclick="GP.mods.sp.mutasi(${r.id},'KELUAR')">－ Kurangi</button></div>` +
      `<div class="act2"><button class="lk" onclick="GP.mods.sp.histori(${r.id})">🕘 Histori</button><button class="lk" onclick="GP.mods.sp.edit(${r.id})">✏️ Edit</button><button class="lk r" onclick="GP.mods.sp.hapus(${r.id})" style="margin-left:auto">🗑️ Hapus</button></div></div>`; }).join('') + '</div>';
}
function open_(html){ document.getElementById('spMc').innerHTML = html; document.getElementById('spM').style.display = 'flex'; }
NS.tutup = function(){ document.getElementById('spM').style.display = 'none'; };
function form(r){
  open_(`<h3>${r ? '✏️ Edit' : '➕ Tambah'} Stok Pendukung</h3><label>Brand (kosongkan/GENERAL untuk stok umum)</label><input id="fBrand" value="${esc(r ? r.brand : '')}"><label>Jenis *</label><input id="fJenis" value="${esc(r ? r.jenis : '')}" placeholder="mis. FILTER KRAFT">` +
   `<div class="row"><div><label>Size</label><input id="fSize" value="${esc(r ? r.size : '')}"></div><div><label>Papers</label><input id="fPapers" value="${esc(r ? r.papers : '')}"></div></div>` +
   `<div class="row"><div><label>${r ? 'Stok (ubah via ＋/－ agar tercatat)' : 'Stok awal'}</label><input id="fStok" type="number" min="0" value="${r ? r.stok : 0}" ${r ? 'disabled' : ''}></div><div><label>Stok minimum</label><input id="fMin" type="number" min="0" value="${r ? (r.stok_minimum || 0) : 0}"></div></div>` +
   `<label>Lokasi / Box</label><input id="fLok" value="${esc(r ? r.lokasi : '')}"><div style="text-align:right;margin-top:12px"><button class="b x" onclick="GP.mods.sp.tutup()">Batal</button><button class="b g" onclick="GP.mods.sp.simpan(${r ? r.id : 'null'})">Simpan</button></div>`);
}
NS.edit = id => form(rows.find(x => x.id === id));
NS.simpan = async function(id){
  const g = i => document.getElementById(i).value.trim();
  const jenis = g('fJenis').toUpperCase(); if (!jenis) { alert('Jenis wajib diisi'); return; }
  const brand = (g('fBrand') || 'GENERAL').toUpperCase();
  const d = { brand, jenis, size: g('fSize') || null, papers: g('fPapers') || null, stok_minimum: parseInt(g('fMin')) || 0, lokasi: g('fLok') || null };
  if (id) { const { error } = await sb.from('stok_pendukung').update(d).eq('id', id); if (error) { alert('❌ ' + error.message); return; } GP.log('EDIT STOK PENDUKUNG', `${brand} - ${jenis}`); }
  else {
    const stok = parseInt(g('fStok')) || 0;
    const dup = rows.find(x => x.brand === brand && x.jenis === jenis && (x.size || '') === (d.size || '') && (x.papers || '') === (d.papers || ''));
    if (dup && !confirm('Stok dengan brand/jenis/size/papers yang sama sudah ada. Tetap buat baris baru?')) return;
    const { data, error } = await sb.from('stok_pendukung').insert([{ ...d, stok }]).select(); if (error) { alert('❌ ' + error.message); return; }
    if (stok > 0 && data && data[0]) await sb.from('histori_stok_pendukung').insert([{ stok_pendukung_id: data[0].id, jenis: 'MASUK', qty: stok, keterangan: 'Stok awal', created_by: GP.me.email }]);
    GP.log('TAMBAH STOK PENDUKUNG', `${brand} - ${jenis} (${stok})`);
  }
  NS.tutup(); GP.toast('Tersimpan', 'success'); await load();
};
NS.mutasi = function(id, jenis){
  const r = rows.find(x => x.id === id); const masuk = jenis === 'MASUK';
  open_(`<h3>${masuk ? '＋ Tambah' : '－ Kurangi'} Stok</h3><div style="font-size:13px;color:#475569">${esc(r.brand)} - ${esc(r.jenis)} ${esc(r.size || '')} ${esc(r.papers || '')}<br>Stok sekarang: <b>${fmt(r.stok)}</b></div><label>Jumlah</label><input id="mQty" type="number" min="1"><label>Keterangan</label><input id="mKet" placeholder="${masuk ? 'mis. sisa produksi, pembelian' : 'mis. dipakai untuk ...'}">` +
   `<div style="text-align:right;margin-top:12px"><button class="b x" onclick="GP.mods.sp.tutup()">Batal</button><button class="b ${masuk ? 'g' : 'o'}" onclick="GP.mods.sp.simpanMutasi(${id},'${jenis}')">Simpan</button></div>`);
};
NS.simpanMutasi = async function(id, jenis){
  const r = rows.find(x => x.id === id), qty = parseInt(document.getElementById('mQty').value), ket = document.getElementById('mKet').value.trim();
  if (!qty || qty <= 0) { alert('Jumlah tidak valid'); return; }
  const cur = (await sb.from('stok_pendukung').select('stok').eq('id', id).single()).data;
  const baru = Number(cur ? cur.stok : r.stok) + (jenis === 'MASUK' ? qty : -qty);
  if (baru < 0) { alert('Stok tidak mencukupi (stok ' + fmt(cur ? cur.stok : r.stok) + ')'); return; }
  const { error } = await sb.from('stok_pendukung').update({ stok: baru }).eq('id', id); if (error) { alert('❌ ' + error.message); return; }
  await sb.from('histori_stok_pendukung').insert([{ stok_pendukung_id: id, jenis, qty, keterangan: ket || (jenis === 'MASUK' ? 'Tambah manual' : 'Kurang manual'), created_by: GP.me.email }]);
  GP.log(jenis === 'MASUK' ? 'STOK PENDUKUNG MASUK' : 'STOK PENDUKUNG KELUAR', `${r.brand} - ${r.jenis}: ${qty} → ${baru}`);
  NS.tutup(); GP.toast('Stok diperbarui', 'success'); await load();
};
NS.histori = async function(id){
  const r = rows.find(x => x.id === id);
  const { data } = await sb.from('histori_stok_pendukung').select('*').eq('stok_pendukung_id', id).order('id', { ascending: false }).limit(100);
  open_(`<h3>🕘 Histori</h3><div style="font-size:13px;color:#475569;margin-bottom:8px">${esc(r.brand)} - ${esc(r.jenis)} · stok ${fmt(r.stok)}</div>` + ((data || []).length ? '<table><thead><tr><th>Waktu</th><th></th><th>Qty</th><th>Keterangan</th></tr></thead><tbody>' + data.map(h => `<tr><td>${esc(String(h.created_at || '').slice(0, 16).replace('T', ' '))}</td><td><span class="tag" style="background:${h.jenis === 'MASUK' ? '#10b981' : '#f59e0b'}">${esc(h.jenis)}</span></td><td>${fmt(h.qty)}</td><td>${esc(h.keterangan)}<br><span style="color:#94a3b8;font-size:11px">${esc(String(h.created_by || '').split('@')[0])}</span></td></tr>`).join('') + '</tbody></table>' : '<div style="color:#64748b">Belum ada histori.</div>') + '<div style="text-align:right;margin-top:12px"><button class="b x" onclick="GP.mods.sp.tutup()">Tutup</button></div>');
};
NS.hapus = async function(id){
  const r = rows.find(x => x.id === id);
  if (!confirm(`Hapus stok "${r.brand} - ${r.jenis}" (stok ${fmt(r.stok)}) beserta historinya?`)) return;
  await sb.from('histori_stok_pendukung').delete().eq('stok_pendukung_id', id);
  const { error } = await sb.from('stok_pendukung').delete().eq('id', id); if (error) { alert('❌ ' + error.message); return; }
  GP.log('HAPUS STOK PENDUKUNG', `${r.brand} - ${r.jenis}`); await load();
};
function exportCsv(){
  const L = filtered(); if (!L.length) { alert('Tidak ada data'); return; }
  const c = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const csv = ['Brand,Jenis,Size,Papers,Stok,Minimum,Lokasi'].concat(L.map(r => [r.brand, r.jenis, r.size, r.papers, r.stok, r.stok_minimum, r.lokasi].map(c).join(','))).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv' })); a.download = 'Stok_Pendukung_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
}
})();
