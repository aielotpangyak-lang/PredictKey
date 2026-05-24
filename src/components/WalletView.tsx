import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, setDoc, orderBy, getDocs, getDoc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Transaction, BankDetails, AdminSettings } from '../types';
import { usePlan } from '../PlanContext';
import { useAuth } from '../AuthContext';
import { ChevronLeft, Wallet, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, Upload, Building2, Send, Download, QrCode, Copy, RefreshCw } from 'lucide-react';

interface WalletViewProps {
  profile: UserProfile;
  onBack: () => void;
  showToast: (msg: string) => void;
}

const WalletView: React.FC<WalletViewProps> = ({ profile, onBack, showToast }) => {
  const { activePlan } = usePlan();
  const { refreshProfile } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'deposit' | 'withdraw' | 'transfer'>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);

  // Deposit State
  const [depositAmount, setDepositAmount] = useState('');
  const [depositStep, setDepositStep] = useState<'amount' | 'payment'>('amount');
  const [depositUtr, setDepositUtr] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState('');
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawType, setWithdrawType] = useState<'bank' | 'upi'>(profile.withdrawalDetails?.type || 'bank');
  const [bankDetails, setBankDetails] = useState<BankDetails>(profile.withdrawalDetails?.bank || {
    accountName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: ''
  });
  const [upiId, setUpiId] = useState(profile.withdrawalDetails?.upiId || '');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'admin'), (doc) => {
      if (doc.exists()) {
        setAdminSettings(doc.data() as AdminSettings);
      }
    });
    return () => unsubscribe();
  }, []);

  // Transfer State
  const [transferAmount, setTransferAmount] = useState('');
  const [transferUid, setTransferUid] = useState('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(transferAmount);
    if (!amount || amount < 300 || amount > 50000) {
      showToast('Amount must be between ₹300 and ₹50,000');
      return;
    }
    
    const fee = amount * 0.10;
    const totalDeduction = amount + fee;

    if (totalDeduction > profile.walletBalance) {
      showToast('Insufficient wallet balance (including 10% fee)');
      return;
    }
    if (!transferUid.trim()) {
      showToast('Enter recipient UID');
      return;
    }
    if (transferUid === profile.id) {
      showToast('Cannot transfer to yourself');
      return;
    }

    setIsSubmittingTransfer(true);
    try {
      // Find recipient
      const recipientDocRef = doc(db, 'users', transferUid.trim());
      const recipientDocSnap = await getDoc(recipientDocRef);
      
      if (!recipientDocSnap.exists()) {
        showToast('Recipient UID not found');
        setIsSubmittingTransfer(false);
        return;
      }

      // Create transfer transaction for sender
      await addDoc(collection(db, 'transactions'), {
        userId: profile.id,
        type: 'transfer_out',
        amount: totalDeduction,
        status: 'approved',
        createdAt: serverTimestamp(),
        details: `Transfer to UID: ${transferUid} (Includes ₹${fee} fee)`
      });

      // Create transfer transaction for recipient
      await addDoc(collection(db, 'transactions'), {
        userId: transferUid,
        type: 'transfer_in',
        amount: amount,
        status: 'approved',
        createdAt: serverTimestamp(),
        details: `Transfer from UID: ${profile.id}`
      });

      // Deduct from sender
      await updateDoc(doc(db, 'users', profile.id), {
        walletBalance: increment(-totalDeduction)
      });
      await setDoc(doc(db, 'leaderboard', profile.id), {
        walletBalance: increment(-totalDeduction)
      }, { merge: true });

      // Add to recipient
      await updateDoc(doc(db, 'users', transferUid), {
        walletBalance: increment(amount)
      });
      await setDoc(doc(db, 'leaderboard', transferUid), {
        walletBalance: increment(amount)
      }, { merge: true });

      showToast(`Successfully transferred ₹${amount}`);
      setTransferAmount('');
      setTransferUid('');
      setActiveTab('overview');
    } catch (error) {
      console.error('Transfer error:', error);
      showToast('Transfer failed. Please try again.');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', profile.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      txs.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      setTransactions(txs);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [profile.id]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/export-transactions?userId=${profile.id}&format=${format}`);
      if (!response.ok) throw new Error('Export failed');
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions_${profile.uid}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        showToast('PDF export is coming soon. Please use CSV for now.');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export transactions.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit
        showToast('Image size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAmount || !depositUtr || !screenshotBase64) {
      showToast('Please fill all fields and upload screenshot');
      return;
    }
    const amount = Number(depositAmount);
    if (amount < 1000) {
      showToast('Minimum deposit is ₹1000');
      return;
    }

    setIsSubmittingDeposit(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: profile.id,
        userEmail: profile.email,
        type: 'deposit',
        amount,
        utr: depositUtr,
        screenshotBase64,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      showToast('Deposit request submitted successfully');
      setDepositAmount('');
      setDepositUtr('');
      setScreenshotBase64('');
      setActiveTab('overview');
    } catch (error) {
      console.error(error);
      showToast('Error submitting deposit request');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile.walletFrozen) {
      showToast('Your account is frozen. Please contact customer service.');
      return;
    }
    const amount = Number(withdrawAmount);
    const minWithdraw = adminSettings?.minWithdrawalAmount || 500;
    if (!amount || amount < minWithdraw) {
      showToast(`Minimum withdrawal is ₹${minWithdraw}`);
      return;
    }
    if (amount > profile.walletBalance) {
      showToast('Insufficient wallet balance');
      return;
    }
    
    if (withdrawType === 'bank') {
      if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.ifscCode || !bankDetails.bankName) {
        showToast('Please fill all bank details');
        return;
      }
    } else {
      if (!upiId.trim()) {
        showToast('Please enter UPI ID');
        return;
      }
    }

    setIsSubmittingWithdraw(true);
    try {
      // 1. Save withdrawal details to profile
      const withdrawalDetails: any = {
        type: withdrawType
      };
      
      if (withdrawType === 'bank') {
        withdrawalDetails.bank = bankDetails;
      } else if (withdrawType === 'upi') {
        withdrawalDetails.upiId = upiId;
      }
      
      await updateDoc(doc(db, 'users', profile.id), {
        withdrawalDetails
      });

      // 2. Deduct balance immediately to prevent double spending
      await updateDoc(doc(db, 'users', profile.id), {
        walletBalance: profile.walletBalance - amount
      });
      await setDoc(doc(db, 'leaderboard', profile.id), {
        walletBalance: profile.walletBalance - amount
      }, { merge: true });

      // 3. Create withdrawal request
      await addDoc(collection(db, 'transactions'), {
        userId: profile.id,
        userEmail: profile.email,
        type: 'withdraw',
        amount,
        withdrawalDetails,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      showToast('Withdrawal request submitted successfully');
      setWithdrawAmount('');
      setActiveTab('overview');
    } catch (error) {
      console.error(error);
      showToast('Error submitting withdrawal request');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const todayDateString = new Date().toISOString().split('T')[0];
  const canClaimDailyReward = profile.lastLoginRewardDate !== todayDateString && !!activePlan;

  const handleDailyReward = async () => {
    if (!canClaimDailyReward || isClaimingReward) return;
    setIsClaimingReward(true);
    try {
      await updateDoc(doc(db, 'users', profile.id), {
        walletBalance: profile.walletBalance + 10,
        lastLoginRewardDate: todayDateString
      });
      await setDoc(doc(db, 'leaderboard', profile.id), {
        walletBalance: profile.walletBalance + 10
      }, { merge: true });
      showToast('🎉 Claimed ₹10 Daily Reward!');
    } catch (error) {
      console.error(error);
      showToast('Error claiming reward');
    } finally {
      setIsClaimingReward(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600">
            <Wallet size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Wallet</h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">Financial Overview</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleExport('csv')}
            className="active:scale-95 hover:scale-[1.02] transition-transform bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 transition-all text-xs font-bold flex items-center gap-1.5"
          >
            <Download size={14} /> Export CSV
          </button>
          <button onClick={onBack} className="active:scale-95 hover:scale-[1.02] transition-transform text-slate-400 dark:text-white/40 hover:text-slate-900 dark:hover:text-white text-sm flex items-center gap-1 transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden bg-[#151619] border border-white/10 rounded-[2.5rem] p-8 text-white shadow-2xl"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Wallet Balance</p>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-white/40 text-2xl font-bold">₹</span>
                <h3 className="text-5xl font-black tracking-tighter">
                  {profile.walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Withdrawal Ready</span>
              </div>
              <button 
                onClick={async () => {
                  setIsRefreshing(true);
                  await refreshProfile();
                  setTimeout(() => {
                    setIsRefreshing(false);
                    showToast('Balance refreshed');
                  }, 1000);
                }}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setActiveTab('deposit')}
              className="flex-1 md:flex-none px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <ArrowDownLeft size={16} /> Deposit
            </button>
            <button 
              onClick={() => setActiveTab('withdraw')}
              className="flex-1 md:flex-none px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <ArrowUpRight size={16} /> Withdraw
            </button>
          </div>
        </div>
        
        {/* Background Accents */}
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />
      </motion.div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('deposit')}
          className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'deposit' ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
        >
          Deposit
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'withdraw' ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
        >
          Withdraw
        </button>
        <button
          onClick={() => setActiveTab('transfer')}
          className={`flex-1 py-2 px-3 text-sm font-bold rounded-lg transition-all ${activeTab === 'transfer' ? 'bg-white dark:bg-[#151619] text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-white/40'}`}
        >
          Transfer
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Recent Transactions</h3>
              <button 
                onClick={() => {
                  if (transactions.length === 0) return;
                  const headers = ['Date', 'Type', 'Amount', 'Status', 'Details'];
                  const csvData = transactions.map(tx => [
                    tx.createdAt?.toDate().toLocaleString() || 'N/A',
                    tx.type,
                    tx.amount,
                    tx.status,
                    tx.details || ''
                  ].join(','));
                  const csvString = [headers.join(','), ...csvData].join('\n');
                  const blob = new Blob([csvString], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.setAttribute('hidden', '');
                  a.setAttribute('href', url);
                  a.setAttribute('download', `transactions_${profile.id}.csv`);
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
              >
                Export CSV
              </button>
            </div>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#151619] rounded-3xl border border-slate-200 dark:border-white/10">
                <Clock className="mx-auto text-slate-400 mb-4" size={48} />
                <p className="text-slate-500">No transactions yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="group bg-[#151619] border border-white/5 hover:border-white/10 p-5 rounded-3xl transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                          tx.type === 'deposit' || tx.type === 'transfer_in' ? 'bg-emerald-500/10 text-emerald-500' : 
                          tx.type === 'withdraw' || tx.type === 'transfer_out' ? 'bg-orange-500/10 text-orange-500' : 
                          'bg-indigo-500/10 text-indigo-500'
                        }`}>
                          {tx.type === 'deposit' || tx.type === 'transfer_in' ? <ArrowDownLeft size={20} /> : 
                           tx.type === 'withdraw' || tx.type === 'transfer_out' ? <ArrowUpRight size={20} /> : 
                           <Wallet size={20} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white uppercase tracking-widest mb-0.5">{tx.type.replace('_', ' ')}</p>
                          <p className="text-[10px] font-bold text-white/30 uppercase tracking-tight">{tx.createdAt?.toDate().toLocaleString() || 'Just now'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-black tracking-tighter ${tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-emerald-500' : 'text-white'}`}>
                          {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <div className={`w-1 h-1 rounded-full ${
                            tx.status === 'pending' ? 'bg-amber-500 animate-pulse' :
                            tx.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                          }`} />
                          <span className={`text-[9px] uppercase font-black tracking-[0.1em] ${
                            tx.status === 'pending' ? 'text-amber-500' :
                            tx.status === 'approved' ? 'text-emerald-500' : 'text-red-500'
                          }`}>{tx.status}</span>
                        </div>
                      </div>
                    </div>
                    {tx.details && (
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-[10px] font-medium text-white/30 leading-relaxed italic">
                          " {tx.details} "
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'deposit' && (
          <motion.div key="deposit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            {depositStep === 'amount' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mb-3">Deposit Amount (₹)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 dark:text-white/20 tracking-tighter italic">₹</span>
                    <input 
                      type="number" 
                      value={depositAmount} 
                      onChange={e => setDepositAmount(e.target.value)} 
                      placeholder="0.00" 
                      className="w-full bg-white dark:bg-[#151619] border-2 border-slate-100 dark:border-white/5 rounded-3xl p-8 pl-14 text-4xl font-black focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-white/5" 
                      required 
                    />
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {[100, 500, 1000, 5000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setDepositAmount(amt.toString())}
                        className={`py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${
                          depositAmount === amt.toString()
                            ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-500 dark:text-white/40 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-6 flex items-start gap-4">
                  <div className="bg-emerald-500 p-2 rounded-xl text-white">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Safe & Secure Deposits</p>
                    <p className="text-[10px] text-emerald-600/60 dark:text-emerald-400/50 font-medium">Your funds are protected by industry-standard encryption. Min deposit ₹100.</p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    if (Number(depositAmount) < 100) {
                      showToast('Minimum deposit is ₹100');
                      return;
                    }
                    setDepositStep('payment');
                  }}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-5 rounded-[2rem] transition-all active:scale-95 shadow-xl shadow-indigo-500/20 uppercase tracking-[0.2em] text-xs"
                >
                  Continue to Payment
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-[#151619] border border-white/10 rounded-[3rem] p-10 text-center relative overflow-hidden">
                  <div className="relative z-10 space-y-6">
                    <div>
                      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-2">Send ₹{depositAmount} To</p>
                      <h4 className="text-3xl font-black text-white tracking-tighter italic">{adminSettings?.depositUpiId || 'admin@upi'}</h4>
                    </div>

                    <div className="relative inline-block group">
                      <div className="absolute -inset-4 bg-indigo-500/20 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                      {adminSettings?.depositQrCode ? (
                        <img src={adminSettings.depositQrCode} alt="QR Code" className="relative mx-auto rounded-[2rem] shadow-2xl w-56 h-56 object-contain bg-white p-4" />
                      ) : (
                        <div className="relative mx-auto w-56 h-56 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center">
                          <QrCode size={80} className="text-slate-900/10" />
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(adminSettings?.depositUpiId || 'admin@upi');
                        showToast('UPI ID copied!');
                      }}
                      className="flex items-center gap-2 mx-auto px-6 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
                    >
                      <Copy size={14} /> Copy ID
                    </button>
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 pointer-events-none" />
                </div>

                <form onSubmit={handleDeposit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest ml-2">Transaction ID (UTR)</label>
                      <input type="text" value={depositUtr} onChange={e => setDepositUtr(e.target.value)} placeholder="12-digit UTR Number" className="w-full bg-white dark:bg-[#151619] border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 font-bold focus:border-indigo-500/50 outline-none transition-all" required />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest ml-2">Proof of Payment</label>
                      <label className="relative flex items-center justify-center gap-3 w-full bg-white dark:bg-[#151619] border-2 border-slate-100 dark:border-white/5 rounded-2xl px-6 py-4 font-bold border-dashed hover:border-indigo-500/50 cursor-pointer transition-all">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" required={!screenshotBase64} />
                        {screenshotBase64 ? (
                          <>
                            <CheckCircle2 className="text-emerald-500" size={20} />
                            <span className="text-emerald-500 text-xs">Attached</span>
                          </>
                        ) : (
                          <>
                            <Upload className="text-slate-400" size={20} />
                            <span className="text-slate-400 text-xs">Upload Image</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setDepositStep('amount')} className="flex-1 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-white/60 font-black py-5 rounded-[2rem] transition-all uppercase tracking-widest text-[10px]">
                      Back
                    </button>
                    <button type="submit" disabled={isSubmittingDeposit} className="flex-[2] bg-indigo-500 hover:bg-indigo-400 text-white font-black py-5 rounded-[2rem] transition-all active:scale-95 shadow-xl shadow-indigo-500/20 uppercase tracking-[0.2em] text-xs disabled:opacity-50">
                      {isSubmittingDeposit ? 'Verifying...' : 'Finalize Deposit'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'withdraw' && (
          <motion.div key="withdraw" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-[2rem] p-6 flex items-start gap-4">
              <div className="bg-orange-500 p-2 rounded-xl text-white">
                <Building2 size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Important Withdrawal Info</p>
                <div className="space-y-1">
                  <p className="text-[10px] text-orange-600/60 dark:text-orange-400/50 font-bold italic">Min: ₹{adminSettings?.minWithdrawalAmount || 500} | Max per round: ₹50,000</p>
                  <p className="text-[10px] text-orange-600/60 dark:text-orange-400/50">Processing time: 2-24 Hours. Double check bank details before submitting.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mb-4">Withdraw Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400 dark:text-white/20 tracking-tighter italic">₹</span>
                  <input 
                    type="number" 
                    value={withdrawAmount} 
                    onChange={e => setWithdrawAmount(e.target.value)} 
                    placeholder="0.00" 
                    className="w-full bg-white dark:bg-[#151619] border-2 border-slate-100 dark:border-white/5 rounded-3xl p-8 pl-14 text-4xl font-black focus:border-orange-500/50 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-white/5" 
                    required 
                    min={adminSettings?.minWithdrawalAmount || 500} 
                    max={profile.walletBalance} 
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2">
                    <button 
                      type="button"
                      onClick={() => setWithdrawAmount(profile.walletBalance.toString())}
                      className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full hover:bg-orange-500/20"
                    >
                      Max
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-[2rem] border border-slate-200 dark:border-white/5">
                  <button 
                    type="button"
                    onClick={() => setWithdrawType('bank')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${withdrawType === 'bank' ? 'bg-white dark:bg-[#151619] text-orange-500 shadow-xl' : 'text-slate-400 dark:text-white/20'}`}
                  >
                    Bank Transfer
                  </button>
                  <button 
                    type="button"
                    onClick={() => setWithdrawType('upi')}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${withdrawType === 'upi' ? 'bg-white dark:bg-[#151619] text-orange-500 shadow-xl' : 'text-slate-400 dark:text-white/20'}`}
                  >
                    UPI Settlement
                  </button>
                </div>

                {withdrawType === 'bank' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] ml-2">Holder Name</label>
                      <input type="text" value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-indigo-500/50 outline-none transition-all" required />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] ml-2">Account Number</label>
                      <input type="text" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-indigo-500/50 outline-none transition-all" required />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] ml-2">IFSC Code</label>
                      <input type="text" value={bankDetails.ifscCode} onChange={e => setBankDetails({...bankDetails, ifscCode: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-indigo-500/50 outline-none transition-all uppercase" required />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] ml-2">Bank Name</label>
                      <input type="text" value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-indigo-500/50 outline-none transition-all" required />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] ml-2">Recipient UPI ID</label>
                    <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="username@bank" className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 font-bold focus:border-indigo-500/50 outline-none transition-all" required />
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmittingWithdraw || Number(withdrawAmount) > profile.walletBalance} className="w-full bg-[#151619] text-white border border-white/5 hover:border-orange-500/50 font-black py-5 rounded-[2rem] transition-all active:scale-95 shadow-xl uppercase tracking-[0.2em] text-xs disabled:opacity-50">
                {isSubmittingWithdraw ? 'Processing Request...' : 'Initiate Withdrawal'}
              </button>
            </form>
          </motion.div>
        )}
        {activeTab === 'transfer' && (
          <motion.div key="transfer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-indigo-50 dark:bg-indigo-500/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 flex items-start gap-3">
              <Send className="text-indigo-500 shrink-0 mt-1" size={20} />
              <div>
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-400">P2P Transfer</p>
                <p className="text-xs text-indigo-600 dark:text-indigo-300 mt-1">Transfer funds instantly to other users using their UID. A 10% fee applies. Min: ₹300, Max: ₹50,000.</p>
              </div>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Transfer Amount (₹)</label>
                <input 
                  type="number" 
                  value={transferAmount} 
                  onChange={e => setTransferAmount(e.target.value)} 
                  placeholder={`Max: ₹${profile.walletBalance}`} 
                  className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  required 
                  min="300" 
                  max="50000" 
                />
                {transferAmount && Number(transferAmount) > 0 && (
                  <p className="text-xs text-slate-500 mt-2">
                    Fee (10%): ₹{(Number(transferAmount) * 0.1).toFixed(2)} | Total Deduction: ₹{(Number(transferAmount) * 1.1).toFixed(2)}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold mb-2">Recipient UID</label>
                <input 
                  type="text" 
                  value={transferUid} 
                  onChange={e => setTransferUid(e.target.value)} 
                  placeholder="Enter user UID" 
                  className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmittingTransfer || !transferAmount || !transferUid}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-white/10 text-white font-bold py-4 rounded-xl transition-colors mt-6"
              >
                {isSubmittingTransfer ? 'Processing...' : 'Send Funds'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WalletView;
