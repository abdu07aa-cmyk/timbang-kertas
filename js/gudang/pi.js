/* Modul Gudang: pi */
(function(){
const sb = window.sbG, GP = window.GP;
function showToast(m,t){ GP.toast(m,t); }
function addLog(a,d){ return GP.log(a,d); }
const NS = GP.mods.pi = {};

    let itemList = [{ id: null, brand: '', jenis: '', paper: '', size: '', qty: '', gsm: '', leaves: '', wm: defWm(), qtyb: '' }];
    let brandList = [], jenisList = [], paperList = [], sizeList = [];
    let mode = 'new';
    let editingPiId = null;

    // ============================================================
    // ✅ TOAST NOTIFICATION
    // ============================================================

    
    async function loadMasterData() {
        const { data: items } = await sb.from('pi_detail').select('brand, jenis, paper, size');
        if (items) {
            brandList = [...new Set(items.map(i => i.brand).filter(b => b))];
            jenisList = [...new Set(items.map(i => i.jenis).filter(j => j))];
            paperList = [...new Set(items.map(i => i.paper).filter(p => p))];
            sizeList = [...new Set(items.map(i => i.size).filter(s => s))];
        }
    }
    
    function renderItemForm() {
        const container = document.getElementById('itemContainer');
        if (!container) return;
        
        let html = '';
        for (let i = 0; i < itemList.length; i++) {
            html += `
                <div class="item-row">
                    <input type="text" placeholder="Brand *" value="${itemList[i].brand}" onchange="GP.mods.pi.updateItem(${i}, 'brand', this.value)" list="brandSuggest">
                    <input type="text" placeholder="Jenis *" value="${itemList[i].jenis}" onchange="GP.mods.pi.updateItem(${i}, 'jenis', this.value)" list="jenisSuggest">
                    <input type="text" placeholder="Paper" value="${itemList[i].paper}" onchange="GP.mods.pi.updateItem(${i}, 'paper', this.value)" list="paperSuggest">
                    <input type="text" placeholder="Size" value="${itemList[i].size}" onchange="GP.mods.pi.updateItem(${i}, 'size', this.value)" list="sizeSuggest">
                    <input type="number" placeholder="Qty *" value="${itemList[i].qty}" onchange="GP.mods.pi.updateItem(${i}, 'qty', this.value)">
                        ${EXT ? `${optSel(i, 'gsm', (GP.opts ? GP.opts().gsm : []), 'GSM')}
                        ${optSel(i, 'leaves', (GP.opts ? GP.opts().leaves : []), 'Leaves')}
                        ${optSel(i, 'wm', (GP.opts ? GP.opts().wm : ['No WM']), 'Watermark')}` : ''}
                    <button class="btn-remove" onclick="GP.mods.pi.hapusItem(${i})">✖</button>
                </div>
            `;
        }
        
        html += `
            <datalist id="brandSuggest">${brandList.map(b => `<option value="${b}">`).join('')}</datalist>
            <datalist id="jenisSuggest">${jenisList.map(j => `<option value="${j}">`).join('')}</datalist>
            <datalist id="paperSuggest">${paperList.map(p => `<option value="${p}">`).join('')}</datalist>
            <datalist id="sizeSuggest">${szAll().map(s => `<option value="${s}">`).join('')}</datalist>
            <button type="button" class="btn-add" onclick="GP.mods.pi.tambahItem()">+ Tambah Item Barang</button>
        `;
        container.innerHTML = html;
    }
    
    function tambahItem() {
        itemList.push({ id: null, brand: '', jenis: '', paper: '', size: '', qty: '', gsm: '', leaves: '', wm: defWm(), qtyb: '' });
        renderItemForm();
    }
    
    function hapusItem(index) {
        if (itemList.length > 1) {
            itemList.splice(index, 1);
            renderItemForm();
        } else {
            showToast('Minimal 1 item!', 'warning');
        }
    }
    
    let EXT = true, origMap = {};
function defWm() { const l = (GP.opts ? GP.opts().wm : []); return l.find(x => /TRPC/i.test(x)) || 'No WM'; }
function szAll() { return [...new Set([...(sizeList || []), ...((GP.opts && GP.opts().sizes) || [])])]; }
function optSel(i, field, list, ph) {
  const cur = String(itemList[i][field] || ''); const l = list.map(String); if (cur && !l.includes(cur)) l.unshift(cur);
  return `<select data-ss="1" title="${ph}" onchange="GP.mods.pi.updateItem(${i}, '${field}', this.value)"><option value="">${ph}</option>${l.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${v}</option>`).join('')}</select>`;
}
const cU = x => String(x == null ? '' : x).trim().toUpperCase();
const kn = x => GP.kertasNama ? GP.kertasNama(x.paper, x.jenis) : (x.paper || x.jenis);
const sn = s => GP.sizeNama ? GP.sizeNama(s) : s;
const gs = x => GP.gsmDari ? GP.gsmDari(x) : Number(x.gsm);
const cCanon = x => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
// Item yang sudah diminta di Timbangan: spesifikasi kertas tidak boleh berubah & qty bundle tidak boleh di bawah yang sudah diminta
async function cekPermintaanKertas(noPi, items) {
  if (!EXT || !GP.tsb) return '';
  const ubah = items.filter(it => {
    const o = it.id && origMap[it.id]; if (!o) return false;
    const spec = cU(kn(o)) !== cU(kn(it)) || cU(sn(o.size)) !== cU(sn(it.size)) || gs(o) !== gs(it) || Number(o.leaves) !== Number(it.leaves) || cU(o.wm) !== cU(it.wm || 'No WM');
    const turun = parseInt(it.qty) < parseInt(o.qtyb || 0);
    return spec || turun;
  });
  if (!ubah.length) return '';
  const { data: mp } = await GP.tsb.from('master_pi').select('id,no_pi');
  const orgNo = (mp || []).find(p => cCanon(p.no_pi) === cCanon(noPi)) || (mp || []).find(p => cCanon(p.no_pi) === cCanon(document.getElementById('edit_pi_select').selectedOptions[0] ? document.getElementById('edit_pi_select').selectedOptions[0].textContent.split(' ')[0] : ''));
  if (!orgNo) return '';
  const { data: pits } = await GP.tsb.from('pi_item').select('*').eq('pi_id', orgNo.id);
  for (const it of ubah) {
    const o = origMap[it.id];
    const m = (pits || []).find(x => cU(x.jenis_kertas) === cU(kn(o)) && cU(x.watermark) === cU(o.wm) && cU(x.size_kertas) === cU(sn(o.size)) && Number(x.gsm) === gs(o) && Number(x.leaves) === Number(o.leaves));
    if (!m) continue;
    const { data: pm } = await GP.tsb.from('permintaan').select('qty_minta,status').eq('pi_item_id', m.id);
    const minta = (pm || []).filter(r => r.status !== 'Dibatalkan').reduce((a, r) => a + Number(r.qty_minta || 0), 0);
    if (minta <= 0) continue;
    const spec = cU(kn(o)) !== cU(kn(it)) || cU(sn(o.size)) !== cU(sn(it.size)) || gs(o) !== gs(it) || Number(o.leaves) !== Number(it.leaves) || cU(o.wm) !== cU(it.wm || 'No WM');
    if (spec) return `Item ${it.brand} ${it.jenis} (${o.paper} ${o.size}) sudah diminta ${minta} bundle di Timbangan, jadi Paper/Size/GSM/Leaves/Watermark tidak bisa diubah. Hanya Qty yang boleh diubah (atau batalkan permintaannya dulu).`;
    return `Item ${it.brand} ${it.jenis} sudah diminta ${minta} bundle di Timbangan. Qty tidak boleh lebih kecil dari ${minta}.`;
  }
  return '';
}
function extFields(it) { if (!EXT) return {}; return { gsm: parseInt(it.gsm) || null, leaves: parseInt(it.leaves) || null, watermark: (it.wm || 'No WM').trim(), qty_bundle: parseInt(it.qty) || null }; }
function updateItem(index, field, value) {
  const _it = itemList[index]; let _re = false;
  if (EXT && field === 'leaves' && value && (!_it.paper || /^\s*\d+\s*leaves?\s*$/i.test(_it.paper))) { const np = value + ' Leaves'; if (_it.paper !== np) { _it.paper = np; _re = true; } }
  if (EXT && field === 'paper') { const m = /(\d+)\s*leaves?/i.exec(value), g = /(\d+)\s*gsm/i.exec(value); if (m && !_it.leaves) { _it.leaves = m[1]; _re = true; } if (g && !_it.gsm) { _it.gsm = g[1]; _re = true; } }
  if (_re) setTimeout(renderItemForm, 0);

        itemList[index][field] = value;
    }
    
    async function loadPiList() {
        const { data: headers } = await sb.from('pi_header').select('*').order('created_at', { ascending: false });
        let options = '<option value="">-- Pilih PI yang akan diedit --</option>';
        if (headers) {
            for (const h of headers) {
                const label = h.is_archived ? `📦 [ARSIP] ${h.no_pi} - ${h.tanggal}` : `${h.no_pi} - ${h.tanggal}`;
                options += `<option value="${h.id}">${label}</option>`;
            }
        }
        document.getElementById('edit_pi_select').innerHTML = options;
    }
    
    async function onSelectPiForEdit() {
        const piId = document.getElementById('edit_pi_select').value;
        if (!piId) {
            document.getElementById('edit_no_pi').value = '';
            document.getElementById('edit_tanggal_pi').value = '';
            document.getElementById('itemContainerEdit').innerHTML = '';
            document.getElementById('msgInput').innerHTML = '';
            const btnArsipReset = document.getElementById('btnArsip');
            if (btnArsipReset) btnArsipReset.textContent = '📦 Arsipkan PI';
            return;
        }
        editingPiId = piId;
        const { data: header } = await sb.from('pi_header').select('*').eq('id', piId).single();
        document.getElementById('edit_no_pi').value = header.no_pi;
        document.getElementById('edit_tanggal_pi').value = header.tanggal;
        const btnArsip = document.getElementById('btnArsip');
        if (btnArsip) {
            btnArsip.textContent = header.is_archived ? '📤 Buka dari Arsip' : '📦 Arsipkan PI';
        }
        const { data: details } = await sb.from('pi_detail').select('*').eq('pi_id', piId).order('id', { ascending: true });
        itemList = details.map(d => ({ id: d.id, brand: d.brand, jenis: d.jenis, paper: d.paper || '', size: d.size || '', qty: d.qty_pi, gsm: d.gsm || '', leaves: d.leaves || '', wm: d.watermark || 'No WM', qtyb: d.qty_bundle || '' }));
        origMap = {}; details.forEach(d => origMap[d.id] = { paper: d.paper || '', jenis: d.jenis, size: d.size, gsm: d.gsm, leaves: d.leaves, wm: d.watermark || 'No WM', qtyb: d.qty_bundle || d.qty_pi });
        renderItemForm();
        document.getElementById('msgInput').innerHTML = '<div class="alert alert-success">✅ Data PI dimuat, silakan edit</div>';
    }
    
    async function toggleArsipPi() {
        const piId = document.getElementById('edit_pi_select').value;
        if (!piId) { showToast('❌ Pilih PI terlebih dahulu!', 'error'); return; }
        
        const { data: header } = await sb.from('pi_header').select('no_pi, is_archived').eq('id', piId).single();
        if (!header) { showToast('❌ PI tidak ditemukan!', 'error'); return; }
        
        const newState = !header.is_archived;
        const actionText = newState ? 'diarsipkan' : 'dibuka dari arsip';
        const confirmText = newState
            ? `Arsipkan PI "${header.no_pi}"?\n\nPI ini akan disembunyikan dari tampilan utama Dashboard, tapi datanya TIDAK dihapus dan bisa dibuka lagi kapan saja.`
            : `Buka PI "${header.no_pi}" dari arsip?\n\nPI ini akan muncul kembali di tampilan utama Dashboard.`;
        
        if (!confirm(confirmText)) return;
        
        const { error } = await sb.from('pi_header').update({ is_archived: newState }).eq('id', piId);
        if (error) {
            showToast('❌ Gagal: ' + error.message, 'error');
            return;
        }
        
        showToast(`✅ PI berhasil ${actionText}!`, 'success');
        await loadPiList();
        document.getElementById('edit_pi_select').value = piId;
        await onSelectPiForEdit();
    }
    
    async function simpanPiBaru() {
        const no_pi = document.getElementById('no_pi').value.trim();
        const tanggal = document.getElementById('tanggal_pi').value;
        if (!no_pi || !tanggal) {
            showToast('❌ No PI dan Tanggal wajib!', 'error');
            return;
        }
        const validItems = itemList.filter(item => item.brand && item.jenis && item.qty && parseInt(item.qty) > 0);
        if (validItems.length === 0) {
            showToast('❌ Minimal 1 item dengan Brand, Jenis, dan Qty!', 'error');
            return;
        }
        const { data: existing } = await sb.from('pi_header').select('no_pi').eq('no_pi', no_pi).single();
        if (existing) {
            showToast('❌ No PI sudah ada!', 'error');
            return;
        }
        const { data: header, error: headerError } = await sb.from('pi_header').insert([{ no_pi, tanggal }]).select();
        if (headerError) {
            showToast('❌ ' + headerError.message, 'error');
            return;
        }
        const piId = header[0].id;
        for (const item of validItems) {
            await sb.from('pi_detail').insert({ pi_id: piId, brand: item.brand, jenis: item.jenis, paper: item.paper || null, size: item.size || null, qty_pi: parseInt(item.qty), ...extFields(item) });
        }
        await loadMasterData();
        showToast('✅ PI baru berhasil disimpan!', 'success');
        document.getElementById('msgInput').innerHTML = '<div class="alert alert-success">✅ PI baru dan ' + validItems.length + ' item berhasil disimpan!</div>';
        resetForm();
        loadPiList();
    }
    
    async function updatePi() {
        const no_pi = document.getElementById('edit_no_pi').value.trim();
        const tanggal = document.getElementById('edit_tanggal_pi').value;
        if (!no_pi || !tanggal) {
            showToast('❌ No PI dan Tanggal wajib!', 'error');
            return;
        }
        const validItems = itemList.filter(item => item.brand && item.jenis && item.qty && parseInt(item.qty) > 0);
        if (validItems.length === 0) {
            showToast('❌ Minimal 1 item dengan Brand, Jenis, dan Qty!', 'error');
            return;
        }
        const blok = await cekPermintaanKertas(no_pi, validItems);
        if (blok) { showToast('❌ ' + blok, 'error'); return; }
        const { error: headerError } = await sb.from('pi_header').update({ no_pi, tanggal }).eq('id', editingPiId);
        if (headerError) {
            showToast('❌ ' + headerError.message, 'error');
            return;
        }
        const { data: existingDetails } = await sb.from('pi_detail').select('*').eq('pi_id', editingPiId).order('id', { ascending: true });
        
        // ✅ COCOKKAN BERDASARKAN ID ASLI, BUKAN URUTAN/POSISI
        // Ini mencegah data "tertukar" ke item lain saat urutan berubah
        for (const item of validItems) {
            if (item.id) {
                // Item lama: update HANYA baris dengan id ini, apapun urutannya
                await sb.from('pi_detail').update({ brand: item.brand, jenis: item.jenis, paper: item.paper || null, size: item.size || null, qty_pi: parseInt(item.qty), ...extFields(item) }).eq('id', item.id);
            } else {
                // Item baru (ditambahkan saat edit): insert baris baru
                await sb.from('pi_detail').insert({ pi_id: editingPiId, brand: item.brand, jenis: item.jenis, paper: item.paper || null, size: item.size || null, qty_pi: parseInt(item.qty), ...extFields(item) });
            }
        }
        
        // ✅ HAPUS item lama yang sudah tidak ada di form (dicocokkan by ID, bukan posisi)
        const keptIds = new Set(validItems.filter(item => item.id).map(item => item.id));
        if (existingDetails) {
            for (const detail of existingDetails) {
                if (!keptIds.has(detail.id)) {
                    const { data: masuk } = await sb.from('barang_masuk').select('id').eq('detail_id', detail.id).limit(1);
                    const { data: keluar } = await sb.from('barang_keluar').select('id').eq('detail_id', detail.id).limit(1);
                    if ((!masuk || masuk.length === 0) && (!keluar || keluar.length === 0)) {
                        await sb.from('pi_detail').delete().eq('id', detail.id);
                    } else {
                        showToast(`⚠️ Item "${detail.brand} - ${detail.jenis}" tidak bisa dihapus (ada transaksi)`, 'warning');
                    }
                }
            }
        }
        await loadMasterData();
        showToast('✅ PI berhasil diupdate!', 'success');
        document.getElementById('msgInput').innerHTML = '<div class="alert alert-success">✅ PI berhasil diupdate!</div>';
        
        // ✅ REFRESH DROPDOWN
        await loadPiList();
        
        // ✅ RESET FORM EDIT
        document.getElementById('edit_pi_select').value = '';
        document.getElementById('edit_no_pi').value = '';
        document.getElementById('edit_tanggal_pi').value = '';
        document.getElementById('itemContainerEdit').innerHTML = '';
        document.getElementById('msgInputEdit').innerHTML = '';
        
        // ✅ SWITCH KE MODE NEW
        await switchMode('new');
    }
    
    async function hapusPi() {
    const piId = document.getElementById('edit_pi_select').value;
    if (!piId) { showToast('❌ Pilih PI yang akan dihapus!', 'error'); return; }
    
    const { data: header } = await sb.from('pi_header').select('no_pi').eq('id', piId).single();
    if (!confirm(`Hapus PI "${header?.no_pi || piId}" dan semua item di dalamnya?`)) return;
    
    try {
        console.log('🗑️ Menghapus PI ID:', piId);
        
        // ✅ 1. Hapus scan_log (foreign key constraint)
        await sb.from('scan_log').delete().eq('pi_id', piId);
        
        // ✅ 2. Ambil semua detail_id dari PI ini
        const { data: details } = await sb.from('pi_detail').select('id').eq('pi_id', piId);
        
        if (details && details.length > 0) {
            for (const d of details) {
                // ✅ 3. Hapus barang_masuk berdasarkan detail_id
                await sb.from('barang_masuk').delete().eq('detail_id', d.id);
                
                // ✅ 4. Hapus barang_keluar berdasarkan detail_id
                await sb.from('barang_keluar').delete().eq('detail_id', d.id);
            }
        }
        
        // ✅ 5. Hapus dari sistem SUPPLY MATERIAL (material_inbound)
        const { data: materials } = await sb
            .from('material_inbound')
            .select('id')
            .eq('no_pi', header.no_pi);
        
        if (materials && materials.length > 0) {
            for (const mat of materials) {
                await sb.from('ng_tracking').delete().eq('material_inbound_id', mat.id);
                await sb.from('qc_inspection').delete().eq('material_inbound_id', mat.id);
                await sb.from('diecut_process').delete().eq('material_inbound_id', mat.id);
                await sb.from('production_send').delete().eq('material_inbound_id', mat.id);
                await sb.from('material_inbound').delete().eq('id', mat.id);
            }
        }
        
        // ✅ 6. Hapus pi_detail
        await sb.from('pi_detail').delete().eq('pi_id', piId);
        
        // ✅ 7. Hapus pi_header
        await sb.from('pi_header').delete().eq('id', piId);
        
        showToast('✅ PI dan semua data terkait berhasil dihapus!', 'success');
        document.getElementById('edit_pi_select').innerHTML = '<option value="">-- Pilih PI --</option>';
        document.getElementById('edit_no_pi').value = '';
        document.getElementById('edit_tanggal_pi').value = '';
        document.getElementById('itemContainerEdit').innerHTML = '';
        document.getElementById('msgInputEdit').innerHTML = '<div class="alert alert-success">✅ PI berhasil dihapus! Daftar sudah diperbarui.</div>';

        await loadPiList();
        itemList = [{ id: null, brand: '', jenis: '', paper: '', size: '', qty: '', gsm: '', leaves: '', wm: defWm(), qtyb: '' }];
        await switchMode('new');
        
    } catch (err) {
        showToast('❌ Gagal hapus PI: ' + err.message, 'error');
        console.error('Error detail:', err);
    }
}
    
    function resetForm() {
        itemList = [{ id: null, brand: '', jenis: '', paper: '', size: '', qty: '', gsm: '', leaves: '', wm: defWm(), qtyb: '' }];
        document.getElementById('no_pi').value = '';
        renderItemForm();
    }
    
  async function switchMode(m) {
    mode = m;
    document.getElementById('modeNew').classList.toggle('active', m === 'new');
    document.getElementById('modeEdit').classList.toggle('active', m === 'edit');
    if (m === 'new') {
        document.getElementById('formNew').style.display = 'block';
        document.getElementById('formEdit').style.display = 'none';
        resetForm();
    } else {
        document.getElementById('formNew').style.display = 'none';
        document.getElementById('formEdit').style.display = 'block';
        document.getElementById('edit_no_pi').value = '';
        document.getElementById('edit_tanggal_pi').value = '';
        document.getElementById('itemContainerEdit').innerHTML = '';
        document.getElementById('msgInputEdit').innerHTML = '';
        document.getElementById('msgInput').innerHTML = '';
        await loadPiList();
        itemList = [{ id: null, brand: '', jenis: '', paper: '', size: '', qty: '', gsm: '', leaves: '', wm: defWm(), qtyb: '' }];
        renderItemForm();
    }
}
    
    async function loadHalaman() {
        const today = new Date().toISOString().split('T')[0];
        await loadMasterData();
        document.getElementById('gpMain').innerHTML = `
            <div class="card">
                <div class="card-title">📝 Manajemen PI</div>${EXT ? '<div style="font-size:12px;color:#475569;margin-bottom:8px">Untuk item kertas yang akan diminta di menu <b>Permintaan Kertas</b>, isi juga GSM, Leaves, dan Watermark. Qty PI otomatis dipakai sebagai jumlah bundle.<br>Urutan kolom: Brand · Jenis · Paper · Size · Qty · GSM · Leaves · Watermark. (<b>Paper</b> dipakai sebagai jenis kertas di Timbangan.)</div>' : '<div style="background:#fef3c7;border:1px solid #f59e0b;padding:8px;border-radius:8px;margin-bottom:8px;font-size:12px">⚠️ Kolom GSM/Leaves/Watermark/Qty Bundle belum ada di database Gudang Pro. Jalankan file <b>supabase_gudang_pi_kertas.sql</b> dulu agar Permintaan Kertas bisa memakai PI ini.</div>'}
                <div class="mode-switch">
                    <div id="modeNew" class="mode-btn active" onclick="GP.mods.pi.switchMode('new')">➕ PI Baru</div>
                    <div id="modeEdit" class="mode-btn" onclick="GP.mods.pi.switchMode('edit')">✏️ Edit/Hapus PI</div>
                </div>
                <div id="formNew">
                    <div id="msgInput"></div>
                    <input type="text" id="no_pi" placeholder="No PI *">
                    <input type="date" id="tanggal_pi" value="${today}">
                    <div id="itemContainer"></div>
                    <button onclick="GP.mods.pi.simpanPiBaru()">💾 Simpan PI Baru</button>
                </div>
                <div id="formEdit" style="display:none">
                    <div id="msgInputEdit"></div>
                    <select id="edit_pi_select" onchange="GP.mods.pi.onSelectPiForEdit()"><option value="">-- Pilih PI --</option></select>
                    <input type="text" id="edit_no_pi" placeholder="No PI *">
                    <input type="date" id="edit_tanggal_pi">
                    <div id="itemContainerEdit"></div>
                    <button onclick="GP.mods.pi.updatePi()" style="background:#f59e0b">✏️ Update PI</button>
                    <button onclick="GP.mods.pi.toggleArsipPi()" style="background:#64748b; margin-top:10px" id="btnArsip">📦 Arsipkan PI</button>
                    <button onclick="GP.mods.pi.hapusPi()" style="background:#dc2626; margin-top:10px">🗑️ Hapus PI</button>
                </div>
            </div>
        `;
        const containerNew = document.getElementById('itemContainer');
        const containerEdit = document.getElementById('itemContainerEdit');
        renderItemForm = () => {
            if (mode === 'new' && containerNew) {
                let html = '';
                for (let i = 0; i < itemList.length; i++) {
                    html += `<div class="item-row">
                        <input type="text" placeholder="Brand *" value="${itemList[i].brand}" onchange="GP.mods.pi.updateItem(${i}, 'brand', this.value)" list="brandSuggest">
                        <input type="text" placeholder="Jenis *" value="${itemList[i].jenis}" onchange="GP.mods.pi.updateItem(${i}, 'jenis', this.value)" list="jenisSuggest">
                        <input type="text" placeholder="Paper" value="${itemList[i].paper}" onchange="GP.mods.pi.updateItem(${i}, 'paper', this.value)" list="paperSuggest">
                        <input type="text" placeholder="Size" value="${itemList[i].size}" onchange="GP.mods.pi.updateItem(${i}, 'size', this.value)" list="sizeSuggest">
                        <input type="number" placeholder="Qty *" value="${itemList[i].qty}" onchange="GP.mods.pi.updateItem(${i}, 'qty', this.value)">
                        ${EXT ? `${optSel(i, 'gsm', (GP.opts ? GP.opts().gsm : []), 'GSM')}
                        ${optSel(i, 'leaves', (GP.opts ? GP.opts().leaves : []), 'Leaves')}
                        ${optSel(i, 'wm', (GP.opts ? GP.opts().wm : ['No WM']), 'Watermark')}` : ''}
                        <button class="btn-remove" onclick="GP.mods.pi.hapusItem(${i})">✖</button>
                    </div>`;
                }
                html += `<datalist id="brandSuggest">${brandList.map(b => `<option value="${b}">`).join('')}</datalist>
                    <datalist id="jenisSuggest">${jenisList.map(j => `<option value="${j}">`).join('')}</datalist>
                    <datalist id="paperSuggest">${paperList.map(p => `<option value="${p}">`).join('')}</datalist>
                    <datalist id="sizeSuggest">${szAll().map(s => `<option value="${s}">`).join('')}</datalist>
                    <button type="button" class="btn-add" onclick="GP.mods.pi.tambahItem()">+ Tambah Item Barang</button>`;
                containerNew.innerHTML = html;
            } else if (mode === 'edit' && containerEdit) {
                let html = '';
                for (let i = 0; i < itemList.length; i++) {
                    html += `<div class="item-row">
                        <input type="text" placeholder="Brand *" value="${itemList[i].brand}" onchange="GP.mods.pi.updateItem(${i}, 'brand', this.value)" list="brandSuggest2">
                        <input type="text" placeholder="Jenis *" value="${itemList[i].jenis}" onchange="GP.mods.pi.updateItem(${i}, 'jenis', this.value)" list="jenisSuggest2">
                        <input type="text" placeholder="Paper" value="${itemList[i].paper}" onchange="GP.mods.pi.updateItem(${i}, 'paper', this.value)" list="paperSuggest2">
                        <input type="text" placeholder="Size" value="${itemList[i].size}" onchange="GP.mods.pi.updateItem(${i}, 'size', this.value)" list="sizeSuggest2">
                        <input type="number" placeholder="Qty *" value="${itemList[i].qty}" onchange="GP.mods.pi.updateItem(${i}, 'qty', this.value)">
                        ${EXT ? `${optSel(i, 'gsm', (GP.opts ? GP.opts().gsm : []), 'GSM')}
                        ${optSel(i, 'leaves', (GP.opts ? GP.opts().leaves : []), 'Leaves')}
                        ${optSel(i, 'wm', (GP.opts ? GP.opts().wm : ['No WM']), 'Watermark')}` : ''}
                        <button class="btn-remove" onclick="GP.mods.pi.hapusItem(${i})">✖</button>
                    </div>`;
                }
                html += `<datalist id="brandSuggest2">${brandList.map(b => `<option value="${b}">`).join('')}</datalist>
                    <datalist id="jenisSuggest2">${jenisList.map(j => `<option value="${j}">`).join('')}</datalist>
                    <datalist id="paperSuggest2">${paperList.map(p => `<option value="${p}">`).join('')}</datalist>
                    <datalist id="sizeSuggest2">${szAll().map(s => `<option value="${s}">`).join('')}</datalist>
                    <button type="button" class="btn-add" onclick="GP.mods.pi.tambahItem()">+ Tambah Item Barang</button>`;
                containerEdit.innerHTML = html;
            }
        };
        renderItemForm();
    }

async function init(){ itemList=[{ id: null, brand: '', jenis: '', paper: '', size: '', qty: '', gsm: '', leaves: '', wm: defWm(), qtyb: '' }]; mode='new'; editingPiId=null; const t = await sb.from('pi_detail').select('gsm,leaves,watermark,qty_bundle').limit(1); EXT = !t.error; await loadHalaman(); }
NS.loadMasterData = loadMasterData;
NS.renderItemForm = renderItemForm;
NS.tambahItem = tambahItem;
NS.hapusItem = hapusItem;
NS.defWm = defWm;
NS.szAll = szAll;
NS.optSel = optSel;
NS.cekPermintaanKertas = cekPermintaanKertas;
NS.extFields = extFields;
NS.updateItem = updateItem;
NS.loadPiList = loadPiList;
NS.onSelectPiForEdit = onSelectPiForEdit;
NS.toggleArsipPi = toggleArsipPi;
NS.simpanPiBaru = simpanPiBaru;
NS.updatePi = updatePi;
NS.hapusPi = hapusPi;
NS.resetForm = resetForm;
NS.switchMode = switchMode;
NS.loadHalaman = loadHalaman;
NS.mount = async function(host){
  host.innerHTML = "<div class=\"gm-pi\"><div id=\"gpMain\">" + "" + "</div></div>";
  
  await init();
};
})();
