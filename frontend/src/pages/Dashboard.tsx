import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShieldAlert, ShieldCheck, HelpCircle, Loader2, ArrowRight, RefreshCw, Trash2, History } from 'lucide-react';
import { getPrediction } from '../services/api';
import type { PredictionResponse, ScanHistoryItem } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ShieldGraphic } from '../components/ShieldGraphic';
import { LoadingStepper } from '../components/LoadingStepper';
import { CircularConfidence } from '../components/CircularConfidence';
import { RiskMeter } from '../components/RiskMeter';
import { FeatureGrid } from '../components/FeatureGrid';
import { ExplainableAI } from '../components/ExplainableAI';

export const Dashboard: React.FC = () => {
  const [urlInput, setUrlInput] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempResult, setTempResult] = useState<PredictionResponse | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  
  // Persist scan history locally
  const [history, setHistory] = useLocalStorage<ScanHistoryItem[]>('phish_history', []);

  // Quick demo links
  const demoUrls = [
    'google.com',
    'github.com',
    'g00gle.com',
    'secure-login-google.com',
    'login.google.com.evil.xyz',
  ];

  const handleScan = async (urlToScan: string) => {
    if (!urlToScan.trim()) return;
    
    setLoading(true);
    setApiError(null);
    setTempResult(null);

    try {
      const response = await getPrediction(urlToScan);
      setTempResult(response);
    } catch (err: any) {
      setApiError(err.message || 'Server error, check FastAPI status');
      setLoading(false);
    }
  };

  const handleStepperComplete = () => {
    if (tempResult) {
      setResult(tempResult);
      
      // Update scan history
      setHistory((prev) => {
        // Exclude duplicate inputs to keep logs clean
        const filtered = prev.filter((item) => item.url.toLowerCase() !== tempResult.url.toLowerCase());
        const newItem: ScanHistoryItem = {
          id: Math.random().toString(36).substr(2, 9),
          url: tempResult.url,
          prediction: tempResult.prediction,
          risk_level: tempResult.risk_level,
          confidence: tempResult.confidence,
          timestamp: Date.now(),
        };
        return [newItem, ...filtered].slice(0, 8); // cap history logs at 8
      });
    }
    setLoading(false);
  };

  const handleDemoClick = (url: string) => {
    setUrlInput(url);
    handleScan(url);
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="space-y-12">
      {/* Loading sequence step wrapper */}
      <LoadingStepper
        isLoading={loading}
        onComplete={handleStepperComplete}
        modelName={tempResult?.model || 'Random Forest'}
      />

      {/* HERO SECTION */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-10 py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl text-center lg:text-left space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 tracking-wide">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            AI Cybersecurity Engine v1.0
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            AI-Powered Phishing <br />
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
              URL Detection System
            </span>
          </h1>
          <p className="text-base text-slate-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
            Analyze website links and evaluate phishing risks instantly. Our model parses structural heuristics, 
            spell variances, and character distributions using character-level TF-IDF and Random Forest Classifiers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-shrink-0"
        >
          {/* Animated Shield Graphic matching scan outcome */}
          <ShieldGraphic
            status={
              loading
                ? 'scanning'
                : result?.prediction === 'Phishing'
                ? 'danger'
                : result?.prediction === 'Legitimate'
                ? 'safe'
                : result?.prediction === 'Uncertain'
                ? 'warning'
                : 'scanning'
            }
          />
        </motion.div>
      </div>

      {/* URL INPUT & SEARCH SECTION */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="w-full max-w-3xl mx-auto glass-card p-6 rounded-2xl border-white/5 bg-slate-900/15"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan(urlInput);
          }}
          className="relative flex items-center"
        >
          <div className="absolute left-4 text-slate-500 pointer-events-none">
            <Search className="w-6 h-6" />
          </div>
          
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Enter Website URL (e.g. login.google.com)..."
            className="w-full py-4 pl-12 pr-32 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-inner text-sm tracking-wide transition-all"
          />

          <button
            type="submit"
            disabled={loading || !urlInput.trim()}
            className="absolute right-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)] tracking-wide flex items-center gap-1.5 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing
              </>
            ) : (
              <>
                Scan Link
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {apiError && (
          <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {apiError}
          </div>
        )}

        {/* DEMO BUTTONS */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Quick Demos:
          </span>
          {demoUrls.map((url, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDemoClick(url)}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-850 hover:border-blue-500/30 transition-all font-mono"
            >
              {url}
            </button>
          ))}
        </div>
      </motion.div>

      {/* SCAN RESULTS CONTAINER */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {/* Split Gauges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
              {/* Confidence Circle (Left) */}
              <div className="md:col-span-4 glass-card p-6 rounded-2xl border-white/5 flex flex-col items-center justify-center text-center bg-slate-900/20 backdrop-blur-md">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Inference Confidence</h4>
                
                <CircularConfidence
                  confidence={result.confidence}
                  prediction={result.prediction}
                />

                <div className="mt-4 space-y-1">
                  <div className={`text-lg font-extrabold tracking-wide uppercase flex items-center justify-center gap-1.5 ${
                    result.prediction === 'Phishing'
                      ? 'text-rose-500'
                      : result.prediction === 'Legitimate'
                      ? 'text-emerald-400'
                      : 'text-amber-500'
                  }`}>
                    {result.prediction === 'Phishing' && <ShieldAlert className="w-5 h-5" />}
                    {result.prediction === 'Legitimate' && <ShieldCheck className="w-5 h-5" />}
                    {result.prediction === 'Uncertain' && <HelpCircle className="w-5 h-5" />}
                    {result.prediction}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wide truncate max-w-[200px]">
                    {result.url}
                  </p>
                </div>
              </div>

              {/* Risk Meter Speedometer (Center) */}
              <div className="md:col-span-4">
                <RiskMeter riskLevel={result.risk_level} />
              </div>

              {/* Explainable AI block (Right) */}
              <div className="md:col-span-4">
                <ExplainableAI result={result} />
              </div>
            </div>

            {/* Preprocessed Features status check grid */}
            <FeatureGrid features={result.features} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOW IT WORKS DIAGRAM */}
      <div className="glass-card p-6 rounded-2xl border-white/5 bg-slate-900/10">
        <div className="mb-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin-slow" />
            URL Classification Pipeline
          </h3>
          <p className="text-xs text-slate-400">Step-by-step logical sequence executed by the FastAPI python server</p>
        </div>

        {/* Dynamic Pipeline Nodes layout */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mt-2 px-4 py-2 bg-slate-950/40 rounded-xl border border-white/5">
          {/* Node 1 */}
          <div className="flex flex-col items-center p-3 w-36 text-center">
            <span className="text-xs font-bold text-blue-400">Input URL</span>
            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Raw string query</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 rotate-90 lg:rotate-0" />

          {/* Node 2 */}
          <div className="flex flex-col items-center p-3 w-36 text-center">
            <span className="text-xs font-bold text-purple-400">1. Cleaning</span>
            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Strip protocols/www</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 rotate-90 lg:rotate-0" />

          {/* Node 3 */}
          <div className="flex flex-col items-center p-3 w-36 text-center">
            <span className="text-xs font-bold text-pink-400">2. TF-IDF Matrix</span>
            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Char n-grams (2,3)</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 rotate-90 lg:rotate-0" />

          {/* Node 4 */}
          <div className="flex flex-col items-center p-3 w-36 text-center">
            <span className="text-xs font-bold text-amber-400">3. Handcrafting</span>
            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">16 structural features</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 rotate-90 lg:rotate-0" />

          {/* Node 5 */}
          <div className="flex flex-col items-center p-3 w-36 text-center">
            <span className="text-xs font-bold text-rose-500">4. Ensemble ML</span>
            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Random Forest check</span>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-600 rotate-90 lg:rotate-0" />

          {/* Node 6 */}
          <div className="flex flex-col items-center p-3 w-36 text-center">
            <span className="text-xs font-bold text-emerald-400">Prediction</span>
            <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Classification payload</span>
          </div>
        </div>
      </div>

      {/* RECENT SCANS SECTION */}
      {history.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              Recent Scan Logs
            </h3>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Logs
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/20 backdrop-blur-md">
            <table className="min-w-full divide-y divide-white/5 text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="px-6 py-4">Scanned URL</th>
                  <th scope="col" className="px-6 py-4">Threat Assessment</th>
                  <th scope="col" className="px-6 py-4">Confidence</th>
                  <th scope="col" className="px-6 py-4">Risk Rating</th>
                  <th scope="col" className="px-6 py-4 text-right">Scan Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-slate-300">
                <AnimatePresence>
                  {history.map((item) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="px-6 py-4 font-normal text-slate-400 max-w-sm truncate">
                        {item.url}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${
                          item.prediction === 'Phishing'
                            ? 'text-rose-500'
                            : item.prediction === 'Legitimate'
                            ? 'text-emerald-400'
                            : 'text-amber-500'
                        }`}>
                          {item.prediction}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.confidence.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          item.risk_level === 'Critical'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : item.risk_level === 'High'
                            ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                            : item.risk_level === 'Medium'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {item.risk_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {formatTimestamp(item.timestamp)}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
