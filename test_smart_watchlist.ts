import { sniperTriggerService } from './services/SniperTriggerService';

async function test() {
    console.log('--- Testing Smart Watchlist Logic ---');

    // 1. Test High Volume Stock (Samsung Electronics) -> Should likely be EXECUTE (if > 1M vol) or WATCHING (if vol low today)
    // Note: KIS Proxy usage requires server running.
    console.log('[Test 1] Samsung Electronics (005930)');
    const res1 = await sniperTriggerService.evaluateOrWatch('005930', 'Samsung Elec', 90, 'Test Signal', 'KR');
    console.log('Result:', res1);

    // 2. Test Low Volume Stock or Invalid (Let's try a Preferred stock usually low vol, e.g. 005935)
    console.log('[Test 2] Samsung Elec Pref (005935)');
    const res2 = await sniperTriggerService.evaluateOrWatch('005935', 'Samsung Elec Pref', 85, 'Test Signal', 'KR');
    console.log('Result:', res2);
}

test();
