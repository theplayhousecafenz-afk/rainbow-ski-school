-- Add on_hold flag to lessons so admin can pause bookings (e.g. instructor sick)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS on_hold BOOLEAN NOT NULL DEFAULT false;
