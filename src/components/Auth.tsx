import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Loader2, Send, KeyRound } from 'lucide-react';

export const Auth: React.FC = () => {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'otp'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, label: '', color: 'bg-slate-200' };
    if (password.length < 6) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (password.length < 10) return { score: 2, label: 'Fair', color: 'bg-yellow-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      if (view === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (view === 'register') {
        // Send OTP to email
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send OTP');
        }
        
        setMessage('OTP sent to your email. Please check your Inbox and Spam folder.');
        setView('otp');
      } else if (view === 'otp') {
        // Verify OTP
        const response = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Invalid OTP');
        }
        
        // OTP is valid, create account
        if (referralCode) {
          sessionStorage.setItem('pendingReferralCode', referralCode.trim().toUpperCase());
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (view === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setMessage('Password reset email sent. Please check your inbox.');
      }
    } catch (err: any) {
      if (view === 'login') {
        setError('User not found or password is wrong.');
      } else {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.message?.includes('Invalid credential')) {
          setError('User not found or password is wrong.');
        } else if (err.code === 'auth/email-already-in-use') {
          setError('Email is already in use.');
        } else {
          setError(err.message || 'An error occurred');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0a0a0a] p-4 transition-colors duration-500">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
            {view === 'login' ? 'Welcome Back' : view === 'register' ? 'Create Account' : view === 'otp' ? 'Verify Email' : 'Reset Password'}
          </h1>
          <p className="text-slate-500 dark:text-white/50 text-sm">
            {view === 'login' ? 'Sign in to access your dashboard' : view === 'register' ? 'Join PredictKey Pro today' : view === 'otp' ? 'Enter the 6-digit code sent to your email' : 'Enter your email to receive a reset link'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {view !== 'otp' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="name@example.com"
                  required
                />
              </div>
              {view !== 'forgot' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="••••••••"
                    required={view !== 'forgot'}
                  />
                  {view === 'register' && password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} transition-all duration-300`} style={{ width: `${(strength.score / 3) * 100}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${strength.score === 1 ? 'text-red-500' : strength.score === 2 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                        {strength.label}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {view === 'register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2">Referral Code (Optional)</label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors uppercase"
                    placeholder="ABC123"
                  />
                </div>
              )}

              {view === 'login' && (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-200 dark:border-white/10 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="rememberMe" className="text-sm text-slate-500 dark:text-white/50">Remember Me</label>
                </div>
              )}
            </>
          )}

          {view === 'otp' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 dark:text-white/40 uppercase tracking-wider mb-2 text-center">Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-center text-3xl tracking-[0.5em] font-mono text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="000000"
                maxLength={6}
                required
              />
              <div className="flex flex-col items-center gap-2 mt-4">
                <p className="text-xs text-center text-slate-500 dark:text-white/50">
                  Didn't receive the code? Check your Spam folder.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    setError('');
                    setMessage('');
                    try {
                      const response = await fetch('/api/send-otp', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email }),
                      });
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || 'Failed to resend OTP');
                      setMessage('A new OTP has been sent to your email.');
                    } catch (err: any) {
                      setError(err.message || 'An error occurred');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>
          )}
          {message && (
            <p className="text-emerald-500 text-xs bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${view === 'login' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : view === 'register' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20' : view === 'otp' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'} active:scale-95 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg`}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (view === 'login' ? <LogIn size={20} /> : view === 'register' ? <UserPlus size={20} /> : view === 'otp' ? <KeyRound size={20} /> : <Send size={20} />)}
            {view === 'login' ? 'Sign In' : view === 'register' ? 'Create Account' : view === 'otp' ? 'Verify & Register' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setView(view === 'login' ? 'register' : view === 'otp' ? 'register' : 'login')}
              className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
            >
              {view === 'login' ? "Don't have an account? Sign Up" : view === 'register' ? "Already have an account? Sign In" : view === 'otp' ? "Back to Registration" : "Back to Sign In"}
            </button>
            {view === 'login' && (
              <button
                onClick={() => setView('forgot')}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm transition-colors"
              >
                Forgot Password?
              </button>
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-100 dark:border-white/5">
            <p className="text-[10px] text-slate-400 dark:text-white/20 uppercase tracking-widest font-bold mb-3">Support</p>
            <p className="text-xs text-slate-500 dark:text-white/40 mb-4">
              Contact customer care for support:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <a 
                href="https://t.me/PredictKeyHelpBot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold py-2 rounded-lg transition-all border border-blue-500/20"
              >
                <Send size={14} /> Telegram Support
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
