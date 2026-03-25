import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Plan } from './types';

interface PlanContextType {
  activePlan: Plan | null;
  loading: boolean;
}

const PlanContext = createContext<PlanContextType>({
  activePlan: null,
  loading: true,
});

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setActivePlan(null);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'plans'), where('userId', '==', user.uid), where('isActive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const planData = snapshot.docs[0].data() as Plan;
        setActivePlan({ id: snapshot.docs[0].id, ...planData });
      } else {
        setActivePlan(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <PlanContext.Provider value={{ activePlan, loading }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => useContext(PlanContext);
