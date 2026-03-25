import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, ChevronLeft, CheckCircle2, Clock, Youtube, Instagram, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';

interface GiveawayViewProps {
  profile: UserProfile;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const GiveawayView: React.FC<GiveawayViewProps> = ({ profile, onBack, showToast }) => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Subscribe to YouTube', icon: Youtube, color: 'text-red-500', completed: false },
    { id: 2, name: 'Comment on Instagram', icon: Instagram, color: 'text-pink-500', completed: false },
  ]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(17, 0, 0, 0); // 5 PM
      
      // Check for live announcement window (4:55 PM to 4:59:59 PM)
      const liveStart = new Date();
      liveStart.setHours(16, 55, 0, 0);
      const liveEnd = new Date();
      liveEnd.setHours(16, 59, 59, 999);
      
      setIsLive(now >= liveStart && now <= liveEnd);

      if (now > target) target.setDate(target.getDate() + 1);
      
      const diff = target.getTime() - now.getTime();
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    
    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft();
    return () => clearInterval(timer);
  }, []);

  const [verifyingTaskId, setVerifyingTaskId] = useState<number | null>(null);

  const handleTaskComplete = async (id: number) => {
    if (verifyingTaskId) return;
    setVerifyingTaskId(id);

    try {
      // Simulate uploading a screenshot and sending to backend
      const response = await fetch('/api/verify-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: profile.id, 
          taskId: id, 
          screenshotBase64: 'dummy_base64_data' 
        })
      });

      const data = await response.json();

      if (data.success) {
        const updatedTasks = tasks.map(t => t.id === id ? { ...t, completed: true } : t);
        setTasks(updatedTasks);
        if (updatedTasks.every(t => t.completed)) {
          setIsEligible(true);
          showToast('You are now eligible for the daily giveaway!');
        }
      } else {
        showToast(data.message);
      }
    } catch (error) {
      console.error('Verification error:', error);
      showToast('Failed to verify task. Please try again.');
    } finally {
      setVerifyingTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Trophy className="text-pink-500" /> Daily Giveaway
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {isLive ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 dark:bg-white rounded-3xl p-8 text-white dark:text-slate-900 shadow-2xl shadow-pink-500/20 text-center relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full"></div> Live Announcement
            </div>
            <h3 className="text-4xl font-black mb-4">Picking Winner...</h3>
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map(i => (
                <motion.div 
                  key={i}
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                  className="w-10 h-14 bg-white/10 dark:bg-slate-100 rounded-lg flex items-center justify-center text-2xl font-black"
                >
                  ?
                </motion.div>
              ))}
            </div>
            <p className="text-white/60 dark:text-slate-500 font-bold uppercase tracking-widest text-sm">Winner will be revealed at 5:00 PM</p>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/20 to-transparent pointer-events-none"></div>
        </motion.div>
      ) : (
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-3xl p-8 text-white shadow-xl shadow-pink-500/20 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-4xl font-black mb-2">₹1,000 + 1 Month Pro</h3>
            <p className="text-white/80 mb-6">Winner announced live every day at 5:00 PM!</p>
            
            <div className="bg-black/20 rounded-2xl p-6 backdrop-blur-sm inline-block">
              <div className="text-sm font-bold mb-2 text-white/60 uppercase tracking-widest">Next Draw In</div>
              <div className="text-5xl font-mono font-black tracking-tight">{timeLeft}</div>
            </div>
          </div>
          <Trophy className="absolute -left-10 -bottom-10 text-white/10 w-64 h-64" />
        </div>
      )}

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle className="text-emerald-500" /> Eligibility Tasks
        </h3>
        <p className="text-sm text-slate-500 dark:text-white/60 mb-6">Complete all tasks below to enter the daily draw. Verified by AI.</p>
        
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between bg-slate-50 dark:bg-black/50 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-[#151619] shadow-sm ${task.color}`}>
                  <task.icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{task.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-white/40">Required for entry</p>
                </div>
              </div>
              <button
                onClick={() => handleTaskComplete(task.id)}
                disabled={task.completed || verifyingTaskId === task.id}
                className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${task.completed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'}`}
              >
                {verifyingTaskId === task.id ? 'Verifying...' : task.completed ? <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Verified</span> : 'Complete'}
              </button>
            </div>
          ))}
        </div>

        {isEligible && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
            <h4 className="font-bold text-emerald-500">You are eligible!</h4>
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">Tune in between 4:55 PM and 4:59 PM for the live announcement.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GiveawayView;
