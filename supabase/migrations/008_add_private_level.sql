-- Add 'private' level for private lessons where the instructor caters to any ability
ALTER TYPE lesson_level ADD VALUE IF NOT EXISTS 'private';
