-- Enable Row-Level Security on all tables.
-- The server always uses the service role key which bypasses RLS,
-- so no policies are needed — this simply prevents direct anon key access.

alter table instructors  enable row level security;
alter table lessons      enable row level security;
alter table customers    enable row level security;
alter table bookings     enable row level security;
alter table availability enable row level security;
alter table enquiries    enable row level security;
alter table promo_codes  enable row level security;
