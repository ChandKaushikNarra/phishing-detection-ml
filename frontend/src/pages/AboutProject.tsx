import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Layers, GitFork, Cpu, ShieldCheck } from 'lucide-react';

export const AboutProject: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'models' | 'features' | 'imbalance' | 'api'>('models');

  const tabs = [
    { id: 'models', label: 'ML Classifiers', icon: Brain },
    { id: 'features', label: 'Feature Engineering', icon: Layers },
    { id: 'imbalance', label: 'Imbalance (SMOTE)', icon: GitFork },
    { id: 'api', label: 'Architecture & API', icon: Cpu },
  ] as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'models':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Random Forest & XGBoost Classifiers</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              The core detection pipeline utilizes two state-of-the-art classifier models trained in a competitive setup. During the compilation step (<code>src/train.py</code>), both models are trained and their scores are compared to pick the best-performing estimator for serialization.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">Random Forest</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  An ensemble decision tree classifier. It fits multiple decision tree estimators on sub-samples of the dataset and uses averaging to improve accuracy and control over-fitting. In this project, it excels at learning non-linear structures from handcrafted features like brand positions and typosquat indicators.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">XGBoost (Extreme Gradient Boosting)</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  A high-efficiency gradient-boosted decision tree algorithm. It optimizes a regularized objective function, iteratively training trees that correct the errors of previous trees. It provides exceptionally fast training times and robust feature scoring.
                </p>
              </div>
            </div>
          </motion.div>
        );
      case 'features':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">TF-IDF & Handcrafted Features</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              Phishing detection requires analyzing both semantic strings and structural patterns. Our pipeline extracts a rich feature set using a hybrid extraction approach:
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">TF-IDF Character N-Grams (2 to 3)</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The URL string is split into character-level n-grams (sub-sequences of length 2 and 3). <strong>Term Frequency-Inverse Document Frequency (TF-IDF)</strong> weights these tokens, capturing character distributions. This flags strange character clustering often found in machine-generated phishing links.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">Handcrafted Structural Features</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  In addition to character n-grams, the system extracts 16 numeric features: URL length, hyphen density, digit presence, subdomain hierarchy depths, suspicious top-level domains, and brand similarity indices (using visual typo-matching, normalized edit distances, and subdomain brand injections).
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-white/5">
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-1">Chi-Square Feature Selection</span>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Combining TF-IDF with handcrafted features creates a high-dimensional sparse matrix. The pipeline uses <code>SelectKBest</code> with chi-square stats to select the top features (default 500+), eliminating noise and boosting model speed during inference.
                </p>
              </div>
            </div>
          </motion.div>
        );
      case 'imbalance':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                <GitFork className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Class Imbalance & SMOTE</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              Cybersecurity datasets are frequently heavily skewed. Legitimate URLs (from Tranco ranking feeds) are abundant, whereas active, fresh phishing feeds (from OpenPhish) can be smaller. Training on imbalanced classes causes machine learning models to favor the majority class (predicting everything is legitimate).
            </p>

            <div className="p-4 rounded-xl bg-slate-900 border border-white/5">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider block mb-1">SMOTE (Synthetic Minority Over-sampling Technique)</span>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                To balance the classes, we apply <strong>SMOTE</strong>. Instead of duplicating phishing instances, SMOTE generates <em>synthetic</em> instances along the line segments joining k-nearest minority neighbors.
              </p>
              <div className="p-3 rounded bg-slate-950/70 border border-white/5 font-mono text-[11px] text-amber-300/80">
                # Applied strictly on training subsets to prevent data leakage:
                <br />
                from imblearn.over_sampling import SMOTE
                <br />
                smote = SMOTE(random_state=42)
                <br />
                x_train_resampled, y_train_resampled = smote.fit_resample(x_train, y_train)
              </div>
            </div>
          </motion.div>
        );
      case 'api':
        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">System Architecture & FastAPI</h3>
            </div>
            
            <p className="text-sm text-slate-300 leading-relaxed">
              This system splits operations between a high-efficiency machine learning backend built in Python and a premium React frontend client.
            </p>

            <div className="relative border-l-2 border-slate-700 ml-4 pl-6 space-y-6 text-xs">
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-slate-950" />
                <span className="font-semibold text-white block mb-1">1. User Search & Dev Proxy</span>
                <span className="text-slate-400">User submits a URL. The React dev server proxies the endpoint request to bypass CORS restrictions.</span>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-cyan-500 border-2 border-slate-950" />
                <span className="font-semibold text-white block mb-1">2. FastAPI Router Execution</span>
                <span className="text-slate-400">FastAPI parses the URL. It runs custom high-confidence regex rules and spelling comparisons (like typosquatting checks) immediately.</span>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-violet-500 border-2 border-slate-950" />
                <span className="font-semibold text-white block mb-1">3. ML Inference (Scikit-Learn)</span>
                <span className="text-slate-400">If heuristic rules do not force a bypass, features are scaled, combined with the vectorizer sparse matrix, and passed to the serialized RandomForest classifier.</span>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-950" />
                <span className="font-semibold text-white block mb-1">4. JSON Response Compile</span>
                <span className="text-slate-400">FastAPI compiles prediction classes, probability percentages, feature logs, and risk indicators into a single structured JSON response.</span>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-500" />
          About Phishing Detection ML Engine
        </h2>
        <p className="text-sm text-slate-400">
          Explore the machine learning modeling, TF-IDF text features, and synthetic resampling pipeline driving the classification checks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Navigation Tabs */}
        <div className="lg:col-span-4 space-y-2">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-600/10 border-blue-500/30 text-white font-medium shadow-[0_0_20px_rgba(37,99,235,0.08)]'
                    : 'bg-slate-900/40 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <TabIcon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="text-sm tracking-wide">{tab.label}</span>
              </button>
            );
          })}

          <div className="p-4 rounded-xl bg-slate-900/20 border border-white/5 text-center mt-6">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Security Status</span>
            <div className="flex items-center justify-center gap-1 text-emerald-400 font-semibold text-xs bg-emerald-500/5 py-1 px-3 rounded-lg border border-emerald-500/10">
              <ShieldCheck className="w-4 h-4" />
              ML Pipelines Verified
            </div>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="lg:col-span-8 glass-card p-6 rounded-2xl border-white/5 bg-slate-900/10 backdrop-blur-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};
