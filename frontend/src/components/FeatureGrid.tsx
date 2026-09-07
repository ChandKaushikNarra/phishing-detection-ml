import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, ShieldAlert, Link, Hash, Compass, HelpCircle, Key, Fingerprint, ShieldX } from 'lucide-react';
import type { PredictionFeatures } from '../types';

interface FeatureGridProps {
  features?: PredictionFeatures;
}

export const FeatureGrid: React.FC<FeatureGridProps> = ({ features }) => {
  if (!features || Object.keys(features).length === 0) return null;

  // Map keys to readable titles and lucide icons
  const featureConfigs: Record<string, { title: string; icon: React.ComponentType<any> }> = {
    url_length: { title: 'URL Length', icon: Link },
    suspicious_keywords: { title: 'Phishing Keywords', icon: Key },
    brand_impersonation: { title: 'Brand Impersonation', icon: Fingerprint },
    typosquatting: { title: 'Typosquatting Check', icon: ShieldAlert },
    subdomain_attack: { title: 'Subdomain Abuse', icon: Compass },
    suspicious_tld: { title: 'TLD Reputation', icon: ShieldX },
    hyphen_density: { title: 'Hyphen Count', icon: Hash },
    registered_domain: { title: 'Registered Domain', icon: Info },
  };

  const getStatusIcon = (status: 'success' | 'warning' | 'danger') => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'danger':
        return <XCircle className="w-5 h-5 text-rose-500" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-500" />;
    }
  };

  const getCardClasses = (status: 'success' | 'warning' | 'danger') => {
    switch (status) {
      case 'success':
        return 'border-emerald-500/10 hover:border-emerald-500/25 hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]';
      case 'warning':
        return 'border-amber-500/10 hover:border-amber-500/25 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]';
      case 'danger':
        return 'border-rose-500/10 hover:border-rose-500/25 hover:shadow-[0_0_20px_rgba(244,63,94,0.08)]';
      default:
        return 'border-white/5 hover:border-blue-500/20';
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          Preprocessed Feature Status
        </h3>
        <p className="text-xs text-slate-400">ML features extracted from the analyzed URL string by preprocess.py</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(featureConfigs).map(([key, config]) => {
          const detail = features[key];
          if (!detail) return null;

          const IconComponent = config.icon;
          const cardClasses = getCardClasses(detail.status);

          return (
            <motion.div
              key={key}
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className={`p-5 rounded-xl bg-slate-900/40 backdrop-blur-md border glass-card transition-all duration-300 ${cardClasses}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="p-2 rounded-lg bg-slate-800/80 border border-white/5 text-slate-300">
                  <IconComponent className="w-5 h-5" />
                </div>
                {getStatusIcon(detail.status)}
              </div>

              <h4 className="text-sm font-semibold tracking-wide text-white">{config.title}</h4>
              
              <div className="my-1.5 inline-block text-[11px] font-bold px-2 py-0.5 rounded bg-slate-950/70 border border-white/5 tracking-wider text-slate-300 uppercase">
                {detail.label}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mt-2 border-t border-white/5 pt-2">
                {detail.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
