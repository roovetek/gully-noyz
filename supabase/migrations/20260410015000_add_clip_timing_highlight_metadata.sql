-- Add clip metadata fields used by record workflow and AI highlighting.
alter table public.clips
  add column if not exists trim_start_ms integer,
  add column if not exists trim_end_ms integer,
  add column if not exists hit_timestamp_ms integer,
  add column if not exists is_highlight boolean not null default false;

