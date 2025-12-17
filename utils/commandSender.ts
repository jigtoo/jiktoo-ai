import { supabase } from '../services/supabaseClient';

export type SystemCommandType = 'START_AUTOPILOT' | 'STOP_AUTOPILOT' | 'SYNC_ACCOUNT';

export const sendSystemCommand = async (command: SystemCommandType, payload: any = {}) => {
    if (!supabase) {
        console.error('Supabase client missing');
        return false;
    }

    try {
        const { error } = await supabase
            .from('system_commands')
            .insert([{
                command,
                payload,
                status: 'PENDING',
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.error('Failed to send command:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Error sending command:', e);
        return false;
    }
};
