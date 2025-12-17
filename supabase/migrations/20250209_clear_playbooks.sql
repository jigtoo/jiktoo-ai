-- Delete all existing playbooks with wrong sources tags
DELETE FROM public.alpha_engine_playbooks;

-- Verify deletion
SELECT COUNT(*) as remaining_playbooks FROM public.alpha_engine_playbooks;
