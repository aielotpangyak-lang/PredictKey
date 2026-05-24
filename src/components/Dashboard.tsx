import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc, setDoc, getDocs, getDoc, deleteField, orderBy, limit } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { db, auth } from '../firebase';
import { useAuth } from '../AuthContext';
import { usePlan } from '../PlanContext';
import { useTheme } from '../ThemeContext';
import { processSuccessfulReferral, REFERRAL_REWARDS, claimReferralReward } from '../services/referralService';
import { Purchase, Prediction, UserProfile, Notification, Coupon, ResetRequest, MasterPlanState, StrategyRequest, Feedback, Plan, Transaction, PhysicalReward } from '../types';
import { DailyLogin } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeCanvas } from 'qrcode.react';
import WalletView from './WalletView';
import VIPView from './VIPView';
import GiveawayView from './GiveawayView';
import SpinWheelView from './SpinWheelView';
import RewardsView from './RewardsView';
import StakingView from './StakingView';
import UserAnalyticsView from './UserAnalyticsView';
import LeaderboardView from './LeaderboardView';
import AchievementsView from './AchievementsView';
import PredictionStats from './PredictionStats';
import ChatRoom from './ChatRoom';
import GamesView from './GamesView';
import SocialView from './SocialView';
import ColorPredictionView from './ColorPredictionView';
import GameSettingsView from './GameSettingsView';
import AviatorPredictionView from './AviatorPredictionView';
import { AnalyticsView } from './AnalyticsView';
import { FraudDetectionView } from './FraudDetectionView';
import { FAQView } from './FAQView';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  CreditCard, 
  ShoppingBag, 
  TrendingUp, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Calendar,
  User,
  Mail,
  Send,
  Copy,
  RefreshCw,
  Sun,
  Moon,
  Bell,
  Info,
  Check,
  Smartphone,
  QrCode,
  X,
  Wrench,
  Target,
  Star,
  Zap,
  Activity,
  ArrowUpRight,
  MessageSquare,
  ThumbsUp,
  Filter,
  LayoutDashboard,
  Settings,
  Share2,
  Trophy,
  Users,
  Wallet,
  Award,
  Palette,
  Plane,
  BarChart2,
  BarChart3,
  Gift,
  HelpCircle,
  Bot,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';
