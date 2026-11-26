/* Aplikasi Timbangan Kertas + penghubung ke modul Gudang (satu lingkup agar variabelnya saling terhubung) */

(function() {
    // ========== KONEKSI SUPABASE ==========
    const SUPABASE_URL = 'https://dggspzjibisapdaowkkj.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnZ3NwemppYmlzYXBkYW93a2tqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NjMxNzksImV4cCI6MjA4MzQzOTE3OX0.DtDb10SzKfwJg3bbVq53nG9RIXbZYtitXn67ZtdBMFY';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const fmtWaktu = t => t ? new Date(t).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) : '';

    // ========== DATA BAWAAN ==========
    const beratBundleDB = {
        "SINGLE 36X69|13|32":1.09, "SINGLE 36X69|13|33":1.10, "SINGLE 36X69|13|40":1.33,
        "SINGLE 36X69|13|50":1.67, "SINGLE 36X69|13|51":1.69, "SINGLE 36X69|13|60":2.00,
        "SINGLE 36X69|14|32":1.39, "SINGLE 36X69|14|33":1.43, "SINGLE 36X69|14|40":1.67,
        "SINGLE 36X69|14|50":2.04, "SINGLE 36X69|14|51":2.08, "SINGLE 36X69|14|60":2.40,
        "1 1/4 44X78|13|32":1.48, "1 1/4 44X78|13|33":1.54, "1 1/4 44X78|13|40":1.90, "1 1/4 44X78|13|50":2.34, "1 1/4 44X78|13|51":2.54,
        "1 1/4 44X78|14|32":1.62, "1 1/4 44X78|14|33":1.65, "1 1/4 44X78|14|35":1.75,
        "1 1/4 44X78|14|40":2.08, "1 1/4 44X78|14|42":2.21, "1 1/4 44X78|14|50":2.50,
        "1 1/4 44X78|14|51":2.58, "1 1/4 44X78|14|52":2.64,
        "1 1/4 44X78|20|51":3.60,
        "CLEAR PAPER 1 1/4 44X78|35|50":5.75,
        "KS 54X97|14|32":2.50, "KS 54X97|14|33":2.58, "KS 54X97|14|40":3.05, "KS 54X97|14|50":3.82,
        "KS 54X97|20|32":4.34, "KS 54X97|20|33":4.42, "KS 54X97|20|40":5.22, "KS 54X97|20|50":6.32,
        "KSS 44X108|13|32":2.19, "KSS 44X108|13|33":2.26, "KSS 44X108|13|35":2.35, "KSS 44X108|13|40":2.76,
        "KSS 44X108|13|50":3.44, "KSS 44X108|13|51":3.43,
        "KSS 44X108|14|32":2.27, "KSS 44X108|14|33":2.31, "KSS 44X108|14|34":2.48, "KSS 44X108|14|35":2.49,
        "KSS 44X108|14|40":2.79, "KSS 44X108|14|42":2.89, "KSS 44X108|14|50":3.49, "KSS 44X108|14|51":3.56, "KSS 44X108|14|52":3.58,
        "KSS 44X108|11|42":4.25,
        "KSS SLIM 36X108|14|32":1.88, "KSS SLIM 36X108|14|33":1.95, "KSS SLIM 36X108|14|34":2.00,
        "KSS SLIM 36X108|14|40":2.35, "KSS SLIM 36X108|14|50":2.95,
        "SKS 54X108|13|33":2.63, "SKS 54X108|13|40":3.20, "SKS 54X108|13|50":4.02,
        "SKS 54X108|14|33":2.92, "SKS 54X108|14|40":3.52, "SKS 54X108|14|50":4.40,
        "CLEAR PAPER SKS 54X108|35|50":10.28
    };
    const beratBoxMap = { "White":0.90, "White New":0.80, "Grey":1.25, "Green Jumbo":3.80 };
    const BERAT_LAYER_KG = 0.00618;
    const BASE_SIZES = ["SINGLE 36X69","1 1/4 44X78","CLEAR PAPER 1 1/4 44X78","KS 54X97","KSS 44X108","KSS SLIM 36X108","SKS 54X108","CLEAR PAPER SKS 54X108"];
    const BASE_GSM = [11,13,14,20,35];
    const BASE_LEAVES = [32,33,34,35,40,42,50,51,52,60];
    const LEADER_MESIN_EMAILS = [];   // opsional: email akun yang dianggap Leader Mesin (selain user_profiles.role berisi 'mesin')
    const TABS = {
        produksi: [],
        qc: [],
        admin:  [['page1','📦 Timbang'],['page2','📜 Riwayat'],['page3','📝 Permintaan'],['page8','🧾 Serah Terima'],['page6','🗂️ Master'],['page7','📋 Log']],
        leader: [['page4','🏭 Antrian'],['page9','🧮 Hitung'],['page5','📊 Stok'],['page8','🧾 Serah Terima'],['page6','🗂️ Master'],['page7','📋 Log']]
    };
    const MENU = [
        ['UTAMA', [['gp:dash','📊','Dashboard',['admin','leader','produksi','qc']]]],
        ['GUDANG', [['gp:pi','📝','Input PI',['admin']],['gp:masuk','📥','Barang Masuk',['admin']],['gp:keluar','📤','Barang Keluar',['admin']],['gp:sp','📦','Stok Pendukung',['admin']],['gp:track','🧭','Tracking Material',['admin']]]],
        ['PRODUKSI', [['gp:qc','🔍','QC Inspection',['admin','qc']],['gp:diecut','✂️','Proses Diecut',['admin','leader']],['gp:hasil','🏭','Serah Hasil Diecut',['admin','leader','qc']],['gp:perm','📋','Permintaan Produksi',['admin','produksi']],['gp:ret','↩️','Return Produksi',['admin','produksi']]]],
        ['TIMBANGAN KERTAS', [['page1','📦','Timbang',['admin']],['page2','📜','Riwayat',['admin']],['page3','📝','Permintaan Kertas',['admin']],['page4','🏭','Antrian',['leader']],['page9','🧮','Hitung',['leader']],['page5','📊','Stok Kertas',['leader']],['page8','🧾','Serah Terima',['admin','leader']],['page6','🗂️','Master',['admin','leader']],['page7','📋','Log',['admin','leader']]]]
        ,['SISTEM', [['gp:users','👥','Pengaturan Akun',['admin']]]]
    ];
    const ROLE_LABEL = { admin: 'ADMIN', leader: 'LEADER MESIN', produksi: 'LEADER PRODUKSI', qc: 'LEADER QC' };
    const ROLE_WARNA = { admin: '#1e3a8a', leader: '#b45309', produksi: '#0f766e', qc: '#7c3aed' };
    const STATUS_WARNA = { Diminta:'#3b82f6', Diproses:'#f59e0b', Produksi:'#8b5cf6', Siap:'#10b981', Diterima:'#166534', Dibatalkan:'#94a3b8' };
    const AKTIF = ['Diminta','Diproses','Produksi','Siap'];

    // ========== STATE ==========
    let user = null;
    let actAs = null;
    function curRole() { return actAs || (user && user.role); }
    let piList = [], jenisList = [], customBerat = [], piItems = [], piStatus = {}, piAktif = {}, piTutup = {}, wmList = [], userList = [], stMap = {}, pmBox = {};
    let pmData = [], pmTimbang = {}, stokMap = {};
    let currentPage = 1, currentSearch = "", currentEditId = null, currentOrderBy = "id", currentOrderAsc = false;
    let allDataCache = [];
    const rowsPerPage = 10;
    const CHECKED_IDS_KEY = 'rollingpaper_checked_ids';

    // ========== UTIL ==========
    function showStatus(msg, type) {
        const el = $('statusMsg');
        if (el) { el.innerText = msg; el.className = `status ${type}`; }
        setTimeout(() => { if (el && el.innerText === msg) { el.innerText = ''; el.className = 'status'; } }, 3500);
    }
    function getCheckedIds() { try { return new Set(JSON.parse(localStorage.getItem(CHECKED_IDS_KEY) || '[]')); } catch (e) { return new Set(); } }
    function saveCheckedIds(s) { localStorage.setItem(CHECKED_IDS_KEY, JSON.stringify([...s])); }
    function addCheckedId(id) { const s = getCheckedIds(); s.add(id); saveCheckedIds(s); }
    function removeCheckedId(id) { const s = getCheckedIds(); s.delete(id); saveCheckedIds(s); }
    function isChecked(id) { return getCheckedIds().has(id); }
    function clearAllChecked() { saveCheckedIds(new Set()); }
    function formatDateToDB(d) { if (!d) return ""; const p = d.split('-'); return p.length === 3 ? `${p[1]}/${p[2]}/${p[0]}` : d; }
    function formatDateForInput(d) { if (!d) return ""; const p = d.split('/'); return p.length === 3 ? `${p[2]}-${p[0]}-${p[1]}` : d; }
    function formatTanggalIndonesia(d) { return d || ""; }
    function normPI(v) { return (v || '').trim().toUpperCase(); }
    function canon(v) { return String(v || '').trim().split(/[\s(]/)[0].toUpperCase().replace(/[^A-Z0-9]/g, ''); }
    function findPI(v) { const n = normPI(v); return piList.find(p => p.no_pi.toUpperCase() === n); }
    function specKey(s, g, l, j, w) { return `${s}|${g}|${l}|${j}|${w}`; }
    async function catatLog(aksi, detail) {
        try { await supabase.from('log_aktivitas_timbang').insert([{ pengguna: user?.nama || '-', role: user?.role || '-', aksi, detail }]); }
        catch (e) { console.error(e); }
    }
    async function fetchAll(build) {
        let all = [], from = 0; const step = 1000;
        while (true) {
            const { data, error } = await build().range(from, from + step - 1);
            if (error) return { error };
            all = all.concat(data || []);
            if (!data || data.length < step) break;
            from += step;
        }
        return { data: all };
    }
    async function rpc(name, args) {
        const { error } = await supabase.rpc(name, args);
        if (error) { alert('❌ ' + error.message); return false; }
        return true;
    }
    function requireRole(role) {
        if (!user || curRole() !== role) { alert('⛔ Menu ini hanya untuk ' + (role === 'admin' ? 'Admin Timbang' : 'Leader Mesin')); return false; }
        return true;
    }

    // ========== DIALOG UMUM ==========
    function dialog(o) {
        return new Promise(resolve => {
            $('dlgTitle').textContent = o.title;
            $('dlgInfo').innerHTML = o.info || '';
            $('dlgQtyWrap').style.display = o.qty ? 'block' : 'none';
            if (o.qty) { $('dlgQtyLabel').textContent = o.qty.label; $('dlgQty').value = o.qty.value ?? ''; $('dlgQty').min = 1; }
            $('dlgQty2Wrap').style.display = o.qty2 ? 'block' : 'none';
            if (o.qty2) { $('dlgQty2Label').textContent = o.qty2.label; $('dlgQty2').value = o.qty2.value ?? ''; $('dlgQty2').min = 1; }
            $('dlgNoteWrap').style.display = o.note ? 'block' : 'none';
            if (o.note) { $('dlgNoteLabel').textContent = o.note.label + (o.note.required ? ' *' : ''); $('dlgNote').value = ''; }
            $('dlgOk').textContent = o.ok || 'OK';
            $('dlgModal').style.display = 'flex';
            const close = v => { $('dlgModal').style.display = 'none'; $('dlgOk').onclick = null; $('dlgCancel').onclick = null; resolve(v); };
            $('dlgCancel').onclick = () => close(null);
            $('dlgOk').onclick = () => {
                let qv = null, qv2 = null;
                if (o.qty) {
                    qv = parseInt($('dlgQty').value);
                    if (!(qv > 0)) { alert('Isian angka harus lebih dari 0'); return; }
                    if (o.qty.max && qv > o.qty.max) { alert('Qty melebihi batas (' + o.qty.max + ')'); return; }
                }
                if (o.qty2) {
                    qv2 = parseInt($('dlgQty2').value);
                    if (!(qv2 > 0)) { alert('Isian angka harus lebih dari 0'); return; }
                }
                const nv = o.note ? $('dlgNote').value.trim() : '';
                if (o.note && o.note.required && !nv) { alert('Wajib diisi: ' + o.note.label); return; }
                close({ qty: qv, qty2: qv2, note: nv });
            };
        });
    }

    // ========== JEMBATAN KE MODUL GUDANG PRO ==========
    window.GP.toast = (m, t) => showToast({ judul: (t === 'error' ? '⚠️ ' : t === 'success' ? '✅ ' : '') + String(m), isi: '' });
    window.GP.log = (a, d) => catatLog(a, d);
    window.GP.go = (page, params) => showPage('gp:' + page, params);
    window.GP.tsb = supabase;
    window.GP.opts = () => ({ sizes: allSizes(), gsm: allGsm(), leaves: allLeaves(), wm: (() => { const w = wmList.map(x => x.nama); return w.includes('No WM') ? w : ['No WM', ...w]; })() });

    // ========== LOGIN ==========
    async function initLogin() {
        const { data, error } = await supabase.rpc('daftar_user');
        if (error) { $('loginMsg').className = 'status error'; $('loginMsg').innerText = '⚠️ Database belum disiapkan. Jalankan supabase_setup.sql dulu. (' + error.message + ')'; return; }
        $('loginUser').innerHTML = (data || []).map(u => `<option value="${esc(u.nama)}">${esc(u.nama)} (${u.role === 'admin' ? 'Admin Timbang' : 'Leader Mesin'})</option>`).join('');
    }
    $('loginBtn').onclick = async () => {
        const nama = $('loginUser').value, pin = $('loginPin').value;
        if (!nama || !pin) { $('loginMsg').className = 'status error'; $('loginMsg').innerText = 'Pilih pengguna dan isi PIN'; return; }
        const { data, error } = await supabase.rpc('login_user', { p_nama: nama, p_pin: pin });
        if (error || !data || !data.length) { $('loginMsg').className = 'status error'; $('loginMsg').innerText = '❌ PIN salah'; return; }
        user = { nama: data[0].nama, role: data[0].role };
        sessionStorage.setItem('rp_user', JSON.stringify(user));
        $('loginPin').value = '';
        await startApp();
        catatLog('LOGIN', 'Masuk ke aplikasi');
    };
    // ----- login email (Gudang Pro) -----
    function setMsg(t, ok) { $('loginMsg').className = 'status ' + (ok ? 'success' : 'error'); $('loginMsg').innerText = t; }
    async function resolveGp(authUser) {
        const email = (authUser.email || '').toLowerCase();
        const { data: prof } = await window.sbG.from('user_profiles').select('role,email').eq('email', authUser.email).maybeSingle();
        const gr = String((prof && prof.role) || '').toLowerCase();
        if (gr === 'admin') return { nama: 'Admin Timbang', role: 'admin', email, gp: true };
        if (gr.includes('qc')) return { nama: email.split('@')[0], role: 'qc', email, gp: true };
        if (gr.includes('mesin') || LEADER_MESIN_EMAILS.map(x => x.toLowerCase()).includes(email)) return { nama: 'Leader Mesin', role: 'leader', email, gp: true };
        return { nama: email.split('@')[0], role: 'produksi', email, gp: true };
    }
    $('loginEmailBtn').onclick = async () => {
        if (!window.GP_KEY_OK) { setMsg('⚠️ Kunci Gudang Pro belum terbaca. Pastikan file config.js ada di folder yang sama dengan index.html dan GUDANG_KEY sudah diisi.'); return; }
        const email = $('loginEmail').value.trim(), pw = $('loginPass').value;
        if (!email || !pw) { setMsg('Isi email dan password'); return; }
        $('loginEmailBtn').disabled = true;
        try {
            const { data, error } = await window.sbG.auth.signInWithPassword({ email, password: pw });
            if (error || !data || !data.user) { const m = String((error && error.message) || ''); setMsg(/confirm/i.test(m) ? '❌ Email belum dikonfirmasi. Minta admin mengonfirmasi akun di Supabase.' : /invalid login/i.test(m) ? '❌ Email atau password salah (atau akun ini belum dibuat di Gudang Pro).' : '❌ ' + (m || 'Login gagal')); return; }
            user = await resolveGp(data.user);
            window.GP.me = { email: user.email, admin: user.role === 'admin', role: user.role };
            $('loginPass').value = '';
            await startApp();
            catatLog('LOGIN', 'Masuk dengan email ' + user.email);
        } catch (e) { setMsg('❌ ' + (e.message || e)); }
        finally { $('loginEmailBtn').disabled = false; }
    };
    $('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginEmailBtn').click(); });
    $('toPinLogin').onclick = () => { $('loginEmailBox').style.display = 'none'; $('loginPinBox').style.display = 'block'; $('loginMsg').innerText = ''; };
    $('toEmailLogin').onclick = () => { $('loginPinBox').style.display = 'none'; $('loginEmailBox').style.display = 'block'; $('loginMsg').innerText = ''; };
    $('loginPin').addEventListener('keydown', e => { if (e.key === 'Enter') $('loginBtn').click(); });
    $('logoutBtn').onclick = async () => { catatLog('LOGOUT', 'Keluar dari aplikasi'); sessionStorage.removeItem('rp_user'); try { await window.sbG.auth.signOut(); } catch (e) {} location.reload(); };

    $('pinBtn').onclick = () => { $('pinLama').value = $('pinBaru').value = $('pinBaru2').value = ''; $('pinModal').style.display = 'flex'; };
    $('pinBatalBtn').onclick = () => { $('pinModal').style.display = 'none'; };
    $('pinSimpanBtn').onclick = async () => {
        if ($('pinBaru').value !== $('pinBaru2').value) { alert('PIN baru tidak sama'); return; }
        const { data, error } = await supabase.rpc('ganti_pin', { p_nama: user.nama, p_pin_lama: $('pinLama').value, p_pin_baru: $('pinBaru').value });
        if (error) { alert('❌ ' + error.message); return; }
        if (!data) { alert('❌ PIN lama salah'); return; }
        $('pinModal').style.display = 'none';
        alert('✅ PIN berhasil diganti');
        catatLog('GANTI_PIN', 'PIN diganti');
    };

    async function startApp() {
        $('loginOverlay').style.display = 'none';
        $('userBar').style.display = 'flex';
        $('userInfo').textContent = user.gp ? user.email : user.nama;
        $('roleBadge').textContent = ROLE_LABEL[user.role] || '';
        $('roleBadge').style.background = ROLE_WARNA[user.role] || '#475569';
        $('mpImporBtn').style.display = user.role === 'admin' ? 'block' : 'none';
        $('mpForm').style.display = user.gp ? 'none' : '';
        $('mpGpNote').style.display = user.gp ? '' : 'none';
        $('pinBtn').style.display = !HAS_T() ? 'none' : '';
        $('bellBtn').style.display = !HAS_T() ? 'none' : '';
        window.GP.me = user.gp ? { email: user.email, admin: user.role === 'admin', role: user.role } : null;
        if (HAS_T()) await loadMasterData();
        buildTabs();
        if (HAS_T()) startNotif();
    }
    function HAS_T() { return user.role === 'admin' || user.role === 'leader'; }
    const ALL_T = ['page1','page2','page3','page4','page9','page5','page8','page6','page7'];
    function tabAllowed(pid) { return user.role === 'admin' ? ALL_T.includes(pid) : TABS[user.role].some(t => t[0] === pid); }
    function menuAllowed(it) {
        if (user.role !== 'admin' && !it[3].includes(user.role)) return false;
        if (it[0].startsWith('gp:')) return !!user.gp;
        return tabAllowed(it[0]);
    }
    function buildTabs() {
        document.body.classList.add('sbOn');
        let html = '';
        MENU.forEach(([g, items]) => {
            const ok = items.filter(menuAllowed);
            if (!ok.length) return;
            html += `<div class="sbGroup">${g}</div>` + ok.map(it => `<div class="sbi" data-page="${it[0]}" data-label="${esc(it[2].toLowerCase())}"><span class="ic">${it[1]}</span><span class="lb">${esc(it[2])}</span></div>`).join('');
        });
        $('sbMenu').innerHTML = html;
        $('sbMenu').querySelectorAll('.sbi').forEach(t => t.onclick = () => { showPage(t.dataset.page); document.body.classList.remove('sbOpen'); });
        const first = user.gp ? 'gp:dash' : TABS[user.role][0][0];
        showPage(first);
    }
    $('sbSearch').oninput = () => {
        const q = $('sbSearch').value.trim().toLowerCase();
        document.querySelectorAll('#sbMenu .sbi').forEach(t => { t.style.display = !q || t.dataset.label.includes(q) ? '' : 'none'; });
        document.querySelectorAll('#sbMenu .sbGroup').forEach(g => {
            let n = g.nextElementSibling, any = false;
            while (n && n.classList.contains('sbi')) { if (n.style.display !== 'none') any = true; n = n.nextElementSibling; }
            g.style.display = any ? '' : 'none';
        });
    };
    $('menuBtn').onclick = () => document.body.classList.toggle('sbOpen');
    $('sbOverlay').onclick = () => document.body.classList.remove('sbOpen');
    function showPage(pid, params) {
        if (!user) return;
        const isGp = pid.startsWith('gp:');
        if (isGp) { if (!user.gp || !MENU.some(([, its]) => its.some(it => it[0] === pid && menuAllowed(it)))) return; }
        else if (!tabAllowed(pid)) return;
        actAs = (user.role === 'admin' && ['page4','page9','page5'].includes(pid)) ? 'leader' : null;
        document.querySelectorAll('#sbMenu .sbi').forEach(t => t.classList.toggle('active', t.dataset.page === pid));
        document.querySelectorAll('.page').forEach(p => p.classList.toggle('active-page', p.id === pid));
        $('mainContainer').classList.toggle('wide', isGp);
        $('gpHost').classList.toggle('on', isGp);
        if (isGp) {
            window.GP.params = params instanceof URLSearchParams ? params : new URLSearchParams(params || {});
            const key = pid.slice(3);
            $('gpHost').innerHTML = '<div style="padding:20px;color:#64748b">⏳ Memuat...</div>';
            Promise.resolve(window.GP.mods[key].mount($('gpHost'))).catch(e => { console.error(e); $('gpHost').innerHTML = '<div class="card" style="padding:16px;color:#b91c1c">❌ Gagal memuat halaman: ' + esc(e.message || e) + '</div>'; });
            window.scrollTo(0, 0);
            return;
        }
        $('gpHost').innerHTML = '';
        const loaders = { page1: loadPermintaanOptions, page2: loadAllData, page3: () => { loadMasterData(); loadPermintaan(); }, page4: loadPermintaan, page9: async () => { await loadPermintaan(); fillLcPm(); }, page5: () => { loadStok(); loadMasterData(); }, page6: () => { renderMaster(); loadMasterData(); }, page7: loadLog, page8: loadSerahTerima };
        if (loaders[pid]) loaders[pid]();
    }

    // ========== MASTER DATA & SELECT ==========
    function fillSelect(id, values, labelFn) {
        const el = $(id); if (!el) return;
        const prev = el.value;
        el.innerHTML = values.map(v => `<option value="${esc(v)}">${esc(labelFn ? labelFn(v) : v)}</option>`).join('');
        if (values.map(String).includes(prev)) el.value = prev;
    }
    function allSizes() { return [...new Set([...BASE_SIZES, ...customBerat.map(c => c.size_kertas)])]; }
    function allGsm() { return [...new Set([...BASE_GSM, ...customBerat.map(c => c.gsm)])].sort((a, b) => a - b); }
    function allLeaves() { return [...new Set([...BASE_LEAVES, ...customBerat.map(c => c.leaves)])].sort((a, b) => a - b); }
    function setPiStatus(rows) {
        piStatus = {}; piAktif = {}; piTutup = {};
        (rows || []).forEach(x => { piStatus[x.pi_item_id] = Number(x.qty_diminta); piAktif[x.pi_item_id] = Number(x.n_aktif || 0); piTutup[x.pi_item_id] = !!x.ditutup; });
    }
    function itemBuka(i) { return !piTutup[i.id] && (i.qty_pi - (piStatus[i.id] || 0)) > 0; }
    function itemLabel(i) { const p = piList.find(x => x.id === i.pi_id) || {}; return `${p.no_pi || '?'} · ${p.brand || ''} · ${i.jenis_kertas} · ${i.watermark} · ${i.size_kertas} · ${i.gsm}gsm · ${i.leaves}lv`; }
    function qtyPiSpan(r) { const pit = piItems.find(x => x.id === r.pi_item_id); return pit ? `<span>Qty PI: <b>${pit.qty_pi}</b></span>` : ''; }
    function fillStPi() {
        const el = $('stPiItem'); if (!el) return;
        const prev = el.value;
        el.innerHTML = '<option value="">— isi manual —</option>' + piItems.filter(i => !piTutup[i.id]).map(i => `<option value="${i.id}">${esc(itemLabel(i))}</option>`).join('');
        el.value = prev;
    }
    function refreshSelects() {
        const jn = jenisList.map(j => j.nama);
        ['mpJenis', 'stJenis', 'editJenis', 'eiJenis', 'qJenis', 'lcJenis'].forEach(id => fillSelect(id, jn));
        const wn = wmList.map(w => w.nama);
        ['mpWm', 'stWm', 'eiWm', 'editWm', 'qWm', 'lcWm'].forEach(id => fillSelect(id, wn));
        fillSelect('cbJenis', ['', ...jn], v => v === '' ? '(Semua jenis)' : v);
        ['mpSize', 'stSize', 'editSize', 'eiSize', 'qSize', 'lcSize'].forEach(id => fillSelect(id, allSizes()));
        ['mpGsm', 'stGsm', 'editGsm', 'eiGsm', 'qGsm', 'lcGsm'].forEach(id => fillSelect(id, allGsm()));
        ['mpLeaves', 'stLeaves', 'eiLeaves', 'editLeaves', 'qLeaves', 'lcLeaves'].forEach(id => fillSelect(id, allLeaves()));
        fillSelect('editNoPo', piList.map(p => p.no_pi));
        fillSelect('qPi', ['', ...piList.map(p => p.no_pi)], v => v === '' ? '— tanpa PI —' : v);
        fillPmPi(); if ($('pmPi').value) onPmPiInput(true); else onPmPiInput(true);
        fillMpPilih();
        $('brandList').innerHTML = [...new Set(piList.map(p => p.brand))].map(b => `<option value="${esc(b)}">`).join('');
        fillStPi(); $('sizeList').innerHTML = allSizes().map(s => `<option value="${esc(s)}">`).join('');
        const f = (id, list) => fillSelect(id, list, v => v === 'AKTIF' ? 'Aktif (belum selesai)' : v === 'SEMUA' ? 'Semua status' : v);
        f('pmFilter', ['AKTIF', 'SEMUA', 'Diminta', 'Diproses', 'Produksi', 'Siap', 'Diterima', 'Dibatalkan']);
        f('qFilter', ['AKTIF', 'SEMUA', 'Diminta', 'Diproses', 'Produksi', 'Siap', 'Diterima', 'Dibatalkan']);
    }
    async function loadMasterData() {
        const [d, e, a, b, c, w, us] = await Promise.all([
            fetchAll(() => supabase.from('pi_item').select('*').order('id')),
            fetchAll(() => supabase.from('pi_item_status').select('*').order('pi_item_id')),
            fetchAll(() => supabase.from('master_pi').select('*').order('id', { ascending: false })),
            supabase.from('jenis_kertas').select('*').order('id'),
            supabase.from('berat_bundle_custom').select('*').order('id'),
            supabase.from('watermark').select('*').order('id'),
            supabase.rpc('daftar_user')
        ]);
        piList = a.data || [];
        piItems = (d.data || []).map(x => ({ ...x, gsm: Number(x.gsm), leaves: Number(x.leaves), qty_pi: Number(x.qty_pi) }));
        setPiStatus(e.data);
        jenisList = b.data || [];
        wmList = w.data || []; userList = us.data || [];
        customBerat = (c.data || []).map(x => ({ ...x, gsm: Number(x.gsm), leaves: Number(x.leaves), gram_per_bundle: Number(x.gram_per_bundle) }));
        refreshSelects();
        if (user && $('page6').classList.contains('active-page')) renderMaster();
    }
    function beratBundleKG(size, gsm, leaves, jenis) {
        const c = customBerat.filter(x => x.size_kertas === size && x.gsm == gsm && x.leaves == leaves);
        const hit = c.find(x => x.jenis_kertas === jenis) || c.find(x => !x.jenis_kertas);
        if (hit) return hit.gram_per_bundle / 1000;
        const g = beratBundleDB[`${size}|${gsm}|${leaves}`];
        if (!g && typeof sizeNama === 'function') { const sn2 = sizeNama(size); if (sn2 && sn2 !== size) return beratBundleKG(sn2, gsm, leaves, jenis); }
        return g ? g / 1000 : null;
    }

    // ========== TIMBANG ==========
    $('tanggal').value = new Date().toISOString().split('T')[0];
    let permintaanTimbang = [];

    function pmLabel(d) { return `#${d.id} · ${d.no_pi} · ${d.brand} · ${d.jenis_kertas} · ${d.watermark} · ${d.size_kertas} · ${d.gsm}gsm · ${d.leaves}lv · ${d._box}/${d.box_siap} box${d.box_siap > 0 && d._box >= d.box_siap ? ' ✅' : ''}`; }
    async function loadPermintaanOptions() {
        if (!user || user.role !== 'admin') return;
        const sel = $('permintaanTerkait'), keep = sel.value;
        const [a, n] = await Promise.all([
            supabase.from('permintaan').select('*').eq('status', 'Siap').order('id'),
            supabase.from('serah_terima').select('permintaan_id').in('status', ['Menunggu', 'Disepakati'])
        ]);
        if (a.error) { console.error(a.error); return; }
        const locked = new Set((n.data || []).map(x => x.permintaan_id));
        permintaanTimbang = (a.data || []).filter(d => !locked.has(d.id));
        const ids = permintaanTimbang.map(d => d.id);
        let sums = {};
        if (ids.length) {
            const r = await supabase.from('ditimbang_per_permintaan').select('*').in('permintaan_id', ids);
            (r.data || []).forEach(x => sums[x.permintaan_id] = x);
        }
        permintaanTimbang.forEach(d => { d._timbang = (sums[d.id] && sums[d.id].bundles) || 0; d._box = (sums[d.id] && sums[d.id].jumlah_box) || 0; });
        sel.innerHTML = '<option value="">— pilih permintaan —</option><option value="CEPAT">⚡ Timbang cepat / uji coba (tanpa PI & permintaan)</option>' + permintaanTimbang.map(d => `<option value="${d.id}">${esc(pmLabel(d))}</option>`).join('');
        if (keep === 'CEPAT' || (keep && ids.includes(Number(keep)))) sel.value = keep;
        else if (ids.length === 1) sel.value = ids[0];
        $('pmEmpty').className = 'hint';
        $('pmEmpty').textContent = ids.length ? '' : '📭 Belum ada permintaan yang siap ditimbang (Anda akan mendapat notifikasi saat Leader menyiapkan). Untuk coba/timbang cepat pilih "⚡ Timbang cepat".';
        onPermintaanChange();
    }
    $('permintaanTerkait').addEventListener('change', onPermintaanChange);
    let progSeq = 0;
    async function renderProgres(r) {
        const seq = ++progSeq;
        const { data } = await supabase.from('riwayat_timbang').select('id,jenis_box,jumlah_layer,berat_timbang_kg,jumlah_bundles').eq('permintaan_id', r.id).order('id');
        if (seq !== progSeq) return;
        const rows = data || [], tot = rows.reduce((a, x) => a + (x.jumlah_bundles || 0), 0), n = rows.length;
        const target = r.qty_minta, pct = target > 0 ? tot / target * 100 : 0, sisa = target - tot;
        const avg = n ? tot / n : (r.box_siap > 0 ? r.qty_siap / r.box_siap : 0);
        const perkBox = sisa > 0 && avg > 0 ? Math.ceil(sisa / avg) : 0;
        $('progCard').style.display = 'block';
        $('progBox').innerHTML = `<div>📦 Box ditimbang: <span class="big">${n}</span> <span style="color:#64748b">dari ${r.box_siap} box yang disiapkan Leader</span></div>
            <div style="margin-top:6px;">🎯 Total bundles: <span class="big">${tot.toLocaleString('id-ID')}</span> <span style="color:#64748b">/ target ${target.toLocaleString('id-ID')}</span></div>
            <div class="bar"><i class="${pct >= 100 ? (pct > 102 ? 'over' : 'ok') : ''}" style="width:${Math.min(pct, 100).toFixed(1)}%"></i></div>
            <div style="font-size:.82rem;line-height:1.6;">${pct.toFixed(1)}% tercapai · ${sisa > 0 ? `<b>sisa ${sisa.toLocaleString('id-ID')} bundle</b>` : `<b class="${sisa === 0 ? 'good' : 'warn'}">${sisa === 0 ? 'pas sesuai target' : 'lebih ' + (-sisa).toLocaleString('id-ID')}</b>`}${n ? ` · rata-rata ${Math.round(avg).toLocaleString('id-ID')}/box` : ''}${perkBox ? `<br>👉 Perkiraan butuh <b>±${perkBox} box lagi</b>${n + perkBox > r.box_siap ? ' (lebih dari yang disiapkan Leader, minta Leader tambah box)' : ''}` : ''}</div>`;
        $('progBanner').innerHTML = target > 0 && tot >= target
            ? `<div class="tercapai">✅ TARGET TERCAPAI (${pct.toFixed(1)}%)${tot > target ? ` · lebih ${(tot - target).toLocaleString('id-ID')} bundle karena box utuh` : ''}<br>Tidak perlu menimbang box lagi${r.box_siap > n ? ` — ${r.box_siap - n} box sisa tetap di Leader (tetap dihitung stok)` : ''}. Lanjut buat nota.</div>`
            : (r.box_siap > 0 && n >= r.box_siap ? `<div class="warnbox">⚠️ Semua ${r.box_siap} box sudah ditimbang tetapi total masih kurang ${sisa.toLocaleString('id-ID')} bundle dari target. Minta Leader menambah box, atau buat nota sesuai hasil timbang.</div>` : '');
        $('progRows').innerHTML = rows.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.jenis_box || '')}</td><td>${x.jumlah_layer || 0}</td><td>${Number(x.berat_timbang_kg || 0).toFixed(2)}</td><td><b>${x.jumlah_bundles}</b></td></tr>`).join('') || '<tr><td colspan="5" style="text-align:center">Belum ada box ditimbang</td></tr>';
        $('goNotaBtn').style.display = n > 0 ? 'block' : 'none';
        $('goNotaBtn').style.background = tot >= target ? '#166534' : '#64748b';
        $('goNotaBtn').textContent = tot >= target ? '🧾 Target tercapai → Buat nota' : '🧾 Buat nota dengan box yang sudah ditimbang';
    }
    function onPermintaanChange() {
        const cepat = $('permintaanTerkait').value === 'CEPAT';
        $('quickBox').style.display = cepat ? 'block' : 'none';
        if (cepat) { $('progCard').style.display = 'none'; $('boxForm').style.display = 'block'; $('specRingkas').style.display = 'none'; $('pmInfo').className = 'hint'; $('pmInfo').textContent = ''; $('goNotaBtn').style.display = 'none'; return; }
        const id = Number($('permintaanTerkait').value);
        const r = permintaanTimbang.find(d => d.id === id);
        if (!r) { $('progCard').style.display = 'none'; $('boxForm').style.display = 'none'; $('specRingkas').style.display = 'none'; $('pmInfo').textContent = ''; $('hasilCard').style.display = 'none'; return; }
        $('boxForm').style.display = 'block';
        $('specRingkas').style.display = 'block';
        $('specRingkas').innerHTML = `📄 <b>${esc(r.no_pi)}</b> · 🏷️ ${esc(r.brand)}<br>🧻 <b>${esc(r.jenis_kertas)}</b> · 💧 ${esc(r.watermark)} · 📏 ${esc(r.size_kertas)} · ${r.gsm} gsm · ${r.leaves} leaves`;
        const sisa = r.qty_minta - r._timbang, semua = r.box_siap > 0 && r._box >= r.box_siap;
        $('pmInfo').className = 'hint ' + (sisa < 0 ? 'bad' : 'ok');
        $('pmInfo').textContent = `Diminta ${r.qty_minta} | disiapkan Leader ${r.box_siap} box (est. ${r.qty_siap} bundle) | sudah ditimbang ${r._box} dari ${r.box_siap} box (${r._timbang} bundle) | ${sisa >= 0 ? 'sisa ' + sisa : 'LEBIH ' + (-sisa)} bundle dari permintaan.` + (semua ? ' ✅ Semua box sudah ditimbang.' : ` Box berikutnya: ke-${r._box + 1}.`);
        renderProgres(r);
    }
    $('qPi').addEventListener('change', () => { const p = findPI($('qPi').value); if (p && p.brand !== '-') $('qBrand').value = p.brand; });
    $('goNotaBtn').onclick = async () => {
        const id = Number($('permintaanTerkait').value); if (!id) return;
        await loadPermintaan();
        await aksiPermintaan('nota', id);
    };

    async function hitungSimpan() {
        if (!requireRole('admin')) return;
        const cepat = $('permintaanTerkait').value === 'CEPAT';
        const pmId = cepat ? null : Number($('permintaanTerkait').value);
        let r = cepat ? { no_pi: $('qPi').value || '-', brand: ($('qBrand').value.trim().toUpperCase() || (findPI($('qPi').value) || {}).brand || '-'), jenis_kertas: $('qJenis').value, watermark: $('qWm').value, size_kertas: $('qSize').value, gsm: $('qGsm').value, leaves: $('qLeaves').value } : permintaanTimbang.find(d => d.id === pmId);
        if (!r) { alert('Pilih dulu permintaan yang akan ditimbang, atau pilih ⚡ Timbang cepat.'); return; }
        const beratTimbang = parseFloat($('berat').value);
        if (isNaN(beratTimbang) || beratTimbang <= 0) { alert("Masukkan berat timbang!"); return; }

        const boxType = $('box').value;
        const beratBox = beratBoxMap[boxType];
        const jumlahLayer = parseInt($('layer').value) || 0;
        const beratLayer = jumlahLayer * BERAT_LAYER_KG;
        const beratBersih = beratTimbang - beratBox - beratLayer;
        if (beratBersih <= 0) { alert("Berat bersih negatif! Periksa berat timbang dan jenis box."); return; }

        const size = r.size_kertas, gsm = r.gsm, leaves = r.leaves, jenis = r.jenis_kertas;
        let bb = beratBundleKG(size, gsm, leaves, jenis);
        if (!bb) {
            const ok = await isiBeratInline({ size_kertas: size, gsm, leaves, jenis_kertas: jenis }, true);
            if (ok === null) return;
            bb = beratBundleKG(size, gsm, leaves, jenis);
            if (!bb) { alert('Berat per bundle belum diisi, jadi box belum bisa dihitung.'); return; }
        }
        const bundlesDesimal = beratBersih / bb;
        const bundlesBulat = Math.ceil(Math.round(bundlesDesimal * 1e6) / 1e6);

        const { data: cur } = cepat ? { data: null } : await supabase.from('ditimbang_per_permintaan').select('bundles,jumlah_box').eq('permintaan_id', pmId);
        const sudah = (cur && cur[0] && cur[0].bundles) || 0, nBox = (cur && cur[0] && cur[0].jumlah_box) || 0;
        const ref = nBox > 0 ? sudah / nBox : (r.box_siap > 0 ? r.qty_siap / r.box_siap : 0);
        if (!cepat && ref > 0 && Math.abs(bundlesBulat - ref) / ref > 0.15 &&
            !confirm(`⚠️ Hasil box ini ${bundlesBulat} bundle, berbeda ${Math.round(Math.abs(bundlesBulat - ref) / ref * 100)}% dari rata-rata ${nBox > 0 ? 'box sebelumnya' : 'estimasi Leader'} (${Math.round(ref)}).\nPeriksa lagi berat, jenis box, dan layer.\nTetap simpan?`)) return;
        if (!cepat && r.box_siap > 0 && nBox >= r.box_siap &&
            !confirm(`⚠️ Leader menyiapkan ${r.box_siap} box dan ${nBox} box sudah ditimbang.\nIni akan menjadi box ke-${nBox + 1}. Yakin?`)) return;
        if (!cepat && sudah >= r.qty_minta &&
            !confirm(`⚠️ TARGET SUDAH TERCAPAI (${sudah} dari ${r.qty_minta} bundle).\nBox tambahan ini akan membuat hasil melebihi permintaan. Biasanya sudah tidak perlu menimbang lagi — langsung buat nota.\nTetap simpan box ini?`)) return;

        $('beratBersih').innerHTML = beratBersih.toFixed(4);
        $('jumlahBundles').innerHTML = bundlesBulat;
        $('hasilCard').style.display = "block";

        const dataToSave = {
            tanggal: formatDateToDB($('tanggal').value),
            no_po: r.no_pi, brand: r.brand,
            size_kertas: size, gsm: parseInt(gsm), leaves_per_bundle: parseInt(leaves),
            jenis_kertas: jenis, watermark: r.watermark,
            jenis_box: boxType, jumlah_layer: jumlahLayer,
            berat_timbang_kg: beratTimbang, berat_bersih_kg: beratBersih,
            jumlah_bundles: bundlesBulat, bundles_desimal: bundlesDesimal,
            permintaan_id: pmId, dibuat_oleh: user.nama
        };
        showStatus('⏳ Menyimpan ke cloud...', 'loading');
        const { error } = await supabase.from('riwayat_timbang').insert([dataToSave]);
        if (error) { showStatus('❌ Gagal: ' + error.message, 'error'); alert('Gagal simpan! ' + error.message); }
        else {
            showStatus(cepat ? `✅ Tersimpan (timbang cepat): ${bundlesBulat} bundle` : `✅ Box ke-${nBox + 1} tersimpan: ${bundlesBulat} bundle → total ${sudah + bundlesBulat} / ${r.qty_minta}${sudah + bundlesBulat >= r.qty_minta ? ' ✅ TARGET TERCAPAI' : ''}`, 'success');
            catatLog('TIMBANG', `PI ${r.no_pi} ${size} ${gsm}gsm ${leaves}lv ${jenis} = ${bundlesBulat} bundle ${cepat ? '(timbang cepat)' : '(permintaan #' + pmId + ')'}`);
            $('berat').value = ''; $('berat').focus();
            currentPage = 1; currentSearch = ""; $('searchInput').value = "";
            await loadPermintaanOptions();
        }
    }
    let busyHitung = false;
    $('kalibBtn').onclick = async () => {
        if (!requireRole('admin')) return;
        const cepat = $('permintaanTerkait').value === 'CEPAT';
        const pmId = cepat ? null : Number($('permintaanTerkait').value);
        const r = cepat ? { jenis_kertas: $('qJenis').value, size_kertas: $('qSize').value, gsm: $('qGsm').value, leaves: $('qLeaves').value } : permintaanTimbang.find(d => d.id === pmId);
        if (!r) { alert('Pilih dulu permintaan (atau Timbang cepat) yang kertasnya mau dikalibrasi.'); return; }
        const tim = parseFloat($('berat').value);
        if (isNaN(tim) || tim <= 0) { alert('Isi dulu "Berat TIMBANG 1 BOX (kg)" dengan hasil timbang box yang sudah dihitung manual.'); return; }
        const bersih = tim - beratBoxMap[$('box').value] - (parseInt($('layer').value) || 0) * BERAT_LAYER_KG;
        if (bersih <= 0) { alert('Berat bersih negatif. Periksa berat timbang, jenis box, dan layer.'); return; }
        const s = prompt(`KALIBRASI untuk ${r.jenis_kertas} · ${r.size_kertas} · ${r.gsm}gsm · ${r.leaves}lv\n\nBerat timbang ${tim} kg → berat bersih ${bersih.toFixed(3)} kg.\nBerapa JUMLAH BUNDLE hasil hitung manual di box ini?`);
        if (s === null) return;
        const n = parseInt(s); if (!(n > 0)) { alert('Jumlah tidak valid'); return; }
        const g = Math.round(bersih / n * 1e6) / 1e3;
        const lama = beratBundleKG(r.size_kertas, r.gsm, r.leaves, r.jenis_kertas);
        const pakai = lama ? Math.round(bersih / lama / 1e0) : null;
        if (!confirm(`Berat 1 bundle hasil kalibrasi: ${g} gram\n(sekarang di aplikasi: ${lama ? (lama * 1000).toFixed(2) + ' gram → box ini terhitung ' + Math.ceil(bersih / lama) + ' bundle' : 'belum ada'}).\n\nSimpan ${g} gram sebagai berat standar untuk kertas ini? Box yang sudah tersimpan tidak berubah; hanya penimbangan berikutnya.`)) return;
        const rec = { size_kertas: r.size_kertas, gsm: Number(r.gsm), leaves: Number(r.leaves), jenis_kertas: r.jenis_kertas, gram_per_bundle: g, dibuat_oleh: user.nama };
        const ada = customBerat.find(x => x.size_kertas === rec.size_kertas && x.gsm == rec.gsm && x.leaves == rec.leaves && x.jenis_kertas === rec.jenis_kertas);
        const { error } = ada ? await supabase.from('berat_bundle_custom').update({ gram_per_bundle: g, dibuat_oleh: user.nama }).eq('id', ada.id) : await supabase.from('berat_bundle_custom').insert([rec]);
        if (error) { alert('❌ Gagal menyimpan: ' + error.message); return; }
        catatLog('KALIBRASI_BERAT', `${rec.size_kertas} ${rec.gsm}gsm ${rec.leaves}lv ${rec.jenis_kertas}: ${lama ? (lama * 1000).toFixed(2) : '-'} -> ${g} gram (hitung manual ${n})`);
        await loadMasterData();
        alert(`✅ Tersimpan: ${g} gram per bundle. Timbang ulang box yang sama untuk mengecek: harusnya ${n} bundle.`);
    };
    $('hitungBtn').onclick = async () => {
        if (busyHitung) return;
        busyHitung = true; $('hitungBtn').disabled = true;
        try { await hitungSimpan(); } finally { busyHitung = false; $('hitungBtn').disabled = false; }
    };

    // ========== RIWAYAT ==========
    async function loadAllData() {
        if (!user || user.role !== 'admin') return;
        const { data, error } = await fetchAll(() => {
            let q = supabase.from('riwayat_timbang').select('*').order('id', { ascending: false });
            if (currentSearch) q = q.or(`no_po.ilike.%${currentSearch}%,brand.ilike.%${currentSearch}%`);
            return q;
        });
        if (error) { console.error(error); return; }
        allDataCache = data || [];
        const existingIds = new Set(allDataCache.map(d => d.id));
        const cc = getCheckedIds();
        for (const id of cc) if (!existingIds.has(id)) cc.delete(id);
        saveCheckedIds(cc);
        displayDataWithPagination();
    }
    function displayDataWithPagination() {
        let filtered = [...allDataCache];
        if (currentOrderBy === "no_po") {
            filtered.sort((a, b) => currentOrderAsc ? (a.no_po || "").localeCompare(b.no_po || "") : (b.no_po || "").localeCompare(a.no_po || ""));
        } else {
            filtered.sort((a, b) => currentOrderAsc ? a.id - b.id : b.id - a.id);
        }
        const totalPages = Math.ceil(filtered.length / rowsPerPage);
        if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
        const start = (currentPage - 1) * rowsPerPage;
        const pageData = filtered.slice(start, start + rowsPerPage);
        const tbody = $('riwayatBody');
        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="11" style="text-align:center">📭 Tidak ada data. Silakan timbang dan simpan.</td></tr>';
            $('pagination').innerHTML = '';
            return;
        }
        tbody.innerHTML = pageData.map((d, i) => `<tr>
            <td style="text-align:center"><input type="checkbox" class="rowCheckbox" data-id="${d.id}" ${isChecked(d.id) ? 'checked' : ''}></td>
            <td style="text-align:center">${start + i + 1}</td>
            <td>${esc(d.tanggal)}</td>
            <td>${esc(d.no_po || '-')}</td>
            <td>${esc(d.brand || '-')}</td>
            <td>${esc(d.jenis_kertas || '-')}${d.watermark ? '<br><small>' + esc(d.watermark) + '</small>' : ''}</td>
            <td>${esc((d.size_kertas || '').substring(0, 18))}</td>
            <td>${esc(d.gsm)}</td>
            <td>${esc(d.leaves_per_bundle || '-')}</td>
            <td style="text-align:center; font-weight:bold">${esc(d.jumlah_bundles)}</td>
            <td class="aksi-cell">
                <button class="btn-edit-small" data-act="edit" data-id="${d.id}">✏️ Edit</button>
                <button class="btn-hapus-small" data-act="hapus" data-id="${d.id}">🗑️ Hapus</button>
            </td></tr>`).join('');
        document.querySelectorAll('.rowCheckbox').forEach(cb => cb.addEventListener('change', function () {
            const id = parseInt(this.dataset.id);
            this.checked ? addCheckedId(id) : removeCheckedId(id);
        }));
        const all = document.querySelectorAll('.rowCheckbox');
        $('selectAllCheckbox').checked = all.length > 0 && Array.from(all).every(cb => cb.checked);
        let pagHtml = '';
        for (let i = 1; i <= totalPages; i++) pagHtml += `<button onclick="goToPage(${i})" class="${i === currentPage ? 'active-page-btn' : ''}">${i}</button>`;
        $('pagination').innerHTML = pagHtml;
    }
    $('riwayatBody').addEventListener('click', e => {
        const b = e.target.closest('button[data-act]'); if (!b) return;
        const id = parseInt(b.dataset.id);
        if (b.dataset.act === 'edit') editData(id); else hapusSatuData(id);
    });
    window.goToPage = p => { currentPage = p; displayDataWithPagination(); };
    $('urutPOBtn').onclick = () => { currentOrderBy = "no_po"; currentOrderAsc = true; currentPage = 1; displayDataWithPagination(); };
    $('urutPOTerbalikBtn').onclick = () => { currentOrderBy = "no_po"; currentOrderAsc = false; currentPage = 1; displayDataWithPagination(); };

    const EDIT_SPEC = ['editNoPo', 'editJenis', 'editWm', 'editSize', 'editGsm', 'editLeaves'];
    $('editNoPo').addEventListener('change', () => { const p = findPI($('editNoPo').value); if (p && p.brand !== '-') $('editBrand').value = p.brand; });
    function hitungEdit() {
        const berat = parseFloat($('editBerat').value), layer = parseInt($('editLayer').value) || 0;
        const size = $('editSize').value, gsm = $('editGsm').value, lv = $('editLeaves').value, jenis = $('editJenis').value;
        const kosong = msg => ({ ok: false, msg });
        if (!(berat > 0)) return kosong('Isi berat timbang');
        const bersih = berat - beratBoxMap[$('editBox').value] - layer * BERAT_LAYER_KG;
        if (bersih <= 0) return kosong('Berat bersih negatif, periksa berat/jenis box/layer');
        if (!size || !gsm || !lv) return kosong('Lengkapi size, GSM, dan leaves');
        const bb = beratBundleKG(size, gsm, lv, jenis);
        if (!bb) return kosong('Berat bundle untuk spesifikasi ini belum terdaftar (isi saat membuat Permintaan Kertas)');
        const des = bersih / bb;
        return { ok: true, bersih, des, bundles: Math.ceil(Math.round(des * 1e6) / 1e6) };
    }
    function previewEdit() {
        const r = hitungEdit(), el = $('editHasil');
        el.className = 'hint ' + (r.ok ? 'ok' : 'bad');
        el.innerHTML = r.ok ? `⚖️ Berat bersih: <b>${r.bersih.toFixed(4)} kg</b><br>📦 Jumlah bundles (otomatis, dibulatkan ke atas): <b style="font-size:1.2rem">${r.bundles}</b>` : '⚠️ ' + r.msg;
    }
    ['editBerat', 'editLayer', 'editBox', 'editJenis', 'editSize', 'editGsm', 'editLeaves'].forEach(id => { $(id).addEventListener('input', previewEdit); $(id).addEventListener('change', previewEdit); });
    function editData(id) {
        if (!requireRole('admin')) return;
        const d = allDataCache.find(x => x.id === id); if (!d) return;
        currentEditId = id;
        $('editTanggal').value = formatDateForInput(d.tanggal);
        const sn = $('editNoPo'); if (d.no_po && ![...sn.options].some(o => o.value === d.no_po)) sn.insertAdjacentHTML('beforeend', `<option value="${esc(d.no_po)}">${esc(d.no_po)}</option>`);
        sn.value = d.no_po || '';
        $('editBrand').value = d.brand || '';
        $('editJenis').value = d.jenis_kertas || '';
        $('editWm').value = d.watermark || 'No WM';
        $('editSize').value = d.size_kertas;
        $('editGsm').value = d.gsm;
        $('editLeaves').value = d.leaves_per_bundle ?? '';
        $('editBox').value = d.jenis_box;
        $('editLayer').value = d.jumlah_layer || 0;
        $('editBerat').value = d.berat_timbang_kg ?? '';
        const kunci = !!d.permintaan_id;
        EDIT_SPEC.forEach(x => $(x).disabled = kunci);
        $('editInfo').textContent = kunci
            ? `🔒 Data ini bagian dari permintaan #${d.permintaan_id}, jadi No. PI & spesifikasi kertas mengikuti permintaan dan tidak bisa diubah di sini. Yang bisa dikoreksi: tanggal, brand, jenis box, layer, dan berat timbang. Jumlah bundles dihitung ulang otomatis.`
            : 'Ubah data yang salah. Berat bersih dan jumlah bundles dihitung ulang otomatis sesuai sistem timbang.';
        previewEdit();
        $('editModal').style.display = 'flex';
    }
    async function hapusSatuData(id) {
        if (!requireRole('admin')) return;
        const d = allDataCache.find(x => x.id === id);
        if (!confirm("Hapus data ini?")) return;
        const { error } = await supabase.from('riwayat_timbang').delete().eq('id', id);
        if (error) alert("Gagal hapus: " + error.message);
        else {
            removeCheckedId(id);
            catatLog('HAPUS_TIMBANG', d ? `#${id} PI ${d.no_po} ${d.size_kertas} ${d.gsm}gsm = ${d.jumlah_bundles} bundle` : `#${id}`);
            loadAllData();
        }
    }
    $('saveEditBtn').onclick = async () => {
        if (!requireRole('admin')) return;
        const lama = allDataCache.find(x => x.id === currentEditId) || {};
        const pRow = findPI($('editNoPo').value);
        if (!pRow && $('editNoPo').value !== lama.no_po) { alert('No. PI tidak terdaftar di master PI'); return; }
        const br = $('editBrand').value.trim().toUpperCase();
        if (!br) { alert('Brand wajib diisi'); return; }
        const r = hitungEdit();
        if (!r.ok) { alert('❌ ' + r.msg); return; }
        const upd = {
            tanggal: formatDateToDB($('editTanggal').value),
            no_po: pRow ? pRow.no_pi : lama.no_po, brand: br,
            jenis_kertas: $('editJenis').value, watermark: $('editWm').value,
            size_kertas: $('editSize').value, gsm: parseInt($('editGsm').value), leaves_per_bundle: parseInt($('editLeaves').value),
            jenis_box: $('editBox').value, jumlah_layer: parseInt($('editLayer').value) || 0,
            berat_timbang_kg: parseFloat($('editBerat').value), berat_bersih_kg: r.bersih,
            jumlah_bundles: r.bundles, bundles_desimal: r.des
        };
        if (!confirm(`Simpan perubahan?\nBundles: ${lama.jumlah_bundles} → ${r.bundles}\nBerat timbang: ${lama.berat_timbang_kg ?? '-'} → ${upd.berat_timbang_kg} kg`)) return;
        const { error } = await supabase.from('riwayat_timbang').update(upd).eq('id', currentEditId);
        if (error) alert("Gagal update: " + error.message);
        else {
            catatLog('EDIT_TIMBANG', `#${currentEditId}: PI ${lama.no_po}→${upd.no_po}, brand ${lama.brand}→${upd.brand}, berat ${lama.berat_timbang_kg}→${upd.berat_timbang_kg}, bundles ${lama.jumlah_bundles}→${upd.jumlah_bundles}, size ${lama.size_kertas}→${upd.size_kertas}, gsm ${lama.gsm}→${upd.gsm}, lv ${lama.leaves_per_bundle}→${upd.leaves_per_bundle}`);
            alert("✅ Data berhasil diupdate! Bundles baru: " + r.bundles); $('editModal').style.display = 'none'; loadAllData();
        }
    };
    $('cariBtn').onclick = () => { currentSearch = $('searchInput').value.trim(); currentPage = 1; loadAllData(); };
    $('resetCariBtn').onclick = () => { currentSearch = ''; $('searchInput').value = ''; currentPage = 1; loadAllData(); };
    $('hapusSemuaBtn').onclick = async () => {
        if (!requireRole('admin')) return;
        if (!confirm("⚠️ Hapus SEMUA data timbang dari cloud?")) return;
        const t = prompt('Ketik HAPUS (huruf besar) untuk memastikan:');
        if (t !== 'HAPUS') { alert('Dibatalkan'); return; }
        const { error } = await supabase.from('riwayat_timbang').delete().neq('id', 0);
        if (error) alert("Gagal hapus: " + error.message);
        else { clearAllChecked(); catatLog('HAPUS_SEMUA_TIMBANG', 'Semua data timbang dihapus'); alert("✅ Semua data telah dihapus!"); loadAllData(); }
    };
    $('selectAllCheckbox').onclick = e => {
        document.querySelectorAll('.rowCheckbox').forEach(cb => {
            cb.checked = e.target.checked;
            const id = parseInt(cb.dataset.id);
            e.target.checked ? addCheckedId(id) : removeCheckedId(id);
        });
    };

    $('exportExcelBtn').onclick = async () => {
        const { data, error } = await fetchAll(() => {
            let q = supabase.from('riwayat_timbang').select('*').order('id', { ascending: false });
            if (currentSearch) q = q.or(`no_po.ilike.%${currentSearch}%,brand.ilike.%${currentSearch}%`);
            return q;
        });
        if (error) { alert("Gagal export!"); return; }
        if (!data || data.length === 0) { alert("Tidak ada data untuk di export!"); return; }
        const rows = [["No", "Tanggal", "No. PI", "Brand", "Jenis Kertas", "Size", "GSM", "Leaves", "Jenis Box", "Jumlah Bundles", "Berat Timbang (kg)", "Berat Bersih (kg)", "ID Permintaan", "Dibuat Oleh"]];
        data.forEach((d, i) => rows.push([i + 1, d.tanggal || '', d.no_po || '-', d.brand || '-', d.jenis_kertas || '', d.size_kertas || '', d.gsm || '', d.leaves_per_bundle || '', d.jenis_box || '', d.jumlah_bundles || 0, d.berat_timbang_kg || 0, d.berat_bersih_kg || 0, d.permintaan_id || '', d.dibuat_oleh || '']));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{wch:5},{wch:12},{wch:15},{wch:15},{wch:14},{wch:22},{wch:6},{wch:8},{wch:14},{wch:12},{wch:16},{wch:16},{wch:12},{wch:16}];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Laporan Timbangan");
        XLSX.writeFile(wb, `laporan_timbangan_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
        alert("Export Excel berhasil!");
    };

    // ========== CETAK (Serah Terima, Timbangan, Barcode) ==========
    const cetakModal = $('cetakModal');
    const today = new Date().toISOString().split('T')[0];
    const now0 = new Date();
    const currentTime = `${String(now0.getHours()).padStart(2, '0')}:${String(now0.getMinutes()).padStart(2, '0')}`;
    $('tglSerahTerima').value = today;
    $('jamSerahTerima').value = currentTime;
    $('cetakBtn').onclick = () => { cetakModal.style.display = 'flex'; };
    $('cetakMetode').onchange = () => {
        const m = $('cetakMetode').value;
        $('cetakPoInput').style.display = m === 'pi' ? 'block' : 'none';
        $('cetakBrandInput').style.display = m === 'brand' ? 'block' : 'none';
        $('cetakTanggalInput').style.display = m === 'tanggal' ? 'block' : 'none';
    };
    $('cetakMetode').onchange();

    function generateNomorDokumen() {
        const d = new Date();
        return `ST/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    }
    async function ambilData(metode, f) {
        let title = "", q = supabase.from('riwayat_timbang').select('*').order('id', { ascending: true });
        if (metode === 'pi') { if (!f.po) { alert("Masukkan No. PI!"); return null; } title = `NO. PI: ${f.po}`; q = q.eq('no_po', f.po); }
        else if (metode === 'brand') { if (!f.brand) { alert("Masukkan Brand!"); return null; } title = `BRAND: ${f.brand}`; q = q.eq('brand', f.brand); }
        else if (metode === 'tanggal') {
            if (!f.awal || !f.akhir) { alert("Pilih rentang tanggal!"); return null; }
            title = `TANGGAL: ${f.awal.split('-').reverse().join('/')} s/d ${f.akhir.split('-').reverse().join('/')}`;
            q = q.gte('tanggal', formatDateToDB(f.awal)).lte('tanggal', formatDateToDB(f.akhir));
        } else if (metode === 'checklist') {
            const ids = [...getCheckedIds()];
            if (ids.length === 0) { alert("Pilih data yang ingin dicetak terlebih dahulu!"); return null; }
            title = `DATA TERPILIH (${ids.length} box)`; q = q.in('id', ids);
        } else title = `SEMUA DATA TIMBANGAN`;
        const { data, error } = await fetchAll(() => q);
        if (error) { alert("Gagal ambil data!"); return null; }
        if (!data || data.length === 0) { alert("Tidak ada data untuk dicetak!"); return null; }
        return { data, title };
    }
    function groupTablesHtml(data) {
        const grouped = {}; let gb = 0, gk = 0;
        for (const it of data) {
            const po = it.no_po || "-";
            (grouped[po] = grouped[po] || []).push(it);
            gb += (it.jumlah_bundles || 0); gk += (it.berat_timbang_kg || 0);
        }
        let html = '';
        for (const [po, items] of Object.entries(grouped)) {
            const f = items[0]; let tb = 0, tk = 0, rows = '';
            items.forEach((it, i) => {
                tb += (it.jumlah_bundles || 0); tk += (it.berat_timbang_kg || 0);
                rows += `<tr><td>${i + 1}</td><td>${esc(formatTanggalIndonesia(it.tanggal))}</td><td>${esc(it.no_po || '-')}</td><td>${esc(it.brand || '-')}</td><td>${esc(it.jenis_kertas || '-')}</td><td>${esc(it.size_kertas || '-')}</td><td>${esc(it.gsm || '-')}</td><td>${esc(it.leaves_per_bundle || '-')}</td><td style="font-weight:bold">${(it.jumlah_bundles || 0).toLocaleString('id-ID')}</td><td>${(it.berat_timbang_kg || 0).toFixed(2)} kg</td></tr>`;
            });
            html += `<h3 style="margin:18px 0 5px;background:#e2e8f0;padding:5px;">📄 PI: ${esc(po)} | 🏷️ Brand: ${esc(f.brand || '-')} | 🧻 ${esc(f.jenis_kertas || '-')} | 📏 ${esc(f.size_kertas || '-')} | GSM: ${esc(f.gsm || '-')} | Leaves: ${esc(f.leaves_per_bundle || '-')}</h3>
            <table><thead><tr><th>No</th><th>Tanggal</th><th>PI</th><th>Brand</th><th>Jenis</th><th>Size</th><th>GSM</th><th>Leaves</th><th>Bundles</th><th>Berat</th></tr></thead><tbody>${rows}
            <tr class="total-row"><td colspan="8"><strong>TOTAL ${esc(po)}</strong></td><td><strong>${tb.toLocaleString('id-ID')}</strong></td><td><strong>${tk.toFixed(2)} kg</strong></td></tr>
            <tr class="total-row"><td colspan="8"><strong>RATA-RATA ${esc(po)}</strong></td><td><strong>${Math.round(tb / items.length).toLocaleString('id-ID')}/box</strong></td><td><strong>${(tk / items.length).toFixed(2)} kg/box</strong></td></tr></tbody></table>`;
        }
        html += `<table style="width:50%;float:right;margin-top:10px;"><tr class="total-row"><td><strong>📦 GRAND TOTAL BUNDLES</strong></td><td><strong>${gb.toLocaleString('id-ID')} bundles</strong></td></tr><tr class="total-row"><td><strong>⚖️ GRAND TOTAL BERAT</strong></td><td><strong>${gk.toFixed(2)} kg</strong></td></tr></table><div style="clear:both"></div>`;
        return html;
    }
    const PRINT_CSS = `* { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Times New Roman',Arial,sans-serif; padding:20px; background:white; }
        .print-area { max-width:1100px; margin:0 auto; }
        .header { text-align:center; margin-bottom:25px; border-bottom:3px solid #1e3a8a; padding-bottom:15px; }
        .header h1 { font-size:24px; color:#1e3a8a; letter-spacing:2px; }
        .header h2 { font-size:18px; color:#333; margin:5px 0; }
        .header p, .address { font-size:11px; color:#555; margin-top:5px; }
        .nomor-dokumen { text-align:center; background:#f1f5f9; padding:8px; margin:15px 0; font-weight:bold; border-radius:5px; }
        .serah-terima-box { border:2px solid #1e3a8a; padding:15px; margin:20px 0; border-radius:10px; background:#fafcff; }
        .row { display:flex; margin-bottom:10px; } .col-label { width:170px; font-weight:bold; } .col-value { flex:1; border-bottom:1px dotted #999; }
        .kondisi-box { margin:15px 0; }
        table { width:100%; border-collapse:collapse; margin:12px 0; font-size:11px; }
        th, td { border:1px solid #999; padding:7px; text-align:center; }
        th { background:#1e3a8a; color:white; }
        .total-row { background:#e2e8f0; font-weight:bold; }
        .info-cetak { display:flex; justify-content:space-between; margin:15px 0; font-size:12px; }
        .footer { margin-top:30px; text-align:center; font-size:10px; color:#666; }
        .ttd-row { display:flex; justify-content:space-between; margin-top:40px; } .ttd-box { text-align:center; width:45%; } .ttd-line { margin-top:50px; border-top:1px solid #000; }`;
    const ALAMAT = 'Jl. Kampung Legon RT.03 RW.04, Kel. Jatimulya, Kec. Tambun Selatan Kab. Bekasi, Jawa Barat 17510 | Telp. (021) 883 49672 | Email: admin@rollingpaper.com';
    function bukaCetak(html) { const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print(); }

    $('prosesCetakBtn').onclick = async () => {
        if (!requireRole('admin')) return;
        const hasil = await ambilData($('cetakMetode').value, { po: $('cetakPoValue').value.trim(), brand: $('cetakBrandValue').value.trim(), awal: $('cetakTglAwal').value, akhir: $('cetakTglAkhir').value });
        if (!hasil) return;
        const pengirim = esc($('pengirimNama').value || "_______________"), penerima = esc($('penerimaNama').value || "_______________");
        const tglSerah = ($('tglSerahTerima').value || today).split('-').reverse().join('/');
        const kondisi = $('kondisiBarang').value;
        const cb = k => kondisi === k ? `☑ ${k}` : `☐ ${k}`;
        bukaCetak(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Serah Terima - The Rolling Paper</title><style>${PRINT_CSS}</style></head><body><div class="print-area">
            <div class="header"><h1>THE ROLLING PAPER COMPANY</h1><h2>SURAT JALAN / SERAH TERIMA PRODUKSI</h2><p>${ALAMAT}</p></div>
            <div class="nomor-dokumen">No. Dokumen: ${generateNomorDokumen()}</div>
            <div class="serah-terima-box">
                <div class="row"><div class="col-label">PENGIRIM (Gudang) :</div><div class="col-value">${pengirim}</div></div>
                <div class="row"><div class="col-label">PENERIMA (Produksi) :</div><div class="col-value">${penerima}</div></div>
                <div class="row"><div class="col-label">Tanggal Serah Terima :</div><div class="col-value">${tglSerah}</div></div>
                <div class="row"><div class="col-label">Jam Serah Terima :</div><div class="col-value">${esc($('jamSerahTerima').value || currentTime)} WIB</div></div>
                <div class="row"><div class="col-label">Lokasi / Line :</div><div class="col-value">${esc($('lokasiProduksi').value || "_______________")}</div></div>
                <div class="kondisi-box"><strong>✅ KONDISI BARANG :</strong><br>${cb('Baik')} &nbsp;&nbsp; ${cb('Rusak Ringan')} &nbsp;&nbsp; ${cb('Rusak Berat')}</div>
                <div class="row"><div class="col-label">📝 CATATAN :</div><div class="col-value">${esc($('catatanTambahan').value || "-")}</div></div>
            </div>
            <h3 style="margin:15px 0 5px;">📋 RINCIAN KERTAS YANG DISERAHKAN</h3><h4 style="margin-bottom:10px;color:#555;">${esc(hasil.title)}</h4>
            ${groupTablesHtml(hasil.data)}
            <div class="footer"><div class="ttd-row"><div class="ttd-box"><div>Diterima oleh,</div><div class="ttd-line"></div><div><strong>${penerima}</strong></div><div>(Penerima / Produksi)</div></div>
            <div class="ttd-box"><div>Diserahkan oleh,</div><div class="ttd-line"></div><div><strong>${pengirim}</strong></div><div>(Pengirim / Gudang)</div></div></div>
            <div class="ttd-row" style="margin-top:20px;"><div class="ttd-box"><div>Mengetahui,</div><div class="ttd-line"></div><div><strong>Supervisor</strong></div></div>
            <div class="ttd-box"><div>&nbsp;</div><div class="ttd-line"></div><div><strong>Catatan:</strong> Lembar ini sebagai bukti serah terima</div></div></div>
            <p style="margin-top:20px;">Dicetak pada: ${new Date().toLocaleString('id-ID')}<br><strong>Dokumen ini sah tanpa stempel basah</strong></p></div>
            </div></body></html>`);
        catatLog('CETAK_SERAH_TERIMA', hasil.title);
        cetakModal.style.display = 'none';
    };
    $('closeCetakModalBtn').onclick = () => { cetakModal.style.display = 'none'; };
    $('closeModalBtn').onclick = () => { $('editModal').style.display = 'none'; };

    $('cetakTimbanganBtn').onclick = async () => {
        if (!requireRole('admin')) return;
        const ids = [...getCheckedIds()];
        if (ids.length === 0) { alert("⚠️ Tidak ada data yang di-checklist! Silakan centang data terlebih dahulu."); return; }
        const hasil = await ambilData('checklist', {});
        if (!hasil) return;
        const tgl = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        bukaCetak(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan Timbangan - The Rolling Paper</title><style>${PRINT_CSS}</style></head><body><div class="print-area">
            <div class="header"><h1>THE ROLLING PAPER COMPANY</h1><h2>LAPORAN TIMBANGAN KERTAS</h2><div class="address">${ALAMAT}</div></div>
            <div class="info-cetak"><span>📅 Dicetak: ${tgl}</span><span>📦 Total Data: ${hasil.data.length} box</span></div>
            ${groupTablesHtml(hasil.data)}
            <div class="footer"><p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p><p>Dokumen ini sah tanpa stempel basah</p></div></div></body></html>`);
        catatLog('CETAK_TIMBANGAN', `${hasil.data.length} box`);
    };

    // Barcode
    const cetakBarcodeModal = $('cetakBarcodeModal');
    $('cetakBarcodeMetode').onchange = function () {
        const m = this.value;
        $('cetakBarcodePoInput').style.display = m === 'pi' ? 'block' : 'none';
        $('cetakBarcodeBrandInput').style.display = m === 'brand' ? 'block' : 'none';
        $('cetakBarcodeTanggalInput').style.display = m === 'tanggal' ? 'block' : 'none';
    };
    $('cetakBarcodeMetode').onchange();
    $('cetakBarcodeBtn').onclick = () => { cetakBarcodeModal.style.display = 'flex'; };
    $('closeCetakBarcodeModalBtn').onclick = () => { cetakBarcodeModal.style.display = 'none'; };
    $('prosesCetakBarcodeBtn').onclick = async () => {
        if (!requireRole('admin')) return;
        try {
            const hasil = await ambilData($('cetakBarcodeMetode').value, { po: $('cetakBarcodePoValue').value.trim(), brand: $('cetakBarcodeBrandValue').value.trim(), awal: $('cetakBarcodeTglAwal').value, akhir: $('cetakBarcodeTglAkhir').value });
            if (!hasil) return;
            const ukuranMap = { small: { size: 120, fontSize: 10 }, medium: { size: 180, fontSize: 12 }, large: { size: 260, fontSize: 14 } };
            const sz = ukuranMap[$('barcodeUkuran').value];
            const tPI = $('barcodeTampilPI').checked, tBr = $('barcodeTampilBrand').checked, tSz = $('barcodeTampilSize').checked, tBu = $('barcodeTampilBundles').checked, tTg = $('barcodeTampilTanggal').checked;
            let bc = '';
            hasil.data.forEach((item, i) => {
                const text = `${item.no_po || 'N/A'}-${item.id || i + 1}`;
                let info = '';
                if (tPI) info += `${item.no_po || '-'} `;
                if (tBr) info += `${item.brand || '-'} `;
                if (tSz) info += `${item.size_kertas || ''} `;
                if (tBu) info += `${item.jumlah_bundles || 0} bundles`;
                if (tTg) info += ` ${item.tanggal || ''}`;
                const url = `https://api.qrserver.com/v1/create-qr-code/?size=${sz.size}x${sz.size}&data=${encodeURIComponent(text)}`;
                bc += `<div style="display:inline-block;border:1px solid #ccc;border-radius:8px;padding:12px;margin:8px;text-align:center;width:${sz.size + 40}px;page-break-inside:avoid;">
                    <div style="font-size:${sz.fontSize - 2}px;font-weight:bold;color:#1e3a8a;margin-bottom:6px;">THE ROLLING PAPER</div>
                    <img src="${url}" width="${sz.size}" height="${sz.size}" style="display:block;margin:0 auto;" alt="QR Code">
                    <div style="font-size:${sz.fontSize - 2}px;letter-spacing:1px;font-family:monospace;margin-top:6px;">${esc(text)}</div>
                    <div style="font-size:${sz.fontSize - 4}px;color:#333;margin-top:4px;border-top:1px solid #eee;padding-top:4px;">${esc(info)}</div></div>`;
            });
            bukaCetak(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cetak Barcode - The Rolling Paper</title><style>
                * { margin:0; padding:0; box-sizing:border-box; } body { font-family:Arial,sans-serif; padding:20px; background:white; }
                .header { text-align:center; margin-bottom:20px; border-bottom:2px solid #1e3a8a; padding-bottom:10px; } .header h1 { color:#1e3a8a; font-size:20px; } .header p { color:#666; font-size:12px; }
                .barcode-grid { display:flex; flex-wrap:wrap; justify-content:center; gap:4px; } .footer { text-align:center; margin-top:20px; font-size:10px; color:#666; }</style></head><body>
                <div class="header"><h1>THE ROLLING PAPER COMPANY</h1><p>📱 Cetak QR Code - ${esc(hasil.title)}</p><p style="font-size:11px;">Total: ${hasil.data.length} QR Code | Dicetak: ${new Date().toLocaleString('id-ID')}</p></div>
                <div class="barcode-grid">${bc}</div><div class="footer"><p>Dokumen ini sah tanpa stempel basah</p></div></body></html>`);
            cetakBarcodeModal.style.display = 'none';
            catatLog('CETAK_BARCODE', `${hasil.data.length} QR - ${hasil.title}`);
        } catch (err) { alert("Terjadi error: " + err.message); }
    };

    // ========== PERMINTAAN (Admin buat, Leader proses) ==========

    // ===== PI dari menu Input PI (Gudang Pro) — Timbangan disinkronkan otomatis =====
    let gpPi = [], gpItems = [], gpAt = 0, gpErr = '';
    const U = x => String(x == null ? '' : x).trim().toUpperCase();
    // Nama kertas Timbangan dikenali otomatis dari isian Paper/Jenis di Input PI (mis. "PAPER VELIN 13GSM" -> Velin)
    function kertasNama(paper, jenis) {
        const names = (jenisList || []).map(j => j.nama).filter(Boolean);
        for (const t of [paper, jenis]) { const x = U(t); if (!x) continue; const ex = names.find(n => U(n) === x); if (ex) return ex; }
        const txt = U(paper) + ' ' + U(jenis);
        const hit = names.filter(n => txt.includes(U(n))).sort((a, b) => b.length - a.length)[0];
        return hit || (paper || jenis);
    }
    // Item dianggap kertas hanya jika Paper/Jenis-nya memuat salah satu Jenis Kertas di Master (mis. Velin, Bleached). Booklet/display/dll tidak ikut.
    function kertasKenal(d) {
        const txt = U(d.paper) + ' ' + U(d.jenis);
        return (jenisList || []).some(j => j.nama && txt.includes(U(j.nama)));
    }
    // Size dari Input PI dicocokkan ke nama size resmi Timbangan (abaikan spasi/huruf besar-kecil; "54X97" -> "KS 54X97" jika unik)
    function sizeNama(s) {
        const c = x => String(x || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const all = allSizes(), cs = c(s); if (!cs) return String(s || '').trim();
        const ex = all.find(z => c(z) === cs); if (ex) return ex;
        const awal = all.filter(z => c(z).startsWith(cs)); if (awal.length === 1) return awal[0];
        const part = all.filter(z => c(z).includes(cs)); if (part.length === 1) return part[0];
        return String(s || '').trim();
    }
    window.GP.sizeNama = sizeNama;
    function gsmDari(d) { if (Number(d.gsm) > 0) return Number(d.gsm); const m = (U(d.jenis) + ' ' + U(d.paper)).match(/(\d{1,3})\s*GSM/); return m ? Number(m[1]) : 0; }
    window.GP.kertasNama = kertasNama; window.GP.gsmDari = gsmDari;
    const gKertas = d => kertasNama(d.paper, d.jenis);
    const gpBrand = p => [...new Set(gpItems.filter(d => d.pi_id === p.id).map(d => d.brand))].join(' / ');
    async function loadGpPi(force) {
        if (!user || !user.gp) return;
        if (!force && Date.now() - gpAt < 20000) return;
        const h = await fetchAll(() => window.sbG.from('pi_header').select('id,no_pi,tanggal').eq('is_archived', false).order('id', { ascending: false }));
        const d = await fetchAll(() => window.sbG.from('pi_detail').select('id,pi_id,brand,jenis,paper,size,qty_pi,gsm,leaves,watermark,qty_bundle').order('id'));
        if (h.error || d.error) { gpErr = (h.error || d.error).message; gpPi = []; gpItems = []; return; }
        gpErr = ''; gpAt = Date.now();
        gpItems = (d.data || []).map(x => ({ ...x, size: sizeNama(x.size), gsm: gsmDari(x), qty_bundle: x.qty_bundle || x.qty_pi })).filter(x => x.gsm > 0 && x.leaves > 0 && x.qty_bundle > 0 && x.size && kertasKenal(x));
        gpItems.forEach(x => { x.qty_bundle = Number(x.qty_bundle); });
        const ok = new Set(gpItems.map(x => x.pi_id));
        gpPi = (h.data || []).filter(p => ok.has(p.id));
    }
    function mirrorItem(d) {
        const h = gpPi.find(p => p.id === d.pi_id); const p = h && piList.find(x => canon(x.no_pi) === canon(h.no_pi)); if (!p) return null;
        return piItems.find(i => i.pi_id === p.id && U(i.jenis_kertas) === U(gKertas(d)) && U(i.watermark) === U(d.watermark || 'No WM') && U(i.size_kertas) === U(d.size) && Number(i.gsm) === Number(d.gsm) && Number(i.leaves) === Number(d.leaves));
    }
    function gpBuka(d) { if (tambahOn()) return true; const m = mirrorItem(d); return !m || itemBuka(m); }
    function gpLabel(d) { const m = mirrorItem(d), dm = m ? (piStatus[m.id] || 0) : 0; return `${d.brand} · ${d.jenis}${d.paper && U(d.paper) !== U(d.jenis) ? ' (' + d.paper + ')' : ''} · ${d.size} · ${d.gsm}gsm ${d.leaves}lv · ${d.watermark || 'No WM'} · sisa ${d.qty_bundle - dm} dari ${d.qty_bundle}`; }
    function fillPmPiG() {
        const el = $('pmPi'); if (!el) return;
        const prev = el.value; el.dataset.ss = '1';
        if ($('pmTambahWrap')) $('pmTambahWrap').style.display = 'block';
        $('pmItem').style.display = 'none'; if ($('pmItem').previousElementSibling) $('pmItem').previousElementSibling.style.display = 'none';
        if (el.previousElementSibling) el.previousElementSibling.textContent = '📄 Pilih PI & item kertas (ketik untuk mencari)';
        const ds = gpItems.filter(d => gpBuka(d)).sort((a, b) => (a.pi_id - b.pi_id) || (a.id - b.id));
        el.innerHTML = '<option value="">— pilih PI & item kertas —</option>' + ds.map(d => { const p = gpPi.find(x => x.id === d.pi_id); return `<option value="${d.id}">${esc(p ? p.no_pi : '')} · ${esc(gpLabel(d))}</option>`; }).join('');
        if (ds.some(d => String(d.id) === prev)) el.value = prev;
        $('pmPiHint').className = 'hint';
        $('pmPiHint').textContent = gpErr ? '❌ Gagal mengambil PI dari Input PI: ' + gpErr + ' (sudah menjalankan SQL kolom kertas di Gudang Pro?)' : (ds.length ? '' : '📭 Belum ada item kertas. Item tampil jika Jenis/Paper-nya memuat nama jenis kertas (mis. Velin, Bleached) dan Size, Leaves, serta GSM (boleh dari tulisan "13GSM") sudah terisi di Input PI. Item lain (booklet, display, dll) memang tidak ditampilkan.');
    }
    function onPmPiInputG(keepQty) {
        const d = gpItems.find(x => String(x.id) === $('pmPi').value), sel = $('pmItem');
        if (!d) { sel.innerHTML = '<option value="">—</option>'; $('pmItemInfo').textContent = ''; $('pmDupWarn').style.display = 'none'; $('pmPiHint').textContent = ''; return; }
        const p = gpPi.find(x => x.id === d.pi_id) || {};
        sel.innerHTML = `<option value="${d.id}" selected>${esc(gpLabel(d))}</option>`; sel.value = d.id;
        $('pmPiHint').className = 'hint ok';
        $('pmPiHint').textContent = `🏷️ Brand: ${d.brand} · Kertas: ${gKertas(d)} · ${d.watermark || 'No WM'}` + (p.tanggal ? ' · tgl PI ' + String(p.tanggal).split('-').reverse().join('/') : '');
        onPmItemChangeG(keepQty === true);
    }
    function onPmItemChangeG(keepQty) {
        const d = gpItems.find(x => String(x.id) === $('pmItem').value), el = $('pmItemInfo'), w = $('pmDupWarn');
        if (!d) { el.className = 'hint'; el.textContent = ''; w.style.display = 'none'; return; }
        const m = mirrorItem(d), dm = m ? (piStatus[m.id] || 0) : 0, sisa = (m ? Math.max(Number(m.qty_pi), d.qty_bundle) : d.qty_bundle) - dm;
        el.className = 'hint ' + (sisa <= 0 ? 'bad' : 'ok');
        if (tambahOn()) {
            el.className = 'hint';
            el.textContent = `Qty PI ${d.qty_bundle} | sudah diminta ${dm} | ➕ Tambahan: isi jumlah bundle yang kurang/NG`;
            if (keepQty !== true) $('pmQty').value = '';
            muatReturTambah(d);
        } else {
            el.textContent = `Qty PI ${d.qty_bundle} | sudah diminta ${dm} | sisa ${sisa} bundle`;
            if (keepQty !== true) $('pmQty').value = sisa > 0 ? sisa : '';
        }
        const akt = m ? pmData.filter(r => r.pi_item_id === m.id && AKTIF.includes(r.status)) : [];
        if (akt.length) {
            w.style.display = 'block';
            w.innerHTML = `⚠️ <b>Item ini SUDAH diminta dan masih berjalan:</b><br>` + akt.map(r => `• #${r.id} — ${r.qty_minta} bundle — ${esc(r.status)} (${fmtWaktu(r.created_at)})`).join('<br>') + `<br>Pastikan ini bukan input ganda.`;
        } else w.style.display = 'none';
    }
    // Berat bundle belum ada -> isi langsung saat membuat permintaan (tidak perlu buka Master)
    async function isiBeratInline(i, timbang) {
        const s = prompt(`Berat per bundle belum terdaftar untuk:\n${i.jenis_kertas} · ${i.size_kertas} · ${i.gsm}gsm · ${i.leaves}lv\n\nIsi berat 1 bundle kertas ini dalam GRAM (contoh 2.56). Cukup diisi sekali, nanti diingat.${timbang ? '\\nCancel = batal hitung.' : '\\nKosongkan lalu OK = kirim tanpa berat (belum bisa ditimbang).\\nCancel = batal kirim.'}`);
        if (s === null) return null;
        const g = parseFloat(String(s).replace(',', '.'));
        if (!s.trim()) return true;
        if (!(g > 0)) { alert('Berat tidak valid'); return null; }
        const { error } = await supabase.from('berat_bundle_custom').insert([{ size_kertas: i.size_kertas, gsm: i.gsm, leaves: i.leaves, jenis_kertas: i.jenis_kertas, gram_per_bundle: g, dibuat_oleh: user.nama }]);
        if (error) { alert('❌ Gagal menyimpan berat: ' + error.message); return null; }
        catatLog('TAMBAH_BERAT', `${i.size_kertas} ${i.gsm}gsm ${i.leaves}lv ${i.jenis_kertas} = ${g} gram`);
        await loadMasterData();
        return true;
    }
    async function ensureMirror(g) {
        const h = gpPi.find(x => x.id === g.pi_id);
        let m = mirrorItem(g);
        if (!m) {
            const pm = piList.find(x => canon(x.no_pi) === canon(h.no_pi));
            const lama = pm && piItems.find(i => i.pi_id === pm.id && U(i.jenis_kertas) === U(gKertas(g)) && U(i.watermark) === U(g.watermark || 'No WM') && Number(i.gsm) === Number(g.gsm) && Number(i.leaves) === Number(g.leaves) && sizeNama(i.size_kertas) === g.size && i.size_kertas !== g.size && !(piAktif[i.id] > 0));
            if (lama) {
                const { error } = await supabase.rpc('edit_pi_item', { p_id: lama.id, p_jenis: lama.jenis_kertas, p_wm: lama.watermark, p_size: g.size, p_gsm: lama.gsm, p_leaves: lama.leaves, p_qty: Math.max(g.qty_bundle, piStatus[lama.id] || 0), p_oleh: user.nama });
                if (!error) { await loadMasterData(); m = mirrorItem(g); }
            }
        }
        if (!m) {
            const { error } = await supabase.rpc('simpan_pi_item', { p_no: normPI(String(h.no_pi).trim().split(/[\s(]/)[0]), p_brand: U(g.brand), p_tgl: h.tanggal, p_jenis: gKertas(g), p_wm: g.watermark || 'No WM', p_size: g.size, p_gsm: g.gsm, p_leaves: g.leaves, p_qty: g.qty_bundle, p_oleh: user.nama });
            if (error && error.code !== '23505') { alert('❌ Gagal menyinkronkan PI ke Timbangan: ' + error.message); return null; }
            await loadMasterData(); m = mirrorItem(g);
            if (!m) { alert('❌ Item PI belum tersinkron ke Timbangan. Coba lagi.'); return null; }
        } else if (Number(m.qty_pi) < Number(g.qty_bundle) || (Number(m.qty_pi) > Number(g.qty_bundle) && (piStatus[m.id] || 0) <= Number(g.qty_bundle))) {
            const ok = await rpc('edit_pi_item', { p_id: m.id, p_jenis: m.jenis_kertas, p_wm: m.watermark, p_size: m.size_kertas, p_gsm: m.gsm, p_leaves: m.leaves, p_qty: g.qty_bundle, p_oleh: user.nama });
            if (!ok) return null;
            await loadMasterData(); m = mirrorItem(g);
        }
        return m;
    }
    const tambahOn = () => !!(user && user.gp && $('pmTambah') && $('pmTambah').checked);
    async function muatReturTambah(d) {
        const el = $('pmTambahRet'); if (!el) return;
        const h = gpPi.find(x => x.id === d.pi_id); const prev = el.value;
        if (!h || !window.sbG) return;
        const { data } = await window.sbG.from('return_produksi').select('id,tipe,qty,status').eq('no_pi', h.no_pi).neq('status', 'DITOLAK').order('id', { ascending: false }).limit(30);
        el.innerHTML = '<option value="">— tidak terkait —</option>' + (data || []).map(r => `<option value="${r.id}">Return #${r.id} · ${esc(r.tipe)} ${r.qty} · ${esc(r.status)}</option>`).join('');
        if ([...el.options].some(o => o.value === prev)) el.value = prev;
    }
    function catatanKirim() {
        const n = $('pmCatatan').value.trim();
        if (!tambahOn()) return n || null;
        const rt = $('pmTambahRet').value;
        return `[TAMBAHAN: ${$('pmTambahAlasan').value}${rt ? ' · Return #' + rt : ''}]` + (n ? ' ' + n : '');
    }
    if ($('pmTambah')) $('pmTambah').addEventListener('change', () => { $('pmTambahBox').style.display = $('pmTambah').checked ? 'block' : 'none'; fillPmPiG(); onPmItemChangeG(); });
    function itemOpsiLabel(i) { const dm = piStatus[i.id] || 0; return `${i.jenis_kertas} · ${i.watermark} · ${i.size_kertas} · ${i.gsm}gsm · ${i.leaves}lv · sisa ${i.qty_pi - dm} dari ${i.qty_pi}`; }
    function fillPmPi() {
        if (user && user.gp) return fillPmPiG();
        const el = $('pmPi'); if (!el) return;
        const prev = el.value;
        const ps = piList.filter(p => piItems.some(i => i.pi_id === p.id && itemBuka(i)));
        el.innerHTML = '<option value="">— pilih PI —</option>' + ps.map(p => `<option value="${p.id}">${esc(p.no_pi)} · ${esc(p.brand)}</option>`).join('');
        if (ps.some(p => String(p.id) === prev)) el.value = prev;
        $('pmPiHint').className = 'hint';
        $('pmPiHint').textContent = ps.length ? '' : '📭 Tidak ada PI yang masih bisa diminta (semua sudah selesai/ditutup). Buat PI baru di menu Master.';
    }
    function onPmPiInput(keepQty) {
        if (user && user.gp) return onPmPiInputG(keepQty);
        const p = piList.find(x => String(x.id) === $('pmPi').value), sel = $('pmItem');
        const prev = sel.value;
        if (!p) { sel.innerHTML = '<option value="">— pilih PI dulu —</option>'; $('pmItemInfo').textContent = ''; $('pmDupWarn').style.display = 'none'; return; }
        const its = piItems.filter(i => i.pi_id === p.id && itemBuka(i));
        sel.innerHTML = (its.length > 1 ? '<option value="">— pilih item kertas —</option>' : '') + its.map(i => `<option value="${i.id}">${esc(itemOpsiLabel(i))}</option>`).join('');
        if (its.length === 1) sel.value = its[0].id; else if (prev && its.some(i => String(i.id) === prev)) sel.value = prev;
        $('pmPiHint').className = 'hint ok'; $('pmPiHint').textContent = `🏷️ Brand: ${p.brand}` + (p.tgl_pi ? ' · tgl PI ' + p.tgl_pi.split('-').reverse().join('/') : '');
        onPmItemChange(keepQty === true);
    }
    function onPmItemChange(keepQty) {
        if (user && user.gp) return onPmItemChangeG(keepQty);
        const i = piItems.find(x => x.id === Number($('pmItem').value)), el = $('pmItemInfo'), w = $('pmDupWarn');
        if (!i) { el.className = 'hint'; el.textContent = ''; w.style.display = 'none'; return; }
        const dm = piStatus[i.id] || 0, sisa = i.qty_pi - dm;
        el.className = 'hint ' + (sisa <= 0 ? 'bad' : 'ok');
        el.textContent = `Qty PI ${i.qty_pi} | sudah diminta ${dm} | sisa ${sisa} bundle`;
        if (keepQty !== true) $('pmQty').value = sisa > 0 ? sisa : '';
        const akt = pmData.filter(r => r.pi_item_id === i.id && AKTIF.includes(r.status));
        if (akt.length) {
            w.style.display = 'block';
            w.innerHTML = `⚠️ <b>Item ini SUDAH diminta dan masih berjalan:</b><br>` + akt.map(r => `• #${r.id} — ${r.qty_minta} bundle — ${esc(r.status)} (${fmtWaktu(r.created_at)})`).join('<br>') + `<br>Pastikan ini bukan permintaan ganda. Qty yang diisi otomatis hanya <b>sisa</b> yang belum diminta.`;
        } else w.style.display = 'none';
    }
    $('pmPi').addEventListener('change', () => onPmPiInput(false));
    $('pmItem').addEventListener('change', () => onPmItemChange(false));
    let busyKirim = false;
    $('pmKirimBtn').onclick = async () => {
        if (!requireRole('admin') || busyKirim) return;
        let p, i;
        if (user.gp) {
            const gid = $('pmItem').value; await loadGpPi(true);
            const g = gpItems.find(x => String(x.id) === gid);
            if (!g) { alert('Pilih PI dan item kertas terlebih dahulu'); return; }
            busyKirim = true; $('pmKirimBtn').disabled = true;
            try { i = await ensureMirror(g); } finally { busyKirim = false; $('pmKirimBtn').disabled = false; }
            if (!i) return;
            p = piList.find(x => x.id === i.pi_id);
        } else {
            p = piList.find(x => String(x.id) === $('pmPi').value);
            if (!p) { alert('Pilih No. PI terlebih dahulu'); return; }
            i = piItems.find(x => x.id === Number($('pmItem').value));
            if (!i) { alert('Pilih item kertas PI terlebih dahulu'); return; }
        }
        const qty = parseInt($('pmQty').value);
        if (!(qty > 0)) { alert('Qty harus lebih dari 0'); return; }
        const sisa = i.qty_pi - (piStatus[i.id] || 0);
        if (tambahOn()) {
            if (qty > sisa) {
                const naik = qty - Math.max(sisa, 0);
                if (!confirm(`➕ PERMINTAAN TAMBAHAN (${$('pmTambahAlasan').value})\n${qty} bundle melebihi sisa kuota PI (${Math.max(sisa, 0)}).\nKuota PI di Timbangan akan dinaikkan ${naik} bundle (Qty di Input PI tidak berubah).\nLanjutkan?`)) return;
                if (piTutup[i.id] && !(await rpc('buka_pi_item', { p_id: i.id, p_oleh: user.nama }))) return;
                if (!(await rpc('edit_pi_item', { p_id: i.id, p_jenis: i.jenis_kertas, p_wm: i.watermark, p_size: i.size_kertas, p_gsm: i.gsm, p_leaves: i.leaves, p_qty: Number(i.qty_pi) + naik, p_oleh: user.nama }))) return;
                await loadMasterData(); const i2 = piItems.find(x => x.id === i.id); if (i2) i = i2;
            } else if (piTutup[i.id] && !(await rpc('buka_pi_item', { p_id: i.id, p_oleh: user.nama }))) return;
        } else if (qty > sisa) { alert(`❌ Qty ${qty} melebihi sisa PI (${sisa} bundle). Kurangi qty. (Kalau ini untuk mengganti NG / kekurangan, centang "Permintaan TAMBAHAN".)`); return; }
        if (!beratBundleKG(i.size_kertas, i.gsm, i.leaves, i.jenis_kertas)) {
            if (user.gp) { if (await isiBeratInline(i) === null) return; }
            else if (!confirm('⚠️ Berat bundle untuk spesifikasi ini belum terdaftar, jadi nanti belum bisa ditimbang.\nTetap kirim permintaan?')) return;
        }
        const akt = pmData.filter(r => r.pi_item_id === i.id && AKTIF.includes(r.status));
        if (akt.length && !confirm(`⚠️ PERINGATAN DOUBLE INPUT\nItem ini sudah punya ${akt.length} permintaan berjalan (${akt.map(r => '#' + r.id + ' ' + r.qty_minta).join(', ')}).\nYakin ingin membuat permintaan lagi?`)) return;
        if (!confirm(`Kirim permintaan?\nPI ${p.no_pi} (${p.brand})\n${i.jenis_kertas} · ${i.watermark} · ${i.size_kertas} · ${i.gsm}gsm · ${i.leaves}lv\nQty: ${qty} bundle`)) return;
        busyKirim = true; $('pmKirimBtn').disabled = true;
        try {
            const ok = await rpc('buat_permintaan', { p_pi_item_id: i.id, p_qty: qty, p_catatan: catatanKirim(), p_oleh: user.nama });
            if (!ok) { await loadPermintaan(); return; }
            $('pmQty').value = ''; $('pmCatatan').value = ''; gpAt = 0; if ($('pmTambah')) { $('pmTambah').checked = false; $('pmTambahBox').style.display = 'none'; }
            await loadMasterData(); await loadPermintaan();
            alert('✅ Permintaan terkirim. Leader Mesin akan mendapat notifikasi.');
        } finally { busyKirim = false; $('pmKirimBtn').disabled = false; }
    };

    async function loadPermintaan() {
        if (!user) return;
        const [a, b, c, n, d] = await Promise.all([
            supabase.from('permintaan').select('*').order('id', { ascending: false }).limit(500),
            supabase.from('ditimbang_per_permintaan').select('*'),
            supabase.from('stok_saat_ini').select('*'),
            supabase.from('serah_terima').select('id,permintaan_id,status,no_dokumen').in('status', ['Menunggu', 'Disepakati']),
            supabase.from('pi_item_status').select('*')
        ]);
        if (a.error) { console.error(a.error); return; }
        pmData = a.data || [];
        setPiStatus(d.data);
        pmTimbang = {}; pmBox = {}; (b.data || []).forEach(x => { pmTimbang[x.permintaan_id] = x.bundles; pmBox[x.permintaan_id] = x.jumlah_box; });
        stokMap = {}; (c.data || []).forEach(x => stokMap[specKey(x.size_kertas, x.gsm, x.leaves, x.jenis_kertas, x.watermark)] = x.qty);
        stMap = {}; (n.data || []).forEach(x => stMap[x.permintaan_id] = x);
        renderPermintaan();
        if (curRole() === 'admin') { await loadGpPi(); fillPmPi(); onPmPiInput(true); } else fillLcPm();
    }
    function cardHtml(r, role) {
        const warna = STATUS_WARNA[r.status] || '#64748b';
        const dt = pmTimbang[r.id] || 0;
        const stok = stokMap[specKey(r.size_kertas, r.gsm, r.leaves, r.jenis_kertas, r.watermark)] || 0;
        const kurang = r.qty_minta - r.qty_siap;
        const nota = stMap[r.id];
        const aktifL = ['Diminta', 'Diproses', 'Produksi'].includes(r.status);
        let sel = '';
        if (r.status !== 'Dibatalkan' && dt > 0) {
            const diff = dt - r.qty_minta;
            sel = `<span class="${diff > 0 ? 'bad' : diff === 0 ? 'good' : 'warn'}">Ditimbang ${dt}/${r.qty_minta} (${diff === 0 ? 'sesuai' : diff > 0 ? 'LEBIH ' + diff : 'kurang ' + (-diff)})</span>`;
        }
        let acts = '';
        if (role === 'leader') {
            if (aktifL) {
                acts += `<button class="mini" style="background:#10b981" data-act="stok" data-id="${r.id}">📦 Siapkan dari stok</button>`;
                if (r.status !== 'Produksi') acts += `<button class="mini" style="background:#8b5cf6" data-act="produksi" data-id="${r.id}">🏭 Mulai produksi</button>`;
                acts += `<button class="mini" style="background:#f59e0b" data-act="selesaiprod" data-id="${r.id}">✅ Hasil produksi</button>`;
                if (r.box_siap > 0) acts += `<button class="mini" style="background:#166534" data-act="siap" data-id="${r.id}">⚖️ Box siap ditimbang</button>`;
            }
            if (r.status === 'Siap' && !nota) acts += `<button class="mini" style="background:#64748b" data-act="buka" data-id="${r.id}">↩ Tambah box lagi</button>`;
            if (r.box_siap > 0 && !nota && !(pmBox[r.id] > 0) && ['Diproses', 'Produksi', 'Siap'].includes(r.status)) acts += `<button class="mini" style="background:#ef4444" data-act="reset" data-id="${r.id}">↩ Ulangi penyiapan</button>`;
        } else {
            if (r.status === 'Siap' && !nota) acts += `<button class="mini" style="background:#166534" data-act="nota" data-id="${r.id}">🧾 Buat nota serah terima</button>`;
            if (r.status === 'Diminta') acts += `<button class="mini" style="background:#f59e0b" data-act="editqty" data-id="${r.id}">✏️ Ubah qty</button>`;
            if (AKTIF.includes(r.status) && !nota) acts += `<button class="mini" style="background:#ef4444" data-act="batal" data-id="${r.id}">✖ Batalkan</button>`;
        }
        if (nota) acts += `<button class="mini" style="background:#8b5cf6" data-act="gotonota" data-id="${r.id}">🧾 Lihat nota</button>`;
        if (r.box_siap > 0 || dt > 0) acts += `<button class="mini" style="background:#0891b2" data-act="lihat" data-id="${r.id}">📋 Lihat timbangan</button>`;
        const stokInfo = (role === 'leader' && aktifL) ? `<span class="${stok > 0 ? 'good' : 'stok-nol'}">Stok tersedia: ${stok}</span>` : '';
        return `<div class="pcard" style="border-left-color:${warna}">
            <div class="top"><span class="pi">#${r.id} · ${esc(r.no_pi)} · ${esc(r.brand)}</span><span class="badge" style="background:${warna}">${esc(r.status)}</span></div>
            <div class="spec">🧻 <b>${esc(r.jenis_kertas)}</b> · 💧 ${esc(r.watermark)} · 📏 ${esc(r.size_kertas)} · ${r.gsm} gsm · ${r.leaves} leaves</div>
            <div class="nums">${qtyPiSpan(r)}<span>Diminta: <b>${r.qty_minta}</b></span><span>Box siap: <b>${r.box_siap}</b></span><span>Estimasi: <b>${r.qty_siap}</b></span>${aktifL && kurang > 0 ? `<span>Kurang (est.): <b>${kurang}</b></span>` : ''}${stokInfo ? `<span>${stokInfo}</span>` : ''}${sel ? `<span>${sel}</span>` : ''}</div>
            ${r.catatan ? `<div class="meta">📝 Admin: ${esc(r.catatan)}</div>` : ''}
            ${r.catatan_leader ? `<div class="meta">🏭 Leader: ${esc(r.catatan_leader)}</div>` : ''}
            ${nota ? `<div class="meta">🧾 Nota ${esc(nota.no_dokumen)} (${esc(nota.status)})</div>` : ''}
            <div class="meta">Diminta ${esc(r.diminta_oleh || '-')} · ${fmtWaktu(r.created_at)}${r.disiapkan_oleh ? ' · Disiapkan ' + esc(r.disiapkan_oleh) : ''}${r.diterima_oleh ? ' · Diterima ' + esc(r.diterima_oleh) : ''}</div>
            ${acts ? `<div class="acts">${acts}</div>` : ''}</div>`;
    }
    function renderPermintaan() {
        [['pm', 'admin'], ['q', 'leader']].forEach(([pre, role]) => {
            if (curRole() !== role) return;
            const f = $(pre + 'Filter').value || 'AKTIF';
            const s = $(pre + 'Search').value.trim().toLowerCase();
            let list = pmData.filter(r => f === 'SEMUA' ? true : f === 'AKTIF' ? AKTIF.includes(r.status) : r.status === f);
            if (s) list = list.filter(r => [r.no_pi, r.brand, r.jenis_kertas, r.watermark, r.size_kertas, r.status, '#' + r.id].join(' ').toLowerCase().includes(s));
            const count = st => pmData.filter(r => r.status === st).length;
            $(pre + 'Pills').innerHTML = AKTIF.map(st => `<span class="pill" style="background:${STATUS_WARNA[st]}">${st}: ${count(st)}</span>`).join('');
            $(pre + 'List').innerHTML = list.length ? list.map(r => cardHtml(r, role)).join('') : '<div style="text-align:center;padding:16px;color:#64748b;">📭 Tidak ada permintaan</div>';
        });
    }
    ['pmFilter', 'qFilter'].forEach(id => $(id).addEventListener('change', renderPermintaan));
    ['pmSearch', 'qSearch'].forEach(id => $(id).addEventListener('input', renderPermintaan));
    ['pmList', 'qList'].forEach(cid => $(cid).addEventListener('click', e => {
        const b = e.target.closest('button[data-act]'); if (!b) return;
        aksiPermintaan(b.dataset.act, parseInt(b.dataset.id));
    }));

    async function lihatTimbangan(r) {
        const { data, error } = await supabase.from('riwayat_timbang').select('*').eq('permintaan_id', r.id).order('id');
        if (error) { alert('❌ ' + error.message); return; }
        let tb = 0, tk = 0;
        const rows = (data || []).map((d, i) => { tb += d.jumlah_bundles || 0; tk += d.berat_timbang_kg || 0;
            return `<tr><td>${i + 1}</td><td>${esc(d.jenis_box || '')}</td><td>${d.jumlah_layer || 0}</td><td>${Number(d.berat_timbang_kg || 0).toFixed(2)}</td><td>${Number(d.berat_bersih_kg || 0).toFixed(2)}</td><td><b>${d.jumlah_bundles}</b></td></tr>`; }).join('');
        const nBox = (data || []).length;
        const info = `<b>#${r.id} · PI ${esc(r.no_pi)} · ${esc(r.brand)}</b><br>${esc(r.jenis_kertas)} · ${esc(r.watermark)} · ${esc(r.size_kertas)} · ${r.gsm}gsm · ${r.leaves}lv
            <br>Diminta <b>${r.qty_minta}</b> bundle | Leader siapkan <b>${r.box_siap}</b> box (estimasi ${r.qty_siap} bundle)
            <br>Sudah ditimbang: <b class="${nBox === r.box_siap ? 'good' : 'warn'}">${nBox} dari ${r.box_siap} box</b>
            <div style="overflow-x:auto;margin-top:8px;"><table><thead><tr><th>Box</th><th>Jenis box</th><th>Layer</th><th>Timbang (kg)</th><th>Bersih (kg)</th><th>Bundles</th></tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center">Belum ada timbangan</td></tr>'}
            <tr class="total-row"><td colspan="3"><b>TOTAL</b></td><td><b>${tk.toFixed(2)}</b></td><td></td><td><b>${tb}</b></td></tr></tbody></table></div>`;
        await dialog({ title: '⚖️ Hasil timbang bersama', info, ok: 'Tutup' });
    }

    async function aksiPermintaan(act, id) {
        const r = pmData.find(x => x.id === id); if (!r) return;
        const ringkas = `<b>#${r.id} · PI ${esc(r.no_pi)} · ${esc(r.brand)}</b><br>${esc(r.jenis_kertas)} · ${esc(r.watermark)} · ${esc(r.size_kertas)} · ${r.gsm}gsm · ${r.leaves}lv<br>Diminta ${r.qty_minta} bundle | disiapkan ${r.box_siap} box (estimasi ${r.qty_siap} bundle)`;
        const estLama = r.box_siap > 0 ? Math.round(r.qty_siap / r.box_siap) : '';
        const stok = stokMap[specKey(r.size_kertas, r.gsm, r.leaves, r.jenis_kertas, r.watermark)] || 0;
        let ok = false;
        if (act === 'lihat') { await lihatTimbangan(r); return; }
        if (act === 'gotonota') { const n = stMap[r.id]; $('ntFilter').value = 'SEMUA'; $('ntSearch').value = n ? n.no_dokumen : ''; showPage('page8'); return; }
        if (act === 'stok') {
            if (!requireRole('leader')) return;
            if (stok <= 0) { alert('Stok untuk spesifikasi ini kosong. Gunakan "Mulai produksi".'); return; }
            const d = await dialog({ title: '📦 Siapkan dari stok', info: ringkas + `<br>Stok tersedia: <b>${stok}</b> bundle`, qty: { label: 'Jumlah box', value: (estTersimpan(id) || {}).box || '' }, qty2: { label: 'Estimasi bundle per box (hitung dari box contoh / guillotine)', value: (estTersimpan(id) || {}).avg || estLama }, note: { label: 'Catatan (opsional)' }, ok: 'Siapkan' });
            if (!d) return;
            if (d.qty * d.qty2 > stok) { alert(`Stok tidak cukup: ${d.qty} x ${d.qty2} = ${d.qty * d.qty2}, tersedia ${stok}`); return; }
            ok = await rpc('siapkan_dari_stok', { p_id: id, p_box: d.qty, p_est: d.qty2, p_oleh: user.nama, p_catatan: d.note });
        } else if (act === 'produksi') {
            if (!requireRole('leader')) return;
            const d = await dialog({ title: '🏭 Mulai produksi', info: ringkas + '<br>Status menjadi <b>Produksi</b>.', note: { label: 'Catatan (opsional, mis. estimasi selesai)' }, ok: 'Mulai' });
            if (!d) return;
            ok = await rpc('tandai_produksi', { p_id: id, p_oleh: user.nama, p_catatan: d.note });
        } else if (act === 'selesaiprod') {
            if (!requireRole('leader')) return;
            const d = await dialog({ title: '✅ Input hasil produksi', info: ringkas + '<br>Box hasil produksi ini langsung dipakai untuk permintaan.', qty: { label: 'Jumlah box', value: (estTersimpan(id) || {}).box || '' }, qty2: { label: 'Estimasi bundle per box (hitung dari box contoh / guillotine)', value: (estTersimpan(id) || {}).avg || estLama }, note: { label: 'Catatan (opsional)' }, ok: 'Simpan' });
            if (!d) return;
            ok = await rpc('selesai_produksi', { p_id: id, p_box: d.qty, p_est: d.qty2, p_oleh: user.nama, p_catatan: d.note });
        } else if (act === 'siap') {
            if (!requireRole('leader')) return;
            if (!confirm(`Tandai SIAP ditimbang?\n${r.box_siap} box, estimasi ${r.qty_siap} bundle.\nSetelah ini Admin menimbang box satu per satu.`)) return;
            ok = await rpc('tandai_siap', { p_id: id, p_oleh: user.nama, p_catatan: null });
        } else if (act === 'reset') {
            if (!requireRole('leader')) return;
            const d = await dialog({ title: '↩ Ulangi penyiapan', info: ringkas + '<br><b>Box & estimasi dikosongkan. Barang dari stok dikembalikan ke stok.</b> Hanya bisa jika Admin belum menimbang.', note: { label: 'Alasan', required: true }, ok: 'Ulangi' });
            if (!d) return;
            ok = await rpc('reset_penyiapan', { p_id: id, p_alasan: d.note, p_oleh: user.nama });
        } else if (act === 'buka') {
            if (!requireRole('leader')) return;
            if (!confirm('Buka kembali permintaan ini untuk menambah box?')) return;
            ok = await rpc('buka_kembali', { p_id: id, p_oleh: user.nama });
        } else if (act === 'nota') {
            if (!requireRole('admin')) return;
            const dt = pmTimbang[id] || 0, nb = pmBox[id] || 0, sisaBox = r.box_siap - nb, selT = dt - r.qty_minta;
            const d = await dialog({ title: '🧾 Buat nota serah terima', info: ringkas + `<br>Hasil timbang tercatat: <b>${nb} box = ${dt} bundle</b> (target ${r.qty_minta}).`
                + (selT >= 0 ? `<br><b class="good">✅ Target tercapai${selT > 0 ? ' (lebih ' + selT + ' karena box utuh)' : ''}.</b>` : `<br><b class="bad">⚠️ Masih kurang ${-selT} bundle dari permintaan.</b>`)
                + (sisaBox > 0 ? `<br>ℹ️ ${sisaBox} box yang disiapkan Leader tidak ditimbang → <b>tidak ikut diserahkan</b>, tetap di Leader dan tetap dihitung sebagai stok.` : (sisaBox < 0 ? `<br><b class="bad">⚠️ Box yang ditimbang (${nb}) lebih banyak dari yang disiapkan (${r.box_siap}).</b>` : ''))
                + (r.qty_siap > 0 && Math.abs(dt - r.qty_siap) / r.qty_siap > 0.1 ? `<br>ℹ️ Hasil timbang berbeda ${Math.round(Math.abs(dt - r.qty_siap) / r.qty_siap * 100)}% dari estimasi Leader (${r.qty_siap}). Wajar bila estimasi guillotine kurang akurat; stok disesuaikan otomatis dengan hasil timbang.` : '')
                + '<br><b>Setelah nota dibuat, data timbang permintaan ini terkunci.</b>', note: { label: 'Catatan nota (opsional)' }, ok: 'Buat nota' });
            if (!d) return;
            ok = await rpc('buat_serah_terima', { p_permintaan_id: id, p_oleh: user.nama, p_catatan: d.note });
            if (ok) { await loadPermintaan(); $('ntFilter').value = 'Menunggu'; $('ntSearch').value = ''; showPage('page8'); return; }
        } else if (act === 'batal') {
            if (!requireRole('admin')) return;
            const d = await dialog({ title: '✖ Batalkan permintaan', info: ringkas + (r.qty_siap > 0 ? `<br><b>${r.qty_siap} bundle yang sudah disiapkan akan dikembalikan ke stok.</b>` : ''), note: { label: 'Alasan pembatalan', required: true }, ok: 'Batalkan' });
            if (!d) return;
            ok = await rpc('batalkan_permintaan', { p_id: id, p_oleh: user.nama, p_alasan: d.note });
        } else if (act === 'editqty') {
            if (!requireRole('admin')) return;
            const d = await dialog({ title: '✏️ Ubah qty permintaan', info: ringkas, qty: { label: 'Qty baru (bundles)', value: r.qty_minta }, ok: 'Simpan' });
            if (!d) return;
            ok = await rpc('ubah_qty_permintaan', { p_id: id, p_qty: d.qty, p_oleh: user.nama });
        }
        if (ok) loadPermintaan();
    }

    // ========== SERAH TERIMA (NOTA) ==========
    let stRows = [], apvId = null, stLimit = 100, stCetakCol = true, stTimer = null;
    const CETAK_LS = 'tsb_nota_cetak';
    function cetakLokal() { try { return JSON.parse(localStorage.getItem(CETAK_LS) || '{}'); } catch (e) { return {}; } }
    function cetakInfo(s) {
        if (s.dicetak_at) return { n: Number(s.jml_cetak) || 1, at: s.dicetak_at, oleh: s.dicetak_oleh };
        const l = cetakLokal()[s.id]; return l ? { n: l.n, at: l.at, oleh: l.oleh, lokal: true } : null;
    }
    async function tandaiCetak(s) {
        const now = new Date().toISOString();
        const { error } = await supabase.rpc('tandai_cetak_nota', { p_id: s.id, p_oleh: user.nama });
        if (!error) { s.dicetak_at = now; s.dicetak_oleh = user.nama; s.jml_cetak = (Number(s.jml_cetak) || 0) + 1; }
        else {
            console.warn('tandai_cetak_nota gagal, dicatat di browser ini saja:', error.message);
            const l = cetakLokal(), o = l[s.id] || { n: 0 }; l[s.id] = { n: o.n + 1, at: now, oleh: user.nama };
            try { localStorage.setItem(CETAK_LS, JSON.stringify(l)); } catch (e) { }
        }
        renderSerahTerima();
    }
    async function loadSerahTerima(more) {
        if (!user) return;
        if (more === true) stLimit += 100; else stLimit = 100;
        const f = $('ntFilter').value || 'SEMUA', per = $('ntPeriode').value, c = $('ntCetak').value;
        const s = $('ntSearch').value.trim().replace(/[,()%*]/g, ' ').trim();
        const bangun = (pakaiCetak) => {
            let q = supabase.from('serah_terima').select('*').order('id', { ascending: false }).limit(stLimit);
            if (f !== 'SEMUA') q = q.eq('status', f);
            if (per !== '') { const b = new Date(); b.setHours(0, 0, 0, 0); b.setDate(b.getDate() - Number(per)); q = q.gte('created_at', b.toISOString()); }
            if (s) q = q.or(['no_dokumen', 'no_pi', 'brand', 'jenis_kertas', 'watermark'].map(k => `${k}.ilike.%${s}%`).join(','));
            if (pakaiCetak && c === 'belum') q = q.is('dicetak_at', null);
            if (pakaiCetak && c === 'sudah') q = q.not('dicetak_at', 'is', null);
            return q;
        };
        let r = await bangun(stCetakCol);
        if (r.error && stCetakCol && /dicetak_at/.test(r.error.message || '')) { stCetakCol = false; r = await bangun(false); }
        if (r.error) { console.error(r.error); return; }
        stRows = r.data || [];
        renderSerahTerima();
    }
    function notaCard(s) {
        const warna = { Menunggu: '#f59e0b', Disepakati: '#166534', Dibatalkan: '#94a3b8' }[s.status] || '#64748b';
        const sel = s.total_bundles - s.qty_minta;
        const selEst = s.total_bundles - s.estimasi_bundles;
        const apv = (nama, at) => nama ? `<span class="good">✅ ${esc(nama)} (${fmtWaktu(at)})</span>` : '<span class="warn">⏳ menunggu</span>';
        let acts = '';
        if (s.status === 'Menunggu') {
            acts += `<button class="mini" style="background:#166534" data-act="apv" data-id="${s.id}">✍️ Setujui (PIN)</button>`;
            if (user.role === 'admin') acts += `<button class="mini" style="background:#ef4444" data-act="batalnota" data-id="${s.id}">✖ Batalkan nota</button>`;
        }
        const ci = cetakInfo(s);
        acts += `<button class="mini" style="background:${ci ? '#64748b' : '#8b5cf6'}" data-act="cetak" data-id="${s.id}">🖨️ ${ci ? 'Cetak ulang' : 'Cetak 2 rangkap'}</button>`;
        const cetakTag = ci ? `<div class="meta good">🖨️ Sudah dicetak${ci.n > 1 ? ' ' + ci.n + '×' : ''} · terakhir ${fmtWaktu(ci.at)}${ci.oleh ? ' oleh ' + esc(ci.oleh) : ''}${ci.lokal ? ' <span class="warn">(tercatat di browser ini saja)</span>' : ''}</div>` : `<div class="meta warn">🖨️ <b>Belum dicetak</b></div>`;
        return `<div class="pcard" style="border-left-color:${warna}">
            <div class="top"><span class="pi">${esc(s.no_dokumen)}</span><span class="badge" style="background:${warna}">${esc(s.status)}</span></div>
            <div class="spec">PI <b>${esc(s.no_pi)}</b> · ${esc(s.brand)}<br>🧻 ${esc(s.jenis_kertas)} · 💧 ${esc(s.watermark)} · 📏 ${esc(s.size_kertas)} · ${s.gsm}gsm · ${s.leaves}lv</div>
            <div class="nums"><span>Diminta: <b>${s.qty_minta}</b></span><span>Estimasi Leader: <b>${s.estimasi_box} box / ${s.estimasi_bundles}</b></span><span>Ditimbang: <b>${s.jumlah_box} box / ${s.total_bundles}</b></span><span>${Number(s.total_berat).toFixed(2)} kg</span></div>
            <div class="nums"><span class="${sel === 0 ? 'good' : sel > 0 ? 'bad' : 'warn'}">Vs permintaan: ${sel === 0 ? 'sesuai' : sel > 0 ? 'LEBIH ' + sel : 'kurang ' + (-sel)}</span><span>Vs estimasi: ${selEst > 0 ? '+' : ''}${selEst}</span></div>
            <div class="meta">Admin: ${apv(s.admin_setuju_oleh, s.admin_setuju_at)}<br>Leader: ${apv(s.leader_setuju_oleh, s.leader_setuju_at)}</div>
            ${s.catatan ? `<div class="meta">📝 ${esc(s.catatan)}</div>` : ''}
            <div class="meta">Dibuat ${esc(s.dibuat_oleh || '-')} · ${fmtWaktu(s.created_at)}${s.selesai_at ? ' · Selesai ' + fmtWaktu(s.selesai_at) : ''}</div>
            <details class="rinci"><summary>📋 Lihat rincian ${(s.rincian || []).length} box</summary><div style="overflow-x:auto;"><table><thead><tr><th>Box</th><th>Tgl</th><th>Jenis box</th><th>Layer</th><th>Timbang</th><th>Bundles</th></tr></thead><tbody>${(Array.isArray(s.rincian) ? s.rincian : []).map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.tanggal || '')}</td><td>${esc(x.jenis_box || '')}</td><td>${x.jumlah_layer || 0}</td><td>${Number(x.berat_timbang_kg || 0).toFixed(2)}</td><td><b>${x.jumlah_bundles}</b></td></tr>`).join('')}</tbody></table></div></details>
            ${cetakTag}
            <div class="acts">${acts}</div></div>`;
    }
    function renderSerahTerima() {
        if (!user) return;
        const f = $('ntFilter').value || 'SEMUA', s = $('ntSearch').value.trim().toLowerCase(), per = $('ntPeriode').value;
        const cf = $('ntCetak').value;
        let list = stRows.filter(r => (f === 'SEMUA' ? true : r.status === f) && (!cf || (cf === 'sudah') === !!cetakInfo(r)));
        if (per !== '') { const batas = new Date(); batas.setHours(0, 0, 0, 0); batas.setDate(batas.getDate() - Number(per)); list = list.filter(r => new Date(r.created_at) >= batas); }
        const cnt = st => stRows.filter(r => r.status === st).length, WN = { Menunggu: '#f59e0b', Disepakati: '#166534', Dibatalkan: '#94a3b8' };
        const belumCetak = stRows.filter(r => r.status === 'Disepakati' && !cetakInfo(r)).length;
        $('ntPills').innerHTML = ['Menunggu', 'Disepakati', 'Dibatalkan'].map(st => `<span class="pill" style="background:${WN[st]}">${st}: ${cnt(st)}</span>`).join('') + `<span class="pill" style="background:${belumCetak ? '#d97706' : '#64748b'}">🖨️ Belum dicetak: ${belumCetak}</span>`;
        $('ntMore').innerHTML = stRows.length >= stLimit ? `<button class="mini" style="background:#2563eb;padding:10px 18px;" id="ntMoreBtn">⬇️ Muat 100 nota lebih lama (sudah dimuat ${stRows.length})</button>` : (stRows.length ? `<span class="hint">Semua nota sesuai filter sudah dimuat (${stRows.length}).</span>` : '');
        const mb = $('ntMoreBtn'); if (mb) mb.onclick = () => loadSerahTerima(true);
        if (s) list = list.filter(r => [r.no_dokumen, r.no_pi, r.brand, r.jenis_kertas, r.watermark].join(' ').toLowerCase().includes(s));
        const sep = list.filter(r => r.status === 'Disepakati');
        $('ntRingkas').textContent = list.length ? `${list.length} nota ditampilkan` + (sep.length ? ` · ${sep.length} selesai · total diserahkan ${sep.reduce((a, r) => a + (r.total_bundles || 0), 0).toLocaleString('id-ID')} bundle (${sep.reduce((a, r) => a + (r.jumlah_box || 0), 0)} box)` : '') : '';
        list.sort((a, b) => (a.status === 'Menunggu' ? 0 : 1) - (b.status === 'Menunggu' ? 0 : 1) || b.id - a.id);
        $('ntList').innerHTML = list.length ? list.map(notaCard).join('') : '<div style="text-align:center;padding:16px;color:#64748b;">📭 Tidak ada nota</div>';
    }
    $('ntFilter').addEventListener('change', () => loadSerahTerima());
    $('ntPeriode').addEventListener('change', () => loadSerahTerima());
    $('ntCetak').addEventListener('change', () => loadSerahTerima());
    $('ntSearch').addEventListener('input', () => { clearTimeout(stTimer); stTimer = setTimeout(() => loadSerahTerima(), 350); });
    $('ntList').addEventListener('click', async e => {
        const b = e.target.closest('button[data-act]'); if (!b) return;
        const s = stRows.find(x => x.id === parseInt(b.dataset.id)); if (!s) return;
        if (b.dataset.act === 'apv') bukaApv(s);
        else if (b.dataset.act === 'cetak') cetakNota(s);
        else if (b.dataset.act === 'batalnota') {
            if (!requireRole('admin')) return;
            const d = await dialog({ title: '✖ Batalkan nota', info: `<b>${esc(s.no_dokumen)}</b> · PI ${esc(s.no_pi)}<br>Data timbang akan terbuka kembali untuk diperbaiki.`, note: { label: 'Alasan pembatalan', required: true }, ok: 'Batalkan nota' });
            if (!d) return;
            if (await rpc('batal_serah_terima', { p_id: s.id, p_oleh: user.nama, p_alasan: d.note })) loadSerahTerima();
        }
    });
    function bukaApv(s) {
        apvId = s.id;
        const butuh = [];
        if (!s.admin_setuju_at) butuh.push('admin');
        if (!s.leader_setuju_at) butuh.push('leader');
        const us = userList.filter(u => butuh.includes(u.role));
        $('apvUser').innerHTML = us.map(u => `<option value="${esc(u.nama)}">${esc(u.nama)} (${u.role === 'admin' ? 'Admin Timbang' : 'Leader Mesin'})</option>`).join('');
        const me = us.find(u => u.nama === user.nama); if (me) $('apvUser').value = me.nama;
        $('apvInfo').innerHTML = `<b>${esc(s.no_dokumen)}</b> · PI ${esc(s.no_pi)} · ${esc(s.brand)}<br>${esc(s.jenis_kertas)} · ${esc(s.watermark)} · ${esc(s.size_kertas)}<br>Hasil timbang: <b>${s.jumlah_box} box / ${s.total_bundles} bundle</b> (diminta ${s.qty_minta}).<br>Pastikan angka ini sudah disepakati kedua pihak, lalu masukkan PIN penyetuju.`;
        $('apvPin').value = '';
        $('apvModal').style.display = 'flex';
    }
    $('apvBatalBtn').onclick = () => { $('apvModal').style.display = 'none'; };
    $('apvPin').addEventListener('keydown', e => { if (e.key === 'Enter') $('apvOkBtn').click(); });
    $('apvOkBtn').onclick = async () => {
        if (!$('apvUser').value || !$('apvPin').value) { alert('Pilih penyetuju dan isi PIN'); return; }
        const { data, error } = await supabase.rpc('setujui_serah_terima', { p_id: apvId, p_nama: $('apvUser').value, p_pin: $('apvPin').value });
        if (error) { alert('❌ ' + error.message); return; }
        $('apvModal').style.display = 'none';
        await loadSerahTerima();
        if (data === 'DISEPAKATI') {
            $('ntFilter').value = 'Disepakati'; $('ntCetak').value = ''; await loadSerahTerima();
            alert('✅ Kedua pihak setuju. Serah terima SELESAI dan stok sudah disesuaikan dengan hasil timbang.\n\nNota tersimpan permanen di menu Serah Terima → filter "Selesai / Disepakati" (bisa dicetak ulang kapan saja).');
            const s = stRows.find(x => x.id === apvId);
            if (s && confirm('Cetak nota 2 rangkap sekarang?')) cetakNota(s);
        } else alert('✅ Persetujuan tercatat. Menunggu pihak lainnya.');
    };
    function cetakNota(s) {
        const rinci = Array.isArray(s.rincian) ? s.rincian : [];
        const f0 = n => Number(n || 0).toLocaleString('id-ID');
        const f2 = n => Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const nk = rinci.length <= 6 ? 1 : rinci.length <= 14 ? 2 : rinci.length <= 24 ? 3 : 4, per = Math.ceil(rinci.length / nk) || 1;
        const kolom = Array.from({ length: nk }, (_, c) => rinci.slice(c * per, (c + 1) * per).map((x, i) => `<tr><td>${c * per + i + 1}</td><td>${f2(x.berat_timbang_kg)}</td><td><b>${f0(x.jumlah_bundles)}</b></td></tr>`).join('')).filter(Boolean);
        const tabelBox = `<div class="kolom">${kolom.map(k => `<table class="mini"><thead><tr><th>Box</th><th>Timbang (kg)</th><th>Bundles</th></tr></thead><tbody>${k}</tbody></table>`).join('')}</div>`;
        const sel = s.total_bundles - s.qty_minta;
        const selTxt = sel === 0 ? 'Sesuai permintaan' : sel > 0 ? `Lebih ${f0(sel)} bundle dari permintaan` : `Kurang ${f0(-sel)} bundle dari permintaan`;
        const stat = s.status === 'Disepakati' ? 'DISEPAKATI' : s.status === 'Dibatalkan' ? 'DIBATALKAN' : 'BELUM DISEPAKATI';
        const ttd = (nama, at) => nama ? `<div style="height:50px;"></div><div class="ttd-line"></div><div><b>${esc(nama)}</b></div><div style="font-size:9px;">Disetujui di aplikasi ${esc(fmtWaktu(at))}</div>` : `<div style="height:50px;"></div><div class="ttd-line"></div><div><b>( ........................ )</b></div><div style="font-size:9px;">belum disetujui di aplikasi</div>`;
        const hal = (label, warna) => `<div class="hal">
            <div class="hd"><div><b class="firma">THE ROLLING PAPER COMPANY</b><br><span class="jdl">NOTA SERAH TERIMA KERTAS</span></div><div class="lbl" style="color:${warna};border-color:${warna};">${label}</div></div>
            <div class="nomor">No. ${esc(s.no_dokumen)} &nbsp;|&nbsp; ${stat} &nbsp;|&nbsp; ${esc(fmtWaktu(s.created_at))}</div>
            <div class="info">
                <div><b>PI / Brand:</b> ${esc(s.no_pi)} / ${esc(s.brand)}</div>
                <div><b>Kertas:</b> ${esc(s.jenis_kertas)} · ${esc(s.watermark)} · ${esc(s.size_kertas)} · ${s.gsm}gsm · ${s.leaves}lv</div>
                <div><b>Diminta:</b> ${f0(s.qty_minta)} bundle &nbsp; <b>Estimasi Leader:</b> ${f0(s.estimasi_box)} box / ${f0(s.estimasi_bundles)}</div>
                <div class="hasil"><b>HASIL TIMBANG:</b> ${f0(s.jumlah_box)} box / <b>${f0(s.total_bundles)} bundle</b> (${f2(s.total_berat)} kg) — ${selTxt}</div>
                ${s.catatan ? `<div><b>Catatan:</b> ${esc(s.catatan)}</div>` : ''}
            </div>
            ${tabelBox}
            <div class="ttd"><div class="tb"><div>Diserahkan (Leader Mesin)</div>${ttd(s.leader_setuju_oleh, s.leader_setuju_at)}</div>
            <div class="tb"><div>Diterima (Admin Timbang)</div>${ttd(s.admin_setuju_oleh, s.admin_setuju_at)}</div></div>
            <div class="ft">${ALAMAT} · Dicetak ${new Date().toLocaleString('id-ID')}${((cetakInfo(s) || {}).n || 0) >= 1 ? ' (cetak ulang ke-' + (((cetakInfo(s) || {}).n || 0) + 1) + ')' : ''}</div></div>`;
        const NOTA_CSS = `@page{size:A4 portrait;margin:7mm;}
            *{margin:0;padding:0;box-sizing:border-box;} body{font-family:Arial,sans-serif;font-size:11px;color:#000;background:#fff;}
            .lembar{width:196mm;height:283mm;display:flex;flex-direction:column;overflow:hidden;}
            .hal{flex:1 1 0;min-height:0;overflow:hidden;padding:3mm 2mm;transform-origin:top left;}
            .hal+.hal{border-top:1.5px dashed #888;}
            .hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a8a;padding-bottom:3px;}
            .firma{font-size:14px;color:#1e3a8a;letter-spacing:1px;} .jdl{font-size:11px;font-weight:bold;}
            .lbl{font-weight:bold;border:2px solid;padding:2px 8px;border-radius:5px;font-size:10px;}
            .nomor{background:#f1f5f9;text-align:center;font-weight:bold;padding:2px;margin:3px 0;font-size:10px;}
            .info{border:1.5px solid #1e3a8a;border-radius:6px;padding:4px 6px;line-height:1.5;} .hasil{background:#fef9c3;padding:1px 3px;}
            .kolom{display:flex;gap:6px;margin:4px 0;align-items:flex-start;}
            table.mini{flex:1;border-collapse:collapse;font-size:10px;} table.mini th,table.mini td{border:1px solid #999;padding:1px 3px;text-align:center;}
            table.mini th{background:#1e3a8a;color:#fff;}
            .ttd{display:flex;justify-content:space-around;margin-top:4px;text-align:center;font-size:10px;} .tb{width:44%;}
            .ttd-line{margin-top:2px;border-top:1px solid #000;} .ft{margin-top:3px;text-align:center;font-size:8px;color:#555;}`;
        const FIT = `<script>(function(){var hs=document.querySelectorAll('.hal');hs.forEach(function(el){var inner=el.scrollHeight,box=el.clientHeight;if(inner>box+1){var z=box/inner;el.style.zoom=z;}});})();<\/script>`;
        bukaCetak(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(s.no_dokumen)}</title><style>${NOTA_CSS}</style></head><body><div class="lembar">${hal('ASLI - untuk Admin', '#1e3a8a')}${hal('COPY - untuk Leader', '#b45309')}</div>${FIT}</body></html>`);
        catatLog('CETAK_NOTA', s.no_dokumen);
        tandaiCetak(s);
    }

    // ========== STOK (Leader) ==========
    async function loadStok() {
        const [a, b] = await Promise.all([
            supabase.from('stok_saat_ini').select('*').order('jenis_kertas').order('size_kertas'),
            supabase.from('stok_mutasi').select('*').order('id', { ascending: false }).limit(200)
        ]);
        window._stokRows = a.data || [];
        renderStok();
        const rows = b.data || [], dibalik = new Set(rows.filter(m => m.membatalkan_id).map(m => m.membatalkan_id)), MAN = ['MASUK_AWAL', 'MASUK_PRODUKSI', 'KOREKSI_TAMBAH', 'KOREKSI_KURANG'];
        $('mutasiBody').innerHTML = rows.map(m => `<tr${dibalik.has(m.id) ? ' style="opacity:.5;text-decoration:line-through"' : ''}><td>${fmtWaktu(m.waktu)}</td><td>${esc(m.tipe)}</td><td>${esc(m.jenis_kertas)} ${esc(m.watermark)} ${esc(m.size_kertas)} ${m.gsm}gsm ${m.leaves}lv</td><td class="${m.qty > 0 ? 'good' : 'bad'}">${m.qty > 0 ? '+' : ''}${m.qty}</td><td>${esc(m.no_pi || '-')}</td><td>${esc(m.oleh || '-')}</td><td>${esc(m.catatan || '')}</td><td>${!m.permintaan_id && !m.membatalkan_id && !dibalik.has(m.id) && MAN.includes(m.tipe) ? `<button class="mini" style="background:#ef4444" data-bm="${m.id}">Batalkan</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8" style="text-align:center">Belum ada mutasi</td></tr>';
    }
    function renderStok() {
        const s = $('stSearch').value.trim().toLowerCase();
        const rows = (window._stokRows || []).filter(r => !s || `${r.jenis_kertas} ${r.size_kertas}`.toLowerCase().includes(s));
        $('stokBody').innerHTML = rows.map(r => `<tr><td>${esc(r.jenis_kertas)}</td><td>${esc(r.watermark)}</td><td>${esc(r.size_kertas)}</td><td>${r.gsm}</td><td>${r.leaves}</td><td style="font-weight:bold;text-align:center">${r.qty}</td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center">📭 Belum ada stok tercatat</td></tr>';
    }
    $('stSearch').addEventListener('input', renderStok);
    $('mutasiBody').addEventListener('click', async e => {
        const b = e.target.closest('button[data-bm]'); if (!b || !requireRole('leader')) return;
        const d = await dialog({ title: '↩ Batalkan catatan stok', info: `Mutasi #${b.dataset.bm} akan dibalik dengan catatan koreksi (riwayat tetap tersimpan).`, note: { label: 'Alasan pembatalan', required: true }, ok: 'Batalkan' });
        if (!d) return;
        if (await rpc('balik_mutasi', { p_id: Number(b.dataset.bm), p_alasan: d.note, p_oleh: user.nama })) loadStok();
    });
    $('stPiItem').addEventListener('change', () => {
        const i = piItems.find(x => x.id === Number($('stPiItem').value)); if (!i) return;
        $('stJenis').value = i.jenis_kertas; $('stWm').value = i.watermark; $('stSize').value = i.size_kertas; $('stGsm').value = i.gsm; $('stLeaves').value = i.leaves;
    });
    $('stSimpanBtn').onclick = async () => {
        if (!requireRole('leader')) return;
        const qty = parseInt($('stQty').value);
        if (!(qty > 0)) { alert('Qty harus lebih dari 0'); return; }
        const tipe = $('stTipe').value, cat = $('stCatatan').value.trim();
        if (tipe.startsWith('KOREKSI') && !cat) { alert('Koreksi wajib disertai alasan'); return; }
        if (!confirm(`Simpan mutasi stok?\n${tipe}\n${$('stJenis').value} · ${$('stWm').value} · ${$('stSize').value} · ${$('stGsm').value}gsm · ${$('stLeaves').value}lv\nQty: ${qty}`)) return;
        const ok = await rpc('mutasi_stok_manual', { p_tipe: tipe, p_size: $('stSize').value, p_gsm: parseInt($('stGsm').value), p_leaves: parseInt($('stLeaves').value), p_jenis: $('stJenis').value, p_wm: $('stWm').value, p_qty: qty, p_catatan: cat, p_oleh: user.nama });
        if (ok) { $('stQty').value = ''; $('stCatatan').value = ''; loadStok(); }
    };

    // ========== MASTER ==========
    function fillMpPilih() {
        const el = $('mpPilih'); if (!el) return;
        const prev = el.value;
        el.innerHTML = '<option value="">➕ PI baru (ketik nomor)</option>' + piList.slice().sort((a, b) => a.no_pi.localeCompare(b.no_pi, undefined, { numeric: true })).map(p => `<option value="${p.id}">${esc(p.no_pi)} · ${esc(p.brand)}</option>`).join('');
        if (piList.some(p => String(p.id) === prev)) el.value = prev;
        if (el.value !== prev || !el.dataset.init) { el.dataset.init = '1'; onMpPilih(); }
    }
    function onMpPilih() {
        const p = piList.find(x => String(x.id) === $('mpPilih').value);
        $('mpNoWrap').style.display = p ? 'none' : 'block';
        if (p) {
            $('mpBrand').value = p.brand === '-' ? '' : p.brand; $('mpBrand').readOnly = p.brand !== '-';
            $('mpTgl').value = p.tgl_pi || ''; $('mpTgl').disabled = !!p.tgl_pi;
        } else { $('mpBrand').readOnly = false; $('mpTgl').disabled = false; }
    }
    $('mpPilih').addEventListener('change', () => { onMpPilih(); if (!$('mpPilih').value) { $('mpBrand').value = ''; $('mpTgl').value = ''; } });
    $('mpNo').addEventListener('input', () => {
        const hh = $('mpHint'), v = $('mpNo').value.trim();
        const sim = v && piList.find(p => canon(p.no_pi) === canon(v));
        if (sim) { hh.className = 'hint bad'; hh.textContent = `❌ Sudah ada: ${sim.no_pi} (${sim.brand}). Pilih dari dropdown di atas.`; }
        else { hh.className = 'hint'; hh.textContent = v ? 'PI baru' : ''; }
    });
    function itemSelesai(i) { return !!piTutup[i.id] || ((i.qty_pi - (piStatus[i.id] || 0)) <= 0 && !(piAktif[i.id] > 0)); }
    function renderMaster() {
        fillMpPilih();
        const s = $('mpSearch').value.trim().toLowerCase(), f = $('mpFilter').value || 'AKTIF';
        const out = [];
        piList.forEach(p => {
            if (s && !`${p.no_pi} ${p.brand}`.toLowerCase().includes(s)) return;
            const its = piItems.filter(i => i.pi_id === p.id);
            const selesai = its.length > 0 && its.every(itemSelesai);
            if (f === 'AKTIF' && selesai) return;
            if (f === 'SELESAI' && !selesai) return;
            const tgl = p.tgl_pi ? p.tgl_pi.split('-').reverse().join('/') : '-';
            const itHtml = its.map(i => {
                const dm = piStatus[i.id] || 0, sisa = i.qty_pi - dm, sel = itemSelesai(i);
                const st = piTutup[i.id] ? '<span class="bad">⛔ Ditutup</span>' : sel ? '<span class="good">✅ Selesai</span>' : sisa <= 0 ? '<span class="warn">⏳ Diproses</span>' : '<span class="warn">Belum semua diminta</span>';
                return `<div class="it"><div>🧻 <b>${esc(i.jenis_kertas)}</b> · 💧 ${esc(i.watermark)} · 📏 ${esc(i.size_kertas)} · ${i.gsm}gsm · ${i.leaves}lv</div>
                    <div class="nums"><span>Qty PI <b>${i.qty_pi}</b></span><span>Diminta <b>${dm}</b></span><span class="${sisa < 0 ? 'bad' : ''}">Sisa <b>${sisa}</b></span><span>${st}</span></div>
                    <div class="acts"><button class="mini" style="background:#f59e0b" data-act="edititem" data-id="${i.id}">✏️ Edit item</button>
                    ${piTutup[i.id] ? `<button class="mini" style="background:#10b981" data-act="buka" data-id="${i.id}">▶ Buka lagi</button>` : `<button class="mini" style="background:#64748b" data-act="tutup" data-id="${i.id}">⛔ Tutup (selesai)</button>`}
                    <button class="mini" style="background:#ef4444" data-act="hapusitem" data-id="${i.id}">🗑️ Hapus</button></div></div>`;
            }).join('') || '<div class="it" style="color:#b45309">Belum ada rincian kertas</div>';
            out.push(`<div class="pigroup${selesai ? ' selesai' : ''}"><div class="ph"><div><b>${esc(p.no_pi)}</b> · ${esc(p.brand)} · 📅 ${tgl}</div>
                <div class="acts"><button class="mini" style="background:#f59e0b" data-act="editpi" data-id="${p.id}">✏️ Edit PI</button><button class="mini" style="background:#ef4444" data-act="hapuspi" data-id="${p.id}">🗑️</button></div></div>${itHtml}</div>`);
        });
        $('mpList').innerHTML = out.join('') || '<div style="text-align:center;padding:16px;color:#64748b;">📭 Tidak ada PI</div>';
        $('mjList').innerHTML = jenisList.map(j => `<span class="chip">${esc(j.nama)}</span>`).join('');
        $('mwList').innerHTML = wmList.map(j => `<span class="chip">${esc(j.nama)}</span>`).join('');
        $('cbBody').innerHTML = customBerat.map(c => `<tr><td>${esc(c.size_kertas)}</td><td>${c.gsm}</td><td>${c.leaves}</td><td>${esc(c.jenis_kertas || 'Semua')}</td><td>${c.gram_per_bundle}</td><td><button class="btn-hapus-small" data-id="${c.id}">🗑️</button></td></tr>`).join('') || '<tr><td colspan="6" style="text-align:center">Belum ada spesifikasi tambahan</td></tr>';
    }
    $('mpSearch').addEventListener('input', renderMaster);
    $('mpFilter').addEventListener('change', renderMaster);

    $('mpSimpanBtn').onclick = async () => {
        const pSel = piList.find(x => String(x.id) === $('mpPilih').value);
        const no = pSel ? pSel.no_pi : normPI($('mpNo').value), br = $('mpBrand').value.trim().toUpperCase();
        const tgl = $('mpTgl').value, qty = parseInt($('mpQty').value);
        const jenis = $('mpJenis').value, size = $('mpSize').value, gsm = parseInt($('mpGsm').value), leaves = parseInt($('mpLeaves').value);
        if (!no) { alert('Pilih PI atau isi No. PI baru'); return; }
        if (!br) { alert('Brand wajib diisi'); return; }
        if (!tgl) { alert('Tanggal PI turun wajib diisi'); return; }
        if (!(qty > 0)) { alert('Qty PI harus lebih dari 0'); return; }
        if (!pSel) {
            const sim = piList.find(p => canon(p.no_pi) === canon(no));
            if (sim) { alert(`❌ No. PI sudah ada: ${sim.no_pi} (${sim.brand}). Pilih dari dropdown.`); return; }
        }
        if (!beratBundleKG(size, gsm, leaves, jenis) &&
            !confirm('⚠️ Berat bundle spesifikasi ini belum terdaftar (belum bisa ditimbang). Tambahkan nanti di bagian Spesifikasi di bawah.\nTetap simpan?')) return;
        if (!confirm(`Simpan?\nNo. PI: ${no} | Brand: ${br} | Tgl PI: ${tgl.split('-').reverse().join('/')}\n${jenis} · ${$('mpWm').value} · ${size} · ${gsm}gsm · ${leaves}lv\nQty PI: ${qty} bundle\n\n(Salah input? Bisa diperbaiki lewat tombol ✏️ Edit.)`)) return;
        const { error } = await supabase.rpc('simpan_pi_item', { p_no: no, p_brand: br, p_tgl: tgl, p_jenis: jenis, p_wm: $('mpWm').value, p_size: size, p_gsm: gsm, p_leaves: leaves, p_qty: qty, p_oleh: user.nama });
        if (error) { alert(error.code === '23505' ? '❌ Item kertas yang sama sudah ada di PI ini.' : '❌ ' + error.message); await loadMasterData(); return; }
        $('mpQty').value = ''; $('mpNo').value = '';
        await loadMasterData();
        const baru = piList.find(p => p.no_pi === no); if (baru) { $('mpPilih').value = baru.id; onMpPilih(); }
        alert('✅ Tersimpan. Untuk item kertas lain di PI yang sama, ganti jenis/size/GSM/leaves/qty lalu simpan lagi.');
    };

    // ----- Edit / hapus / tutup PI -----
    let editPiId = null, editItemId = null;
    async function adaPakai(tabel, kolom, nilai) {
        try { const r = await supabase.from(tabel).select('id').eq(kolom, nilai).limit(1); return !!(r.data && r.data.length); } catch (e) { return false; }
    }
    $('mpList').addEventListener('click', async e => {
        const b = e.target.closest('button[data-act]'); if (!b) return;
        const id = parseInt(b.dataset.id), act = b.dataset.act;
        if (act === 'editpi') {
            const p = piList.find(x => x.id === id); if (!p) return;
            editPiId = id;
            $('epNo').value = p.no_pi; $('epBrand').value = p.brand === '-' ? '' : p.brand; $('epTgl').value = p.tgl_pi || '';
            const dipakai = (await adaPakai('permintaan', 'no_pi', p.no_pi)) || (await adaPakai('riwayat_timbang', 'no_po', p.no_pi));
            const kunciBrand = dipakai && p.brand !== '-';
            $('epNo').disabled = dipakai; $('epBrand').disabled = kunciBrand;
            $('epInfo').textContent = dipakai ? '🔒 No. PI & brand terkunci karena PI ini sudah dipakai di permintaan/timbangan. Tanggal masih bisa diubah.' : 'PI ini belum dipakai, semua kolom bisa diubah.';
            $('epModal').style.display = 'flex';
        } else if (act === 'edititem') {
            const i = piItems.find(x => x.id === id); if (!i) return;
            editItemId = id;
            $('eiJenis').value = i.jenis_kertas; $('eiWm').value = i.watermark; $('eiSize').value = i.size_kertas; $('eiGsm').value = i.gsm; $('eiLeaves').value = i.leaves; $('eiQty').value = i.qty_pi;
            const pakai = await adaPakai('permintaan', 'pi_item_id', id);
            ['eiJenis', 'eiWm', 'eiSize', 'eiGsm', 'eiLeaves'].forEach(x => $(x).disabled = pakai);
            $('eiInfo').textContent = pakai ? `🔒 Jenis/WM/size/GSM/leaves terkunci karena item ini sudah pernah diminta. Qty PI masih bisa diubah (tidak boleh di bawah yang sudah diminta: ${piStatus[id] || 0}).` : 'Item belum pernah diminta, semua kolom bisa diubah.';
            $('eiModal').style.display = 'flex';
        } else if (act === 'hapusitem') {
            const i = piItems.find(x => x.id === id); if (!i) return;
            if (!confirm(`Hapus item ini?\n${i.jenis_kertas} · ${i.watermark} · ${i.size_kertas} · ${i.gsm}gsm · ${i.leaves}lv · qty ${i.qty_pi}\n\nHanya bisa jika belum pernah diminta.`)) return;
            if (await rpc('hapus_pi_item', { p_id: id, p_oleh: user.nama })) await loadMasterData();
        } else if (act === 'hapuspi') {
            const p = piList.find(x => x.id === id); if (!p) return;
            if (!requireRole('admin')) return;
            const pv = await supabase.rpc('pratinjau_hapus_pi', { p_pi_id: id });
            if (pv.error) { alert('❌ ' + pv.error.message); return; }
            const c = pv.data || {};
            const dipakai = (c.permintaan || 0) + (c.timbangan || 0) + (c.nota || 0) + (c.mutasi_stok || 0) > 0;
            const info = `<b>Hapus PI ${esc(p.no_pi)} (${esc(p.brand)})?</b><br>Yang ikut terhapus PERMANEN:<br>• ${c.item || 0} item kertas<br>• ${c.permintaan || 0} permintaan<br>• ${c.timbangan || 0} data timbangan milik permintaan itu<br>• ${c.nota || 0} nota serah terima<br>• ${c.mutasi_stok || 0} catatan stok milik permintaan itu (stok kembali seperti sebelum PI ini)`
                + (c.timbangan_lama > 0 ? `<br><b class="warn">ℹ️ ${c.timbangan_lama} data timbang lama (tanpa permintaan) dengan No. PI sama TIDAK ikut dihapus.</b>` : '')
                + (dipakai ? '<br><b class="bad">⚠️ Gunakan hanya untuk data uji coba. Tidak bisa dibatalkan.</b>' : '');
            const d = await dialog({ title: '🗑️ Hapus PI', info, note: dipakai ? { label: `Ketik No. PI "${p.no_pi}" untuk konfirmasi`, required: true } : null, ok: 'Hapus' });
            if (!d) return;
            const { error } = await supabase.rpc('hapus_pi_beserta_data', { p_pi_id: id, p_konfirmasi: dipakai ? d.note : p.no_pi, p_oleh: user.nama });
            if (error) { alert('❌ ' + error.message); return; }
            await loadMasterData(); await loadPermintaan();
            alert('✅ PI dan data terkait sudah dihapus.');
        } else if (act === 'tutup') {
            const i = piItems.find(x => x.id === id); if (!i) return;
            if (!confirm(`Tutup item ini (dianggap SELESAI)?\n${i.jenis_kertas} · ${i.size_kertas} · ${i.gsm}gsm · ${i.leaves}lv\nItem hilang dari dropdown permintaan. Bisa dibuka lagi.`)) return;
            if (await rpc('tutup_pi_item', { p_id: id, p_oleh: user.nama })) await loadMasterData();
        } else if (act === 'buka') {
            if (await rpc('buka_pi_item', { p_id: id, p_oleh: user.nama })) await loadMasterData();
        }
    });
    $('epBatalBtn').onclick = () => { $('epModal').style.display = 'none'; };
    $('eiBatalBtn').onclick = () => { $('eiModal').style.display = 'none'; };
    $('epSimpanBtn').onclick = async () => {
        const no = normPI($('epNo').value), br = $('epBrand').value.trim().toUpperCase();
        if (!no || !br) { alert('No. PI dan Brand wajib diisi'); return; }
        if (await rpc('edit_pi', { p_pi_id: editPiId, p_no: no, p_brand: br, p_tgl: $('epTgl').value || null, p_oleh: user.nama })) { $('epModal').style.display = 'none'; await loadMasterData(); }
    };
    $('eiSimpanBtn').onclick = async () => {
        const qty = parseInt($('eiQty').value);
        if (!(qty > 0)) { alert('Qty PI harus lebih dari 0'); return; }
        if (await rpc('edit_pi_item', { p_id: editItemId, p_jenis: $('eiJenis').value, p_wm: $('eiWm').value, p_size: $('eiSize').value, p_gsm: parseInt($('eiGsm').value), p_leaves: parseInt($('eiLeaves').value), p_qty: qty, p_oleh: user.nama })) { $('eiModal').style.display = 'none'; await loadMasterData(); }
    };

    $('mpImporBtn').onclick = async () => {
        if (!requireRole('admin')) return;
        const { data, error } = await fetchAll(() => supabase.from('riwayat_timbang').select('no_po,brand').order('id'));
        if (error) { alert('❌ ' + error.message); return; }
        const seen = new Set(piList.map(p => canon(p.no_pi))), baru = [];
        (data || []).forEach(d => {
            const no = normPI(d.no_po || ''); if (!no || no === '-') return;
            const c = canon(no); if (seen.has(c)) return;
            seen.add(c); baru.push({ no_pi: no, brand: (d.brand || '-').trim().toUpperCase(), dibuat_oleh: 'IMPOR RIWAYAT' });
        });
        if (!baru.length) { alert('Tidak ada PI baru untuk diimpor.'); return; }
        if (!confirm(`Impor ${baru.length} No. PI dari riwayat timbang lama?`)) return;
        const { error: e2 } = await supabase.from('master_pi').insert(baru);
        if (e2) { alert('❌ ' + e2.message); return; }
        catatLog('IMPOR_PI', `${baru.length} PI diimpor dari riwayat`);
        await loadMasterData();
        alert(`✅ ${baru.length} PI diimpor`);
    };
    $('mjSimpanBtn').onclick = async () => {
        const nm = $('mjNama').value.trim();
        if (!nm) { alert('Isi nama jenis kertas'); return; }
        if (jenisList.some(j => j.nama.trim().toUpperCase() === nm.toUpperCase())) { alert('Jenis kertas sudah ada'); return; }
        const { error } = await supabase.from('jenis_kertas').insert([{ nama: nm, dibuat_oleh: user.nama }]);
        if (error) { alert('❌ ' + error.message); return; }
        catatLog('TAMBAH_JENIS', nm);
        $('mjNama').value = '';
        await loadMasterData();
    };
    $('mwSimpanBtn').onclick = async () => {
        const nm = $('mwNama').value.trim();
        if (!nm) { alert('Isi nama watermark'); return; }
        if (wmList.some(j => j.nama.trim().toUpperCase() === nm.toUpperCase())) { alert('Watermark sudah ada'); return; }
        const { error } = await supabase.from('watermark').insert([{ nama: nm, dibuat_oleh: user.nama }]);
        if (error) { alert('❌ ' + error.message); return; }
        catatLog('TAMBAH_WATERMARK', nm);
        $('mwNama').value = '';
        await loadMasterData();
    };
    $('cbSimpanBtn').onclick = async () => {
        const rec = { size_kertas: $('cbSize').value.trim().toUpperCase(), gsm: parseInt($('cbGsm').value), leaves: parseInt($('cbLeaves').value), jenis_kertas: $('cbJenis').value || null, gram_per_bundle: parseFloat($('cbGram').value), dibuat_oleh: user.nama };
        if (!rec.size_kertas || !(rec.gsm > 0) || !(rec.leaves > 0) || !(rec.gram_per_bundle > 0)) { alert('Lengkapi size, GSM, leaves, dan berat (gram)'); return; }
        const bawaan = beratBundleDB[`${rec.size_kertas}|${rec.gsm}|${rec.leaves}`];
        if (bawaan && !confirm(`Spesifikasi ini sudah ada di data bawaan (${bawaan} gram). Data tambahan akan dipakai lebih dulu. Lanjut?`)) return;
        const { error } = await supabase.from('berat_bundle_custom').insert([rec]);
        if (error) { alert(error.code === '23505' ? '❌ Spesifikasi yang sama sudah ada. Hapus dulu yang lama.' : '❌ ' + error.message); return; }
        catatLog('TAMBAH_SPESIFIKASI', `${rec.size_kertas} ${rec.gsm}gsm ${rec.leaves}lv ${rec.jenis_kertas || 'semua'} = ${rec.gram_per_bundle} g`);
        ['cbSize', 'cbGsm', 'cbLeaves', 'cbGram'].forEach(i => $(i).value = '');
        await loadMasterData();
    };
    $('cbBody').addEventListener('click', async e => {
        const b = e.target.closest('button[data-id]'); if (!b) return;
        const id = parseInt(b.dataset.id), c = customBerat.find(x => x.id === id);
        if (!c || !confirm(`Hapus spesifikasi ${c.size_kertas} ${c.gsm}gsm ${c.leaves}lv (${c.gram_per_bundle} g)?\nPerhitungan timbang berikutnya tidak lagi memakai ini.`)) return;
        const { error } = await supabase.from('berat_bundle_custom').delete().eq('id', id);
        if (error) { alert('❌ ' + error.message); return; }
        catatLog('HAPUS_SPESIFIKASI', `${c.size_kertas} ${c.gsm}gsm ${c.leaves}lv ${c.gram_per_bundle} g`);
        await loadMasterData();
    });

    // ========== LOG ==========
    async function loadLog() {
        const { data } = await supabase.from('log_aktivitas_timbang').select('*').order('id', { ascending: false }).limit(200);
        window._logRows = data || [];
        renderLog();
    }
    function renderLog() {
        const s = $('logSearch').value.trim().toLowerCase();
        $('logBody').innerHTML = (window._logRows || []).filter(l => !s || `${l.pengguna} ${l.aksi} ${l.detail}`.toLowerCase().includes(s)).map(l => `<tr><td>${fmtWaktu(l.waktu)}</td><td>${esc(l.pengguna)}${l.role ? ' (' + esc(l.role) + ')' : ''}</td><td>${esc(l.aksi)}</td><td>${esc(l.detail || '')}</td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center">Belum ada log</td></tr>';
    }
    $('logSearch').addEventListener('input', renderLog);

    // ========== MODAL: klik di luar ==========
    window.onclick = e => {
        if (e.target === $('editModal')) $('editModal').style.display = 'none';
        if (e.target === cetakModal) cetakModal.style.display = 'none';
        if (e.target === cetakBarcodeModal) cetakBarcodeModal.style.display = 'none';
    };

    // ========== HITUNG ESTIMASI (Leader) ==========
    let lcSampel = [];
    function lcPmAktif() { return pmData.find(x => String(x.id) === $('lcPm').value); }
    function lcSimpanLokal() { try { const r = lcPmAktif(); if (r) localStorage.setItem('lc_' + r.id, JSON.stringify(lcSampel)); } catch (e) {} }
    function lcMuatLokal() { lcSampel = []; try { const r = lcPmAktif(); if (r) lcSampel = JSON.parse(localStorage.getItem('lc_' + r.id) || '[]'); } catch (e) {} }
    function fillLcPm() {
        const el = $('lcPm'); if (!el) return; const prev = el.value;
        const ls = pmData.filter(r => ['Diminta', 'Diproses', 'Produksi'].includes(r.status));
        el.innerHTML = '<option value="">— isi spesifikasi manual —</option>' + ls.map(r => `<option value="${r.id}">#${r.id} · ${esc(r.no_pi)} · ${esc(r.brand)} · ${esc(r.size_kertas)} · ${r.gsm}gsm · ${r.qty_minta}</option>`).join('');
        if (ls.some(r => String(r.id) === prev)) el.value = prev;
    }
    $('lcPm').addEventListener('change', () => {
        const r = lcPmAktif();
        if (r) { $('lcJenis').value = r.jenis_kertas; $('lcWm').value = r.watermark; $('lcSize').value = r.size_kertas; $('lcGsm').value = r.gsm; $('lcLeaves').value = r.leaves; $('lcTarget').value = r.qty_minta; }
        ['lcJenis', 'lcWm', 'lcSize', 'lcGsm', 'lcLeaves'].forEach(x => $(x).disabled = !!r);
        lcMuatLokal(); lcRender();
    });
    function lcBundles(berat) {
        const bersih = berat - beratBoxMap[$('lcBox').value] - (parseInt($('lcLayer').value) || 0) * BERAT_LAYER_KG;
        if (bersih <= 0) return { err: 'Berat bersih negatif, periksa berat/jenis box/layer' };
        const bb = beratBundleKG($('lcSize').value, $('lcGsm').value, $('lcLeaves').value, $('lcJenis').value);
        if (!bb) return { err: 'Berat bundle spesifikasi ini belum terdaftar (minta Admin menambah di Master > Spesifikasi)' };
        return { n: Math.ceil(Math.round(bersih / bb * 1e6) / 1e6) };
    }
    function lcRender() {
        const n = lcSampel.length, tot = lcSampel.reduce((a, x) => a + x.b, 0), avg = n ? tot / n : 0, target = parseInt($('lcTarget').value) || 0;
        const box = avg > 0 && target > 0 ? Math.ceil(target / avg) : 0;
        $('lcHasil').style.display = n ? 'block' : 'none';
        $('lcHasil').innerHTML = n ? `<div>Rata-rata <span class="big">${Math.round(avg).toLocaleString('id-ID')}</span> bundle/box <span style="color:#64748b">(dari ${n} box contoh${n > 1 ? `, terendah ${Math.min(...lcSampel.map(x => x.b))}, tertinggi ${Math.max(...lcSampel.map(x => x.b))}` : ''})</span></div>${box ? `<div style="margin-top:6px;">🎯 Untuk target ${target.toLocaleString('id-ID')} bundle ≈ <span class="big">${box}</span> box</div>` : ''}<div style="font-size:.75rem;color:#64748b;margin-top:4px;">Makin banyak box contoh, makin akurat. Isi box tiap mesin bisa berbeda, jadi ambil contoh dari beberapa box.</div>` : '';
        $('lcRows').innerHTML = lcSampel.map((x, i) => `<tr><td>${i + 1}</td><td>${Number(x.kg).toFixed(2)}</td><td><b>${x.b}</b></td></tr>`).join('') || '<tr><td colspan="3" style="text-align:center">Belum ada box contoh</td></tr>';
    }
    $('lcTarget').addEventListener('input', lcRender);
    $('lcTambahBtn').onclick = () => {
        const kg = parseFloat($('lcBerat').value);
        if (!(kg > 0)) { alert('Isi berat box contoh'); return; }
        const r = lcBundles(kg); if (r.err) { alert('❌ ' + r.err); return; }
        lcSampel.push({ kg, b: r.n }); lcSimpanLokal(); $('lcBerat').value = ''; $('lcBerat').focus(); lcRender();
    };
    $('lcUndoBtn').onclick = () => { lcSampel.pop(); lcSimpanLokal(); lcRender(); };
    $('lcResetBtn').onclick = () => { if (lcSampel.length && !confirm('Kosongkan semua box contoh?')) return; lcSampel = []; lcSimpanLokal(); lcRender(); };
    $('lcPakaiBtn').onclick = () => {
        const r = lcPmAktif(); if (!r) { alert('Pilih dulu permintaannya di bagian atas.'); return; }
        if (!lcSampel.length) { alert('Tambahkan minimal 1 box contoh.'); return; }
        const avg = Math.round(lcSampel.reduce((a, x) => a + x.b, 0) / lcSampel.length), box = Math.ceil(r.qty_minta / avg);
        try { localStorage.setItem('est_' + r.id, JSON.stringify({ avg, box })); } catch (e) {}
        alert(`✅ Tersimpan: ±${avg} bundle/box, ±${box} box untuk #${r.id}.\nSaat menekan "Siapkan dari stok" / "Hasil produksi", angka ini terisi otomatis (masih bisa diubah).`);
    };
    function estTersimpan(id) { try { return JSON.parse(localStorage.getItem('est_' + id) || 'null'); } catch (e) { return null; } }

    // ========== NOTIFIKASI ==========
    let notifSeen = null, notifRows = [], notifTimer = null, audioCtx = null, polling = false;
    function beep() {
        try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.frequency.value = 880; g.gain.value = 0.15; o.start(); o.stop(audioCtx.currentTime + 0.2); } catch (e) {}
        try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
    }
    function showToast(n) {
        const d = document.createElement('div'); d.className = 'toast';
        d.innerHTML = `<b>${esc(n.judul)}</b>${esc(n.isi || '')}`;
        d.onclick = () => { d.remove(); gotoNotif(n); };
        $('toastBox').appendChild(d);
        setTimeout(() => d.remove(), 8000);
        try { if ('Notification' in window && Notification.permission === 'granted') new Notification(n.judul, { body: n.isi || '' }); } catch (e) {}
    }
    function gotoNotif(n) {
        $('notifModal').style.display = 'none';
        if (n.tab && tabAllowed(n.tab)) showPage(n.tab);
    }
    function renderNotif() {
        $('notifList').innerHTML = notifRows.length ? notifRows.map((n, i) => `<div class="nitem${n.baru ? ' baru' : ''}" data-i="${i}"><div class="t">${n.baru ? '🔵 ' : ''}${esc(n.judul)}</div><div>${esc(n.isi || '')}</div><div class="w">${fmtWaktu(n.waktu)}</div></div>`).join('') : '<div style="text-align:center;padding:14px;color:#64748b">Belum ada notifikasi</div>';
        const izin = ('Notification' in window) ? Notification.permission : 'tidak-didukung';
        $('notifIzin').textContent = izin === 'granted' ? '✅ Notifikasi browser aktif. Catatan: pemberitahuan hanya muncul saat aplikasi masih terbuka (belum bisa muncul saat aplikasi ditutup).' : 'Notifikasi muncul di layar & berbunyi saat aplikasi terbuka. Agar juga muncul sebagai pemberitahuan HP, aktifkan izin di bawah.';
        $('notifIzinBtn').style.display = izin === 'default' ? 'block' : 'none';
    }
    $('notifList').addEventListener('click', e => { const el = e.target.closest('.nitem'); if (el) gotoNotif(notifRows[Number(el.dataset.i)]); });
    $('notifIzinBtn').onclick = async () => { try { await Notification.requestPermission(); } catch (e) {} renderNotif(); };
    $('notifTutupBtn').onclick = () => { $('notifModal').style.display = 'none'; };
    $('bellBtn').onclick = async () => {
        renderNotif();
        $('notifModal').style.display = 'flex';
        const maks = Math.max(0, ...notifRows.map(n => n.id));
        if (notifRows.some(n => n.baru)) { await supabase.rpc('notif_tandai_baca', { p_nama: user.nama, p_id: maks }); $('bellBadge').style.display = 'none'; }
    };
    function refreshActive() {
        if (!user || $('dlgModal').style.display === 'flex') return;
        const act = document.querySelector('.page.active-page'); if (!act) return;
        if (act.id === 'page1') loadPermintaanOptions();
        else if (act.id === 'page3' || act.id === 'page4') { loadMasterData(); loadPermintaan(); }
        else if (act.id === 'page5') { loadStok(); loadMasterData(); }
        else if (act.id === 'page6') loadMasterData();
        else if (act.id === 'page8') loadSerahTerima();
    }
    async function updateTabBadges() {
        const [a, b] = await Promise.all([
            supabase.from('permintaan').select('id,status').in('status', AKTIF),
            supabase.from('serah_terima').select('permintaan_id,status,admin_setuju_oleh,leader_setuju_oleh').in('status', ['Menunggu', 'Disepakati'])
        ]);
        if (a.error || b.error) return;
        const dgNota = new Set((b.data || []).map(s => s.permintaan_id));
        const c = st => (a.data || []).filter(r => st.includes(r.status) && !(st.includes('Siap') && dgNota.has(r.id))).length;
        const nota = (b.data || []).filter(s => s.status === 'Menunggu' && !(user.role === 'admin' ? s.admin_setuju_oleh : s.leader_setuju_oleh)).length;
        const m = user.role === 'admin' ? { page1: c(['Siap']), page8: nota } : { page4: c(['Diminta', 'Diproses', 'Produksi']), page8: nota };
        document.querySelectorAll('#sbMenu .sbi').forEach(t => {
            const n = m[t.dataset.page] || 0;
            let c = t.querySelector('.cnt');
            if (!n) { if (c) c.remove(); return; }
            if (!c) { c = document.createElement('span'); c.className = 'cnt'; t.appendChild(c); }
            c.textContent = n;
        });
    }
    async function pollNotif() {
        if (!user || polling) return;
        polling = true;
        try {
            const { data, error } = await supabase.rpc('notif_daftar', { p_nama: user.nama, p_limit: 30 });
            if (error) return;
            notifRows = data || [];
            const nBaru = notifRows.filter(n => n.baru).length;
            $('bellBadge').textContent = nBaru; $('bellBadge').style.display = nBaru ? 'inline-block' : 'none';
            const maks = Math.max(0, ...notifRows.map(n => n.id));
            if (notifSeen === null) {
                notifSeen = maks;
                if (nBaru) { showToast({ judul: `🔔 ${nBaru} notifikasi belum dibaca`, isi: 'Ketuk 🔔 untuk melihat.', tab: null }); beep(); }
            } else if (maks > notifSeen) {
                const fresh = notifRows.filter(n => n.id > notifSeen).reverse();
                notifSeen = maks;
                fresh.slice(-3).forEach(showToast);
                beep();
                refreshActive();
            }
            if ($('notifModal').style.display === 'flex') renderNotif();
            await updateTabBadges();
        } finally { polling = false; }
    }
    function startNotif() {
        notifSeen = null; clearInterval(notifTimer);
        pollNotif(); notifTimer = setInterval(pollNotif, 10000);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) pollNotif(); });

    // ========== REFRESH OTOMATIS (agar Leader & Admin saling melihat data terbaru) ==========
    setInterval(() => { if (!user || document.hidden) return; refreshActive(); }, 15000);

    // ========== MULAI ==========
    (async function init() {
        refreshSelects();
        try { user = JSON.parse(sessionStorage.getItem('rp_user') || 'null'); } catch (e) { user = null; }
        if (user && user.nama && TABS[user.role]) { await startApp(); return; }
        user = null;
        if (window.GP_KEY_OK) {
            try {
                const { data } = await window.sbG.auth.getSession();
                if (data && data.session) { user = await resolveGp(data.session.user); await startApp(); return; }
            } catch (e) { user = null; }
        }
        await initLogin();
    })();
})();
