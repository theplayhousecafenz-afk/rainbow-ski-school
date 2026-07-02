-- Add quantity column to bookings so instructor emails can show how many students per booking
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
