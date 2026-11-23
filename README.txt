THE ROLLING PAPER - Timbangan Kertas + Gudang Pro (versi 9.27)

STRUKTUR FOLDER
  index.html            kerangka halaman (tampilan login, menu, wadah halaman)
  config.js             alamat & kunci Supabase Gudang Pro (ISI SEKALI, jangan ditimpa)
  css/app.css           gaya dasar Timbangan (login, kartu, tabel, form)
  css/layout.css        sidebar & wadah modul Gudang
  css/gudang/*.css      gaya tiap modul Gudang
  js/koneksi-gudang.js  koneksi ke Supabase Gudang Pro
  js/gudang/*.js        satu file per modul: qc, diecut, dash, perm, pi, masuk, ret, users, keluar, hasil
  js/cari-dropdown.js   dropdown dengan pencarian cepat
  js/timbangan.js       aplikasi Timbangan Kertas + penghubung ke modul Gudang
  assets/               gambar (logo, ikon)
  sql/                  skrip SQL (jalankan di Supabase yang disebut pada komentar di dalam file)
  index_satu_file.html  cadangan versi SATU FILE (pakai: ganti nama jadi index.html)

CARA MEMASANG DI GITHUB
  1. Ekstrak zip sampai selesai, lalu unggah ISI folder rolling-paper (index.html, css/, js/, assets/, config.js).
  2. config.js: kalau sudah berisi kunci Anda yang benar, jangan ditimpa.
  3. Folder sql/ tidak perlu diunggah ke GitHub; itu hanya untuk dijalankan di Supabase.

SETIAP ADA PEMBARUAN
  - Nomor versi ada di index.html (?v=9.27). Naikkan bila Anda mengubah file css/js,
    supaya browser tidak memakai file lama dari cache. Setelah mengunggah, refresh keras (Ctrl+F5).
  - Kalau muncul banner merah "File aplikasi tidak lengkap", ada folder css/js yang belum terunggah.
