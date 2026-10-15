with duplicates as (
 select id,row_number() over(partition by drive_id,assigned_participant_id order by confirmed_at nulls last,id) as rn
 from public.hunt_positions
 where assigned_participant_id is not null
)
update public.hunt_positions p
set assigned_participant_id=null,confirmed_at=null
from duplicates d
where p.id=d.id and d.rn>1;

create unique index if not exists hunt_positions_one_person_per_drive on public.hunt_positions(drive_id,assigned_participant_id) where assigned_participant_id is not null;
