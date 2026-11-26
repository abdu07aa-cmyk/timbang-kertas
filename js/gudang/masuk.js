/* Modul Gudang: masuk */
(function(){
const sb = window.sbG, GP = window.GP;
function showToast(m,t){ GP.toast(m,t); }
function addLog(a,d){ return GP.log(a,d); }
const NS = GP.mods.masuk = {};

        async function loadPiList() {
            const { data: headers } = await sb.from('pi_header').select('*').eq('is_archived', false).order('created_at', { ascending: false });
            let options = '<option value="">-- Pilih No PI --</option>';
            if (headers) {
                for (const h of headers) {
                    options += `<option value="${h.id}">${h.no_pi} - ${h.tanggal}</option>`;
                }
            }
            document.getElementById('pi_select').innerHTML = options;
        }
        
        // ============================================================
        // TOGGLE BENTUK BARANG (SHEET/PCS) - UNTUK SINKRON KE MATERIAL TRACKING
        // ============================================================
        function toggleBentukMasuk() {
            const bentuk = document.querySelector('input[name="bentuk_masuk"]:checked');
            if (!bentuk) return;
            const value = bentuk.value;
            const labelQty = document.getElementById('labelQtyMasuk');
            const qtyInput = document.getElementById('qty_masuk');
            const upRow = document.getElementById('upSheetRow');
            const upInput = document.getElementById('up_per_sheet_masuk');
            if (!labelQty || !qtyInput || !upRow || !upInput) return;
            
            if (value === 'sheet') {
                labelQty.textContent = 'Jumlah Masuk (Sheet) — bahan mentah, tidak menambah stok';
                qtyInput.placeholder = 'Jumlah sheet masuk';
                upRow.style.display = 'block';
                upInput.required = true;
            } else {
                labelQty.textContent = 'Jumlah Masuk (Pcs)';
                qtyInput.placeholder = 'Jumlah pcs masuk';
                upRow.style.display = 'none';
                upInput.value = 1;
                upInput.required = false;
            }
            hitungTotalPcsMasuk();
        }
        
        function hitungTotalPcsMasuk() {
            const bentuk = document.querySelector('input[name="bentuk_masuk"]:checked');
            const value = bentuk ? bentuk.value : 'sheet';
            const qty = parseInt(document.getElementById('qty_masuk')?.value) || 0;
            const up = parseInt(document.getElementById('up_per_sheet_masuk')?.value) || 1;
            const totalPcs = value === 'sheet' ? (qty * up) : qty;
            const textEl = document.getElementById('totalPcsMasukText');
            if (textEl) {
                textEl.textContent = value === 'sheet'
                    ? `${qty} Sheet × ${up} = ${totalPcs.toLocaleString()} Pcs`
                    : `${totalPcs.toLocaleString()} Pcs`;
            }
            return totalPcs;
        }
        
        async function onPiChange() {
            try { loadRiwayatSemua(); } catch (e) {}
            const piId = document.getElementById('pi_select').value;
            const itemSelect = document.getElementById('item_select');
            
            if (!piId) {
                itemSelect.innerHTML = '<option value="">-- Pilih PI dulu --</option>';
                document.getElementById('historyList').innerHTML = '<div class="info-text">Pilih PI dan item untuk melihat histori</div>';
                document.getElementById('stokPendukungInfo').innerHTML = '';
                document.getElementById('stokPendukungList').innerHTML = '';
                return;
            }
            
            const { data: details } = await sb.from('pi_detail').select('*').eq('pi_id', parseInt(piId)).order('id', { ascending: true });
            
            let options = '<option value="">-- Pilih Item --</option>';
            for (const item of details) {
                options += `<option value="${item.id}">
                    ${item.brand} | ${item.jenis} | Paper:${item.paper || '-'} | Size:${item.size || '-'} | Qty PI: ${item.qty_pi}
                </option>`;
            }
            itemSelect.innerHTML = options;
        }
        
        async function onItemChange() {
            try { loadRiwayatSemua(); } catch (e) {}
            const itemId = document.getElementById('item_select').value;
            if (!itemId) {
                document.getElementById('historyList').innerHTML = '<div class="info-text">Pilih item untuk melihat histori</div>';
                document.getElementById('stokPendukungInfo').innerHTML = '';
                document.getElementById('stokPendukungList').innerHTML = '';
                return;
            }
            
            const { data: item } = await sb.from('pi_detail').select('*, pi_header(no_pi)').eq('id', parseInt(itemId)).single();
            
            // ===== LOGIKA PENCARIAN STOK =====
            let stokPendukung = [];
            let isGeneralStock = false;
            
            // STEP 1: Cari yang SAMA PERSIS (Brand + Jenis) dengan stok > 0
            if (item.brand && item.jenis) {
                const { data: exactMatch } = await sb.from('stok_pendukung')
                    .select('*')
                    .eq('brand', item.brand)
                    .eq('jenis', item.jenis)
                    .gt('stok', 0)  // Hanya stok > 0
                    .order('stok', { ascending: false });
                
                if (exactMatch && exactMatch.length > 0) {
                    stokPendukung = exactMatch;
                }
            }
            
            // STEP 2: Jika tidak ada yang sama persis, cari GENERAL STOCK
            if (stokPendukung.length === 0 && item.jenis) {
                const { data: generalStock } = await sb.from('stok_pendukung')
                    .select('*')
                    .eq('brand', 'GENERAL')
                    .eq('jenis', item.jenis)
                    .gt('stok', 0)  // Hanya stok > 0
                    .order('stok', { ascending: false });
                
                if (generalStock && generalStock.length > 0) {
                    stokPendukung = generalStock;
                    isGeneralStock = true;
                }
            }
            
            // Tampilkan daftar stok pendukung
            let listHtml = '';
            if (stokPendukung.length > 0) {
                const titleText = isGeneralStock ? '🟡 STOK UMUM (GENERAL)' : '📦 STOK PENDUKUNG TERSEDIA';
                
                listHtml = `<div class="card" style="background:#f0fdf4;border:2px solid #86efac;">
                    <div class="card-title" style="font-size:14px;">
                        ${titleText}
                        <span style="font-size:12px;color:#64748b;font-weight:normal;">
                            ${item.brand || '-'} - ${item.jenis}
                            ${isGeneralStock ? ' <span class="badge-general">GENERAL</span>' : ''}
                        </span>
                    </div>`;
                
                for (const sp of stokPendukung) {
                    const kebutuhan = item.qty_pi;
                    const stokTersedia = sp.stok;
                    let status = stokTersedia >= kebutuhan ? '✅ Cukup' : '⚠️ Kurang';
                    let statusColor = stokTersedia >= kebutuhan ? '#10b981' : '#ef4444';
                    const isGeneral = sp.brand === 'GENERAL';
                    
                    listHtml += `
                        <div class="stok-pendukung-item">
                            <div class="info">
                                <strong>${sp.brand || '-'}</strong> - ${sp.jenis || '-'}
                                ${isGeneral ? ' <span class="badge-general">GENERAL</span>' : ''}
                                <br>
                                <span style="font-size:11px;color:#64748b;">
                                    Size: ${sp.size || '-'} | Papers: ${sp.papers || '-'} | Stok: <b style="color:${statusColor};">${sp.stok}</b> | Min: ${sp.stok_minimum || 0}
                                    ${sp.lokasi ? ' | Box: ' + sp.lokasi : ''}
                                    <br>Kebutuhan PI: <b>${kebutuhan}</b> - ${status}
                                </span>
                            </div>
                            <div class="actions">
                                <input type="number" id="ambil_qty_${sp.id}" value="${Math.min(stokTersedia, kebutuhan)}" min="1" max="${stokTersedia}" style="width:70px;">
                                <button class="btn-ambil" onclick="GP.mods.masuk.ambilDariStokPendukung(${sp.id}, ${itemId})">📥 Ambil</button>
                            </div>
                        </div>
                    `;
                }
                listHtml += `</div>`;
            } else {
                listHtml = `
                    <div class="stok-info" style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b;">
                        ⚠️ TIDAK ADA STOK PENDUKUNG UNTUK:<br>
                        <strong>Brand: ${item.brand || '-'}</strong><br>
                        <strong>Jenis: ${item.jenis || '-'}</strong>
                        <br><br>
                        <span style="font-size:11px;">💡 Tips: Pastikan stok tersedia di tabel Stok Pendukung</span>
                    </div>
                `;
            }
            document.getElementById('stokPendukungList').innerHTML = listHtml;
            
            // ===== INFO STOK PENDUKUNG (SUMMARY) =====
            let stokHtml = '';
            if (stokPendukung.length > 0) {
                let totalStok = 0;
                for (const sp of stokPendukung) {
                    totalStok += sp.stok;
                }
                
                stokHtml = `
                    <div class="stok-info" style="background:#d1fae5;border:1px solid #10b981;">
                        <strong>✅ STOK TERSEDIA:</strong><br>
                        ${isGeneralStock ? '🟡 Stok Umum (GENERAL)' : '📌 Stok Khusus Brand'}
                        ${!isGeneralStock ? 'Brand: ' + item.brand : ''}
                        <br>
                        Jenis: ${item.jenis}<br>
                        Total Stok: <b style="color:#10b981;font-size:16px;">${totalStok}</b><br>
                        Kebutuhan PI: ${item.qty_pi}
                        ${totalStok >= item.qty_pi ? ' ✅ <span style="color:#10b981;">Stok mencukupi</span>' : ' ⚠️ <span style="color:#ef4444;">Stok kurang!</span>'}
                    </div>
                `;
            } else {
                stokHtml = `
                    <div class="stok-info" style="background:#fef3c7;border:1px solid #f59e0b;">
                        ⚠️ Stok pendukung untuk <strong>${item.brand} - ${item.jenis}</strong> tidak tersedia.
                        <br><span style="font-size:11px;">Cek ketersediaan di tabel Stok Pendukung.</span>
                    </div>
                `;
            }
            document.getElementById('stokPendukungInfo').innerHTML = stokHtml;
            
            // Refresh histori
            filterHistory(itemId);
        }
        
        let currentItemId = null;
        
        async function filterHistory(itemId) {
            if (!itemId) return;
            currentItemId = itemId;
            
            const tglAwal = document.getElementById('filter_tgl_awal').value;
            const tglAkhir = document.getElementById('filter_tgl_akhir').value;
            
            let query = sb.from('barang_masuk').select('*').eq('detail_id', parseInt(itemId)).order('tanggal', { ascending: false });
            
            if (tglAwal) query = query.gte('tanggal', tglAwal);
            if (tglAkhir) query = query.lte('tanggal', tglAkhir);
            
            const { data: history } = await query;
            
            const { data: item } = await sb.from('pi_detail').select('*, pi_header(no_pi)').eq('id', parseInt(itemId)).single();
            
            if (!history || history.length === 0) {
                document.getElementById('historyList').innerHTML = '<div class="info-text">Belum ada histori barang masuk untuk periode ini</div>';
                return;
            }
            
            let totalMasuk = 0;
            history.forEach(h => { if (!String(h.keterangan||'').startsWith('[📄')) totalMasuk += h.qty; });
            
            let html = `
                <div class="info-text" style="margin-bottom:15px;padding:10px;background:#e0f2fe;border-radius:8px">
                    <strong>📄 Informasi Item:</strong><br>
                    No PI: ${item.pi_header.no_pi}<br>
                    Brand: ${item.brand}<br>
                    Jenis: ${item.jenis}<br>
                    Paper: ${item.paper || '-'}<br>
                    Size: ${item.size || '-'}<br>
                    Qty PI: ${item.qty_pi}<br>
                    📊 Total Masuk ke stok (periode): <strong style="color:#10b981">${totalMasuk}</strong> | Jumlah Transaksi: ${history.length}
                </div>
                <div class="table-wrapper">
                    <table style="width:100%">
                        <thead>
                            <tr><th>Tanggal</th><th>Qty</th><th>Keterangan</th><th>Aksi</th></tr>
                        </thead>
                        <tbody>`;
            
            for (const h of history) {
                html += `<tr>
                    <td>${h.tanggal}</td>
                    <td>${String(h.keterangan||'').startsWith('[📄') ? '<span style="font-weight:bold;color:#64748b">'+h.qty+'</span><br><span style="font-size:10px;background:#e2e8f0;color:#475569;border-radius:8px;padding:1px 6px">bahan mentah · tidak masuk stok</span>' : '<span style="font-weight:bold;color:#10b981">+'+h.qty+'</span>'}</td>
                    <td>${h.keterangan || '-'}</td>
                    <td style="white-space:nowrap"><button class="btn-edit" onclick="GP.mods.masuk.editMasuk(${h.id})">✏️ Edit</button> <button class="btn-hapus" onclick="GP.mods.masuk.hapusHistory(${h.id}, ${itemId})">Hapus</button></td>
                </tr>`;
            }
            
            html += `</tbody></table></div>`;
            document.getElementById('historyList').innerHTML = html;
        }
        
        async function hapusHistory(id, itemId) {
            const { data: row } = await sb.from('barang_masuk').select('*').eq('id', id).single();
            if (!row) { alert('Data histori tidak ditemukan!'); return; }
            
            const dariStokPendukung = (row.keterangan || '').startsWith('Ambil dari stok pendukung');
            
            // ===== KASUS 1: histori biasa (bukan dari Stok Pendukung) =====
            if (!dariStokPendukung) {
                if (!confirm('Yakin ingin menghapus histori ini?')) return;
                const { error } = await sb.from('barang_masuk').delete().eq('id', id);
                if (error) { alert('Gagal menghapus: ' + error.message); return; }
                await addLog('HAPUS HISTORI', `Menghapus histori barang masuk ID ${id}`);
                alert('Histori berhasil dihapus');
                await onItemChange();
                return;
            }
            
            // ===== KASUS 2: histori hasil "Ambil dari Stok Pendukung" → stok dikembalikan =====
            const { data: detailItem } = await sb.from('pi_detail').select('*, pi_header(no_pi)').eq('id', row.detail_id).single();
            const noPi = detailItem?.pi_header?.no_pi || '-';
            
            // Cari catatan pengambilan asli di histori stok pendukung (untuk tahu stok mana yang harus dikembalikan)
            const { data: caris } = await sb.from('histori_stok_pendukung')
                .select('*')
                .eq('jenis', 'KELUAR')
                .eq('qty', row.qty)
                .eq('keterangan', `Diambil untuk PI ${noPi} - ${detailItem?.brand} ${detailItem?.jenis}`)
                .order('id', { ascending: false })
                .limit(1);
            const asal = caris && caris.length > 0 ? caris[0] : null;
            
            let stokAsal = null;
            if (asal) {
                const { data: sp } = await sb.from('stok_pendukung').select('*').eq('id', asal.stok_pendukung_id).single();
                stokAsal = sp;
            }
            
            if (!stokAsal) {
                if (!confirm(`Histori ini berasal dari Stok Pendukung, tapi stok asalnya tidak ditemukan otomatis.\n\nJika dihapus, ${row.qty} TIDAK akan kembali ke Stok Pendukung otomatis (harus ditambah manual di menu Stok Pendukung).\n\nTetap hapus?`)) return;
                const { error } = await sb.from('barang_masuk').delete().eq('id', id);
                if (error) { alert('Gagal menghapus: ' + error.message); return; }
                await addLog('HAPUS HISTORI', `Menghapus histori barang masuk ID ${id} (dari stok pendukung, stok TIDAK dikembalikan otomatis)`);
                alert('Histori dihapus. Ingat: stok belum dikembalikan otomatis.');
                await onItemChange();
                return;
            }
            
            const namaStok = `${stokAsal.brand || 'GENERAL'} - ${stokAsal.jenis}`;
            if (!confirm(`Hapus histori ini dan KEMBALIKAN ${row.qty} ke Stok Pendukung "${namaStok}"?\n\nStok sekarang: ${stokAsal.stok} → menjadi ${stokAsal.stok + row.qty}`)) return;
            
            const { data: { user } } = await sb.auth.getUser();
            
            const { error: delErr } = await sb.from('barang_masuk').delete().eq('id', id);
            if (delErr) { alert('Gagal menghapus: ' + delErr.message); return; }
            
            // Baca stok terbaru lalu tambahkan kembali
            const { data: spTerbaru } = await sb.from('stok_pendukung').select('stok').eq('id', stokAsal.id).single();
            const stokBaru = (spTerbaru?.stok ?? stokAsal.stok) + row.qty;
            const { error: updErr } = await sb.from('stok_pendukung').update({ stok: stokBaru }).eq('id', stokAsal.id);
            if (updErr) {
                alert('Histori sudah dihapus, tapi GAGAL mengembalikan stok: ' + updErr.message + '\nTambahkan ' + row.qty + ' manual di menu Stok Pendukung.');
                return;
            }
            
            await sb.from('histori_stok_pendukung').insert([{
                stok_pendukung_id: stokAsal.id,
                jenis: 'MASUK',
                qty: row.qty,
                keterangan: `Dikembalikan (batal ambil untuk PI ${noPi} - ${detailItem?.brand} ${detailItem?.jenis})`,
                created_by: user.email
            }]);
            
            await addLog('BATAL AMBIL STOK PENDUKUNG', `${user.email} membatalkan pengambilan ${row.qty} dari ${namaStok} untuk PI ${noPi}, stok dikembalikan`);
            alert(`✅ Histori dihapus dan ${row.qty} dikembalikan ke Stok Pendukung.\nStok ${namaStok} sekarang: ${stokBaru}`);
            await onItemChange();
        }
        
        async function simpanMasuk() {
            const piId = document.getElementById('pi_select').value;
            const itemId = document.getElementById('item_select').value;
            const qtyInputRaw = document.getElementById('qty_masuk').value;
            const tanggal = document.getElementById('tanggal_masuk').value;
            const keterangan = document.getElementById('keterangan').value;
            const supplier = document.getElementById('supplier_masuk')?.value?.trim() || '';
            const suratJalan = document.getElementById('surat_jalan_masuk')?.value?.trim() || '';
            const bentukEl = document.querySelector('input[name="bentuk_masuk"]:checked');
            const bentuk = bentukEl ? bentukEl.value : 'sheet';
            const upPerSheet = parseInt(document.getElementById('up_per_sheet_masuk')?.value) || 1;
            
            if (!piId || !itemId || !qtyInputRaw || !tanggal) {
                document.getElementById('msgTransaksi').innerHTML = '<div class="alert alert-error">Pilih PI, Item, isi Qty dan Tanggal!</div>';
                return;
            }
            
            const qtyInput = parseInt(qtyInputRaw);
            if (qtyInput <= 0) {
                document.getElementById('msgTransaksi').innerHTML = '<div class="alert alert-error">Qty harus lebih dari 0!</div>';
                return;
            }
            if (bentuk === 'sheet' && upPerSheet < 1) {
                document.getElementById('msgTransaksi').innerHTML = '<div class="alert alert-error">Up/Sheet harus lebih dari 0!</div>';
                return;
            }
            
            // Total dalam PCS - inilah yang disimpan ke barang_masuk (konsisten dengan Dashboard & Stok Gudang)
            const totalPcs = bentuk === 'sheet' ? (qtyInput * upPerSheet) : qtyInput;
            
            // Catatan asal satuan, otomatis ditempel ke keterangan biar kelihatan di histori
            const asalSatuan = bentuk === 'sheet'
                ? `[📄 ${qtyInput} Sheet × ${upPerSheet} Up]`
                : `[📦 ${qtyInput} Pcs langsung]`;
            const keteranganFinal = keterangan ? `${asalSatuan} ${keterangan}` : asalSatuan;
            
            const { data: { user } } = await sb.auth.getUser();
            const { data: item } = await sb.from('pi_detail').select('*, pi_header(no_pi)').eq('id', parseInt(itemId)).single();
            const noPi = item?.pi_header?.no_pi || '-';
            const itemInfo = `${noPi} - ${item?.brand} - ${item?.jenis}`;
            
            const { error } = await sb.from('barang_masuk').insert([{
                detail_id: parseInt(itemId),
                tanggal: tanggal,
                qty: totalPcs,
                keterangan: keteranganFinal,
                created_by: user.email
            }]);
            
            if (error) {
                document.getElementById('msgTransaksi').innerHTML = '<div class="alert alert-error">' + error.message + '</div>';
                return;
            }
            
            await addLog('BARANG MASUK', `${user.email} mencatat barang masuk ${totalPcs} pcs untuk ${itemInfo}`);
            
            // ✅ OTOMATIS BUAT JUGA DI MATERIAL TRACKING (status DITERIMA) - biar tidak input dobel
            let trackingMsg = '';
            try {
                const { error: miError } = await sb.from('material_inbound').insert([{
                    no_pi: noPi,
                    no_po: '-',
                    surat_jalan: suratJalan || '-',
                    tanggal_terima: tanggal,
                    supplier: supplier || '',
                    brand: item?.brand || '',
                    jenis: item?.jenis || '',
                    paper: item?.paper || '',
                    size: item?.size || '',
                    qty_sheet: bentuk === 'sheet' ? qtyInput : 0,
                    up_per_sheet: bentuk === 'sheet' ? upPerSheet : 1,
                    qty_masuk: qtyInput,
                    qty_pi: item?.qty_pi || 0,
                    status: 'DITERIMA',
                    notes: keterangan || null,
                    created_by: user.email,
                    qty_pi_sheet: bentuk === 'sheet' ? qtyInput : null,
                    qty_pi_pcs: bentuk === 'pcs' ? qtyInput : null,
                    pi_id: piId,
                    pi_detail_id: parseInt(itemId)
                }]);
                if (miError) throw miError;
                trackingMsg = ' + Otomatis masuk ke Material Tracking!';
            } catch (miErr) {
                trackingMsg = ' (⚠️ Gagal sinkron ke Material Tracking: ' + miErr.message + ')';
            }
            
            document.getElementById('msgTransaksi').innerHTML = '<div class="alert alert-success">✅ Barang Masuk dicatat!' + trackingMsg + '</div>';
            document.getElementById('qty_masuk').value = '';
            document.getElementById('keterangan').value = '';
            document.getElementById('supplier_masuk').value = '';
            document.getElementById('surat_jalan_masuk').value = '';
            hitungTotalPcsMasuk();
            await onItemChange();
        }
        
        // FUNGSI: Ambil dari Stok Pendukung
        async function ambilDariStokPendukung(stokId, detailId) {
            const qtyInput = document.getElementById(`ambil_qty_${stokId}`);
            const qty = parseInt(qtyInput.value);
            
            if (!qty || qty <= 0) {
                alert('Masukkan jumlah yang valid!');
                return;
            }
            
            const { data: stokItem } = await sb.from('stok_pendukung').select('*').eq('id', stokId).single();
            if (!stokItem) {
                alert('Stok pendukung tidak ditemukan!');
                return;
            }
            
            if (qty > stokItem.stok) {
                alert(`Stok tidak mencukupi! Stok tersedia: ${stokItem.stok}`);
                return;
            }
            
            const { data: detailItem } = await sb.from('pi_detail').select('*, pi_header(no_pi)').eq('id', parseInt(detailId)).single();
            if (!detailItem) {
                alert('Item PI tidak ditemukan!');
                return;
            }
            
            const brandDisplay = stokItem.brand || 'GENERAL';
            const confirmMsg = `Ambil ${qty} dari stok pendukung "${brandDisplay} - ${stokItem.jenis}" (Stok: ${stokItem.stok}) untuk item "${detailItem.brand} - ${detailItem.jenis}"?`;
            if (!confirm(confirmMsg)) return;
            
            const { data: { user } } = await sb.auth.getUser();
            const tanggal = document.getElementById('tanggal_masuk').value || new Date().toISOString().split('T')[0];
            
            try {
                // 1. Kurangi stok pendukung
                const newStok = stokItem.stok - qty;
                const { error: updateError } = await sb.from('stok_pendukung')
                    .update({ stok: newStok })
                    .eq('id', stokId);
                
                if (updateError) throw new Error('Gagal update stok pendukung: ' + updateError.message);
                
                // 2. Catat ke histori stok pendukung (KELUAR)
                await sb.from('histori_stok_pendukung').insert([{
                    stok_pendukung_id: stokId,
                    jenis: 'KELUAR',
                    qty: qty,
                    keterangan: `Diambil untuk PI ${detailItem.pi_header.no_pi} - ${detailItem.brand} ${detailItem.jenis}`,
                    created_by: user.email
                }]);
                
                // 3. Catat ke barang masuk
                const itemInfo = `${detailItem.pi_header.no_pi} - ${detailItem.brand} - ${detailItem.jenis}`;
                const brandDisplay2 = stokItem.brand || 'GENERAL';
                const { error: masukError } = await sb.from('barang_masuk').insert([{
                    detail_id: parseInt(detailId),
                    tanggal: tanggal,
                    qty: qty,
                    keterangan: `Ambil dari stok pendukung: ${brandDisplay2} - ${stokItem.jenis} ${stokItem.papers ? '| Papers: ' + stokItem.papers : ''}`,
                    created_by: user.email
                }]);
                
                if (masukError) throw new Error('Gagal mencatat barang masuk: ' + masukError.message);
                
                // 4. Log aktivitas
                await addLog('AMBIL STOK PENDUKUNG', `${user.email} mengambil ${qty} dari ${brandDisplay2} - ${stokItem.jenis} untuk ${itemInfo}`);
                
                alert(`✅ Berhasil mengambil ${qty} dari stok pendukung!\nStok ${brandDisplay2} - ${stokItem.jenis} sekarang: ${newStok}`);
                
                await onItemChange();
                
            } catch (error) {
                alert('❌ Gagal: ' + error.message);
            }
        }
        
        async function exportHistory() {
            if (!currentItemId) {
                alert('Pilih item terlebih dahulu!');
                return;
            }
            
            const tglAwal = document.getElementById('filter_tgl_awal').value;
            const tglAkhir = document.getElementById('filter_tgl_akhir').value;
            
            let query = sb.from('barang_masuk').select('*, pi_detail(brand, jenis, pi_header(no_pi))').eq('detail_id', currentItemId).order('tanggal', { ascending: false });
            if (tglAwal) query = query.gte('tanggal', tglAwal);
            if (tglAkhir) query = query.lte('tanggal', tglAkhir);
            
            const { data: history } = await query;
            
            if (!history || history.length === 0) {
                alert('Tidak ada data untuk periode ini');
                return;
            }
            
            const wsData = [['Tanggal', 'Qty', 'Keterangan', 'User']];
            for (const h of history) {
                wsData.push([h.tanggal, h.qty, h.keterangan || '-', h.created_by || '-']);
            }
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Barang Masuk');
            XLSX.writeFile(wb, `Riwayat_Barang_Masuk_${new Date().toISOString().slice(0,10)}.xlsx`);
            alert('✅ Export berhasil!');
        }
        
        async function loadHalaman() {
            const today = new Date().toISOString().split('T')[0];
            const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
            
            document.getElementById('gpMain').innerHTML = `
                <div class="card">
                    <div class="card-title">📥 Barang Masuk</div>
                    <div id="msgTransaksi"></div>
                    
                    <label>Pilih No PI</label>
                    <select id="pi_select" onchange="GP.mods.masuk.onPiChange()">
                        <option value="">Loading...</option>
                    </select>
                    
                    <label>Pilih Item Barang</label>
                    <select id="item_select" onchange="GP.mods.masuk.onItemChange()">
                        <option value="">-- Pilih PI dulu --</option>
                    </select>
                    
                    <div id="stokPendukungInfo"></div>
                    <div id="stokPendukungList"></div>
                    
                    <hr style="margin:15px 0;border-color:#e2e8f0;">
                    
                    <label>Tanggal Masuk</label>
                    <input type="date" id="tanggal_masuk" value="${today}">
                    
                    <label>Bentuk Barang</label>
                    <div style="display:flex;gap:16px;margin:5px 0 10px 0;font-size:14px;">
                        <label style="display:flex;align-items:center;gap:6px;width:auto;"><input type="radio" name="bentuk_masuk" value="sheet" checked onchange="GP.mods.masuk.toggleBentukMasuk()" style="width:auto;margin:0;"> 📄 Sheet</label>
                        <label style="display:flex;align-items:center;gap:6px;width:auto;"><input type="radio" name="bentuk_masuk" value="pcs" onchange="GP.mods.masuk.toggleBentukMasuk()" style="width:auto;margin:0;"> 📦 Pcs</label>
                    </div>
                    
                    <label id="labelQtyMasuk">Jumlah Masuk (Sheet)</label>
                    <input type="number" id="qty_masuk" placeholder="Jumlah sheet masuk" oninput="GP.mods.masuk.hitungTotalPcsMasuk()">
                    
                    <div id="upSheetRow">
                        <label>Up / Sheet (pcs per lembar)</label>
                        <input type="number" id="up_per_sheet_masuk" placeholder="Contoh: 20" value="1" min="1" oninput="GP.mods.masuk.hitungTotalPcsMasuk()">
                    </div>
                    
                    <div class="stok-info" id="calcInfoMasuk" style="background:#e0f2fe;">
                        📊 Total: <b id="totalPcsMasukText">0 Pcs</b>
                    </div>
                    
                    <label>Supplier (opsional)</label>
                    <input type="text" id="supplier_masuk" placeholder="Nama supplier">
                    
                    <label>No Surat Jalan / DO (opsional)</label>
                    <input type="text" id="surat_jalan_masuk" placeholder="No surat jalan">
                    
                    <label>Keterangan (opsional)</label>
                    <input type="text" id="keterangan" placeholder="Keterangan">
                    
                    <button onclick="GP.mods.masuk.simpanMasuk()">📥 Simpan Barang Masuk</button>
                    <span class="info-text">✅ Otomatis tercatat juga di Material Tracking (status DITERIMA) — tidak perlu input ulang di Material Masuk.</span>
                </div>
                
                <div class="card">
                    <div class="card-title">📋 Histori Barang Masuk</div>
                    <div class="filter-row">
                        <input type="date" id="filter_tgl_awal" value="${firstDay}" placeholder="Dari tanggal">
                        <input type="date" id="filter_tgl_akhir" value="${today}" placeholder="Sampai tanggal">
                        <button class="btn-export" onclick="GP.mods.masuk.exportHistory()" style="background:#10b981">📎 Export</button>
                    </div>
                    <div id="historyList">
                        <div class="info-text">Pilih PI dan item untuk melihat histori</div>
                    </div>
                </div>
            `;
            
            document.getElementById('filter_tgl_awal').addEventListener('change', () => {
                if (currentItemId) filterHistory(currentItemId);
            });
            document.getElementById('filter_tgl_akhir').addEventListener('change', () => {
                if (currentItemId) filterHistory(currentItemId);
            });
            
            toggleBentukMasuk();
            
            await loadPiList();
            await loadRiwayatSemua();
        }
let trackData = [];
        async function loadTracking() {
            const container = document.getElementById('trackList'); if (!container) return;
            container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">⏳ Memuat...</div>';
            
            const { data, error } = await sb
                .from('material_inbound')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;">❌ Error: ${error.message}</div>`;
                return;
            }
            
            trackData = data || [];
            
            if (trackData.length === 0) {
                container.innerHTML = `<div style="text-align:center;padding:20px;color:#94a3b8;">📭 Belum ada barang masuk</div>`;
                return;
            }
            
            const statusMap = {
                'DITERIMA': '📥 Diterima',
                'QC1': '🔬 QC #1',
                'DIECUT': '⚙️ Diecut',
                'QC2': '🔬 QC #2',
                'KIRIM': '🏭 Kirim'
            };
            
            const statusClass = {
                'DITERIMA': 'status-diterima',
                'QC1': 'status-qc1',
                'DIECUT': 'status-diecut',
                'QC2': 'status-qc2',
                'KIRIM': 'status-kirim'
            };
            
            let html = `
                <div style="overflow-x:auto;">
                <table>
                    <thead>
                        <tr>
                            <th style="min-width:70px;">No PI</th>
                            <th style="min-width:80px;">Brand</th>
                            <th style="min-width:80px;">Jenis</th>
                            <th style="min-width:100px;">Paper</th>
                            <th style="min-width:50px;">Size</th>
                            <th style="text-align:center;min-width:60px;">Qty PI</th>
                            <th style="text-align:center;min-width:55px;">Sheet</th>
                            <th style="text-align:center;min-width:45px;">Up</th>
                            <th style="text-align:center;min-width:60px;">Pcs</th>
                            <th style="text-align:center;min-width:100px;">Status</th>
                            <th style="min-width:100px;">Supplier</th>
                            <th style="min-width:90px;">DO/SJ No</th>
                            <th style="text-align:center;min-width:90px;">Tgl Terima</th>
                            <th style="min-width:80px;">Catatan</th>
                            <th style="text-align:center;min-width:180px;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            for (const item of trackData) {
                const totalPcs = (item.qty_sheet || 0) * (item.up_per_sheet || 1) || item.qty_masuk || 0;
                const tanggal = item.tanggal_terima ? new Date(item.tanggal_terima).toLocaleDateString('id-ID') : '-';
                
                html += `
                    <tr>
                        <td><strong>${item.no_pi || '-'}</strong></td>
                        <td>${item.brand || '-'}</td>
                        <td>${item.jenis || '-'}</td>
                        <td style="font-size:11px;">${item.paper || '-'}</td>
                        <td>${item.size || '-'}</td>
                        <td style="text-align:center;">${item.qty_pi || 0}</td>
                        <td style="text-align:center;">${item.qty_sheet || 0}</td>
                        <td style="text-align:center;">${item.up_per_sheet || 1}</td>
                        <td style="text-align:center; font-weight:bold; color:#3b82f6;">${totalPcs}</td>
                        <td style="text-align:center;">
                            <span class="status-badge ${statusClass[item.status] || 'status-diterima'}">
                                ${statusMap[item.status] || item.status || 'DITERIMA'}
                            </span>
                        </td>
                        <td style="font-size:11px;">${item.supplier || '-'}</td>
                        <td style="font-size:11px;">${item.surat_jalan || '-'}</td>
                        <td style="text-align:center; font-size:11px; color:#64748b;">${tanggal}</td>
                        <td style="font-size:11px; max-width:80px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${item.notes || '-'}
                        </td>
                        <td style="text-align:center; white-space:nowrap;">
                            <button class="btn-small btn-detail" onclick="GP.mods.masuk.showDetail('${item.id}')" title="Detail">📋</button>
                            ${item.status === 'DITERIMA' ? 
                                `<button class="btn-small btn-qc" onclick="GP.mods.masuk.goToQC('${item.id}')" title="QC #1">🔬</button>` : ''}
                            ${item.status === 'QC1' ? 
                                `<button class="btn-small btn-diecut" onclick="GP.mods.masuk.goToDiecut('${item.id}')" title="Diecut">⚙️</button>` : ''}
                            ${item.status === 'DIECUT' ? 
                                `<button class="btn-small btn-qc" onclick="GP.mods.masuk.goToQC2('${item.id}')" title="QC #2">🔬</button>` : ''}
                            ${item.status === 'QC2' ? 
                                `<button class="btn-small btn-send" onclick="GP.mods.masuk.goToSend('${item.id}')" title="Kirim Produksi">🏭</button>` : ''}
                            <button class="btn-small btn-delete" onclick="GP.mods.masuk.deleteMaterial('${item.id}')" title="Hapus">🗑️</button>
                        </td>
                    </tr>
                `;
            }
            
            html += `
                    </tbody>
                </table>
                </div>
                <div style="margin-top:10px;font-size:12px;color:#94a3b8;text-align:center;">
                    Total: ${trackData.length} data
                </div>
            `;
            
            container.innerHTML = html;
        }
        async function showDetail(id) {
            const { data: item } = await sb.from('material_inbound').select('*').eq('id', id).single();
            if (!item) return;
            
            const statusMap = {
                'DITERIMA': '📥 Diterima',
                'QC1': '🔬 QC #1',
                'DIECUT': '⚙️ Diecut',
                'QC2': '🔬 QC #2',
                'KIRIM': '🏭 Kirim'
            };
            
            const statusClass = {
                'DITERIMA': 'status-diterima',
                'QC1': 'status-qc1',
                'DIECUT': 'status-diecut',
                'QC2': 'status-qc2',
                'KIRIM': 'status-kirim'
            };
            
            const totalPcs = (item.qty_sheet || 0) * (item.up_per_sheet || 1) || item.qty_masuk || 0;
            const tanggal = item.tanggal_terima ? new Date(item.tanggal_terima).toLocaleDateString('id-ID') : '-';
            
            let html = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
                    <div><strong>No PI:</strong></div>
                    <div>${item.no_pi || '-'}</div>
                    
                    <div><strong>Brand:</strong></div>
                    <div>${item.brand || '-'}</div>
                    
                    <div><strong>Jenis:</strong></div>
                    <div>${item.jenis || '-'}</div>
                    
                    <div><strong>Paper:</strong></div>
                    <div>${item.paper || '-'}</div>
                    
                    <div><strong>Size:</strong></div>
                    <div>${item.size || '-'}</div>
                    
                    <div><strong>Qty PI:</strong></div>
                    <div>${item.qty_pi || 0} Pcs</div>
                    
                    <div><strong>Qty Sheet:</strong></div>
                    <div>${item.qty_sheet || 0}</div>
                    
                    <div><strong>Up/Sheet:</strong></div>
                    <div>${item.up_per_sheet || 1}</div>
                    
                    <div><strong>Total Pcs:</strong></div>
                    <div><strong style="color:#3b82f6;">${totalPcs}</strong> Pcs</div>
                    
                    <div><strong>Supplier:</strong></div>
                    <div>${item.supplier || '-'}</div>
                    
                    <div><strong>No Surat Jalan/DO:</strong></div>
                    <div>${item.surat_jalan || '-'}</div>
                    
                    <div><strong>Status:</strong></div>
                    <div>
                        <span class="status-badge ${statusClass[item.status] || 'status-diterima'}">
                            ${statusMap[item.status] || item.status || 'DITERIMA'}
                        </span>
                    </div>
                    
                    <div><strong>Tanggal Terima:</strong></div>
                    <div>${tanggal}</div>
                    
                    <div><strong>Catatan:</strong></div>
                    <div>${item.notes || '-'}</div>
                    
                    <div><strong>Created By:</strong></div>
                    <div>${item.created_by || '-'}</div>
                    
                    <div><strong>Created At:</strong></div>
                    <div>${item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-'}</div>
                </div>
            `;
            
            document.getElementById('detailTitle').innerText = `📋 Detail - ${item.no_pi} (${item.brand})`;
            document.getElementById('detailContent').innerHTML = html;
            document.getElementById('detailModal').style.display = 'flex';
        }
        async function deleteMaterial(id) {
            if (!confirm('Yakin ingin menghapus material ini?')) return;
            
            await sb.from('ng_tracking').delete().eq('material_inbound_id', id);
            await sb.from('qc_inspection').delete().eq('material_inbound_id', id);
            await sb.from('diecut_process').delete().eq('material_inbound_id', id);
            await sb.from('production_send').delete().eq('material_inbound_id', id);
            
            const { error } = await sb.from('material_inbound').delete().eq('id', id);
            if (error) {
                showToast('❌ Gagal: ' + error.message, 'error');
            } else {
                showToast('✅ Material berhasil dihapus', 'success');
                loadTracking();
            }
        }
        function closeModal(id) {
            document.getElementById(id).style.display = 'none';
        }
function goToQC(id) { GP.go('qc', { material_id: id, qc: 1 }); }
function goToQC2(id) { GP.go('qc', { material_id: id, qc: 2 }); }
function goToDiecut(id) { GP.go('diecut', { material_id: id }); }
function goToSend(id) { showToast('Menu Kirim Produksi akan ditambahkan di tahap berikutnya.', 'info'); }

// ===== Kertas dari Timbangan (nota serah terima Disepakati) -> Barang Masuk =====
let tbRows = [], tbDetails = {}, tbCur = null;
const tbEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tbU = s => String(s == null ? '' : s).trim().toUpperCase();
const tbCanon = s => String(s || '').trim().split(/[\s(]/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
const tbN = n => Number(n || 0).toLocaleString('id-ID');
async function loadTimbangan() {
  const host = document.getElementById('gpMain'); if (!host) return;
  let card = document.getElementById('tbCard');
  if (!card) { host.insertAdjacentHTML('afterbegin', '<div class="card" id="tbCard"><div class="card-title"><span>📦 Kertas dari Timbangan (menunggu diterima)</span><button class="btn-export" onclick="GP.mods.masuk.loadTimbangan()" style="width:auto;padding:6px 12px;font-size:12px;">🔄 Refresh</button></div><div id="tbList"></div></div>'); }
  const el = document.getElementById('tbList');
  const tsb = GP.tsb;
  if (!tsb) { el.innerHTML = '<div class="info-text">Data Timbangan tidak tersedia.</div>'; return; }
  el.innerHTML = '<div class="info-text">⏳ Memuat...</div>';
  const { data: notas, error } = await tsb.from('serah_terima').select('id,no_dokumen,no_pi,brand,jenis_kertas,watermark,size_kertas,gsm,leaves,total_bundles,status,admin_setuju_at').eq('status', 'Disepakati').order('id', { ascending: false }).limit(200);
  if (error) { el.innerHTML = '<div style="color:#b91c1c">❌ ' + tbEsc(error.message) + '</div>'; return; }
  const docs = (notas || []).map(n => n.no_dokumen);
  let sudah = new Set();
  if (docs.length) {
    const { data: mi } = await sb.from('material_inbound').select('surat_jalan').in('surat_jalan', docs);
    sudah = new Set((mi || []).map(x => x.surat_jalan));
  }
  tbRows = (notas || []).filter(n => !sudah.has(n.no_dokumen));
  if (!tbRows.length) { el.innerHTML = '<div class="info-text">✅ Tidak ada kertas yang menunggu. Nota yang sudah Disepakati akan muncul di sini.</div>'; return; }
  el.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;border-bottom:2px solid #e2e8f0"><th style="padding:6px">No. Nota</th><th>PI / Brand</th><th>Kertas</th><th>Bundle</th><th></th></tr></thead><tbody>' +
    tbRows.map((n, i) => `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px">${tbEsc(n.no_dokumen)}</td><td>${tbEsc(n.no_pi)}<br>${tbEsc(n.brand)}</td><td>${tbEsc(n.jenis_kertas)} · ${tbEsc(n.watermark)}<br>${tbEsc(n.size_kertas)} · ${n.gsm}gsm · ${n.leaves}lv</td><td><b>${tbN(n.total_bundles)}</b></td><td><button class="btn-small" onclick="GP.mods.masuk.terimaTimbangan(${i})">📥 Terima</button></td></tr>`).join('') + '</tbody></table></div>';
}
async function terimaTimbangan(i) {
  const n = tbRows[i]; if (!n) return;
  const { data: hs } = await sb.from('pi_header').select('id,no_pi').eq('is_archived', false);
  const cands = (hs || []).filter(x => tbCanon(x.no_pi) === tbCanon(n.no_pi));
  const h = cands.find(x => String(x.no_pi).toUpperCase().includes(String(n.brand || '').toUpperCase())) || cands[0];
  if (!h) { alert(`❌ No. PI ${n.no_pi} tidak ditemukan di Input PI. Buat/cek PI-nya dulu.`); return; }
  const { data: dets } = await sb.from('pi_detail').select('*').eq('pi_id', h.id).order('id');
  if (!dets || !dets.length) { alert('❌ PI ini belum punya item.'); return; }
  const hasG = dets.some(d => d.gsm != null);
  const cocok = dets.filter(d => (tbU(d.paper || d.jenis) === tbU(n.jenis_kertas) || tbU(GP.kertasNama ? GP.kertasNama(d.paper, d.jenis) : '') === tbU(n.jenis_kertas)) && tbU(GP.sizeNama ? GP.sizeNama(d.size) : d.size) === tbU(n.size_kertas) && (!hasG || (Number(d.gsm) === Number(n.gsm) && Number(d.leaves) === Number(n.leaves))));
  tbCur = { n, h, dets, pre: cocok.length === 1 ? cocok[0].id : (dets.length === 1 ? dets[0].id : '') };
  const old = document.getElementById('tbModal'); if (old) old.remove();
  document.getElementById('gpHost').insertAdjacentHTML('beforeend', `<div id="tbModal" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:3000;display:flex;align-items:center;justify-content:center;padding:12px"><div style="background:#fff;border-radius:14px;padding:18px;max-width:460px;width:100%;max-height:92vh;overflow:auto" class="gm-masuk">
    <h3 style="margin:0 0 6px">📥 Terima dari Timbangan</h3>
    <div style="font-size:13px;color:#475569;margin-bottom:10px">Nota <b>${tbEsc(n.no_dokumen)}</b> · PI <b>${tbEsc(n.no_pi)}</b><br>${tbEsc(n.jenis_kertas)} · ${tbEsc(n.size_kertas)} · ${n.gsm}gsm · ${n.leaves}lv · ${tbN(n.total_bundles)} bundle</div>
    <div id="tbItemWrap"><label>Item di Input PI</label><select id="tbItem">${!tbCur.pre ? '<option value="">-- pilih item --</option>' : ''}${dets.map(d => `<option value="${d.id}"${String(d.id) === String(tbCur.pre) ? ' selected' : ''}>${tbEsc(d.brand)} | ${tbEsc(d.jenis)} | ${tbEsc(d.paper || '')} | ${tbEsc(d.size || '')}</option>`).join('')}</select></div>
    <label>Jumlah bundle diterima</label><input type="number" id="tbBundle" value="${n.total_bundles}" min="1">
    <label>Tanggal terima</label><input type="date" id="tbTgl" value="${new Date().toISOString().split('T')[0]}">
    <div id="tbMsg" style="margin-top:8px;font-size:13px"></div>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="btn-cancel" style="flex:1" onclick="GP.mods.masuk.tutupTerima()">Batal</button><button id="tbSave" style="flex:2" onclick="GP.mods.masuk.simpanTerima()">💾 Simpan ke Barang Masuk</button></div></div></div>`);
  if (tbCur.pre) document.getElementById('tbItemWrap').style.display = 'none';
}
function tutupTerima() { const m = document.getElementById('tbModal'); if (m) m.remove(); tbCur = null; }
async function simpanTerima() {
  if (!tbCur) return;
  const n = tbCur.n, msg = document.getElementById('tbMsg'), btn = document.getElementById('tbSave');
  const itemId = parseInt(document.getElementById('tbItem').value), sheet = parseInt(document.getElementById('tbBundle').value), up = 1, tgl = document.getElementById('tbTgl').value;
  const bad = t => { msg.style.color = '#b91c1c'; msg.textContent = t; };
  if (!itemId) return bad('Pilih item PI');
  if (!(sheet > 0)) return bad('Jumlah bundle tidak valid');
  if (!tgl) return bad('Isi tanggal');
  const d = tbCur.dets.find(x => x.id === itemId);
  btn.disabled = true;
  try {
    const { data: ada } = await sb.from('material_inbound').select('id').eq('surat_jalan', n.no_dokumen).limit(1);
    if (ada && ada.length) { bad('Nota ini sudah pernah diterima.'); await loadTimbangan(); return; }
    const totalPcs = sheet * up;
    const { data: { user } } = await sb.auth.getUser();
    const ket = `[📦 ${sheet} bundle] Dari Timbangan, nota ${n.no_dokumen} (${n.leaves} lv)`;
    const bm = await sb.from('barang_masuk').insert([{ detail_id: itemId, tanggal: tgl, qty: totalPcs, keterangan: ket, created_by: user.email }]).select();
    if (bm.error) return bad('❌ ' + bm.error.message);
    const mi = await sb.from('material_inbound').insert([{ no_pi: tbCur.h.no_pi, no_po: '-', surat_jalan: n.no_dokumen, tanggal_terima: tgl, supplier: 'TIMBANGAN KERTAS', brand: d.brand || '', jenis: d.jenis || '', paper: d.paper || '', size: d.size || '', qty_sheet: sheet, up_per_sheet: up, qty_masuk: sheet, qty_pi: d.qty_pi || 0, status: 'DITERIMA', notes: `Dari nota ${n.no_dokumen}`, created_by: user.email, qty_pi_sheet: sheet, qty_pi_pcs: null, pi_id: tbCur.h.id, pi_detail_id: itemId }]);
    if (mi.error) {
      const bid = bm.data && bm.data[0] && bm.data[0].id; if (bid) await sb.from('barang_masuk').delete().eq('id', bid);
      return bad('❌ Gagal mencatat tracking: ' + mi.error.message + ' (barang masuk dibatalkan)');
    }
    await addLog('BARANG MASUK', `${user.email} menerima ${totalPcs} pcs dari Timbangan (nota ${n.no_dokumen}) untuk ${tbCur.h.no_pi} - ${d.brand} - ${d.jenis}`);
    showToast('Kertas masuk ke Barang Masuk', 'success');
    tutupTerima();
    await loadTimbangan(); await loadTracking(); if (typeof onItemChange === 'function') { try { await onItemChange(); } catch (e) {} }
  } finally { btn.disabled = false; }
}

/* ===== Riwayat Barang Masuk (semua item, bisa diedit) ===== */
async function loadRiwayatSemua() {
  const el = document.getElementById('riwayatMasuk'); if (!el) return;
  const piSel = document.getElementById('pi_select'); const piId = piSel ? piSel.value : '';
  if (!piId) { el.innerHTML = '<div class="info-text">Pilih No PI untuk melihat riwayat barang masuknya.</div>'; return; }
  const ids = ((await sb.from('pi_detail').select('id').eq('pi_id', parseInt(piId))).data || []).map(x => x.id);
  if (!ids.length) { el.innerHTML = '<div class="info-text">PI ini belum punya item.</div>'; return; }
  const { data, error } = await sb.from('barang_masuk').select('*').in('detail_id', ids).order('id', { ascending: false }).limit(200);
  if (error) { el.innerHTML = '<div class="info-text" style="color:#b91c1c">❌ ' + error.message + '</div>'; return; }
  const rows = data || [];
  if (!rows.length) { el.innerHTML = '<div class="info-text">Belum ada barang masuk untuk PI ini.</div>'; return; }
  const dids = [...new Set(rows.map(r => r.detail_id))];
  const det = (await sb.from('pi_detail').select('id,brand,jenis,paper,size,pi_id').in('id', dids)).data || [];
  const pids = [...new Set(det.map(d => d.pi_id))];
  const hd = pids.length ? (await sb.from('pi_header').select('id,no_pi').in('id', pids)).data || [] : [];
  const dm = {}; det.forEach(d => dm[d.id] = d); const hm = {}; hd.forEach(h => hm[h.id] = h.no_pi);
  const e = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  el.innerHTML = '<div class="table-wrapper"><table style="width:100%"><thead><tr><th>Tanggal</th><th>PI</th><th>Barang</th><th>Qty</th><th>Keterangan</th><th>Aksi</th></tr></thead><tbody>' +
    rows.map(r => { const d = dm[r.detail_id] || {}; return `<tr><td>${e(r.tanggal)}</td><td>${e(hm[d.pi_id] || '-')}</td><td>${e(d.brand)} ${e(d.jenis)} ${e(d.paper || '')} ${e(d.size || '')}</td><td><b style="color:#10b981">+${Number(r.qty || 0).toLocaleString('id-ID')}</b></td><td>${e(r.keterangan || '-')}</td><td style="white-space:nowrap"><button class="btn-edit" onclick="GP.mods.masuk.editMasuk(${r.id})">✏️ Edit</button> <button class="btn-hapus" onclick="GP.mods.masuk.hapusHistory(${r.id}, ${r.detail_id})">Hapus</button></td></tr>`; }).join('') +
    '</tbody></table></div>';
}
async function editMasuk(id) {
  const { data: r } = await sb.from('barang_masuk').select('*').eq('id', id).single();
  if (!r) { alert('Data tidak ditemukan'); return; }
  const dariSP = String(r.keterangan || '').startsWith('Ambil dari stok pendukung');
  const tgl = prompt('Tanggal (YYYY-MM-DD):', r.tanggal); if (tgl === null) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl.trim())) { alert('Format tanggal salah'); return; }
  let qty = r.qty;
  if (dariSP) alert('Jumlah tidak bisa diubah karena berasal dari Stok Pendukung. Jika salah, Hapus lalu ambil ulang.');
  else { const q = prompt('Jumlah masuk:', r.qty); if (q === null) return; qty = parseInt(q); if (!qty || qty <= 0) { alert('Jumlah tidak valid'); return; } }
  const ket = prompt('Keterangan:', r.keterangan || ''); if (ket === null) return;
  let ketF = ket.trim(); const tag = (String(r.keterangan || '').match(/^\[📄[^\]]*\]/) || [''])[0];
  if (tag && !ketF.startsWith('[📄')) ketF = (tag + ' ' + ketF).trim(); // baris sheet tetap ditandai bahan mentah
  const { error } = await sb.from('barang_masuk').update({ tanggal: tgl.trim(), qty, keterangan: ketF }).eq('id', id);
  if (error) { alert('❌ ' + error.message); return; }
  if (tgl.trim() !== r.tanggal) { // best-effort: samakan tanggal terima di tracking bila cocok tepat satu
    try { const mi = (await sb.from('material_inbound').select('id').eq('pi_detail_id', r.detail_id).eq('tanggal_terima', r.tanggal)).data || [];
      if (mi.length === 1) await sb.from('material_inbound').update({ tanggal_terima: tgl.trim() }).eq('id', mi[0].id); } catch (x) {}
  }
  addLog('EDIT BARANG MASUK', `#${id} qty ${r.qty}→${qty}, tgl ${r.tanggal}→${tgl.trim()}`);
  showToast('Perubahan tersimpan' + (qty !== r.qty ? ' (stok ikut berubah; data QC/Tracking tidak ikut diubah)' : ''), 'success');
  await onItemChange(); await loadRiwayatSemua();
}

