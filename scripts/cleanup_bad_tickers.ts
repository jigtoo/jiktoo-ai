
import { supabase } from '../services/supabaseClient';

async function cleanup() {
    console.log('Starting cleanup of invalid tickers...');

    // List of known bad tickers causing 400 errors
    const invalidTickers = [
        'ABC',
        'LMN',
        'XYZ',
        'NA',
        'LITH',
        'SAMPLE',
        ' lith',
        'StockCode',
        '종목코드'
    ];

    console.log(`Targeting tickers: ${invalidTickers.join(', ')}`);

    try {
        const { data, error, count } = await supabase
            .from('alpha_engine_playbooks')
            .delete({ count: 'exact' })
            .in('ticker', invalidTickers);

        if (error) {
            console.error('❌ Error deleting rows:', error.message);
        } else {
            console.log(`✅ Cleanup successful. Deleted ${count ?? 'unknown'} rows.`);
        }

        // Also check if there are any other suspicious ones (length < 2)
        // Note: Supabase JS client doesn't support .length filter directly on delete easily without RPC or raw SQL.
        // We will trust the list for now.

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

cleanup();
