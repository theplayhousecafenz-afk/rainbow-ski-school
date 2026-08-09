-- Add 'first_timer' to the lesson_level enum
-- Designed for people who have never skied or snowboarded before
ALTER TYPE lesson_level ADD VALUE IF NOT EXISTS 'first_timer';
