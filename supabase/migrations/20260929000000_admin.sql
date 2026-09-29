-- Admin: private notes on leads, the work gallery, and the editable site details.
-- Like leads, both new tables have RLS on and no policies: only the server's service-role
-- key reaches them, after lib/auth.ts has checked the admin.

alter table public.leads
  add column notes text not null default '' check (char_length(notes) <= 5000);

-- ---------- work gallery ----------

create table public.flights (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- the case page's URL, /work/<slug>: keep stable once published
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title         text not null check (char_length(title) between 1 and 80),
  location      text not null check (char_length(location) between 1 and 80),
  category      text not null check (category in ('Industrial', 'Urban and transit', 'Scenic and heritage', 'Construction')),
  kit           text not null check (char_length(kit) between 1 and 80),
  alt           text not null check (char_length(alt) between 1 and 200),
  note          text not null default '' check (char_length(note) <= 300),
  -- a bundled still's file name (lib/stills.ts) or an uploaded one's URL; '' for none
  still         text not null default '',
  -- uploaded stills only: size and blur placeholder recorded in the browser at upload
  still_width   integer not null default 0,
  still_height  integer not null default 0,
  still_blur    text not null default '' check (char_length(still_blur) <= 3000),
  -- a file name in the clip store, a /media/... path or a Blob URL; '' for none
  clip          text not null default '',
  wide          boolean not null default false,
  on_homepage   boolean not null default true,
  visible       boolean not null default true,
  position      integer not null,
  check (still <> '' or clip <> '')
);

create index flights_position_idx on public.flights (position, created_at);

-- the same touch trigger as leads, reused
create trigger flights_touch_updated_at
  before update on public.flights
  for each row execute function public.leads_touch_updated_at();

alter table public.flights enable row level security;

-- The flights the site launched with: the same rows as lib/content/defaults.ts.
insert into public.flights (position, slug, title, location, category, kit, still, clip, alt, wide, note) values
  (1,  'chimney-stack-audit', 'Chimney stack audit', 'Power station, Madhya Pradesh', 'Industrial', 'Thermal and 4K',
       'plant-chimneys.jpg', 'plant-chimneys.mp4',
       'Drone view down the side of a concrete chimney stack beside a river and expressway', true,
       'Full-height visual and thermal pass of the stack, no scaffolding.'),
  (2,  'metro-viaduct-tracking', 'Metro viaduct tracking', 'Bengaluru', 'Urban and transit', '4K',
       'metro-highway.jpg', 'metro-highway.mp4',
       'Top-down view of a metro viaduct running above a busy highway', false, ''),
  (3,  'hill-temple', 'Hill temple', 'Western Ghats', 'Scenic and heritage', '6K',
       'hill-temple.jpg', 'hill-temple.mp4',
       'Aerial view of a hilltop temple roof with mountains behind', false,
       'Slow rising reveal for a heritage documentary.'),
  (4,  'conveyor-line-survey', 'Conveyor line survey', 'Mineral processing unit', 'Industrial', '4K',
       'plant-conveyor.jpg', 'plant-conveyor.mp4',
       'Looking down on rusted conveyor housings running through overgrown ground', true, ''),
  (5,  'rail-yard-mapping', 'Rail yard mapping', 'Northern Railway hub', 'Urban and transit', '4K',
       'train-depot.jpg', 'train-depot.mp4',
       'Overhead view of a rail yard with long depot sheds and parallel tracks', false, ''),
  (6,  'wetland-sanctuary', 'Wetland sanctuary', 'Chilika Lagoon', 'Scenic and heritage', '4K, telephoto',
       'river-birds.jpg', 'river-birds.mp4',
       'Two birds flying low over still brown water', false, ''),
  (7,  'terminal-orbit', 'Terminal orbit', 'Nagpur', 'Urban and transit', '4K',
       'metro-station.jpg', 'metro-station.mp4',
       'Transit terminal roof covered in solar panels next to a large parking lot', true, ''),
  (8,  'tower-progress-survey', 'Tower progress survey', 'BKC, Mumbai', 'Construction', '4K',
       'highrise-towers.jpg', 'highrise-towers.mp4',
       'Residential towers and a tower crane under an overcast sky', false, ''),
  (9,  'fpv-flythrough', 'FPV flythrough', 'Steel complex, Gujarat', 'Industrial', '7-inch FPV, 6K',
       'plant-fpv.jpg', 'plant-fpv.mp4',
       'FPV flight through rusted steelwork inside an industrial plant', false, ''),
  (10, 'structural-steelwork-survey', 'Structural steelwork survey', 'Petrochem refinery', 'Industrial', '5.2K ProRes',
       'plant-structure.jpg', 'plant-structure.mp4',
       'Steel pipework and structural framing across a refinery seen from above', true, ''),
  (11, 'expressway-at-night', 'Expressway at night', 'Delhi NCR', 'Urban and transit', '4K, night',
       'night-highway.jpg', 'night-highway.mp4',
       'Expressway running to the horizon at night, lit by moving traffic', false, ''),
  (12, 'river-basin-delta', 'River basin delta', 'Narmada Valley', 'Scenic and heritage', '6K',
       'river-sunset.jpg', 'river-sunset.mp4',
       'Sunset over a wide river delta with green banks', false, '');

-- ---------- site details ----------

-- One row. The JSON is validated by settingsSchema in lib/settings.ts on the way in and read
-- field by field (with defaults) on the way out, so a new setting needs no migration.
create table public.site_settings (
  id          smallint primary key default 1 check (id = 1),
  data        jsonb not null default '{}',
  updated_at  timestamptz not null default now()
);

create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.leads_touch_updated_at();

alter table public.site_settings enable row level security;