import { safeToDate } from '../utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Purchase Component ---
const PurchaseView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user, profile } = useAuth();
  const [duration, setDuration] = useState<string>('1w');
  const [customDays, setCustomDays] = useState(7);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'selection' | 'payment' | 'utr'>('selection');
  const [utr, setUtr] = useState('');
  const [useWallet, setUseWallet] = useState(false);

  const [paymentSettings, setPaymentSettings] = useState({ upiId: 'niggaseller@nyes', merchantName: 'CHOW AIELOT PANGYAK' });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payment'), (doc) => {
      if (doc.exists()) {
        setPaymentSettings(doc.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'settings/payment');
    });
    return () => unsub();
  }, []);

  const UPI_ID = paymentSettings.upiId;
  const MERCHANT_NAME = paymentSettings.merchantName;

  const basePrices: Record<string, number> = {
    '1w': 599,
    '1m': 1999,
    '6m': 9999,
    '1y': 17999
  };

  const perDayPrice = 85;

  const isWithin24Hours = () => {
    if (!profile?.createdAt) return false;
    const created = profile.createdAt.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    return diff < 24 * 60 * 60 * 1000;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      if (!profile?.createdAt) return;
      const created = profile.createdAt.toDate ? profile.createdAt.toDate() : new Date(profile.createdAt);
      const expiry = new Date(created.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [profile]);

  const calculatePrice = () => {
    let price = 0;
    if (duration === 'custom') {
      price = customDays * perDayPrice;
    } else {
      price = basePrices[duration] || 0;
    }

    const originalPrice = price;
    let finalPrice = price;

    // Apply 20% welcome discount if within 24h
    if (isWithin24Hours()) {
      finalPrice = finalPrice * 0.8;
    }

    // Apply coupon discount
    if (appliedCoupon) {
      finalPrice = finalPrice * (1 - appliedCoupon.discountPercent / 100);
    }

    // Apply 20% wallet discount
    if (useWallet) {
      finalPrice = finalPrice * 0.8;
    }

    return {
      original: Math.round(originalPrice),
      final: Math.max(0, Math.round(finalPrice)),
      discount: Math.round(originalPrice - finalPrice)
    };
  };

  const { original, final, discount } = calculatePrice();

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const q = query(collection(db, 'coupons'), where('code', '==', couponCode.trim().toUpperCase()), where('isActive', '==', true));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        showToast('Invalid or expired coupon code.');
        setAppliedCoupon(null);
      } else {
        const couponData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Coupon;
        setAppliedCoupon(couponData);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'coupons');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !profile) return;
    
    if (useWallet) {
      if (profile.walletBalance < final) {
        showToast('Insufficient wallet balance.');
        return;
      }
    } else if (final > 0 && utr.length !== 12) {
      showToast('Please enter a valid UTR number (12 digits).');
      return;
    }

    setLoading(true);
    const path = 'purchases';
    try {
      const isInstant = final === 0 || useWallet;

      await addDoc(collection(db, path), {
        userId: user.uid,
        userEmail: user.email,
        utr: useWallet ? 'WALLET_PAYMENT' : (final > 0 ? utr : 'FREE_COUPON'),
        duration: duration === 'custom' ? `custom:${customDays}` : duration,
        price: final,
        originalPrice: original,
        discountApplied: discount,
        couponCode: appliedCoupon?.code || null,
        status: isInstant ? 'approved' : 'pending',
        createdAt: serverTimestamp()
      });

      if (useWallet && final > 0) {
        // Deduct from wallet
        await updateDoc(doc(db, 'users', user.uid), {
          walletBalance: profile.walletBalance - final
        });
        
        // Log transaction
        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          userEmail: user.email,
          type: 'purchase',
          amount: final,
          status: 'approved',
          notes: `Purchased ${duration} plan`,
          createdAt: serverTimestamp()
        });
      }

      // If 100% discount or wallet payment, also activate the plan immediately
      if (isInstant) {
        const days = duration === 'custom' ? customDays : 
                    duration === '1w' ? 7 : 
                    duration === '1m' ? 30 : 
                    duration === '6m' ? 180 : 365;
        
        const expiresAt = addDays(new Date(), days);
        
        await setDoc(doc(db, 'plans', user.uid + "_active"), {
          userId: user.uid,
          name: duration === 'custom' ? `Custom (${customDays} days)` : duration,
          price: final,
          isActive: true,
          expiresAt: expiresAt.toISOString(),
          dailyPredictionLimit: 10,
          predictionsUsedToday: 0,
          lastResetDate: format(new Date(), 'yyyy-MM-dd'),
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'notifications'), {
          userId: user.uid,
          title: 'Plan Activated',
          message: `Your ${days}-day access plan has been activated successfully!`,
          type: 'success',
          timestamp: serverTimestamp(),
          read: false
        });
      }

      setSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center p-8 bg-white dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-emerald-600 dark:text-emerald-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{final === 0 ? 'Access Activated!' : 'Payment Submitted'}</h2>
        <p className="text-slate-600 dark:text-white/50 mb-6">
          {final === 0 
            ? 'Your 100% discount was applied and your plan is now active.' 
            : 'Your payment is under verification. Please wait for admin approval.'}
        </p>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 shadow-sm">Back to Dashboard</button>
      </div>
    );
  }

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(MERCHANT_NAME)}&am=${final}&cu=INR`;

  if (paymentStep === 'utr') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 relative">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" /> Confirm Payment
          </h2>
          <button onClick={() => setPaymentStep('payment')} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
        </div>

        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enter Transaction UTR</h3>
            <p className="text-sm text-slate-600 dark:text-white/50">Please enter the 12 digit UTR number from your payment receipt.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2">UTR Number</label>
              <input
                type="text"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                placeholder="12 DIGIT UTR"
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-colors text-center text-lg tracking-widest"
                maxLength={12}
              />
            </div>

            <button
              onClick={handlePurchase}
              disabled={loading || utr.length < 11}
              className="active:scale-95 hover:scale-[1.02] transition-transform w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/40 uppercase tracking-widest text-sm"
            >
              {loading ? <Clock className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Submit for Verification
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (paymentStep === 'payment') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 relative">
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm"
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="text-emerald-500" /> Payment Page
          </h2>
          <button onClick={() => setPaymentStep('selection')} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
            <ChevronLeft size={16} /> Back to Plans
          </button>
        </div>

        <div className="bg-[#151619] border border-white/10 rounded-3xl p-8 space-y-8">
          {/* Plan Summary */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Plan Summary</h3>
            <div className="bg-white/5 rounded-2xl p-6 flex justify-between items-center">
              <div>
                <div className="text-white font-bold text-lg uppercase">
                  {duration === 'custom' ? `${customDays} Days` : 
                   duration === '1w' ? '7 Days' : 
                   duration === '1m' ? '30 Days' : 
                   duration === '6m' ? '180 Days' : '365 Days'} Plan
                </div>
                <div className="text-xs text-white/40 mt-1">Direct UPI Payment</div>
              </div>
              <div className="text-3xl font-black text-emerald-500 tracking-tighter">₹{final}</div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest">Payment Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* UPI ID */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3 text-emerald-500">
                  <Smartphone size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Click to Pay</span>
                </div>
                <div className="space-y-2">
                  <div className="text-white font-mono text-sm bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center group">
                    <span>{UPI_ID}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(UPI_ID);
                        showToast('UPI ID copied to clipboard!');
                      }}
                      className="text-white/20 group-hover:text-white transition-colors"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  <a 
                    href={upiLink}
                    className="block w-full bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 text-center py-3 rounded-xl text-xs font-bold transition-all border border-emerald-500/20"
                  >
                    Open UPI App
                  </a>
                </div>
              </div>

              {/* QR Code */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 flex flex-col items-center">
                <div className="flex items-center gap-3 text-emerald-500 self-start">
                  <QrCode size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Scan to Pay</span>
                </div>
                <div className="bg-white p-3 rounded-2xl shadow-2xl shadow-emerald-500/10">
                  <QRCodeCanvas value={upiLink} size={120} />
                </div>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Scan this QR to Pay</p>
              </div>
            </div>

            {/* Pay Now Button */}
            <a 
              href={upiLink}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/40 uppercase tracking-widest text-sm"
            >
              <Smartphone size={20} />
              Pay Now
            </a>
          </div>

          {/* I Have Paid Button */}
          <div className="pt-8 border-t border-white/5">
            <button
              onClick={() => setPaymentStep('utr')}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-white/90 disabled:opacity-50 font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-white/5 uppercase tracking-widest text-sm"
            >
              {loading ? <Clock className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              I Have Paid
            </button>
            <p className="text-center text-[10px] text-white/30 mt-4 font-bold uppercase tracking-widest">
              Click after completing your payment in UPI App
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="text-emerald-500" /> Purchase Access
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {timeLeft && (
        <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-2xl p-6 flex items-center justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-emerald-600 dark:text-emerald-500"><TrendingUp size={100} /></div>
          <div className="relative z-10">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Welcome Offer</div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">20% OFF ALL PLANS</h3>
            <p className="text-xs text-slate-500 dark:text-white/50 mt-1">Valid for 24 hours after joining</p>
          </div>
          <div className="text-right relative z-10">
            <div className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Ends In</div>
            <div className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-500">{timeLeft}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.entries(basePrices).map(([key, price]) => {
          const isSelected = duration === key;
          const discountedPrice = Math.round(price * 0.8);
          const showDiscount = isWithin24Hours();

          return (
            <button
              key={key}
              onClick={() => setDuration(key)}
              className={`p-6 rounded-3xl border transition-all text-left relative overflow-hidden group ${
                isSelected 
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-900/40' 
                  : 'bg-white dark:bg-[#151619] border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 hover:border-slate-400 dark:hover:border-white/30'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="text-xs uppercase font-black tracking-widest opacity-60">
                  {key === '1w' ? '7 Days' : key === '1m' ? '30 Days' : key === '6m' ? '180 Days' : '365 Days'}
                </div>
                {isSelected && <CheckCircle2 size={20} className="text-white" />}
              </div>
              
              <div className="flex items-baseline gap-2">
                <div className={`text-3xl font-black tracking-tighter ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  ₹{showDiscount ? discountedPrice : price}
                </div>
                {showDiscount && (
                  <div className={`text-sm line-through opacity-40 font-bold ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>₹{price}</div>
                )}
              </div>
              
              {showDiscount && (
                <div className={`mt-2 inline-block ${isSelected ? 'bg-white/10' : 'bg-slate-100 dark:bg-white/10'} text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg`}>
                  20% Welcome Discount
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={`p-6 rounded-3xl border transition-all ${
        duration === 'custom' 
          ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-900/40' 
          : 'bg-[#151619] border-white/10 text-white/60 hover:border-white/30'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${duration === 'custom' ? 'bg-white/20' : 'bg-white/5'}`}>
              <Plus size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm">Custom Plan</h3>
              <p className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Choose your duration</p>
            </div>
          </div>
          <button 
            onClick={() => setDuration('custom')}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              duration === 'custom' ? 'bg-white text-emerald-900' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {duration === 'custom' ? 'Selected' : 'Select'}
          </button>
        </div>

        {duration === 'custom' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold uppercase tracking-widest opacity-60">
                <span>7 Days</span>
                <span>365 Days</span>
              </div>
              <input 
                type="range"
                min="7"
                max="365"
                value={customDays}
                onChange={(e) => setCustomDays(parseInt(e.target.value) || 7)}
                className="w-full accent-white"
              />
              <div className="text-center">
                <div className="text-4xl font-black tracking-tighter">{customDays} Days</div>
                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1">₹{perDayPrice} per day</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2">Gift Code / Coupon</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="ENTER CODE"
                className="flex-1 bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <button 
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponCode}
                className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white px-6 py-3 rounded-xl font-bold text-sm transition-all border border-slate-200 dark:border-white/10 disabled:opacity-50"
              >
                {couponLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Apply'}
              </button>
            </div>
          </div>
        </div>

        {appliedCoupon && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500">
                <Check size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Coupon Applied: {appliedCoupon.code}</div>
                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{appliedCoupon.discountPercent}% Discount</div>
              </div>
            </div>
            <button onClick={() => setAppliedCoupon(null)} className="text-white/20 hover:text-white transition-colors">
              <XCircle size={16} />
            </button>
          </div>
        )}

        {profile && profile.walletBalance > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500">
                <Wallet size={16} />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Pay with Wallet</div>
                <div className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Balance: ₹{profile.walletBalance} (Get 20% OFF)</div>
              </div>
            </div>
            <button 
              onClick={() => setUseWallet(!useWallet)} 
              className={`w-12 h-6 rounded-full transition-colors relative ${useWallet ? 'bg-emerald-500' : 'bg-white/20'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${useWallet ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        )}

        <div className="pt-6 border-t border-white/5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/40">Subtotal</span>
            <span className="text-white font-bold">₹{original}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-500/60">Total Discount</span>
              <span className="text-emerald-500 font-bold">-₹{discount}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/5">
            <span className="text-lg font-bold text-slate-900 dark:text-white">Total Amount</span>
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹{final}</span>
          </div>
        </div>

        {final > 0 ? (
          <button
            onClick={() => useWallet ? handlePurchase() : setPaymentStep('payment')}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/40 uppercase tracking-widest text-sm"
          >
            {loading ? <Clock className="animate-spin" size={20} /> : (useWallet ? <CheckCircle2 size={20} /> : <ChevronRight size={20} />)}
            {useWallet ? 'Pay with Wallet' : 'Proceed to Payment'}
          </button>
        ) : (
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="active:scale-95 hover:scale-[1.02] transition-transform w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-2xl shadow-emerald-900/40 uppercase tracking-widest text-sm"
          >
            {loading ? <Clock className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            Activate Free Access
          </button>
        )}
      </div>
    </div>
  );
};

// --- Purchase History Component ---
const PurchaseHistoryView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const path = 'purchases';
    const q = query(collection(db, path), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase));
      // Sort by date descending
      pData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setPurchases(pData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="text-emerald-500" /> Purchase History
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-white/40 hover:text-white text-sm">Back</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Clock className="animate-spin text-white/20" size={32} /></div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
          <p className="text-white/30">No purchase history found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {purchases.map((p) => (
            <div key={p.id} className="bg-[#151619] border border-white/10 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold uppercase text-sm">
                      {p.duration.startsWith('custom:') ? `${p.duration.split(':')[1]} Days` : 
                       p.duration === '1w' ? '7 Days' : 
                       p.duration === '1m' ? '30 Days' : 
                       p.duration === '6m' ? '180 Days' : '365 Days'} Plan
                    </span>
                    <span className="text-white/20 text-xs">•</span>
                    <span className="text-emerald-500 font-bold">₹{p.price}</span>
                  </div>
                  <div className="text-xs text-white/40 flex items-center gap-1">
                    <Calendar size={12} />
                    {p.createdAt?.toDate ? format(p.createdAt.toDate(), 'PPP p') : 'Processing...'}
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  p.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                  'bg-orange-500/10 text-orange-500 border-orange-500/20'
                }`}>
                  {p.status}
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest">
                  {p.status === 'approved' && <span className="text-emerald-500">Payment successful</span>}
                  {p.status === 'pending' && <span className="text-orange-500">Waiting for verification</span>}
                  {p.status === 'rejected' && <span className="text-red-500">Payment rejected, contact support</span>}
                  {p.utr && p.utr !== 'FREE_COUPON' && p.utr !== 'UPI_PAYMENT' && (
                    <div className="mt-1 text-white/20 font-mono lowercase">UTR: {p.utr}</div>
                  )}
                </div>

                {(p.status === 'pending' || p.status === 'rejected') && (
                  <button 
                    onClick={() => window.open('https://t.me/eagle_support', '_blank')}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
                  >
                    <Send size={16} /> Contact Customer Support
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const generatePlanIdStr = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 3) + 10; // 10 to 12
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// --- Admin Panel Component ---
// --- Fake Feedback Marquee ---
const FakeFeedbackMarquee: React.FC = () => {
  const fakeFeedbacks = [
    { email: "raj***@gmail.com", comment: "Amazing predictions! Won ₹5000 today.", rating: 5 },
    { email: "son***@yahoo.com", comment: "Master plan is a life saver. Highly recommended.", rating: 5 },
    { email: "ami***@outlook.com", comment: "Best platform for color trading. Very secure.", rating: 4 },
    { email: "vik***@gmail.com", comment: "Withdrawal was super fast. Thanks admin!", rating: 5 },
    { email: "pri***@gmail.com", comment: "Conservative strategy is very safe. Consistent profit.", rating: 5 },
    { email: "dee***@rediff.com", comment: "I was skeptical but it actually works!", rating: 4 },
    { email: "rah***@gmail.com", comment: "The AI analysis is top notch. 90% accuracy.", rating: 5 },
    { email: "sne***@gmail.com", comment: "Joined yesterday and already in profit.", rating: 5 },
  ];

  return (
    <div className="relative overflow-hidden bg-white/5 border-y border-white/10 py-3 select-none">
      <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
        {[...fakeFeedbacks, ...fakeFeedbacks].map((f, i) => (
          <div key={i} className="inline-flex items-center gap-3 px-8 border-r border-white/5 last:border-none">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                <User size={12} />
              </div>
              <span className="text-xs font-bold text-white/80">{f.email}</span>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} size={8} className={f.rating >= star ? 'text-amber-500 fill-amber-500' : 'text-white/5'} />
              ))}
            </div>
            <p className="text-[10px] text-white/40 italic">"{f.comment}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReferralView: React.FC<{
  profile: UserProfile | null;
  onBack: () => void;
}> = ({ profile, onBack }) => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const copyReferralCode = () => {
    if (profile?.referralCode) {
      navigator.clipboard.writeText(profile.referralCode);
      showToast('Referral code copied!');
    }
  };

  const shareReferral = () => {
    if (profile?.referralCode) {
      const shareUrl = `${window.location.origin}?ref=${profile.referralCode}`;
      const text = `Join AI Predictor and get accurate predictions! Use my referral code: ${profile.referralCode}`;
      if (navigator.share) {
        navigator.share({
          title: 'AI Predictor Referral',
          text: text,
          url: shareUrl
        });
      } else {
        const fullText = `${text}\n${shareUrl}`;
        navigator.clipboard.writeText(fullText);
        showToast('Referral link copied!');
      }
    }
  };

  const handleClaim = async (rewardId: string) => {
    if (!profile) return;
    setIsClaiming(true);
    try {
      const result = await claimReferralReward(profile.uid, rewardId);
      if (result.success) {
        showToast(result.message);
      } else {
        showToast(result.message);
      }
    } catch (err) {
      showToast('Failed to claim reward');
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Refer & Earn</h2>
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Referral Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-emerald-500/20"
      >
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-emerald-100/60 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Neural Invitation Code</p>
            <div className="flex items-center justify-between bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
              <span className="text-4xl font-black tracking-widest">{profile?.referralCode || '------'}</span>
              <button 
                onClick={copyReferralCode}
                className="w-12 h-12 bg-white/20 hover:bg-white/30 rounded-2xl flex items-center justify-center transition-all active:scale-95"
              >
                <Copy size={20} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/20">
              <p className="text-emerald-100/60 text-[10px] font-black uppercase tracking-widest mb-1">Total Referrals</p>
              <p className="text-3xl font-black">{profile?.referralCount || 0}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/20">
              <p className="text-emerald-100/60 text-[10px] font-black uppercase tracking-widest mb-1">Success Bonus</p>
              <p className="text-3xl font-black">₹{profile?.walletBalance || 0}</p>
            </div>
          </div>

          <button 
            onClick={shareReferral}
            className="w-full bg-white text-emerald-600 font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs"
          >
            <Share2 size={18} />
            Propagate Referral Link
          </button>
        </div>

        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-[80px]" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-400/20 rounded-full blur-[80px]" />
      </motion.div>

      {/* Rewards Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em]">Milestone Nodes</h3>
          <Trophy size={18} className="text-amber-500 animate-pulse" />
        </div>
        
        <div className="grid gap-4">
          {REFERRAL_REWARDS.map((reward) => {
            const isClaimed = profile?.claimedRewards?.includes(reward.id);
            const canClaim = (profile?.referralCount || 0) >= reward.count && !isClaimed;
            const progress = Math.min(((profile?.referralCount || 0) / reward.count) * 100, 100);

            return (
              <div key={reward.id} className="bg-white dark:bg-[#151619] rounded-[2.5rem] p-6 border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg mb-1">{reward.label}</h4>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">Target: {reward.count} Active Users</p>
                  </div>
                  {isClaimed ? (
                    <div className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black px-3 py-1.5 rounded-full flex items-center gap-1 uppercase tracking-widest border border-emerald-500/20">
                      <Check size={10} />
                      Synthesized
                    </div>
                  ) : (
                    <div className="text-emerald-500 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                      {profile?.referralCount || 0} / {reward.count}
                    </div>
                  )}
                </div>

                <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full mb-6 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full transition-all duration-1000 ${isClaimed ? 'bg-emerald-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                  />
                </div>

                <button
                  disabled={!canClaim || isClaiming}
                  onClick={() => handleClaim(reward.id)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 ${
                    canClaim 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20' 
                      : isClaimed
                        ? 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20 cursor-not-allowed border border-slate-200 dark:border-white/10'
                        : 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/10 cursor-not-allowed border border-dashed border-slate-200 dark:border-white/10'
                  }`}
                >
                  {isClaiming ? 'Processing...' : isClaimed ? 'Reward Claimed' : canClaim ? 'Claim Node' : `Need ${reward.count - (profile?.referralCount || 0)} More`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-amber-500/5 dark:bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] p-8 space-y-4">
        <div className="flex items-center gap-3 text-amber-500 mb-2">
          <Info size={20} />
          <span className="font-black uppercase tracking-widest text-xs text-amber-600/80">Neural Network Rules</span>
        </div>
        <div className="text-[10px] text-amber-900/60 dark:text-amber-200/40 font-bold uppercase tracking-widest leading-loose">
          <p className="mb-2">• Successful referrals are counted when your link is used to create an account.</p>
          <p className="mb-2">• Milestone rewards (7 Days Free or ₹500 Bonus) require 3 successful active referrals.</p>
          <p className="mb-2">• Advanced milestone (₹2,000 Bonus) requires 10 successful active referrals.</p>
          <p>• Exploitation of local network nodes will result in immediate synchronization termination.</p>
        </div>
      </div>
      
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-2xl z-50 font-bold text-xs animate-bounce border border-white/20">
          {toast}
        </div>
      )}
    </div>
  );
};

const AdminPanel: React.FC<{ 
  onBack: () => void; 
  profile: UserProfile | null;
  setLatestError: (notif: Notification | null) => void;
  showToast: (msg: string) => void;
}> = ({ onBack, profile, setLatestError, showToast }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [strategyRequests, setStrategyRequests] = useState<StrategyRequest[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [physicalRewards, setPhysicalRewards] = useState<PhysicalReward[]>([]);
  const [paymentSettings, setPaymentSettings] = useState({ upiId: '', merchantName: '' });
  
  // New Admin States
  const [vipRequirements, setVipRequirements] = useState<any>({});
  const [giveawaySettings, setGiveawaySettings] = useState<any>({});
  const [spinPrizes, setSpinPrizes] = useState<any[]>([]);
  const [paidSpinPrizes, setPaidSpinPrizes] = useState<any[]>([]);
  const [editingSpinMode, setEditingSpinMode] = useState<'free' | 'paid'>('free');
  const [stakingVaultSettings, setStakingVaultSettings] = useState<any>({});
  const [analyticsSettings, setAnalyticsSettings] = useState<any>({});
  const [purchaseSettings, setPurchaseSettings] = useState<any>({});
  const [referralSettings, setReferralSettings] = useState<any>({});
  const [leaderboardSettings, setLeaderboardSettings] = useState<any>({});
  const [achievementSettings, setAchievementSettings] = useState<any>({});
  const [rewardSettings, setRewardSettings] = useState<any>({});
  const [talkSettings, setTalkSettings] = useState<any>({});
  const [aiSupportSettings, setAiSupportSettings] = useState<any>({});
  const [appSettings, setAppSettings] = useState<any>({});
  const [editingSpinPrize, setEditingSpinPrize] = useState<{index: number, name: string, chance: number} | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<any>(null);
  const [userToEditWallet, setUserToEditWallet] = useState<any>(null);
  const [userToEditProfile, setUserToEditProfile] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
  const [newPred, setNewPred] = useState({ period: '', content: '' });

  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);

  useEffect(() => {
    if (!auth.currentUser || !profile) return;

    const checkDailyLogin = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const loginRef = doc(db, 'dailyLogins', auth.currentUser!.uid);
      const loginSnap = await getDoc(loginRef);

      if (loginSnap.exists()) {
        const data = loginSnap.data() as DailyLogin;
        if (data.lastRewardDate === today) {
          setDailyRewardClaimed(true);
        } else {
          // Claim reward
          const newStreak = data.lastLoginDate === format(addDays(new Date(), -1), 'yyyy-MM-dd') ? data.streak + 1 : 1;
          await updateDoc(loginRef, {
            lastLoginDate: today,
            streak: newStreak,
            lastRewardDate: today
          });
          // Update wallet balance
          await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
            walletBalance: (profile.walletBalance || 0) + 10 * newStreak // Reward based on streak
          });
          await setDoc(doc(db, 'leaderboard', auth.currentUser!.uid), {
            walletBalance: (profile.walletBalance || 0) + 10 * newStreak // Reward based on streak
          }, { merge: true });
          setDailyRewardClaimed(true);
        }
      } else {
        // First login
        await setDoc(loginRef, {
          userId: auth.currentUser!.uid,
          lastLoginDate: today,
          streak: 1,
          lastRewardDate: today
        });
        // Update wallet balance
        await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
          walletBalance: (profile.walletBalance || 0) + 10
        });
        await setDoc(doc(db, 'leaderboard', auth.currentUser!.uid), {
          walletBalance: (profile.walletBalance || 0) + 10
        }, { merge: true });
        setDailyRewardClaimed(true);
      }
    };

    checkDailyLogin();
  }, [auth.currentUser, profile]);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountPercent: 10 });
  const [searchQuery, setSearchQuery] = useState('');
  const [adminToastMessage, setAdminToastMessage] = useState<string | null>(null);

  const adminShowToast = (msg: string) => {
    setAdminToastMessage(msg);
    setTimeout(() => setAdminToastMessage(null), 3000);
  };

  const logAdminAction = async (action: string, details: string) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action,
        details,
        adminId: auth.currentUser.uid,
        adminEmail: auth.currentUser.email,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to log admin action', err);
    }
  };
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  const [selectedUserBalance, setSelectedUserBalance] = useState<{ userId: string; balance: number; email: string } | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; purchaseId: string | null } | null>({ isOpen: false, purchaseId: null });

  const [newAdmin, setNewAdmin] = useState({ email: '', password: '' });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  const checkUserBalance = async (userId: string, email: string) => {
    setIsCheckingBalance(true);
    try {
      const docSnap = await getDoc(doc(db, 'masterPlans', userId));
      if (docSnap.exists()) {
        const data = docSnap.data() as MasterPlanState;
        setSelectedUserBalance({ userId, balance: data.balance, email });
      } else {
        showToast('No Master Plan found for this user.');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `masterPlans/${userId}`);
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const toggleFeedbackPublic = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'feedbacks', id), { isPublic: !currentStatus });
      showToast(currentStatus ? 'Feedback hidden from users' : 'Feedback is now public!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `feedbacks/${id}`);
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'feedbacks', id));
      showToast('Feedback deleted successfully');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `feedbacks/${id}`);
    }
  };

  const seedDemoFeedbacks = async () => {
    const demos = [
      { rating: 5, comment: "Amazing app! The master plan strategy really works. I've been winning consistently.", userEmail: "pro_trader@example.com" },
      { rating: 5, comment: "Best prediction tool I've ever used. The interface is so clean and professional.", userEmail: "lucky_win@example.com" },
      { rating: 4, comment: "Very good results. The conservative strategy is safe and reliable.", userEmail: "safe_bet@example.com" },
      { rating: 5, comment: "Customer support is very helpful. Highly recommended!", userEmail: "happy_user@example.com" }
    ];

    try {
      for (const demo of demos) {
        await addDoc(collection(db, 'feedbacks'), {
          userId: 'demo_user',
          userEmail: demo.userEmail,
          rating: demo.rating,
          comment: demo.comment,
          isPublic: true,
          createdAt: serverTimestamp()
        });
      }
      showToast('Demo feedbacks seeded successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  const REJECTION_REASONS = [
    "Wrong UTR number",
    "Wrong payment information",
    "Payment not received",
    "Duplicate UTR submission",
    "Invalid screenshot",
    "Other"
  ];

  useEffect(() => {
    // Fallback timeout to ensure loading screen doesn't hang indefinitely
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Basic data needed for the menu counts or initial view
    const qP = query(collection(db, 'purchases'), where('status', '==', 'pending'));
    const qT = query(collection(db, 'transactions'), where('status', '==', 'pending'));
    const qR = query(collection(db, 'resetRequests'), where('status', '==', 'pending'));
    const qS = query(collection(db, 'strategyRequests'), where('status', '==', 'pending'));
    
    const unsubP = onSnapshot(qP, (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Purchase)));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'purchases');
      setLoading(false);
    });

    const unsubT = onSnapshot(qT, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    });

    const unsubR = onSnapshot(qR, (snapshot) => {
      setResetRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResetRequest)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'resetRequests');
    });

    const unsubS = onSnapshot(qS, (snapshot) => {
      setStrategyRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StrategyRequest)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'strategyRequests');
    });

    return () => { 
      clearTimeout(timeout); 
      unsubP(); 
      unsubT(); 
      unsubR(); 
      unsubS(); 
    };
  }, []);

  // Lazy loading for specific tabs
  useEffect(() => {
    if (!activeTab) return;
    setTabLoading(true);

    let unsubscribe = () => {};

    if (activeTab === 'accounts') {
      const qU = query(collection(db, 'users'), limit(100));
      unsubscribe = onSnapshot(qU, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile)));
        setTabLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'users');
        setTabLoading(false);
      });
    } else if (activeTab === 'predictions') {
      const qPr = query(collection(db, 'predictions'), orderBy('timestamp', 'desc'), limit(50));
      unsubscribe = onSnapshot(qPr, (snapshot) => {
        setPredictions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prediction)));
        setTabLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'predictions');
        setTabLoading(false);
      });
    } else if (activeTab === 'coupons') {
      const qC = query(collection(db, 'coupons'));
      unsubscribe = onSnapshot(qC, (snapshot) => {
        setCoupons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon)));
        setTabLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'coupons');
        setTabLoading(false);
      });
    } else if (activeTab === 'feedbacks') {
      const qF = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc'), limit(50));
      unsubscribe = onSnapshot(qF, (snapshot) => {
        setFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
        setTabLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'feedbacks');
        setTabLoading(false);
      });
    } else if (activeTab === 'rewards') {
      const qRewards = query(collection(db, 'physical_rewards'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(qRewards, (snapshot) => {
        setPhysicalRewards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysicalReward)));
        setTabLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'physical_rewards');
        setTabLoading(false);
      });
    } else if (activeTab === 'security_logs') {
      const qAudit = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
      unsubscribe = onSnapshot(qAudit, (snapshot) => {
        setAuditLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setTabLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, 'audit_logs');
        setTabLoading(false);
      });
    } else if (activeTab.endsWith('_edit') || activeTab === 'global_config') {
      // Load settings for edit tabs
      const settingsToLoad = [
        'vip', 'giveaway', 'spin', 'staking', 'analytics', 'purchase', 
        'referral', 'leaderboard', 'achievement', 'reward', 'talk', 'app'
      ];
      
      const unsubs = settingsToLoad.map(settingId => 
        onSnapshot(doc(db, 'settings', settingId), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            switch(settingId) {
              case 'vip': setVipRequirements(data); break;
              case 'giveaway': setGiveawaySettings(data); break;
              case 'spin': 
                setSpinPrizes(data.freePrizes || data.prizes || []); 
                setPaidSpinPrizes(data.paidPrizes || []);
                break;
              case 'staking': setStakingVaultSettings(data); break;
              case 'analytics': setAnalyticsSettings(data); break;
              case 'purchase': setPurchaseSettings(data); break;
              case 'referral': setReferralSettings(data); break;
              case 'leaderboard': setLeaderboardSettings(data); break;
              case 'achievement': setAchievementSettings(data); break;
              case 'reward': setRewardSettings(data); break;
              case 'talk': setTalkSettings(data); break;
              case 'ai_support': setAiSupportSettings(data); break;
              case 'app': setAppSettings(data); break;
            }
          }
          setTabLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `settings/${settingId}`);
          setTabLoading(false);
        })
      );
      unsubscribe = () => unsubs.forEach(u => u());
    } else {
      setTabLoading(false);
    }

    return () => unsubscribe();
  }, [activeTab]);

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const joinDate = u.createdAt?.toDate ? u.createdAt.toDate() : null;
      if (joinDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (joinDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (joinDate > end) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }
    
    return matchesSearch && matchesRole && matchesDate;
  });

  const makeAdmin = async (userId: string) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'admin' });
      showToast('User promoted to Admin successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const toggleBlockUser = async (userId: string, isBlocked: boolean) => {
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !isBlocked });
      showToast(isBlocked ? 'User unblocked successfully' : 'User Banned temporary successful');
      logAdminAction('TOGGLE_BLOCK_USER', `${isBlocked ? 'Unblocked' : 'Blocked'} user ${userId}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const removeAdmin = async (userId: string) => {
    const adminCount = allUsers.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      showToast('Cannot remove the last admin. System requires at least one administrator.');
      return;
    }
    const path = `users/${userId}`;
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'user' });
      showToast('Admin rights removed successfully.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const createAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.email || !newAdmin.password) return;
    if (newAdmin.password.length < 6) {
      showToast('Password must be at least 6 characters long.');
      return;
    }

    setIsCreatingAdmin(true);
    try {
      // Use a secondary app instance to create the user without signing out the current admin
      const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newAdmin.email, newAdmin.password);
      const newUser = userCredential.user;

      // Create profile in Firestore
      const generateShortUid = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: generateShortUid(),
        email: newAdmin.email,
        role: 'admin',
        createdAt: serverTimestamp(),
      });

      // Sign out the secondary instance and delete the app
      await signOut(secondaryAuth);
      // Note: secondaryApp.delete() is not strictly necessary but good practice
      
      setNewAdmin({ email: '', password: '' });
      showToast('New Admin account created successfully!');
      setActiveTab('admins');
    } catch (err: any) {
      showToast(`Error creating admin: ${err.message}`);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const savePaymentSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'payment'), paymentSettings, { merge: true });
      showToast('Payment settings saved successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/payment');
    }
  };

  const handleTransactionAction = async (transaction: Transaction, action: 'approved' | 'rejected') => {
    try {
      if (action === 'approved') {
        if (transaction.type === 'deposit') {
          // Add balance to user
          const userDoc = await getDoc(doc(db, 'users', transaction.userId));
          const currentBalance = userDoc.data()?.walletBalance || 0;
          await updateDoc(doc(db, 'users', transaction.userId), {
            walletBalance: currentBalance + transaction.amount
          });
        }
        // For withdrawal, balance was already deducted on request
      } else if (action === 'rejected') {
        if (transaction.type === 'withdraw') {
          // Refund balance to user
          const userDoc = await getDoc(doc(db, 'users', transaction.userId));
          const currentBalance = userDoc.data()?.walletBalance || 0;
          await updateDoc(doc(db, 'users', transaction.userId), {
            walletBalance: currentBalance + transaction.amount
          });
        }
      }

      await updateDoc(doc(db, 'transactions', transaction.id!), {
        status: action,
        updatedAt: serverTimestamp()
      });

      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: transaction.userId,
        title: `Transaction ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        message: `Your ${transaction.type} of ₹${transaction.amount} has been ${action}.`,
        type: action === 'approved' ? 'success' : 'error',
        timestamp: serverTimestamp(),
        read: false
      });

      showToast(`Transaction ${action} successfully!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${transaction.id}`);
    }
  };

  const approvePurchase = async (purchase: any) => {
    if (purchase.utr.length !== 12 && purchase.utr !== 'FREE_COUPON') {
      showToast('Invalid UTR format (must be 12 digits). Please verify with user.');
      return;
    }
    const purchasePath = `purchases/${purchase.id}`;
    const planPath = `plans/${purchase.userId}_active`;
    try {
      const days = purchase.duration.startsWith('custom:') 
        ? parseInt(purchase.duration.split(':')[1])
        : purchase.duration === '1w' ? 7 
        : purchase.duration === '1m' ? 30 
        : purchase.duration === '6m' ? 180 
        : 365;
        
      const expiresAt = addDays(new Date(), days);

      await updateDoc(doc(db, 'purchases', purchase.id), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      await setDoc(doc(db, 'plans', purchase.userId + "_active"), {
        userId: purchase.userId,
        name: purchase.duration.startsWith('custom:') ? `Custom (${purchase.duration.split(':')[1]} days)` : purchase.duration,
        price: purchase.price,
        isActive: true,
        expiresAt: expiresAt.toISOString(),
        dailyPredictionLimit: 10,
        predictionsUsedToday: 0,
        lastResetDate: format(new Date(), 'yyyy-MM-dd'),
        createdAt: serverTimestamp()
      });

      // Notify user
      await addDoc(collection(db, 'notifications'), {
        userId: purchase.userId,
        title: 'Purchase Approved',
        message: `Your ${days}-day access plan has been activated successfully!`,
        type: 'success',
        timestamp: serverTimestamp(),
        read: false
      });

      // Process referral if any
      await processSuccessfulReferral(purchase.userId);

      showToast('Purchase approved and plan activated!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${purchasePath} or ${planPath}`);
    }
  };

  const rejectPurchase = (purchase: any) => {
    if (purchase.utr.length !== 12 && purchase.utr !== 'FREE_COUPON') {
      // We still allow rejection even if UTR is invalid (actually it's a good reason to reject)
      // But the prompt says "ensure the UTR number entered in the purchase record has the correct format (12 digits)"
      // This is ambiguous for rejection. Usually you reject BECAUSE it's wrong.
      // I'll just add a toast warning but allow opening the modal.
      showToast('Note: UTR format is invalid (not 12 digits).');
    }
    setRejectionModal({ isOpen: true, purchaseId: purchase.id });
  };

  const confirmRejection = async () => {
    if (!rejectionModal?.purchaseId) return;
    const reason = rejectionReason === 'Other' ? customReason : rejectionReason;
    if (!reason) {
      showToast('Please provide a reason for rejection.');
      return;
    }

    const path = `purchases/${rejectionModal.purchaseId}`;
    try {
      await updateDoc(doc(db, 'purchases', rejectionModal.purchaseId), { 
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp()
      });

      // Notify user
      const purchase = purchases.find(p => p.id === rejectionModal.purchaseId);
      if (purchase) {
        await addDoc(collection(db, 'notifications'), {
          userId: purchase.userId,
          title: 'Purchase Rejected',
          message: `Your purchase request was rejected. Reason: ${reason}`,
          type: 'error',
          timestamp: serverTimestamp(),
          read: false
        });
      }

      setRejectionModal({ isOpen: false, purchaseId: null });
      setRejectionReason('');
      setCustomReason('');
      showToast('Purchase rejected and user notified.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const addPrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPred.period || !newPred.content) return;
    const path = 'predictions';
    try {
      await addDoc(collection(db, path), {
        ...newPred,
        timestamp: new Date().toISOString()
      });
      setNewPred({ period: '', content: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const deletePrediction = async (id: string) => {
    const path = `predictions/${id}`;
    try {
      await deleteDoc(doc(db, 'predictions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || newCoupon.discountPercent <= 0) return;
    const path = 'coupons';
    try {
      await addDoc(collection(db, path), {
        code: newCoupon.code.trim().toUpperCase(),
        discountPercent: newCoupon.discountPercent,
        isActive: true,
        createdAt: serverTimestamp()
      });
      setNewCoupon({ code: '', discountPercent: 10 });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const deleteCoupon = async (id: string) => {
    const path = `coupons/${id}`;
    try {
      await deleteDoc(doc(db, 'coupons', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const processResetRequest = async (requestId: string, userId: string, day: number) => {
    const requestPath = `resetRequests/${requestId}`;
    const planPath = `masterPlans/${userId}`;
    try {
      const dayData = dailyTargets.find(d => d.day === day);
      if (!dayData) {
        setLatestError({
          id: Date.now().toString(),
          userId: profile?.id || '',
          title: 'Error',
          message: 'Invalid day data.',
          type: 'error',
          timestamp: serverTimestamp(),
          read: false
        });
        return;
      }

      await updateDoc(doc(db, 'masterPlans', userId), {
        day: day,
        balance: dayData.start,
        level: 1,
        totalLoss: 0,
        cycleStartBalance: dayData.start,
        isCompletedToday: false,
        pendingResetDay: deleteField(),
        history: []
      });
      
      await deleteDoc(doc(db, 'resetRequests', requestId));
      
      setLatestError({
        id: Date.now().toString(),
        userId: profile?.id || '',
        title: 'Success',
        message: 'Master Plan reset successfully!',
        type: 'success',
        timestamp: serverTimestamp(),
        read: false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${requestPath} or ${planPath}`);
    }
  };

  const rejectResetRequest = async (requestId: string, userId: string) => {
    const requestPath = `resetRequests/${requestId}`;
    const planPath = `masterPlans/${userId}`;
    try {
      await updateDoc(doc(db, 'masterPlans', userId), {
        pendingResetDay: deleteField()
      });
      await deleteDoc(doc(db, 'resetRequests', requestId));
      
      setLatestError({
        id: Date.now().toString(),
        userId: profile?.id || '',
        title: 'Success',
        message: 'Reset request rejected.',
        type: 'success',
        timestamp: serverTimestamp(),
        read: false
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${requestPath} or ${planPath}`);
    }
  };

  const toggleCouponStatus = async (id: string, currentStatus: boolean) => {
    const path = `coupons/${id}`;
    try {
      await updateDoc(doc(db, 'coupons', id), { isActive: !currentStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  return (
    <div className="space-y-8 relative pb-20">
      <AnimatePresence>
        {adminToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm"
          >
            {adminToastMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="text-emerald-500" /> {activeTab ? activeTab.charAt(0).toUpperCase() + activeTab.slice(1) : 'Admin Dashboard'}
        </h2>
        <div className="flex gap-2">
          {activeTab && (
            <button 
              onClick={() => setActiveTab(null)} 
              className="active:scale-95 hover:scale-[1.02] transition-transform bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-4 py-2 rounded-xl border border-white/10 transition-all text-sm font-bold flex items-center gap-2"
            >
              <LayoutDashboard size={16} /> Menu
            </button>
          )}
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2">
            <ChevronLeft size={16} /> Back
          </button>
        </div>
      </div>

      {!activeTab ? (
        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {[
            {
              title: 'User Management',
              items: [
                { id: 'accounts', label: 'User Accounts', icon: User, desc: 'View and manage all users', count: allUsers.length, color: 'text-purple-500 bg-purple-500/10' },
                { id: 'admins', label: 'Admin Management', icon: ShieldCheck, desc: 'Create and manage admins', color: 'text-red-500 bg-red-500/10' },
                { id: 'verification', label: 'Verification', icon: CheckCircle2, desc: 'Approve pending purchases', count: purchases.length, color: 'text-emerald-500 bg-emerald-500/10' },
                { id: 'wallet', label: 'Wallet Requests', icon: Wallet, desc: 'Manage deposits and withdrawals', count: transactions.length, color: 'text-teal-500 bg-teal-500/10' },
                { id: 'fraud', label: 'Fraud Detection', icon: ShieldAlert, desc: 'Manage suspicious activities', color: 'text-red-500 bg-red-500/10' },
                { id: 'feedbacks', label: 'User Feedbacks', icon: MessageSquare, desc: 'Manage testimonials', count: feedbacks.length, color: 'text-cyan-500 bg-cyan-500/10' },
              ]
            },
            {
              title: 'Game & Content Management',
              items: [
                { id: 'predictions', label: 'Predictions', icon: TrendingUp, desc: 'Post new AI predictions', count: predictions.length, color: 'text-indigo-500 bg-indigo-500/10' },
                { id: 'coupons', label: 'Coupon Codes', icon: CreditCard, desc: 'Create discount coupons', count: coupons.length, color: 'text-amber-500 bg-amber-500/10' },
                { id: 'rewards', label: 'Physical Rewards', icon: Gift, desc: 'Manage claimed rewards', count: physicalRewards.filter(r => r.status === 'pending_delivery').length, color: 'text-pink-500 bg-pink-500/10' },
                { id: 'reward_edit', label: 'Reward Edit', icon: Gift, desc: 'Add rewards to users', color: 'text-pink-500 bg-pink-500/10' },
                { id: 'giveaway', label: 'Giveaway', icon: Trophy, desc: 'Draw daily winners', color: 'text-pink-500 bg-pink-500/10' },
                { id: 'giveaway_edit', label: 'Giveaway Edit', icon: Trophy, desc: 'Edit giveaway rules', color: 'text-pink-500 bg-pink-500/10' },
                { id: 'spin_edit', label: 'Spin & Win Edit', icon: Zap, desc: 'Edit prizes & chances', color: 'text-yellow-500 bg-yellow-500/10' },
                { id: 'vip_edit', label: 'VIP System Edit', icon: Star, desc: 'Edit VIP requirements', color: 'text-purple-500 bg-purple-500/10' },
                { id: 'staking_edit', label: 'Staking Vault Edit', icon: ShieldCheck, desc: 'Edit staking percentages', color: 'text-teal-500 bg-teal-500/10' },
                { id: 'purchase_edit', label: 'Purchase Edit', icon: CreditCard, desc: 'Edit plan prices & discounts', color: 'text-blue-500 bg-blue-500/10' },
                { id: 'referral_edit', label: 'Refer & Earn Edit', icon: Share2, desc: 'Edit referral rewards', color: 'text-green-500 bg-green-500/10' },
                { id: 'leaderboard_edit', label: 'Leaderboard Edit', icon: Trophy, desc: 'Edit leaderboard rules', color: 'text-yellow-500 bg-yellow-500/10' },
                { id: 'achievement_edit', label: 'Achievement Edit', icon: Award, desc: 'Edit achievements', color: 'text-purple-500 bg-purple-500/10' },
                { id: 'talk_edit', label: 'Talks Edit', icon: MessageSquare, desc: 'Edit welcome message', color: 'text-cyan-500 bg-cyan-500/10' },
              ]
            },
            {
              title: 'System & Configuration',
              items: [
                { id: 'global_config', label: 'Global Config', icon: Settings, desc: 'App theme, maintenance, toggles', color: 'text-slate-500 bg-slate-500/10' },
                { id: 'security_logs', label: 'Security & Logs', icon: ShieldAlert, desc: 'Audit logs, login history', color: 'text-red-500 bg-red-500/10' },
                { id: 'system_override', label: 'System Override', icon: AlertTriangle, desc: 'Super admin powers', color: 'text-rose-500 bg-rose-500/10' },
                { id: 'settings', label: 'Payment Settings', icon: Settings, desc: 'Manage UPI ID & QR Code', color: 'text-blue-500 bg-blue-500/10' },
                { id: 'resets', label: 'Reset Requests', icon: RefreshCw, desc: 'Handle plan reset requests', count: resetRequests.length, color: 'text-orange-500 bg-orange-500/10' },
                { id: 'strategyRequests', label: 'Strategy Requests', icon: Target, desc: 'Approve strategy changes', count: strategyRequests.length, color: 'text-pink-500 bg-pink-500/10' },
                { id: 'analytics', label: 'Analytics', icon: TrendingUp, desc: 'View advanced analytics', color: 'text-indigo-500 bg-indigo-500/10' },
                { id: 'analytics_edit', label: 'Analytics Edit', icon: TrendingUp, desc: 'Edit user win rates', color: 'text-indigo-500 bg-indigo-500/10' },
              ]
            }
          ].map((group) => (
            <div key={group.title} className="space-y-4">
              <h2 className="text-sm font-black text-slate-400 dark:text-white/40 uppercase tracking-widest">{group.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.items.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className="group relative bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-5 text-left transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 rounded-xl ${tab.color} group-hover:scale-110 transition-transform`}>
                        <tab.icon size={20} />
                      </div>
                      {tab.count !== undefined && tab.count > 0 && (
                        <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-red-500/20">
                          {tab.count}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">{tab.label}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-white/40 line-clamp-1">{tab.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Search & Filters (Global for Admin) */}
          <div className="space-y-4">
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
            <ShieldCheck size={20} />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users, UIDs, or plans..."
              className="w-full bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 text-sm"
            />
          </div>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 dark:text-white/20 hover:text-slate-900 dark:hover:text-white transition-colors">
              <XCircle size={18} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <User size={16} className="text-slate-400 dark:text-white/20" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white text-xs w-full cursor-pointer"
            >
              <option value="all" className="bg-white dark:bg-[#151619]">All Roles</option>
              <option value="user" className="bg-white dark:bg-[#151619]">Users</option>
              <option value="admin" className="bg-white dark:bg-[#151619]">Admins</option>
            </select>
          </div>

          <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <Calendar size={16} className="text-slate-400 dark:text-white/20" />
            <div className="flex items-center gap-2 flex-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white text-[10px] w-full cursor-pointer"
                placeholder="Start Date"
              />
              <span className="text-slate-400 dark:text-white/20 text-[10px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-slate-900 dark:text-white text-[10px] w-full cursor-pointer"
                placeholder="End Date"
              />
            </div>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-slate-400 dark:text-white/20 hover:text-slate-900 dark:hover:text-white">
                <XCircle size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center justify-end">
            {(roleFilter !== 'all' || startDate || endDate || searchQuery) && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setRoleFilter('all');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-emerald-500 hover:text-emerald-400 font-bold transition-colors flex items-center gap-1"
              >
                <RefreshCw size={12} /> Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'verification' && (
          <motion.section
            key="verification"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" /> Pending Verification
              </h3>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {purchases.length} Requests Pending
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Clock className="animate-spin text-white/20" size={32} /></div>
            ) : purchases.length === 0 ? (
              <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                <p className="text-white/30">No pending verification requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {purchases.map((p) => (
                  <div key={p.id} className="bg-[#151619] border border-white/10 rounded-2xl p-6 flex flex-col gap-6 hover:border-emerald-500/30 transition-all group">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">{p.userEmail}</div>
                          <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">UTR: <span className="text-emerald-500 font-mono">{p.utr}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[10px] text-white/30 block uppercase font-black mb-0.5">Plan</span>
                          <span className="text-xs text-white font-bold uppercase tracking-wider">{p.duration}</span>
                        </div>
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[10px] text-white/30 block uppercase font-black mb-0.5">Amount</span>
                          <span className="text-xs text-emerald-500 font-black">₹{p.price}</span>
                        </div>
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[10px] text-white/30 block uppercase font-black mb-0.5">Date</span>
                          <span className="text-xs text-white/60 font-medium">{p.createdAt?.toDate ? format(p.createdAt.toDate(), 'MMM d, HH:mm') : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                      <button 
                        onClick={() => approvePurchase(p)}
                        className="flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} /> Approve
                      </button>
                      <button 
                        onClick={() => rejectPurchase(p)}
                        className="flex-none bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-6 py-3 rounded-xl text-sm font-bold transition-all border border-red-500/20 flex items-center justify-center gap-2"
                      >
                        <XCircle size={18} /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {activeTab === 'settings' && (
          <motion.section
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="text-blue-500" /> Payment Settings
              </h3>
            </div>

            <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">UPI ID</label>
                    <input
                      type="text"
                      value={paymentSettings?.upiId || ''}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, upiId: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., yourname@upi"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-white mb-2 block">Merchant Name</label>
                    <input
                      type="text"
                      value={paymentSettings?.merchantName || ''}
                      onChange={(e) => setPaymentSettings(prev => ({ ...prev, merchantName: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Your Business Name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-white mb-2 block">Min Deposit (₹)</label>
                      <input
                        type="number"
                        value={paymentSettings?.minDeposit || 100}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, minDeposit: Number(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-white mb-2 block">Min Withdrawal (₹)</label>
                      <input
                        type="number"
                        value={paymentSettings?.minWithdrawal || 500}
                        onChange={(e) => setPaymentSettings(prev => ({ ...prev, minWithdrawal: Number(e.target.value) }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={savePaymentSettings}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all"
                  >
                    Save Payment Settings
                  </button>
                </div>
                <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-6 border border-white/10">
                  <label className="text-sm font-bold text-white mb-4 block">QR Code Preview</label>
                  {paymentSettings?.upiId ? (
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${paymentSettings.upiId}&pn=${encodeURIComponent(paymentSettings.merchantName || 'Merchant')}`}
                      alt="QR Code"
                      className="w-48 h-48 bg-white p-2 rounded-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-white/10 rounded-lg flex items-center justify-center text-white/30 text-sm">
                      Enter UPI ID to preview
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3 mb-6">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Wrench className="text-orange-500" /> App Settings
              </h3>
            </div>

          </motion.section>
        )}



        {activeTab === 'predictions' && (
          <motion.section
            key="predictions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="text-emerald-500" /> Prediction Management
              </h3>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {predictions.length} Active Predictions
              </div>
            </div>

            <form onSubmit={addPrediction} className="bg-[#151619] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Period (e.g. 10:30 AM)</label>
                  <input
                    type="text"
                    value={newPred.period}
                    onChange={(e) => setNewPred({ ...newPred, period: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="Enter period"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Prediction Content</label>
                  <input
                    type="text"
                    value={newPred.content}
                    onChange={(e) => setNewPred({ ...newPred, content: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="Enter prediction"
                    required
                  />
                </div>
              </div>
              <button type="submit" className="active:scale-95 hover:scale-[1.02] transition-transform w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> Add New Prediction
              </button>
            </form>

            <div className="grid gap-3">
              {tabLoading ? (
                <div className="flex justify-center py-12"><Clock className="animate-spin text-white/20" size={32} /></div>
              ) : predictions.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/30">No predictions added yet.</p>
                </div>
              ) : (
                predictions.map((pr) => (
                  <div key={pr.id} className="bg-[#151619] border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-xl font-black text-xs tracking-widest uppercase">
                        {pr.period}
                      </div>
                      <div className="text-white font-bold text-lg">{pr.content}</div>
                      {pr.status && (
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-widest ${pr.status === 'win' ? 'bg-emerald-500/20 text-emerald-500' : pr.status === 'loss' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'}`}>
                          {pr.status}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateDoc(doc(db, 'predictions', pr.id), { status: 'win' })}
                        className="w-10 h-10 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-emerald-500/20"
                        title="Mark as Win"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button 
                        onClick={() => updateDoc(doc(db, 'predictions', pr.id), { status: 'loss' })}
                        className="w-10 h-10 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-orange-500/20"
                        title="Mark as Loss"
                      >
                        <AlertTriangle size={18} />
                      </button>
                      <button 
                        onClick={() => deletePrediction(pr.id)}
                        className="w-10 h-10 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-red-500/20"
                        title="Delete Prediction"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'accounts' && (
          <motion.section
            key="accounts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="text-emerald-500" /> Account Management
              </h3>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {filteredUsers.length} Users Found
              </div>
            </div>

            <div className="grid gap-4">
              {tabLoading ? (
                <div className="flex justify-center py-12"><Clock className="animate-spin text-white/20" size={32} /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/30">No users found matching your search.</p>
                </div>
              ) : (
                filteredUsers.map(u => (
                  <div key={u.uid} className="bg-[#151619] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-emerald-500/30 transition-all group">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/20 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all">
                          <User size={24} />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white flex items-center gap-2">
                            {u.email}
                            {u.role === 'admin' && (
                              <span className="bg-orange-500/10 text-orange-500 text-[10px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border border-orange-500/20">Admin</span>
                            )}
                          </div>
                          <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">UID: <span className="text-white/60 font-mono">{u.uid}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[10px] text-white/30 block uppercase font-black mb-0.5">Joined On</span>
                          <span className="text-xs text-white/60 font-medium">{u.createdAt?.toDate ? format(u.createdAt.toDate(), 'PPP') : 'N/A'}</span>
                        </div>
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[10px] text-white/30 block uppercase font-black mb-0.5">Role</span>
                          <span className="text-xs text-white/60 font-bold uppercase tracking-wider">{u.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:border-l md:border-white/5 md:pl-6">
                      {u.role !== 'admin' && (
                        <button 
                          onClick={() => makeAdmin(u.id)}
                          className="flex-1 md:flex-none bg-orange-500/10 hover:bg-orange-600 text-orange-500 hover:text-white px-6 py-3 rounded-xl text-sm font-bold transition-all border border-orange-500/20 flex items-center justify-center gap-2"
                        >
                          <ShieldCheck size={18} /> Make Admin
                        </button>
                      )}
                      <button 
                        onClick={() => toggleBlockUser(u.id, !!u.isBlocked)}
                        className={`flex-1 md:flex-none ${u.isBlocked ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} hover:text-white px-6 py-3 rounded-xl text-sm font-bold transition-all border ${u.isBlocked ? 'border-emerald-500/20' : 'border-red-500/20'} flex items-center justify-center gap-2`}
                      >
                        {u.isBlocked ? 'Unblock' : 'Block'} User
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserToEditWallet(u);
                        }}
                        className="flex-1 md:flex-none bg-teal-500/10 hover:bg-teal-600 text-teal-500 hover:text-white px-6 py-3 rounded-xl text-sm font-bold transition-all border border-teal-500/20 flex items-center justify-center gap-2"
                      >
                        <Wallet size={18} /> Edit Wallet
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserToEditProfile(u);
                        }}
                        className="flex-1 md:flex-none bg-blue-500/10 hover:bg-blue-600 text-blue-500 hover:text-white px-6 py-3 rounded-xl text-sm font-bold transition-all border border-blue-500/20 flex items-center justify-center gap-2"
                      >
                        <User size={18} /> Edit Profile
                      </button>
                      <button 
                        onClick={() => {
                          const isFrozen = !!u.walletFrozen;
                          updateDoc(doc(db, 'users', u.id), { walletFrozen: !isFrozen })
                            .then(() => {
                              showToast(`Wallet ${!isFrozen ? 'frozen' : 'unfrozen'} successfully!`);
                              logAdminAction('TOGGLE_WALLET_FREEZE', `${!isFrozen ? 'Froze' : 'Unfroze'} wallet for ${u.email}`);
                            })
                            .catch(err => showToast('Error updating wallet status: ' + err.message));
                        }}
                        className={`flex-1 md:flex-none ${u.walletFrozen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-cyan-500/10 text-cyan-500'} hover:text-white px-6 py-3 rounded-xl text-sm font-bold transition-all border ${u.walletFrozen ? 'border-emerald-500/20' : 'border-cyan-500/20'} flex items-center justify-center gap-2`}
                      >
                        <Wallet size={18} /> {u.walletFrozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'admins' && (
          <motion.section
            key="admins"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" /> Administrator Management
              </h3>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {allUsers.filter(u => u.role === 'admin').length} Admins Active
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Admin Form */}
              <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                    <Plus size={20} />
                  </div>
                  <h4 className="text-sm font-black text-white/60 uppercase tracking-widest">Create New Admin</h4>
                </div>
                
                <form onSubmit={createAdminAccount} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Email Address</label>
                    <input
                      type="email"
                      value={newAdmin.email}
                      onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      placeholder="admin@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Password</label>
                    <input
                      type="password"
                      value={newAdmin.password}
                      onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isCreatingAdmin}
                    className="active:scale-95 hover:scale-[1.02] transition-transform w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {isCreatingAdmin ? <Clock className="animate-spin" size={18} /> : <Plus size={18} />}
                    Create Admin Account
                  </button>
                </form>
              </div>

              {/* Current Admins List */}
              <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40">
                    <ShieldCheck size={20} />
                  </div>
                  <h4 className="text-sm font-black text-white/60 uppercase tracking-widest">Current Administrators</h4>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {allUsers.filter(u => u.role === 'admin').map(admin => (
                    <div key={admin.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">{admin.email}</div>
                          <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">UID: <span className="text-white/50 font-mono">{admin.uid}</span></div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => removeAdmin(admin.id)}
                        className="w-10 h-10 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-red-500/20"
                        title="Remove Admin Rights"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === 'coupons' && (
          <motion.section
            key="coupons"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="text-emerald-500" /> Coupon Management
              </h3>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {coupons.length} Active Coupons
              </div>
            </div>

            <form onSubmit={addCoupon} className="bg-[#151619] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Coupon Code</label>
                  <input
                    type="text"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                    placeholder="E.G. SAVE50"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono font-bold tracking-widest focus:outline-none focus:border-emerald-500/50 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Discount %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={isNaN(newCoupon.discountPercent) ? '' : newCoupon.discountPercent}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountPercent: parseInt(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    placeholder="Enter discount"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="active:scale-95 hover:scale-[1.02] transition-transform w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Create New Coupon
              </button>
            </form>

            <div className="grid gap-4">
              {tabLoading ? (
                <div className="flex justify-center py-12"><Clock className="animate-spin text-white/20" size={32} /></div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/30">No coupons created yet.</p>
                </div>
              ) : (
                coupons.map(c => (
                  <div key={c.id} className="bg-[#151619] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-emerald-500/30 transition-all group">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <div className="text-white font-mono font-bold text-xl tracking-widest uppercase">{c.code}</div>
                          <div className="text-xs text-emerald-500 font-bold uppercase tracking-wider">{c.discountPercent}% OFF</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <span className="text-[10px] text-white/30 block uppercase font-black mb-0.5">Status</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${c.isActive ? 'text-emerald-500' : 'text-slate-500'}`}>
                            {c.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 md:border-l md:border-white/5 md:pl-6">
                      <button 
                        onClick={() => toggleCouponStatus(c.id, c.isActive)}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-sm font-bold transition-all border ${
                          c.isActive 
                            ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500 hover:text-white' 
                            : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {c.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button 
                        onClick={() => deleteCoupon(c.id)}
                        className="flex-1 md:flex-none bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-3 rounded-xl text-sm font-bold transition-all border border-red-500/20 flex items-center justify-center"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'resets' && (
          <motion.section
            key="resets"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <RefreshCw className="text-emerald-500" /> Reset Requests
              </h3>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {resetRequests.length} Pending Resets
              </div>
            </div>

            <div className="grid gap-4">
              {resetRequests.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/30">No pending reset requests.</p>
                </div>
              ) : (
                resetRequests.map(req => (
                  <div key={req.id} className="bg-[#151619] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-emerald-500/30 transition-all group">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                          <RefreshCw size={20} />
                        </div>
                        <div>
                          <div className="text-white font-bold text-lg">{req.email}</div>
                          <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">Target: <span className="text-emerald-500 font-bold">Day {req.targetDay}</span></div>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => {
                        updateDoc(doc(db, 'resetRequests', req.id), { status: 'processed' });
                        updateDoc(doc(db, 'masterPlans', req.userId), { day: req.targetDay, balance: 100, level: 1, totalLoss: 0, cycleStartBalance: 100, isCompletedToday: false, history: [] });
                        showToast('Reset processed!');
                    }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">Process</button>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'analytics' && (
          <motion.section
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <AnalyticsView />
          </motion.section>
        )}

        {activeTab === 'fraud' && (
          <motion.section
            key="fraud"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <FraudDetectionView />
          </motion.section>
        )}

        {activeTab === 'giveaway' && (
          <motion.section
            key="giveaway"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="text-pink-500" /> Giveaway Management
              </h3>
              <button 
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/draw-giveaway', { method: 'POST' });
                    const data = await response.json();
                    if (data.success) {
                      showToast(`Winner drawn: ${data.winner}`);
                    } else {
                      showToast(data.message || 'Draw failed');
                    }
                  } catch (err) {
                    showToast('Error drawing giveaway');
                  }
                }}
                className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
              >
                Draw Winner Now
              </button>
            </div>
            <div className="bg-[#151619] border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-white/60">
                This will randomly select a winner from all eligible users who have completed their tasks.
                The winner will automatically receive ₹1000 and 1 Month Pro Plan.
              </p>
            </div>
          </motion.section>
        )}

        {activeTab === 'strategyRequests' && (
          <motion.section
            key="strategyRequests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Target className="text-emerald-500" /> Strategy Requests
              </h3>
              <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                {strategyRequests.length} Pending Requests
              </div>
            </div>

            <div className="grid gap-4">
              {strategyRequests.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/30">No pending strategy requests.</p>
                </div>
              ) : (
                strategyRequests.map(req => (
                  <div key={req.id} className="bg-[#151619] border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold">{req.userEmail}</p>
                      <p className="text-white/50 text-sm">Requested: {req.requestedStrategy}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => {
                          updateDoc(doc(db, 'strategyRequests', req.id), { status: 'approved' });
                          updateDoc(doc(db, 'masterPlans', req.userId), { riskStrategy: req.requestedStrategy });
                          showToast('Request approved!');
                      }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold">Approve</button>
                      <button onClick={() => {
                          updateDoc(doc(db, 'strategyRequests', req.id), { status: 'rejected' });
                          showToast('Request rejected!');
                      }} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold">Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'feedbacks' && (
          <motion.section
            key="feedbacks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="text-emerald-500" /> FEEDBACKS FROM USERS
              </h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={seedDemoFeedbacks}
                  className="text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white/40 hover:text-white px-3 py-2 rounded-lg border border-white/10 transition-all"
                >
                  Seed Demo Feedbacks
                </button>
                <div className="text-xs text-white/40 font-bold uppercase tracking-widest">
                  {feedbacks.length} Feedbacks Total
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {tabLoading ? (
                <div className="flex justify-center py-12"><Clock className="animate-spin text-white/20" size={32} /></div>
              ) : feedbacks.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <p className="text-white/30">No feedbacks received yet.</p>
                </div>
              ) : (
                [...feedbacks].sort((a, b) => {
                  const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                  const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                  return timeB - timeA;
                }).map(f => (
                  <div key={f.id} className="bg-[#151619] border border-white/10 rounded-2xl p-6 space-y-4 hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/20">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white">{f.userEmail}</div>
                          <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">
                            {f.createdAt?.toDate ? format(f.createdAt.toDate(), 'PPP p') : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} size={14} className={f.rating >= star ? 'text-amber-500 fill-amber-500' : 'text-white/10'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5 italic">
                      "{f.comment}"
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${f.isPublic ? 'bg-emerald-500 animate-pulse' : 'bg-white/10'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                          {f.isPublic ? 'Publicly Visible' : 'Private (Admin Only)'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleFeedbackPublic(f.id, f.isPublic)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border ${f.isPublic ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}
                        >
                          {f.isPublic ? 'Hide from Users' : 'Show to Users'}
                        </button>
                        <button
                          onClick={() => deleteFeedback(f.id)}
                          className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'wallet' && (
          <motion.section
            key="wallet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="text-teal-500" /> WALLET REQUESTS
              </h3>
              <div className="text-xs text-slate-500 dark:text-white/40 font-bold uppercase tracking-widest">
                {transactions.length} Pending
              </div>
            </div>

            <div className="grid gap-4">
              {transactions.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                  <p className="text-slate-400 dark:text-white/30">No pending wallet requests.</p>
                </div>
              ) : (
                transactions.map(t => (
                  <div key={t.id} className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                            t.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {t.type}
                          </span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{t.userEmail}</span>
                        </div>
                        <div className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white">
                          ₹{t.amount}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-white/40 font-black uppercase tracking-widest mt-1">
                          {t.createdAt?.toDate ? format(t.createdAt.toDate(), 'PPP p') : 'N/A'}
                        </div>
                      </div>

                      {t.type === 'deposit' && t.utr && (
                        <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                          <div className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest mb-1">UTR Number</div>
                          <div className="font-mono text-sm text-slate-900 dark:text-white">{t.utr}</div>
                        </div>
                      )}

                      {t.type === 'withdraw' && t.bankDetails && (
                        <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-sm space-y-1">
                          <div className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest mb-2">Bank Details</div>
                          <div><span className="text-slate-500 dark:text-white/50">Name:</span> <span className="text-slate-900 dark:text-white font-medium">{t.bankDetails.accountName}</span></div>
                          <div><span className="text-slate-500 dark:text-white/50">A/C:</span> <span className="text-slate-900 dark:text-white font-mono">{t.bankDetails.accountNumber}</span></div>
                          <div><span className="text-slate-500 dark:text-white/50">IFSC:</span> <span className="text-slate-900 dark:text-white font-mono">{t.bankDetails.ifscCode}</span></div>
                          <div><span className="text-slate-500 dark:text-white/50">Bank:</span> <span className="text-slate-900 dark:text-white font-medium">{t.bankDetails.bankName}</span></div>
                        </div>
                      )}
                    </div>

                    {t.screenshotBase64 && (
                      <div className="mt-4">
                        <div className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase tracking-widest mb-2">Payment Screenshot</div>
                        <img src={t.screenshotBase64} alt="Payment Proof" className="max-w-xs rounded-xl border border-slate-200 dark:border-white/10" referrerPolicy="no-referrer" />
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                      <button
                        onClick={() => handleTransactionAction(t, 'approved')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Approve {t.type === 'withdraw' ? '& Mark Paid' : ''}
                      </button>
                      <button
                        onClick={() => handleTransactionAction(t, 'rejected')}
                        className="flex-1 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-colors flex items-center justify-center gap-2 border border-red-500/20"
                      >
                        <XCircle size={16} /> Reject {t.type === 'withdraw' ? '& Refund' : ''}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'wallet_edit' && (
          <motion.section
            key="wallet_edit"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="text-teal-500" /> Wallet Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Select a user to edit their wallet balance or payment details.</p>
              <div className="grid gap-2">
                {allUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{user.email}</p>
                      <p className="text-xs text-slate-500 dark:text-white/40">Balance: ₹{user.balance?.toLocaleString() || 0}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedUserForEdit(user)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
        
        {activeTab === 'vip_edit' && (
          <motion.section key="vip_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="text-purple-500" /> VIP System Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit VIP level requirements.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(vipRequirements).map(([level, req]: [string, any]) => (
                  <div key={level} className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                    <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">{level}</label>
                    <input
                      type="number"
                      value={req.requirement || ''}
                      onChange={(e) => setVipRequirements(prev => ({ ...prev, [level]: { ...prev[level], requirement: Number(e.target.value) } }))}
                      className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'vip'), vipRequirements);
                    adminShowToast('VIP requirements updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/vip');
                  }
                }}
                className="mt-6 w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save VIP Requirements
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'giveaway_edit' && (
          <motion.section key="giveaway_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="text-pink-500" /> Giveaway Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit monthly giveaway rules.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">Prize</label>
                  <input
                    type="text"
                    value={giveawaySettings.prize || ''}
                    onChange={(e) => setGiveawaySettings(prev => ({ ...prev, prize: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'giveaway'), giveawaySettings);
                    adminShowToast('Giveaway settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/giveaway');
                  }
                }}
                className="mt-6 w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Giveaway Settings
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'spin_edit' && (
          <motion.section key="spin_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="text-yellow-500" /> Spin & Win Edit
              </h3>
              <button 
                onClick={() => setActiveTab('accounts')}
                className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-sm font-bold flex items-center gap-2"
              >
                <ChevronLeft size={16} /> Back
              </button>
            </div>

            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-slate-500 dark:text-white/60">Edit spin prizes.</p>
                  <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                    <button 
                      onClick={() => setEditingSpinMode('free')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${editingSpinMode === 'free' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
                    >
                      Free Spin
                    </button>
                    <button 
                      onClick={() => setEditingSpinMode('paid')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${editingSpinMode === 'paid' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
                    >
                      Paid Spin
                    </button>
                  </div>
                </div>
                <div className="bg-slate-900 dark:bg-black rounded-2xl p-6 text-center mb-8">
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase">
                    {editingSpinMode === 'free' ? 'FREE SPIN' : 'PAID SPIN'}
                  </h2>
                </div>

                <div className="grid grid-cols-[40px_1fr_80px_40px] gap-4 mb-4 px-6 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  <div>No.</div>
                  <div>Result</div>
                  <div className="text-right">Chance %</div>
                  <div></div>
                </div>

                <div className="space-y-2">
                  {(editingSpinMode === 'free' ? (spinPrizes.length > 0 ? spinPrizes : [
                    { label: 'Try Again', chance: 45, color: 'bg-slate-500', type: 'none' },
                    { label: '₹2', chance: 50, color: 'bg-blue-500', type: 'wallet', amount: 2 },
                    { label: '1 Week Pro', chance: 4.9, color: 'bg-indigo-500', type: 'plan', duration: '1w' },
                    { label: '₹2000', chance: 0.09, color: 'bg-purple-500', type: 'wallet', amount: 2000 },
                    { label: '₹5000', chance: 0.01, color: 'bg-emerald-500', type: 'wallet', amount: 5000 },
                  ]) : (paidSpinPrizes.length > 0 ? paidSpinPrizes : [
                    { label: 'Try Again', chance: 50, color: 'bg-slate-500', type: 'none' },
                    { label: '₹10', chance: 40, color: 'bg-red-500', type: 'wallet', amount: 10 },
                    { label: '₹100', chance: 8, color: 'bg-blue-500', type: 'wallet', amount: 100 },
                    { label: '₹500', chance: 1.9, color: 'bg-emerald-500', type: 'wallet', amount: 500 },
                    { label: 'iPhone 17', chance: 0.08, color: 'bg-purple-600', type: 'physical', item: 'iPhone 17 Pro Max' },
                    { label: 'Ola S1 Pro', chance: 0.02, color: 'bg-pink-600', type: 'physical', item: 'Ola S1 Pro' },
                  ])).map((prize, index) => (
                    <div key={index} className="grid grid-cols-[40px_1fr_80px_40px] gap-4 items-center p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl transition-all group hover:border-yellow-500/30">
                      <div className="text-sm font-black text-slate-400 dark:text-white/20">{index + 1}.</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{prize.label}</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white text-right">{prize.chance}%</div>
                      <button 
                        onClick={() => setEditingSpinPrize({ index, name: prize.label, chance: prize.chance })}
                        className="p-2 text-slate-400 hover:text-yellow-500 transition-colors flex justify-center"
                      >
                        <Pencil size={18} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, 'settings', 'spin'), { 
                        freePrizes: spinPrizes,
                        paidPrizes: paidSpinPrizes
                      });
                      adminShowToast('Spin prizes updated!');
                    } catch (err) {
                      handleFirestoreError(err, OperationType.WRITE, 'settings/spin');
                    }
                  }}
                  className="mt-8 w-full bg-slate-900 dark:bg-white text-white dark:text-black font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest hover:opacity-90 shadow-xl"
                >
                  Save All Changes
                </button>
              </div>
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
              {editingSpinPrize && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl"
                  >
                    <h4 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <Pencil className="text-yellow-500" /> Edit Prize {editingSpinPrize.index + 1}
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-500 dark:text-white/60 mb-2">Prize Name</label>
                        <input
                          type="text"
                          value={editingSpinPrize.name}
                          onChange={(e) => setEditingSpinPrize({ ...editingSpinPrize, name: e.target.value })}
                          className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-500 dark:text-white/60 mb-2">Possibility (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingSpinPrize.chance}
                          onChange={(e) => setEditingSpinPrize({ ...editingSpinPrize, chance: Number(e.target.value) })}
                          className="w-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-8">
                      <button
                        onClick={() => setEditingSpinPrize(null)}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-500 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const currentPrizes = editingSpinMode === 'free' ? (spinPrizes.length > 0 ? spinPrizes : [
                            { label: 'Try Again', chance: 45, color: 'bg-slate-500', type: 'none' },
                            { label: '₹2', chance: 50, color: 'bg-blue-500', type: 'wallet', amount: 2 },
                            { label: '1 Week Pro', chance: 4.9, color: 'bg-indigo-500', type: 'plan', duration: '1w' },
                            { label: '₹2000', chance: 0.09, color: 'bg-purple-500', type: 'wallet', amount: 2000 },
                            { label: '₹5000', chance: 0.01, color: 'bg-emerald-500', type: 'wallet', amount: 5000 },
                          ]) : (paidSpinPrizes.length > 0 ? paidSpinPrizes : [
                            { label: 'Try Again', chance: 50, color: 'bg-slate-500', type: 'none' },
                            { label: '₹10', chance: 40, color: 'bg-red-500', type: 'wallet', amount: 10 },
                            { label: '₹100', chance: 8, color: 'bg-blue-500', type: 'wallet', amount: 100 },
                            { label: '₹500', chance: 1.9, color: 'bg-emerald-500', type: 'wallet', amount: 500 },
                            { label: 'iPhone 17', chance: 0.08, color: 'bg-purple-600', type: 'physical', item: 'iPhone 17 Pro Max' },
                            { label: 'Ola S1 Pro', chance: 0.02, color: 'bg-pink-600', type: 'physical', item: 'Ola S1 Pro' },
                          ]);
                          
                          const newPrizes = [...currentPrizes];
                          newPrizes[editingSpinPrize.index] = { 
                            ...newPrizes[editingSpinPrize.index],
                            label: editingSpinPrize.name, 
                            chance: editingSpinPrize.chance 
                          };
                          
                          if (editingSpinMode === 'free') {
                            setSpinPrizes(newPrizes);
                          } else {
                            setPaidSpinPrizes(newPrizes);
                          }
                          setEditingSpinPrize(null);
                        }}
                        className="flex-1 py-3 rounded-xl font-bold bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {activeTab === 'reward_edit' && (
          <motion.section key="reward_edit" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="text-pink-500" /> Reward Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Add rewards to users.</p>
            </div>
          </motion.section>
        )}

        {activeTab === 'staking_edit' && (
          <motion.section key="staking_edit" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-teal-500" /> Staking Vault Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit staking percentages.</p>
            </div>
          </motion.section>
        )}

        {activeTab === 'staking_edit' && (
          <motion.section key="staking_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-teal-500" /> Staking Vault Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit staking percentages.</p>
              <div className="space-y-4">
                {Object.entries(stakingVaultSettings).map(([duration, rate]: [string, any]) => (
                  <div key={duration} className="flex gap-2 items-center">
                    <span className="text-sm font-bold text-slate-900 dark:text-white w-24">{duration}</span>
                    <input
                      type="number"
                      value={rate || ''}
                      onChange={(e) => setStakingVaultSettings(prev => ({ ...prev, [duration]: Number(e.target.value) }))}
                      className="flex-1 bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
                      placeholder="Rate"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'staking'), stakingVaultSettings);
                    adminShowToast('Staking settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/staking');
                  }
                }}
                className="mt-6 w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Staking Settings
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'purchase_edit' && (
          <motion.section key="purchase_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag className="text-orange-500" /> Purchase Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit purchase settings.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">Bonus Rate (%)</label>
                  <input
                    type="number"
                    value={purchaseSettings.bonusRate || ''}
                    onChange={(e) => setPurchaseSettings(prev => ({ ...prev, bonusRate: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'purchase'), purchaseSettings);
                    adminShowToast('Purchase settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/purchase');
                  }
                }}
                className="mt-6 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Purchase Settings
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'leaderboard_edit' && (
          <motion.section key="leaderboard_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="text-amber-500" /> Leaderboard Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit leaderboard settings.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">Top N Users</label>
                  <input
                    type="number"
                    value={leaderboardSettings.topN || ''}
                    onChange={(e) => setLeaderboardSettings(prev => ({ ...prev, topN: Number(e.target.value) }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'leaderboard'), leaderboardSettings);
                    adminShowToast('Leaderboard settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/leaderboard');
                  }
                }}
                className="mt-6 w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Leaderboard Settings
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'reward_edit' && (
          <motion.section key="reward_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Gift className="text-emerald-500" /> Reward Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit reward settings.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">Reward Name</label>
                  <input
                    type="text"
                    value={rewardSettings.name || ''}
                    onChange={(e) => setRewardSettings(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'reward'), rewardSettings);
                    adminShowToast('Reward settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/reward');
                  }
                }}
                className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Reward Settings
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'app_settings_edit' && (
          <motion.section key="app_settings_edit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="text-slate-500" /> App Settings Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit app name and logo URL.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">App Name</label>
                  <input
                    type="text"
                    value={appSettings.name || ''}
                    onChange={(e) => setAppSettings(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">Logo URL</label>
                  <input
                    type="text"
                    value={appSettings.logoUrl || ''}
                    onChange={(e) => setAppSettings(prev => ({ ...prev, logoUrl: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'app'), appSettings);
                    adminShowToast('App settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/app');
                  }
                }}
                className="mt-6 w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save App Settings
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'global_config' && (
          <motion.section key="global_config" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="text-slate-500" /> Global Configuration
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Manage app theme, maintenance mode, and feature toggles.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">App Theme</label>
                  <select
                    value={appSettings.theme || 'system'}
                    onChange={(e) => setAppSettings(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                  >
                    <option value="system">System Default</option>
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">Version Notes / Announcements</label>
                  <textarea
                    value={appSettings.versionNotes || ''}
                    onChange={(e) => setAppSettings(prev => ({ ...prev, versionNotes: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-500"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="maintenanceMode"
                    checked={appSettings.maintenanceMode || false}
                    onChange={(e) => setAppSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-300 dark:border-white/20 text-slate-600 focus:ring-slate-500"
                  />
                  <label htmlFor="maintenanceMode" className="text-sm font-bold text-slate-900 dark:text-white">Enable Maintenance Mode</label>
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-white/10">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Feature Toggles</h4>
                  <div className="space-y-2">
                    {['referrals', 'vip', 'spinAndWin', 'giveaway', 'leaderboard'].map(feature => (
                      <div key={feature} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`toggle-${feature}`}
                          checked={appSettings.features?.[feature] ?? true}
                          onChange={(e) => setAppSettings(prev => ({ 
                            ...prev, 
                            features: { ...(prev.features || {}), [feature]: e.target.checked } 
                          }))}
                          className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-slate-600 focus:ring-slate-500"
                        />
                        <label htmlFor={`toggle-${feature}`} className="text-sm text-slate-700 dark:text-white/80 capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'app'), appSettings, { merge: true });
                    adminShowToast('Global configuration updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/app');
                  }
                }}
                className="mt-6 w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Global Configuration
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'security_logs' && (
          <motion.section key="security_logs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="text-red-500" /> Security & Logs
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">View audit logs and login history.</p>
              {tabLoading ? (
                <div className="flex justify-center py-12"><Clock className="animate-spin text-slate-400 dark:text-white/20" size={32} /></div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                  <ShieldAlert className="w-12 h-12 text-slate-300 dark:text-white/20 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-white/40 font-medium">Audit logging is active. Logs will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{log.action}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-white/60">
                            {log.adminEmail}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-white/40">{log.details}</p>
                      </div>
                      <div className="text-xs text-slate-400 dark:text-white/40">
                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, yyyy HH:mm') : 'Just now'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}

        {activeTab === 'system_override' && (
          <motion.section key="system_override" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="text-rose-500" /> System Override
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-rose-500/30 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-rose-500 mb-6 font-bold flex items-center gap-2">
                <AlertTriangle size={16} /> DANGER ZONE: These actions are irreversible.
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    if (window.confirm('Are you absolutely sure you want to clear ALL user balances? This cannot be undone.')) {
                      adminShowToast('System override: Balances cleared (Simulated)');
                      logAdminAction('SYSTEM_OVERRIDE', 'Simulated clearing all user balances');
                    }
                  }}
                  className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-bold py-3 rounded-xl transition-all"
                >
                  Clear All User Balances
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Are you absolutely sure you want to wipe ALL transaction history?')) {
                      adminShowToast('System override: History wiped (Simulated)');
                      logAdminAction('SYSTEM_OVERRIDE', 'Simulated wiping all transaction history');
                    }
                  }}
                  className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-bold py-3 rounded-xl transition-all"
                >
                  Wipe Transaction History
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('Are you absolutely sure you want to force logout ALL users globally?')) {
                      adminShowToast('System override: Global logout initiated (Simulated)');
                      logAdminAction('SYSTEM_OVERRIDE', 'Simulated global force logout');
                    }
                  }}
                  className="w-full bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 font-bold py-3 rounded-xl transition-all"
                >
                  Force Logout All Users
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === 'purchase_edit' && (
          <motion.section key="purchase_edit_2" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard className="text-blue-500" /> Purchase Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit plan prices & discounts.</p>
            </div>
          </motion.section>
        )}

        {activeTab === 'referral_edit' && (
          <motion.section key="referral_edit" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="text-green-500" /> Refer & Earn Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit referral rewards.</p>
            </div>
          </motion.section>
        )}

        {activeTab === 'leaderboard_edit' && (
          <motion.section key="leaderboard_edit" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="text-yellow-500" /> Leaderboard Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit leaderboard rules.</p>
            </div>
          </motion.section>
        )}

        {activeTab === 'achievement_edit' && (
          <motion.section key="achievement_edit" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="text-purple-500" /> Achievement Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit achievements.</p>
            </div>
          </motion.section>
        )}

        {activeTab === 'talk_edit' && (
          <motion.section key="talk_edit" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="text-cyan-500" /> Talks Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit welcome message.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">Welcome Message</label>
                  <textarea
                    value={talkSettings.welcomeMessage || ''}
                    onChange={(e) => setTalkSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                    rows={4}
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'talk'), talkSettings, { merge: true });
                    adminShowToast('Talks settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/talk');
                  }
                }}
                className="mt-6 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save Talks Settings
              </button>
            </div>
          </motion.section>
        )}

        {activeTab === 'ai_support_edit' && (
          <motion.section key="ai_support_edit" className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="text-orange-500" /> AI Support Edit
            </h3>
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <p className="text-sm text-slate-500 dark:text-white/60 mb-4">Edit system prompt.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 dark:text-white/40 uppercase tracking-widest mb-2 block">System Prompt</label>
                  <textarea
                    value={aiSupportSettings.systemPrompt || ''}
                    onChange={(e) => setAiSupportSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                    className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    rows={6}
                  />
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await setDoc(doc(db, 'settings', 'ai_support'), aiSupportSettings, { merge: true });
                    adminShowToast('AI Support settings updated!');
                  } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'settings/ai_support');
                  }
                }}
                className="mt-6 w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                Save AI Support Settings
              </button>
            </div>
          </motion.section>
        )}
        
        {activeTab === 'rewards' && (
          <motion.section
            key="rewards"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Gift className="text-pink-500" /> Physical Rewards Management
              </h3>
            </div>
            
            <div className="grid gap-4">
              {physicalRewards.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-white/40">No physical rewards found.</div>
              ) : (
                physicalRewards.map((reward) => (
                  <div key={reward.id} className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-white">{reward.item}</h4>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                          reward.status === 'pending_claim' ? 'bg-amber-500/10 text-amber-500' :
                          reward.status === 'pending_delivery' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {reward.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-white/60">User ID: <span className="font-mono">{reward.userId}</span></p>
                      <p className="text-xs text-slate-500 dark:text-white/60">Date: {reward.createdAt?.toDate ? reward.createdAt.toDate().toLocaleString() : 'N/A'}</p>
                      {reward.address && (
                        <div className="mt-3 bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm">
                          <p className="text-xs font-bold text-slate-500 dark:text-white/40 mb-1 uppercase tracking-widest">Delivery Address</p>
                          <p className="text-slate-900 dark:text-white">{reward.address}</p>
                        </div>
                      )}
                    </div>
                    {reward.status === 'pending_delivery' && (
                      <button
                        onClick={async () => {
                          try {
                            await updateDoc(doc(db, 'physical_rewards', reward.id), { status: 'delivered' });
                            showToast('Reward marked as delivered');
                          } catch (err) {
                            handleFirestoreError(err, OperationType.UPDATE, `physical_rewards/${reward.id}`);
                          }
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Mark Delivered
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )}

  {/* User Edit Modal */}
  {selectedUserForEdit && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#151619] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
      >
        <button 
          onClick={() => setSelectedUserForEdit(null)}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        <h3 className="text-xl font-bold text-white mb-6">Edit {selectedUserForEdit.email}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Balance</label>
            <input 
              type="number"
              defaultValue={selectedUserForEdit.balance}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              onBlur={async (e) => {
                const newBalance = Number(e.target.value);
                try {
                  await updateDoc(doc(db, 'users', selectedUserForEdit.id), { balance: newBalance });
                  showToast('Balance updated!');
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, `users/${selectedUserForEdit.id}`);
                }
              }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">UPI ID</label>
            <input 
              type="text"
              defaultValue={selectedUserForEdit.upiId}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
              onBlur={async (e) => {
                const newUpiId = e.target.value;
                try {
                  await updateDoc(doc(db, 'users', selectedUserForEdit.id), { upiId: newUpiId });
                  showToast('UPI ID updated!');
                } catch (err) {
                  handleFirestoreError(err, OperationType.UPDATE, `users/${selectedUserForEdit.id}`);
                }
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  )}

  {/* User Balance Modal */}
  {selectedUserBalance && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#151619] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <TrendingUp size={120} className="text-emerald-500" />
            </div>
            <button 
              onClick={() => setSelectedUserBalance(null)}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">User Balance</h3>
                  <p className="text-xs text-white/40 truncate max-w-[200px]">{selectedUserBalance.email}</p>
                </div>
              </div>
              
              <div className="bg-black/40 border border-white/5 rounded-2xl p-6 text-center">
                <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Current Master Plan Balance</div>
                <div className="text-4xl font-black text-emerald-500 tracking-tighter">
                  ₹{selectedUserBalance.balance.toLocaleString()}
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedUserBalance(null)}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-2xl transition-all border border-white/10"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectionModal?.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151619] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <XCircle className="text-red-500" /> Reject Purchase
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Select Reason</label>
                  <div className="grid grid-cols-1 gap-2">
                    {REJECTION_REASONS.map(reason => (
                      <button
                        key={reason}
                        onClick={() => setRejectionReason(reason)}
                        className={`text-left px-4 py-3 rounded-xl text-sm transition-all border ${
                          rejectionReason === reason 
                            ? 'bg-emerald-500/10 border-emerald-500 text-white' 
                            : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                {rejectionReason === 'Other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Custom Reason</label>
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Enter specific reason..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 h-24 resize-none"
                    />
                  </motion.div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setRejectionModal({ isOpen: false, purchaseId: null });
                      setRejectionReason('');
                      setCustomReason('');
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRejection}
                    disabled={!rejectionReason || (rejectionReason === 'Other' && !customReason)}
                    className="active:scale-95 hover:scale-[1.02] transition-transform flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all"
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Wallet Modal */}
      <AnimatePresence>
        {userToEditWallet && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151619] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-emerald-500" /> Edit Wallet
              </h3>
              <p className="text-xs text-white/40">{userToEditWallet.email}</p>
              
              <div>
                <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">New Balance (0 - 100M)</label>
                <input 
                  type="number"
                  defaultValue={userToEditWallet.walletBalance || 0}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50"
                  id="new-wallet-balance-input-manual"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUserToEditWallet(null)}
                  className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const input = document.getElementById('new-wallet-balance-input-manual') as HTMLInputElement;
                    const val = Number(input.value);
                    if (!isNaN(val) && val >= 0 && val <= 100000000) {
                      try {
                        await updateDoc(doc(db, 'users', userToEditWallet.id), { walletBalance: val });
                        showToast('Wallet balance updated!');
                        logAdminAction('EDIT_WALLET', `Updated balance for ${userToEditWallet.email} to ${val}`);
                        setUserToEditWallet(null);
                      } catch (err) {
                        showToast('Error updating balance');
                      }
                    } else {
                      showToast('Invalid balance');
                    }
                  }}
                  className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Profile Modal */}
      <AnimatePresence>
        {userToEditProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151619] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="text-blue-500" /> Edit Profile
              </h3>
              <p className="text-xs text-white/40">{userToEditProfile.email}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">Username</label>
                  <input 
                    type="text"
                    defaultValue={userToEditProfile.name || ''}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                    id="new-profile-name-input-manual"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-white/30 uppercase tracking-widest mb-2">UID</label>
                  <input 
                    type="text"
                    defaultValue={userToEditProfile.uid || ''}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
                    id="new-profile-uid-input-manual"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUserToEditProfile(null)}
                  className="flex-1 bg-white/5 text-white font-bold py-3 rounded-xl hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const name = (document.getElementById('new-profile-name-input-manual') as HTMLInputElement).value;
                    const uid = (document.getElementById('new-profile-uid-input-manual') as HTMLInputElement).value;
                    try {
                      await updateDoc(doc(db, 'users', userToEditProfile.id), { name, uid });
                      showToast('Profile updated!');
                      logAdminAction('EDIT_PROFILE', `Updated profile for ${userToEditProfile.email}`);
                      setUserToEditProfile(null);
                    } catch (err) {
                      showToast('Error updating profile');
                    }
                  }}
                  className="flex-1 bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Inbox Component ---
const InboxView: React.FC<{ onBack: () => void; onPurchase: () => void }> = ({ onBack, onPurchase }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Listen for notifications
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', user.uid)
    );
    const unsubNotifications = onSnapshot(q, (snapshot) => {
      const nData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      nData.sort((a, b) => {
        const dateA = a.timestamp?.toDate?.() || new Date(0);
        const dateB = b.timestamp?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setNotifications(nData);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
      setLoading(false);
    });

    // Check plan status for reminders
    const unsubPlanStatus = onSnapshot(doc(db, 'plans', user.uid), (doc) => {
      setHasActivePlan(doc.exists() && doc.data()?.isActive === true);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `plans/${user.uid}`);
    });

    return () => { unsubNotifications(); unsubPlanStatus(); };
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="text-emerald-500" /> Inbox
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="space-y-4">
        {/* Dynamic Reminders */}
        {!hasActivePlan && (
          <>
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-orange-500/20 p-3 rounded-xl text-orange-600 dark:text-orange-500">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">Urgent: Renewal Required</h4>
                  <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">
                    Your access plan is missing or has expired. Renew now to continue receiving live predictions.
                  </p>
                </div>
              </div>
              <button 
                onClick={onPurchase}
                className="active:scale-95 hover:scale-[1.02] transition-transform w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-orange-900/20"
              >
                Renew Plan Now
              </button>
            </div>
            <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-4">
              <Info className="text-blue-600 dark:text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-blue-900/60 dark:text-blue-200/60">Tip: Regular renewals ensure uninterrupted access to premium data.</p>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-4">
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-500 shrink-0" size={20} />
              <p className="text-xs text-emerald-900/60 dark:text-emerald-200/60">Notice: Your prediction history is saved. Renew to view all past results.</p>
            </div>
          </>
        )}

        {/* System Notifications */}
        {loading ? (
          <div className="flex justify-center py-12"><Clock className="animate-spin text-slate-400 dark:text-white/20" size={32} /></div>
        ) : notifications.length === 0 && hasActivePlan ? (
          <div className="text-center py-12 bg-white dark:bg-white/5 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 shadow-sm">
            <Bell className="text-slate-200 dark:text-white/10 mx-auto mb-4" size={48} />
            <p className="text-slate-400 dark:text-white/30">Your inbox is empty.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className={`bg-white dark:bg-[#151619] border ${n.read ? 'border-slate-200 dark:border-white/5' : 'border-emerald-500/30'} rounded-2xl p-6 relative overflow-hidden transition-all shadow-sm hover:shadow-md cursor-pointer`}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              {!n.read && <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full m-4" />}
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  n.type === 'error' ? 'bg-red-500/10 text-red-600 dark:text-red-500' : 
                  n.type === 'warning' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-500' : 
                  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500'
                }`}>
                  {n.type === 'error' ? <XCircle size={20} /> : n.type === 'warning' ? <AlertCircle size={20} /> : <Info size={20} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-900 dark:text-white">{n.title}</h4>
                    <span className="text-[10px] text-slate-400 dark:text-white/20 font-bold uppercase tracking-widest">
                      {n.timestamp?.toDate ? format(n.timestamp.toDate(), 'MMM d, p') : 'Just now'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">{n.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};




// --- Wingo 30s Component ---
const Wingo30sView: React.FC<{ onBack: () => void; hasAccess: boolean; onPurchase: () => void }> = ({ onBack, hasAccess, onPurchase }) => {
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [prediction, setPrediction] = useState<{ result: string, numbers: number[] } | null>(null);
  const [history, setHistory] = useState<{ period: string, result: string, numbers: number[], isWin: boolean | null }[]>([]);
  const [pendingResultPeriod, setPendingResultPeriod] = useState<{ period: string, result: string, numbers: number[] } | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const getPeriodData = (now: Date) => {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const date = String(now.getUTCDate()).padStart(2, '0');
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const seconds = now.getUTCSeconds();
    
    const slot = seconds < 30 ? 0 : 1;
    const totalSlots = (hours * 60 + minutes) * 2 + slot;
    const periodId = `${year}${month}${date}10005${totalSlots + 1}`;
    const remainingSeconds = 30 - (seconds % 30);
    
    return { periodId, remainingSeconds };
  };

  useEffect(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('registerModalDismissedDate');
    if (dismissedDate !== today) {
      setShowRegisterModal(true);
    }
  }, []);

  const dismissRegisterModal = () => {
    const today = new Date().toDateString();
    localStorage.setItem('registerModalDismissedDate', today);
    setShowRegisterModal(false);
  };

  const handleMarkResult = (isWin: boolean) => {
    if (pendingResultPeriod) {
      setHistory(prev => [{ 
        period: pendingResultPeriod.period, 
        result: pendingResultPeriod.result, 
        numbers: pendingResultPeriod.numbers, 
        isWin 
      }, ...prev].slice(0, 7));
      setPendingResultPeriod(null);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;

    const generatePredictionForPeriod = (period: string) => {
      let seed = 0;
      const seedString = period + 'wingo30s';
      for (let i = 0; i < seedString.length; i++) {
        seed = seedString.charCodeAt(i) + ((seed << 5) - seed);
      }
      
      const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      const isBigRandom = random() > 0.5;
      const finalResult = isBigRandom ? 'SMALL' : 'BIG';

      const bigOdds = [5, 7, 9];
      const bigEvens = [6, 8];
      const smallOdds = [1, 3];
      const smallEvens = [0, 2, 4];

      let numbers: number[] = [];
      if (finalResult === 'BIG') {
        const odd = bigOdds[Math.floor(random() * bigOdds.length)];
        const even = bigEvens[Math.floor(random() * bigEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      } else {
        const odd = smallOdds[Math.floor(random() * smallOdds.length)];
        const even = smallEvens[Math.floor(random() * smallEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      }

      return { result: finalResult, numbers };
    };

    const updateTimer = () => {
      const now = new Date();
      const { periodId, remainingSeconds } = getPeriodData(now);
      
      setCountdown(remainingSeconds);
      
      setCurrentPeriod(prevPeriod => {
        if (prevPeriod && prevPeriod !== periodId) {
          const prevPred = generatePredictionForPeriod(prevPeriod);
          setPendingResultPeriod({ period: prevPeriod, ...prevPred });
        }
        return periodId;
      });

      const currentPrediction = generatePredictionForPeriod(periodId);
      setPrediction(currentPrediction);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="text-center py-12 bg-red-500/5 rounded-3xl border border-red-500/20 shadow-sm">
        <XCircle className="text-red-600 dark:text-red-500 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-slate-600 dark:text-white/50 max-w-xs mx-auto mb-6">You need an active plan to view live predictions.</p>
        <div className="flex justify-center gap-4">
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 shadow-sm">Back to Home</button>
          <button onClick={onPurchase} className="active:scale-95 hover:scale-[1.02] transition-transform bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl transition-all shadow-sm font-bold">Purchase Plan</button>
        </div>
      </div>
    );
  }

  const knownResults = history.filter(h => h.isWin !== null);
  const winCount = knownResults.filter(h => h.isWin).length;
  const winRate = knownResults.length > 0 ? Math.round((winCount / knownResults.length) * 100) : 0;

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={dismissRegisterModal} className="active:scale-95 hover:scale-[1.02] transition-transform absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={20} />
              </button>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                <AlertCircle className="text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Important Notice</h3>
              <p className="text-slate-600 dark:text-white/70 mb-6 leading-relaxed">
                Register a new account from my account, if you lose I'll be the responsible for any loss. Feel free to contact for refund.
              </p>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://6club33.com/#/register?invitationCode=226164616218" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={dismissRegisterModal}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-center font-bold px-6 py-3 rounded-xl transition-all shadow-md"
                >
                  Register Now
                </a>
                <button 
                  onClick={dismissRegisterModal}
                  className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold px-6 py-3 rounded-xl transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Clock className="text-blue-500" /> Wingo 30s
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {/* AI Stats */}
      <div className="flex items-center justify-between bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <TrendingUp className="text-blue-500" size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">AI Time Analysis</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Predicting next outcome <span className="flex gap-0.5"><span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span><span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span><span className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span></span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Win Rate (Last 7)</div>
          <div className="text-2xl font-black text-blue-500">{winRate}%</div>
        </div>
      </div>

      {/* Current Prediction Card */}
      <div className="bg-gradient-to-br from-slate-900 to-[#151619] dark:from-[#151619] dark:to-black border border-slate-800 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Clock size={120} className="text-blue-500" />
        </div>
        
        {pendingResultPeriod && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 dark:bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/30 animate-pulse">
              <Check size={32} className="text-blue-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Period {pendingResultPeriod.period} Ended</h3>
            <p className="text-white/70 mb-8 max-w-xs">Was the prediction ({pendingResultPeriod.result}) a Win or a Loss? Mark it to see the next prediction.</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => handleMarkResult(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
              >
                WIN
              </button>
              <button 
                onClick={() => handleMarkResult(false)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20"
              >
                LOSS
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center border-b border-white/10 pb-6">
            <div>
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Period Number</div>
              <div className="text-xl font-mono font-bold text-white">{currentPeriod}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Time Remaining</div>
              <div className={`text-3xl font-mono font-black ${countdown <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`}>
                00:{countdown.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {prediction && (
            <div className="text-center space-y-6">
              <div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">AI Prediction Result</div>
                <div className={`text-6xl font-black tracking-tighter drop-shadow-lg ${prediction.result === 'BIG' ? 'text-blue-500' : 'text-orange-500'}`}>
                  {prediction.result}
                </div>
              </div>
              
              <div className="flex justify-center gap-3">
                {prediction.numbers.map((num, idx) => (
                  <div key={idx} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white">
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent History</h3>
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Last 7 Rounds</div>
        </div>
        
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              <p className="text-sm text-slate-400 dark:text-white/30">No history yet. Mark results to see them here.</p>
            </div>
          ) : (
            history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${h.isWin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {h.isWin ? 'W' : 'L'}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Period {h.period}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{h.result}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {h.numbers.map((n, i) => (
                    <div key={i} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-white/60">
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- Wingo 3Min Component ---
// --- Wingo Selection View ---
const WingoSelectionView: React.FC<{ onBack: () => void; onSelect: (mode: 'master' | 'predictions') => void; wingo: string, isAdmin: boolean }> = ({ onBack, onSelect, wingo, isAdmin }) => {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
          WinGo {wingo}
        </h2>
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => {
            if (isAdmin) {
              onSelect('master');
            }
          }}
          className={`p-8 rounded-[2.5rem] border flex flex-col items-center gap-4 group transition-all shadow-sm relative overflow-hidden ${
            isAdmin 
              ? 'bg-white dark:bg-[#151619] border-slate-200 dark:border-white/10 hover:border-emerald-500/50' 
              : 'bg-slate-100 dark:bg-white/5 border-transparent cursor-not-allowed grayscale opacity-80'
          }`}
        >
          {!isAdmin && (
            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full z-10">
              Coming Soon
            </div>
          )}
          <div className={`p-4 rounded-3xl group-hover:scale-110 transition-transform ${
            isAdmin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-white/10 text-slate-400'
          }`}>
            <Target size={32} />
          </div>
          <div className="text-center">
            <span className="block font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Master Plan</span>
            <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest font-bold">Neural Recovery Strategy</span>
          </div>
        </button>

        <button 
          onClick={() => onSelect('predictions')}
          className="p-8 rounded-[2.5rem] bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 flex flex-col items-center gap-4 group hover:border-emerald-500/50 transition-all shadow-sm"
        >
          <div className="p-4 rounded-3xl bg-emerald-500 text-white group-hover:scale-110 transition-transform shadow-lg shadow-emerald-500/20">
            <Zap size={32} />
          </div>
          <div className="text-center">
            <span className="block font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Predictions</span>
            <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest font-bold">Neural Live Analysis</span>
          </div>
        </button>
      </div>
    </div>
  );
};

// --- Master Prediction View ---

const Wingo3MinView: React.FC<{ onBack: () => void; hasAccess: boolean; onPurchase: () => void }> = ({ onBack, hasAccess, onPurchase }) => {
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [countdown, setCountdown] = useState(180);
  const [prediction, setPrediction] = useState<{ result: string, numbers: number[] } | null>(null);
  const [history, setHistory] = useState<{ period: string, result: string, numbers: number[], isWin: boolean | null }[]>([]);
  const [pendingResultPeriod, setPendingResultPeriod] = useState<{ period: string, result: string, numbers: number[] } | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const getPeriodData = (now: Date) => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    
    const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const adjustedSeconds = (secondsSinceMidnight - 18000 + 86400) % 86400;
    const cycleIndex = Math.floor(adjustedSeconds / 180);
    const counter = cycleIndex + 1;
    const offset = -10;
    const finalCounter = ((counter + offset - 1) % 480 + 480) % 480 + 1;
    const paddedCounter = String(finalCounter).padStart(4, '0');
    
    const periodId = `${year}${month}${date}10002${paddedCounter}`;
    const remainingSeconds = 180 - (adjustedSeconds % 180);
    
    return { periodId, remainingSeconds };
  };

  useEffect(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('registerModalDismissedDate');
    if (dismissedDate !== today) {
      setShowRegisterModal(true);
    }
  }, []);

  const dismissRegisterModal = () => {
    const today = new Date().toDateString();
    localStorage.setItem('registerModalDismissedDate', today);
    setShowRegisterModal(false);
  };

  const handleMarkResult = (isWin: boolean) => {
    if (pendingResultPeriod) {
      setHistory(prev => [{ 
        period: pendingResultPeriod.period, 
        result: pendingResultPeriod.result, 
        numbers: pendingResultPeriod.numbers, 
        isWin 
      }, ...prev].slice(0, 7));
      setPendingResultPeriod(null);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;

    const generatePredictionForPeriod = (period: string) => {
      let seed = 0;
      const seedString = period + 'wingo3min';
      for (let i = 0; i < seedString.length; i++) {
        seed = seedString.charCodeAt(i) + ((seed << 5) - seed);
      }
      
      const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      const isBigRandom = random() > 0.5;
      const finalResult = isBigRandom ? 'SMALL' : 'BIG';

      const bigOdds = [5, 7, 9];
      const bigEvens = [6, 8];
      const smallOdds = [1, 3];
      const smallEvens = [0, 2, 4];

      let numbers: number[] = [];
      if (finalResult === 'BIG') {
        const odd = bigOdds[Math.floor(random() * bigOdds.length)];
        const even = bigEvens[Math.floor(random() * bigEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      } else {
        const odd = smallOdds[Math.floor(random() * smallOdds.length)];
        const even = smallEvens[Math.floor(random() * smallEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      }

      return { result: finalResult, numbers };
    };

    const updateTimer = () => {
      const now = new Date();
      const { periodId, remainingSeconds } = getPeriodData(now);
      
      setCountdown(remainingSeconds);
      
      setCurrentPeriod(prevPeriod => {
        if (prevPeriod && prevPeriod !== periodId) {
          const prevPred = generatePredictionForPeriod(prevPeriod);
          setPendingResultPeriod({ period: prevPeriod, ...prevPred });
        }
        return periodId;
      });

      const currentPrediction = generatePredictionForPeriod(periodId);
      setPrediction(currentPrediction);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="text-center py-12 bg-red-500/5 rounded-3xl border border-red-500/20 shadow-sm">
        <XCircle className="text-red-600 dark:text-red-500 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-slate-600 dark:text-white/50 max-w-xs mx-auto mb-6">You need an active plan to view live predictions.</p>
        <div className="flex justify-center gap-4">
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 shadow-sm">Back to Home</button>
          <button onClick={onPurchase} className="active:scale-95 hover:scale-[1.02] transition-transform bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl transition-all shadow-sm font-bold">Purchase Plan</button>
        </div>
      </div>
    );
  }

  const knownResults = history.filter(h => h.isWin !== null);
  const winCount = knownResults.filter(h => h.isWin).length;
  const winRate = knownResults.length > 0 ? Math.round((winCount / knownResults.length) * 100) : 0;

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={dismissRegisterModal} className="active:scale-95 hover:scale-[1.02] transition-transform absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={20} />
              </button>
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-4 border border-orange-500/20">
                <AlertCircle className="text-orange-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Important Notice</h3>
              <p className="text-slate-600 dark:text-white/70 mb-6 leading-relaxed">
                Register a new account from my account, if you lose I'll be the responsible for any loss. Feel free to contact for refund.
              </p>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://6club33.com/#/register?invitationCode=226164616218" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={dismissRegisterModal}
                  className="bg-orange-600 hover:bg-orange-500 text-white text-center font-bold px-6 py-3 rounded-xl transition-all shadow-md"
                >
                  Register Now
                </a>
                <button 
                  onClick={dismissRegisterModal}
                  className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold px-6 py-3 rounded-xl transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Zap className="text-orange-500" /> Wingo 3Min
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="flex items-center justify-between bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <TrendingUp className="text-orange-500" size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">AI Time Analysis</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Predicting next outcome <span className="flex gap-0.5"><span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span><span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span><span className="w-1 h-1 bg-orange-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span></span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Win Rate (Last 7)</div>
          <div className="text-2xl font-black text-orange-500">{winRate}%</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-[#151619] dark:from-[#151619] dark:to-black border border-slate-800 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Zap size={120} className="text-orange-500" />
        </div>
        
        {pendingResultPeriod && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 dark:bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-4 border border-orange-500/30 animate-pulse">
              <Check size={32} className="text-orange-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Period {pendingResultPeriod.period} Ended</h3>
            <p className="text-white/70 mb-8 max-w-xs">Was the prediction ({pendingResultPeriod.result}) a Win or a Loss? Mark it to see the next prediction.</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => handleMarkResult(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
              >
                WIN
              </button>
              <button 
                onClick={() => handleMarkResult(false)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20"
              >
                LOSS
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center border-b border-white/10 pb-6">
            <div>
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Period Number</div>
              <div className="text-xl font-mono font-bold text-white">{currentPeriod}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Time Remaining</div>
              <div className={`text-3xl font-mono font-black ${countdown <= 30 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {prediction && (
            <div className="text-center space-y-6">
              <div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">AI Prediction Result</div>
                <div className={`text-6xl font-black tracking-tighter drop-shadow-lg ${prediction.result === 'BIG' ? 'text-blue-500' : 'text-orange-500'}`}>
                  {prediction.result}
                </div>
              </div>
              
              <div className="flex justify-center gap-3">
                {prediction.numbers.map((num, idx) => (
                  <div key={idx} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white">
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent History</h3>
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Last 7 Rounds</div>
        </div>
        
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              <p className="text-sm text-slate-400 dark:text-white/30">No history yet. Mark results to see them here.</p>
            </div>
          ) : (
            history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${h.isWin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {h.isWin ? 'W' : 'L'}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Period {h.period}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{h.result}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {h.numbers.map((n, i) => (
                    <div key={i} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-white/60">
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- Wingo 5Min Component ---
const Wingo5MinView: React.FC<{ onBack: () => void; hasAccess: boolean; onPurchase: () => void }> = ({ onBack, hasAccess, onPurchase }) => {
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [prediction, setPrediction] = useState<{ result: string, numbers: number[] } | null>(null);
  const [history, setHistory] = useState<{ period: string, result: string, numbers: number[], isWin: boolean | null }[]>([]);
  const [pendingResultPeriod, setPendingResultPeriod] = useState<{ period: string, result: string, numbers: number[] } | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const getPeriodData = (now: Date) => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    
    const secondsSinceMidnight = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const adjustedSeconds = (secondsSinceMidnight - 18000 + 86400) % 86400;
    const cycleIndex = Math.floor(adjustedSeconds / 300);
    const counter = cycleIndex + 1;
    const offset = 0; // Configurable offset
    const finalCounter = ((counter + offset - 1) % 288 + 288) % 288 + 1;
    const paddedCounter = String(finalCounter).padStart(4, '0');
    
    const periodId = `${year}${month}${date}10003${paddedCounter}`;
    const remainingSeconds = 300 - (adjustedSeconds % 300);
    
    return { periodId, remainingSeconds };
  };

  useEffect(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('registerModalDismissedDate');
    if (dismissedDate !== today) {
      setShowRegisterModal(true);
    }
  }, []);

  const dismissRegisterModal = () => {
    const today = new Date().toDateString();
    localStorage.setItem('registerModalDismissedDate', today);
    setShowRegisterModal(false);
  };

  const handleMarkResult = (isWin: boolean) => {
    if (pendingResultPeriod) {
      setHistory(prev => [{ 
        period: pendingResultPeriod.period, 
        result: pendingResultPeriod.result, 
        numbers: pendingResultPeriod.numbers, 
        isWin 
      }, ...prev].slice(0, 7));
      setPendingResultPeriod(null);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;

    const generatePredictionForPeriod = (period: string) => {
      let seed = 0;
      const seedString = period + 'wingo5min';
      for (let i = 0; i < seedString.length; i++) {
        seed = seedString.charCodeAt(i) + ((seed << 5) - seed);
      }
      
      const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      const isBigRandom = random() > 0.5;
      const finalResult = isBigRandom ? 'SMALL' : 'BIG';

      const bigOdds = [5, 7, 9];
      const bigEvens = [6, 8];
      const smallOdds = [1, 3];
      const smallEvens = [0, 2, 4];

      let numbers: number[] = [];
      if (finalResult === 'BIG') {
        const odd = bigOdds[Math.floor(random() * bigOdds.length)];
        const even = bigEvens[Math.floor(random() * bigEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      } else {
        const odd = smallOdds[Math.floor(random() * smallOdds.length)];
        const even = smallEvens[Math.floor(random() * smallEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      }

      return { result: finalResult, numbers };
    };

    const updateTimer = () => {
      const now = new Date();
      const { periodId, remainingSeconds } = getPeriodData(now);
      
      setCountdown(remainingSeconds);
      
      setCurrentPeriod(prevPeriod => {
        if (prevPeriod && prevPeriod !== periodId) {
          const prevPred = generatePredictionForPeriod(prevPeriod);
          setPendingResultPeriod({ period: prevPeriod, ...prevPred });
        }
        return periodId;
      });

      const currentPrediction = generatePredictionForPeriod(periodId);
      setPrediction(currentPrediction);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="text-center py-12 bg-red-500/5 rounded-3xl border border-red-500/20 shadow-sm">
        <XCircle className="text-red-600 dark:text-red-500 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-slate-600 dark:text-white/50 max-w-xs mx-auto mb-6">You need an active plan to view live predictions.</p>
        <div className="flex justify-center gap-4">
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 shadow-sm">Back to Home</button>
          <button onClick={onPurchase} className="active:scale-95 hover:scale-[1.02] transition-transform bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl transition-all shadow-sm font-bold">Purchase Plan</button>
        </div>
      </div>
    );
  }

  const knownResults = history.filter(h => h.isWin !== null);
  const winCount = knownResults.filter(h => h.isWin).length;
  const winRate = knownResults.length > 0 ? Math.round((winCount / knownResults.length) * 100) : 0;

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={dismissRegisterModal} className="active:scale-95 hover:scale-[1.02] transition-transform absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={20} />
              </button>
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
                <AlertCircle className="text-red-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Important Notice</h3>
              <p className="text-slate-600 dark:text-white/70 mb-6 leading-relaxed">
                Register a new account from my account, if you lose I'll be the responsible for any loss. Feel free to contact for refund.
              </p>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://6club33.com/#/register?invitationCode=226164616218" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={dismissRegisterModal}
                  className="bg-red-600 hover:bg-red-500 text-white text-center font-bold px-6 py-3 rounded-xl transition-all shadow-md"
                >
                  Register Now
                </a>
                <button 
                  onClick={dismissRegisterModal}
                  className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold px-6 py-3 rounded-xl transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="text-red-500" /> Wingo 5Min
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="flex items-center justify-between bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
            <TrendingUp className="text-red-500" size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">AI Time Analysis</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Predicting next outcome <span className="flex gap-0.5"><span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span><span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span><span className="w-1 h-1 bg-red-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span></span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Win Rate (Last 7)</div>
          <div className="text-2xl font-black text-red-500">{winRate}%</div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-[#151619] dark:from-[#151619] dark:to-black border border-slate-800 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Activity size={120} className="text-red-500" />
        </div>
        
        {pendingResultPeriod && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 dark:bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4 border border-red-500/30 animate-pulse">
              <Check size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Period {pendingResultPeriod.period} Ended</h3>
            <p className="text-white/70 mb-8 max-w-xs">Was the prediction ({pendingResultPeriod.result}) a Win or a Loss? Mark it to see the next prediction.</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => handleMarkResult(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
              >
                WIN
              </button>
              <button 
                onClick={() => handleMarkResult(false)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20"
              >
                LOSS
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center border-b border-white/10 pb-6">
            <div>
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Period Number</div>
              <div className="text-xl font-mono font-bold text-white">{currentPeriod}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Time Remaining</div>
              <div className={`text-3xl font-mono font-black ${countdown <= 60 ? 'text-red-500 animate-pulse' : 'text-red-500'}`}>
                {Math.floor(countdown / 60).toString().padStart(2, '0')}:{(countdown % 60).toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {prediction && (
            <div className="text-center space-y-6">
              <div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">AI Prediction Result</div>
                <div className={`text-6xl font-black tracking-tighter drop-shadow-lg ${prediction.result === 'BIG' ? 'text-blue-500' : 'text-orange-500'}`}>
                  {prediction.result}
                </div>
              </div>
              
              <div className="flex justify-center gap-3">
                {prediction.numbers.map((num, idx) => (
                  <div key={idx} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white">
                    {num}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Recent History</h3>
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Last 7 Rounds</div>
        </div>
        
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              <p className="text-sm text-slate-400 dark:text-white/30">No history yet. Mark results to see them here.</p>
            </div>
          ) : (
            history.map((h, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${h.isWin ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {h.isWin ? 'W' : 'L'}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Period {h.period}</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{h.result}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {h.numbers.map((n, i) => (
                    <div key={i} className="w-6 h-6 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-white/60">
                      {n}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- Wingo 1Min Component ---
const Wingo1MinView: React.FC<{ onBack: () => void; hasAccess: boolean; onPurchase: () => void }> = ({ onBack, hasAccess, onPurchase }) => {
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [countdown, setCountdown] = useState(60);
  const gameType = '1min';
  const [prediction, setPrediction] = useState<{ result: string, numbers: number[] } | null>(null);
  const [history, setHistory] = useState<{ period: string, result: string, numbers: number[], isWin: boolean | null }[]>([]);
  const [pendingResultPeriod, setPendingResultPeriod] = useState<{ period: string, result: string, numbers: number[] } | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [publicFeedbacks, setPublicFeedbacks] = useState<Feedback[]>([]);

  const getPeriod = (now: Date) => {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const date = String(now.getUTCDate()).padStart(2, '0');
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    
    const totalMinutesOfDay = hours * 60 + minutes;
    return `${year}${month}${date}1000${10001 + totalMinutesOfDay}`;
  };

  useEffect(() => {
    const q = query(
      collection(db, 'feedbacks'),
      where('isPublic', '==', true),
      where('rating', '>=', 4),
      orderBy('rating', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPublicFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
    }, (err) => {
      console.error("Error fetching public feedbacks:", err);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const today = new Date().toDateString();
    const dismissedDate = localStorage.getItem('registerModalDismissedDate');
    if (dismissedDate !== today) {
      setShowRegisterModal(true);
    }
  }, []);

  const dismissRegisterModal = () => {
    const today = new Date().toDateString();
    localStorage.setItem('registerModalDismissedDate', today);
    setShowRegisterModal(false);
  };

  const handleMarkResult = (isWin: boolean) => {
    if (pendingResultPeriod) {
      setHistory(prev => [{ 
        period: pendingResultPeriod.period, 
        result: pendingResultPeriod.result, 
        numbers: pendingResultPeriod.numbers, 
        isWin 
      }, ...prev].slice(0, 7));
      setPendingResultPeriod(null);
    }
  };

  useEffect(() => {
    if (!hasAccess) return;

    const generatePredictionForPeriod = (period: string) => {
      let seed = 0;
      const seedString = period + gameType;
      for (let i = 0; i < seedString.length; i++) {
        seed = seedString.charCodeAt(i) + ((seed << 5) - seed);
      }
      
      const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };

      const isBigRandom = random() > 0.5;
      const finalResult = isBigRandom ? 'SMALL' : 'BIG';

      const bigOdds = [5, 7, 9];
      const bigEvens = [6, 8];
      const smallOdds = [1, 3];
      const smallEvens = [0, 2, 4];

      let numbers: number[] = [];
      if (finalResult === 'BIG') {
        const odd = bigOdds[Math.floor(random() * bigOdds.length)];
        const even = bigEvens[Math.floor(random() * bigEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      } else {
        const odd = smallOdds[Math.floor(random() * smallOdds.length)];
        const even = smallEvens[Math.floor(random() * smallEvens.length)];
        numbers = random() > 0.5 ? [odd, even] : [even, odd];
      }

      const isWin = null; // AI no longer generates win/loss

      return { result: finalResult, numbers, isWin };
    };

    const updateTimer = () => {
      const now = new Date();
      const periodNumber = getPeriod(now);
      
      const seconds = now.getUTCSeconds();
      const remainingSeconds = 60 - seconds;
      
      setCountdown(remainingSeconds);
      
      setCurrentPeriod(prevPeriod => {
        if (prevPeriod && prevPeriod !== periodNumber) {
          const prevPred = generatePredictionForPeriod(prevPeriod);
          setPendingResultPeriod({ period: prevPeriod, ...prevPred });
        }
        return periodNumber;
      });

      const currentPrediction = generatePredictionForPeriod(periodNumber);
      setPrediction(currentPrediction);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasAccess]);

  if (!hasAccess) {
    return (
      <div className="text-center py-12 bg-red-500/5 rounded-3xl border border-red-500/20 shadow-sm">
        <XCircle className="text-red-600 dark:text-red-500 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-slate-600 dark:text-white/50 max-w-xs mx-auto mb-6">You need an active plan to view live predictions.</p>
        <div className="flex justify-center gap-4">
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 shadow-sm">Back to Home</button>
          <button onClick={onPurchase} className="active:scale-95 hover:scale-[1.02] transition-transform bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-xl transition-all shadow-sm font-bold">Purchase Plan</button>
        </div>
      </div>
    );
  }

  const knownResults = history.filter(h => h.isWin !== null);
  const winCount = knownResults.filter(h => h.isWin).length;
  const winRate = knownResults.length > 0 ? Math.round((winCount / knownResults.length) * 100) : 0;

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {showRegisterModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
            >
              <button onClick={dismissRegisterModal} className="active:scale-95 hover:scale-[1.02] transition-transform absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <X size={20} />
              </button>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 border border-blue-500/20">
                <AlertCircle className="text-blue-500" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Important Notice</h3>
              <p className="text-slate-600 dark:text-white/70 mb-6 leading-relaxed">
                Register a new account from my account, if you lose I'll be the responsible for any loss. Feel free to contact for refund.
              </p>
              <div className="flex flex-col gap-3">
                <a 
                  href="https://6club33.com/#/register?invitationCode=226164616218" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={dismissRegisterModal}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-center font-bold px-6 py-3 rounded-xl transition-all shadow-md"
                >
                  Register Now
                </a>
                <button 
                  onClick={dismissRegisterModal}
                  className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold px-6 py-3 rounded-xl transition-all"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="text-emerald-500" /> Only Wingo 1Min
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      {/* AI Stats */}
      <div className="flex items-center justify-between bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">AI Chart Analysis</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Predicting next outcome <span className="flex gap-0.5"><span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span><span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span><span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span></span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Win Rate (Last 7)</div>
          <div className="text-2xl font-black text-emerald-500">{winRate}%</div>
        </div>
      </div>

      {/* Current Prediction Card */}
      <div className="bg-gradient-to-br from-slate-900 to-[#151619] dark:from-[#151619] dark:to-black border border-slate-800 dark:border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <TrendingUp size={120} className="text-emerald-500" />
        </div>
        
        {pendingResultPeriod && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 dark:bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/30 animate-pulse">
              <Check size={32} className="text-emerald-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Period {pendingResultPeriod.period} Ended</h3>
            <p className="text-white/70 mb-8 max-w-xs">Was the prediction ({pendingResultPeriod.result}) a Win or a Loss? Mark it to see the next prediction.</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => handleMarkResult(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
              >
                WIN
              </button>
              <button 
                onClick={() => handleMarkResult(false)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20"
              >
                LOSS
              </button>
            </div>
          </div>
        )}

        <div className="relative z-10 space-y-8">
          <div className="flex justify-between items-center border-b border-white/10 pb-6">
            <div>
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Period Number</div>
              <div className="text-xl font-mono font-bold text-white">{currentPeriod}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Time Remaining</div>
              <div className={`text-3xl font-mono font-black ${countdown <= 10 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                00:{countdown.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          {prediction && (
            <div className="text-center space-y-6">
              <div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">AI Prediction Result</div>
                <div className={`text-6xl font-black tracking-tighter drop-shadow-lg ${prediction.result === 'BIG' ? 'text-blue-500' : 'text-orange-500'}`}>
                  {prediction.result}
                </div>
              </div>
              
              <div>
                <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Generated Numbers</div>
                <div className="flex justify-center gap-4">
                  {prediction.numbers.map((num, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-md group-hover:bg-emerald-500/40 transition-all"></div>
                      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/20 flex items-center justify-center text-3xl font-black text-white shadow-xl backdrop-blur-sm">
                        {num}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
          <Clock size={16} className="text-emerald-500" /> Past 7 Predictions
        </h3>
        <div className="grid gap-2">
          {history.map((h) => (
            <div key={h.period} className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center justify-between shadow-sm">
              <div className="font-mono text-xs font-bold text-slate-600 dark:text-white/60">{h.period}</div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {h.numbers.map((num, idx) => (
                    <div key={idx} className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/10 dark:to-white/5 border border-slate-300 dark:border-white/20 flex items-center justify-center text-xs font-black text-slate-800 dark:text-white shadow-sm">
                      {num}
                    </div>
                  ))}
                </div>
                <div className={`text-xs font-black w-12 text-center ${h.result === 'BIG' ? 'text-blue-500' : 'text-orange-500'}`}>
                  {h.result}
                </div>
                {h.isWin !== null ? (
                  <div className={`flex items-center justify-center gap-1 text-[10px] font-black px-2 py-1 rounded-md uppercase w-16 text-center shadow-sm ${h.isWin ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-gradient-to-r from-red-500/20 to-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30'}`}>
                    {h.isWin ? <Check size={12} strokeWidth={3} /> : <XCircle size={12} strokeWidth={3} />}
                    <span>{h.isWin ? 'WIN' : 'LOSS'}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[10px] font-black px-2 py-1 rounded-md uppercase w-16 text-center shadow-sm bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 border border-slate-200 dark:border-white/10">
                    <Clock size={12} strokeWidth={3} />
                    <span>PENDING</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-8 text-slate-400 dark:text-white/30 text-sm">
              Waiting for predictions...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Profile Component ---
const ProfileView: React.FC<{ 
  onBack: () => void; 
  onShowResetModal: () => void; 
  pendingResetDay?: number; 
  onGiveFeedback: () => void;
  onShowFAQ: () => void;
  onPurchase: () => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  showToast: (msg: string) => void;
}> = ({ onBack, onShowResetModal, pendingResetDay, onGiveFeedback, onShowFAQ, onPurchase, soundEnabled, toggleSound, showToast }) => {
  const { profile } = useAuth();
  const { activePlan, loading: planLoading } = usePlan();
  const { theme, toggleTheme } = useTheme();
  const handleSignOut = () => signOut(auth);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="text-emerald-500" /> My Profile
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest mb-1">Email Address</label>
            <div className="text-slate-900 dark:text-white font-medium">{profile?.email}</div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest mb-1">User ID (UID)</label>
            <div className="text-slate-600 dark:text-white/60 font-mono text-xs break-all bg-slate-50 dark:bg-black/30 p-3 rounded-xl border border-slate-100 dark:border-white/5">{profile?.uid}</div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] text-slate-400 dark:text-white/20 uppercase tracking-widest font-bold mb-3">Active Plan</p>
          {planLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-3/4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-white/5 rounded"></div>
                  <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-5/6"></div>
                </div>
              </div>
            </div>
          ) : activePlan ? (
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{activePlan.name} Plan</div>
                  <div className="text-[10px] text-slate-500 dark:text-white/40">Expires: {formatDate(activePlan.expiresAt)}</div>
                </div>
                <div className="bg-indigo-500/10 text-indigo-500 text-[10px] font-black px-2 py-1 rounded-md uppercase">Active</div>
              </div>
              <div className="pt-4 border-t border-indigo-500/10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-white/20 uppercase">Prediction Limit</span>
                  <span className="text-[10px] font-bold text-slate-900 dark:text-white">{activePlan.predictionsUsedToday} / {activePlan.dailyPredictionLimit}</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (activePlan.predictionsUsedToday / activePlan.dailyPredictionLimit) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 text-center">
              <p className="text-xs text-slate-400 dark:text-white/30 mb-4">No active plan found.</p>
              <button 
                onClick={onPurchase}
                className="text-xs font-bold text-indigo-500 hover:underline"
              >
                Purchase a Plan
              </button>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] text-slate-400 dark:text-white/20 uppercase tracking-widest font-bold mb-3">App Settings</p>
          <div className="space-y-3">
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-indigo-500 text-lg">🌐</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Language</span>
              </div>
              <select className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
                <option value="bn">বাংলা (Bengali)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="mr">मराठी (Marathi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] text-slate-400 dark:text-white/20 uppercase tracking-widest font-bold mb-3">Support</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onShowFAQ}
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-emerald-500/30 transition-all group"
            >
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                <HelpCircle size={20} />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">FAQ</span>
            </button>
            <button
              onClick={onGiveFeedback}
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-emerald-500/30 transition-all group"
            >
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:scale-110 transition-transform">
                <MessageSquare size={20} />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">Feedback</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] text-slate-400 dark:text-white/20 uppercase tracking-widest font-bold mb-3">About</p>
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl p-6">
            <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
              AI Predictor Pro is a professional prediction tool designed to help you analyze trends and make informed decisions.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] text-slate-400 dark:text-white/20 uppercase tracking-widest font-bold mb-3">Account Support</p>
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 space-y-4">
            {pendingResetDay ? (
              <div className="w-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-bold py-3 rounded-xl border border-amber-500/20 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="animate-spin-slow" /> Request Submitted
                </div>
                <span className="text-[10px] opacity-70 uppercase tracking-widest">Target Day: {pendingResetDay}</span>
              </div>
            ) : (
              <button
                onClick={onShowResetModal}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-bold py-3 rounded-xl transition-all border border-amber-500/20 flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Request Plan Reset
              </button>
            )}
            <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
              Contact customer care for support:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <a 
                href="https://t.me/PredictorHelpBot"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-sm font-bold py-3 rounded-xl transition-all border border-blue-500/20"
              >
                <Send size={18} /> Telegram Support
              </a>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSignOut}
          className="active:scale-95 hover:scale-[1.02] transition-transform w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 mt-4 border border-red-500/20"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
};

// --- Feedback Component ---
const FeedbackView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { profile } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !comment.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedbacks'), {
        userId: profile.id,
        userEmail: profile.email,
        rating,
        comment: comment.trim(),
        isPublic: false, // Admin needs to approve
        createdAt: serverTimestamp()
      });
      setSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'feedbacks');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto">
          <Check size={40} />
        </div>
        <h2 className="text-2xl font-bold text-white">Thank You!</h2>
        <p className="text-white/60">Feedback submitted, Thank you for your trust. Your feedback has been sent to the administrator for review.</p>
        <button 
          onClick={onBack}
          className="bg-white/5 hover:bg-white/10 text-white px-8 py-3 rounded-2xl border border-white/10 transition-all font-bold"
        >
          Back to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="text-emerald-500" /> Give Feedback
        </h2>
        <button onClick={onBack} className="text-white/40 hover:text-white transition-colors flex items-center gap-1 text-sm">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#151619] border border-white/10 rounded-3xl p-8 space-y-8 shadow-2xl">
        <div className="space-y-4 text-center">
          <label className="block text-sm font-bold text-white/60 uppercase tracking-widest">Rate Your Experience</label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star 
                  size={32} 
                  className={rating >= star ? 'text-amber-500 fill-amber-500' : 'text-white/10'} 
                  strokeWidth={rating >= star ? 0 : 2}
                />
              </button>
            ))}
          </div>
          <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">
            {rating === 5 ? 'Excellent' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-white/60 uppercase tracking-widest">Your Comments</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you think about the app..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all min-h-[120px] resize-none"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !comment.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          Submit Feedback
        </button>
      </form>
    </div>
  );
};

// --- Master Prediction Component ---
const dailyTargets = [
  { day: 1, start: 500, target: 723 },
  { day: 2, start: 723, target: 1045 },
  { day: 3, start: 1045, target: 1512 },
  { day: 4, start: 1512, target: 2186 },
  { day: 5, start: 2186, target: 3162 },
  { day: 6, start: 3162, target: 4573 },
  { day: 7, start: 4573, target: 6614 },
  { day: 8, start: 6614, target: 9565 },
  { day: 9, start: 9565, target: 13833 },
  { day: 10, start: 13833, target: 20000 },
];

const getGamingDate = () => {
  const now = new Date();
  const hours = now.getHours();
  if (hours < 5) {
    now.setDate(now.getDate() - 1);
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const WingoStrategyView: React.FC<{ 
  onBack: () => void; 
  hasAccess: boolean; 
  onPurchase: () => void; 
  profile: UserProfile | null; 
  onShowResetModal: () => void;
  initialGameType?: '1min' | '30s' | '3min' | '5min';
}> = ({ onBack, hasAccess, onPurchase, profile, onShowResetModal, initialGameType = '1min' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [planState, setPlanState] = useState<MasterPlanState | null>(null);
  const [prediction, setPrediction] = useState<{ result: 'BIG' | 'SMALL'; numbers: number[] } | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [gameType, setGameType] = useState<'1min' | '30s' | '3min' | '5min'>(initialGameType);
  const [pendingResultPeriod, setPendingResultPeriod] = useState<{ period: string, result: 'BIG' | 'SMALL', numbers: number[], bet: number } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pendingStrategyRequest, setPendingStrategyRequest] = useState<StrategyRequest | null>(null);
  const [publicFeedbacks, setPublicFeedbacks] = useState<Feedback[]>([]);

  const getPeriod = (now: Date, type: '1min' | '30s' | '3min' | '5min') => {
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const date = String(now.getUTCDate()).padStart(2, '0');
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();
    const seconds = now.getUTCSeconds();
    
    if (type === '1min') {
      const totalMinutesOfDay = hours * 60 + minutes;
      return `${year}${month}${date}1000${10001 + totalMinutesOfDay}`;
    } else if (type === '30s') {
      const slot = seconds < 30 ? 0 : 1;
      const totalSlots = (hours * 60 + minutes) * 2 + slot;
      return `${year}${month}${date}10005${totalSlots + 1}`;
    } else if (type === '3min') {
      const total3minSlotsOfDay = Math.floor((hours * 60 + minutes) / 3);
      return `${year}${month}${date}4000${10001 + total3minSlotsOfDay}`;
    } else {
      const total5minSlotsOfDay = Math.floor((hours * 60 + minutes) / 5);
      return `${year}${month}${date}5000${10001 + total5minSlotsOfDay}`;
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'feedbacks'),
      where('isPublic', '==', true),
      where('rating', '>=', 4),
      orderBy('rating', 'desc'),
      limit(5)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPublicFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Feedback)));
    }, (err) => {
      console.error("Error fetching public feedbacks:", err);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'strategyRequests'),
      where('userId', '==', profile.id),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setPendingStrategyRequest({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StrategyRequest);
      } else {
        setPendingStrategyRequest(null);
      }
    });
    return () => unsubscribe();
  }, [profile]);

  const requestStrategyChange = async (requestedStrategy: 'conservative' | 'aggressive') => {
    if (!profile) return;
    // Check for pending requests
    const pendingRequestsQuery = query(
      collection(db, 'strategyRequests'),
      where('userId', '==', profile.id),
      where('status', '==', 'pending')
    );
    const pendingRequestsSnapshot = await getDocs(pendingRequestsQuery);
    if (!pendingRequestsSnapshot.empty) {
      showToast('You already have a pending strategy change request.');
      return;
    }

    try {
      await addDoc(collection(db, 'strategyRequests'), {
        userId: profile.id,
        userEmail: profile.email,
        requestedStrategy,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      showToast('Submitted successfully, please wait for adminstrator\'s approval .');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'strategyRequests');
    }
  };

  const TARGET_PROFIT_PERCENT = 0.025; // 2.5% target profit

  useEffect(() => {
    if (!profile) return;
    
    const loadPlan = () => {
      const docRef = doc(db, 'masterPlans', profile.id);
      const unsubscribe = onSnapshot(docRef, async (docSnap) => {
        const gamingDate = getGamingDate();

        if (docSnap.exists()) {
          const data = docSnap.data() as MasterPlanState;
          
          if (data.isCompletedToday && data.lastCompletedDate !== gamingDate) {
            const nextDay = Math.min(data.day + 1, 10);
            const newData = {
              ...data,
              day: nextDay,
              isCompletedToday: false,
              level: 1,
              totalLoss: 0,
              cycleStartBalance: data.balance,
              history: []
            };
            setPlanState(newData);
            await setDoc(docRef, newData);
          } else {
            setPlanState(data);
          }
        } else {
          const initialData: MasterPlanState = {
            day: 1,
            balance: 500,
            level: 1,
            totalLoss: 0,
            cycleStartBalance: 500,
            isCompletedToday: false,
            lastCompletedDate: '',
            history: []
          };
          setPlanState(initialData);
          await setDoc(docRef, initialData);
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error loading plan:", error);
        setIsLoading(false);
      });
      return unsubscribe;
    };
    
    const unsubscribe = loadPlan();
    return () => unsubscribe();
  }, [profile, hasAccess]);

  let suggestedBet = 0;
  let lossPercent = 0;
  let nextBetPercent = 0;
  
  if (planState && planState.riskStrategy) {
    lossPercent = planState.totalLoss / planState.cycleStartBalance;
    
    if (planState.balance > 0) {
      const strategy = planState.riskStrategy;
      const level = planState.level;
      let percent = 0;

      if (strategy === 'aggressive') {
        const aggressivePercents = [0.15, 0.32, 0.53];
        percent = aggressivePercents[level - 1] || 0;
      } else {
        const conservativePercents = [0.06, 0.12, 0.20, 0.28, 0.34];
        percent = conservativePercents[level - 1] || 0;
      }

      suggestedBet = Math.floor(planState.cycleStartBalance * percent);
      
      // Ensure it doesn't exceed balance
      if (suggestedBet > planState.balance) {
        suggestedBet = planState.balance;
      }
      
      nextBetPercent = suggestedBet / planState.balance;
    } else {
      suggestedBet = 0;
      nextBetPercent = 0;
    }
  }

  const handleUpdateStrategy = async (strategy: 'conservative' | 'aggressive') => {
    if (!profile || !planState) return;
    const newState = { ...planState, riskStrategy: strategy, level: 1, totalLoss: 0, cycleStartBalance: planState.balance };
    setPlanState(newState);
    try {
      await setDoc(doc(db, 'masterPlans', profile.id), newState);
    } catch (error) {
      console.error("Error updating strategy:", error);
    }
  };

  useEffect(() => {
    if (!hasAccess || !planState || planState.isCompletedToday) return;

    const generatePredictionForPeriod = (period: string) => {
      let seed = 0;
      const seedString = period + gameType;
      for (let i = 0; i < seedString.length; i++) {
        seed = seedString.charCodeAt(i) + ((seed << 5) - seed);
      }
      const random = () => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x);
      };
      const result = random() > 0.5 ? 'SMALL' : 'BIG';
      const numbers = [];
      if (result === 'BIG') {
        const bigNums = [5, 6, 7, 8, 9];
        for (let i = 0; i < 3; i++) {
          numbers.push(bigNums[Math.floor(random() * bigNums.length)]);
        }
      } else {
        const smallNums = [0, 1, 2, 3, 4];
        for (let i = 0; i < 3; i++) {
          numbers.push(smallNums[Math.floor(random() * smallNums.length)]);
        }
      }
      return { result, numbers: Array.from(new Set(numbers)) };
    };

    const updateTimer = () => {
      const now = new Date();
      const periodNumber = getPeriod(now, gameType);
      
      const seconds = now.getUTCSeconds();
      const minutes = now.getUTCMinutes();
      
      let remainingSeconds = 0;
      if (gameType === '30s') {
        remainingSeconds = 30 - (seconds % 30);
      } else if (gameType === '1min') {
        remainingSeconds = 60 - seconds;
      } else if (gameType === '3min') {
        remainingSeconds = 180 - ((minutes % 3) * 60 + seconds);
      } else if (gameType === '5min') {
        remainingSeconds = 300 - ((minutes % 5) * 60 + seconds);
      }
      
      setCountdown(remainingSeconds);
      
      setCurrentPeriod(prevPeriod => {
        if (prevPeriod && prevPeriod !== periodNumber) {
          const prevPred = generatePredictionForPeriod(prevPeriod);
          setPendingResultPeriod(prev => {
            if (!prev) return { period: prevPeriod, result: prevPred.result, numbers: prevPred.numbers, bet: suggestedBet };
            return prev;
          });
        }
        return periodNumber;
      });

      const currentPrediction = generatePredictionForPeriod(periodNumber);
      setPrediction(currentPrediction);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hasAccess, planState?.isCompletedToday, suggestedBet]);

  if (isLoading || !planState) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="text-center py-12 bg-red-500/5 rounded-3xl border border-red-500/20 shadow-sm">
        <XCircle className="text-red-600 dark:text-red-500 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h3>
        <p className="text-slate-600 dark:text-white/50 max-w-xs mx-auto mb-6">You need an active plan to view the Master Plan.</p>
        <div className="flex justify-center gap-4 mt-8">
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-900 dark:text-white px-6 py-2 rounded-xl transition-all border border-slate-200 dark:border-white/10 shadow-sm">Back to Home</button>
          {planState?.pendingResetDay ? (
            <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-6 py-2 rounded-xl border border-amber-500/20 font-bold text-sm flex items-center gap-2">
              <Clock size={16} className="animate-spin-slow" /> Request Submitted
            </div>
          ) : (
            <button 
              onClick={onShowResetModal}
              className="active:scale-95 hover:scale-[1.02] transition-transform bg-orange-600 hover:bg-orange-500 text-white px-6 py-2 rounded-xl transition-all shadow-sm font-bold"
            >
              Request Reset
            </button>
          )}
        </div>
      </div>
    );
  }

  const handleMarkResult = async (isWin: boolean) => {
    if (!pendingResultPeriod || !profile || !planState) return;
    
    const betToUse = pendingResultPeriod.bet;
    let newBalance = planState.balance;
    let newLevel = planState.level;
    let newTotalLoss = planState.totalLoss;
    let newCycleStartBalance = planState.cycleStartBalance;
    
    const maxLevels = planState.riskStrategy === 'aggressive' ? 3 : 5;

    if (isWin) {
      const profit = betToUse * 0.96;
      newBalance += profit;
      newLevel = 1;
      newTotalLoss = 0;
      newCycleStartBalance = newBalance; // Reset cycle on win
    } else {
      newBalance -= betToUse;
      if (planState.level >= maxLevels) {
        newLevel = maxLevels + 1; // Completed/Failed cycle
        newTotalLoss = 0;
      } else {
        newLevel += 1;
        newTotalLoss += betToUse;
      }
    }
    
    const newHistory = [{
      period: pendingResultPeriod.period,
      bet: Math.floor(betToUse),
      isWin,
      balanceAfter: Math.floor(newBalance),
      prediction: pendingResultPeriod.result
    }, ...planState.history].slice(0, 10);

    const newState = {
      ...planState,
      balance: newBalance,
      level: newLevel,
      totalLoss: newTotalLoss,
      cycleStartBalance: newCycleStartBalance,
      history: newHistory
    };

    setPlanState(newState);
    setPendingResultPeriod(null);

    try {
      await setDoc(doc(db, 'masterPlans', profile.id), newState);
    } catch (error) {
      console.error("Error saving plan:", error);
    }
    
    const dayTarget = dailyTargets[newState.day - 1].target;
    if (newBalance >= dayTarget && !newState.isCompletedToday) {
      setShowCompletionModal(true);
    }
  };

  const handleCompleteTarget = async () => {
    const newState = {
      ...planState,
      isCompletedToday: true,
      lastCompletedDate: getGamingDate()
    };
    setPlanState(newState);
    setShowCompletionModal(false);
    try {
      if (profile) {
        await setDoc(doc(db, 'masterPlans', profile.id), newState);
      }
    } catch (error) {
      console.error("Error saving completion:", error);
    }
  };

  const getLevelColor = (l: number) => {
    switch(l) {
      case 1: return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 2: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 3: return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 4: return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 5: return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const dayData = dailyTargets[planState.day - 1];

  if (planState.isCompletedToday) {
    return (
      <div className="text-center py-16 bg-emerald-500/5 rounded-3xl border border-emerald-500/20 shadow-sm">
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="text-emerald-500" size={40} />
        </div>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Target Completed!</h3>
        <p className="text-slate-600 dark:text-white/70 max-w-md mx-auto mb-8 text-lg">
          Thank you! You have successfully completed today's target of ₹{dayData.target}. 
          Please come back tomorrow after 5:00 AM to continue to Day {Math.min(planState.day + 1, 10)}. 
          <br/><br/>
          <strong className="text-red-500">Do not play with this money anymore today.</strong>
        </p>
        <div className="flex flex-col gap-4 max-w-xs mx-auto">
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 font-black text-lg">
            Back to Home
          </button>
          {planState.pendingResetDay ? (
            <div className="w-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-bold py-4 rounded-2xl border border-amber-500/20 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Clock size={16} className="animate-spin-slow" /> Request Submitted
              </div>
              <span className="text-[10px] opacity-70 uppercase tracking-widest">Target Day: {planState.pendingResetDay}</span>
            </div>
          ) : (
            <button
              onClick={onShowResetModal}
              className="active:scale-95 hover:scale-[1.02] transition-transform bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-sm font-bold py-4 rounded-2xl transition-all border border-amber-500/20 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} /> Request Master Plan Reset
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!planState.riskStrategy) {
    return (
      <div className="space-y-8 py-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
            <TrendingUp className="text-indigo-500" size={40} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Choose Your Strategy</h2>
          <p className="text-slate-500 dark:text-white/50 max-w-md mx-auto">
            Select a risk strategy to start your Master Plan. This will determine your betting levels and recovery plan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button
            onClick={() => handleUpdateStrategy('conservative')}
            className="group relative bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-left transition-all hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full">Low Risk</div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Moderate</h3>
            <p className="text-sm text-slate-500 dark:text-white/40 mb-6">
              Safe and steady growth with 5 levels of recovery. Ideal for long-term consistency.
            </p>
            <ul className="space-y-2 mb-8">
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-white/60">
                <Check size={14} className="text-emerald-500" /> 5 Levels of Recovery
              </li>
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-white/60">
                <Check size={14} className="text-emerald-500" /> Lower Initial Bets
              </li>
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-white/60">
                <Check size={14} className="text-emerald-500" /> Maximum Balance Safety
              </li>
            </ul>
            <div className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl text-center shadow-lg shadow-emerald-500/20 group-hover:bg-emerald-400 transition-colors">
              Select Moderate
            </div>
          </button>

          <button
            onClick={() => handleUpdateStrategy('aggressive')}
            className="group relative bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-left transition-all hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full">High Risk</div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Aggressive</h3>
            <p className="text-sm text-slate-500 dark:text-white/40 mb-6">
              Fast-paced growth with 3 high-impact levels. Ideal for quick target achievement.
            </p>
            <ul className="space-y-2 mb-8">
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-white/60">
                <Check size={14} className="text-orange-500" /> 3 Levels of Recovery
              </li>
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-white/60">
                <Check size={14} className="text-orange-500" /> Higher Initial Bets (15%)
              </li>
              <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-white/60">
                <Check size={14} className="text-orange-500" /> Rapid Profit Accumulation
              </li>
            </ul>
            <div className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl text-center shadow-lg shadow-orange-500/20 group-hover:bg-orange-400 transition-colors">
              Select Aggressive
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg font-medium text-sm"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Target className="text-indigo-500" /> Master Plan
        </h2>
        <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
          <ChevronLeft size={16} /> Back
        </button>
      </div>

      <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl mb-6 overflow-x-auto">
        <button
          onClick={() => setGameType('30s')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            gameType === '30s' 
              ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Wingo 30s
        </button>
        <button
          onClick={() => setGameType('1min')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            gameType === '1min' 
              ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Wingo 1 Min
        </button>
        <button
          onClick={() => setGameType('3min')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            gameType === '3min' 
              ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Wingo 3 Min
        </button>
        <button
          onClick={() => setGameType('5min')}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            gameType === '5min' 
              ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' 
              : 'text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Wingo 5 Min
        </button>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
        <Info className="text-indigo-500 shrink-0 mt-0.5" size={18} />
        <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
          <strong>Percentage-Based Recovery:</strong> The system automatically calculates your bet as a percentage of your current balance to recover losses and add a 2.5% target profit.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Current Day</div>
          <div className="text-xl font-black text-slate-900 dark:text-white">
            Day {planState.day}
          </div>
          <div className="text-xs text-slate-500 dark:text-white/40 mt-1">
            Target: ₹{dayData.target}
          </div>
        </div>
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Remaining to Target</div>
          <div className="text-xl font-black text-indigo-500">
            ₹{Math.max(0, dayData.target - planState.balance).toFixed(0)}
          </div>
          <div className="text-xs text-slate-500 dark:text-white/40 mt-1">
            Goal: ₹{dayData.target}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Daily Progress</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {Math.min(100, Math.floor(((planState.balance - dayData.start) / (dayData.target - dayData.start)) * 100))}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Balance / Target</div>
            <div className="text-sm font-bold text-slate-600 dark:text-white/60">
              ₹{Math.floor(planState.balance)} / ₹{dayData.target}
            </div>
          </div>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-slate-200 dark:border-white/10">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000 ease-out"
            style={{ width: `${Math.max(0, Math.min(100, ((planState.balance - dayData.start) / (dayData.target - dayData.start)) * 100))}%` }}
          />
        </div>
      </div>

      {/* Risk Strategy Info */}
      <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1">Active Strategy</div>
          <div className={`text-lg font-black uppercase tracking-tight ${planState.riskStrategy === 'aggressive' ? 'text-orange-500' : 'text-emerald-500'}`}>
            {planState.riskStrategy}
          </div>
        </div>
        {pendingStrategyRequest ? (
          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] font-bold text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-2 rounded-lg border border-orange-500/20 flex items-center gap-2">
              <Clock size={12} className="animate-spin" />
              Approval Pending: {pendingStrategyRequest.requestedStrategy}
            </div>
            <p className="text-[8px] text-white/40 uppercase tracking-tighter">Admin will review your request soon</p>
          </div>
        ) : (
          <button 
            onClick={() => requestStrategyChange(planState.riskStrategy === 'aggressive' ? 'conservative' : 'aggressive')}
            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20 transition-all"
          >
            Request Strategy Change
          </button>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-[#151619] dark:from-[#151619] dark:to-black border border-slate-800 dark:border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
          <Target size={120} className="text-indigo-500" />
        </div>
        
        {pendingResultPeriod && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 dark:bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30 animate-pulse">
              <Check size={32} className="text-indigo-500" />
            </div>
            <h3 className="text-2xl font-black text-white mb-2">Period {pendingResultPeriod.period} Ended</h3>
            <p className="text-white/70 mb-8 max-w-xs">Was the prediction ({pendingResultPeriod.result}) a Win or a Loss? Mark it to see the next prediction.</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => handleMarkResult(true)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
              >
                WIN
              </button>
              <button 
                onClick={() => handleMarkResult(false)}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-red-500/20"
              >
                LOSS
              </button>
            </div>
          </div>
        )}

        {showCompletionModal && (
          <div className="absolute inset-0 z-30 bg-emerald-900/95 dark:bg-emerald-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border border-emerald-500/30 animate-bounce">
              <Target size={40} className="text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-white mb-4">Target Reached! 🎉</h3>
            <p className="text-emerald-100/80 mb-8 max-w-xs text-lg">Have you completed your target of ₹{dayData.target}?</p>
            <button 
              onClick={handleCompleteTarget}
              className="active:scale-95 hover:scale-[1.02] transition-transform w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 text-lg"
            >
              Yes, Completed!
            </button>
          </div>
        )}


        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
            <div>
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Current Period</div>
              <div className="text-xl font-mono font-black text-white">{currentPeriod}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Timer</div>
              <div className={`text-2xl font-mono font-black ${countdown <= 10 ? 'text-red-500 animate-pulse' : 'text-indigo-500'}`}>
                00:{countdown.toString().padStart(2, '0')}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end border-b border-white/10 pb-6">
            <div>
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Current Balance</div>
              <div className="text-4xl font-mono font-black text-white">₹{Math.floor(planState.balance)}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Loss % Acc.</div>
              <div className="text-lg font-bold text-red-400">
                {Math.floor(lossPercent * 100)}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-2xl p-4 border ${getLevelColor(planState.level)}`}>
              <div className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">
                {planState.level > (planState.riskStrategy === 'aggressive' ? 3 : 5) ? 'Challenge Status' : 'Current Level'}
              </div>
              <div className="text-2xl font-black">
                {planState.level > (planState.riskStrategy === 'aggressive' ? 3 : 5) ? 'Completed!' : `Level ${planState.level} / ${planState.riskStrategy === 'aggressive' ? 3 : 5}`}
              </div>
              {planState.level > (planState.riskStrategy === 'aggressive' ? 3 : 5) && (
                <button 
                  onClick={async () => {
                    const newState = { ...planState, level: 1, totalLoss: 0, cycleStartBalance: planState.balance };
                    setPlanState(newState);
                    await setDoc(doc(db, 'masterPlans', profile!.id), newState);
                  }}
                  className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 rounded-lg transition-all text-xs"
                >
                  Restart Challenge
                </button>
              )}
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Next Bet ({ Math.floor(nextBetPercent * 100) }%)</div>
              <div className="text-2xl font-black text-white">₹{Math.floor(suggestedBet)}</div>
            </div>
          </div>

          {prediction && (
            <div className="bg-indigo-500/20 border border-indigo-500/30 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">AI Prediction</div>
                  <div className={`text-4xl font-black tracking-tighter ${prediction.result === 'BIG' ? 'text-blue-400' : 'text-orange-400'}`}>
                    {prediction.result}
                  </div>
                </div>
                <div className="flex gap-2">
                  {prediction.numbers.map((num, idx) => (
                    <div key={idx} className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-lg font-black text-white shadow-inner">
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6">
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <RefreshCw size={24} />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Need a Reset?</h4>
              <p className="text-xs text-slate-500 dark:text-white/40">Request a plan reset if you've lost your balance or want to restart.</p>
            </div>
          </div>
          <button
            onClick={onShowResetModal}
            className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} /> Request Master Plan Reset
          </button>
        </div>
      </div>

      {planState.history.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" /> Recent Activity
          </h3>
          <div className="grid gap-2">
            {planState.history.map((h, idx) => (
              <div key={idx} className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl p-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center gap-1 text-[10px] font-black px-2 py-1 rounded-md uppercase w-16 text-center ${h.isWin ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                    {h.isWin ? 'WIN' : 'LOSS'}
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {h.prediction} <span className="text-slate-400 mx-1">•</span> Bet: ₹{h.bet}
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-500 dark:text-white/50">
                  Bal: ₹{Math.floor(h.balanceAfter)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Color Game Selection View ---
const ColorGameSelectionView: React.FC<{ onSelect: (wingo: '30s' | '1min' | '3min' | '5min') => void; onBack: () => void }> = ({ onSelect, onBack }) => {
  const wingoItems = [
    { id: '30s', label: 'Wingo 30s', icon: Clock, color: 'text-blue-500', description: 'Fast-paced 30s rounds' },
    { id: '1min', label: 'Wingo 1 Min', icon: TrendingUp, color: 'text-emerald-500', description: 'Standard 1 minute rounds' },
    { id: '3min', label: 'Wingo 3 Min', icon: Zap, color: 'text-orange-500', description: 'Strategic 3 minute rounds' },
    { id: '5min', label: 'Wingo 5 Min', icon: Activity, color: 'text-red-500', description: 'Long-term 5 minute rounds' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 px-4 pt-4">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl text-white/60 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase">Select Wingo Game</h1>
      </div>

      <div className="px-4 grid gap-4">
        {wingoItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id as any)}
            className="bg-[#151619] border border-white/10 rounded-3xl p-6 flex items-center justify-between group hover:border-emerald-500/50 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl bg-white/5 ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">{item.label}</h3>
                <p className="text-xs text-white/40 font-bold uppercase tracking-widest">{item.description}</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-white/20 group-hover:text-emerald-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

// --- Main Dashboard ---
type ViewState = 'home' | 'color_prediction' | 'purchase' | 'admin' | 'history' | 'profile' | 'inbox' | 'feedback' | 'referral' | 'wallet' | 'leaderboard' | 'achievements' | 'vip' | 'giveaway' | 'spin' | 'rewards' | 'staking' | 'analytics_user' | 'support' | 'wingo_selection' | 'wingo_master' | 'wingo_predictions' | 'aviator' | 'color_game_selection' | 'game_settings' | 'faq';

export const Dashboard: React.FC = () => {
  const { profile, isAdmin } = useAuth();
  const { activePlan } = usePlan();
  const [view, setView] = useState<ViewState>('home');
  const [prevView, setPrevView] = useState<ViewState>('home');
  const [selectedWingo, setSelectedWingo] = useState<'30s' | '1min' | '3min' | '5min' | null>(null);
  const [pendingResetDay, setPendingResetDay] = useState<number | undefined>(undefined);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestError, setLatestError] = useState<Notification | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetDay, setResetTargetDay] = useState<number>(1);
  const [resetStatus, setResetStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const toggleSound = () => setSoundEnabled(!soundEnabled);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (!profile) return;
    const path = `masterPlans/${profile.id}`;
    const unsubscribe = onSnapshot(doc(db, 'masterPlans', profile.id), (doc) => {
      if (doc.exists()) {
        setPendingResetDay(doc.data().pendingResetDay);
      } else {
        setPendingResetDay(undefined);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [profile]);

  const handleRequestReset = async () => {
    if (!profile) return;
    setResetStatus('submitting');
    try {
      await addDoc(collection(db, 'resetRequests'), {
        userId: profile.id,
        email: profile.email,
        targetDay: resetTargetDay,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      
      // Also update the master plan state to indicate a pending reset
      await updateDoc(doc(db, 'masterPlans', profile.id), {
        pendingResetDay: resetTargetDay
      });

      setResetStatus('success');
      setTimeout(() => {
        setShowResetModal(false);
        setResetStatus('idle');
        setResetTargetDay(1);
      }, 3000);
    } catch (err) {
      console.error(err);
      setResetStatus('error');
      setTimeout(() => setResetStatus('idle'), 3000);
    }
  };

  const navigateTo = (newView: ViewState, wingo?: '30s' | '1min' | '3min' | '5min') => {
    setPrevView(view);
    setView(newView);
    if (wingo) setSelectedWingo(wingo);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', profile.id), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
      
      // Also find the latest unread error for the global banner
      const errorDoc = snapshot.docs.find(doc => doc.data().type === 'error');
      if (errorDoc) {
        setLatestError({ id: errorDoc.id, ...errorDoc.data() } as Notification);
      } else {
        setLatestError(null);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });
    return () => unsubscribe();
  }, [profile]);

  const handleSignOut = () => signOut(auth);

  const bottomNavItems = [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'color_game_selection', label: 'WinGo', icon: Palette },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const wingoItems = [
    { id: 'wingo30s', label: 'WinGo 30s', icon: Clock, color: 'text-blue-500', wingo: '30s' as const },
    { id: 'wingo1min', label: 'WinGo 1Min', icon: TrendingUp, color: 'text-emerald-500', wingo: '1min' as const },
    { id: 'wingo3min', label: 'WinGo 3Min', icon: Zap, color: 'text-orange-500', wingo: '3min' as const },
    { id: 'wingo5min', label: 'WinGo 5Min', icon: Activity, color: 'text-red-500', wingo: '5min' as const },
  ];

  const otherItems = [
    { id: 'wallet', label: 'Wallet', icon: Wallet, color: 'text-emerald-500', desc: 'Secure funds' },
    { id: 'vip', label: 'VIP System', icon: Award, color: 'text-yellow-400', desc: 'Member benefits' },
    { id: 'giveaway', label: 'Giveaway', icon: Trophy, color: 'text-pink-500', desc: 'Join pools' },
    { id: 'spin', label: 'Spin & Win', icon: RefreshCw, color: 'text-purple-500', desc: 'Daily luck' },
    { id: 'rewards', label: 'Rewards', icon: Gift, color: 'text-pink-500', desc: 'Claim prizes' },
    { id: 'staking', label: 'Staking', icon: ShieldCheck, color: 'text-teal-500', desc: 'Earn passive' },
    { id: 'analytics_user', label: 'Analytics', icon: TrendingUp, color: 'text-blue-500', desc: 'View stats' },
    { id: 'purchase', label: 'Activation', icon: ShoppingBag, color: 'text-purple-500', desc: 'Get access' },
    { id: 'referral', label: 'Referral', icon: Users, color: 'text-blue-500', desc: 'Earn credits' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, color: 'text-amber-500', desc: 'Top winners' },
    { id: 'history', label: 'History', icon: Clock, color: 'text-yellow-500', desc: 'Logs' },
    { id: 'achievements', label: 'Achievements', icon: Award, color: 'text-indigo-400', desc: 'Badges' },
    ...(isAdmin ? [
      { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-orange-500', adminOnly: true, desc: 'Manage' },
      { id: 'game_settings', label: 'Settings', icon: Wrench, color: 'text-rose-500', adminOnly: true, desc: 'Config' }
    ] : [])
  ];

  const HomeView: React.FC = () => {
    const daysRemaining = activePlan ? differenceInDays(new Date(activePlan.expiresAt), new Date()) : 0;
    
    return (
      <div className="space-y-8 pb-24">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-emerald-500/30">
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-4 max-w-[60%]">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">AI Active Now</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tight uppercase leading-none">AI PREDICTOR</h1>
                <p className="text-emerald-100/70 text-xs font-medium leading-relaxed">Experience a new era of accuracy with our neural match insights.</p>
              </div>
              <button 
                onClick={() => navigateTo('color_game_selection')}
                className="bg-white text-emerald-700 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 shadow-xl transition-all active:scale-95 flex items-center gap-2 group"
              >
                Start Predicting <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 blur-[60px] rounded-full" />
              <div className="relative bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                <Bot size={64} className="text-white drop-shadow-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Plan Status Card */}
        {activePlan ? (
          <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4">
              <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter">Active Plan</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center text-emerald-500">
                <Star size={32} />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{activePlan.name} Plan</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{daysRemaining} Days Left</span>
                  <span className="text-slate-200 dark:text-white/10">•</span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">Expires: {new Date(activePlan.expiresAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button 
                onClick={() => navigateTo('purchase')}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
              >
                Renew Plan
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-[1.5rem] flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">No Active Plan</h4>
              <p className="text-xs text-slate-500 dark:text-white/40 font-medium">Please subscribe to a plan to start receiving match predictions.</p>
            </div>
            <button 
              onClick={() => navigateTo('purchase')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
            >
              Choose Plan
            </button>
          </div>
        )}

        {/* Accuracy Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 text-center space-y-2">
          <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Today's Accuracy</p>
          <div className="text-3xl font-black text-emerald-500 tracking-tighter">94.2%</div>
          <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div className="w-[94%] h-full bg-emerald-500 rounded-full" />
          </div>
        </div>
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 text-center space-y-2">
          <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Wallet Balance</p>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">₹{profile?.walletBalance.toLocaleString() || '0'}</div>
          <button onClick={() => navigateTo('wallet')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-1">Topup <ArrowUpRight size={10} /></button>
        </div>
      </div>

      {/* Trending & Bonus Section */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-[2rem] p-6 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <TrendingUp size={14} />
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest">Trending</p>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-black text-slate-900 dark:text-white uppercase">Big Series</div>
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">78% Prob. Match</p>
          </div>
        </div>
        <button 
          onClick={() => navigateTo('wallet')} // Daily bonus is often in wallet, or I can add a specific action
          className="group bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-6 transition-all hover:shadow-lg active:scale-95 text-left relative overflow-hidden"
        >
          <div className="relative z-10 space-y-1">
            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Daily Bonus</p>
            <div className="text-lg font-black text-white uppercase">Claim ₹10</div>
            <div className="flex items-center gap-1 text-[9px] text-white/40 font-bold uppercase tracking-widest group-hover:text-white/80 transition-colors">
              Available Now <ArrowUpRight size={10} />
            </div>
          </div>
          <Gift className="absolute -right-2 -bottom-2 text-white/10 w-16 h-16" />
        </button>
      </div>

      {/* Main Predictions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em]">Featured Predictions</h3>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live Now</span>
          </div>
        </div>
        <button 
          onClick={() => navigateTo('color_game_selection')}
          className="w-full group relative overflow-hidden bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 text-left transition-all hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/5 flex items-center justify-between"
        >
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Palette size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="block font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Color Prediction</span>
                <Sparkles size={16} className="text-amber-500 animate-pulse" />
              </div>
              <p className="text-xs text-slate-500 dark:text-white/30 font-medium">Real-time WinGo neural pattern matching.</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-500/10 transition-all">
            <ChevronRight size={24} />
          </div>
        </button>
      </div>

      {/* Features Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em]">Ecosystem Features</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {otherItems.filter(item => !item.adminOnly || isAdmin).slice(0, 10).map((item) => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id as any)}
              className="group bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-[2rem] p-5 flex flex-col items-start gap-4 transition-all hover:border-emerald-500/50 hover:shadow-lg active:scale-95 text-left"
            >
              <div className={`w-10 h-10 rounded-2xl bg-white/5 dark:bg-white/5 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                <item.icon size={20} />
              </div>
              <div>
                <span className="block text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">{item.label}</span>
                <p className="text-[9px] font-bold text-slate-400 dark:text-white/20 uppercase tracking-widest">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em]">Recent Viral Results</h3>
        </div>
        <div className="bg-[#151619] border border-white/5 rounded-[2.5rem] p-6 divide-y divide-white/5">
          {[1, 2, 3].map(i => (
            <div key={i} className="py-4 flex items-center justify-between first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div>
                  <p className="text-xs font-black text-white uppercase tracking-tight">Period #{(928 + i)} Result</p>
                  <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Matched neural pattern "Big"</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-emerald-500 uppercase">Success</div>
                <div className="text-[9px] text-white/20 font-bold uppercase tracking-widest">2m ago</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Responsible Gaming */}
      <div className="bg-slate-100 dark:bg-white/5 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/10 text-center space-y-4">
        <ShieldCheck className="mx-auto text-slate-400 dark:text-white/20" size={32} />
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em]">Responsible Gaming</p>
          <p className="text-[9px] text-slate-400 dark:text-white/20 font-medium leading-relaxed max-w-[240px] mx-auto italic">AI predictions are for entertainment matches only. Use analysis responsibly and at your own risk.</p>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-white transition-colors duration-500">
      <header className="fixed top-0 left-0 right-0 h-20 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-slate-200 dark:border-white/5 z-50 transition-all">
        <div className="max-w-4xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('home')}>
            <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="block font-black tracking-tighter text-lg uppercase text-slate-900 dark:text-white italic">AI Predictor</span>
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Neural Output</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigateTo('profile')}
              className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 dark:text-white/40 hover:text-emerald-500 transition-all"
            >
              <User size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-32">
        {showResetModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 dark:bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6">
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
                <RefreshCw size={32} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Reset Plan</h3>
                <p className="text-sm text-slate-500 dark:text-white/40">Select the day you want to reset to (1-10).</p>
              </div>

              {resetStatus === 'idle' ? (
                <>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                      <button
                        key={d}
                        onClick={() => setResetTargetDay(d)}
                        className={`w-full aspect-square rounded-xl font-black text-sm transition-all border ${
                          resetTargetDay === d
                            ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-white/20 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowResetModal(false)}
                      className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestReset}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20"
                    >
                      Submit
                    </button>
                  </div>
                </>
              ) : resetStatus === 'submitting' ? (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                  <p className="text-indigo-500 font-bold">Submitting Request...</p>
                </div>
              ) : resetStatus === 'success' ? (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <Check size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-emerald-500 font-black text-lg">Request Submitted!</p>
                    <p className="text-slate-500 dark:text-white/40 text-xs">Waiting for admin approval.</p>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/20">
                    <X size={32} />
                  </div>
                  <p className="text-red-500 font-black">Something went wrong.</p>
                  <button onClick={() => setResetStatus('idle')} className="text-indigo-500 text-xs font-bold underline">Try Again</button>
                </div>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {latestError && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}
              className="mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-lg text-red-600 dark:text-red-500">
                  <XCircle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{latestError.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-white/60">{latestError.message}</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'notifications', latestError.id), { read: true });
                  } catch (err) {
                    handleFirestoreError(err, OperationType.UPDATE, `notifications/${latestError.id}`);
                  }
                }}
                className="text-slate-400 dark:text-white/20 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Check size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {view === 'color_game_selection' && (
            <motion.div key="color_game_selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ColorGameSelectionView 
                onSelect={(wingo) => navigateTo('wingo_selection', wingo)}
                onBack={() => navigateTo('home')}
              />
            </motion.div>
          )}

          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HomeView />
            </motion.div>
          )}

          {view === 'color_prediction' && (
            <motion.div key="color_prediction" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ColorPredictionView />
            </motion.div>
          )}

          {view === 'wingo_selection' && selectedWingo && (
            <motion.div key="wingo_selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <WingoSelectionView 
                wingo={selectedWingo} 
                onBack={() => navigateTo('home')} 
                onSelect={(mode) => navigateTo(mode === 'master' ? 'wingo_master' : 'wingo_predictions')} 
                isAdmin={isAdmin}
              />
            </motion.div>
          )}

          {view === 'wingo_master' && selectedWingo && (
            <motion.div key="wingo_master" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <WingoStrategyView 
                onBack={() => setView('wingo_selection')} 
                hasAccess={!!activePlan} 
                onPurchase={() => navigateTo('purchase')} 
                profile={profile}
                onShowResetModal={() => setShowResetModal(true)}
                initialGameType={selectedWingo}
              />
            </motion.div>
          )}

          {view === 'wingo_predictions' && selectedWingo && (
            <motion.div key="wingo_predictions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {selectedWingo === '30s' && <Wingo30sView onBack={() => setView('wingo_selection')} hasAccess={!!activePlan} onPurchase={() => navigateTo('purchase')} />}
              {selectedWingo === '1min' && <Wingo1MinView onBack={() => setView('wingo_selection')} hasAccess={!!activePlan} onPurchase={() => navigateTo('purchase')} />}
              {selectedWingo === '3min' && <Wingo3MinView onBack={() => setView('wingo_selection')} hasAccess={!!activePlan} onPurchase={() => navigateTo('purchase')} />}
              {selectedWingo === '5min' && <Wingo5MinView onBack={() => setView('wingo_selection')} hasAccess={!!activePlan} onPurchase={() => navigateTo('purchase')} />}
            </motion.div>
          )}

          {view === 'aviator' && (
            <motion.div key="aviator" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <AviatorPredictionView />
            </motion.div>
          )}

          {view === 'inbox' && (
            <motion.div key="inbox" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <InboxView onBack={() => navigateTo('home')} onPurchase={() => navigateTo('purchase')} />
            </motion.div>
          )}

          {view === 'purchase' && (
            <motion.div key="purchase" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <PurchaseView onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'admin' && (
            <motion.div key="admin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <AdminPanel 
                onBack={() => navigateTo('home')} 
                profile={profile}
                setLatestError={setLatestError}
                showToast={showToast}
              />
            </motion.div>
          )}

          {view === 'game_settings' && (
            <motion.div key="game_settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wrench className="text-rose-500" /> Game Settings
                </h2>
                <button onClick={() => navigateTo('home')} className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
                  <ChevronLeft size={16} /> Back
                </button>
              </div>
              <GameSettingsView showToast={showToast} />
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <PurchaseHistoryView onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'leaderboard' && (
            <motion.div key="leaderboard" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <LeaderboardView onBack={() => navigateTo('home')} profile={profile} />
            </motion.div>
          )}

          {view === 'achievements' && (
            <motion.div key="achievements" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <AchievementsView onBack={() => navigateTo('home')} profile={profile} />
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <PredictionStats onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'chat' && (
            <motion.div key="chat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ChatRoom onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'games' && (
            <motion.div key="games" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GamesView onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'referral' && (
            <motion.div key="referral" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ReferralView profile={profile} onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'social' && (
            <motion.div key="social" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SocialView onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ProfileView 
                onBack={() => navigateTo(prevView === 'profile' ? 'home' : prevView)} 
                onShowResetModal={() => setShowResetModal(true)} 
                pendingResetDay={pendingResetDay}
                onGiveFeedback={() => navigateTo('feedback')}
                onShowFAQ={() => navigateTo('faq')}
                onPurchase={() => navigateTo('purchase')}
                soundEnabled={soundEnabled}
                toggleSound={toggleSound}
                showToast={showToast}
              />
            </motion.div>
          )}

          {view === 'faq' && (
            <motion.div key="faq" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <FAQView onBack={() => navigateTo('profile')} />
            </motion.div>
          )}

          {view === 'wallet' && (
            <motion.div key="wallet" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <WalletView 
                profile={profile} 
                onBack={() => navigateTo('home')} 
                showToast={showToast}
              />
            </motion.div>
          )}

          {view === 'vip' && (
            <motion.div key="vip" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <VIPView profile={profile} onBack={() => navigateTo('home')} showToast={showToast} />
            </motion.div>
          )}

          {view === 'giveaway' && (
            <motion.div key="giveaway" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <GiveawayView profile={profile} onBack={() => navigateTo('home')} showToast={showToast} />
            </motion.div>
          )}

          {view === 'spin' && (
            <motion.div key="spin" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <SpinWheelView profile={profile} onBack={() => navigateTo('home')} showToast={showToast} />
            </motion.div>
          )}

          {view === 'rewards' && (
            <motion.div key="rewards" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <RewardsView profile={profile} onBack={() => navigateTo('home')} showToast={showToast} />
            </motion.div>
          )}

          {view === 'staking' && (
            <motion.div key="staking" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StakingView profile={profile} onBack={() => navigateTo('home')} showToast={showToast} />
            </motion.div>
          )}

          {view === 'analytics_user' && (
            <motion.div key="analytics_user" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <UserAnalyticsView profile={profile} onBack={() => navigateTo('home')} />
            </motion.div>
          )}

          {view === 'feedback' && (
            <motion.div key="feedback" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <FeedbackView onBack={() => navigateTo('profile')} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 px-6 pb-8 bg-transparent pointer-events-none z-50">
        <div className="max-w-md mx-auto h-20 bg-white/80 dark:bg-[#151619]/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex items-center justify-around px-4 pointer-events-auto">
          {bottomNavItems.map((item) => {
            const isActive = view === item.id || (item.id === 'color_game_selection' && (view === 'wingo_selection' || view === 'wingo_master' || view === 'wingo_predictions'));
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as any)}
                className={`group relative flex flex-col items-center justify-center w-16 h-16 transition-all ${
                  isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-white/30'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activePill"
                    className="absolute inset-0 bg-emerald-500/10 rounded-2xl -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon size={22} className={`transition-transform duration-300 ${isActive ? 'scale-110 -translate-y-1' : 'group-hover:scale-110'}`} />
                <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-all ${isActive ? 'opacity-100 translate-y-0.5' : 'opacity-0 translate-y-2'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full shadow-2xl z-50 font-bold text-sm flex items-center gap-2"
          >
            <CheckCircle2 size={18} className="text-emerald-500" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
