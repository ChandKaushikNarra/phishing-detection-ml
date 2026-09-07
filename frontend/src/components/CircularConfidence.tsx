import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CircularConfidenceProps {
  confidence: number;
  prediction: 'Phishing' | 'Legitimate' | 'Uncertain' | 'Invalid Input';
}

export const CircularConfidence: React.FC<CircularConfidenceProps> = ({ confidence, prediction }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate value from 0 to target confidence on render
    const timer = setTimeout(() => {
      setProgress(confidence);
    }, 200);
    return () => clearTimeout(timer);
  }, [confidence]);

  const radius = 60;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    switch (prediction) {
      case 'Legitimate':
        return {
          stroke: '#22C55E', // success
          glow: 'rgba(34, 197, 94, 0.3)',
          text: 'text-emerald-400',
        };
      case 'Phishing':
        return {
          stroke: '#EF4444', // danger
          glow: 'rgba(239, 68, 68, 0.3)',
          text: 'text-rose-500',
        };
      case 'Uncertain':
        return {
          stroke: '#F59E0B', // warning
          glow: 'rgba(245, 158, 11, 0.3)',
          text: 'text-amber-500',
        };
      default:
        return {
          stroke: '#3B82F6', // primary
          glow: 'rgba(59, 130, 246, 0.3)',
          text: 'text-blue-400',
        };
    }
  };

  const colors = getColor();

  return (
    <div className="relative flex flex-col items-center justify-center w-40 h-40">
      <svg className="transform -rotate-90 w-36 h-36" viewBox="0 0 140 140">
        <defs>
          <filter id="circleGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Gray Background Track */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke="#1E293B"
          strokeWidth={strokeWidth}
        />

        {/* Glow Active Ring */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round"
          style={{ filter: 'url(#circleGlow)' }}
          opacity={0.3}
        />

        {/* Solid Active Ring */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          fill="transparent"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>

      {/* Percentage Center Text */}
      <div className="absolute flex flex-col items-center justify-center">
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={`text-2xl font-bold tracking-tight ${colors.text}`}
        >
          {progress.toFixed(2)}%
        </motion.span>
        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mt-0.5">
          Confidence
        </span>
      </div>
    </div>
  );
};