async function init(){ await loadHalaman(); await loadTimbangan(); }
NS.loadPiList = loadPiList;
NS.toggleBentukMasuk = toggleBentukMasuk;
NS.hitungTotalPcsMasuk = hitungTotalPcsMasuk;
NS.onPiChange = onPiChange;
NS.onItemChange = onItemChange;
NS.filterHistory = filterHistory;
NS.hapusHistory = hapusHistory;
NS.simpanMasuk = simpanMasuk;
NS.ambilDariStokPendukung = ambilDariStokPendukung;
NS.exportHistory = exportHistory;
NS.loadHalaman = loadHalaman;
NS.loadTracking = loadTracking;
NS.showDetail = showDetail;
NS.deleteMaterial = deleteMaterial;
NS.closeModal = closeModal;
NS.goToQC = goToQC;
NS.goToQC2 = goToQC2;
NS.goToDiecut = goToDiecut;
NS.goToSend = goToSend;
NS.loadTimbangan = loadTimbangan;
NS.terimaTimbangan = terimaTimbangan;
NS.tutupTerima = tutupTerima;
NS.simpanTerima = simpanTerima;
NS.loadRiwayatSemua = loadRiwayatSemua;
NS.editMasuk = editMasuk;
NS.mount = async function(host){
  host.innerHTML = "<div class=\"gm-masuk\"><div id=\"gpMain\">" + "" + "</div><div id=\"detailModal\" class=\"modal\"><div class=\"modal-content\"><h3 id=\"detailTitle\">\ud83d\udccb Detail Barang Masuk</h3><div id=\"detailContent\"></div><div class=\"modal-footer\"><button class=\"btn-cancel\" onclick=\"GP.mods.masuk.closeModal('detailModal')\">Tutup</button></div></div></div></div>";
  
  await init();
};
})();
