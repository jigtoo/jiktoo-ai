import { morningBriefingScheduler } from './services/schedulers/MorningBriefingScheduler';
import { supabase } from './services/supabaseClient';

async function forceRun() {
    console.log('[ForceNews] Generating Real-time Market Briefing (Google Search)...');

    // Force KR briefing for today (it checks DB, so we might need to delete today's first if exists)
    // Or just run with a fake date to force it?
    // The scheduler checks DB based on date.
    // Let's delete today's briefing first to ensure fresh generation.
    const now = new Date();
    const dateString = now.toISOString().split('T')[0];

    await supabase.from('morning_briefings').delete().eq('date', dateString).eq('market_target', 'KR');
    await supabase.from('morning_briefings').delete().eq('date', dateString).eq('market_target', 'US');

    // Run KR Briefing (will likely generate "Closing Briefing" due to time) with FORCE=true
    await morningBriefingScheduler.runBriefing('KR', dateString, true);

    console.log('[ForceNews] Briefing Generated. Check Dashboard.');
}

forceRun();
