import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronDown, ChevronUp, HelpCircle, Zap, ShieldCheck, Wallet, PlayCircle } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, icon }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 flex items-center justify-between text-left focus:outline-none"
      >
        <div className="flex items-center gap-3">
          {icon && <div className="text-emerald-500">{icon}</div>}
          <span className="font-bold text-slate-900 dark:text-white text-sm">{question}</span>
        </div>
        {isOpen ? (
          <ChevronUp size={18} className="text-slate-400 dark:text-white/40" />
        ) : (
          <ChevronDown size={18} className="text-slate-400 dark:text-white/40" />
        )}
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-5 pb-5 pt-0 text-slate-600 dark:text-white/60 text-xs leading-relaxed border-t border-slate-100 dark:border-white/5 mt-2 pt-4">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FAQViewProps {
  onBack: () => void;
}

export const FAQView: React.FC<FAQViewProps> = ({ onBack }) => {
  const gameplayFAQs = [
    {
      question: "How does the AI prediction work?",
      answer: "Our AI analysis tool uses advanced algorithms to scan historical patterns and real-time game data. It identifies recurring trends to provide high-probability predictions for colors and numbers.",
      icon: <Zap size={18} />
    },
    {
      question: "What are Wingo game modes?",
      answer: "We support four time-based WinGo variations: 30 Seconds, 1 Minute, 3 Minutes, and 5 Minutes. Each mode has its own trend analysis and prediction engine optimized for its specific speed.",
      icon: <PlayCircle size={18} />
    },
    {
      question: "Is the accuracy 100%?",
      answer: "No prediction tool can guarantee 100% accuracy. Our AI provides high-probability analysis based on statistical data. We recommend using it as a secondary validation tool for your own strategies.",
      icon: <ShieldCheck size={18} />
    },
    {
      question: "What is the daily prediction limit?",
      answer: "Your daily limit depends on your active plan (Basic, Standard, or Premium). You can track your usage in the Profile section. Limits reset every 24 hours.",
      icon: <HelpCircle size={18} />
    }
  ];

  const depositFAQs = [
    {
      question: "How do I deposit funds?",
      answer: "Go to the Wallet section, click 'Deposit', choose an amount, and complete the UPI payment. After payment, you MUST submit the 12-digit UTR (Transaction ID) for verification.",
      icon: <Wallet size={18} />
    },
    {
      question: "What is the minimum deposit amount?",
      answer: "The minimum deposit amount is ₹500. Deposits below this amount may not be processed or may face delays in verification.",
      icon: <Wallet size={18} />
    },
    {
      question: "How long does verification take?",
      answer: "Manual verification for deposits and plan purchases typically takes 5-30 minutes during business hours. In some cases, it may take up to 2 hours.",
      icon: <ShieldCheck size={18} />
    },
    {
      question: "Why was my deposit rejected?",
      answer: "Common reasons for rejection include: Incorrect UTR number, UTR already used, payment mismatch, or missing screenshot Evidence. Please contact Support if you believe this is an error.",
      icon: <HelpCircle size={18} />
    }
  ];

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="text-emerald-500" /> Help & FAQ
        </h2>
        <button onClick={onBack} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest mb-4 ml-2">Gameplay & Predictions</h3>
          <div className="space-y-3">
            {gameplayFAQs.map((faq, index) => (
              <FAQItem key={index} {...faq} />
            ))}
          </div>
        </div>

        <div className="pt-4">
          <h3 className="text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest mb-4 ml-2">Deposits & Payments</h3>
          <div className="space-y-3">
            {depositFAQs.map((faq, index) => (
              <FAQItem key={index} {...faq} />
            ))}
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center mt-8">
          <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">Still have questions?</p>
          <p className="text-xs text-slate-600 dark:text-white/60 mb-4 leading-relaxed">
            Our support team is available 24/7 to help you with any issues.
          </p>
          <a 
            href="https://t.me/PredictorHelpBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold px-6 py-3 rounded-xl transition-all border border-blue-500/20"
          >
            Contact Customer Support
          </a>
        </div>
      </div>
    </div>
  );
};
