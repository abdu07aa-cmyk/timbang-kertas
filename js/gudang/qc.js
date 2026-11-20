/* Modul Gudang: qc */
(function(){
const sb = window.sbG, GP = window.GP;
function showToast(m,t){ GP.toast(m,t); }
function addLog(a,d){ return GP.log(a,d); }
const NS = GP.mods.qc = {};

        let currentMaterialId = null;
        let currentQcNumber = 1;
        let isSubmitting = false;
        let materialData = null;
        let diecutData = null;
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

        function afterRender(){
// Toggle alasan NG
        const hasilEl = getEl('hasil');
        if (hasilEl) {
            hasilEl.addEventListener('change', function() {
                const alasanGroup = getEl('alasanNgGroup');
                const alasanNg = getEl('alasan_ng');
                if (this.value === 'NG') {
                    if (alasanGroup) alasanGroup.style.display = 'block';
                    if (alasanNg) alasanNg.setAttribute('required', 'required');
                } else {
                    if (alasanGroup) alasanGroup.style.display = 'none';
                    if (alasanNg) alasanNg.removeAttribute('required');
                }
            });
        }

        // Set today's date
        const tanggalQc = getEl('tanggal_qc');
        if (tanggalQc) tanggalQc.value = new Date().toISOString().split('T')[0];
}

        // ============================================================
        // SET QC NUMBER (TOGGLE)
        // ============================================================
        function setQcNumber(qc) {
            currentQcNumber = qc;
            
            const elQcNumber = getEl('qcNumber');
            if (elQcNumber) elQcNumber.value = qc;
            
            const btnQc1 = getEl('btnQc1');
            const btnQc2 = getEl('btnQc2');
            
            if (btnQc1 && btnQc2) {
                if (qc === 1) {
                    btnQc1.className = 'btn btn-qc1';
                    btnQc2.className = 'btn btn-qc2';
                } else {
                    btnQc1.className = 'btn btn-qc2';
                    btnQc2.className = 'btn btn-qc1 active';
                }
            }
            
            const pageTitle = getEl('pageTitle');
            if (pageTitle) pageTitle.innerText = `🔬 QC #${qc}`;
            
            const qcBadge = getEl('qcBadge');
            if (qcBadge) qcBadge.innerText = `QC #${qc}`;
            
            const materialInfo = getEl('materialInfo');
            if (materialInfo) materialInfo.style.display = 'none';
            
            const unitInfo = getEl('unitInfo');
            if (unitInfo) unitInfo.style.display = 'none';
            
            // Update label unit
            const labelQtyOk = getEl('labelQtyOk');
            const labelQtyNg = getEl('labelQtyNg');
            const labelQtyRework = getEl('labelQtyRework');
            const maxUnitOk = getEl('maxUnitOk');
            
            if (qc === 1) {
                if (labelQtyOk) labelQtyOk.innerHTML = 'Qty OK (Sheet) <span class="required">*</span>';
                if (labelQtyNg) labelQtyNg.innerHTML = 'Qty NG (Sheet) <span class="required">*</span>';
                if (labelQtyRework) labelQtyRework.innerHTML = 'Qty Rework (Sheet)';
                if (maxUnitOk) maxUnitOk.innerText = 'Sheet';
                
                const dropdownInfo = getEl('dropdownInfo');
                if (dropdownInfo) dropdownInfo.innerHTML = '📌 Hanya menampilkan material dengan status DITERIMA (untuk QC #1)';
            } else {
                if (labelQtyOk) labelQtyOk.innerHTML = 'Qty OK (Pcs) <span class="required">*</span>';
                if (labelQtyNg) labelQtyNg.innerHTML = 'Qty NG (Pcs) <span class="required">*</span>';
                if (labelQtyRework) labelQtyRework.innerHTML = 'Qty Rework (Pcs)';
                if (maxUnitOk) maxUnitOk.innerText = 'Pcs';
                
                const dropdownInfo = getEl('dropdownInfo');
                if (dropdownInfo) dropdownInfo.innerHTML = '📌 Hanya menampilkan material dengan status DIECUT (untuk QC #2)';
            }
            
            isEditMode = false;
            const editId = getEl('editId');
            if (editId) editId.value = '';
            
            const editBadge = getEl('editBadge');
            if (editBadge) editBadge.style.display = 'none';
            
            const btnSubmit = getEl('btnSubmit');
            if (btnSubmit) btnSubmit.innerHTML = '💾 Simpan QC';
            
            const select = getEl('selectNoPi');
            if (select) {
                select.value = '';
                select.innerHTML = '<option value="">-- Pilih No PI --</option>';
            }
            
            loadPiList();
            showToast(`📌 Beralih ke QC #${qc}`, 'info');
        }

        // ============================================================
        // DROPDOWN 1: LOAD DAFTAR NO PI (SESUAI QC)
        // ============================================================
        async function loadPiList() {
            const select = getEl('selectNoPi');
            if (!select) return;
            
            let statusFilter = [];
            if (currentQcNumber === 1) {
                statusFilter = ['DITERIMA'];
            } else if (currentQcNumber === 2) {
                statusFilter = ['DIECUT'];
            }
            
            const { data, error } = await sb
                .from('material_inbound')
                .select('no_pi, no_po, brand, jenis, status, qty_sheet, up_per_sheet, id, pi_detail_id')
                .in('status', statusFilter)
                .order('created_at', { ascending: false });

            if (error) {
                showMessage('❌ Gagal memuat daftar No PI: ' + error.message, 'error');
                return;
            }

            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Pilih No PI --</option>';

            if (!data || data.length === 0) {
                select.innerHTML += `<option value="" disabled>${currentQcNumber === 1 ? 'Tidak ada material dengan status DITERIMA' : 'Tidak ada material dengan status DIECUT'}</option>`;
                return;
            }

            for (const item of data) {
                if (item.no_pi) {
                    const option = document.createElement('option');
                    option.value = item.no_pi;
                    
                    let statusText = '';
                    if (currentQcNumber === 1) {
                        statusText = '✅ Siap QC #1';
                    } else {
                        statusText = '✅ Siap QC #2';
                    }
                    
                    option.textContent = `${item.no_pi} - ${item.brand} - ${item.jenis} ${statusText}`;
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
        // LOAD MATERIAL
        // ============================================================
        async function loadMaterialByPi() {
            const select = getEl('selectNoPi');
            if (!select) return;
            
            const selectedOption = select.options[select.selectedIndex];
            const noPi = select.value;

            if (!noPi) {
                const materialInfo = getEl('materialInfo');
                if (materialInfo) materialInfo.style.display = 'none';
                
                const unitInfo = getEl('unitInfo');
                if (unitInfo) unitInfo.style.display = 'none';
                
                const qcBadge = getEl('qcBadge');
                if (qcBadge) {
                    qcBadge.innerText = 'Pilih No PI';
                    qcBadge.style.background = '#fef3c7';
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

            const statusMap = {
                'DITERIMA': '📥 Diterima',
                'QC1': '🔬 QC #1',
                'DIECUT': '⚙️ Diecut',
                'QC2': '🔬 QC #2',
                'KIRIM': '🏭 Kirim Produksi'
            };

            // Validasi status
            if (currentQcNumber === 1 && status !== 'DITERIMA') {
                showMessage(`⚠️ QC #1 hanya untuk status DITERIMA! Status saat ini: ${statusMap[status] || status}`, 'warning');
                const qcBadge = getEl('qcBadge');
                if (qcBadge) {
                    qcBadge.innerText = `⚠️ Status: ${status}`;
                    qcBadge.style.background = '#fee2e2';
                }
                return;
            }

            if (currentQcNumber === 2) {
                // Cek QC #1 sudah ada
                const { data: qc1Exists } = await sb
                    .from('qc_inspection')
                    .select('id')
                    .eq('material_inbound_id', materialId)
                    .eq('qc_number', 1)
                    .limit(1);

                if (!qc1Exists || qc1Exists.length === 0) {
                    showMessage('❌ Harus melakukan QC #1 terlebih dahulu sebelum QC #2!', 'error');
                    return;
                }

                // Ambil data diecut
                const { data: diecut } = await sb
                    .from('diecut_process')
                    .select('qty_pcs_ok')
                    .eq('material_inbound_id', materialId)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (!diecut || diecut.length === 0) {
                    showMessage('❌ Data Diecut tidak ditemukan! Harus diecut dulu sebelum QC #2.', 'error');
                    return;
                }
                diecutData = diecut[0];
            }

            let unit = '';
            let targetValue = 0;
            let targetLabel = '';

            if (currentQcNumber === 1) {
                unit = 'Sheet';
                targetValue = qtySheet || 0;
                targetLabel = `${targetValue} Sheet`;
                
                const labelQtyOk = getEl('labelQtyOk');
                const labelQtyNg = getEl('labelQtyNg');
                const labelQtyRework = getEl('labelQtyRework');
                const maxUnitOk = getEl('maxUnitOk');
                
                if (labelQtyOk) labelQtyOk.innerHTML = 'Qty OK (Sheet) <span class="required">*</span>';
                if (labelQtyNg) labelQtyNg.innerHTML = 'Qty NG (Sheet) <span class="required">*</span>';
                if (labelQtyRework) labelQtyRework.innerHTML = 'Qty Rework (Sheet)';
                if (maxUnitOk) maxUnitOk.innerText = 'Sheet';
                
                const unitInfoText = getEl('unitInfoText');
                if (unitInfoText) {
                    unitInfoText.innerHTML = `
                        🔬 <strong>QC #1 - Inspeksi Material dalam satuan SHEET</strong><br>
                        📦 Target QC: <strong>${targetValue} Sheet</strong> (dari qty sheet material masuk)<br>
                        ✅ Cek setiap lembar material yang masuk
                    `;
                }

            } else if (currentQcNumber === 2) {
                unit = 'Pcs';
                targetValue = diecutData ? diecutData.qty_pcs_ok : 0;
                targetLabel = `${targetValue} Pcs`;
                
                const labelQtyOk = getEl('labelQtyOk');
                const labelQtyNg = getEl('labelQtyNg');
                const labelQtyRework = getEl('labelQtyRework');
                const maxUnitOk = getEl('maxUnitOk');
                
                if (labelQtyOk) labelQtyOk.innerHTML = 'Qty OK (Pcs) <span class="required">*</span>';
                if (labelQtyNg) labelQtyNg.innerHTML = 'Qty NG (Pcs) <span class="required">*</span>';
                if (labelQtyRework) labelQtyRework.innerHTML = 'Qty Rework (Pcs)';
                if (maxUnitOk) maxUnitOk.innerText = 'Pcs';
                
                const unitInfoText = getEl('unitInfoText');
                if (unitInfoText) {
                    unitInfoText.innerHTML = `
                        🔬 <strong>QC #2 - Inspeksi Hasil Diecut dalam satuan PCS</strong><br>
                        📦 Target QC: <strong>${targetValue} Pcs</strong> (dari hasil diecut)<br>
                        ✅ Cek setiap pcs hasil diecut sebelum dikirim ke produksi
                    `;
                }
            }

            // Tampilkan info material
            const materialInfo = getEl('materialInfo');
            if (materialInfo) materialInfo.style.display = 'block';
            
            const infoNoPo = getEl('infoNoPo');
            if (infoNoPo) infoNoPo.innerText = noPo || '-';
            
            const infoNoPi = getEl('infoNoPi');
            if (infoNoPi) infoNoPi.innerText = noPi || '-';
            
            const infoBrand = getEl('infoBrand');
            if (infoBrand) infoBrand.innerText = brand || '-';
            
            const infoJenis = getEl('infoJenis');
            if (infoJenis) infoJenis.innerText = jenis || '-';
            
            const infoQtySheet = getEl('infoQtySheet');
            if (infoQtySheet) infoQtySheet.innerText = qtySheet || 0;
            
            const infoUp = getEl('infoUp');
            if (infoUp) infoUp.innerText = upPerSheet || 0;
            
            const infoTarget = getEl('infoTarget');
            if (infoTarget) infoTarget.innerHTML = `<span style="color:#3b82f6;font-weight:bold;">${targetLabel}</span>`;
            
            const infoUnit = getEl('infoUnit');
            if (infoUnit) infoUnit.innerHTML = `<span class="unit-badge">${unit}</span>`;
            
            const infoStatus = getEl('infoStatus');
            if (infoStatus) infoStatus.innerHTML = `<span class="status-badge" style="background:#e0f2fe;color:#0369a1;">${statusMap[status] || status}</span>`;

            const maxQtyOk = getEl('maxQtyOk');
            if (maxQtyOk) maxQtyOk.innerText = targetValue;

            const qcBadge = getEl('qcBadge');
            if (qcBadge) {
                qcBadge.innerText = `✅ ${noPo} - ${brand}`;
                qcBadge.style.background = '#d1fae5';
            }

            const unitInfo = getEl('unitInfo');
            if (unitInfo) unitInfo.style.display = 'block';

            // Reset history dropdown
            const selectHistory = getEl('selectHistoryPi');
            if (selectHistory) {
                selectHistory.value = '';
                const historyList = getEl('historyList');
                if (historyList) {
                    historyList.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Pilih No PI di dropdown bawah untuk melihat riwayat QC</div>';
                }
            }
        }

        // ============================================================
        // DROPDOWN 2 - LOAD DAFTAR NO PI UNTUK RIWAYAT
        // ============================================================
        async function loadHistoryPiList() {
            const select = getEl('selectHistoryPi');
            if (!select) return;
            
            const { data, error } = await sb
                .from('qc_inspection')
                .select('material_inbound_id')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading history PI list:', error);
                return;
            }

            const materialIds = [...new Set(data.map(item => item.material_inbound_id))];
            
            if (materialIds.length === 0) {
                select.innerHTML = '<option value="">-- Pilih No PI --</option><option value="" disabled>Belum ada riwayat QC</option>';
                return;
            }

            const { data: materials, error: matError } = await sb
                .from('material_inbound')
                .select('no_pi, no_po, brand, jenis, status, id')
                .in('id', materialIds)
                .order('created_at', { ascending: false });

            if (matError || !materials) {
                select.innerHTML = '<option value="">-- Pilih No PI --</option><option value="" disabled>Error memuat data</option>';
                return;
            }

            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Pilih No PI --</option>';

            for (const item of materials) {
                if (item.no_pi) {
                    const option = document.createElement('option');
                    option.value = item.id;
                    
                    let statusText = '';
                    if (item.status === 'DITERIMA') statusText = '📥 Diterima';
                    else if (item.status === 'QC1') statusText = '🔬 QC #1';
                    else if (item.status === 'DIECUT') statusText = '⚙️ Diecut';
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
        // LOAD HISTORY BERDASARKAN DROPDOWN 2
        // ============================================================
        async function loadHistoryByPi() {
            const select = getEl('selectHistoryPi');
            if (!select) return;
            
            const materialId = select.value;
            if (!materialId) {
                const historyList = getEl('historyList');
                if (historyList) {
                    historyList.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Pilih No PI untuk melihat riwayat QC</div>';
                }
                return;
            }
            
            await loadHistory(materialId);
        }

        // ============================================================
        // LOAD HISTORY (DENGAN KOLOM CATATAN)
        // ============================================================
        async function loadHistory(materialId) {
            const container = getEl('historyList');
            if (!container) return;
            
            if (!materialId) {
                container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Pilih No PI untuk melihat riwayat</div>';
                return;
            }
            
            const { data, error } = await sb
                .from('qc_inspection')
                .select('*')
                .eq('material_inbound_id', materialId)
                .order('created_at', { ascending: false });

            if (error) {
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">❌ Error: ${error.message}</div>`;
                return;
            }

            const { data: material } = await sb
                .from('material_inbound')
                .select('qty_sheet, up_per_sheet, qty_pcs')
                .eq('id', materialId)
                .single();

            if (!data || data.length === 0) {
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Belum ada riwayat QC untuk No PI ini</div>`;
                return;
            }

            let html = `
                <table style="width:100%; border-collapse: collapse; font-size: 12px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th style="padding:8px; text-align:left;">QC #</th>
                            <th style="padding:8px; text-align:left;">Tanggal</th>
                            <th style="padding:8px; text-align:center;">Qty Masuk</th>
                            <th style="padding:8px; text-align:center;">OK</th>
                            <th style="padding:8px; text-align:center;">NG</th>
                            <th style="padding:8px; text-align:center;">Rework</th>
                            <th style="padding:8px; text-align:center;">Hasil</th>
                            <th style="padding:8px; text-align:left;">Inspector</th>
                            <th style="padding:8px; text-align:left;">Catatan</th>
                            <th style="padding:8px; text-align:center;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (const item of data) {
                const hasilClass = item.hasil === 'OK' ? 'status-ok' : (item.hasil === 'NG' ? 'status-ng' : 'status-rework');
                const unitLabel = item.qc_number === 1 ? 'Sheet' : 'Pcs';
                const qtyMasuk = item.qc_number === 1 ? (material?.qty_sheet || 0) : (material?.qty_pcs || 0);
                const alasanNgText = item.alasan_ng ? ` (${item.alasan_ng})` : '';
                const catatan = item.notes || '-';
                
                html += `
                    <tr>
                        <td style="padding:8px; font-weight:500;">QC #${item.qc_number}</td>
                        <td style="padding:8px;">${item.tanggal_qc || '-'}</td>
                        <td style="padding:8px; text-align:center; font-weight:bold;">${qtyMasuk} ${unitLabel}</td>
                        <td style="padding:8px; text-align:center; color:#10b981; font-weight:bold;">${item.qty_ok} ${unitLabel}</td>
                        <td style="padding:8px; text-align:center; color:#ef4444; font-weight:bold;">${item.qty_ng} ${unitLabel}${alasanNgText}</td>
                        <td style="padding:8px; text-align:center; color:#f59e0b;">${item.qty_rework || 0} ${unitLabel}</td>
                        <td style="padding:8px; text-align:center;"><span class="status-badge ${hasilClass}">${item.hasil}</span></td>
                        <td style="padding:8px;">${item.inspector || '-'}</td>
                        <td style="padding:8px; max-width:150px; word-wrap:break-word; font-size:11px;">${catatan}</td>
                        <td style="padding:8px; text-align:center;">
                            <button class="btn-small btn-edit-small" onclick="GP.mods.qc.editQC('${item.id}')">✏️</button>
                            <button class="btn-small btn-delete-small" onclick="GP.mods.qc.deleteQC('${item.id}')">🗑️</button>
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
        // EDIT QC
        // ============================================================
       async function editQC(id) {
    const { data: qc, error } = await sb
        .from('qc_inspection')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !qc) {
        showToast('❌ Data tidak ditemukan!', 'error');
        return;
    }

    // ✅ AMBIL DATA MATERIAL
    const { data: material } = await sb
        .from('material_inbound')
        .select('no_pi, no_po, brand, jenis, qty_sheet, up_per_sheet, status, id, pi_detail_id')
        .eq('id', qc.material_inbound_id)
        .single();

    if (!material) {
        showToast('❌ Material tidak ditemukan!', 'error');
        return;
    }

    // ✅ SET QC NUMBER sesuai dengan data QC
    currentQcNumber = qc.qc_number;
    document.getElementById('qcNumber').value = qc.qc_number;

    // ✅ UPDATE TITLE & BADGE
    document.getElementById('pageTitle').innerText = `🔬 QC #${qc.qc_number}`;
    document.getElementById('qcBadge').innerText = `QC #${qc.qc_number}`;

    // ✅ UPDATE DROPDOWN INFO
    const dropdownInfo = getEl('dropdownInfo');
    if (dropdownInfo) {
        if (qc.qc_number === 1) {
            dropdownInfo.innerHTML = '📌 Menampilkan material dengan status DITERIMA (untuk QC #1)';
        } else {
            dropdownInfo.innerHTML = '📌 Menampilkan material dengan status DIECUT (untuk QC #2)';
        }
    }

    // ✅ RELOAD DROPDOWN PI LIST TERLEBIH DAHULU
    await loadPiList();

    // ✅ SET DROPDOWN NO PI OTOMATIS
    const select = getEl('selectNoPi');
    if (select && material) {
        // Cari option dengan value no_pi yang sesuai
        let found = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value === material.no_pi) {
                select.value = material.no_pi;
                found = true;
                break;
            }
        }
        
        // Jika tidak ditemukan di dropdown, tambahkan option sementara
        if (!found) {
            const option = document.createElement('option');
            option.value = material.no_pi;
            option.textContent = `${material.no_pi} - ${material.brand} - ${material.jenis} (${material.status})`;
            option.dataset.id = material.id;
            option.dataset.qtySheet = material.qty_sheet;
            option.dataset.upPerSheet = material.up_per_sheet;
            option.dataset.status = material.status;
            option.dataset.noPo = material.no_po;
            option.dataset.brand = material.brand;
            option.dataset.jenis = material.jenis;
            option.dataset.piDetailId = material.pi_detail_id || '';
            select.appendChild(option);
            select.value = material.no_pi;
        }
        
        // Load data material
        await loadMaterialByPi();
    }

    isEditMode = true;
    const editId = getEl('editId');
    if (editId) editId.value = id;
    
    const editBadge = getEl('editBadge');
    if (editBadge) editBadge.style.display = 'inline';
    
    const btnSubmit = getEl('btnSubmit');
    if (btnSubmit) btnSubmit.innerHTML = '✏️ Update QC';
    
    // ✅ ISI FORM DENGAN DATA QC
    const tanggalQc = getEl('tanggal_qc');
    if (tanggalQc) tanggalQc.value = qc.tanggal_qc || '';
    
    const inspector = getEl('inspector');
    if (inspector) inspector.value = qc.inspector || '';
    
    const qtyOk = getEl('qty_ok');
    if (qtyOk) qtyOk.value = qc.qty_ok || '';
    
    const qtyNg = getEl('qty_ng');
    if (qtyNg) qtyNg.value = qc.qty_ng || '';
    
    const qtyRework = getEl('qty_rework');
    if (qtyRework) qtyRework.value = qc.qty_rework || 0;
    
    const hasil = getEl('hasil');
    if (hasil) hasil.value = qc.hasil || '';
    
    const alasanNg = getEl('alasan_ng');
    if (alasanNg) alasanNg.value = qc.alasan_ng || '';
    
    const notes = getEl('notes');
    if (notes) notes.value = qc.notes || '';
    
    const alasanGroup = getEl('alasanNgGroup');
    if (qc.hasil === 'NG') {
        if (alasanGroup) alasanGroup.style.display = 'block';
        if (alasanNg) alasanNg.setAttribute('required', 'required');
    } else {
        if (alasanGroup) alasanGroup.style.display = 'none';
        if (alasanNg) alasanNg.removeAttribute('required');
    }
    
    // ✅ SCROLL KE FORM
    const card = document.querySelector('.card');
    if (card) card.scrollIntoView({ behavior: 'smooth' });
    
    showToast(`📝 Mode Edit: QC #${qc.qc_number} - ${material.no_pi}`, 'info');
}
        // ============================================================
        // DELETE QC
        // ============================================================
        async function deleteQC(id) {
            if (!confirm('Yakin ingin menghapus data QC ini? Data tidak bisa dikembalikan!')) return;
            
            const { error } = await sb
                .from('qc_inspection')
                .delete()
                .eq('id', id);
            
            if (error) {
                showToast('❌ Gagal menghapus: ' + error.message, 'error');
            } else {
                showToast('✅ Data QC berhasil dihapus', 'success');
                const select = getEl('selectHistoryPi');
                if (select && select.value) {
                    await loadHistory(select.value);
                }
                await loadHistoryPiList();
            }
        }

        // ============================================================
        // SAVE QC - DENGAN PERBAIKAN NG TRACKING
        // ============================================================
        async function saveQC() {
            if (isSubmitting) return;

            const materialId = getEl('materialId')?.value;
            const qcNumber = parseInt(getEl('qcNumber')?.value) || 1;
            const editId = getEl('editId')?.value;
            const tanggal_qc = getEl('tanggal_qc')?.value;
            const inspector = getEl('inspector')?.value?.trim();
            const qty_ok = parseInt(getEl('qty_ok')?.value);
            const qty_ng = parseInt(getEl('qty_ng')?.value);
            const qty_rework = parseInt(getEl('qty_rework')?.value) || 0;
            const hasil = getEl('hasil')?.value;
            const alasan_ng = getEl('alasan_ng')?.value;
            const notes = getEl('notes')?.value?.trim();

            if (!materialId) { showMessage('❌ Pilih No PI terlebih dahulu!', 'error'); return; }
            if (!tanggal_qc) { showMessage('❌ Tanggal QC wajib diisi!', 'error'); return; }
            if (!inspector) { showMessage('❌ Nama Inspector wajib diisi!', 'error'); return; }
            if (isNaN(qty_ok) || qty_ok < 0) { showMessage('❌ Qty OK harus lebih dari 0!', 'error'); return; }
            if (isNaN(qty_ng) || qty_ng < 0) { showMessage('❌ Qty NG harus lebih dari 0!', 'error'); return; }
            if (!hasil) { showMessage('❌ Hasil QC wajib dipilih!', 'error'); return; }
            if (hasil === 'NG' && !alasan_ng) { showMessage('❌ Alasan NG wajib diisi!', 'error'); return; }

            const select = getEl('selectNoPi');
            if (!select) return;
            
            const selectedOption = select.options[select.selectedIndex];
            let targetValue = 0;
            let unitLabel = '';

            if (qcNumber === 1) {
                targetValue = parseInt(selectedOption.dataset.qtySheet) || 0;
                unitLabel = 'Sheet';
            } else if (qcNumber === 2) {
                if (!diecutData) {
                    const { data: diecut } = await sb
                        .from('diecut_process')
                        .select('qty_pcs_ok')
                        .eq('material_inbound_id', materialId)
                        .order('created_at', { ascending: false })
                        .limit(1);
                    diecutData = diecut ? diecut[0] : null;
                }
                targetValue = diecutData ? diecutData.qty_pcs_ok : 0;
                unitLabel = 'Pcs';
            }

            if (qty_ok > targetValue) {
                showMessage(`❌ Qty OK (${qty_ok} ${unitLabel}) melebihi target (${targetValue} ${unitLabel})!`, 'error');
                return;
            }

            if ((qty_ok + qty_ng + qty_rework) > targetValue) {
                showMessage(`❌ Total OK + NG + Rework (${qty_ok + qty_ng + qty_rework} ${unitLabel}) melebihi target (${targetValue} ${unitLabel})!`, 'error');
                return;
            }

            const btn = getEl('btnSubmit');
            if (!btn) return;
            
            const originalText = btn.innerHTML;
            btn.innerHTML = editId ? '⏳ Mengupdate...' : '⏳ Menyimpan...';
            btn.disabled = true;

            isSubmitting = true;

            try {
                const { data: { user } } = await sb.auth.getUser();

                const data = {
                    material_inbound_id: materialId,
                    qc_number: qcNumber,
                    tanggal_qc,
                    qty_ok,
                    qty_ng,
                    qty_rework,
                    hasil,
                    alasan_ng: hasil === 'NG' ? alasan_ng : null,
                    notes: notes || null,
                    inspector,
                    updated_by: user?.email || 'Unknown',
                    updated_at: new Date().toISOString()
                };

                let result;
                if (editId) {
                    result = await sb
                        .from('qc_inspection')
                        .update(data)
                        .eq('id', editId);
                } else {
                    data.created_by = user?.email || 'Unknown';
                    result = await sb.from('qc_inspection').insert([data]);
                }

                if (result.error) throw result.error;

                let newStatus = '';
                if (!editId) {
                    if (qcNumber === 1) {
                        if (hasil === 'OK' || hasil === 'REWORK') {
                            newStatus = 'QC1';
                        } else if (hasil === 'NG') {
                            newStatus = 'DITERIMA';
                        }
                    } else if (qcNumber === 2) {
                        if (hasil === 'OK') {
                            newStatus = 'KIRIM';
                        } else if (hasil === 'NG' || hasil === 'REWORK') {
                            newStatus = 'QC2';
                        }
                    }

                    if (newStatus) {
                        await sb.from('material_inbound').update({ status: newStatus }).eq('id', materialId);
                    }
                }

                // ✅ NG selalu tersimpan jika ada qty_ng
                if (qty_ng > 0) {
                    const proses = qcNumber === 1 ? 'QC1' : 'QC2';
                    await sb.from('ng_tracking').insert({
                        material_inbound_id: materialId,
                        proses: proses,
                        qty_ng: qty_ng,
                        jenis_ng: alasan_ng || 'LAINNYA',
                        deskripsi: notes || `NG dari QC #${qcNumber} (Hasil: ${hasil})`,
                        created_by: user?.email || 'Unknown'
                    });

                    // ✅ OTOMATIS KURANGI STOK GUDANG (hanya saat input BARU, bukan edit)
                    if (!editId) {
                        const piDetailId = selectedOption.dataset.piDetailId;
                        if (piDetailId) {
                            const upPerSheetVal = parseInt(selectedOption.dataset.upPerSheet) || 1;
                            const qtyNgPcs = qcNumber === 1 ? (qty_ng * upPerSheetVal) : qty_ng;
                            try {
                                await sb.from('barang_keluar').insert([{
                                    detail_id: parseInt(piDetailId),
                                    tanggal: tanggal_qc,
                                    qty: qtyNgPcs,
                                    keterangan: `NG QC#${qcNumber} (otomatis, ${qty_ng} ${unitLabel})`,
                                    created_by: user?.email || 'Unknown'
                                }]);
                            } catch (syncErr) {
                                console.error('Gagal sinkron NG ke Stok Gudang:', syncErr);
                            }
                        }
                    }
                }

                const actionText = editId ? 'diupdate' : 'disimpan';
                const statusText = editId ? '' : (newStatus ? `Status: ${newStatus}` : 'Status Tetap');
                showMessage(`✅ QC #${qcNumber} berhasil ${actionText}! ${statusText}`, 'success');
                showToast(`✅ QC #${qcNumber} berhasil ${actionText}!`, 'success');

                resetForm();
                
                isEditMode = false;
                const editIdEl = getEl('editId');
                if (editIdEl) editIdEl.value = '';
                
                const editBadge = getEl('editBadge');
                if (editBadge) editBadge.style.display = 'none';
                
                if (btn) btn.innerHTML = '💾 Simpan QC';
                
                await loadPiList();
                await loadHistoryPiList();
                
                if (selectedNoPi) {
                    const selectEl = getEl('selectNoPi');
                    if (selectEl) {
                        selectEl.value = selectedNoPi;
                        await loadMaterialByPi();
                    }
                }

                try {
                    await addLog('QC INSPECTION', `${user?.email} ${actionText} QC #${qcNumber} untuk No PI ${selectedNoPi}`);
                } catch(e) {}

            } catch (err) {
                showMessage('❌ Gagal: ' + err.message, 'error');
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
            const tanggalQc = getEl('tanggal_qc');
            if (tanggalQc) tanggalQc.value = new Date().toISOString().split('T')[0];
            
            const inspector = getEl('inspector');
            if (inspector) inspector.value = '';
            
            const qtyOk = getEl('qty_ok');
            if (qtyOk) qtyOk.value = '';
            
            const qtyNg = getEl('qty_ng');
            if (qtyNg) qtyNg.value = '';
            
            const qtyRework = getEl('qty_rework');
            if (qtyRework) qtyRework.value = '0';
            
            const hasil = getEl('hasil');
            if (hasil) hasil.value = '';
            
            const alasanNg = getEl('alasan_ng');
            if (alasanNg) alasanNg.value = '';
            
            const notes = getEl('notes');
            if (notes) notes.value = '';
            
            const alasanGroup = getEl('alasanNgGroup');
            if (alasanGroup) alasanGroup.style.display = 'none';
            
            const msgContainer = getEl('msgContainer');
            if (msgContainer) msgContainer.innerHTML = '';
        }

        // ============ NAVIGASI ============

async function init(){
  afterRender();
  const params = GP.params;
  const qcParam = parseInt(params.get('qc')) || 1;
  if (qcParam === 2) setQcNumber(2); else setQcNumber(1);
  await loadPiList();
  await loadHistoryPiList();
  const materialId = params.get('material_id');
  if (materialId) {
    const selectMain = getEl('selectNoPi');
    if (selectMain) {
      for (let i = 0; i < selectMain.options.length; i++) {
        if (selectMain.options[i].dataset.id === materialId) { selectMain.value = selectMain.options[i].value; await loadMaterialByPi(); break; }
      }
    }
    const selectHistory = getEl('selectHistoryPi');
    if (selectHistory) {
      for (let i = 0; i < selectHistory.options.length; i++) {
        if (selectHistory.options[i].value === materialId) { selectHistory.value = materialId; await loadHistory(materialId); break; }
      }
    }
  }
}
NS.getEl = getEl;
NS.showMessage = showMessage;
NS.afterRender = afterRender;
NS.setQcNumber = setQcNumber;
NS.loadPiList = loadPiList;
NS.loadMaterialByPi = loadMaterialByPi;
NS.loadHistoryPiList = loadHistoryPiList;
NS.loadHistoryByPi = loadHistoryByPi;
NS.loadHistory = loadHistory;
NS.refreshHistory = refreshHistory;
NS.editQC = editQC;
NS.deleteQC = deleteQC;
NS.saveQC = saveQC;
NS.resetForm = resetForm;
NS.mount = async function(host){
  host.innerHTML = "<div class=\"gm-qc\"><div id=\"gpMain\">" + "\n        <div class=\"card\">\n            <div class=\"card-title\">\n                <span id=\"pageTitle\">\ud83d\udd2c QC Inspection <span id=\"editBadge\" class=\"edit-badge\" style=\"display:none;\">\u270f\ufe0f EDIT MODE</span></span>\n                <span id=\"qcBadge\" style=\"font-size:12px;background:#f1f5f9;padding:4px 12px;border-radius:20px;\">Pilih QC</span>\n            </div>\n            \n            <div id=\"msgContainer\"></div>\n\n            <!-- Toggle QC #1 / QC #2 -->\n            <div class=\"toggle-buttons\">\n                <button class=\"btn btn-qc1\" id=\"btnQc1\" onclick=\"GP.mods.qc.setQcNumber(1)\">\n                    \ud83d\udd2c QC #1 (Sheet)\n                </button>\n                <button class=\"btn btn-qc2\" id=\"btnQc2\" onclick=\"GP.mods.qc.setQcNumber(2)\">\n                    \ud83d\udd2c QC #2 (Pcs)\n                </button>\n            </div>\n\n            <!-- DROPDOWN 1: Untuk Proses QC -->\n            <div class=\"form-group\">\n                <label>Pilih No PI (Untuk QC) <span class=\"required\">*</span></label>\n                <select id=\"selectNoPi\" onchange=\"GP.mods.qc.loadMaterialByPi()\">\n                    <option value=\"\">-- Pilih No PI --</option>\n                </select>\n                <span class=\"small-text\" id=\"dropdownInfo\">\ud83d\udccc Hanya menampilkan material dengan status yang sesuai</span>\n            </div>\n\n            <input type=\"hidden\" id=\"materialId\">\n            <input type=\"hidden\" id=\"qcNumber\" value=\"1\">\n            <input type=\"hidden\" id=\"editId\" value=\"\">\n\n            <!-- Material Info -->\n            <div id=\"materialInfo\" class=\"material-info\" style=\"display:none;\">\n                <div style=\"font-weight:600;margin-bottom:8px;\">\ud83d\udccb Informasi Material</div>\n                <div class=\"material-info-grid\" id=\"materialInfoGrid\">\n                    <div><span class=\"label\">No PO:</span> <span class=\"value\" id=\"infoNoPo\">-</span></div>\n                    <div><span class=\"label\">No PI:</span> <span class=\"value\" id=\"infoNoPi\">-</span></div>\n                    <div><span class=\"label\">Brand:</span> <span class=\"value\" id=\"infoBrand\">-</span></div>\n                    <div><span class=\"label\">Jenis:</span> <span class=\"value\" id=\"infoJenis\">-</span></div>\n                    <div><span class=\"label\">Qty Sheet Masuk:</span> <span class=\"value\" id=\"infoQtySheet\">-</span></div>\n                    <div><span class=\"label\">Up/Sheet:</span> <span class=\"value\" id=\"infoUp\">-</span></div>\n                    <div><span class=\"label\">Target QC:</span> <span class=\"value\" id=\"infoTarget\" style=\"font-weight:bold;color:#3b82f6;\">-</span></div>\n                    <div><span class=\"label\">Satuan:</span> <span class=\"value\" id=\"infoUnit\">-</span></div>\n                    <div><span class=\"label\">Status:</span> <span class=\"value\" id=\"infoStatus\">-</span></div>\n                </div>\n            </div>\n\n            <!-- Info Unit -->\n            <div class=\"info-box\" id=\"unitInfo\" style=\"display:none;\">\n                <strong>\ud83d\udccc Informasi QC:</strong><br>\n                <span id=\"unitInfoText\">-</span>\n            </div>\n\n            <form id=\"qcForm\" onsubmit=\"return false;\">\n                <div class=\"form-row\">\n                    <div class=\"form-group\">\n                        <label>Tanggal QC <span class=\"required\">*</span></label>\n                        <input type=\"date\" id=\"tanggal_qc\" required>\n                    </div>\n                    <div class=\"form-group\">\n                        <label>Inspector <span class=\"required\">*</span></label>\n                        <input type=\"text\" id=\"inspector\" placeholder=\"Nama Inspector\" required>\n                    </div>\n                </div>\n\n                <div class=\"form-row-3\">\n                    <div class=\"form-group\">\n                        <label id=\"labelQtyOk\">Qty OK (Sheet) <span class=\"required\">*</span></label>\n                        <input type=\"number\" id=\"qty_ok\" placeholder=\"Jumlah OK\" min=\"0\" required>\n                        <span class=\"small-text\">\ud83d\udccc Maksimal: <span id=\"maxQtyOk\">-</span> <span id=\"maxUnitOk\">Sheet</span></span>\n                    </div>\n                    <div class=\"form-group\">\n                        <label id=\"labelQtyNg\">Qty NG (Sheet) <span class=\"required\">*</span></label>\n                        <input type=\"number\" id=\"qty_ng\" placeholder=\"Jumlah NG\" min=\"0\" required>\n                    </div>\n                    <div class=\"form-group\">\n                        <label id=\"labelQtyRework\">Qty Rework (Sheet)</label>\n                        <input type=\"number\" id=\"qty_rework\" placeholder=\"Jumlah Rework\" min=\"0\" value=\"0\">\n                    </div>\n                </div>\n\n                <div class=\"form-group\">\n                    <label>Hasil QC <span class=\"required\">*</span></label>\n                    <select id=\"hasil\" required>\n                        <option value=\"\">-- Pilih Hasil --</option>\n                        <option value=\"OK\">\u2705 OK</option>\n                        <option value=\"NG\">\u274c NG</option>\n                        <option value=\"REWORK\">\ud83d\udd04 REWORK</option>\n                    </select>\n                </div>\n\n                <div class=\"form-group\" id=\"alasanNgGroup\" style=\"display:none;\">\n                    <label>Alasan NG <span class=\"required\">*</span></label>\n                    <select id=\"alasan_ng\">\n                        <option value=\"\">-- Pilih Alasan --</option>\n                        <option value=\"CACAT PRINT\">CACAT PRINT</option>\n                        <option value=\"SOBEK\">SOBEK</option>\n                        <option value=\"DIMENSI SALAH\">DIMENSI SALAH</option>\n                        <option value=\"KOTOR\">KOTOR</option>\n                        <option value=\"CACAT BAHAN\">CACAT BAHAN</option>\n                        <option value=\"LAINNYA\">LAINNYA</option>\n                    </select>\n                </div>\n\n                <div class=\"form-group\">\n                    <label>Catatan</label>\n                    <textarea id=\"notes\" placeholder=\"Catatan tambahan...\"></textarea>\n                </div>\n\n                <div style=\"display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap;\">\n                    <button type=\"submit\" class=\"btn btn-success\" id=\"btnSubmit\" onclick=\"GP.mods.qc.saveQC()\" style=\"flex:2; min-width:150px;\">\n                        \ud83d\udcbe Simpan QC\n                    </button>\n                    <button type=\"reset\" class=\"btn btn-secondary\" onclick=\"GP.mods.qc.resetForm()\" style=\"flex:1; min-width:100px;\">\n                        \ud83d\udd04 Reset\n                    </button>\n                    <button type=\"button\" class=\"btn btn-back\" onclick=\"GP.go('masuk')\" style=\"flex:1; min-width:100px;\">\n                        \u2b05 Kembali\n                    </button>\n                </div>\n            </form>\n        </div>\n\n        <!-- ============================================================ -->\n        <!-- DROPDOWN RIWAYAT QC -->\n        <!-- ============================================================ -->\n        <div class=\"card\">\n            <div class=\"card-title\">\n                <span>\ud83d\udccb Riwayat QC</span>\n                <button class=\"btn btn-secondary\" onclick=\"GP.mods.qc.refreshHistory()\" style=\"padding:4px 12px; font-size:11px;\">\ud83d\udd04 Refresh</button>\n            </div>\n            \n            <div class=\"form-group\">\n                <label>Pilih No PI untuk Lihat Riwayat QC</label>\n                <select id=\"selectHistoryPi\" onchange=\"GP.mods.qc.loadHistoryByPi()\">\n                    <option value=\"\">-- Pilih No PI --</option>\n                </select>\n                <span class=\"small-text\">\ud83d\udccc Menampilkan semua No PI yang sudah pernah di-QC (QC1, QC2, DIECUT, KIRIM)</span>\n            </div>\n            \n            <div id=\"historyList\" style=\"overflow-x:auto;\">\n                <div style=\"text-align:center;padding:20px;color:#94a3b8;\">\u23f3 Memuat...</div>\n            </div>\n        </div>\n    " + "</div></div>";
  
  await init();
};
})();
