-- Jalankan di SQL Editor project GUDANG PRO (txvgclavcmhyxamxgvsi)
create table if not exists return_produksi(
  id bigserial primary key,
  permintaan_id bigint,
  no_pi text, brand text, jenis text,
  tipe text,            -- NG / KURANG
  qty numeric,
  catatan text,
  status text default 'PENDING',   -- PENDING / DIPROSES / SELESAI / DITOLAK
  requested_by text,
  alasan_tolak text,
  processed_by text,
  processed_at timestamptz,
  created_at timestamptz default now()
);
alter table return_produksi enable row level security;
create policy "return_all_auth" on return_produksi for all to authenticated using (true) with check (true);
