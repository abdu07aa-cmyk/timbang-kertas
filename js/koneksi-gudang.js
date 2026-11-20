// ========== KONEKSI SUPABASE GUDANG PRO (login email + modul gudang) ==========
// URL & anon key diambil dari config.js (file terpisah, supaya tidak perlu diisi ulang tiap update index.html)
window.GUDANG_URL = window.GUDANG_URL || 'https://txvgclavcmhyxamxgvsi.supabase.co';
window.GP_KEY_OK = !!window.GUDANG_KEY && !/^ISI_/.test(window.GUDANG_KEY);
window.sbG = window.supabase.createClient(window.GUDANG_URL, window.GP_KEY_OK ? window.GUDANG_KEY : 'x.y.z', { auth: { persistSession: true, storageKey: 'gp_auth' } });
window.GP = { mods: {}, params: new URLSearchParams(), me: null, toast: function(m){ alert(m); }, log: function(){}, go: function(){} };
