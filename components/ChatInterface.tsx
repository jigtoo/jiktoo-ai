


import React, { useState, useRef, useEffect } from 'react';
import type { AnalysisChatMessage } from '../types';
import { SendIcon, UserIcon, LogoIcon } from './icons';

interface ChatInterfaceProps {
    onSendMessage: (message: string) => Promise<void>;
    messages: AnalysisChatMessage[];
    isChatting: boolean;
}

const ChatBubble: React.FC<{ message: AnalysisChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    return (
        <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center p-1">
                    <LogoIcon className="w-full h-full" />
                </div>
            )}
            <div className={`max-w-md lg:max-w-2xl px-4 py-3 rounded-xl shadow ${isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
            </div>
             {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <UserIcon />
                </div>
            )}
        </div>
    );
};


export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onSendMessage, messages, isChatting }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(() => {
        scrollToBottom();
    }, [messages, isChatting]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isChatting) {
            const messageToSend = input.trim();
            setInput('');
            await onSendMessage(messageToSend);
        }
    };

    return (
        <div className="mt-12 animate-fade-in">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-lg">
                <header className="p-4 border-b border-gray-700/50">
                    <h3 className="text-xl font-bold text-center text-gray-100">리포트 관련 추가 질문</h3>
                </header>
                <div className="p-4 sm:p-6 h-96 overflow-y-auto space-y-6">
                    {messages.map((msg, index) => (
                        <ChatBubble key={index} message={msg} />
                    ))}
                    {isChatting && (
                         <div className="flex items-start gap-3 justify-start">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center p-1">
                                <LogoIcon className="w-full h-full" />
                            </div>
                            <div className="max-w-md px-4 py-3 rounded-xl bg-gray-700 text-gray-200 rounded-bl-none">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span>
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <footer className="p-4 border-t border-gray-700/50">
                    <form onSubmit={handleSend} className="flex gap-2 items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="제공된 리포트에 대해 더 물어보세요..."
                            disabled={isChatting}
                            className="w-full px-4 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition duration-200 disabled:opacity-50"
                            aria-label="Chat input"
                        />
                        <button
                            type="submit"
                            disabled={isChatting || !input.trim()}
                            className="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-full shadow-md hover:from-cyan-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send message"
                        >
                            <SendIcon />
                        </button>
                    </form>
                </footer>
            </div>
        </div>
    );
};