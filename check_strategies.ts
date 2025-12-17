
import { supabase } from './services/supabaseClient';

async function checkStrategies() {
    const { data, error } = await supabase
        .from('strategies')
        .select('*');

    if (error) {
        console.error('Error fetching strategies:', error);
        return;
    }

    console.log(`Found ${data.length} strategies.`);
    data.forEach(s => {
        console.log(`- [${s.market}] ${s.name} (Active: ${s.is_active})`);
        console.log(`  Genome: ${JSON.stringify(s.genome)}`);
    });
}

checkStrategies();
