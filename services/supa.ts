// copy-of-sepa-ai/services/supa.ts
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_SUPABASE_ENABLED } from '../config';

if (!IS_SUPABASE_ENABLED) {
    // This will prevent the app from crashing if Supabase is not configured,
    // but dependent functions will fail gracefully.
    console.error("Supabase is not configured. The application will run, but database-dependent features will fail.");
}

// The user directive uses a simpler client. We follow this for consistency with the new modules.
export const supabase = IS_SUPABASE_ENABLED
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;