import { supabase } from './supabaseClient';
import { autoPilotService } from './AutoPilotService';
// import { virtualTradingService } from './VirtualTradingService'; // Avoid static import if problematic, or use lazy load

class SystemCommandListener {
    private isListening = false;
    // Debounce/Throttling state if necessary

    public async start() {
        if (this.isListening) return;
        this.isListening = true;
        console.log('[SystemCommandListener] 🎧 Started listening for remote commands...');

        // Subscribe to INSERT on system_commands
        if (supabase) {
            // 1. Process any pending commands missed while offline
            const { data: pendingCmds } = await supabase
                .from('system_commands')
                .select('*')
                .eq('status', 'PENDING');

            if (pendingCmds && pendingCmds.length > 0) {
                console.log(`[SystemCommandListener] Found ${pendingCmds.length} pending commands. Processing...`);
                for (const cmd of pendingCmds) {
                    await this.handleCommand(cmd);
                }
            }

            // 2. Listen for new commands
            supabase
                .channel('remote-control')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'system_commands' },
                    async (payload) => {
                        await this.handleCommand(payload.new);
                    }
                )
                .subscribe();
        }
    }

    private async handleCommand(commandRow: any) {
        if (!commandRow || commandRow.status !== 'PENDING') return;

        const { id, command, payload } = commandRow;
        console.log(`[SystemCommandListener] 📩 Received command: ${command}`);

        try {
            // Execute Command
            if (command === 'START_AUTOPILOT') {
                autoPilotService.start();
            }
            else if (command === 'STOP_AUTOPILOT') {
                autoPilotService.stop();
            }
            else if (command === 'SYNC_ACCOUNT') {
                // Dynamic import to avoid circular dependency risks during init
                const { virtualTradingService } = await import('./VirtualTradingService');
                await virtualTradingService.syncWithKisAccount();
            }
            else if (command === 'TEST_SNIPER') {
                const { sniperTriggerService } = await import('./SniperTriggerService');
                await sniperTriggerService.forceTestTrigger();
            }

            // Update Status to EXECUTED
            if (supabase) {
                await supabase
                    .from('system_commands')
                    .update({ status: 'EXECUTED', updated_at: new Date().toISOString() })
                    .eq('id', id);
            }

        } catch (error) {
            console.error(`[SystemCommandListener] Failed to execute ${command}:`, error);
            if (supabase) {
                await supabase
                    .from('system_commands')
                    .update({ status: 'ERROR', payload: { error: JSON.stringify(error) } })
                    .eq('id', id);
            }
        }
    }
}

export const systemCommandListener = new SystemCommandListener();
