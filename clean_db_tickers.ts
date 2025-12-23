import { supabase } from './services/supabaseClient';

async function cleanInvalidTickers() {
    console.log('🧹 Cleaning invalid tickers (NYCB, DEF, JKL) from Database...');

    // 1. Clean Watchlists
    const { data: watchlists, error: wlError } = await supabase.from('watchlists').select('*');
    if (wlError) {
        console.error('Error fetching watchlists:', wlError);
        return;
    }

    if (watchlists) {
        for (const wl of watchlists) {
            let items = wl.items;
            if (typeof items === 'string') {
                try { items = JSON.parse(items); } catch (e) { console.error('JSON parse error', e); continue; }
            }

            if (Array.isArray(items)) {
                const initialLen = items.length;
                const newItems = items.filter((t: any) => {
                    const ticker = typeof t === 'string' ? t : t.ticker;
                    return !['NYCB', 'DEF', 'JKL', 'HITS', 'UP', 'GAIN'].includes(ticker?.toUpperCase());
                });

                if (newItems.length < initialLen) {
                    console.log(`Fixing Watchlist ${wl.market} (Removed ${initialLen - newItems.length} items)`);
                    await supabase.from('watchlists').update({ items: newItems }).eq('market', wl.market);
                }
            }
        }
    }

    // 2. Clean Playbooks (Alpha Engine)
    const invalidList = ['NYCB', 'DEF', 'JKL', 'HITS', 'UP', 'GAIN', 'ABC', 'XYZ'];
    const { error: pbError } = await supabase
        .from('alpha_engine_playbooks')
        .delete()
        .in('ticker', invalidList);

    if (pbError) console.error('Error cleaning playbooks:', pbError);
    else console.log('✅ Cleaned invalid items from alpha_engine_playbooks.');

    console.log('✅ Cleanup complete.');
}

cleanInvalidTickers();
