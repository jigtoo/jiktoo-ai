-- Force PostgREST schema cache reload
-- Run this if you see errors like "Could not find the '...' column in the schema cache"

NOTIFY pgrst, 'reload schema';
