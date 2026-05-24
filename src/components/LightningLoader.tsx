import React from 'react';
import { motion } from 'motion/react';
import { Key } from 'lucide-react';

const LightningLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      <div className="relative">
        {/* Abstract Glowing Aura Rings */}
        <motion.div
          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          className="absolute -inset-10 border-2 border-yellow-500 rounded-full"
        />
        <motion.div
          animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: "easeOut" }}
          className="absolute -inset-10 border-2 border-blue-500/50 rounded-full"
        />

        {/* Outer Rotating Segmented Track */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-6 border-4 border-dashed border-yellow-400/30 rounded-full w-[112%] h-[112%] -left-[6%] -top-[6%]"
        />

        {/* Central Premium Glowing Key Core */}
        <motion.div
          animate={{ 
            scale: [0.95, 1.05, 0.95],
            boxShadow: [
              "0 0 20px rgba(234,179,8,0.2)",
              "0 0 50px rgba(59,130,246,0.6)",
              "0 0 20px rgba(234,179,8,0.2)"
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative z-10 flex items-center justify-center w-28 h-28 bg-slate-900 dark:bg-black border-4 border-yellow-400 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.4)]"
        >
          <motion.div
            animate={{ 
              rotateY: [0, 180, 360],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Key className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
          </motion.div>
        </motion.div>
      </div>

      {/* Title & Status Message */}
      <div className="text-center space-y-2">
        <motion.h3 
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-2xl font-black tracking-widest uppercase text-slate-800 dark:text-white"
        >
          Predict <span className="text-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.4)]">Key</span>
        </motion.h3>
        <div className="flex items-center justify-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping" />
          <p className="text-[10px] text-slate-400 dark:text-white/40 font-bold tracking-[0.3em] uppercase">Initializing Secure Engine</p>
        </div>
      </div>
    </div>
  );
};

export default LightningLoader;
