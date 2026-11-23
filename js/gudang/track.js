/* Modul Gudang: track */
(function(){
const GP = window.GP;
const NS = GP.mods.track = {};
NS.mount = async function(host){
  host.innerHTML = '<div class="gm-masuk"><div id="gpMain"><div class="card"><div class="card-title"><span>🧭 Tracking Material</span>' +
    '<button class="btn-export" onclick="GP.mods.masuk.loadTracking()" style="width:auto;padding:6px 12px;font-size:12px;">🔄 Refresh</button></div>' +
    '<div class="info-text" style="margin-bottom:8px">Posisi tiap material: Diterima → QC1 → Diecut → QC2 → Kirim. Hanya untuk pemantauan; stok tetap dari Barang Masuk/Keluar.</div>' +
    '<div id="trackList" style="overflow-x:auto;"><div class="info-text">⏳ Memuat...</div></div></div></div>' +
    '<div id="detailModal" class="modal"><div class="modal-content"><h3 id="detailTitle">📋 Detail</h3><div id="detailContent"></div><div class="modal-footer"><button class="btn-cancel" onclick="GP.mods.masuk.closeModal(\'detailModal\')">Tutup</button></div></div></div></div>';
  await GP.mods.masuk.loadTracking();
};
})();
