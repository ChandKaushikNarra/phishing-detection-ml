import React, { useEffect, useState } from 'react';


interface RiskMeterProps {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export const RiskMeter: React.FC<RiskMeterProps> = ({ riskLevel }) => {
  const [rotation, setRotation] = useState(-90); // default to far left (Start)

  const getRiskConfig = () => {
    switch (riskLevel) {
      case 'Low':
        return {
          color: 'text-emerald-500',
          bgGlow: 'rgba(34, 197, 94, 0.15)',
          angle: -67.5,
          desc: 'Minimal features matching phishing structures. Website appears safe to browse.',
        };
      case 'Medium':
        return {
          color: 'text-amber-500',
          bgGlow: 'rgba(245, 158, 11, 0.15)',
          angle: -22.5,
          desc: 'Some suspicious signals matching phishing keywords or structure detected. Exercise caution.',
        };
      case 'High':
        return {
          color: 'text-orange-500',
          bgGlow: 'rgba(249, 115, 22, 0.15)',
          angle: 22.5,
          desc: 'High correlation with phishing campaigns. Avoid submitting sensitive credentials.',
        };
      case 'Critical':
        return {
          color: 'text-rose-500',
          bgGlow: 'rgba(239, 68, 68, 0.2)',
          angle: 67.5,
          desc: 'High-confidence indicator matching brand spoofing or typosquatting rules. Danger of credential theft.',
        };
      default:
        return {
          color: 'text-blue-500',
          bgGlow: 'rgba(59, 130, 246, 0.15)',
          angle: -67.5,
          desc: 'Unknown risk classification.',
        };
    }
  };

  const config = getRiskConfig();

  useEffect(() => {
    // Smooth transition rotation on render
    const timer = setTimeout(() => {
      setRotation(config.angle);
    }, 300);
    return () => clearTimeout(timer);
  }, [config.angle]);

  return (
    <div className="flex flex-col items-center p-6 rounded-2xl glass-card border-white/5 h-full justify-between">
      <div className="w-full text-center">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Threat Assessment</h4>
      </div>

      <div className="relative w-64 h-32 flex items-end justify-center overflow-hidden mt-2">
        {/* Arc Background Gauge */}
        <svg width="220" height="120" viewBox="0 0 220 120" className="absolute">
          <defs>
            <linearGradient id="gaugeColors" x1="0" y1="0" x2="1" y2="0">
              <stop offset="10%" stopColor="#22C55E" /> {/* Low */}
              <stop offset="35%" stopColor="#F59E0B" /> {/* Medium */}
              <stop offset="65%" stopColor="#F97316" /> {/* High */}
              <stop offset="90%" stopColor="#EF4444" /> {/* Critical */}
            </linearGradient>
            
            <filter id="needleGlow">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Thick track gauge */}
          <path
            d="M 20 110 A 90 90 0 0 1 200 110"
            fill="none"
            stroke="#1E293B"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Glowing gradient color guide track */}
          <path
            d="M 20 110 A 90 90 0 0 1 200 110"
            fill="none"
            stroke="url(#gaugeColors)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>

        {/* Needle Indicator Container */}
        <div
          className="absolute bottom-0 w-2 h-24 origin-bottom transition-all duration-[1500ms] cubic-bezier(0.2, 0.8, 0.2, 1)"
          style={{
            transform: `rotate(${rotation}deg)`,
            bottom: '10px',
          }}
        >
          {/* Laser-like Needle */}
          <div
            className="w-1 h-20 mx-auto rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{
              background: 'linear-gradient(to top, rgba(255, 255, 255, 0.2), #FFFFFF)',
              boxShadow: '0 0 10px #3B82F6',
            }}
          />
        </div>

        {/* Needle center pin cap */}
        <div className="absolute bottom-0 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-lg" style={{ bottom: '-2px' }}>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
      </div>

      {/* Numerical Labels for sectors */}
      <div className="flex justify-between w-56 text-[10px] font-bold text-slate-500 mt-2 px-1">
        <span>LOW</span>
        <span>MEDIUM</span>
        <span>HIGH</span>
        <span>CRITICAL</span>
      </div>

      {/* Dynamic Threat Result Box */}
      <div className="text-center mt-4 w-full">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-white/5 shadow-inner mb-2">
          <span className="text-xs text-slate-400">Risk Level:</span>
          <span className={`text-xs font-bold uppercase tracking-wider ${config.color}`}>
            {riskLevel}
          </span>
        </div>
        <p className="text-xs text-slate-400 px-4 leading-relaxed mt-1">
          {config.desc}
        </p>
      </div>
    </div>
  );
};
