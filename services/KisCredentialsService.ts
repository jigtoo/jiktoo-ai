// services/KisCredentialsService.ts
/**
 * KIS Credentials Service
 * Fetches KIS API credentials from Supabase Edge Functions Secrets
 */

import { supabase } from './supabaseClient';

interface KisCredentials {
    appKey: string;
    appSecret: string;
    approvalKey: string;
}

class KisCredentialsService {
    private credentials: KisCredentials | null = null;
    private isLoading: boolean = false;

    /**
     * Fetch KIS credentials from Supabase Edge Functions
     * Credentials are stored in Supabase Edge Functions Secrets
     */
    async getCredentials(): Promise<KisCredentials | null> {
        // Return cached credentials if available
        if (this.credentials) {
            return this.credentials;
        }

        // Prevent multiple simultaneous fetches
        if (this.isLoading) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return this.credentials;
        }

        this.isLoading = true;

        try {
            if (!supabase) {
                console.error('[KIS Credentials] Supabase not available');
                this.isLoading = false;
                return null;
            }

            // Call Edge Function to get credentials
            // Edge Function has access to secrets (KIS_APP_KEY, KIS_APP_SECRET)
            const { data, error } = await supabase.functions.invoke('get-kis-credentials');

            if (error) {
                console.error('[KIS Credentials] Error fetching from Edge Function:', error);
                this.isLoading = false;
                return null;
            }

            if (!data || !data.appKey || !data.appSecret) {
                console.warn('[KIS Credentials] Incomplete credentials from Edge Function');
                this.isLoading = false;
                return null;
            }

            this.credentials = {
                appKey: data.appKey,
                appSecret: data.appSecret,
                approvalKey: data.approvalKey || '' // Approval key might be generated
            };

            console.log('[KIS Credentials] Successfully loaded from Supabase Edge Functions');
            this.isLoading = false;
            return this.credentials;

        } catch (error) {
            console.error('[KIS Credentials] Unexpected error:', error);
            this.isLoading = false;
            return null;
        }
    }

    /**
     * Check if credentials are available
     */
    hasCredentials(): boolean {
        return this.credentials !== null;
    }

    /**
     * Clear cached credentials (for testing)
     */
    clearCache() {
        this.credentials = null;
    }
}

// Singleton instance
export const kisCredentialsService = new KisCredentialsService();
