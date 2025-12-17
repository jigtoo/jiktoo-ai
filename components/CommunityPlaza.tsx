// copy-of-sepa-ai/components/CommunityPlaza.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { CommunityPost, MarketTarget } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { CommunityIcon, CloseIcon, RefreshIcon, PlusIcon, FireIcon, SparklesIcon, TrendingUpIcon, TrendingDownIcon, EditIcon, TrashIcon } from './icons';
import { findStock } from '../services/gemini/stockService';
import { marketInfo } from '../services/marketInfo';


// --- SUB-COMPONENTS ---

const PostFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (post: Omit<CommunityPost, 'id'|'createdAt'|'upvotes'|'downvotes'|'author' | 'voted'> & { id?: string }) => void;
    marketTarget: MarketTarget;
    editingPost: CommunityPost | null;
}> = ({ isOpen, onClose, onSave, marketTarget, editingPost }) => {
    const [query, setQuery] = useState('');
    const [foundStock, setFoundStock] = useState<{ stockName: string; ticker: string } | null>(null);
    const [isFetching, setIsFetching] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const isEditing = !!editingPost?.id;

    const resetForm = useCallback(() => {
        setQuery(editingPost?.stockName || '');
        setFoundStock(editingPost ? { stockName: editingPost.stockName, ticker: editingPost.ticker } : null);
        setTitle(editingPost?.title || '');
        setContent(editingPost?.content || '');
        setIsFetching(false);
        setFetchError(null);
        setFormError(null);
    }, [editingPost]);
    
    useEffect(() => {
        if(isOpen) resetForm();
    }, [isOpen, resetForm]);

    useEffect(() => {
        if (!query || query.length < 2 || isEditing) {
             if (!isEditing) setFoundStock(null);
             setFetchError(null);
             return;
        }

        const handler = setTimeout(async () => {
            setIsFetching(true);
            setFetchError(null);
            setFoundStock(null);
            try {
                const stock = await findStock(query, marketTarget);
                if (stock) setFoundStock(stock);
                else setFetchError('해당 종목을 찾을 수 없습니다.');
            } catch (err) {
                setFetchError(err instanceof Error ? err.message : '종목 정보 조회 실패');
            } finally {
                setIsFetching(false);
            }
        }, 700);

        return () => clearTimeout(handler);
    }, [query, marketTarget, isEditing]);
    
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);

        const stockToSave = foundStock || (isEditing ? { stockName: editingPost.stockName, ticker: editingPost.ticker } : null);

        if (!stockToSave) {
            setFormError('종목을 먼저 검색하고 선택해주세요.');
            return;
        }
        if (!title.trim() || !content.trim()) {
            setFormError('제목과 내용을 모두 입력해주세요.');
            return;
        }

        onSave({
            id: editingPost?.id,
            stockName: stockToSave.stockName,
            ticker: stockToSave.ticker,
            title,
            content,
            market: marketTarget,
        });
        onClose();
    };

    const inputStyle = "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white disabled:opacity-50";
    const isSaveDisabled = isFetching || !(foundStock || isEditing) || !title.trim() || !content.trim();

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <header className="p-4 flex justify-between items-center border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">{isEditing ? '게시글 수정' : '새로운 유망주 발굴 보고'}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-600"><CloseIcon /></button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="query" className="block text-sm font-medium text-gray-400 mb-1">종목명 또는 티커 ({marketInfo[marketTarget].name})</label>
                        <div className="relative">
                            <input id="query" type="text" value={query} onChange={e => setQuery(e.target.value)} className={inputStyle} placeholder="예: 삼성전자" required autoComplete="off" disabled={isEditing} />
                            {isFetching && <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"><RefreshIcon className="h-5 w-5 text-gray-400 animate-spin" /></div>}
                        </div>
                        {fetchError && <p className="text-red-400 text-xs mt-1">{fetchError}</p>}
                        {(foundStock || (isEditing && editingPost)) && !isFetching && (
                            <div className="mt-2 p-2 bg-gray-900/50 rounded-md text-center">
                                <span className="font-bold text-cyan-400">{foundStock?.stockName || editingPost?.stockName}</span>
                                <span className="text-gray-400 ml-2 font-mono">({foundStock?.ticker || editingPost?.ticker})</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">제목</label>
                        <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputStyle} placeholder="핵심 투자 아이디어를 요약해주세요" required />
                    </div>
                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-gray-400 mb-1">분석 내용</label>
                        <textarea id="content" value={content} onChange={e => setContent(e.target.value)} className={inputStyle} rows={5} placeholder="왜 이 종목이 유망하다고 생각하시나요?" required></textarea>
                    </div>
                    {formError && <div className="p-3 bg-red-900/30 text-red-300 text-sm rounded-md text-center">{formError}</div>}
                    <div className="pt-2 flex justify-end">
                        <button type="submit" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={isSaveDisabled}>{isEditing ? '수정하기' : '게시하기'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PostCard: React.FC<{
    post: CommunityPost,
    onVote: (id: string, voteType: 'up' | 'down') => void,
    onEdit: (post: CommunityPost) => void,
    onDelete: (id: string) => void,
}> = ({ post, onVote, onEdit, onDelete }) => {
    const voteScore = post.upvotes - post.downvotes;
    const scoreColor = voteScore > 0 ? 'text-green-400' : voteScore < 0 ? 'text-red-400' : 'text-gray-400';
    const isMyPost = post.author === '나 (You)';
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg flex gap-4 p-4">
            <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-gray-900/50">
                <button onClick={() => onVote(post.id, 'up')} className={`p-1 rounded-full transition-colors ${post.voted === 'up' ? 'text-green-400 bg-green-900/50' : 'text-gray-500 hover:bg-gray-700'}`} aria-label="추천"><TrendingUpIcon className="h-5 w-5" /></button>
                <span className={`text-lg font-bold ${scoreColor}`}>{voteScore}</span>
                <button onClick={() => onVote(post.id, 'down')} className={`p-1 rounded-full transition-colors ${post.voted === 'down' ? 'text-red-400 bg-red-900/50' : 'text-gray-500 hover:bg-gray-700'}`} aria-label="비추천"><TrendingDownIcon className="h-5 w-5" /></button>
            </div>
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-gray-500">{post.author} · {new Date(post.createdAt).toLocaleDateString()}</p>
                        <h3 className="text-xl font-bold text-cyan-300 mt-1">{post.title}</h3>
                        <p className="text-sm font-mono text-gray-400">{post.stockName} ({post.ticker})</p>
                    </div>
                    {isMyPost && (
                        <div className="flex items-center gap-1">
                             {isConfirmingDelete ? (
                                <>
                                    <button onClick={() => onDelete(post.id)} className="px-3 py-1 text-xs font-bold bg-red-600 text-white rounded-md">삭제</button>
                                    <button onClick={() => setIsConfirmingDelete(false)} className="px-3 py-1 text-xs font-semibold bg-gray-500 text-white rounded-md">취소</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => onEdit(post)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full"><EditIcon className="h-4 w-4" /></button>
                                    <button onClick={() => setIsConfirmingDelete(true)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-full"><TrashIcon className="h-4 w-4" /></button>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <p className="text-sm text-gray-300 mt-3 leading-relaxed line-clamp-3">{post.content}</p>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

interface CommunityPlazaProps {
    posts: CommunityPost[];
    isLoading: boolean;
    error: string | null;
    onFetchPosts: () => void;
    onCreatePost: (post: Omit<CommunityPost, 'id'|'createdAt'|'upvotes'|'downvotes'|'author' | 'voted'>) => void;
    onUpdatePost: (post: Pick<CommunityPost, 'id' | 'title' | 'content'>) => void;
    onDeletePost: (id: string) => void;
    onVotePost: (id: string, voteType: 'up' | 'down') => void;
    marketTarget: MarketTarget;
}

export const CommunityPlaza: React.FC<CommunityPlazaProps> = (props) => {
    const { posts, isLoading, error, onFetchPosts, onCreatePost, onUpdatePost, onDeletePost, onVotePost, marketTarget } = props;
    const [editingPost, setEditingPost] = useState<CommunityPost | null>(null);
    const [sortBy, setSortBy] = useState<'hot' | 'new'>('hot');

    const filteredPosts = useMemo(() => posts.filter(post => post.market === marketTarget), [posts, marketTarget]);

    const sortedPosts = useMemo(() => {
        const postsCopy = [...filteredPosts];
        if (sortBy === 'new') {
            return postsCopy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        // 'hot' sort algorithm (simple version: score / time decay)
        return postsCopy.sort((a, b) => {
            const scoreA = (a.upvotes - a.downvotes) / Math.pow((Date.now() - new Date(a.createdAt).getTime()) / 3600000, 1.8);
            const scoreB = (b.upvotes - b.downvotes) / Math.pow((Date.now() - new Date(b.createdAt).getTime()) / 3600000, 1.8);
            return scoreB - scoreA;
        });
    }, [filteredPosts, sortBy]);

    const handleEditClick = (post: CommunityPost) => setEditingPost(post);
    const handleFormClose = () => setEditingPost(null);

    const handleSavePost = (post: Omit<CommunityPost, 'id'|'createdAt'|'upvotes'|'downvotes'|'author' | 'voted'> & { id?: string }) => {
        if (post.id) { // Editing
            onUpdatePost({ id: post.id, title: post.title, content: post.content });
        } else { // Creating
            onCreatePost(post);
        }
    };

    const usButtonClass = 'bg-orange-600 hover:bg-orange-700';
    const krButtonClass = 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700';
    const buttonClass = marketTarget === 'US' ? usButtonClass : krButtonClass;

    const renderContent = () => {
        if (isLoading) return <LoadingSpinner message="개미들의 최신 동향을 불러오는 중..." />;
        if (error) return <ErrorDisplay title="게시판 로딩 실패" message={error} onRetry={onFetchPosts} />;
        if (filteredPosts.length === 0) return (
            <div className="text-center text-gray-500 py-20 px-4 bg-gray-800/30 rounded-lg">
                <CommunityIcon className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-400">{marketInfo[marketTarget].name} 광장이 아직 비어있습니다.</h3>
                <p className="mt-2">위의 '글쓰기' 버튼을 눌러 첫 번째 유망주 발굴 보고서를 작성해보세요!</p>
            </div>
        );
        return (
            <div className="space-y-4">
                {sortedPosts.map(post => <PostCard key={post.id} post={post} onVote={onVotePost} onEdit={handleEditClick} onDelete={onDeletePost} />)}
            </div>
        );
    };
    
    const TabButton: React.FC<{active: boolean, onClick: () => void, children: React.ReactNode}> = ({ active, onClick, children }) => {
        const base = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors";
        const activeStyle = "bg-cyan-600/50 text-white";
        const inactiveStyle = "text-gray-400 hover:bg-gray-700";
        return <button onClick={onClick} className={`${base} ${active ? activeStyle : inactiveStyle}`}>{children}</button>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <header className="text-center">
                <div className="inline-block bg-gray-800 p-2 rounded-full mb-4">
                    <CommunityIcon className="h-10 w-10 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-bold text-gray-100">개미 광장</h2>
                <p className="text-gray-400 max-w-3xl mx-auto">다른 개미들은 어떤 종목을 보고 있을까요? 집단지성의 힘으로 숨은 보석을 찾아보세요.</p>
            </header>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 p-1 bg-gray-800/80 rounded-lg">
                   <TabButton active={sortBy === 'hot'} onClick={() => setSortBy('hot')}><FireIcon className="h-5 w-5"/>인기순</TabButton>
                   <TabButton active={sortBy === 'new'} onClick={() => setSortBy('new')}><SparklesIcon className="h-5 w-5"/>최신순</TabButton>
                </div>
                <button
                    onClick={() => setEditingPost({} as CommunityPost)} // Open form for new post
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition duration-200 ${buttonClass}`}
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>글쓰기</span>
                </button>
            </div>

            {renderContent()}

            <PostFormModal
                isOpen={!!editingPost}
                onClose={handleFormClose}
                onSave={handleSavePost}
                marketTarget={marketTarget}
                editingPost={editingPost && editingPost.id ? editingPost : null}
            />
        </div>
    );
};