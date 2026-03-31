import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, History, Info, ChevronRight, Zap, Target, Star, Users, Search, Filter, BarChart2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StockPrediction } from '../types';

const StockPredictionView: React.FC = () => {
  const [stocks, setStocks] = useState<StockPrediction[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockPrediction | null>(null);
  const [activeFilter, setActiveFilter] = useState<'popular' | 'gainers' | 'watchlist'>('popular');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Mock long-term stocks data
    const mockStocks: StockPrediction[] = [
      {
        id: '1',
        name: 'Reliance Industries',
        symbol: 'RELIANCE',
        currentPrice: 2985.40,
        changePercent: 1.25,
        signal: 'Buy',
        confidence: 88,
        insights: {
          trend: 'Long-term Bullish',
          entry: 2950,
          exit: 4500, // Long-term target
          support: 2500,
          resistance: 5000,
          history: Array.from({ length: 10 }).map((_, i) => ({ date: `Year ${i+1}`, price: 2000 + i * 300 }))
        }
      },
      {
        id: '2',
        name: 'TATA Consultancy Services',
        symbol: 'TCS',
        currentPrice: 4120.15,
        changePercent: -0.85,
        signal: 'Hold',
        confidence: 65,
        insights: {
          trend: 'Stable Growth',
          entry: 4000,
          exit: 6000,
          support: 3500,
          resistance: 7000,
          history: Array.from({ length: 10 }).map((_, i) => ({ date: `Year ${i+1}`, price: 3500 + i * 250 }))
        }
      },
      {
        id: '3',
        name: 'HDFC Bank',
        symbol: 'HDFCBANK',
        currentPrice: 1745.60,
        changePercent: 2.15,
        signal: 'Buy',
        confidence: 92,
        insights: {
          trend: 'Strong Long-term Bullish',
          entry: 1700,
          exit: 3000,
          support: 1500,
          resistance: 3500,
          history: Array.from({ length: 10 }).map((_, i) => ({ date: `Year ${i+1}`, price: 1200 + i * 180 }))
        }
      }
    ];
    setStocks(mockStocks);
  }, []);

  const filteredStocks = stocks.filter(s => 
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.symbol.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (activeFilter === 'popular' ? true : activeFilter === 'gainers' ? s.changePercent > 0 : true)
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Stock Prediction</h1>
        <div className="bg-white/5 p-2 rounded-full">
          <BarChart2 size={20} className="text-emerald-500" />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="px-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
          <input 
            type="text" 
            placeholder="Search stocks..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#151619] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['popular', 'gainers', 'watchlist'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter as any)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                activeFilter === filter 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Stock List */}
      <div className="px-4 space-y-4">
        {filteredStocks.map((stock) => (
          <motion.div
            key={stock.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedStock(stock)}
            className="bg-[#151619] border border-white/10 rounded-3xl p-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="bg-white/5 p-3 rounded-2xl group-hover:bg-emerald-500/10 transition-colors">
                <Target size={20} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{stock.symbol}</div>
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">{stock.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-white">₹{stock.currentPrice.toLocaleString()}</div>
              <div className={`text-[10px] font-black uppercase tracking-widest flex items-center justify-end gap-1 ${
                stock.changePercent > 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {stock.changePercent > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {stock.changePercent > 0 ? '+' : ''}{stock.changePercent}%
              </div>
            </div>
            <div className="ml-4 pl-4 border-l border-white/5 text-right">
              <div className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                stock.signal === 'Buy' ? 'bg-emerald-500/20 text-emerald-500' :
                stock.signal === 'Hold' ? 'bg-amber-500/20 text-amber-500' :
                'bg-red-500/20 text-red-500'
              }`}>
                {stock.signal}
              </div>
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">
                {stock.confidence}% Conf.
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stock Details Modal */}
      <AnimatePresence>
        {selectedStock && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setSelectedStock(null)} className="bg-white/5 p-2 rounded-full text-white/40">
                <ChevronRight size={24} className="rotate-180" />
              </button>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Stock Insight</h3>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-10">
              {/* Stock Header */}
              <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{selectedStock.symbol}</h2>
                  <p className="text-xs font-bold text-white/40 uppercase tracking-widest">{selectedStock.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white tracking-tighter">₹{selectedStock.currentPrice.toLocaleString()}</div>
                  <div className={`text-xs font-black uppercase tracking-widest ${
                    selectedStock.changePercent > 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {selectedStock.changePercent > 0 ? '+' : ''}{selectedStock.changePercent}%
                  </div>
                </div>
              </div>

              {/* Signal and Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-3xl p-6 space-y-2 ${
                  selectedStock.signal === 'Buy' ? 'bg-emerald-500/10 border border-emerald-500/20' :
                  selectedStock.signal === 'Hold' ? 'bg-amber-500/10 border border-amber-500/20' :
                  'bg-red-500/10 border border-red-500/20'
                }`}>
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Investment Strategy</div>
                  <div className={`text-3xl font-black tracking-tighter ${
                    selectedStock.signal === 'Buy' ? 'text-emerald-500' :
                    selectedStock.signal === 'Hold' ? 'text-amber-500' :
                    'text-red-500'
                  }`}>{selectedStock.signal}</div>
                </div>
                <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 space-y-2">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Long-Term Confidence</div>
                  <div className="text-3xl font-black text-white tracking-tighter">{selectedStock.confidence}%</div>
                </div>
              </div>

              {/* Performance Graph */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Long-Term Growth</h4>
                <div className="bg-[#151619] border border-white/10 rounded-3xl p-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedStock.insights.history}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#151619', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#10b981', fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ display: 'none' }}
                      />
                      <Area type="monotone" dataKey="price" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Insights */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#151619] border border-white/10 rounded-3xl p-5 space-y-3">
                  <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-500 w-fit">
                    <ShieldCheck size={16} />
                  </div>
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Entry Price</div>
                  <div className="text-sm font-bold text-white">₹{selectedStock.insights.entry}</div>
                </div>
                <div className="bg-[#151619] border border-white/10 rounded-3xl p-5 space-y-3">
                  <div className="bg-red-500/20 p-2 rounded-xl text-red-500 w-fit">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Target Price</div>
                  <div className="text-sm font-bold text-white">₹{selectedStock.insights.exit}</div>
                </div>
                <div className="bg-[#151619] border border-white/10 rounded-3xl p-5 space-y-3">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Support</div>
                  <div className="text-sm font-bold text-white">₹{selectedStock.insights.support}</div>
                </div>
                <div className="bg-[#151619] border border-white/10 rounded-3xl p-5 space-y-3">
                  <div className="text-[10px] font-black text-white/30 uppercase tracking-widest">Resistance</div>
                  <div className="text-sm font-bold text-white">₹{selectedStock.insights.resistance}</div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl">
                <Info size={16} className="text-white/20 shrink-0 mt-0.5" />
                <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest leading-relaxed">
                  Stock market investments are subject to market risks. AI signals are assistive and based on technical analysis. Consult a financial advisor before trading.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StockPredictionView;
