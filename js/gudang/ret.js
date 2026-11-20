/* Modul Gudang: ret */
(function(){
const sb = window.sbG, GP = window.GP;
const NS = GP.mods.ret = {};
let rows = [], mine = [];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('id-ID');
const WARNA = { PENDING:'#b45309', DIPROSES:'#1d4ed8', SELESAI:'#15803d', DITOLAK:'#b91c1c' };
NS.mount = async function(host){
  const admin = !!GP.me.admin;
  host.innerHTML = '<div class="gm-ret">' +
    ('<div class="card"><div class="card-title">↩️ Ajukan Return</div>' +
      '<label>Barang yang pernah diserahkan</label><select id="retPerm"></select>' +
      '<label>Jenis masalah</label><select id="retTipe"><option value="NG">NG / barang cacat</option><option value="KURANG">Kekurangan jumlah pengiriman</option></select>' +
      '<label>Jumlah (pcs)</label><input type="number" id="retQty" min="1" placeholder="0">' +
      '<label>Keterangan</label><textarea id="retNote" rows="2" placeholder="Jelaskan masalahnya"></textarea>' +
      '<button class="btn-primary" id="retSave" style="margin-top:12px">Kirim Pengajuan Return</button><div id="retMsg" style="margin-top:8px;font-size:13px"></div></div>') +
    '<div class="card"><div class="card-title">' + (admin ? '📋 Pengajuan Return' : '📋 Pengajuan Saya') + '</div><div id="retList" style="overflow-x:auto"></div></div></div>';
  host.querySelector('#retSave').onclick = save; await loadMine();
  await load();
};
const hk = iso => { const d = new Date(iso); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
function bstLabel(r){ const g = mine.filter(x => x.no_pi === r.no_pi && x.requested_by === r.requested_by && x.processed_at && hk(x.processed_at) === hk(r.processed_at)); const mn = Math.min(...g.map(x => x.id), r.id); return 'BST-' + hk(r.processed_at) + '-' + String(mn).padStart(4,'0'); }
async function loadMine(){
  let mq = sb.from('permintaan_produksi').select('id,no_pi,brand,jenis,qty_diberikan,processed_at,requested_by');
  if (!GP.me.admin) mq = mq.eq('requested_by', GP.me.email);
  const { data } = await mq.eq('status','SELESAI').order('processed_at',{ascending:false}).limit(100);
  mine = data || [];
  const el = document.getElementById('retPerm');
  el.innerHTML = '<option value="">-- Pilih --</option>' + mine.map(r => `<option value="${r.id}">${bstLabel(r)} · ${esc(r.no_pi)} - ${esc(r.brand)} ${esc(r.jenis)} (diserahkan ${fmt(r.qty_diberikan)})</option>`).join('');
}
async function load(){
  let q = sb.from('return_produksi').select('*').order('created_at',{ascending:false}).limit(200);
  if (!GP.me.admin) q = q.eq('requested_by', GP.me.email);
  const { data, error } = await q;
  const el = document.getElementById('retList');
  if (error) { el.innerHTML = '<div style="color:#b91c1c">❌ ' + esc(error.message) + '<br><small>Tabel return_produksi belum dibuat? Jalankan SQL return di Supabase Gudang Pro.</small></div>'; return; }
  rows = data || [];
  if (!rows.length) { el.innerHTML = '<div style="color:#64748b;padding:10px">Belum ada pengajuan return.</div>'; return; }
  const admin = !!GP.me.admin;
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;border-bottom:2px solid #e2e8f0"><th style="padding:6px">Tanggal</th><th>Pengaju</th><th>PI / Barang</th><th>Jenis</th><th>Qty</th><th>Keterangan</th><th>Status</th>' + (admin ? '<th>Aksi</th>' : '') + '</tr></thead><tbody>' +
    rows.map(r => `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px">${new Date(r.created_at).toLocaleDateString('id-ID')}</td><td>${esc((r.requested_by||'').split('@')[0])}</td><td>${esc(r.no_pi)}<br>${esc(r.brand)} ${esc(r.jenis)}</td><td>${r.tipe === 'NG' ? 'NG' : 'Kurang'}</td><td>${fmt(r.qty)}</td><td>${esc(r.catatan)}${r.alasan_tolak ? '<br><i>Tolak: ' + esc(r.alasan_tolak) + '</i>' : ''}</td><td><b style="color:${WARNA[r.status]||'#475569'}">${esc(r.status)}</b></td>` +
      (admin ? `<td style="white-space:nowrap">${r.status === 'PENDING' ? `<button onclick="GP.mods.ret.aksi(${r.id},'DIPROSES')">▶ Proses</button> <button onclick="GP.mods.ret.aksi(${r.id},'DITOLAK')">❌ Tolak</button>` : r.status === 'DIPROSES' ? `<button onclick="GP.mods.ret.aksi(${r.id},'SELESAI')">✅ Selesai</button>` : ''}</td>` : '') + '</tr>').join('') + '</tbody></table>';
}
async function save(){
  const msg = document.getElementById('retMsg');
  const p = mine.find(x => String(x.id) === document.getElementById('retPerm').value);
  const qty = parseInt(document.getElementById('retQty').value);
  if (!p) { msg.style.color = '#b91c1c'; msg.textContent = 'Pilih barang dulu'; return; }
  if (!qty || qty <= 0) { msg.style.color = '#b91c1c'; msg.textContent = 'Jumlah tidak valid'; return; }
  const note = document.getElementById('retNote').value.trim();
  if (!note) { msg.style.color = '#b91c1c'; msg.textContent = 'Isi keterangan'; return; }
  const { error } = await sb.from('return_produksi').insert([{ permintaan_id: p.id, no_pi: p.no_pi, brand: p.brand, jenis: p.jenis, tipe: document.getElementById('retTipe').value, qty, catatan: note, status: 'PENDING', requested_by: GP.me.email }]);
  if (error) { msg.style.color = '#b91c1c'; msg.textContent = '❌ ' + error.message; return; }
  GP.log('AJUKAN RETURN', `${GP.me.email}: ${qty} ${p.brand} ${p.jenis} (${p.no_pi})`);
  GP.toast('Pengajuan return terkirim', 'success');
  document.getElementById('retQty').value = ''; document.getElementById('retNote').value = ''; msg.textContent = '';
  await load();
}
NS.aksi = async function(id, st){
  const upd = { status: st, processed_by: GP.me.email, processed_at: new Date().toISOString() };
  if (st === 'DITOLAK') { const a = prompt('Alasan menolak:'); if (!a) return; upd.alasan_tolak = a; }
  const { error } = await sb.from('return_produksi').update(upd).eq('id', id);
  if (error) { alert('Gagal: ' + error.message); return; }
  GP.log('RETURN ' + st, 'Return #' + id);
  await load();
};
})();
