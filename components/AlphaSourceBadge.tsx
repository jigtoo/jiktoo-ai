// copy-of-sepa-ai/components/AlphaSourceBadge.tsx
import React from 'react';

export function AlphaSourceBadge({ source }: { source?: 'db'|'hybrid'|'gemini'|'cache' }) {
  if (!source) return null;
  
  const config = {
    db: { color: '#3b82f6', label: 'DB' }, // blue-500
    hybrid: { color: '#22c55e', label: 'HYBRID' }, // green-500
    gemini: { color: '#a855f7', label: 'GEMINI' }, // purple-500
    cache: { color: '#0ea5e9', label: 'CACHE' }, // sky-500
  };
  
  const current = config[source] || config.db;

  return (
    <span style={{ 
      padding: '2px 6px', 
      borderRadius: 4, 
      background: current.color, 
      color: '#fff', 
      fontSize: 12, 
      fontWeight: 'bold',
      textShadow: '1px 1px 1px rgba(0,0,0,0.3)'
    }}>
      ALPHA: {current.label}
    </span>
  );
}