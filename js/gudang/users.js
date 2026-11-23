/* Modul Gudang: users */
(function(){
const sb = window.sbG, GP = window.GP;
const NS = GP.mods.users = {};
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const OPTS = [['admin','Admin'],['leader_mesin','Leader Mesin'],['leader_qc','Leader QC'],['leader_produksi','Leader Produksi']];
let rows = [];
function norm(r){ r = String(r || '').toLowerCase(); if (r === 'admin') return 'admin'; if (r.includes('qc')) return 'leader_qc'; if (r.includes('mesin')) return 'leader_mesin'; return 'leader_produksi'; }
NS.mount = async function(host){
  if (!GP.me || !GP.me.admin) { host.innerHTML = '<div class="gm-usr"><div class="card">⛔ Hanya Admin.</div></div>'; return; }
  host.innerHTML = '<div class="gm-usr"><div class="card"><div class="card-title">👥 Pengaturan Akun & Role</div>' +
    '<div style="font-size:13px;color:#475569;margin-bottom:10px">Daftarkan akun dan tentukan rolenya di sini. Jika pendaftaran baru dimatikan di Supabase (disarankan), buat dulu akunnya di Supabase → Authentication → Users → Add user (centang Auto Confirm), lalu isi email + role di sini <b>tanpa password</b>. Perubahan role berlaku saat pengguna login ulang.</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:end"><div style="flex:2;min-width:180px"><label>Email akun baru</label><input id="usrEmail" type="email" placeholder="email@perusahaan.com" autocomplete="off"></div>' +
    '<div style="flex:1;min-width:140px"><label>Password (kosong jika akun sudah dibuat di Supabase)</label><input id="usrPass" type="text" placeholder="opsional" autocomplete="off"></div>' +
    '<div style="flex:1;min-width:150px"><label>Role</label><select id="usrRole">' + OPTS.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('') + '</select></div>' +
    '<button class="btn-primary" id="usrAdd">➕ Daftarkan</button></div><div id="usrMsg" style="margin-top:8px;font-size:13px"></div></div>' +
    '<div class="card"><div class="card-title">Daftar Akun</div><div id="usrList" style="overflow-x:auto"></div></div></div>';
  document.getElementById('usrAdd').onclick = add;
  await load();
};
async function load(){
  const el = document.getElementById('usrList');
  const { data, error } = await sb.from('user_profiles').select('*').order('email');
  if (error) { el.innerHTML = '<div style="color:#b91c1c">❌ ' + esc(error.message) + '</div>'; return; }
  rows = data || [];
  el.innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="text-align:left;border-bottom:2px solid #e2e8f0"><th style="padding:6px">Email</th><th>Role di database</th><th>Role aplikasi</th><th>Aksi</th></tr></thead><tbody>' +
    rows.map((r, i) => `<tr style="border-bottom:1px solid #f1f5f9"><td style="padding:6px">${esc(r.email)}</td><td>${esc(r.role)}</td><td><select id="usrSel${i}">${OPTS.map(o => `<option value="${o[0]}"${norm(r.role) === o[0] ? ' selected' : ''}>${o[1]}</option>`).join('')}</select></td><td style="white-space:nowrap"><button onclick="GP.mods.users.simpan(${i})">💾 Simpan</button> <button onclick="GP.mods.users.hapus(${i})">🗑️</button></td></tr>`).join('') + '</tbody></table>' +
    (rows.length ? '' : '<div style="padding:10px;color:#64748b">Belum ada data.</div>');
}
function msg(t, ok){ const m = document.getElementById('usrMsg'); if (m) { m.style.color = ok ? '#15803d' : '#b91c1c'; m.textContent = t; } }
async function setRole(email, role){
  if (email.toLowerCase() === GP.me.email.toLowerCase() && role !== 'admin' && !confirm('Anda mengubah role akun Anda sendiri dari Admin. Lanjutkan?')) return false;
  const { data, error } = await sb.from('user_profiles').update({ role }).eq('email', email).select();
  if (error) { alert('❌ Gagal: ' + error.message + '\n\nJika ini soal izin (RLS) atau batasan role (check constraint), lihat catatan dari saya.'); return false; }
  if (!data || !data.length) { alert('❌ Tidak ada perubahan tersimpan (izin ditolak oleh database atau email tidak ditemukan).'); return false; }
  GP.log('ATUR ROLE', email + ' → ' + role);
  return true;
}
async function add(){
  const email = document.getElementById('usrEmail').value.trim(), pw = document.getElementById('usrPass').value, role = document.getElementById('usrRole').value;
  if (!/^\S+@\S+\.\S+$/.test(email)) { msg('Email tidak valid'); return; }
  if (pw && pw.length < 6) { msg('Password minimal 6 karakter'); return; }
  const btn = document.getElementById('usrAdd'); btn.disabled = true; msg('⏳ Memproses...', true);
  try {
    let baru = null, info = '';
    if (pw) {
      // klien terpisah agar sesi admin tidak tergantikan akun baru
      const tmp = window.supabase.createClient(window.GUDANG_URL, window.GUDANG_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'gp_tmp_signup' } });
      const { data, error } = await tmp.auth.signUp({ email, password: pw });
      if (error) {
        msg(/not allowed|disabled/i.test(error.message)
          ? '❌ Pendaftaran akun baru dimatikan di Supabase Gudang Pro (bagus untuk keamanan). Buat akunnya di Supabase → Authentication → Users → Add user (centang Auto Confirm), lalu isi email + role di sini tanpa password.'
          : '❌ ' + error.message);
        return;
      }
      const u = data && data.user;
      if (u && !(u.identities && u.identities.length === 0)) { baru = u; if (!data.session) info = ' Jika saat login muncul "Email belum dikonfirmasi", konfirmasi akunnya di Supabase (Authentication → Users) atau matikan "Confirm email".'; }
      else info = ' (email ini sudah terdaftar, hanya role yang diatur)';
    }
    let { error: e2 } = await sb.rpc('atur_role_akun', { p_email: email, p_role: role });
    if (e2 && baru && /atur_role_akun|function|schema cache/i.test(e2.message)) {
      ({ error: e2 } = await sb.from('user_profiles').insert([{ id: baru.id, email, role }]));
    }
    if (e2) {
      msg('❌ ' + e2.message + (/atur_role_akun|function|schema cache/i.test(e2.message) ? ' — jalankan file supabase_gudang_akun.sql di Supabase Gudang Pro.' : ''));
      return;
    }
    GP.log('ATUR AKUN', email + ' → ' + role);
    msg('✅ ' + email + ' terdaftar sebagai ' + role + '.' + info, true);
    document.getElementById('usrEmail').value = ''; document.getElementById('usrPass').value = '';
    await load();
  } catch (e) { msg('❌ ' + (e.message || e)); }
  finally { btn.disabled = false; }
}
NS.simpan = async function(i){
  const r = rows[i]; if (!r) return;
  if (await setRole(r.email, document.getElementById('usrSel' + i).value)) { msg('✅ Role ' + r.email + ' diperbarui', true); await load(); }
};
NS.hapus = async function(i){
  const r = rows[i]; if (!r) return;
  if (String(r.email).toLowerCase() === GP.me.email.toLowerCase()) { alert('Tidak bisa menghapus akun sendiri.'); return; }
  if (!confirm('Hapus pengaturan role untuk ' + r.email + '? (Akun login tidak ikut terhapus; ia akan menjadi Leader Produksi.)')) return;
  const { error } = await sb.from('user_profiles').delete().eq('email', r.email);
  if (error) { alert('❌ ' + error.message); return; }
  GP.log('HAPUS ROLE', r.email);
  await load();
};
})();
