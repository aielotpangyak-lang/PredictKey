import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { PlanProvider } from './PlanContext';
import { ThemeProvider } from './ThemeContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { Loader2, Wrench } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [appSettings, setAppSettings] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'app'), (doc) => {
      if (doc.exists()) {
        setAppSettings(doc.data());
      } else {
        setAppSettings({ maintenanceMode: false });
      }
    });
    return () => unsub();
  }, []);

  if (loading || !appSettings) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center transition-colors duration-500">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  if (appSettings?.maintenanceMode && user?.email !== 'aielotpangyak@gmail.com') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center transition-colors duration-500">
        <Wrench className="text-orange-500 mb-6" size={64} />
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Under Maintenance</h1>
        <p className="text-slate-600 dark:text-white/60 max-w-md">
          We are currently performing scheduled maintenance. Please check back later.
        </p>
      </div>
    );
  }

  return user ? <Dashboard /> : <Auth />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlanProvider>
          <AppContent />
        </PlanProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
