-- JALANKAN DI SUPABASE "TIMBANGAN KERTAS" (project dggspzjibisapdaowkkj) -> SQL Editor
-- Menandai nota serah terima yang sudah dicetak (siapa, kapan, berapa kali)
alter table public.serah_terima add column if not exists dicetak_at timestamptz;
alter table public.serah_terima add column if not exists dicetak_oleh text;
alter table public.serah_terima add column if not exists jml_cetak int not null default 0;

create or replace function public.tandai_cetak_nota(p_id bigint, p_oleh text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.serah_terima
     set dicetak_at = now(), dicetak_oleh = p_oleh, jml_cetak = coalesce(jml_cetak, 0) + 1
   where id = p_id;
end $$;
grant execute on function public.tandai_cetak_nota(bigint, text) to anon, authenticated;

-- Mempercepat daftar nota saat data sudah banyak
create index if not exists serah_terima_created_idx on public.serah_terima (created_at desc);
create index if not exists serah_terima_status_idx on public.serah_terima (status, id desc);
