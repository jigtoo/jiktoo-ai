
import { autoPilotService } from '../services/AutoPilotService';
import { supabase } from '../services/supabaseClient';

async function initiateProtocol() {
    console.log('');
    console.log('========================================================');
    console.log('🚀 PROJECT AWS: JIKTOO AWAKENING (DAY 5) - GO LIVE 🚀');
    console.log('========================================================');
    console.log(`[Time] ${new Date().toLocaleString()}`);
    console.log('[System] Initializing Core Services...');

    // 1. Verify Database
    if (!supabase) {
        console.warn('⚠️ [Warning] Supabase Client is missing or invalid. Memories will not be saved.');
    } else {
        console.log('✅ [System] Supabase Link Established.');
    }

    // 2. Start AutoPilot
    console.log('[AutoPilot] Engaging Darwinian Engine...');
    await autoPilotService.start();

    console.log('');
    console.log('========================================================');
    console.log('🐯 THE PREDATOR IS HUNGRY. TRADING ACTIVE.');
    console.log('   (Press Ctrl+C to stop)');
    console.log('========================================================');

    // Keep alive
    setInterval(() => {
        // Heartbeat
    }, 60000);
}

initiateProtocol().catch(err => {
    console.error('❌ FATAL: Protocols Failed to Launch', err);
    process.exit(1);
});
