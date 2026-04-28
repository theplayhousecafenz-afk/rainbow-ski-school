-- Rainbow Ski School — initial schema

create type discipline as enum ('ski', 'snowboard');
create type lesson_type as enum ('group', 'private');
create type lesson_level as enum ('beginner', 'intermediate', 'advanced');
create type lesson_status as enum (
  'pending', 'confirmed', 'instructor_confirmed', 'active', 'cancelled', 'closed'
);
create type customer_type as enum ('adult', 'youth_child_student_senior');
create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'refunded');
create type availability_response as enum ('pending', 'confirmed', 'declined');

-- Instructors
create table instructors (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null,
  phone           text not null,
  discipline      discipline not null,
  qualifications  text,
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

-- Lessons
create table lessons (
  id                    uuid primary key default gen_random_uuid(),
  date                  date not null,
  start_time            time not null,
  discipline            discipline not null,
  lesson_type           lesson_type not null,
  level                 lesson_level not null,
  max_students          integer not null,
  min_students          integer not null,
  current_bookings      integer not null default 0,
  instructor_id         uuid references instructors(id) on delete set null,
  instructor_confirmed  boolean not null default false,
  status                lesson_status not null default 'pending',
  created_at            timestamptz not null default now(),

  constraint lessons_date_is_weekend check (extract(dow from date) in (0, 6)),
  constraint lessons_group_max check (
    lesson_type != 'group' or max_students = 8
  ),
  constraint lessons_private_max check (
    lesson_type != 'private' or max_students = 1
  )
);

create index on lessons (date, discipline, status);

-- Customers
create table customers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  phone       text not null,
  created_at  timestamptz not null default now()
);

create index on customers (email);

-- Bookings
create table bookings (
  id                        uuid primary key default gen_random_uuid(),
  lesson_id                 uuid not null references lessons(id) on delete restrict,
  customer_id               uuid not null references customers(id) on delete restrict,
  discipline                discipline not null,
  customer_type             customer_type not null,
  amount_paid               integer not null,           -- cents NZD
  stripe_payment_intent_id  text not null,
  stripe_refund_id          text,
  status                    booking_status not null default 'pending',
  created_at                timestamptz not null default now()
);

create index on bookings (lesson_id, status);
create index on bookings (stripe_payment_intent_id);

-- Instructor availability
create table availability (
  id              uuid primary key default gen_random_uuid(),
  instructor_id   uuid not null references instructors(id) on delete cascade,
  lesson_id       uuid not null references lessons(id) on delete cascade,
  response        availability_response not null default 'pending',
  response_token  text not null unique default gen_random_uuid()::text,
  responded_at    timestamptz,
  created_at      timestamptz not null default now(),

  unique (instructor_id, lesson_id)
);

create index on availability (response_token);

-- Enquiries
create table enquiries (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null,
  message          text not null,
  auto_reply_sent  boolean not null default false,
  created_at       timestamptz not null default now()
);

-- Function to atomically increment/decrement current_bookings
create or replace function increment_bookings(lesson uuid, delta integer)
returns void language sql as $$
  update lessons set current_bookings = current_bookings + delta where id = lesson;
$$;
