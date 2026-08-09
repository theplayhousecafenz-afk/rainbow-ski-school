-- Remove the rigid constraint that forced group lessons to always have exactly 8 students.
-- This allows admins to manually mark lessons as full by reducing max_students to current_bookings.
ALTER TABLE lessons DROP CONSTRAINT IF EXISTS lessons_group_max;
