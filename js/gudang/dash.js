/* Modul Gudang: dash */
(function(){
const sb = window.sbG, GP = window.GP;
function showToast(m,t){ GP.toast(m,t); }
function addLog(a,d){ return GP.log(a,d); }
const NS = GP.mods.dash = {};

        // ============================================================
        // KODE ASLI (TIDAK DIUBAH)
        // ============================================================
        let allData = [];
        let stokPendukung = [];



        async function loadData() {
            const container = document.getElementById('gpMain');
            container.innerHTML = '<div style="text-align:center;padding:20px">Loading...</div>';
            
            const { data: headers } = await sb.from('pi_header').select('*').order('created_at', { ascending: false });
            const { data: details } = await sb.from('pi_detail').select('*').order('pi_id', { ascending: false }).order('id', { ascending: true });
            const { data: masuk0 } = await sb.from('barang_masuk').select('*'); const masuk = (masuk0 || []).filter(x => !String(x.keterangan||'').startsWith('[📄'));
            const { data: keluar } = await sb.from('barang_keluar').select('*');
            
            const { data: stok } = await sb.from('stok_pendukung').select('*');
            stokPendukung = stok || [];
            
            allData = [];
            for (const detail of details) {
                const header = headers?.find(h => h.id === detail.pi_id);
                let totalMasuk = 0, totalKeluar = 0;
                if (masuk) masuk.forEach(m => { if (m.detail_id === detail.id) totalMasuk += m.qty; });
                if (keluar) keluar.forEach(k => { if (k.detail_id === detail.id) totalKeluar += k.qty; });
                
                let status = '', statusClass = '';
                if (totalKeluar >= detail.qty_pi) {
                    status = '✅ SELESAI';
                    statusClass = 'status-selesai';
                } else if (totalKeluar > 0) {
                    status = '🔄 PROSES (Kurang ' + (detail.qty_pi - totalKeluar) + ')';
                    statusClass = 'status-proses';
                } else {
                    status = '❌ BELUM';
                    statusClass = 'status-belum';
                }
                
                allData.push({
                    no_pi: header?.no_pi || '-',
                    brand: detail.brand,
                    jenis: detail.jenis,
                    paper: detail.paper || '-',
                    size: detail.size || '-',
                    qty_pi: detail.qty_pi,
                    masuk: totalMasuk,
                    keluar: totalKeluar,
                    stok: totalMasuk - totalKeluar,
                    status: status,
                    statusClass: statusClass,
                    archived: header?.is_archived || false,
                    detailId: detail.id
                });
            }
            
            renderDashboard();
        }
        
        function renderDashboard() {
            const stokMenipis = stokPendukung.filter(item => {
                const min = item.stok_minimum || 0;
                return min > 0 && item.stok <= min;
            });
            
            let warningHtml = '';
            if (stokMenipis.length > 0) {
                warningHtml = '<div class="warning-card"><strong>⚠️ PERINGATAN STOK MENIPIS</strong><div style="margin-top:8px">';
                for (const item of stokMenipis) {
                    const namaTampil = (item.brand && item.brand !== 'GENERAL')
                        ? (item.brand + ' - ' + (item.jenis || '-'))
                        : ('🟡 GENERAL - ' + (item.jenis || '-'));
                    warningHtml += '<div class="warning-item">📦 <b>' + namaTampil + '</b><br>' +
                        'Size: ' + (item.size || '-') + ' | Papers: ' + (item.papers || '-') + (item.lokasi ? ' | Box: ' + item.lokasi : '') + '<br>' +
                        'Stok: <b>' + item.stok + '</b> | Minimum: ' + (item.stok_minimum || 0) + '</div>';
                }
                warningHtml += '</div></div>';
            }
            
            let html = warningHtml;
            
            html += `
                <div class="card">
                    <div class="card-title">
                        <span>📋 STOK GUDANG & STATUS PI</span>
                        <button class="btn-export" onclick="GP.mods.dash.exportExcel()">📎 Export Excel</button>
                    </div>
                    <div class="filter-bar">
                        <input type="text" id="searchInput" placeholder="🔍 Cari No PI, Brand, Jenis..." onkeyup="GP.mods.dash.filterData()">
                        <select id="filterStatus" onchange="GP.mods.dash.filterData()">
                            <option value="all">Semua Status</option>
                            <option value="selesai">✅ Selesai</option>
                            <option value="proses">🔄 Proses</option>
                            <option value="belum">❌ Belum</option>
                        </select>
                        <label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#64748b;white-space:nowrap;background:#f8fafc;padding:8px 14px;border-radius:10px;border:1px solid #e2e8f0;cursor:pointer;">
                            <input type="checkbox" id="showArchived" onchange="GP.mods.dash.filterData()" style="width:auto;margin:0;cursor:pointer;">
                            📦 Tampilkan PI Arsip
                        </label>
                        <button onclick="GP.mods.dash.resetFilter()">Reset</button>
                    </div>
                    <div id="archiveInfo" style="font-size:12px;color:#94a3b8;margin-bottom:10px;"></div>
                    <div class="table-wrapper">
                        <table style="width:100%">
                            <thead>
                                <tr>
                                    <th>No PI</th><th>Brand</th><th>Jenis</th><th>Paper</th><th>Size</th>
                                    <th>Qty PI</th><th>Masuk</th><th>Keluar</th><th>Stok</th><th>Status</th><th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="tableBody"></tbody>
                        </table>
                    </div>
                </div>
            `;
            
            document.getElementById('gpMain').innerHTML = html;
            
            document.getElementById('searchInput').onkeyup = filterData;
            document.getElementById('filterStatus').onchange = filterData;
            
            filterData();
        }
        
        function filterData() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const statusFilter = document.getElementById('filterStatus').value;
            const showArchived = document.getElementById('showArchived').checked;
            
            let filtered = [...allData];
            
            const totalArsip = allData.filter(item => item.archived).length;
            
            if (!showArchived) {
                filtered = filtered.filter(item => !item.archived);
            }
            
            if (search) {
                filtered = filtered.filter(item => 
                    item.no_pi.toLowerCase().includes(search) ||
                    item.brand.toLowerCase().includes(search) ||
                    item.jenis.toLowerCase().includes(search)
                );
            }
            
            if (statusFilter !== 'all') {
                if (statusFilter === 'selesai') filtered = filtered.filter(item => item.keluar >= item.qty_pi);
                if (statusFilter === 'proses') filtered = filtered.filter(item => item.keluar > 0 && item.keluar < item.qty_pi);
                if (statusFilter === 'belum') filtered = filtered.filter(item => item.keluar === 0);
            }
            
            let rows = '';
            for (const item of filtered) {
                const arsipBadge = item.archived ? ' <span style="font-size:10px;background:#e2e8f0;color:#64748b;padding:2px 8px;border-radius:10px;margin-left:4px;">📦 ARSIP</span>' : '';
                const rowStyle = item.archived ? ' style="opacity:0.65;"' : '';
                const bisaTarik = item.keluar >= item.qty_pi && item.stok > 0;
                const aksiCell = bisaTarik
                    ? '<button onclick="GP.mods.dash.tarikDashboard(' + item.detailId + ')" style="background:#8b5cf6;padding:6px 10px;font-size:11px;width:auto;white-space:nowrap;">📦 Tarik</button>'
                    : '<span style="color:#cbd5e1;">-</span>';
                rows += '<tr' + rowStyle + '>' +
                    '<td><b>' + item.no_pi + '</b>' + arsipBadge + '</td>' +
                    '<td>' + item.brand + '</td>' +
                    '<td>' + item.jenis + '</td>' +
                    '<td>' + item.paper + '</td>' +
                    '<td>' + item.size + '</td>' +
                    '<td>' + item.qty_pi + '</td>' +
                    '<td>' + item.masuk + '</td>' +
                    '<td>' + item.keluar + '</td>' +
                    '<td><b>' + item.stok + '</b></td>' +
                    '<td><span class="' + item.statusClass + '">' + item.status + '</span></td>' +
                    '<td style="text-align:center;">' + aksiCell + '</td>' +
                    '</tr>';
            }
            
            if (filtered.length === 0) {
                rows = '<tr><td colspan="11">Tidak ada data yang cocok</td></tr>';
            }
            
            document.getElementById('tableBody').innerHTML = rows;
            
            const archiveInfoEl = document.getElementById('archiveInfo');
            if (archiveInfoEl) {
                if (totalArsip > 0) {
                    archiveInfoEl.textContent = showArchived
                        ? `📦 Menampilkan termasuk ${totalArsip} PI yang diarsipkan`
                        : `📦 ${totalArsip} PI sudah diarsipkan dan disembunyikan dari tampilan ini (centang "Tampilkan PI Arsip" untuk melihat)`;
                } else {
                    archiveInfoEl.textContent = '';
                }
            }
        }
        
        function resetFilter() {
            document.getElementById('searchInput').value = '';
            document.getElementById('filterStatus').value = 'all';
            document.getElementById('showArchived').checked = false;
            filterData();
        }
        
        function exportExcel() {
            const search = document.getElementById('searchInput').value.toLowerCase();
            const statusFilter = document.getElementById('filterStatus').value;
            const showArchived = document.getElementById('showArchived').checked;
            
            let filtered = [...allData];
            if (!showArchived) {
                filtered = filtered.filter(item => !item.archived);
            }
            if (search) {
                filtered = filtered.filter(item => 
                    item.no_pi.toLowerCase().includes(search) ||
                    item.brand.toLowerCase().includes(search) ||
                    item.jenis.toLowerCase().includes(search)
                );
            }
            if (statusFilter !== 'all') {
                if (statusFilter === 'selesai') filtered = filtered.filter(item => item.keluar >= item.qty_pi);
                if (statusFilter === 'proses') filtered = filtered.filter(item => item.keluar > 0 && item.keluar < item.qty_pi);
                if (statusFilter === 'belum') filtered = filtered.filter(item => item.keluar === 0);
            }
            
            if (filtered.length === 0) { alert('Tidak ada data'); return; }
            const wsData = [['No PI', 'Brand', 'Jenis', 'Paper', 'Size', 'Qty PI', 'Masuk', 'Keluar', 'Stok', 'Status']];
            for (const item of filtered) {
                wsData.push([item.no_pi, item.brand, item.jenis, item.paper, item.size, item.qty_pi, item.masuk, item.keluar, item.stok, item.status]);
            }
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Stok Gudang');
            XLSX.writeFile(wb, 'Stok_Gudang_' + new Date().toISOString().slice(0,10) + '.xlsx');
            alert('✅ Export berhasil!');
        }
        
        // ============================================================
        // TARIK KELEBIHAN BARANG MASUK KE STOK PENDUKUNG
        // ============================================================
        function normEq(a, b) {
            return (a || '') === (b || '');
        }
        
        async function doTarikKeStokPendukung(detailId, jumlahTarik, kategoriBrand, onSuccess) {
            const { data: detailItem } = await sb.from('pi_detail').select('*, pi_header(no_pi)').eq('id', detailId).single();
            if (!detailItem) { alert('❌ Item tidak ditemukan!'); return; }
            
            const { data: masukData0 } = await sb.from('barang_masuk').select('qty,keterangan').eq('detail_id', detailId); const masukData = (masukData0 || []).filter(x => !String(x.keterangan||'').startsWith('[📄'));
            const { data: keluarData } = await sb.from('barang_keluar').select('qty').eq('detail_id', detailId);
            let totalMasuk = 0, totalKeluar = 0;
            if (masukData) masukData.forEach(m => totalMasuk += m.qty);
            if (keluarData) keluarData.forEach(k => totalKeluar += k.qty);
            const sisa = totalMasuk - totalKeluar;
            
            if (totalKeluar < detailItem.qty_pi) {
                alert('❌ PI ini belum SELESAI (barang keluar belum mencapai Qty PI), tidak bisa ditarik ke Stok Pendukung!');
                return;
            }
            if (!jumlahTarik || jumlahTarik <= 0 || jumlahTarik > sisa) {
                alert(`❌ Jumlah tidak valid! Sisa saat ini: ${sisa}`);
                return;
            }
            
            const targetBrand = kategoriBrand === 'general' ? 'GENERAL' : (detailItem.brand || 'GENERAL');
            const noPi = detailItem.pi_header?.no_pi || '-';
            
            const confirmMsg = `Tarik ${jumlahTarik} dari PI "${noPi}" (${detailItem.brand} - ${detailItem.jenis}) ke Stok Pendukung sebagai "${targetBrand}"?\n\nBarang ini akan tercatat KELUAR dari PI, dan MASUK ke Stok Pendukung.`;
            if (!confirm(confirmMsg)) return;
            
            const { data: { user } } = await sb.auth.getUser();
            const today = new Date().toISOString().split('T')[0];
            
            try {
                const { data: candidates } = await sb.from('stok_pendukung')
                    .select('*')
                    .eq('brand', targetBrand)
                    .eq('jenis', detailItem.jenis);
                const existingStok = (candidates || []).find(c => normEq(c.size, detailItem.size) && normEq(c.papers, detailItem.paper));
                
                let stokPendukungId;
                if (existingStok) {
                    const newStok = existingStok.stok + jumlahTarik;
                    const { error: updateErr } = await sb.from('stok_pendukung').update({ stok: newStok }).eq('id', existingStok.id);
                    if (updateErr) throw new Error('Gagal update stok pendukung: ' + updateErr.message);
                    stokPendukungId = existingStok.id;
                } else {
                    const { data: newRow, error: insertErr } = await sb.from('stok_pendukung').insert([{
                        brand: targetBrand,
                        jenis: detailItem.jenis,
                        size: detailItem.size || null,
                        papers: detailItem.paper || null,
                        stok: jumlahTarik,
                        stok_minimum: 0
                    }]).select();
                    if (insertErr) throw new Error('Gagal membuat stok pendukung baru: ' + insertErr.message);
                    stokPendukungId = newRow[0].id;
                }
                
                await sb.from('histori_stok_pendukung').insert([{
                    stok_pendukung_id: stokPendukungId,
                    jenis: 'MASUK',
                    qty: jumlahTarik,
                    keterangan: `Sisa dari PI ${noPi} - ${detailItem.brand} ${detailItem.jenis} (sudah SELESAI)`,
                    created_by: user.email
                }]);
                
                const { error: keluarErr } = await sb.from('barang_keluar').insert([{
                    detail_id: detailId,
                    tanggal: today,
                    qty: jumlahTarik,
                    keterangan: `Ditarik ke Stok Pendukung (${targetBrand})`,
                    created_by: user.email
                }]);
                if (keluarErr) throw new Error('Gagal mencatat barang keluar: ' + keluarErr.message);
                
                if (typeof addLog === 'function') {
                    await addLog('TARIK KE STOK PENDUKUNG', `${user.email} menarik ${jumlahTarik} dari PI ${noPi} - ${detailItem.brand} ${detailItem.jenis} ke Stok Pendukung (${targetBrand})`);
                }
                
                alert(`✅ Berhasil menarik ${jumlahTarik} ke Stok Pendukung sebagai "${targetBrand}"!`);
                
                if (onSuccess) await onSuccess();
                
            } catch (error) {
                alert('❌ Gagal: ' + error.message);
            }
        }
        
        async function tarikDashboard(detailId) {
            const item = allData.find(d => d.detailId === detailId);
            if (!item) { alert('❌ Data tidak ditemukan!'); return; }
            
            const jumlahStr = prompt(`Tarik berapa banyak dari sisa PI "${item.no_pi}" (${item.brand} - ${item.jenis})?\n\nSisa saat ini: ${item.stok}`, item.stok);
            if (jumlahStr === null) return;
            const jumlah = parseInt(jumlahStr);
            if (!jumlah || jumlah <= 0 || jumlah > item.stok) {
                alert(`❌ Jumlah tidak valid! Harus antara 1 - ${item.stok}`);
                return;
            }
            
            const pakaiGeneral = confirm(`Simpan sebagai stok GENERAL (bisa dipakai brand apapun)?\n\nOK = GENERAL\nBatal = Simpan sebagai brand khusus "${item.brand}"`);
            const kategori = pakaiGeneral ? 'general' : 'brand';
            
            await doTarikKeStokPendukung(detailId, jumlah, kategori, async () => {
                await loadData();
            });
        }
        


        // ============================================================
        // FUNGSI SIDEBAR MODERN (BARU)
        // ============================================================






        // ============================================================
        // SETUP EVENT LISTENERS (MENGGABUNGKAN LAMA & BARU)
        // ============================================================


        



        // ============================================================
        // INIT
        // ============================================================

        // Expose functions ke global

async function init(){ await loadData(); }
NS.loadData = loadData;
NS.renderDashboard = renderDashboard;
NS.filterData = filterData;
NS.resetFilter = resetFilter;
NS.exportExcel = exportExcel;
NS.normEq = normEq;
NS.doTarikKeStokPendukung = doTarikKeStokPendukung;
NS.tarikDashboard = tarikDashboard;
NS.mount = async function(host){
  host.innerHTML = "<div class=\"gm-dash\"><div id=\"gpMain\">" + "" + "</div></div>";
  
  await init();
};
})();
