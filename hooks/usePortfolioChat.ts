import { useState, useCallback, useEffect } from 'react';
import type { AnalysisChatMessage, MarketTarget, PortfolioItem, PortfolioItemAnalysis, PortfolioOverviewAnalysis, PortfolioChatHistoryDBRow } from '../types';
import { fetchPortfolioChatResponse } from '../services/gemini/chatService';
import { supabase } from '../services/supabaseClient';


export const usePortfolioChat = (
    marketTarget: MarketTarget,
    portfolioItems: PortfolioItem[],
    analysis: PortfolioItemAnalysis[],
    overview: PortfolioOverviewAnalysis | null
) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatHistories, setChatHistories] = useState<Record<MarketTarget, AnalysisChatMessage[]>>({ KR: [], US: [] });
    const [isChatLoading, setIsChatLoading] = useState(false);

    useEffect(() => {
        const fetchHistoryFromDB = async () => {
            if (!supabase) return;
            const { data, error } = await supabase
                .from('portfolio_chat_history')
                .select('*')
                .eq('market', marketTarget)
                .maybeSingle();
            
            if (error) {
                console.error("Error fetching chat history:", error);
            } else if (data && (data as any).messages) {
                // FIX: Cast Supabase data to the correct type to resolve 'never' type inference issue.
                setChatHistories(prev => ({ ...prev, [marketTarget]: (data as any).messages as AnalysisChatMessage[] }));
            }
        };

        fetchHistoryFromDB();
    }, [marketTarget]);

    const chatMessages = chatHistories[marketTarget];
    
    const updateMessagesForCurrentMarket = useCallback(async (getNewMessages: (prevMessages: AnalysisChatMessage[]) => AnalysisChatMessage[]) => {
        const newMessages = getNewMessages(chatHistories[marketTarget]);
        setChatHistories(prev => ({ ...prev, [marketTarget]: newMessages }));

        if (!supabase) return;
        
        // FIX: Cast payload to `any` to avoid Supabase client type inference issues.
        await supabase
            .from('portfolio_chat_history')
            .upsert([{ market: marketTarget, messages: newMessages, updated_at: new Date().toISOString() }] as any);

    }, [marketTarget, chatHistories]);

    const toggleChat = () => setIsChatOpen(prev => !prev);

    const handleSendMessage = useCallback(async (message: string) => {
        const userMessage: AnalysisChatMessage = { role: 'user', text: message };
        await updateMessagesForCurrentMarket(prev => [...prev, userMessage]);
        setIsChatLoading(true);

        try {
            const portfolioData = {
                items: portfolioItems,
                analysis,
                overview,
            };
            const responseText = await fetchPortfolioChatResponse(chatMessages, userMessage, portfolioData);
            const modelMessage: AnalysisChatMessage = { role: 'model', text: responseText };
            await updateMessagesForCurrentMarket(prev => [...prev, modelMessage]);
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : "AI 응답 생성에 실패했습니다.";
            const errorModelMessage: AnalysisChatMessage = { role: 'model', text: `죄송합니다. 오류가 발생했습니다: ${errorMessage}` };
            await updateMessagesForCurrentMarket(prev => [...prev, errorModelMessage]);
        } finally {
            setIsChatLoading(false);
        }
    }, [portfolioItems, analysis, overview, chatMessages, updateMessagesForCurrentMarket]);
    
    // FIX: Rename properties to match PortfolioChatbotProps
    return {
        isOpen: isChatOpen,
        onToggle: toggleChat,
        messages: chatMessages,
        onSendMessage: handleSendMessage,
        isLoading: isChatLoading,
    };
};