

import React from 'react';

export const Disclaimer: React.FC = () => {
    return (
        <footer className="w-full mt-12 text-center text-xs text-gray-500 px-4 py-6 border-t border-gray-800">
            <p className="mb-2">
                <strong>법적 고지 (Disclaimer):</strong> '직투'는 직장인 투자자의 성공적인 투자를 돕기 위해 개발된 AI 기반 분석 보조 도구입니다.
                본 서비스는 정보 제공 및 투자 아이디어 탐색을 목적으로 하며, 투자 결정에 대한 조언으로 간주되어서는 안 됩니다.
            </p>
            <p>
                AI의 분석은 시장 데이터와 통계에 기반한 확률적 예측이며, 언제나 틀릴 가능성을 내포하고 있습니다. 모든 투자 결정과 그에 따른 책임은 전적으로 사용자 본인에게 있습니다.
            </p>
        </footer>
    );
};