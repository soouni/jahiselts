-- REVIEW BEFORE EXECUTION. This file is not applied automatically.
-- Owner is selected by verified membership email; do not guess user IDs.
BEGIN;
ALTER TABLE public.memberships DROP CONSTRAINT IF EXISTS memberships_role_check;
ALTER TABLE public.memberships ADD CONSTRAINT memberships_role_check CHECK (role IN ('owner','admin','member','viewer'));
UPDATE public.memberships SET role='owner' WHERE lower(email)='martti.ojamaa@gmail.com' AND active AND user_id IS NOT NULL;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.memberships WHERE role='owner' AND active AND user_id IS NOT NULL) <> 1
 THEN RAISE EXCEPTION 'Expected exactly one linked active owner; transaction aborted'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.can_manage_hunt(target_hunt_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public
AS $$ SELECT EXISTS(
 SELECT 1 FROM public.hunts h JOIN public.memberships m ON m.user_id=auth.uid()
 WHERE h.id=target_hunt_id AND m.active AND (m.role IN ('owner','admin') OR h.leader_id=auth.uid())
) $$;
REVOKE ALL ON FUNCTION public.can_manage_hunt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_manage_hunt(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.assign_hunt_leader(target_hunt_id uuid,new_leader_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public
AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.memberships WHERE user_id=auth.uid() AND active AND role IN ('owner','admin'))
 THEN RAISE EXCEPTION 'Only administrators may assign hunt leaders'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.memberships WHERE user_id=new_leader_id AND active AND role IN ('owner','admin','member'))
 THEN RAISE EXCEPTION 'Leader must be an active club member'; END IF;
 UPDATE public.hunts SET leader_id=new_leader_id WHERE id=target_hunt_id AND status<>'finished';
 IF NOT FOUND THEN RAISE EXCEPTION 'Hunt missing or finished'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.assign_hunt_leader(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_hunt_leader(uuid,uuid) TO authenticated;
DROP POLICY IF EXISTS hunts_insert ON public.hunts;
CREATE POLICY hunts_insert ON public.hunts FOR INSERT TO authenticated WITH CHECK (
 leader_id=auth.uid() AND EXISTS(SELECT 1 FROM public.memberships WHERE user_id=auth.uid() AND active AND role IN ('owner','admin')));
DROP POLICY IF EXISTS hunts_update ON public.hunts;
CREATE POLICY hunts_update ON public.hunts FOR UPDATE TO authenticated
 USING (public.can_manage_hunt(id)) WITH CHECK (public.can_manage_hunt(id));
-- NOT DEPLOYABLE: child table RLS and member administration functions still require audit.
-- This is a design document only, not an executable migration.
ROLLBACK;
