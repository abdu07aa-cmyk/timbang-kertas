-- JALANKAN DI SUPABASE "GUDANG PRO" (project txvgclavcmhyxamxgvsi) -> SQL Editor
-- Serah terima hasil diecut: Leader Mesin -> (QC untuk filter tips) -> Admin Gudang (masuk stok)
create table if not exists public.serah_hasil (
  id bigserial primary key,
  no_dokumen text unique,
  pi_id bigint,
  no_pi text,
  brand text,
  status text default 'MENUNGGU_TERIMA',   -- MENUNGGU_QC / MENUNGGU_TERIMA / DITERIMA / DIBATALKAN
  mesin text,
  catatan text,
  diserahkan_oleh text,
  diserahkan_at timestamptz default now(),
  qc_oleh text,
  qc_at timestamptz,
  diterima_oleh text,
  diterima_at timestamptz
);
create table if not exists public.serah_hasil_item (
  id bigserial primary key,
  serah_id bigint references public.serah_hasil(id) on delete cascade,
  detail_id bigint,
  jenis text,
  qty_serah numeric default 0,
  perlu_qc boolean default false,
  qty_qc_ok numeric,
  qty_qc_ng numeric,
  qty_diterima numeric,
  barang_masuk_id bigint
);
create index if not exists serah_hasil_item_serah_idx on public.serah_hasil_item (serah_id);
create index if not exists serah_hasil_item_detail_idx on public.serah_hasil_item (detail_id);
alter table public.serah_hasil enable row level security;
alter table public.serah_hasil_item enable row level security;
drop policy if exists "serah_hasil_all_auth" on public.serah_hasil;
drop policy if exists "serah_hasil_item_all_auth" on public.serah_hasil_item;
create policy "serah_hasil_all_auth" on public.serah_hasil for all to authenticated using (true) with check (true);
create policy "serah_hasil_item_all_auth" on public.serah_hasil_item for all to authenticated using (true) with check (true);
