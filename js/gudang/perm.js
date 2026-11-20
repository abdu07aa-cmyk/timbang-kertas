/* Modul Gudang: perm */
(function(){
const sb = window.sbG, GP = window.GP;
function showToast(m,t){ GP.toast(m,t); }
function addLog(a,d){ return GP.log(a,d); }
const NS = GP.mods.perm = {};

    let isAdminUser = false;
    let currentUserEmail = '';
    let piItems = [];        // item PI yang masih kurang (belum selesai)
    let piSelesaiCount = 0;  // jumlah item PI yang sudah selesai (disembunyikan)
    let allRequests = [];    // daftar permintaan yang termuat
    let stokMap = {};        // detail_id -> stok gudang (khusus admin)
    let activeStatus = 'all';
    let editingId = null;
    let editMode = 'diminta';
    let editStatus = '';
    let editBatas = null;

    const STATUS_LABEL = {
        PENDING: '⏳ PENDING', DISETUJUI: '✅ DISETUJUI', DITOLAK: '❌ DITOLAK',
        SELESAI: '📦 SELESAI', DIBATALKAN: '🚫 DIBATALKAN'
    };

    // ---------- helper ----------
    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function fmt(n) { return (n || 0).toLocaleString('id-ID'); }
    function fmtTanggal(s) {
        if (!s) return '-';
        const p = String(s).split('-');
        return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
    }
    function fmtWaktu(iso) {
        if (!iso) return '-';
        return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' });
    }
    function namaPendek(email) { return (email || '-').split('@')[0]; }

    // ============================================================
    // FORM AJUKAN PERMINTAAN
    // ============================================================
    async function loadPiList() {
        const { data: headers } = await sb.from('pi_header').select('*').eq('is_archived', false).order('created_at', { ascending: false });
        let options = '<option value="">-- Pilih No PI --</option>';
        if (headers) {
            for (const h of headers) {
                options += `<option value="${h.id}">${esc(h.no_pi)} - ${esc(h.tanggal)}</option>`;
            }
        }
        document.getElementById('req_pi_select').innerHTML = options;
    }

    async function onReqPiChange() {
        const piId = document.getElementById('req_pi_select').value;
        piItems = [];
        piSelesaiCount = 0;
        if (!piId) { renderItemRows(); return; }

        document.getElementById('reqItemContainer').innerHTML = '<div class="info-text">⏳ Memuat item PI...</div>';

        const { data: details } = await sb.from('pi_detail').select('*').eq('pi_id', parseInt(piId)).order('id', { ascending: true });
        const ids = (details || []).map(d => d.id);

        const keluarMap = {};   // barang yang benar-benar sudah keluar ke produksi (NG otomatis tidak dihitung)
        const sedangMap = {};   // sudah diminta tapi belum selesai (PENDING / DISETUJUI)
        if (ids.length > 0) {
            const [keluarRes, reqRes] = await Promise.all([
                sb.from('barang_keluar').select('detail_id, qty, keterangan').in('detail_id', ids),
                sb.from('permintaan_produksi').select('detail_id, qty_diminta, approved_qty, status').in('detail_id', ids).in('status', ['PENDING', 'DISETUJUI'])
            ]);
            (keluarRes.data || []).forEach(k => {
                if (!(k.keterangan || '').startsWith('NG ')) {
                    keluarMap[k.detail_id] = (keluarMap[k.detail_id] || 0) + (k.qty || 0);
                }
            });
            (reqRes.data || []).forEach(r => {
                const q = r.status === 'DISETUJUI' ? (r.approved_qty || 0) : (r.qty_diminta || 0);
                sedangMap[r.detail_id] = (sedangMap[r.detail_id] || 0) + q;
            });
        }

        for (const d of (details || [])) {
            const sudah = keluarMap[d.id] || 0;
            const kurang = (d.qty_pi || 0) - sudah;
            if (kurang <= 0) { piSelesaiCount++; continue; }   // item selesai tidak ditampilkan
            const sedang = sedangMap[d.id] || 0;
            piItems.push({
                id: d.id, brand: d.brand, jenis: d.jenis, paper: d.paper, size: d.size,
                qtyPi: d.qty_pi || 0, sudah, kurang, sedang,
                maxMinta: Math.max(0, kurang - sedang)
            });
        }
        renderItemRows();
    }

    function renderItemRows() {
        const container = document.getElementById('reqItemContainer');
        if (!container) return;
        const piId = document.getElementById('req_pi_select')?.value;

        if (!piId) {
            container.innerHTML = '<div class="info-text">Pilih No PI dulu. Semua item yang masih kurang akan muncul di sini.</div>';
            return;
        }
        if (piItems.length === 0) {
            container.innerHTML = '<div class="alert alert-success">✅ Semua item di PI ini sudah terpenuhi, tidak ada yang perlu diminta.</div>';
            return;
        }

        let html = '<div class="info-text" style="margin-bottom:8px;">Isi jumlah hanya untuk item yang mau diminta sekarang. Item yang dikosongkan akan dilewati.</div>';
        for (const it of piItems) {
            const habis = it.maxMinta <= 0;
            html += `
                <div class="req-card ${habis ? 'req-card-disabled' : ''}">
                    <div class="req-card-title">${esc(it.brand)} | ${esc(it.jenis)}</div>
                    <div class="req-card-sub">Paper: ${esc(it.paper || '-')} · Size: ${esc(it.size || '-')}</div>
                    <div class="req-stats">
                        <div class="req-stat"><span>Qty PI</span><b>${fmt(it.qtyPi)}</b></div>
                        <div class="req-stat"><span>Sudah Keluar</span><b>${fmt(it.sudah)}</b></div>
                        <div class="req-stat req-stat-kurang"><span>Kurang</span><b>${fmt(it.kurang)}</b></div>
                        ${it.sedang > 0 ? `<div class="req-stat req-stat-sedang"><span>Sedang Diminta</span><b>${fmt(it.sedang)}</b></div>` : ''}
                    </div>
                    ${habis
                        ? '<div class="info-text" style="color:#92400e;">⏳ Seluruh kekurangan sudah diminta dan menunggu diproses gudang.</div>'
                        : `<div class="req-input-row">
                               <input type="number" id="reqQty_${it.id}" min="1" max="${it.maxMinta}" placeholder="Jumlah diminta (maks ${fmt(it.maxMinta)})">
                               <button type="button" class="btn-isi" onclick="GP.mods.perm.isiKurang(${it.id})">Isi ${fmt(it.maxMinta)}</button>
                           </div>`}
                </div>
            `;
        }
        if (piSelesaiCount > 0) {
            html += `<div class="info-text">✅ ${piSelesaiCount} item lain di PI ini sudah selesai dan tidak ditampilkan.</div>`;
        }
        container.innerHTML = html;
    }

    function isiKurang(id) {
        const it = piItems.find(x => x.id === id);
        const el = document.getElementById('reqQty_' + id);
        if (it && el) el.value = it.maxMinta;
    }

    async function simpanPermintaan() {
        const piId = document.getElementById('req_pi_select').value;
        const tanggalButuh = document.getElementById('req_tanggal').value;
        const catatan = document.getElementById('req_catatan').value;
        const msg = document.getElementById('msgReq');

        if (!piId) { msg.innerHTML = '<div class="alert alert-error">Pilih No PI dulu!</div>'; return; }

        const dipilih = [];
        for (const it of piItems) {
            const el = document.getElementById('reqQty_' + it.id);
            if (!el || el.value === '') continue;
            const qty = parseInt(el.value);
            if (!qty || qty <= 0) { msg.innerHTML = `<div class="alert alert-error">Jumlah untuk ${esc(it.brand)} - ${esc(it.jenis)} tidak valid!</div>`; return; }
            if (qty > it.maxMinta) {
                msg.innerHTML = `<div class="alert alert-error">Jumlah ${esc(it.brand)} - ${esc(it.jenis)} (${fmt(qty)}) melebihi sisa yang boleh diminta (${fmt(it.maxMinta)})!</div>`;
                return;
            }
            dipilih.push({ it, qty });
        }
        if (dipilih.length === 0) {
            msg.innerHTML = '<div class="alert alert-error">Isi jumlah minimal untuk 1 item!</div>';
            return;
        }

        const { data: header } = await sb.from('pi_header').select('no_pi').eq('id', piId).single();
        const { data: { user } } = await sb.auth.getUser();
        const batchId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const rows = dipilih.map(({ it, qty }) => ({
            pi_id: parseInt(piId),
            detail_id: it.id,
            no_pi: header?.no_pi || '-',
            brand: it.brand || '-',
            jenis: it.jenis || '-',
            qty_diminta: qty,
            tanggal_dibutuhkan: tanggalButuh || null,
            catatan: catatan || null,
            status: 'PENDING',
            requested_by: user.email,
            batch_id: batchId
        }));

        const { error } = await sb.from('permintaan_produksi').insert(rows);

        if (error) {
            msg.innerHTML = '<div class="alert alert-error">' + esc(error.message) + '</div>';
        } else {
            if (typeof addLog === 'function') {
                try { await addLog('PERMINTAAN PRODUKSI', `${user.email} mengajukan ${rows.length} jenis untuk PI ${header?.no_pi}`); } catch (e) {}
            }
            msg.innerHTML = `<div class="alert alert-success">✅ ${rows.length} permintaan berhasil diajukan! Menunggu persetujuan gudang.</div>`;
            document.getElementById('req_tanggal').value = '';
            document.getElementById('req_catatan').value = '';
            document.getElementById('req_pi_select').value = '';
            piItems = [];
            piSelesaiCount = 0;
            renderItemRows();
            await loadDaftarPermintaan();
        }
    }

    // ============================================================
    // BATAS PERMINTAAN (kurang PI - permintaan lain yang masih berjalan)
    // ============================================================
    async function hitungBatas(detailId, excludeId) {
        const [d, k, rq] = await Promise.all([
            sb.from('pi_detail').select('qty_pi').eq('id', detailId).single(),
            sb.from('barang_keluar').select('qty, keterangan').eq('detail_id', detailId),
            sb.from('permintaan_produksi').select('id, qty_diminta, approved_qty, status').eq('detail_id', detailId).in('status', ['PENDING', 'DISETUJUI'])
        ]);
        const qtyPi = d.data?.qty_pi || 0;
        let sudah = 0;
        (k.data || []).forEach(x => { if (!(x.keterangan || '').startsWith('NG ')) sudah += x.qty || 0; });
        let sedangLain = 0;
        (rq.data || []).forEach(x => {
            if (String(x.id) === String(excludeId)) return;
            sedangLain += x.status === 'DISETUJUI' ? (x.approved_qty || 0) : (x.qty_diminta || 0);
        });
        const kurang = qtyPi - sudah;
        return { qtyPi, sudah, kurang, sedangLain, maxMinta: Math.max(0, kurang - sedangLain) };
    }

    // ============================================================
    // DAFTAR PERMINTAAN
    // ============================================================
    async function loadDaftarPermintaan() {
        const container = document.getElementById('daftarPermintaanList');
        let q = sb.from('permintaan_produksi').select('*')
            .order('created_at', { ascending: false })
            .order('id', { ascending: true })
            .limit(300);
        if (!isAdminUser) q = q.eq('requested_by', currentUserEmail);
        const { data, error } = await q;

        if (error) {
            container.innerHTML = '<div class="info-text">❌ Error: ' + esc(error.message) + '</div>';
            return;
        }
        allRequests = data || [];
        retMap = {};
        try {
            const sid = allRequests.filter(r => r.status === 'SELESAI').map(r => r.id);
            if (sid.length) { const rr = await sb.from('return_produksi').select('permintaan_id,tipe,qty,status').in('permintaan_id', sid);
                (rr.data || []).filter(x => x.status !== 'DITOLAK').forEach(x => { const o = retMap[x.permintaan_id] || (retMap[x.permintaan_id] = {}); o[x.tipe] = (o[x.tipe] || 0) + (x.qty || 0); }); }
        } catch (e) { }

        // Admin: hitung stok gudang untuk item yang masih aktif
        stokMap = {};
        if (isAdminUser) {
            const ids = [...new Set(allRequests.filter(r => ['PENDING', 'DISETUJUI'].includes(r.status)).map(r => r.detail_id))];
            if (ids.length > 0) {
                const [m, k] = await Promise.all([
                    sb.from('barang_masuk').select('detail_id, qty').in('detail_id', ids),
                    sb.from('barang_keluar').select('detail_id, qty').in('detail_id', ids)
                ]);
                ids.forEach(id => { stokMap[id] = 0; });
                (m.data || []).forEach(x => { stokMap[x.detail_id] += x.qty || 0; });
                (k.data || []).forEach(x => { stokMap[x.detail_id] -= x.qty || 0; });
            }
        }

        renderDaftar();
        
    }

    function hitungStatus() {
        const c = { all: allRequests.length, PENDING: 0, DISETUJUI: 0, DITOLAK: 0, SELESAI: 0, DIBATALKAN: 0 };
        allRequests.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
        return c;
    }

    function setStatusFilter(k) {
        activeStatus = k;
        renderDaftar();
    }

    function renderChips() {
        const c = hitungStatus();
        const defs = [['all', 'Semua'], ['PENDING', '⏳ Pending'], ['DISETUJUI', '✅ Disetujui'], ['DITOLAK', '❌ Ditolak'], ['SELESAI', '📦 Selesai'], ['DIBATALKAN', '🚫 Dibatalkan']];
        document.getElementById('chipsBar').innerHTML = defs.map(([k, l]) =>
            `<button type="button" class="chip ${activeStatus === k ? 'active' : ''}" onclick="GP.mods.perm.setStatusFilter('${k}')">${l}<span class="n">${c[k]}</span></button>`
        ).join('');

        const info = document.getElementById('ringkasanAdmin');
        if (info) {
            info.innerHTML = (isAdminUser && (c.PENDING + c.DISETUJUI) > 0)
                ? `<div class="alert alert-strip">🔔 ${c.PENDING} menunggu persetujuan · ${c.DISETUJUI} siap diproses</div>`
                : '';
        }
    }

    function stokHtml(r) {
        if (!['PENDING', 'DISETUJUI'].includes(r.status)) return '<span class="sub">-</span>';
        const stok = stokMap[r.detail_id];
        if (stok === undefined) return '<span class="sub">-</span>';
        const butuh = r.status === 'DISETUJUI' ? (r.approved_qty || 0) : (r.qty_diminta || 0);
        const kurang = stok < butuh;
        return `<b style="color:${kurang ? '#dc2626' : '#065f46'};">${fmt(stok)}</b>${kurang ? '<div class="sub" style="color:#dc2626;">⚠️ kurang</div>' : ''}`;
    }

    function qtyDisetujuiHtml(r) {
        if (r.status === 'DISETUJUI') {
            const beda = r.approved_qty !== r.qty_diminta;
            return `<b${beda ? ' style="color:#b45309;"' : ''}>${fmt(r.approved_qty)}</b>`;
        }
        if (r.status === 'SELESAI') {
            const beda = r.qty_diberikan !== r.qty_diminta;
            return `<b${beda ? ' style="color:#b45309;"' : ''}>${fmt(r.qty_diberikan)}</b><div class="sub">diberikan</div>`;
        }
        return '<span class="sub">-</span>';
    }

    function aksiHtml(r) {
        const own = r.requested_by === currentUserEmail;
        if (isAdminUser) {
            if (r.status === 'PENDING') {
                return `<div style="white-space:nowrap;">
                    <input type="number" class="qty-approve-input" id="approveQty_${r.id}" value="${r.qty_diminta}" min="1">
                    <button class="btn-small btn-setujui" onclick="GP.mods.perm.setujuiPermintaan(${r.id})">✅ Setujui</button>
                    <button class="btn-small btn-tolak" onclick="GP.mods.perm.tolakPermintaan(${r.id})">❌ Tolak</button>
                    <button class="btn-small btn-edit" title="Edit" onclick="GP.mods.perm.bukaEdit(${r.id})">✏️</button>
                    <button class="btn-small btn-batal" title="Batalkan" onclick="GP.mods.perm.batalkanPermintaan(${r.id})">🚫</button>
                </div>`;
            }
            if (r.status === 'DISETUJUI') {
                return `<div style="white-space:nowrap;">
                    <button class="btn-small btn-proses" onclick="GP.mods.perm.prosesPermintaan(${r.id})">🚚 Proses (${fmt(r.approved_qty)})</button>
                    <button class="btn-small btn-edit" title="Edit" onclick="GP.mods.perm.bukaEdit(${r.id})">✏️</button>
                    <button class="btn-small btn-batal" title="Batalkan" onclick="GP.mods.perm.batalkanPermintaan(${r.id})">🚫</button>
                </div>`;
            }
            if (r.status === 'DITOLAK' || r.status === 'DIBATALKAN') {
                return `<div style="white-space:nowrap;">
                    <button class="btn-small btn-buka" onclick="GP.mods.perm.bukaKembali(${r.id})">🔄 Buka Kembali</button>
                    <button class="btn-small btn-hapus" title="Hapus permanen" onclick="GP.mods.perm.hapusPermintaan(${r.id})">🗑️</button>
                </div>`;
            }
            return `<div style="white-space:nowrap;">
                ${selesaiAksi(r)}
                <button class="btn-small btn-hapus" title="Hapus permanen" onclick="GP.mods.perm.hapusPermintaan(${r.id})">🗑️</button>
            </div>`;
        }
        // leader
        if (r.status === 'PENDING' && own) {
            return `<div style="white-space:nowrap;">
                <button class="btn-small btn-edit" onclick="GP.mods.perm.bukaEdit(${r.id})">✏️ Edit</button>
                <button class="btn-small btn-batal" onclick="GP.mods.perm.batalkanPermintaan(${r.id})">🚫 Batalkan</button>
            </div>`;
        }
        if (r.status === 'PENDING') return '<span class="sub">Menunggu persetujuan gudang</span>';
        if (r.status === 'DISETUJUI') return '<span class="sub">Disetujui, menunggu diproses gudang</span>';
        if (r.status === 'SELESAI') return selesaiAksi(r);
        return '<span class="sub">-</span>';
    }

    function layarHP() {
        return typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 700px)').matches;
    }

    function renderCards(rows) {
        let html = '';
        for (const r of rows) {
            let lbl = 'Disetujui', val = '-', beda = false;
            if (r.status === 'DISETUJUI') { val = fmt(r.approved_qty); beda = r.approved_qty !== r.qty_diminta; }
            else if (r.status === 'SELESAI') { lbl = 'Diberikan'; val = fmt(r.qty_diberikan); beda = r.qty_diberikan !== r.qty_diminta; }
            const alasan = (r.status === 'DITOLAK' || r.status === 'DIBATALKAN') && r.alasan_tolak
                ? `<div class="req-list-note" style="color:#991b1b;">Alasan: ${esc(r.alasan_tolak)}</div>` : '';
            const catatan = r.catatan ? `<div class="req-list-note">📝 ${esc(r.catatan)}</div>` : '';
            html += `<div class="req-list-card">
                <div class="req-list-head">
                    <div><div class="req-list-pi">${esc(r.no_pi)}</div><div class="req-list-barang">${esc(r.brand)} | ${esc(r.jenis)}</div></div>
                    <span class="status-badge status-${esc(String(r.status).toLowerCase())}">${STATUS_LABEL[r.status] || esc(r.status)}</span>
                </div>
                <div class="req-list-grid">
                    <div><span>Diminta</span><b>${fmt(r.qty_diminta)}</b></div>
                    <div><span>${lbl}</span><b${beda ? ' style="color:#b45309;"' : ''}>${val}</b></div>
                    ${isAdminUser ? `<div><span>Stok Gudang</span>${stokHtml(r)}</div>` : ''}
                    <div><span>Butuh Tgl</span><b>${fmtTanggal(r.tanggal_dibutuhkan)}</b></div>
                </div>
                <div class="req-list-meta">Diajukan ${fmtWaktu(r.created_at)}${isAdminUser ? ' oleh ' + esc(namaPendek(r.requested_by)) : ''}</div>
                ${catatan}${alasan}
                <div class="req-list-aksi">${aksiHtml(r)}</div>
            </div>`;
        }
        return html;
    }

    function renderDaftar() {
        renderChips();
        const container = document.getElementById('daftarPermintaanList');
        const cari = (document.getElementById('searchReq')?.value || '').toLowerCase().trim();

        const rows = allRequests.filter(r => {
            if (activeStatus !== 'all' && r.status !== activeStatus) return false;
            if (!cari) return true;
            return [r.no_pi, r.brand, r.jenis, r.requested_by, r.catatan].join(' ').toLowerCase().includes(cari);
        });

        if (rows.length === 0) {
            container.innerHTML = '<div class="info-text" style="padding:15px;text-align:center;">Tidak ada permintaan</div>';
            return;
        }

        if (layarHP()) {
            container.innerHTML = renderCards(rows);
            return;
        }

        let html = '<div class="table-wrapper"><table><thead><tr>' +
            '<th>Diajukan</th><th>PI / Barang</th><th>Diminta</th><th>Disetujui</th>' +
            (isAdminUser ? '<th>Stok Gudang</th>' : '') +
            '<th>Butuh Tgl</th><th>Catatan</th><th>Status</th><th>Aksi</th>' +
            '</tr></thead><tbody>';

        for (const r of rows) {
            const alasan = (r.status === 'DITOLAK' || r.status === 'DIBATALKAN') && r.alasan_tolak
                ? `<div class="sub" style="color:#991b1b;">Alasan: ${esc(r.alasan_tolak)}</div>` : '';
            html += `<tr>
                <td>${fmtWaktu(r.created_at)}${isAdminUser ? `<div class="sub">${esc(namaPendek(r.requested_by))}</div>` : ''}</td>
                <td><b>${esc(r.no_pi)}</b><div class="sub">${esc(r.brand)} | ${esc(r.jenis)}</div></td>
                <td>${fmt(r.qty_diminta)}</td>
                <td>${qtyDisetujuiHtml(r)}</td>
                ${isAdminUser ? `<td>${stokHtml(r)}</td>` : ''}
                <td>${fmtTanggal(r.tanggal_dibutuhkan)}</td>
                <td class="catatan">${esc(r.catatan || '-')}</td>
                <td><span class="status-badge status-${esc(String(r.status).toLowerCase())}">${STATUS_LABEL[r.status] || esc(r.status)}</span>${alasan}</td>
                <td>${aksiHtml(r)}</td>
            </tr>`;
        }
        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    // ============================================================
    // AKSI (dengan penjagaan status supaya tidak bentrok)
    // ============================================================
    async function ubahStatus(id, dariStatus, patch, logAksi, logDetail) {
        const { data, error } = await sb.from('permintaan_produksi').update(patch).eq('id', id).in('status', dariStatus).select();
        if (error) { alert('Gagal: ' + error.message); return false; }
        if (!data || data.length === 0) {
            alert('Status permintaan ini sudah berubah (mungkin sudah diproses atau dibatalkan). Daftar akan dimuat ulang.');
            await loadDaftarPermintaan();
            return false;
        }
        if (typeof addLog === 'function') {
            try { await addLog(logAksi, logDetail); } catch (e) {}
        }
        await loadDaftarPermintaan();
        return true;
    }

    async function setujuiPermintaan(id) {
        const r = allRequests.find(x => x.id === id);
        if (!r) return;
        const approvedQty = parseInt(document.getElementById('approveQty_' + id).value);
        if (!approvedQty || approvedQty <= 0) { alert('Qty disetujui tidak valid!'); return; }

        const batas = await hitungBatas(r.detail_id, id);
        let pesan = `Setujui "${r.brand} - ${r.jenis}" sebanyak ${fmt(approvedQty)}?`;
        if (approvedQty !== r.qty_diminta) pesan += `\n(Beda dari yang diminta: ${fmt(r.qty_diminta)})`;
        if (approvedQty > batas.maxMinta) pesan += `\n\n⚠️ Melebihi batas kekurangan PI (maks ${fmt(batas.maxMinta)}).`;
        const stok = stokMap[r.detail_id];
        if (stok !== undefined && approvedQty > stok) pesan += `\n⚠️ Stok gudang saat ini hanya ${fmt(stok)}.`;
        if (!confirm(pesan)) return;

        const { data: { user } } = await sb.auth.getUser();
        await ubahStatus(id, ['PENDING'], {
            status: 'DISETUJUI', approved_qty: approvedQty, approved_by: user.email, approved_at: new Date().toISOString()
        }, 'SETUJUI PERMINTAAN', `${user.email} menyetujui permintaan #${id} (${r.brand} - ${r.jenis}) sebanyak ${approvedQty}`);
    }

    async function tolakPermintaan(id) {
        const alasan = prompt('Alasan menolak permintaan ini?');
        if (alasan === null) return;
        if (!alasan.trim()) { alert('Alasan wajib diisi!'); return; }
        const { data: { user } } = await sb.auth.getUser();
        await ubahStatus(id, ['PENDING'], {
            status: 'DITOLAK', alasan_tolak: alasan.trim(), approved_by: user.email, approved_at: new Date().toISOString()
        }, 'TOLAK PERMINTAAN', `${user.email} menolak permintaan #${id}: ${alasan.trim()}`);
    }

    async function batalkanPermintaan(id) {
        const r = allRequests.find(x => x.id === id);
        if (!r) return;
        if (!confirm(`Batalkan permintaan "${r.brand} - ${r.jenis}" (${fmt(r.qty_diminta)})?`)) return;

        let alasan = null;
        if (isAdminUser && r.requested_by !== currentUserEmail) {
            alasan = prompt('Alasan pembatalan (opsional, akan terlihat oleh pemohon):');
            if (alasan === null) return;
        }
        const { data: { user } } = await sb.auth.getUser();
        await ubahStatus(id, isAdminUser ? ['PENDING', 'DISETUJUI'] : ['PENDING'], {
            status: 'DIBATALKAN', alasan_tolak: (alasan && alasan.trim()) ? alasan.trim() : null
        }, 'BATAL PERMINTAAN', `${user.email} membatalkan permintaan #${id} (${r.brand} - ${r.jenis})`);
    }

    async function bukaKembali(id) {
        const r = allRequests.find(x => x.id === id);
        if (!r) return;
        if (!confirm(`Buka kembali permintaan "${r.brand} - ${r.jenis}" (${fmt(r.qty_diminta)}) menjadi PENDING?`)) return;
        const { data: { user } } = await sb.auth.getUser();
        await ubahStatus(id, ['DITOLAK', 'DIBATALKAN'], {
            status: 'PENDING', alasan_tolak: null, approved_qty: null, approved_by: null, approved_at: null
        }, 'BUKA KEMBALI PERMINTAAN', `${user.email} membuka kembali permintaan #${id} (${r.brand} - ${r.jenis})`);
    }



    // ============================================================
    // HAPUS PERMANEN (khusus admin)
    // ============================================================
    async function hapusPermintaan(id) {
        if (!isAdminUser || !id) return;
        const { data: r } = await sb.from('permintaan_produksi').select('*').eq('id', id).single();
        if (!r) {
            alert('Permintaan tidak ditemukan (mungkin sudah dihapus). Daftar akan dimuat ulang.');
            tutupEdit();
            await loadDaftarPermintaan();
            return;
        }

        let pesan = `HAPUS PERMANEN permintaan "${r.brand} - ${r.jenis}" (${fmt(r.qty_diminta)}) dari ${namaPendek(r.requested_by)}?\n\nData tidak bisa dikembalikan.`;
        if (r.status === 'SELESAI') {
            pesan += '\n\n⚠️ Permintaan ini sudah SELESAI. Catatan Barang Keluar-nya TIDAK ikut terhapus. Kalau itu juga data uji coba, hapus juga di histori Barang Keluar.';
        }
        if (!confirm(pesan)) return;

        const { data: terhapus, error } = await sb.from('permintaan_produksi').delete().eq('id', id).select();
        if (error) { alert('Gagal menghapus: ' + error.message); return; }
        if (!terhapus || terhapus.length === 0) {
            alert('Tidak ada data yang terhapus (kemungkinan ditolak oleh aturan akses database). Pastikan akun ini admin.');
            return;
        }

        const { data: { user } } = await sb.auth.getUser();
        if (typeof addLog === 'function') {
            try { await addLog('HAPUS PERMINTAAN', `${user.email} menghapus permintaan #${id} (${r.brand} - ${r.jenis}, ${r.qty_diminta}, status ${r.status})`); } catch (e) {}
        }
        tutupEdit();
        await loadDaftarPermintaan();
    }

    // ============================================================
    // EDIT
    // ============================================================
    async function bukaEdit(id) {
        const { data: r } = await sb.from('permintaan_produksi').select('*').eq('id', id).single();
        if (!r) { alert('Permintaan tidak ditemukan!'); return; }
        const own = r.requested_by === currentUserEmail;
        const boleh = isAdminUser ? ['PENDING', 'DISETUJUI'].includes(r.status) : (own && r.status === 'PENDING');
        if (!boleh) {
            alert('Permintaan ini sudah tidak bisa diedit (status: ' + r.status + ').');
            await loadDaftarPermintaan();
            return;
        }

        editingId = id;
        editStatus = r.status;
        editMode = r.status === 'DISETUJUI' ? 'disetujui' : 'diminta';
        editBatas = null;

        document.getElementById('editInfo').innerHTML =
            `<b>${esc(r.no_pi)}</b> · ${esc(r.brand)} | ${esc(r.jenis)} · Diminta: ${fmt(r.qty_diminta)}` +
            (r.status === 'DISETUJUI' ? ` · Disetujui: ${fmt(r.approved_qty)}` : '');
        document.getElementById('editQtyLabel').textContent = editMode === 'disetujui' ? 'Jumlah disetujui' : 'Jumlah diminta';
        document.getElementById('editQty').value = editMode === 'disetujui' ? r.approved_qty : r.qty_diminta;
        document.getElementById('editTanggal').value = r.tanggal_dibutuhkan || '';
        document.getElementById('editCatatan').value = r.catatan || '';
        document.getElementById('editMsg').innerHTML = '';
        document.getElementById('editBatas').textContent = 'Menghitung batas...';
        document.getElementById('btnHapusEdit').style.display = isAdminUser ? 'inline-block' : 'none';
        document.getElementById('editModal').style.display = 'flex';

        editBatas = await hitungBatas(r.detail_id, r.id);
        document.getElementById('editBatas').innerHTML =
            `Qty PI: ${fmt(editBatas.qtyPi)} · Sudah keluar: ${fmt(editBatas.sudah)} · Kurang: <b>${fmt(editBatas.kurang)}</b> · ` +
            `Permintaan lain yang berjalan: ${fmt(editBatas.sedangLain)} · <b>Maks: ${fmt(editBatas.maxMinta)}</b>`;
    }

    function tutupEdit() {
        document.getElementById('editModal').style.display = 'none';
        editingId = null;
    }

    async function simpanEdit() {
        if (!editingId) return;
        const msg = document.getElementById('editMsg');
        const qty = parseInt(document.getElementById('editQty').value);
        const tanggal = document.getElementById('editTanggal').value || null;
        const catatan = document.getElementById('editCatatan').value.trim();

        if (!qty || qty <= 0) { msg.innerHTML = '<div class="alert alert-error">Jumlah harus lebih dari 0!</div>'; return; }

        const { data: cur } = await sb.from('permintaan_produksi').select('*').eq('id', editingId).single();
        if (!cur || cur.status !== editStatus) {
            alert('Status permintaan sudah berubah, edit dibatalkan. Daftar akan dimuat ulang.');
            tutupEdit();
            await loadDaftarPermintaan();
            return;
        }

        if (!editBatas) editBatas = await hitungBatas(cur.detail_id, cur.id);
        if (qty > editBatas.maxMinta) {
            if (!isAdminUser) {
                msg.innerHTML = `<div class="alert alert-error">Jumlah ${fmt(qty)} melebihi batas yang boleh diminta (${fmt(editBatas.maxMinta)}).</div>`;
                return;
            }
            if (!confirm(`Jumlah ${fmt(qty)} melebihi batas kekurangan PI (maks ${fmt(editBatas.maxMinta)}). Tetap simpan?`)) return;
        }

        const patch = { tanggal_dibutuhkan: tanggal, catatan: catatan || null };
        if (editMode === 'disetujui') patch.approved_qty = qty; else patch.qty_diminta = qty;

        const { data, error } = await sb.from('permintaan_produksi').update(patch).eq('id', editingId).eq('status', editStatus).select();
        if (error) { msg.innerHTML = '<div class="alert alert-error">' + esc(error.message) + '</div>'; return; }
        if (!data || data.length === 0) {
            alert('Status permintaan sudah berubah, edit tidak tersimpan.');
            tutupEdit();
            await loadDaftarPermintaan();
            return;
        }

        const { data: { user } } = await sb.auth.getUser();
        if (typeof addLog === 'function') {
            try { await addLog('EDIT PERMINTAAN', `${user.email} mengubah permintaan #${editingId} (${cur.brand} - ${cur.jenis}) jumlah ${editMode === 'disetujui' ? cur.approved_qty : cur.qty_diminta} → ${qty}`); } catch (e) {}
        }
        tutupEdit();
        await loadDaftarPermintaan();
    }

    // ============================================================
    // HALAMAN
    // ============================================================
    async function loadHalaman() {
        document.getElementById('gpMain').innerHTML = `
            <div class="card">
                <div class="card-title">🙋 Ajukan Permintaan Barang</div>
                <div id="msgReq"></div>

                <label>Pilih No PI</label>
                <select id="req_pi_select" onchange="GP.mods.perm.onReqPiChange()">
                    <option value="">Loading...</option>
                </select>

                <label>Item di PI ini</label>
                <div id="reqItemContainer"></div>

                <label>Tanggal Dibutuhkan (opsional)</label>
                <input type="date" id="req_tanggal">

                <label>Catatan (opsional, berlaku untuk semua item di atas)</label>
                <textarea id="req_catatan" placeholder="Contoh: untuk line A, urgent, dll."></textarea>

                <button onclick="GP.mods.perm.simpanPermintaan()">🙋 Ajukan Permintaan</button>
                <span class="info-text">📌 Semua item PI yang masih kurang muncul otomatis. "Sudah Keluar" hanya menghitung barang yang benar-benar sudah diserahkan ke produksi. Setiap item disetujui/ditolak terpisah oleh gudang.</span>
            </div>

            <div class="card">
                <div class="card-title">
                    <span>${isAdminUser ? '📋 Daftar Permintaan (semua pemohon)' : '📋 Permintaan Saya'}</span>
                    <button type="button" class="btn-refresh" onclick="GP.mods.perm.loadDaftarPermintaan()">🔄 Refresh</button>
                </div>
                <div id="ringkasanAdmin"></div>
                <div id="chipsBar" class="chips"></div>
                <input type="text" id="searchReq" class="search-input" placeholder="🔍 Cari No PI, brand, jenis${isAdminUser ? ', pemohon' : ''}..." oninput="GP.mods.perm.renderDaftar()">
                <div id="daftarPermintaanList">
                    <div class="info-text">⏳ Memuat...</div>
                </div>
            </div>
        `;
        renderItemRows();

        // Ganti tampilan tabel <-> kartu otomatis saat ukuran layar berubah (mis. HP diputar)
        if (typeof window.matchMedia === 'function') {
            const mq = window.matchMedia('(max-width: 700px)');
            const saatBerubah = () => { if (allRequests.length) renderDaftar(); };
            if (mq.addEventListener) mq.addEventListener('change', saatBerubah);
            else if (mq.addListener) mq.addListener(saatBerubah);
        }

        await loadPiList();
        await loadDaftarPermintaan();
    }

    async function prosesPermintaan(id) {
        const { data: r } = await sb.from('permintaan_produksi').select('*').eq('id', id).single();
        if (!r) { alert('Permintaan tidak ditemukan!'); return; }
        if (r.status !== 'DISETUJUI') {
            alert('Permintaan ini tidak lagi berstatus DISETUJUI (status sekarang: ' + r.status + ').');
            await loadDaftarPermintaan();
            return;
        }
        const [m, k] = await Promise.all([
            sb.from('barang_masuk').select('qty').eq('detail_id', r.detail_id),
            sb.from('barang_keluar').select('qty').eq('detail_id', r.detail_id)
        ]);
        let stok = 0;
        (m.data || []).forEach(x => stok += x.qty || 0);
        (k.data || []).forEach(x => stok -= x.qty || 0);
        const def = Math.min(r.approved_qty || 0, Math.max(stok, 0));
        const s = prompt(`Serahkan berapa untuk "${r.brand} - ${r.jenis}" (PI ${r.no_pi})?\n\nDisetujui: ${fmt(r.approved_qty)}\nStok gudang saat ini: ${fmt(stok)}`, def > 0 ? def : r.approved_qty);
        if (s === null) return;
        const qty = parseInt(s);
        if (!qty || qty <= 0) { alert('Jumlah tidak valid!'); return; }
        if (qty > stok && !confirm(`Stok gudang hanya ${fmt(stok)}. Tetap serahkan ${fmt(qty)}? (stok akan minus)`)) return;
        const sisaP = (r.approved_qty || 0) - qty;
        let partial = false;
        if (sisaP > 0) {
            if (confirm(`Diserahkan ${fmt(qty)} dari ${fmt(r.approved_qty)} yang disetujui.\n\nOK = KIRIM SEBAGIAN (PARTIAL): sisa ${fmt(sisaP)} tetap menunggu dan dikirim di pengiriman berikutnya.\nBatal = pilihan lain.`)) partial = true;
            else if (!confirm(`Tutup permintaan dengan ${fmt(qty)} saja? Sisa ${fmt(sisaP)} dianggap tidak dikirim.`)) return;
        } else if (qty !== r.approved_qty && !confirm(`Jumlah (${fmt(qty)}) berbeda dari yang disetujui (${fmt(r.approved_qty)}). Lanjutkan?`)) return;
        const { data: { user } } = await sb.auth.getUser();
        const today = new Date().toISOString().split('T')[0];
        const ins = await sb.from('barang_keluar').insert([{
            detail_id: r.detail_id, tanggal: today, qty: qty,
            keterangan: `Permintaan produksi #${r.id} (${namaPendek(r.requested_by)})`, created_by: user.email
        }]).select();
        if (ins.error) { alert('Gagal mencatat barang keluar: ' + ins.error.message); return; }
        const upd = await sb.from('permintaan_produksi').update({
            status: 'SELESAI', qty_diberikan: qty, processed_by: user.email, processed_at: new Date().toISOString()
        }).eq('id', id).eq('status', 'DISETUJUI').select();
        if (upd.error || !upd.data || upd.data.length === 0) {
            const bid = ins.data && ins.data[0] && ins.data[0].id;
            if (bid) await sb.from('barang_keluar').delete().eq('id', bid);
            alert('Gagal memperbarui status permintaan' + (upd.error ? ': ' + upd.error.message : ' (status sudah berubah)') + '. Catatan barang keluar dibatalkan.');
            await loadDaftarPermintaan();
            return;
        }
        if (partial) {
            const baru = { pi_id: r.pi_id, detail_id: r.detail_id, no_pi: r.no_pi, brand: r.brand, jenis: r.jenis, qty_diminta: sisaP, approved_qty: sisaP, tanggal_dibutuhkan: r.tanggal_dibutuhkan,
                catatan: (r.catatan ? r.catatan + ' · ' : '') + `Sisa pengiriman partial dari #${r.id}`, status: 'DISETUJUI', requested_by: r.requested_by, batch_id: r.batch_id, approved_by: r.approved_by, approved_at: r.approved_at, parent_id: r.id };
            let i2 = await sb.from('permintaan_produksi').insert([baru]);
            if (i2.error && /parent_id/.test(i2.error.message || '')) { delete baru.parent_id; i2 = await sb.from('permintaan_produksi').insert([baru]); }
            if (i2.error) alert('⚠️ Pengiriman ' + fmt(qty) + ' tercatat, tetapi sisa ' + fmt(sisaP) + ' gagal dibuat otomatis: ' + i2.error.message + '\nBuat permintaan sisa secara manual.');
        }
        addLog('PROSES PERMINTAAN', `${user.email} menyerahkan ${qty}${partial ? ' (PARTIAL, sisa ' + sisaP + ')' : ''} untuk permintaan #${id} (${r.brand} - ${r.jenis})`);
        await loadDaftarPermintaan();
    }

    // ===== Bukti serah terima ke Produksi (1 bukti = 1 PI, banyak item) + konfirmasi Terima + pengiriman partial =====
    let retMap = {};
    const hariKey = iso => { const d = new Date(iso); return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); };
    function grupBukti(r) {
        const k = hariKey(r.processed_at);
        return allRequests.filter(x => x.status === 'SELESAI' && x.no_pi === r.no_pi && x.requested_by === r.requested_by && x.processed_at && hariKey(x.processed_at) === k).sort((a, b) => a.id - b.id);
    }
    const bstNo = r => { const g = grupBukti(r); return 'BST-' + hariKey(r.processed_at) + '-' + String(g.length ? g[0].id : r.id).padStart(4, '0'); };
    const anak = r => allRequests.filter(x => x.id !== r.id && x.status !== 'DIBATALKAN' && x.status !== 'DITOLAK' && (x.parent_id === r.id || (x.catatan || '').includes('partial dari #' + r.id + '')));
    const sisaPartial = r => anak(r).reduce((a, x) => a + (x.approved_qty || x.qty_diminta || 0), 0);
    function selesaiAksi(r) {
        const own = r.requested_by === currentUserEmail;
        const g = grupBukti(r);
        const ret = retMap[r.id];
        const retTxt = ret ? `<div class="sub" style="color:#b45309;">↩ Return: ${ret.NG ? 'NG ' + fmt(ret.NG) : ''}${ret.NG && ret.KURANG ? ' · ' : ''}${ret.KURANG ? 'Kurang ' + fmt(ret.KURANG) : ''}</div>` : '';
        const sp = sisaPartial(r);
        const partTxt = sp > 0 ? `<div class="sub" style="color:#1d4ed8;">📦 Partial — sisa ${fmt(sp)} menyusul</div>` : '';
        const trm = r.diterima_at
            ? `<div class="sub" style="color:#166534;">✅ Diterima ${esc(namaPendek(r.diterima_oleh))} · ${fmtWaktu(r.diterima_at)}</div>`
            : `<div class="sub" style="color:#b45309;">⏳ Belum dikonfirmasi penerima</div>`;
        const belum = g.filter(x => !x.diterima_at).length;
        const btnTerima = (!r.diterima_at && (own || isAdminUser)) ? `<button class="btn-small btn-proses" onclick="GP.mods.perm.terimaPermintaan(${r.id})">✅ Terima${g.length > 1 ? ' semua (' + belum + ' item)' : ' barang'}</button>` : '';
        return `<div style="white-space:normal;">
            <div class="sub">${bstNo(r)}${g.length > 1 ? ' · ' + g.length + ' item' : ''} · diserahkan ${fmtWaktu(r.processed_at)}${r.processed_by ? ' oleh ' + esc(namaPendek(r.processed_by)) : ''}</div>
            ${trm}${partTxt}${retTxt}
            <div style="margin-top:4px;white-space:nowrap;">${btnTerima} <button class="btn-small btn-edit" onclick="GP.mods.perm.cetakBukti(${r.id})">🖨️ Bukti${g.length > 1 ? ' (' + g.length + ' item)' : ''}</button></div></div>`;
    }
    async function terimaPermintaan(id) {
        const r = allRequests.find(x => x.id === id); if (!r) return;
        const g = grupBukti(r).filter(x => !x.diterima_at);
        const daftar = g.map(x => `• ${x.jenis}: ${fmt(x.qty_diberikan)}`).join('\n');
        if (!confirm(`Konfirmasi: kamu SUDAH MENERIMA barang berikut (PI ${r.no_pi})?\n\n${daftar}\n\nHitung dulu barangnya. Kalau ada yang NG atau kurang, ajukan di menu Return Produksi setelah ini.`)) return;
        let gagal = '';
        for (const x of g) {
            const { error } = await sb.rpc('terima_permintaan_produksi', { p_id: x.id });
            if (error) { gagal = error.message; break; }
        }
        if (gagal) { alert('❌ ' + gagal + '\n\nKalau pesannya "function ... not found", jalankan dulu file supabase_gudang_serah_produksi.sql di Supabase Gudang Pro.'); await loadDaftarPermintaan(); return; }
        addLog('TERIMA BARANG PRODUKSI', `${currentUserEmail} menerima ${g.length} item PI ${r.no_pi} (${bstNo(r)})`);
        showToast('Penerimaan barang tercatat', 'success');
        await loadDaftarPermintaan();
    }
    function cetakBukti(id) {
        const r = allRequests.find(x => x.id === id); if (!r) return;
        const g = grupBukti(r);
        const brands = [...new Set(g.map(x => x.brand).filter(Boolean))].join(', ');
        const diterimaOleh = (g.find(x => x.diterima_oleh) || {}).diterima_oleh, diterimaAt = (g.find(x => x.diterima_at) || {}).diterima_at;
        const semuaTerima = g.every(x => x.diterima_at);
        const total = g.reduce((a, x) => a + (x.qty_diberikan || 0), 0);
        const baris = g.map((x, i) => {
            const sp = sisaPartial(x), rt = retMap[x.id] || {};
            const ket = [x.qty_diberikan !== x.qty_diminta ? (sp > 0 ? 'PARTIAL, sisa ' + fmt(sp) + ' menyusul' : 'berbeda dari permintaan') : 'sesuai', rt.NG ? 'NG ' + fmt(rt.NG) : '', rt.KURANG ? 'kurang ' + fmt(rt.KURANG) : ''].filter(Boolean).join(' · ');
            return `<tr><td>${i + 1}</td><td style="text-align:left">${esc(x.jenis)}</td><td>${fmt(x.qty_diminta)}</td><td>${fmt(x.approved_qty)}</td><td><b>${fmt(x.qty_diberikan)}</b></td><td style="text-align:left;font-size:9px">${esc(ket)}</td><td class="isi"></td><td class="isi"></td></tr>`;
        }).join('');
        const kecil = g.length > 7 ? ' style="font-size:9px"' : '';
        const hal = (label, warna) => `<div class="hal"><div class="hd"><div><b class="firma">THE ROLLING PAPER COMPANY</b><br><span class="jdl">BUKTI SERAH TERIMA BARANG KE PRODUKSI</span></div><div class="lbl" style="color:${warna};border-color:${warna};">${label}</div></div>
            <div class="nomor">No. ${bstNo(r)} &nbsp;|&nbsp; ${esc(fmtWaktu(r.processed_at))}</div>
            <div class="info"><b>PI:</b> ${esc(r.no_pi)} &nbsp;&nbsp; <b>Brand:</b> ${esc(brands)}</div>
            <table class="items"${kecil}><thead><tr><th>No</th><th>Barang / Jenis</th><th>Diminta</th><th>Disetujui</th><th>DISERAHKAN</th><th>Keterangan</th><th>Diterima</th><th>NG/Kurang</th></tr></thead><tbody>${baris}</tbody>
            <tfoot><tr><td colspan="4" style="text-align:right"><b>Total diserahkan</b></td><td><b>${fmt(total)}</b></td><td colspan="3"></td></tr></tfoot></table>
            <div class="kond">Hitung &amp; cek kondisi saat serah terima, isi kolom <b>Diterima</b> dan <b>NG/Kurang</b>. Jika ada NG atau kekurangan, ajukan di aplikasi menu <b>Return Produksi</b> dengan menyebut <b>${bstNo(r)}</b>.</div>
            <div class="ttd"><div class="tb"><div>Diserahkan (Gudang)</div><div style="height:42px"></div><div class="tl"></div><b>${esc(namaPendek(r.processed_by))}</b></div>
            <div class="tb"><div>Diterima (Leader Produksi)</div><div style="height:42px"></div><div class="tl"></div><b>${esc(namaPendek(diterimaOleh || r.requested_by))}</b>${semuaTerima && diterimaAt ? `<div style="font-size:9px">Konfirmasi di aplikasi ${esc(fmtWaktu(diterimaAt))}</div>` : ''}</div></div>
            <div class="ft">Dicetak ${new Date().toLocaleString('id-ID')}</div></div>`;
        const css = `@page{size:A4 portrait;margin:7mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#000}
            .lembar{width:100%;max-width:196mm;height:283mm;display:flex;flex-direction:column}.hal{flex:1;padding:4mm 2mm;overflow:hidden}.hal+.hal{border-top:1.5px dashed #888}
            .hd{display:flex;justify-content:space-between;border-bottom:2px solid #1e3a8a;padding-bottom:3px}.firma{font-size:14px;color:#1e3a8a;letter-spacing:1px}.jdl{font-size:11px;font-weight:bold}
            .lbl{font-weight:bold;border:2px solid;padding:2px 8px;border-radius:5px;font-size:10px;height:fit-content}.nomor{background:#f1f5f9;text-align:center;font-weight:bold;padding:2px;margin:4px 0;font-size:10px}
            .info{border:1px solid #999;padding:3px 6px;margin-bottom:4px}table.items{width:100%;border-collapse:collapse}table.items th,table.items td{border:1px solid #999;padding:2px 4px;text-align:center}table.items th{background:#1e3a8a;color:#fff;font-size:9px}table.items td.isi{width:15%}table.items tfoot td{background:#fef9c3}
            .kond{border:1px dashed #666;padding:3px 6px;margin:5px 0;line-height:1.5;font-size:9.5px}.ttd{display:flex;justify-content:space-around;text-align:center;font-size:10px;margin-top:3px}.tb{width:44%}.tl{border-top:1px solid #000;margin-bottom:2px}.ft{margin-top:4px;text-align:center;font-size:8px;color:#555}`;
        const w = window.open('', '_blank'); if (!w) { alert('Pop-up diblokir browser. Izinkan pop-up lalu coba lagi.'); return; }
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${bstNo(r)}</title><style>${css}</style></head><body><div class="lembar">${hal('ASLI - arsip Gudang', '#1e3a8a')}${hal('SALINAN - Leader Produksi', '#166534')}</div></body></html>`);
        w.document.close(); setTimeout(() => w.print(), 300);
        addLog('CETAK BUKTI PRODUKSI', `${bstNo(r)} (${g.length} item) oleh ${currentUserEmail}`);
    }

    function hapusEditing() { return hapusPermintaan(editingId); }

async function init(){
  currentUserEmail = GP.me.email; isAdminUser = !!GP.me.admin;
  await loadHalaman();
}
NS.esc = esc;
NS.fmt = fmt;
NS.fmtTanggal = fmtTanggal;
NS.fmtWaktu = fmtWaktu;
NS.namaPendek = namaPendek;
NS.loadPiList = loadPiList;
NS.onReqPiChange = onReqPiChange;
NS.renderItemRows = renderItemRows;
NS.isiKurang = isiKurang;
NS.simpanPermintaan = simpanPermintaan;
NS.hitungBatas = hitungBatas;
NS.loadDaftarPermintaan = loadDaftarPermintaan;
NS.hitungStatus = hitungStatus;
NS.setStatusFilter = setStatusFilter;
NS.renderChips = renderChips;
NS.stokHtml = stokHtml;
NS.qtyDisetujuiHtml = qtyDisetujuiHtml;
NS.aksiHtml = aksiHtml;
NS.layarHP = layarHP;
NS.renderCards = renderCards;
NS.renderDaftar = renderDaftar;
NS.ubahStatus = ubahStatus;
NS.setujuiPermintaan = setujuiPermintaan;
NS.tolakPermintaan = tolakPermintaan;
NS.batalkanPermintaan = batalkanPermintaan;
NS.bukaKembali = bukaKembali;
NS.hapusPermintaan = hapusPermintaan;
NS.bukaEdit = bukaEdit;
NS.tutupEdit = tutupEdit;
NS.simpanEdit = simpanEdit;
NS.loadHalaman = loadHalaman;
NS.prosesPermintaan = prosesPermintaan;
NS.grupBukti = grupBukti;
NS.selesaiAksi = selesaiAksi;
NS.terimaPermintaan = terimaPermintaan;
NS.cetakBukti = cetakBukti;
NS.hapusEditing = hapusEditing;
NS.mount = async function(host){
  host.innerHTML = "<div class=\"gm-perm\"><div id=\"gpMain\">" + "" + "</div>\n<div id=\"editModal\" class=\"modal\">\n    <div class=\"modal-content\">\n        <h3>\u270f\ufe0f Edit Permintaan</h3>\n        <div id=\"editInfo\" class=\"info-text\"></div>\n        <div id=\"editMsg\" style=\"margin-top:8px;\"></div>\n\n        <label id=\"editQtyLabel\" style=\"font-size:13px;display:block;margin-top:8px;\">Jumlah diminta</label>\n        <input type=\"number\" id=\"editQty\" min=\"1\">\n        <div id=\"editBatas\" class=\"info-text\"></div>\n\n        <label style=\"font-size:13px;display:block;margin-top:8px;\">Tanggal dibutuhkan</label>\n        <input type=\"date\" id=\"editTanggal\">\n\n        <label style=\"font-size:13px;display:block;margin-top:8px;\">Catatan</label>\n        <textarea id=\"editCatatan\" placeholder=\"Catatan (opsional)\"></textarea>\n\n        <div class=\"modal-footer\">\n            <button type=\"button\" id=\"btnHapusEdit\" class=\"btn-hapus-modal\" onclick=\"GP.mods.perm.hapusEditing()\">\ud83d\uddd1\ufe0f Hapus</button>\n            <button type=\"button\" class=\"btn-batal-modal\" onclick=\"GP.mods.perm.tutupEdit()\">Batal</button>\n            <button type=\"button\" onclick=\"GP.mods.perm.simpanEdit()\">\ud83d\udcbe Simpan Perubahan</button>\n        </div>\n    </div>\n</div>\n\n</div>";
  
  await init();
};
})();
