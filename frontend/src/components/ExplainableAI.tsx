import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, AlertOctagon, ShieldAlert, Sparkles, AlertCircle, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import type { PredictionResponse } from '../types';

interface ExplainableAIProps {
  result: PredictionResponse;
}

export const ExplainableAI: React.FC<ExplainableAIProps> = ({ result }) => {
  const { prediction, detected_features, rule_triggered, model, probability, registered_domain, subdomain } = result;

  const getHeaderIcon = () => {
    switch (prediction) {
      case 'Phishing':
        return <AlertOctagon className="w-6 h-6 text-rose-500" />;
      case 'Legitimate':
        return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
      case 'Uncertain':
        return <HelpCircle className="w-6 h-6 text-amber-500" />;
      default:
        return <BrainCircuit className="w-6 h-6 text-blue-400" />;
    }
  };

  const getExplanationSummary = () => {
    if (prediction === 'Phishing') {
      if (rule_triggered !== 'none' && rule_triggered !== 'low_confidence') {
        const ruleNames: Record<string, string> = {
          subdomain_attack_rule: 'Subdomain Attack Rule',
          strong_phishing_rule: 'Strong Phishing Safeguard',
          typo_rule: 'Typosquatting Detection Heuristic',
          keyword_phishing_rule: 'Phishing Keyword Abuse Rule',
        };
        const ruleName = ruleNames[rule_triggered] || rule_triggered;
        return `Heuristic Safeguard Override: This URL triggered a high-confidence security filter (${ruleName}). The system immediately flagged it as Phishing to bypass the base machine learning model and prevent credential theft.`;
      }
      return `Machine Learning Decision: The ${model} classifier evaluated character-level TF-IDF n-grams and handcrafted features, predicting a ${(probability * 100).toFixed(1)}% likelihood of phishing.`;
    } else if (prediction === 'Legitimate') {
      return `Model Consensus: The ${model} model analyzed the URL and calculated a low phishing probability of ${(probability * 100).toFixed(1)}%. No phishing patterns or typosquatting safeguards were triggered.`;
    } else {
      return `Confidence Threshold Alert: The model returned a borderline phishing probability of ${(probability * 100).toFixed(1)}%. Because this is near the classification threshold, it has been flagged as Uncertain. Use extreme caution.`;
    }
  };

  return (
    <div className="glass-card p-6 rounded-2xl border-white/5 bg-slate-900/20 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-4">
        <div className="p-2.5 rounded-xl bg-slate-900 border border-white/5">
          {getHeaderIcon()}
        </div>
        <div>
          <h3 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
            Explainable AI (XAI) Reasoning
            <Sparkles className="w-4 h-4 text-blue-400" />
          </h3>
          <p className="text-xs text-slate-400">Understanding why the model reached this classification</p>
        </div>
      </div>

      {/* Model Decision Block */}
      <div className="p-4 rounded-xl bg-slate-950/65 border border-white/5 mb-5">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />
          Decision Path
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          {getExplanationSummary()}
        </p>
      </div>

      {/* Trigger Details */}
      {prediction === 'Phishing' && (
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            Detected Threat Indicators ({detected_features.length})
          </div>
          
          {detected_features.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detected_features.map((feature, idx) => (
                <motion.div
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/10 text-xs text-rose-300/90"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                  <span className="font-semibold">{feature}:</span>
                  <span className="text-slate-400 font-normal">
                    {feature === 'Typosquatting' && 'Visual typo mimicking a popular brand.'}
                    {feature === 'Brand Impersonation' && 'Known brand name found in unauthorized position.'}
                    {feature === 'Suspicious TLD' && 'Uses a TLD highly associated with fraud.'}
                    {feature === 'Subdomain Attack' && 'Trusted name hidden in subdomain to confuse users.'}
                    {feature === 'Multiple Hyphens' && 'Overused dashes to stack brand keywords.'}
                    {feature === 'Suspicious Keywords' && 'Urgent keywords (login, bank, verify) detected.'}
                    {feature === 'Suspicious Keyword Combination' && 'Combinations like secure-login or verify-account found.'}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-slate-900/60 text-xs text-slate-400 text-center">
              No single standalone rule triggered, but the combined multi-feature TF-IDF model classified it as high-risk.
            </div>
          )}
        </div>
      )}

      {prediction === 'Legitimate' && (
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Safety Verification Summary
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-300/80">
              <span className="font-semibold block mb-1">No Brand Mismatch</span>
              The registered domain matches legitimate registrar entries and is not attempting to spoof a known trademark.
            </div>
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-300/80">
              <span className="font-semibold block mb-1">Clean Domain Hierarchy</span>
              No subdomain trickery detected. The subdomain hierarchy is simple and conforms to normal routing standards.
            </div>
          </div>
        </div>
      )}

      {prediction === 'Uncertain' && (
        <div className="p-3.5 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs text-amber-300/80 flex gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-1">Manual Audit Advised</span>
            The classifier could not safely classify this URL. The URL structure is unusual, but doesn't trigger clear spoofing heuristics. Do not enter passwords or personal data unless you have verified the source.
          </div>
        </div>
      )}

      {/* Target Identity Box */}
      <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-white/5 text-slate-400">
          <span className="text-slate-500">Registered Domain:</span>
          <span className="font-semibold text-slate-300">{registered_domain || 'None (Local/IP)'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-white/5 text-slate-400">
          <span className="text-slate-500">Subdomain:</span>
          <span className="font-semibold text-slate-300">{subdomain || 'None'}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-white/5 text-slate-400">
          <span className="text-slate-500">Model Engine:</span>
          <span className="font-semibold text-slate-300">{model}</span>
        </div>
      </div>
    </div>
  );
};
