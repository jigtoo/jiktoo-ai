

import React, { useState, useEffect, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import type { AnalysisChatMessage } from '../types';
import { ChatBotIcon, CloseIcon, SendIcon, LogoIcon, UserIcon } from './icons';

interface PortfolioChatbotProps {
    isOpen: boolean;
    onToggle: () => void;
    messages: AnalysisChatMessage[];
    onSendMessage: (message: string) => Promise<void>;
    isLoading: boolean;
}

const ChatBubble: React.FC<{ message: AnalysisChatMessage }> = React.memo(({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center p-1">
                    <LogoIcon className="w-full h-full" />
                </div>
            )}
            <div className={`max-w-md px-4 py-3 rounded-xl shadow whitespace-pre-wrap leading-relaxed ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                {message.text}
            </div>
             {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <UserIcon />
                </div>
            )}
        </div>
    );
});

export const PortfolioChatbot: React.FC<PortfolioChatbotProps> = ({ isOpen, onToggle, messages, onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fabRef = useRef(null);
    const windowRef = useRef(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            await onSendMessage(input.trim());
            setInput('');
        }
    };
    
    const initialMessage = {
      role: 'model',
      text: "안녕하세요! AI 포트폴리오 상담사입니다. 당신의 포트폴리오 데이터를 완벽하게 파악하고 있습니다.\n\n대화 내용은 자동으로 저장되므로, 창을 닫았다가 다시 열어도 이어서 대화할 수 있습니다. 포트폴리오의 건강 상태, 개별 종목의 리스크, 또는 전략적 조언 등 무엇이든 물어보세요."
    } as AnalysisChatMessage;

    const displayMessages = messages.length === 0 ? [initialMessage] : messages;

    return (
        <>
            <CSSTransition nodeRef={fabRef} in={!isOpen} timeout={300} classNames="fab" unmountOnExit>
                <button
                    ref={fabRef}
                    onClick={onToggle}
                    className="portfolio-chatbot-fab w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-2xl animate-pulse"
                    aria-label="Open portfolio chatbot"
                >
                    <ChatBotIcon className="h-8 w-8" />
                </button>
            </CSSTransition>
            
            <CSSTransition nodeRef={windowRef} in={isOpen} timeout={300} classNames="window" unmountOnExit>
                 <div ref={windowRef} className="portfolio-chatbot-window flex flex-col bg-gray-900/80 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    <header className="flex-shrink-0 p-4 bg-gray-800 flex justify-between items-center border-b border-gray-700">
                        <h3 className="text-lg font-bold text-white">AI 포트폴리오 상담사</h3>
                        <button onClick={onToggle} className="p-1 text-gray-400 hover:text-white rounded-full">
                            <CloseIcon />
                        </button>
                    </header>
                    <div className="flex-grow p-4 space-y-6 overflow-y-auto">
                        {displayMessages.map((msg, index) => <ChatBubble key={index} message={msg} />)}
                        {isLoading && (
                            <div className="flex items-start gap-3 justify-start">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center p-1"><LogoIcon /></div>
                                <div className="max-w-md px-4 py-3 rounded-xl bg-gray-700 text-gray-200">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0s'}}></span>
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></span>
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <footer className="flex-shrink-0 p-3 bg-gray-800/50 border-t border-gray-700">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={isLoading ? "AI가 분석 중입니다..." : "포트폴리오에 대해 질문하세요..."}
                                disabled={isLoading}
                                className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                            >
                                <SendIcon />
                            </button>
                        </form>
                    </footer>
                </div>
            </CSSTransition>
        </>
    );
};