import React from 'react';

interface ShieldGraphicProps {
  className?: string;
  status?: 'safe' | 'danger' | 'warning' | 'scanning';
}

export const ShieldGraphic: React.FC<ShieldGraphicProps> = ({ className = '', status = 'scanning' }) => {
  const getColors = () => {
    switch (status) {
      case 'safe':
        return {
          glow: 'rgba(34, 197, 94, 0.4)',
          primary: '#22C55E',
          secondary: '#15803d',
          laser: 'rgba(34, 197, 94, 0.8)',
        };
      case 'danger':
        return {
          glow: 'rgba(239, 68, 68, 0.4)',
          primary: '#EF4444',
          secondary: '#B91C1C',
          laser: 'rgba(239, 68, 68, 0.8)',
        };
      case 'warning':
        return {
          glow: 'rgba(245, 158, 11, 0.4)',
          primary: '#F59E0B',
          secondary: '#B45309',
          laser: 'rgba(245, 158, 11, 0.8)',
        };
      case 'scanning':
      default:
        return {
          glow: 'rgba(37, 99, 235, 0.3)',
          primary: '#3B82F6',
          secondary: '#1D4ED8',
          laser: 'rgba(59, 130, 246, 0.8)',
        };
    }
  };

  const colors = getColors();

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Background Outer Glow Grid */}
      <div
        className="absolute inset-0 rounded-full blur-3xl opacity-20 transition-all duration-700"
        style={{
          backgroundColor: colors.glow,
          transform: 'scale(1.2)',
        }}
      />

      {/* SVG Graphic */}
      <svg
        width="160"
        height="180"
        viewBox="0 0 160 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 animate-float"
      >
        <defs>
          {/* Main Shield Gradients */}
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          
          <linearGradient id="glowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.2" />
          </linearGradient>

          {/* Hexagon Pattern */}
          <pattern id="hexagons" width="16" height="27.71" patternUnits="userSpaceOnUse" patternTransform="scale(0.8)">
            <path
              d="M8 0 L16 4.62 L16 13.86 L8 18.48 L0 13.86 L0 4.62 Z"
              fill="none"
              stroke={colors.primary}
              strokeWidth="0.5"
              strokeOpacity="0.12"
            />
            <path
              d="M0 27.71 L8 23.09 L16 27.71"
              fill="none"
              stroke={colors.primary}
              strokeWidth="0.5"
              strokeOpacity="0.12"
            />
          </pattern>

          {/* Dynamic Laser Filter */}
          <filter id="glowFilter">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shield Outer Outline */}
        <path
          d="M80 10 L140 35 V85 C140 125 115 155 80 170 C45 155 20 125 20 85 V35 L80 10 Z"
          fill="url(#shieldGrad)"
          stroke="url(#glowGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Inner Shield Mesh Fill */}
        <path
          d="M80 18 L132 40 V85 C132 120 110 147 80 160 C50 147 28 120 28 85 V40 L80 18 Z"
          fill="url(#hexagons)"
        />

        {/* Shield Internal Decals (Crosshair/Dividers) */}
        <path
          d="M80 20 V158"
          stroke={colors.primary}
          strokeWidth="1"
          strokeOpacity="0.15"
          strokeDasharray="4 4"
        />
        <path
          d="M30 85 H130"
          stroke={colors.primary}
          strokeWidth="1"
          strokeOpacity="0.15"
          strokeDasharray="4 4"
        />

        {/* Scanning Laser Animation Line */}
        {status === 'scanning' && (
          <g>
            <rect x="22" width="116" height="2" fill={colors.laser} filter="url(#glowFilter)">
              <animate
                attributeName="y"
                values="35;155;35"
                dur="3s"
                repeatCount="indefinite"
              />
            </rect>
            {/* Additional glowing halo under laser */}
            <rect x="22" width="116" height="15" fill={colors.primary} fillOpacity="0.08" filter="url(#glowFilter)">
              <animate
                attributeName="y"
                values="28;148;28"
                dur="3s"
                repeatCount="indefinite"
              />
            </rect>
          </g>
        )}

        {/* Core Lock / Keyhole / Shield Icon Overlay */}
        <g transform="translate(68, 70)" stroke={colors.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {status === 'safe' && (
            // Big Checkmark
            <path d="M5 18 L11 24 L21 10" stroke={colors.primary} strokeWidth="3" />
          )}
          {status === 'danger' && (
            // Danger X
            <g strokeWidth="3">
              <path d="M6 6 L18 18" />
              <path d="M18 6 L6 18" />
            </g>
          )}
          {status === 'warning' && (
            // Alert Exclamation
            <g strokeWidth="3">
              <path d="M12 5 V15" />
              <circle cx="12" cy="21" r="1" fill={colors.primary} />
            </g>
          )}
          {status === 'scanning' && (
            // Animated Radar Rings
            <g>
              <circle cx="12" cy="12" r="8" fill="none" strokeWidth="2" strokeOpacity="0.8">
                <animate attributeName="r" values="3;10;3" dur="2s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="12" cy="12" r="3" fill={colors.primary} />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
