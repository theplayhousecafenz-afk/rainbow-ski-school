-- Per-lesson capacity + a real "closed" flag.
--
-- Capacity itself needs no new column: lessons.max_students already holds it,
-- it just was not editable from the admin UI.
--
-- What was missing is a way to close a lesson to new bookings WITHOUT pretending
-- its capacity shrank. "Mark as full" used to rewrite max_students down to the
-- current headcount, which:
--   * threw away the lesson's real capacity, so reopening guessed at the default
--   * misread any lesson deliberately smaller than the default as "manually full"
-- Both break as soon as capacity varies per lesson, so store the intent instead.

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS closed_to_bookings boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN lessons.closed_to_bookings IS
  'Admin manually closed this lesson to new bookings, independently of max_students.';

-- No backfill required: verified no group lesson currently sits below the
-- default capacity, so nothing is presently relying on the old shrink-the-max
-- behaviour to appear full.
