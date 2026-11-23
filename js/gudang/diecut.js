/* Modul Gudang: diecut */
(function(){
const sb = window.sbG, GP = window.GP;
function showToast(m,t){ GP.toast(m,t); }
function addLog(a,d){ return GP.log(a,d); }
const NS = GP.mods.diecut = {};

        let currentMaterialId = null;
        let isSubmitting = false;
        let selectedNoPi = null;
        let isEditMode = false;

        function getEl(id) {
            return document.getElementById(id);
        }



        function showMessage(msg, type = 'info') {
            const container = getEl('msgContainer');
            if (!container) return;
            const map = {
                success: 'alert-success',
                error: 'alert-error',
                info: 'alert-info',
                warning: 'alert-warning'
            };
            container.innerHTML = `<div class="alert ${map[type] || 'alert-info'}">${msg}</div>`;
            setTimeout(() => container.innerHTML = '', 5000);
        }

        function calculateYield() {
            const pcsOut = parseInt(getEl('qty_pcs_out')?.value) || 0;
            const ng = parseInt(getEl('qty_ng_diecut')?.value) || 0;
            const pcsOk = pcsOut - ng;
            const yieldPercent = pcsOut > 0 ? Math.round((pcsOk / pcsOut) * 100) : 0;

            const yieldColor = yieldPercent >= 90 ? '#10b981' : (yieldPercent >= 70 ? '#f59e0b' : '#ef4444');
            
            const calcResult = getEl('calcResult');
            if (calcResult) {
                calcResult.innerHTML = 
                    `Pcs Out: ${pcsOut} - NG: ${ng} = <strong style="color:#10b981;">${pcsOk} Pcs OK</strong> | Yield: <strong style="color:${yieldColor};">${yieldPercent}%</strong>`;
            }
            
            return { pcsOk, yieldPercent };
        }

        function afterRender(){
const ngInput = getEl('qty_ng_diecut');
        if (ngInput) ngInput.addEventListener('input', calculateYield);

        const tanggalDiecut = getEl('tanggal_diecut');
        if (tanggalDiecut) tanggalDiecut.value = new Date().toISOString().split('T')[0];
}

        // ============================================================
        // SET USER INFO DI SIDEBAR
        // ============================================================


        // ============================================================
        // DROPDOWN 1: LOAD DAFTAR NO PI (HANYA QC1)
        // ============================================================
        async function loadPiList() {
            const select = getEl('selectNoPi');
            if (!select) return;
            
            const { data, error } = await sb
                .from('material_inbound')
                .select('no_pi, no_po, brand, jenis, status, qty_sheet, up_per_sheet, id, pi_detail_id')
                .eq('status', 'QC1')
                .order('created_at', { ascending: false });

            if (error) {
                showMessage('❌ Gagal memuat daftar No PI: ' + error.message, 'error');
                return;
            }

            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Pilih No PI --</option>';

            if (!data || data.length === 0) {
                select.innerHTML += '<option value="" disabled>Belum ada material dengan status QC1</option>';
                return;
            }

            for (const item of data) {
                if (item.no_pi) {
                    const option = document.createElement('option');
                    option.value = item.no_pi;
                    option.textContent = `${item.no_pi} - ${item.brand} - ${item.jenis} ✅ Siap Diecut`;
                    option.dataset.id = item.id;
                    option.dataset.qtySheet = item.qty_sheet;
                    option.dataset.upPerSheet = item.up_per_sheet;
                    option.dataset.status = item.status;
                    option.dataset.noPo = item.no_po;
                    option.dataset.brand = item.brand;
                    option.dataset.jenis = item.jenis;
                    option.dataset.piDetailId = item.pi_detail_id || '';
                    select.appendChild(option);
                }
            }

            if (currentValue) {
                select.value = currentValue;
            }
        }

        // ============================================================
        // DROPDOWN 2: LOAD DAFTAR NO PI UNTUK RIWAYAT
        // ============================================================
        async function loadHistoryPiList() {
            const select = getEl('selectHistoryPi');
            if (!select) return;
            
            const { data, error } = await sb
                .from('material_inbound')
                .select('no_pi, no_po, brand, jenis, status, id')
                .in('status', ['DIECUT', 'QC2', 'KIRIM'])
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading history PI list:', error);
                return;
            }

            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Pilih No PI yang Sudah Diecut --</option>';

            if (!data || data.length === 0) {
                select.innerHTML += '<option value="" disabled>Belum ada material yang sudah diecut</option>';
                return;
            }

            for (const item of data) {
                if (item.no_pi) {
                    const option = document.createElement('option');
                    option.value = item.id;
                    
                    let statusText = '';
                    if (item.status === 'DIECUT') statusText = '⚙️ Sudah Diecut';
                    else if (item.status === 'QC2') statusText = '🔬 QC #2';
                    else if (item.status === 'KIRIM') statusText = '🏭 Kirim Produksi';
                    
                    option.textContent = `${item.no_pi} - ${item.brand} - ${item.jenis} ${statusText}`;
                    option.dataset.noPi = item.no_pi;
                    select.appendChild(option);
                }
            }

            if (currentValue) {
                select.value = currentValue;
                await loadHistoryByPi();
            }
        }

        // ============================================================
        // LOAD MATERIAL BERDASARKAN NO PI
        // ============================================================
        async function loadMaterialByPi() {
            const select = getEl('selectNoPi');
            if (!select) return;
            
            const selectedOption = select.options[select.selectedIndex];
            const noPi = select.value;

            if (!noPi) {
                const materialInfo = getEl('materialInfo');
                if (materialInfo) materialInfo.style.display = 'none';
                
                const statusBadge = getEl('statusBadge');
                if (statusBadge) {
                    statusBadge.innerText = 'Pilih No PI';
                    statusBadge.style.background = '#fef3c7';
                }
                return;
            }

            const materialId = selectedOption.dataset.id;
            const qtySheet = parseInt(selectedOption.dataset.qtySheet) || 0;
            const upPerSheet = parseInt(selectedOption.dataset.upPerSheet) || 0;
            const status = selectedOption.dataset.status;
            const noPo = selectedOption.dataset.noPo;
            const brand = selectedOption.dataset.brand;
            const jenis = selectedOption.dataset.jenis;

            currentMaterialId = materialId;
            selectedNoPi = noPi;
            
            const materialIdEl = getEl('materialId');
            if (materialIdEl) materialIdEl.value = materialId;

            if (status !== 'QC1') {
                showMessage(`⚠️ Status material: ${status}. Harus QC1 untuk diecut!`, 'warning');
                const statusBadge = getEl('statusBadge');
                if (statusBadge) {
                    statusBadge.innerText = `⚠️ Status: ${status} (harus QC1)`;
                    statusBadge.style.background = '#fee2e2';
                }
                return;
            }

            // ✅ AMBIL DATA QC #1
            const { data: qc1Data, error: qc1Error } = await sb
                .from('qc_inspection')
                .select('*')
                .eq('material_inbound_id', materialId)
                .eq('qc_number', 1)
                .order('created_at', { ascending: false })
                .limit(1);

            if (qc1Error || !qc1Data || qc1Data.length === 0) {
                showMessage('❌ Data QC #1 tidak ditemukan!', 'error');
                return;
            }

            const qc1 = qc1Data[0];
            const qtySheetOk = qc1.qty_ok;
            const totalPcs = qtySheetOk * upPerSheet;

            // Tampilkan info material
            const materialInfo = getEl('materialInfo');
            if (materialInfo) materialInfo.style.display = 'block';
            
            document.getElementById('infoNoPo').innerText = noPo || '-';
            document.getElementById('infoNoPi').innerText = noPi || '-';
            document.getElementById('infoBrand').innerText = brand || '-';
            document.getElementById('infoJenis').innerText = jenis || '-';
            document.getElementById('infoSheet').innerText = qtySheet || 0;
            document.getElementById('infoUp').innerText = upPerSheet || 0;
            document.getElementById('infoTarget').innerText = (qtySheet * upPerSheet).toLocaleString();
            document.getElementById('infoQc1Ok').innerText = qtySheetOk;
            document.getElementById('infoQc1Ng').innerText = qc1.qty_ng || 0;
            document.getElementById('infoSheetDiecut').innerText = qtySheetOk;

            const statusBadge = getEl('statusBadge');
            if (statusBadge) {
                statusBadge.innerText = `✅ ${noPo} - ${brand}`;
                statusBadge.style.background = '#d1fae5';
            }

            // ✅ AUTO FILL
            document.getElementById('qty_sheet_in').value = qtySheetOk;
            document.getElementById('qty_pcs_out').value = totalPcs;

            // Aktifkan tombol simpan
            const btnSubmit = getEl('btnSubmit');
            if (btnSubmit) {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '💾 Simpan Proses Diecut';
                btnSubmit.style.background = '';
            }

            // Reset edit mode
            isEditMode = false;
            document.getElementById('editId').value = '';
            document.getElementById('editBadge').style.display = 'none';

            // Reset dropdown history
            const selectHistory = getEl('selectHistoryPi');
            if (selectHistory) {
                selectHistory.value = '';
            }

            // Load history
            const historyList = getEl('historyList');
            if (historyList) {
                historyList.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Pilih No PI yang sudah diecut di dropdown bawah untuk melihat riwayat</div>';
            }

            calculateYield();
        }

        // ============================================================
        // LOAD HISTORY BERDASARKAN PILIHAN DROPDOWN 2
        // ============================================================
        async function loadHistoryByPi() {
            const select = getEl('selectHistoryPi');
            if (!select) return;
            
            const materialId = select.value;
            if (!materialId) {
                const historyList = getEl('historyList');
                if (historyList) {
                    historyList.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Pilih No PI yang sudah diecut untuk melihat riwayat</div>';
                }
                return;
            }
            
            await loadHistory(materialId);
        }

        // ============================================================
        // LOAD HISTORY
        // ============================================================
        async function loadHistory(materialId) {
            const container = getEl('historyList');
            if (!container) return;
            
            if (!materialId) {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Pilih No PI yang sudah diecut untuk melihat riwayat</div>';
                return;
            }
            
            const { data, error } = await sb
                .from('diecut_process')
                .select('*')
                .eq('material_inbound_id', materialId)
                .order('created_at', { ascending: false });

            if (error) {
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">❌ Error: ${error.message}</div>`;
                return;
            }

            if (!data || data.length === 0) {
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Belum ada riwayat diecut untuk No PI ini</div>`;
                return;
            }

            let html = `
                <table>
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Mesin</th>
                            <th>Operator</th>
                            <th>Sheet In</th>
                            <th>Pcs Out</th>
                            <th>NG</th>
                            <th>Pcs OK</th>
                            <th>Yield</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const item of data) {
                const yieldColor = item.yield_percent >= 90 ? '#10b981' : (item.yield_percent >= 70 ? '#f59e0b' : '#ef4444');
                html += `
                    <tr>
                        <td>${item.tanggal_diecut || '-'}</td>
                        <td>${item.mesin || '-'}</td>
                        <td>${item.operator || '-'}</td>
                        <td style="text-align:center;">${item.qty_sheet_in}</td>
                        <td style="text-align:center;">${item.qty_pcs_out}</td>
                        <td style="text-align:center; color:#ef4444;">${item.qty_ng_diecut}</td>
                        <td style="text-align:center; font-weight:bold; color:#10b981;">${item.qty_pcs_ok}</td>
                        <td style="text-align:center; font-weight:bold; color:${yieldColor};">${item.yield_percent}%</td>
                        <td style="text-align:center;">
                            <button class="btn-small btn-edit-small" onclick="GP.mods.diecut.editDiecut('${item.id}')">✏️</button>
                            <button class="btn-small btn-delete-small" onclick="GP.mods.diecut.deleteDiecut('${item.id}')">🗑️</button>
                        </td>
                    </tr>
                `;
            }

            html += `</tbody></table>`;
            container.innerHTML = html;
        }

        // ============================================================
        // REFRESH HISTORY
        // ============================================================
        async function refreshHistory() {
            const select = getEl('selectHistoryPi');
            if (select && select.value) {
                await loadHistory(select.value);
            } else {
                await loadHistoryPiList();
            }
        }

        // ============================================================
        // EDIT DIECUT
        // ============================================================
        async function editDiecut(id) {
            const { data, error } = await sb
                .from('diecut_process')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                showToast('❌ Data tidak ditemukan!', 'error');
                return;
            }

            const { data: material } = await sb
                .from('material_inbound')
                .select('no_pi, no_po, brand, jenis, status, qty_sheet, up_per_sheet, id')
                .eq('id', data.material_inbound_id)
                .single();

            if (!material) {
                showToast('❌ Material tidak ditemukan!', 'error');
                return;
            }

            const statusBadge = getEl('statusBadge');
            if (statusBadge) {
                statusBadge.innerText = `✏️ Edit: ${material.no_pi}`;
                statusBadge.style.background = '#f59e0b';
            }

            await loadPiList();

            const select = getEl('selectNoPi');
            if (select && material) {
                let found = false;
                for (let i = 0; i < select.options.length; i++) {
                    if (select.options[i].dataset.id === material.id) {
                        select.value = select.options[i].value;
                        found = true;
                        break;
                    }
                }
                
                if (!found) {
                    const option = document.createElement('option');
                    option.value = material.no_pi;
                    option.textContent = `${material.no_pi} - ${material.brand} - ${material.jenis} (${material.status})`;
                    option.dataset.id = material.id;
                    option.dataset.qtySheet = material.qty_sheet || 0;
                    option.dataset.upPerSheet = material.up_per_sheet || 1;
                    option.dataset.status = material.status;
                    option.dataset.noPo = material.no_po || '-';
                    option.dataset.brand = material.brand;
                    option.dataset.jenis = material.jenis;
                    select.appendChild(option);
                    select.value = material.no_pi;
                }
                
                await loadMaterialByPi();
            }

            if (material.status === 'QC2' || material.status === 'KIRIM') {
                showToast('⚠️ Tidak bisa edit karena material sudah lanjut ke QC #2 atau Kirim!', 'warning');
                const btnSubmit = getEl('btnSubmit');
                if (btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.innerHTML = '⚠️ Tidak bisa diedit';
                    btnSubmit.style.background = '#94a3b8';
                }
            } else {
                const btnSubmit = getEl('btnSubmit');
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '✏️ Update Diecut';
                    btnSubmit.onclick = updateDiecut;
                    btnSubmit.style.background = '';
                }
            }

            isEditMode = true;
            document.getElementById('editId').value = id;
            document.getElementById('editBadge').style.display = 'inline';

            document.getElementById('tanggal_diecut').value = data.tanggal_diecut || '';
            document.getElementById('mesin').value = data.mesin || '';
            document.getElementById('operator').value = data.operator || '';
            document.getElementById('qty_ng_diecut').value = data.qty_ng_diecut || 0;
            document.getElementById('notes').value = data.notes || '';

            const card = document.querySelector('.card');
            if (card) card.scrollIntoView({ behavior: 'smooth' });

            showToast(`📝 Mode Edit: Diecut - ${material.no_pi}`, 'info');
        }

        // ============================================================
        // UPDATE DIECUT
        // ============================================================
        async function updateDiecut() {
            if (isSubmitting) return;

            const editId = document.getElementById('editId')?.value;
            if (!editId) { showMessage('❌ Tidak ada data yang diedit!', 'error'); return; }

            const tanggal_diecut = document.getElementById('tanggal_diecut')?.value;
            const mesin = document.getElementById('mesin')?.value?.trim() || '';
            const operator = document.getElementById('operator')?.value?.trim() || '';
            const qty_ng_diecut = parseInt(document.getElementById('qty_ng_diecut')?.value) || 0;
            const notes = document.getElementById('notes')?.value?.trim() || '';

            if (!tanggal_diecut) { showMessage('❌ Tanggal Diecut wajib diisi!', 'error'); return; }
            if (!operator) { showMessage('❌ Nama Operator wajib diisi!', 'error'); return; }

            const { pcsOk, yieldPercent } = calculateYield();

            const btn = document.getElementById('btnSubmit');
            const originalText = btn ? btn.innerHTML : 'Loading...';
            if (btn) {
                btn.innerHTML = '⏳ Mengupdate...';
                btn.disabled = true;
            }

            isSubmitting = true;

            try {
                const { data: { user } } = await sb.auth.getUser();

                const data = {
                    tanggal_diecut,
                    mesin: mesin || null,
                    operator,
                    qty_ng_diecut,
                    yield_percent: yieldPercent,
                    notes: notes || null,
                    updated_by: user?.email || 'Unknown',
                    updated_at: new Date().toISOString()
                };

                const { error } = await sb
                    .from('diecut_process')
                    .update(data)
                    .eq('id', editId);

                if (error) throw error;

                showToast('✅ Data diecut berhasil diupdate!', 'success');
                showMessage('✅ Data diecut berhasil diupdate!', 'success');
                showToast('ℹ️ Catatan: Stok Gudang TIDAK ikut disesuaikan otomatis untuk edit ini. Perubahan NG hanya berlaku untuk sinkronisasi otomatis pada input baru.', 'info');

                isEditMode = false;
                document.getElementById('editId').value = '';
                document.getElementById('editBadge').style.display = 'none';
                
                if (btn) {
                    btn.innerHTML = '💾 Simpan Proses Diecut';
                    btn.onclick = saveDiecut;
                }

                const selectHistory = document.getElementById('selectHistoryPi');
                if (selectHistory && selectHistory.value) {
                    await loadHistory(selectHistory.value);
                }

            } catch (err) {
                showMessage('❌ Gagal mengupdate: ' + err.message, 'error');
                showToast('❌ Gagal: ' + err.message, 'error');
            } finally {
                isSubmitting = false;
                if (btn) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            }
        }

        // ============================================================
        // DELETE DIECUT
        // ============================================================
        async function deleteDiecut(id) {
            if (!confirm('Yakin ingin menghapus data diecut ini?')) return;

            const { data: diecut } = await sb
                .from('diecut_process')
                .select('material_inbound_id')
                .eq('id', id)
                .single();

            if (diecut) {
                const { data: material } = await sb
                    .from('material_inbound')
                    .select('status')
                    .eq('id', diecut.material_inbound_id)
                    .single();

                if (material && (material.status === 'QC2' || material.status === 'KIRIM')) {
                    showToast('⚠️ Tidak bisa hapus karena material sudah lanjut ke QC #2 atau Kirim!', 'warning');
                    return;
                }
            }

            const { error } = await sb
                .from('diecut_process')
                .delete()
                .eq('id', id);

            if (error) {
                showToast('❌ Gagal menghapus: ' + error.message, 'error');
            } else {
                showToast('✅ Data diecut berhasil dihapus', 'success');
                const selectHistory = document.getElementById('selectHistoryPi');
                if (selectHistory && selectHistory.value) {
                    await loadHistory(selectHistory.value);
                }
                await loadHistoryPiList();
            }
        }

        // ============================================================
        // EXPORT DIECUT HISTORY
        // ============================================================
        async function exportDiecutHistory() {
            const selectHistory = document.getElementById('selectHistoryPi');
            if (!selectHistory || !selectHistory.value) {
                showToast('❌ Pilih No PI yang sudah diecut terlebih dahulu!', 'error');
                return;
            }

            const materialId = selectHistory.value;
            
            const { data, error } = await sb
                .from('diecut_process')
                .select('*')
                .eq('material_inbound_id', materialId)
                .order('created_at', { ascending: false });

            if (error) {
                showToast('❌ Gagal mengambil data: ' + error.message, 'error');
                return;
            }

            if (!data || data.length === 0) {
                showToast('⚠️ Tidak ada data diecut', 'warning');
                return;
            }

            const { data: material } = await sb
                .from('material_inbound')
                .select('no_pi, no_po, brand, jenis')
                .eq('id', materialId)
                .single();

            const fileName = `Riwayat_Diecut_${material?.no_pi || 'export'}_${new Date().toISOString().slice(0,10)}`;

            const wsData = [
                ['No PI', 'No PO', 'Brand', 'Jenis', 'Tanggal', 'Mesin', 'Operator', 
                 'Sheet In', 'Pcs Out', 'NG', 'Pcs OK', 'Yield (%)', 'Catatan']
            ];

            for (const item of data) {
                wsData.push([
                    material?.no_pi || '-',
                    material?.no_po || '-',
                    material?.brand || '-',
                    material?.jenis || '-',
                    item.tanggal_diecut || '-',
                    item.mesin || '-',
                    item.operator || '-',
                    item.qty_sheet_in,
                    item.qty_pcs_out,
                    item.qty_ng_diecut,
                    item.qty_pcs_ok,
                    item.yield_percent || 0,
                    item.notes || '-'
                ]);
            }

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [
                {wch:15}, {wch:15}, {wch:15}, {wch:20}, {wch:12}, {wch:12},
                {wch:15}, {wch:10}, {wch:10}, {wch:10}, {wch:10}, {wch:10}, {wch:20}
            ];
            
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Diecut');
            XLSX.writeFile(wb, `${fileName}.xlsx`);
            showToast('✅ Export berhasil!', 'success');
        }

        // ============================================================
        // SAVE DIECUT
        // ============================================================
        async function saveDiecut() {
            if (isSubmitting) return;

            const materialId = document.getElementById('materialId')?.value;
            const tanggal_diecut = document.getElementById('tanggal_diecut')?.value;
            const mesin = document.getElementById('mesin')?.value?.trim() || '';
            const operator = document.getElementById('operator')?.value?.trim() || '';
            const qty_sheet_in = parseInt(document.getElementById('qty_sheet_in')?.value) || 0;
            const qty_pcs_out = parseInt(document.getElementById('qty_pcs_out')?.value) || 0;
            const qty_ng_diecut = parseInt(document.getElementById('qty_ng_diecut')?.value) || 0;
            const notes = document.getElementById('notes')?.value?.trim() || '';

            if (!materialId) { showMessage('❌ Pilih No PI terlebih dahulu!', 'error'); return; }
            if (!tanggal_diecut) { showMessage('❌ Tanggal Diecut wajib diisi!', 'error'); return; }
            if (!operator) { showMessage('❌ Nama Operator wajib diisi!', 'error'); return; }
            if (qty_sheet_in < 1) { showMessage('❌ Qty Sheet In tidak valid!', 'error'); return; }
            if (qty_pcs_out < 1) { showMessage('❌ Qty Pcs Out tidak valid!', 'error'); return; }
            if (qty_ng_diecut > qty_pcs_out) { showMessage('❌ NG tidak boleh lebih dari Pcs Out!', 'error'); return; }

            const { pcsOk, yieldPercent } = calculateYield();

            const btn = document.getElementById('btnSubmit');
            const originalText = btn ? btn.innerHTML : 'Loading...';
            if (btn) {
                btn.innerHTML = '⏳ Menyimpan...';
                btn.disabled = true;
            }

            isSubmitting = true;

            try {
                const { data: { user } } = await sb.auth.getUser();

                const data = {
                    material_inbound_id: materialId,
                    tanggal_diecut,
                    mesin: mesin || null,
                    operator,
                    qty_sheet_in,
                    qty_pcs_out,
                    qty_ng_diecut,
                    yield_percent: yieldPercent,
                    notes: notes || null,
                    created_by: user?.email || 'Unknown'
                };

                const { error } = await sb.from('diecut_process').insert([data]);

                if (error) throw error;

                await sb.from('material_inbound').update({ status: 'DIECUT' }).eq('id', materialId);

                if (qty_ng_diecut > 0) {
                    await sb.from('ng_tracking').insert({
                        material_inbound_id: materialId,
                        proses: 'DIECUT',
                        qty_ng: qty_ng_diecut,
                        jenis_ng: 'LAINNYA',
                        deskripsi: notes || 'NG dari proses diecut',
                        created_by: user?.email || 'Unknown'
                    });

                    // ✅ OTOMATIS KURANGI STOK GUDANG (NG Diecut sudah dalam satuan Pcs)
                    const select = document.getElementById('selectNoPi');
                    const selectedOption = select ? select.options[select.selectedIndex] : null;
                    const piDetailId = selectedOption ? selectedOption.dataset.piDetailId : '';
                    if (piDetailId) {
                        try {
                            await sb.from('barang_keluar').insert([{
                                detail_id: parseInt(piDetailId),
                                tanggal: tanggal_diecut,
                                qty: qty_ng_diecut,
                                keterangan: `NG Diecut (otomatis, ${qty_ng_diecut} Pcs)`,
                                created_by: user?.email || 'Unknown'
                            }]);
                        } catch (syncErr) {
                            console.error('Gagal sinkron NG Diecut ke Stok Gudang:', syncErr);
                        }
                    }
                }

                showMessage(`✅ Proses Diecut berhasil! Yield: ${yieldPercent}%`, 'success');
                showToast(`✅ Diecut berhasil! Yield: ${yieldPercent}%`, 'success');

                resetForm();
                await loadPiList();
                await loadHistoryPiList();

            } catch (err) {
                showMessage('❌ Gagal menyimpan: ' + err.message, 'error');
                showToast('❌ Gagal: ' + err.message, 'error');
            } finally {
                isSubmitting = false;
                if (btn) {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            }
        }

        function resetForm() {
            document.getElementById('tanggal_diecut').value = new Date().toISOString().split('T')[0];
            document.getElementById('mesin').value = '';
            document.getElementById('operator').value = '';
            document.getElementById('qty_ng_diecut').value = '0';
            document.getElementById('notes').value = '';
            document.getElementById('msgContainer').innerHTML = '';
            
            isEditMode = false;
            document.getElementById('editId').value = '';
            document.getElementById('editBadge').style.display = 'none';
            
            const btnSubmit = document.getElementById('btnSubmit');
            if (btnSubmit) {
                btnSubmit.innerHTML = '💾 Simpan Proses Diecut';
                btnSubmit.onclick = saveDiecut;
            }
            
            calculateYield();
        }

        // ============================================================
        // NAVIGASI
        // ============================================================












        // ============================================================
        // INIT
        // ============================================================

async function init(){
  afterRender();
  await loadPiList();
  await loadHistoryPiList();
  const params = GP.params;
  const materialId = params.get('material_id');
  if (materialId) {
    const selectDiecut = document.getElementById('selectNoPi');
    if (selectDiecut) {
      for (let i = 0; i < selectDiecut.options.length; i++) {
        if (selectDiecut.options[i].dataset.id === materialId) { selectDiecut.value = selectDiecut.options[i].value; await loadMaterialByPi(); break; }
      }
    }
    const selectHistory = document.getElementById('selectHistoryPi');
    if (selectHistory) {
      for (let i = 0; i < selectHistory.options.length; i++) {
        if (selectHistory.options[i].value === materialId) { selectHistory.value = materialId; await loadHistory(materialId); break; }
      }
    }
  }
  calculateYield();
}
NS.getEl = getEl;
NS.showMessage = showMessage;
NS.calculateYield = calculateYield;
NS.afterRender = afterRender;
NS.loadPiList = loadPiList;
NS.loadHistoryPiList = loadHistoryPiList;
NS.loadMaterialByPi = loadMaterialByPi;
NS.loadHistoryByPi = loadHistoryByPi;
NS.loadHistory = loadHistory;
NS.refreshHistory = refreshHistory;
NS.editDiecut = editDiecut;
NS.updateDiecut = updateDiecut;
NS.deleteDiecut = deleteDiecut;
NS.exportDiecutHistory = exportDiecutHistory;
NS.saveDiecut = saveDiecut;
NS.resetForm = resetForm;
NS.mount = async function(host){
  host.innerHTML = "<div class=\"gm-diecut\"><div id=\"gpMain\">" + "\n        <div class=\"card\">\n            <div class=\"card-title\">\n                <span>\u2699\ufe0f PROSES DIECUT <span id=\"editBadge\" class=\"edit-badge\" style=\"display:none;\">\u270f\ufe0f EDIT MODE</span></span>\n                <span id=\"statusBadge\" style=\"font-size:12px;background:#f1f5f9;padding:4px 12px;border-radius:20px;\">Pilih No PI</span>\n            </div>\n            \n            <div id=\"msgContainer\"></div>\n\n            <div class=\"form-group\">\n                <label>Pilih No PI (Untuk Diecut) <span class=\"required\">*</span></label>\n                <select id=\"selectNoPi\" onchange=\"GP.mods.diecut.loadMaterialByPi()\">\n                    <option value=\"\">-- Pilih No PI --</option>\n                </select>\n                <span class=\"small-text\">\ud83d\udccc Hanya menampilkan material dengan status QC1 (siap diecut)</span>\n            </div>\n\n            <input type=\"hidden\" id=\"materialId\">\n            <input type=\"hidden\" id=\"editId\" value=\"\">\n\n            <div id=\"materialInfo\" class=\"material-info\" style=\"display:none;\">\n                <div style=\"font-weight:600;margin-bottom:8px;\">\ud83d\udccb Informasi Material</div>\n                <div class=\"material-info-grid\" id=\"materialInfoGrid\">\n                    <div><span class=\"label\">No PO:</span> <span class=\"value\" id=\"infoNoPo\">-</span></div>\n                    <div><span class=\"label\">No PI:</span> <span class=\"value\" id=\"infoNoPi\">-</span></div>\n                    <div><span class=\"label\">Brand:</span> <span class=\"value\" id=\"infoBrand\">-</span></div>\n                    <div><span class=\"label\">Jenis:</span> <span class=\"value\" id=\"infoJenis\">-</span></div>\n                    <div><span class=\"label\">Qty Sheet (Masuk):</span> <span class=\"value\" id=\"infoSheet\">-</span></div>\n                    <div><span class=\"label\">Up/Sheet:</span> <span class=\"value\" id=\"infoUp\">-</span></div>\n                    <div><span class=\"label\">Target Pcs:</span> <span class=\"value\" id=\"infoTarget\">-</span></div>\n                    <div><span class=\"label\">QC #1 OK (Sheet):</span> <span class=\"value\" id=\"infoQc1Ok\" style=\"color:#10b981;font-weight:bold;\">-</span></div>\n                    <div><span class=\"label\">QC #1 NG (Sheet):</span> <span class=\"value\" id=\"infoQc1Ng\" style=\"color:#ef4444;font-weight:bold;\">-</span></div>\n                    <div><span class=\"label\">Sheet Diecut:</span> <span class=\"value\" id=\"infoSheetDiecut\" style=\"color:#3b82f6;font-weight:bold;\">-</span></div>\n                </div>\n            </div>\n\n            <form id=\"diecutForm\" onsubmit=\"return false;\">\n                <div class=\"form-row\">\n                    <div class=\"form-group\">\n                        <label>Tanggal Diecut <span class=\"required\">*</span></label>\n                        <input type=\"date\" id=\"tanggal_diecut\" required>\n                    </div>\n                    <div class=\"form-group\">\n                        <label>Mesin</label>\n                        <input type=\"text\" id=\"mesin\" placeholder=\"Contoh: Mesin A-01\">\n                    </div>\n                </div>\n\n                <div class=\"form-group\">\n                    <label>Operator <span class=\"required\">*</span></label>\n                    <input type=\"text\" id=\"operator\" placeholder=\"Nama Operator\" required>\n                </div>\n\n                <div class=\"form-row\">\n                    <div class=\"form-group\">\n                        <label>Qty Sheet In (Dari QC #1 OK) <span class=\"required\">*</span></label>\n                        <input type=\"number\" id=\"qty_sheet_in\" readonly style=\"background:#f1f5f9; font-weight:bold; color:#3b82f6;\">\n                        <span class=\"small-text\">\ud83d\udccc Otomatis dari hasil QC #1 (Qty OK)</span>\n                    </div>\n                    <div class=\"form-group\">\n                        <label>Qty Pcs Out (Target) <span class=\"required\">*</span></label>\n                        <input type=\"number\" id=\"qty_pcs_out\" readonly style=\"background:#f1f5f9; font-weight:bold; color:#10b981;\">\n                        <span class=\"small-text\">\ud83d\udccc Otomatis: Sheet OK \u00d7 Up per Sheet</span>\n                    </div>\n                </div>\n\n                <div class=\"form-group\">\n                    <label>Qty NG Diecut</label>\n                    <input type=\"number\" id=\"qty_ng_diecut\" placeholder=\"Jumlah NG\" min=\"0\" value=\"0\">\n                    <span class=\"small-text\">\u270f\ufe0f Input manual jumlah yang reject</span>\n                </div>\n\n                <div class=\"info-box\" id=\"calcInfo\">\n                    <strong>\ud83d\udcca Perhitungan Otomatis:</strong><br>\n                    <span id=\"calcResult\">\n                        Pcs Out: 0 - NG: 0 = <strong>0 Pcs OK</strong> | Yield: <strong>0%</strong>\n                    </span>\n                </div>\n\n                <div class=\"form-group\">\n                    <label>Catatan</label>\n                    <textarea id=\"notes\" placeholder=\"Catatan tambahan...\"></textarea>\n                </div>\n\n                <div style=\"display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;\">\n                    <button type=\"submit\" class=\"btn btn-success\" id=\"btnSubmit\" onclick=\"GP.mods.diecut.saveDiecut()\" style=\"flex:2; min-width:150px;\">\n                        \ud83d\udcbe Simpan Proses Diecut\n                    </button>\n                    <button type=\"reset\" class=\"btn btn-secondary\" onclick=\"GP.mods.diecut.resetForm()\" style=\"flex:1; min-width:100px;\">\n                        \ud83d\udd04 Reset\n                    </button>\n                    <button type=\"button\" class=\"btn btn-back\" onclick=\"GP.go('masuk')\" style=\"flex:1; min-width:100px;\">\n                        \u2b05 Kembali ke Tracking\n                    </button>\n                </div>\n            </form>\n        </div>\n\n        <div class=\"card\">\n            <div class=\"card-title\">\n                <span>\ud83d\udccb Riwayat Diecut</span>\n                <div>\n                    <button class=\"btn btn-export\" onclick=\"GP.mods.diecut.exportDiecutHistory()\" style=\"padding:4px 12px; font-size:11px; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer;\">\n                        \ud83d\udcce Export Excel\n                    </button>\n                    <button class=\"btn btn-secondary\" onclick=\"GP.mods.diecut.refreshHistory()\" style=\"padding:4px 12px; font-size:11px;\">\ud83d\udd04 Refresh</button>\n                </div>\n            </div>\n            \n            <div class=\"form-group\">\n                <label>Pilih No PI yang Sudah Diecut</label>\n                <select id=\"selectHistoryPi\" onchange=\"GP.mods.diecut.loadHistoryByPi()\">\n                    <option value=\"\">-- Pilih No PI --</option>\n                </select>\n                <span class=\"small-text\">\ud83d\udccc Menampilkan material dengan status DIECUT, QC2, KIRIM (sudah diproses diecut)</span>\n            </div>\n            \n            <div id=\"historyList\" style=\"overflow-x:auto;\">\n                <div style=\"text-align:center;padding:20px;color:#94a3b8;\">\u23f3 Memuat...</div>\n            </div>\n        </div>\n    " + "</div></div>";
  
  await init();
};
})();
