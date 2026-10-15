-- The original hunt-planning migration already enforces this exact condition
-- with one_active_drive_per_hunt. Keep that canonical index and remove the
-- duplicate added by hunt_live_operations_core.
drop index if exists public.hunt_drives_one_active_per_hunt;
