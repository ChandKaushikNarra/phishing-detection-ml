import React from 'react';
import { motion } from 'framer-motion';
import { Target, Award, Activity, Percent, Database, Zap, Sparkles, TrendingUp } from 'lucide-react';

export const KPICards: React.FC = () => {
  const metrics = [
    {
      title: 'Model Accuracy',
      value: '98.25%',
      sub: 'Classification accuracy',
      icon: Award,
      color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/20 text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.1)]',
    },
    {
      title: 'ROC-AUC',
      value: '99.97%',
      sub: 'Area under ROC curve',
      icon: TrendingUp,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/20 text-blue-400',
      glow: 'shadow-[0_0_20px_rgba(59,130,246,0.1)]',
    },
    {
      title: 'Precision Score',
      value: '97.80%',
      sub: 'False positive rate limiter',
      icon: Target,
      color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/20 text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.1)]',
    },
    {
      title: 'Recall Rate',
      value: '98.50%',
      sub: 'Sensitivity (phishing caught)',
      icon: Activity,
      color: 'from-violet-500/20 to-fuchsia-500/10 border-violet-500/20 text-violet-400',
      glow: 'shadow-[0_0_20px_rgba(139,92,246,0.1)]',
    },
    {
      title: 'F1-Score',
      value: '98.15%',
      sub: 'Harmonic mean of P & R',
      icon: Percent,
      color: 'from-purple-500/20 to-pink-500/10 border-purple-500/20 text-purple-400',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.1)]',
    },
    {
      title: 'Cross-Validation',
      value: '95.18%',
      sub: '10-fold cross-val mean',
      icon: Sparkles,
      color: 'from-amber-500/20 to-orange-500/10 border-amber-500/20 text-amber-400',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)]',
    },
    {
      title: 'Dataset Size',
      value: '570 URLs',
      sub: 'Hybrid training set snapshot',
      icon: Database,
      color: 'from-slate-500/20 to-slate-700/10 border-slate-500/20 text-slate-300',
      glow: 'shadow-[0_0_20px_rgba(100,116,139,0.05)]',
    },
    {
      title: 'Best Classifier',
      value: 'Random Forest',
      sub: 'Ensemble model selected',
      icon: Zap,
      color: 'from-rose-500/20 to-red-500/10 border-rose-500/20 text-rose-400',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.1)]',
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full"
    >
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;

        return (
          <motion.div
            key={index}
            variants={cardVariants}
            whileHover={{ scale: 1.02, y: -2 }}
            className={`p-5 rounded-xl border bg-gradient-to-br glass-card glass-card-hover ${metric.color} ${metric.glow}`}
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {metric.title}
              </span>
              <div className="p-1.5 rounded-lg bg-slate-900/60 border border-white/5">
                <IconComponent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white mb-1">
              {metric.value}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
              {metric.sub}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
