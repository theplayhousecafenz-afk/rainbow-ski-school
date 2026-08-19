-- Website enquiries have always saved to this table, but with no admin page to
-- read them the only copy anyone saw was the alert email. Now that they are
-- listed in the portal there needs to be a way to tell answered from unanswered,
-- otherwise every enquiry ever received stays on the screen forever.

ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS handled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN enquiries.handled IS
  'Admin has dealt with this enquiry — replied, booked them in, or decided no reply is needed.';
