import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, Loader2 } from 'lucide-react';

interface LoadingStepperProps {
  isLoading: boolean;
  onComplete: () => void;
  modelName?: string;
}

interface Step {
  id: number;
  label: string;
}

export const LoadingStepper: React.FC<LoadingStepperProps> = ({
  isLoading,
  onComplete,
  modelName = 'Random Forest'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps: Step[] = [
    { id: 1, label: 'Cleaning URL...' },
    { id: 2, label: 'Extracting Features...' },
    { id: 3, label: `Running ${modelName}...` },
    { id: 4, label: 'Computing Prediction...' }
  ];

  useEffect(() => {
    if (!isLoading) {
      setCurrentStep(0);
      setCompletedSteps([]);
      return;
    }

    let stepTimer1: any;
    let stepTimer2: any;
    let stepTimer3: any;
    let stepTimer4: any;

    // Step 1: Clean URL immediately
    setCurrentStep(1);

    // Step 2: Extract Features after 500ms
    stepTimer1 = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, 1]);
      setCurrentStep(2);
    }, 600);

    // Step 3: Run Model after 1200ms
    stepTimer2 = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, 2]);
      setCurrentStep(3);
    }, 1300);

    // Step 4: Compute Prediction after 2000ms
    stepTimer3 = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, 3]);
      setCurrentStep(4);
    }, 2000);

    // Complete loader after 2700ms
    stepTimer4 = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, 4]);
      onComplete();
    }, 2700);

    return () => {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
    };
  }, [isLoading, onComplete]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cyber-bg/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-card max-w-md w-full p-8 rounded-2xl flex flex-col items-center text-center border-white/10"
      >
        {/* Animated Cyber Shield Spinner */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            className="w-16 h-16 rounded-full border-t-2 border-r-2 border-blue-500 flex items-center justify-center"
          >
            <Shield className="w-8 h-8 text-blue-500" />
          </motion.div>
        </div>

        <h3 className="text-xl font-bold tracking-wide text-white mb-2">Analyzing URL Risk</h3>
        <p className="text-sm text-slate-400 mb-6">Running heuristics & machine learning classifiers...</p>

        {/* Stepper Container */}
        <div className="w-full space-y-4 text-left">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = currentStep === step.id;

            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-500/10 border-blue-500/30 text-white font-medium shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400/90'
                    : 'bg-transparent border-transparent text-slate-500'
                }`}
              >
                {/* Step Indicator Icon */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </motion.div>
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-xs">
                      {step.id}
                    </div>
                  )}
                </div>

                <span className="text-sm tracking-wide">{step.label}</span>
              </div>
            );
          })}
        </div>

        {/* Scanning Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-6 overflow-hidden">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
            className="bg-blue-500 h-full shadow-[0_0_8px_#3b82f6]"
          />
        </div>
      </motion.div>
    </div>
  );
};
