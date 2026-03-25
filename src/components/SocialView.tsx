import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Users, ChevronLeft, UserPlus } from 'lucide-react';
import { UserProfile } from '../types';

interface SocialViewProps {
  onBack: () => void;
}

const SocialView: React.FC<SocialViewProps> = ({ onBack }) => {
  const [friends, setFriends] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'users_public'), where('referredBy', '==', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="text-indigo-500" /> My Network
        </h2>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 dark:text-white/40 dark:hover:text-white text-sm flex items-center gap-1">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        {friends.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-white/40">
            <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
            <p>No referrals yet. Share your code!</p>
          </div>
        ) : (
          friends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
              <span className="font-bold text-slate-900 dark:text-white">{friend.email.split('@')[0]}</span>
              <span className="text-xs text-slate-400">Joined {friend.createdAt?.toDate ? friend.createdAt.toDate().toLocaleDateString() : new Date(friend.createdAt).toLocaleDateString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SocialView;
