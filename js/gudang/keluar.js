/* Modul Gudang: keluar */
(function(){
const sb = window.sbG, GP = window.GP;
const NS = GP.mods.keluar = {};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('id-ID');
let items = [];
NS.mount = async function(host){
  host.innerHTML = '<div class="gm-klr"><div class="card"><div class="card-title">📤 Barang Keluar</div>' +
    '<label>No PI</label><select id="klrPi"><option value="">-- Pilih No PI --</option></select>' +
    '<label>Item</label><select id="klrItem"><option value="">-- Pilih Item --</option></select>' +
    '<div id="klrInfo" style="margin:8px 0;font-size:13px;color:#475569"></div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><div style="flex:1;min-width:140px"><label>Tanggal</label><input type="date" id="klrTgl"></div><div style="flex:1;min-width:140px"><label>Jumlah (pcs)</label><input type="number" id="klrQty" min="1"></div></div>' +
    '<label>Keterangan / Tujuan</label><input id="klrKet" placeholder="mis. kirim ke customer, sample, dll">' +
    '<button class="btn-primary" id="klrSave" style="margin-top:12px">Simpan Barang Keluar</button><div id="klrMsg" style="margin-top:8px;font-size:13px"></div></div>' +
    '<div class="card"><div class="card-title">Riwayat Barang Keluar</div><div id="klrList" style="overflow-x:auto"></div></div></div>';
  document.getElementById('klrTgl').value = new Date().toISOString().split('T')[0];
  document.getElementById('klrPi').onchange = async () => { await loadItems(); await loadHist(); };
  document.getElementById('klrItem').onchange = showInfo;
  document.getElementById('klrSave').onclick = save;
  const { data } = await sb.from('pi_header').select('id,no_pi,tanggal').eq('is_archived', false).order('id', { ascending: false });
  document.getElementById('klrPi').innerHTML += (data || []).map(p => `<option value="${p.id}">${esc(p.no_pi)}</option>`).join('');
  await loadHist();
};
async function stokMap(ids){
  const m = {}; ids.forEach(i => m[i] = 0);
  if (!ids.length) return m;
  const [a, b] = await Promise.all([sb.from('barang_masuk').select('detail_id,qty').in('detail_id', ids), sb.from('barang_keluar').select('detail_id,qty').in('detail_id', ids)]);
  (a.data || []).forEach(x => m[x.detail_id] += Number(x.qty || 0));
  (b.data || []).forEach(x => m[x.detail_id] -= Number(x.qty || 0));
  return m;
}
async function loadItems(){
  const pid = document.getElementById('klrPi').value, sel = document.getElementById('klrItem');
  sel.innerHTML = '<option value="">-- Pilih Item --</option>'; items = []; showInfo();
  if (!pid) return;
  const { data } = await sb.from('pi_detail').select('id,brand,jenis,paper,size,qty_pi').eq('pi_id', pid).order('id');
  const sm = await stokMap((data || []).map(d => d.id));
  items = (data || []).map(d => ({ ...d, stok: sm[d.id] || 0 }));
  sel.innerHTML += items.map(d => `<option value="${d.id}">${esc(d.brand)} | ${esc(d.jenis)} | ${esc(d.paper)} | ${esc(d.size)} — stok ${fmt(d.stok)}</option>`).join('');
}
function showInfo(){
  const d = items.find(x => String(x.id) === document.getElementById('klrItem').value);
  document.getElementById('klrInfo').innerHTML = d ? `Qty PI: <b>${fmt(d.qty_pi)}</b> · Stok gudang saat ini: <b style="color:${d.stok > 0 ? '#15803d' : '#b91c1c'}">${fmt(d.stok)}</b>` : '';
}
function msg(t, ok){ const m = document.getElementById('klrMsg'); m.style.color = ok ? '#15803d' : '#b91c1c'; m.textContent = t; }
async function save(){
  const d = items.find(x => String(x.id) === document.getElementById('klrItem').value);
  const qty = parseInt(document.getElementById('klrQty').value);
  if (!d) { msg('Pilih PI dan item dulu'); return; }
  if (!qty || qty <= 0) { msg('Jumlah tidak valid'); return; }
  const tgl = document.getElementById('klrTgl').value; if (!tgl) { msg('Isi tanggal'); return; }
  if (qty > d.stok && !confirm(`Stok hanya ${fmt(d.stok)}. Tetap keluarkan ${fmt(qty)}? (stok akan minus)`)) return;
  const { error } = await sb.from('barang_keluar').insert([{ detail_id: d.id, tanggal: tgl, qty, keterangan: document.getElementById('klrKet').value.trim(), created_by: GP.me.email }]);
  if (error) { msg('❌ ' + error.message); return; }
  GP.log('BARANG KELUAR', `${qty} ${d.brand} ${d.jenis} (${document.getElementById('klrPi').selectedOptions[0].textContent})`);
  GP.toast('Barang keluar tersimpan', 'success');
  document.getElementById('klrQty').value = ''; document.getElementById('klrKet').value = ''; msg('');
  await loadItems(); document.getElementById('klrItem').value = String(d.id); showInfo(); await loadHist();
}
async function loadHist(){
  const el = document.getElementById('klrList');
  const pid = document.getElementById('klrPi').value;
  if (!pid) { el.innerHTML = '<div style="padding:10px;color:#64748b">Pilih No PI untuk melihat riwayat barang keluarnya.</div>'; return; }
  const ids = ((await sb.from('pi_detail').select('id').eq('pi_id', pid)).data || []).map(x => x.id);
  if (!ids.length) { el.innerHTML = '<div style="padding:10px;color:#64748b">PI ini belum punya item.</div>'; return; }
  const { data, error } = await sb.from('barang_keluar').select('*').in('detail_id', ids).order('id', { ascending: false }).limit(200);
  if (error) { el.innerHTML = '<div style="color:#b91c1c">❌ ' + esc(error.message) + '</div>'; return; }
  const rows = data || [];
  if (!rows.length) { el.innerHTML = '<div style="padding:10px;color:#64748b">Belum ada barang keluar untuk PI ini.</div>'; return; }
  const dids = [...new Set(rows.map(r => r.detail_id))];
  const det = (await sb.from('pi_detail').select('id,brand,jenis,pi_id').in('id', dids)).data || [];
  const pids = [...new Set(det.map(d => d.pi_id))];
  const hd = pids.length ? (await sb.from('pi_header').select('id,no_pi').in('id', pids)).data || [] : [];
  const dm = {}; det.forEach(d => dm[d.id] = d); const hm = {}; hd.forEach(h => hm[h.id] = h.no_pi);
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;border-bottom:2px solid #e2e8f0"><th style="padding:6px">Tanggal</th><th>PI</th><th>Barang</th><th>Qty</th><th>Keterangan</th><th>Oleh</th>' + (GP.me.admin ? '<th></th>' : '') + '</tr></thead><tbody>' +
    rows.map(r => { const d = dm[r.detail_id] || {}; return `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px">${esc(r.tanggal)}</td><td>${esc(hm[d.pi_id] || '-')}</td><td>${esc(d.brand)} ${esc(d.jenis)}</td><td>${fmt(r.qty)}</td><td>${esc(r.keterangan)}</td><td>${esc(String(r.created_by || '').split('@')[0])}</td>` + (GP.me.admin ? `<td style="white-space:nowrap"><button onclick="GP.mods.keluar.editar(${r.id})" title="Edit">✏️</button> <button onclick="GP.mods.keluar.hapus(${r.id})" title="Hapus">🗑️</button></td>` : '') + '</tr>'; }).join('') + '</tbody></table>';
}
NS.editar = async function(id){
  const { data: r } = await sb.from('barang_keluar').select('*').eq('id', id).single();
  if (!r) { alert('Data tidak ditemukan'); return; }
  const auto = String(r.keterangan || '').startsWith('NG Diecut');
  const tgl = prompt('Tanggal (YYYY-MM-DD):', r.tanggal); if (tgl === null) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl.trim())) { alert('Format tanggal salah'); return; }
  let qty = r.qty;
  if (!auto) { const q = prompt('Jumlah (pcs):', r.qty); if (q === null) return; qty = parseInt(q); if (!qty || qty <= 0) { alert('Jumlah tidak valid'); return; } }
  const ket = prompt('Keterangan:', r.keterangan || ''); if (ket === null) return;
  if (qty !== r.qty) {
    const sm = await stokMap([r.detail_id]); const sisa = (sm[r.detail_id] || 0) + Number(r.qty) - qty;
    if (sisa < 0 && !confirm(`Stok akan menjadi ${fmt(sisa)} (minus). Tetap simpan?`)) return;
  }
  const { error } = await sb.from('barang_keluar').update({ tanggal: tgl.trim(), qty, keterangan: ket.trim() }).eq('id', id);
  if (error) { alert('❌ ' + error.message); return; }
  GP.log('EDIT BARANG KELUAR', `#${id} qty ${r.qty}→${qty}, tgl ${r.tanggal}→${tgl.trim()}`);
  GP.toast('Perubahan tersimpan', 'success');
  await loadItems(); await loadHist();
};
NS.hapus = async function(id){
  if (!confirm('Hapus catatan barang keluar ini? Stok akan bertambah kembali.')) return;
  const { error } = await sb.from('barang_keluar').delete().eq('id', id);
  if (error) { alert('❌ ' + error.message); return; }
  GP.log('HAPUS BARANG KELUAR', '#' + id);
  await loadItems(); await loadHist();
};
})();
