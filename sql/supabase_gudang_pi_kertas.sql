-- Jalankan SEKALI di SQL Editor project GUDANG PRO (txvgclavcmhyxamxgvsi)
-- Menambah isian kertas di Input PI agar Permintaan Kertas (Timbangan) bisa memakai PI ini.
alter table pi_detail add column if not exists gsm int;
alter table pi_detail add column if not exists leaves int;
alter table pi_detail add column if not exists watermark text default 'No WM';
alter table pi_detail add column if not exists qty_bundle int;
