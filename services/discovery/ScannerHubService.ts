import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { MarketTarget, ScannerResult } from '../../types';
import { scannerTools } from './ScannerTools';
import { hallOfFameService } from './HallOfFameService';

/**
 * [Architecture 2.0] Discovery Engine - ScannerHubService
 * 
 * The Central Control Tower for all scanners.
 * Aggregates signals from:
 * 1. Eagle Eye (Supply)
 * 2. Volume Spike (Momentum)
 * 3. Hall of Fame (Pattern)
 * 4. Material Radar (News) - via TelegramIntelligence (Separate)
 */

interface ScannerSignal extends ScannerResult {
    timestamp: number;
    sourceScanner: string;
}

class ScannerHubService {
    private signals$ = new BehaviorSubject<ScannerSignal[]>([]);

    constructor() {
        console.log('[ScannerHub] 🏰 Discovery Engine Initialized.');
    }

    /**
     * Run All Scanners and Aggregate Results
     */
    public async runFullScan(marketTarget: MarketTarget = 'KR') {
        console.log(`[ScannerHub] 🚀 Launching Full Discovery Scan for ${marketTarget}...`);

        // Parallel Execution
        const [eagleResults, volumeResults, hofResults] = await Promise.all([
            scannerTools.runEagleEyeScanner(marketTarget),
            scannerTools.runVolumeSpikeScanner(marketTarget),
            hallOfFameService.runHallOfFameScan(marketTarget)
        ]);

        console.log(`[ScannerHub] Scan Complete. Found: Eagle(${eagleResults.length}), Vol(${volumeResults.length}), HOF(${hofResults.length})`);

        // Standardize & Merge
        const allSignals: ScannerSignal[] = [
            ...eagleResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'EagleEye' })),
            ...volumeResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'VolumeSpike' })),
            ...hofResults.map(r => ({ ...r, timestamp: Date.now(), sourceScanner: 'HallOfFame' }))
        ];

        // Broadcast
        this.signals$.next(allSignals);
        return allSignals;
    }

    public getSignals() {
        return this.signals$.asObservable();
    }
}

export const scannerHub = new ScannerHubService();
