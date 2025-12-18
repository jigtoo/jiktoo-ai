
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) process.exit(1);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function repairStockNames() {
    console.log('🔧 Repairing Stock Names in Portfolios...');

    // 1. Fetch Portfolios
    const { data: portfolios } = await supabase.from('ai_trader_portfolios').select('*');

    if (!portfolios) return;

    for (const p of portfolios) {
        if (!p.data || !p.data.holdings) continue;

        let modified = false;
        const newHoldings = p.data.holdings.map((h) => {
            // Check if stockName looks like a ticker (6 digits)
            if (/^\d{6}$/.test(h.stockName) || h.stockName === h.ticker) {
                console.log(`   Found bad name: ${h.stockName} for ${h.ticker}`);
                // Hardcoded fixes for known bad actors (or we could fetch from API)
                if (h.ticker === '298380') h.stockName = '에이비엘바이오';
                else if (h.ticker === '000660') h.stockName = 'SK하이닉스';
                // Add more if needed, or rely on UI enhancer
                modified = true;
            }
            return h;
        });

        if (modified) {
            console.log(`   ✅ Updating portfolio ${p.id}...`);
            const newData = { ...p.data, holdings: newHoldings };
            await supabase
                .from('ai_trader_portfolios')
                .update({ data: newData })
                .eq('id', p.id);
        }
    }
    console.log('✨ Repairs Complete.');
}

repairStockNames();
