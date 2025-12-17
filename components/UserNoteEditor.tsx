
import React, { useState, useEffect } from 'react';
import type { UserNote } from '../types';
import { EditIcon, CheckCircleIcon } from './icons';

interface UserNoteEditorProps {
    userNote?: UserNote;
    onSave: (note: UserNote) => void;
}

export const UserNoteEditor: React.FC<UserNoteEditorProps> = ({ userNote, onSave }) => {
    const [content, setContent] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        setContent(userNote?.content || '');
        setIsPublic(userNote?.isPublic || false);
        setIsSaved(false); // Reset saved status when note changes
    }, [userNote]);

    const handleSave = () => {
        onSave({ content, isPublic });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000); // Hide confirmation after 2 seconds
    };

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 sm:p-6 mt-8">
            <div className="flex items-center gap-3 mb-4">
                <EditIcon className="h-6 w-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-gray-100">나의 투자 노트</h3>
            </div>
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full p-3 bg-gray-900/70 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-white placeholder-gray-500"
                placeholder="AI 분석에 대한 당신의 생각, 반박, 또는 추가적인 인사이트를 기록하여 투자 전략을 완성하세요."
            />
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <label htmlFor="isPublicToggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="isPublicToggle"
                                className="sr-only"
                                checked={isPublic}
                                onChange={() => setIsPublic(!isPublic)}
                            />
                            <div className={`block w-12 h-6 rounded-full ${isPublic ? 'bg-cyan-500' : 'bg-gray-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isPublic ? 'transform translate-x-6' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm text-gray-300">
                            토론장에 공개하기
                        </div>
                    </label>
                </div>
                <button
                    onClick={handleSave}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:from-cyan-600 hover:to-blue-700 transition-colors"
                >
                    {isSaved ? <CheckCircleIcon className="h-5 w-5" /> : <EditIcon className="h-5 w-5" />}
                    <span>{isSaved ? '저장 완료!' : '노트 저장'}</span>
                </button>
            </div>
        </div>
    );
};
