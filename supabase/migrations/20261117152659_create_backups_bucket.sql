-- Varukoopia salvestuskoht. Eelmine migratsioon `20260924202458_private_backup_bucket`
-- oli tühi ega loonud midagi, mistõttu nädalane varukoopia ei saanud kunagi üles laadida.
-- Bucket on privaatne (public=false) ja sellele ei ole `storage.objects` poliitikaid:
-- kirjutab ja loeb ainult teenusevõti (service_role), mis möödub RLS-ist.
-- Piirang 50 MB on Supabase'i tasuta plaani ühe faili ülempiir.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('backups', 'backups', false, 52428800, array['application/gzip'])
on conflict (id) do nothing;
