import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LayoutDashboard, BarChart3, Info, ExternalLink } from 'lucide-react';
import { CyberBackground } from './components/CyberBackground';
import { Dashboard } from './pages/Dashboard';
import { StatsDashboard } from './pages/StatsDashboard';
import { AboutProject } from './pages/AboutProject';

type ActivePage = 'dashboard' | 'stats' | 'about';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Scanner Dashboard', icon: LayoutDashboard },
    { id: 'stats', label: 'Model Statistics', icon: BarChart3 },
    { id: 'about', label: 'Technical Details', icon: Info },
  ] as const;

  return (
    <div className="min-h-screen flex flex-col relative text-slate-100 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Dynamic Animated Canvas Grid Background */}
      <CyberBackground />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0B1120]/75 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Title */}
          <div 
            onClick={() => setActivePage('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="relative p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 group-hover:border-blue-500/40 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all">
              <Shield className="w-5 h-5 text-blue-500 group-hover:scale-105 transition-transform" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white uppercase block leading-none">
                AI.PHISH
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 block">
                DETECTOR
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activePage === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all select-none cursor-pointer ${
                    isActive
                      ? 'text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 border border-blue-500/30 bg-blue-600/5 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.1)] -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MAIN CONTENT PORTAL */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {activePage === 'dashboard' && <Dashboard />}
            {activePage === 'stats' && <StatsDashboard />}
            {activePage === 'about' && <AboutProject />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-white/5 bg-slate-950/20 backdrop-blur-sm py-6 relative z-10 mt-12 text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            &copy; {new Date().getFullYear()} Phishing URL Detection System. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 border-r border-white/5 pr-4 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              FastAPI Integration Online
            </span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-350 transition-colors flex items-center gap-1"
            >
              Docs Repository
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
