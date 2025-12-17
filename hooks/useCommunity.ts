// copy-of-sepa-ai/hooks/useCommunity.ts




import { useState, useCallback, useEffect } from 'react';
import type { CommunityPost, MarketTarget } from '../types';
import { supabase, type Database } from '../services/supabaseClient';
import { findStock } from '../services/gemini/stockService';
// FIX: Corrected import path from geminiService to marketInfo.
import { marketInfo } from '../services/marketInfo';

const VOTED_POSTS_KEY = 'JIKTOO_votedPosts_v1';

// Helper to get voted posts from localStorage
const getVotedPosts = (): Record<string, 'up' | 'down'> => {
    try {
        const saved = localStorage.getItem(VOTED_POSTS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        console.error("Failed to parse voted posts from localStorage", e);
        return {};
    }
};

// Helper to save a single vote to localStorage
const saveVotedPost = (id: string, voteType: 'up' | 'down' | undefined) => {
    const votedPosts = getVotedPosts();
    if (voteType) {
        votedPosts[id] = voteType;
    } else {
        delete votedPosts[id];
    }
    localStorage.setItem(VOTED_POSTS_KEY, JSON.stringify(votedPosts));
};

const FEATURE_DISABLED_ERROR = "커뮤니티 기능이 비활성화되었습니다. 앱을 로컬에서 실행하는 경우, .env.local 파일에 Supabase 환경 변수를 설정했는지 확인해주세요.";

type CommunityPostRow = Database['public']['Tables']['community_posts']['Row'];
type CommunityPostInsert = Database['public']['Tables']['community_posts']['Insert'];
type CommunityPostUpdate = Database['public']['Tables']['community_posts']['Update'];

export const useCommunity = (marketTarget: MarketTarget) => {
    const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
    const [isCommunityLoading, setIsCommunityLoading] = useState<boolean>(false);
    const [communityError, setCommunityError] = useState<string | null>(null);

    const handleFetchCommunityPosts = useCallback(async () => {
        if (!supabase) {
            setCommunityError(FEATURE_DISABLED_ERROR);
            setCommunityPosts([]);
            setIsCommunityLoading(false);
            return;
        }

        setIsCommunityLoading(true);
        setCommunityError(null);
        try {
            const { data, error } = await supabase
                .from('community_posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            const votedPosts = getVotedPosts();
            
            const posts: CommunityPost[] = (data || []).map((p: CommunityPostRow) => ({
                id: p.id,
                stockName: p.stock_name,
                ticker: p.ticker,
                title: p.title,
                content: p.content,
                author: p.author,
                createdAt: p.created_at,
                upvotes: p.upvotes,
                downvotes: p.downvotes,
                market: p.market as MarketTarget,
                voted: votedPosts[p.id],
            }));

            setCommunityPosts(posts);
        } catch (err) {
            setCommunityError(err instanceof Error ? err.message : '게시글을 불러오지 못했습니다.');
        } finally {
            setIsCommunityLoading(false);
        }
    }, []);
    
    const handleCreatePost = async (post: Omit<CommunityPost, 'id' | 'createdAt' | 'upvotes' | 'downvotes' | 'author' | 'voted'>) => {
        if (!supabase) {
            setCommunityError(FEATURE_DISABLED_ERROR);
            return;
        }
        
        const newPostForDB: CommunityPostInsert = {
            stock_name: post.stockName,
            ticker: post.ticker,
            title: post.title,
            content: post.content,
            market: post.market,
            author: '나 (You)', // Placeholder until auth
        };

        // FIX: Changed from .insert() to .upsert() and added 'as any' to avoid Supabase client type inference issues.
        const { data, error } = await supabase
            .from('community_posts')
            .upsert([newPostForDB] as any)
            .select()
            .single();

        if (error) {
            setCommunityError(error.message);
        } else if (data) {
            const typedData = data as CommunityPostRow;
            const newPost: CommunityPost = {
                id: typedData.id,
                stockName: typedData.stock_name,
                ticker: typedData.ticker,
                title: typedData.title,
                content: typedData.content,
                author: typedData.author,
                createdAt: typedData.created_at,
                upvotes: typedData.upvotes,
                downvotes: typedData.downvotes,
                market: typedData.market as MarketTarget,
            };
            setCommunityPosts(prev => [newPost, ...prev]);
        }
    };
    
    const handleUpdatePost = async (post: { id: string; title: string; content: string; }) => {
        if (!supabase) {
            setCommunityError(FEATURE_DISABLED_ERROR);
            return;
        }

        const { id, title, content } = post;
        // FIX: Wrap the upsert object in an array. While upserting a single object can work with onConflict, using an array is more consistent with other calls in the app and safer when relying on the primary key for updates.
        const { error } = await supabase
            .from('community_posts')
            .upsert([{ id, title, content }] as any);

        if (error) {
            setCommunityError(error.message);
        } else {
            setCommunityPosts(prev =>
                prev.map(p => (p.id === id ? { ...p, title, content } : p))
            );
        }
    };

    const handleDeletePost = async (id: string) => {
        if (!supabase) {
            setCommunityError(FEATURE_DISABLED_ERROR);
            return;
        }

        const { error } = await supabase
            .from('community_posts')
            .delete()
            .eq('id', id);

        if (error) {
            setCommunityError(error.message);
        } else {
            setCommunityPosts(prev => prev.filter(p => p.id !== id));
        }
    };

    const handleVotePost = async (id: string, voteType: 'up' | 'down') => {
        if (!supabase) {
            setCommunityError(FEATURE_DISABLED_ERROR);
            return;
        }
        
        const postIndex = communityPosts.findIndex(p => p.id === id);
        if (postIndex === -1) return;

        const post = communityPosts[postIndex];
        const currentVote = post.voted;

        let upvotes = post.upvotes;
        let downvotes = post.downvotes;
        let newVote: 'up' | 'down' | undefined = voteType;

        if (currentVote === voteType) { // Un-voting
            if (voteType === 'up') upvotes--; else downvotes--;
            newVote = undefined;
        } else { // Voting or changing vote
            if (currentVote === 'up') upvotes--;
            if (currentVote === 'down') downvotes--;
            if (voteType === 'up') upvotes++; else downvotes++;
        }
        
        // Optimistic UI update
        const updatedPosts = [...communityPosts];
        updatedPosts[postIndex] = { ...post, upvotes, downvotes, voted: newVote };
        setCommunityPosts(updatedPosts);
        saveVotedPost(id, newVote);

        const updateData = { id, upvotes, downvotes };
        // FIX: Wrap the upsert object in an array. While upserting a single object can work with onConflict, using an array is more consistent with other calls in the app and safer when relying on the primary key for updates.
        const { error } = await supabase
            .from('community_posts')
            .upsert([updateData] as any);

        if (error) {
            setCommunityError("투표 업데이트에 실패했습니다.");
            // Revert UI on failure
            setCommunityPosts(prev => {
                const revertedPosts = [...prev];
                revertedPosts[postIndex] = post; // Revert to original post state
                return revertedPosts;
            });
             saveVotedPost(id, currentVote);
        }
    };
    
    // FIX: Rename properties to match CommunityPlazaProps
    return {
        posts: communityPosts,
        isLoading: isCommunityLoading,
        error: communityError,
        onFetchPosts: handleFetchCommunityPosts,
        onCreatePost: handleCreatePost,
        onUpdatePost: handleUpdatePost,
        onDeletePost: handleDeletePost,
        onVotePost: handleVotePost,
    };
};