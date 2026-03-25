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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center transition-colors duration-500">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
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
