import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, ChevronLeft, Send, Bot, User, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { GoogleGenAI } from '@google/genai';

interface AISupportViewProps {
  profile: UserProfile;
  onBack: () => void;
}

const AISupportView: React.FC<AISupportViewProps> = ({ profile, onBack }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your AI Support Assistant. How can I help you today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatSession, setChatSession] = useState<any>(null);

  useEffect(() => {
    // Initialize Gemini Chat Session
    try {
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const chat = ai.chats.create({
          model: "gemini-3-flash-preview",
          config: {
            systemInstruction: "You are a helpful customer support assistant for a prediction-based mobile application called PredictKey Pro. The app features an INR wallet, VIP system, Staking Vaults, Spin the Wheel, and Giveaways. Be concise, polite, and helpful.",
          },
        });
        setChatSession(chat);
      } else {
        console.warn("Gemini API Key not found. Using fallback simulated responses.");
      }
    } catch (error) {
      console.error("Failed to initialize Gemini:", error);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      if (chatSession) {
        const response = await chatSession.sendMessage({ message: userMsg.text });
        setMessages(prev => [...prev, { id: Date.now() + 1, text: response.text || "I'm sorry, I couldn't process that.", sender: 'ai' }]);
      } else {
        // Fallback simulation if no API key
        setTimeout(() => {
          let aiResponse = "I understand. I'm an AI assistant currently in training. For complex issues, I will escalate this to a human admin.";
          
          if (userMsg.text.toLowerCase().includes('withdraw')) {
            aiResponse = "Withdrawals typically take 24-48 hours to process. Minimum withdrawal is ₹500. Can I help you check a specific transaction?";
          } else if (userMsg.text.toLowerCase().includes('deposit')) {
            aiResponse = "You can deposit via UPI or Bank Transfer. If your deposit hasn't reflected, please ensure you've uploaded the correct UTR number and screenshot.";
          } else if (userMsg.text.toLowerCase().includes('vip')) {
            aiResponse = "VIP levels are unlocked based on your total deposits. You can check your progress in the VIP System tab.";
          }

          setMessages(prev => [...prev, { id: Date.now() + 1, text: aiResponse, sender: 'ai' }]);
        }, 1500);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, I'm having trouble connecting right now. Please try again later.", sender: 'ai' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="text-orange-500" /> AI Support
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden flex flex-col">
        <div className="bg-orange-500/10 border-b border-orange-500/20 p-4 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">PredictKey Assistant</h3>
            <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Online
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60' : 'bg-orange-500 text-white'}`}>
                  {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm ${msg.sender === 'user' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-tr-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-white/80 rounded-tl-sm'}`}>
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="flex gap-2 max-w-[80%] flex-row">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-orange-500 text-white">
                  <Bot size={14} />
                </div>
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-white/5 rounded-tl-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-white/10 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-full p-1"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none focus:outline-none px-4 text-sm text-slate-900 dark:text-white"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send size={16} className="ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AISupportView;
