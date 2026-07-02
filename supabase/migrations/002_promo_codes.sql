create table promo_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  discount_percent integer not null check (discount_percent between 1 and 100),
  max_uses      integer not null default 50,
  current_uses  integer not null default 0,
  expires_at    timestamptz not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Function to safely increment usage count
create or replace function increment_promo_usage(promo_code text)
returns void language plpgsql as $$
begin
  update promo_codes set current_uses = current_uses + 1 where code = promo_code;
end;
$$;

-- Seed the initial codes
insert into promo_codes (code, discount_percent, max_uses, expires_at) values
  ('RAINBOW10', 10, 50, '2026-10-01T00:00:00Z'),
  ('RAINBOW20', 20, 50, '2026-10-01T00:00:00Z'),
  ('RAINBOW50', 50, 50, '2026-10-01T00:00:00Z'),
  ('RAINBOW99', 99, 50, '2026-10-01T00:00:00Z');
