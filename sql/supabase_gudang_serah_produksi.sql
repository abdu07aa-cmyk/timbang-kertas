-- JALANKAN DI SUPABASE "GUDANG PRO" (project txvgclavcmhyxamxgvsi) -> SQL Editor
-- Konfirmasi "Terima barang" oleh Leader Produksi pada permintaan produksi yang sudah diserahkan.
alter table public.permintaan_produksi add column if not exists diterima_at timestamptz;
alter table public.permintaan_produksi add column if not exists diterima_oleh text;
-- Pengiriman sebagian (partial): permintaan sisa menunjuk ke permintaan induknya
alter table public.permintaan_produksi add column if not exists parent_id bigint;

create or replace function public.terima_permintaan_produksi(p_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  em text := lower(coalesce(auth.jwt() ->> 'email', ''));
  r record;
  peran text;
begin
  select role into peran from user_profiles where lower(email) = em limit 1;
  select * into r from permintaan_produksi where id = p_id;
  if not found then raise exception 'Permintaan tidak ditemukan'; end if;
  if r.status <> 'SELESAI' then raise exception 'Barang belum diserahkan oleh gudang'; end if;
  if lower(coalesce(r.requested_by, '')) <> em and peran is distinct from 'admin' then
    raise exception 'Hanya peminta barang atau admin yang boleh mengonfirmasi';
  end if;
  if r.diterima_at is not null then return 'sudah'; end if;
  update permintaan_produksi set diterima_at = now(), diterima_oleh = em where id = p_id;
  return 'ok';
end;
$$;
revoke all on function public.terima_permintaan_produksi(bigint) from public, anon;
grant execute on function public.terima_permintaan_produksi(bigint) to authenticated;
