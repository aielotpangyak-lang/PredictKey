import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { MessageSquare, Send, ChevronLeft } from 'lucide-react';

interface ChatRoomProps {
  onBack: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'chat'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
    return () => unsubscribe();
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !auth.currentUser) return;
    await addDoc(collection(db, 'chat'), {
      text: newMessage,
      userId: auth.currentUser.uid,
      userName: auth.currentUser.email?.split('@')[0] || 'Anonymous',
      timestamp: serverTimestamp(),
    });
    setNewMessage('');
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="text-indigo-500" /> Live Chat
        </h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </button>
      </div>
      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map(m => (
            <div key={m.id} className={`flex flex-col ${m.userId === auth.currentUser?.uid ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-slate-400">{m.userName}</span>
              <div className={`p-3 rounded-2xl ${m.userId === auth.currentUser?.uid ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white'}`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
        <div className="flex gap-2">
          <input 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-slate-100 dark:bg-white/5 rounded-full px-4 py-2"
            placeholder="Type a message..."
          />
          <button onClick={sendMessage} className="bg-indigo-500 text-white rounded-full p-2">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
