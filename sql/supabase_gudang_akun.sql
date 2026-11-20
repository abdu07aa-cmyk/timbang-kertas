-- Jalankan SEKALI di SQL Editor project GUDANG PRO (txvgclavcmhyxamxgvsi)
-- Fungsi ini dipakai menu "Pengaturan Akun" untuk mengatur role akun (hanya bisa dipanggil oleh admin).
create or replace function public.atur_role_akun(p_email text, p_role text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
  peran text;
begin
  select role into peran from user_profiles
   where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) limit 1;
  if peran is distinct from 'admin' then
    raise exception 'Hanya admin yang boleh mengatur akun';
  end if;

  select id into uid from auth.users where lower(email) = lower(p_email) limit 1;
  if uid is null then
    raise exception 'Akun % belum dibuat di Supabase (Authentication > Users > Add user)', p_email;
  end if;

  insert into user_profiles(id, email, role) values (uid, p_email, p_role)
  on conflict (id) do update set role = excluded.role, email = excluded.email;
  return 'ok';
end;
$$;
revoke all on function public.atur_role_akun(text, text) from public, anon;
grant execute on function public.atur_role_akun(text, text) to authenticated;
