-- Bind an invitation only to an email confirmed by Supabase Auth.
create or replace function public.join_club() returns setof public.memberships
language plpgsql security definer set search_path='' as $$
declare verified_email text;
begin
 if auth.uid() is null then return;end if;
 select lower(email) into verified_email from auth.users
 where id=auth.uid() and email_confirmed_at is not null
 and not coalesce(is_anonymous,false) and lower(email)=lower(auth.jwt()->>'email');
 if verified_email is null then return;end if;
 update public.memberships set user_id=auth.uid()
 where email=verified_email and active and (user_id is null or user_id=auth.uid());
 return query select * from public.memberships where user_id=auth.uid() and active;
end $$;
