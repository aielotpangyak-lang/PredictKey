import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Activity, MapPin, Clock, ChevronRight, Zap, Target, Star, Users, Info, Search, Lock, Timer } from 'lucide-react';
import { CricketMatch } from '../types';

interface CricketPredictionViewProps {
  cricketMatches: CricketMatch[];
  hasAccess: boolean;
  onPurchase: () => void;
}

const CountdownTimer: React.FC<{ targetDate: Date }> = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference <= 0) return null;

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) return <span className="text-red-500 font-black">MATCH STARTED</span>;

  return (
    <div className="flex gap-2">
      {timeLeft.days > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-lg font-black text-white leading-none">{timeLeft.days}</span>
          <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Days</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className="text-lg font-black text-white leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Hrs</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-black text-white leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Min</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-lg font-black text-white leading-none text-emerald-500">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Sec</span>
      </div>
    </div>
  );
};

const CricketPredictionView: React.FC<CricketPredictionViewProps> = ({ cricketMatches, hasAccess, onPurchase }) => {
  const [selectedMatch, setSelectedMatch] = useState<CricketMatch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMatches = cricketMatches.filter(m => 
    m.teams[0].name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.teams[1].name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.league?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canAccessMatch = (match: CricketMatch) => {
    if (match.status === 'live' || match.status === 'finished') return true;
    if (!match.time) return true;
    const diff = match.time.getTime() - new Date().getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours <= 2; // Can access if match is within 2 hours
  };

  const showWhoWillWin = (match: CricketMatch) => {
    if (match.status === 'live' || match.status === 'finished') return true;
    if (!match.time) return true;
    const diff = match.time.getTime() - new Date().getTime();
    const hours = diff / (1000 * 60 * 60);
    return hours <= 1; // Show who will win if match is within 1 hour
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Cricket Prediction</h1>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">AI-Powered Match Insights</p>
        </div>
        <div className="bg-emerald-500/10 p-3 rounded-2xl">
          <Activity size={24} className="text-emerald-500" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-emerald-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search matches, teams or leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151619] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-white/10"
          />
        </div>
      </div>

      {/* Match List */}
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Clock size={16} className="text-emerald-500" /> Matches
          </h2>
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {filteredMatches.length} Results
          </div>
        </div>

        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const accessible = canAccessMatch(match);
            return (
              <motion.div
                key={match.id}
                whileTap={accessible ? { scale: 0.98 } : {}}
                onClick={() => accessible && setSelectedMatch(match)}
                className={`bg-[#151619] border border-white/10 rounded-3xl p-5 space-y-4 relative overflow-hidden group transition-all ${!accessible ? 'opacity-60 grayscale' : 'hover:border-emerald-500/30'}`}
              >
                {match.isLive && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-red-500/20 text-red-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Live
                  </div>
                )}

                {!accessible && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-10">
                    <Lock size={24} className="text-white/40 mb-2" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">
                      Unlocks in {Math.ceil((match.time.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) - 2} Days
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <img src={match.teams[0].logo} alt={match.teams[0].name} className="w-10 h-10 rounded-full bg-white/5 object-cover border border-white/10 mx-auto mb-1" />
                      <div className="text-[10px] font-black text-white uppercase tracking-widest">{match.teams[0].name}</div>
                    </div>
                    <div className="text-2xl font-black text-white/5 uppercase tracking-widest italic">VS</div>
                    <div className="text-center">
                      <img src={match.teams[1].logo} alt={match.teams[1].name} className="w-10 h-10 rounded-full bg-white/5 object-cover border border-white/10 mx-auto mb-1" />
                      <div className="text-[10px] font-black text-white uppercase tracking-widest">{match.teams[1].name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-white">{match.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                      {match.time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                    {match.league && (
                      <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-2 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                        {match.league}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <MapPin size={12} className="text-emerald-500" />
                      {match.venue.split(',')[0]}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      <Zap size={12} className="text-emerald-500" />
                      Ready
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-white/20 group-hover:text-emerald-500 transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setSelectedMatch(null)} className="bg-white/5 p-2 rounded-full text-white/40">
                <ChevronRight size={24} className="rotate-180" />
              </button>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Match Analysis</h3>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-10">
              {/* Countdown Section */}
              {selectedMatch.status === 'upcoming' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    <Timer size={14} /> Match Starts In
                  </div>
                  <CountdownTimer targetDate={selectedMatch.time} />
                </div>
              )}

              {/* Match Header */}
              <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 text-center space-y-6">
                <div className="flex items-center justify-center gap-8">
                  <div className="space-y-2">
                    <img src={selectedMatch.teams[0].logo} alt={selectedMatch.teams[0].name} className="w-20 h-20 rounded-full bg-white/5 object-cover border-2 border-white/10 mx-auto" />
                    <div className="text-xs font-black text-white uppercase tracking-widest">{selectedMatch.teams[0].name}</div>
                  </div>
                  <div className="text-3xl font-black text-white/10 uppercase tracking-widest italic">VS</div>
                  <div className="space-y-2">
                    <img src={selectedMatch.teams[1].logo} alt={selectedMatch.teams[1].name} className="w-20 h-20 rounded-full bg-white/5 object-cover border-2 border-white/10 mx-auto" />
                    <div className="text-xs font-black text-white uppercase tracking-widest">{selectedMatch.teams[1].name}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {selectedMatch.venue}
                  </div>
                  {selectedMatch.league && (
                    <div className="text-xs font-black text-emerald-500 uppercase tracking-widest">
                      {selectedMatch.league}
                    </div>
                  )}
                </div>
              </div>

              {!hasAccess ? (
                <div className="bg-[#151619] border border-white/10 rounded-3xl p-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto">
                    <Zap size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">AI Predictions Locked</h3>
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                      Purchase an active plan to unlock high-accuracy AI predictions for this match.
                    </p>
                  </div>
                  <button 
                    onClick={onPurchase}
                    className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    Unlock Now
                  </button>
                </div>
              ) : (
                <>
                  {/* Who Will Win - Only show if within 1 day */}
                  {showWhoWillWin(selectedMatch) && selectedMatch.predictions?.whoWillWin && (
                    <div className="bg-emerald-500 border border-emerald-400 rounded-3xl p-6 text-center space-y-2 shadow-lg shadow-emerald-500/20">
                      <div className="text-[10px] font-black text-white/60 uppercase tracking-widest">AI Final Verdict</div>
                      <div className="text-2xl font-black text-white uppercase tracking-tight">
                        {selectedMatch.predictions.whoWillWin} to Win
                      </div>
                    </div>
                  )}

                  {/* Win Probability */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Win Probability</h4>
                    <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 space-y-4">
                      <div className="flex justify-between text-xs font-black text-white uppercase tracking-widest mb-2">
                        <span>{selectedMatch.teams[0].name}</span>
                        <span>{selectedMatch.teams[1].name}</span>
                      </div>
                      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedMatch.predictions?.winProbability[selectedMatch.teams[0].name]}%` }}
                          className="h-full bg-emerald-500"
                        />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${selectedMatch.predictions?.winProbability[selectedMatch.teams[1].name]}%` }}
                          className="h-full bg-white/10"
                        />
                      </div>
                      <div className="flex justify-between text-xl font-black text-white mt-2">
                        <span className="text-emerald-500">{selectedMatch.predictions?.winProbability[selectedMatch.teams[0].name]}%</span>
                        <span className="text-white/40">{selectedMatch.predictions?.winProbability[selectedMatch.teams[1].name]}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Key Player Predictions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#151619] border border-white/10 rounded-3xl p-5 space-y-3">
                      <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-500 w-fit">
                        <Star size={16} />
                      </div>
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Top Batsman</div>
                      <div className="text-sm font-bold text-white">{selectedMatch.predictions?.topBatsman}</div>
                    </div>
                    <div className="bg-[#151619] border border-white/10 rounded-3xl p-5 space-y-3">
                      <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-500 w-fit">
                        <Target size={16} />
                      </div>
                      <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Top Bowler</div>
                      <div className="text-sm font-bold text-white">{selectedMatch.predictions?.topBowler}</div>
                    </div>
                  </div>

                  {/* Other Predictions */}
                  <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Trophy size={18} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Toss Prediction</span>
                      </div>
                      <span className="text-xs font-bold text-white">{selectedMatch.predictions?.tossPrediction}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users size={18} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Expected Score</span>
                      </div>
                      <span className="text-xs font-bold text-white">{selectedMatch.predictions?.expectedScoreRange}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl">
                <Info size={16} className="text-white/20 shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                  Predictions are based on AI analysis of historical data and current form. Results are not guaranteed. Play responsibly.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CricketPredictionView;
