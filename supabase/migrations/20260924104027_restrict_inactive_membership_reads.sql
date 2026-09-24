-- An inactive account must not retain even read access to its own membership row.
-- Active users may read their own membership; active admins may read all rows.
drop policy if exists members_read on public.memberships;
create policy members_read on public.memberships
for select to authenticated
using ((user_id = (select auth.uid()) and active) or public.my_role() = 'admin');
