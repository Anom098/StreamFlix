import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
      <svg 
        width="38" 
        height="38" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 4px 10px rgba(212, 175, 55, 0.45))' }}
      >
        <defs>
          <linearGradient id="cyanBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#996515" />
          </linearGradient>
          <linearGradient id="pinkPurpleGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Futuristic 3D Layered Triangle (Play Button) */}
        <polygon 
          points="25,20 85,50 25,80" 
          fill="url(#cyanBlueGrad)" 
          opacity="0.85"
          style={{ transform: 'translate(4px, 4px)' }}
        />
        
        {/* Overlapping Glassmorphic Triangle */}
        <polygon 
          points="20,15 80,45 20,75" 
          fill="url(#pinkPurpleGrad)" 
          style={{ mixBlendMode: 'screen', filter: 'url(#glow)' }}
        />

        {/* Dynamic Curved Ribbon wrapping the Play Button */}
        <path 
          d="M 10,50 C 30,20 70,20 90,50 C 70,80 30,80 10,50 Z" 
          stroke="url(#cyanBlueGrad)" 
          strokeWidth="4" 
          strokeLinecap="round"
          fill="none"
          opacity="0.75"
        />

        {/* Outer glowing center dot */}
        <circle cx="50" cy="45" r="4" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 4px #d4af37)' }} />
      </svg>
      <span 
        style={{ 
          fontSize: '1.45rem', 
          fontWeight: 900, 
          letterSpacing: '-0.03em', 
          background: 'linear-gradient(135deg, #ffffff 30%, #d4af37 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textTransform: 'uppercase'
        }}
      >
        Stream<span style={{ color: '#d4af37', WebkitTextFillColor: 'initial' }}>Flix</span>
      </span>
    </div>
  );
};
