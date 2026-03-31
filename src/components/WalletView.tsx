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
    const minWithdraw = adminSettings?.minWithdrawalAmount || 1000;
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
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Wallet className="text-indigo-500" /> Wallet
        </h2>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">Available Balance</p>
              <h3 className="text-4xl font-black tracking-tight">₹{profile.walletBalance.toLocaleString()}</h3>
            </div>
            <button 
              onClick={async () => {
                setIsRefreshing(true);
                await refreshProfile();
                setIsRefreshing(false);
                showToast('Balance refreshed');
              }}
              disabled={isRefreshing}
              className={`p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => setActiveTab('deposit')}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-sm py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowDownLeft size={16} /> Deposit
            </button>
            <button 
              onClick={() => setActiveTab('withdraw')}
              className="bg-white text-indigo-600 hover:bg-indigo-50 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg"
            >
              <ArrowUpRight size={16} /> Withdraw
            </button>
          </div>
        </div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
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
              <div className="space-y-3">
                {transactions.map(tx => (
                  <div key={tx.id} className="bg-white dark:bg-[#151619] p-4 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'deposit' || tx.type === 'transfer_in' ? 'bg-emerald-500/10 text-emerald-500' : 
                        tx.type === 'withdraw' || tx.type === 'transfer_out' ? 'bg-orange-500/10 text-orange-500' : 
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                        {tx.type === 'deposit' || tx.type === 'transfer_in' ? <ArrowDownLeft size={20} /> : 
                         tx.type === 'withdraw' || tx.type === 'transfer_out' ? <ArrowUpRight size={20} /> : 
                         <Wallet size={20} />}
                      </div>
                      <div>
                        <p className="font-bold capitalize">{tx.type.replace('_', ' ')}</p>
                        <p className="text-xs text-slate-500">{tx.createdAt?.toDate().toLocaleString() || 'Just now'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-black ${tx.type === 'deposit' || tx.type === 'transfer_in' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                        {tx.type === 'deposit' || tx.type === 'transfer_in' ? '+' : '-'}₹{tx.amount}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {tx.status === 'pending' && <Clock size={12} className="text-amber-500" />}
                        {tx.status === 'approved' && <CheckCircle2 size={12} className="text-emerald-500" />}
                        {tx.status === 'rejected' && <XCircle size={12} className="text-red-500" />}
                        <span className={`text-[10px] uppercase font-bold ${
                          tx.status === 'pending' ? 'text-amber-500' :
                          tx.status === 'approved' ? 'text-emerald-500' : 'text-red-500'
                        }`}>{tx.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'deposit' && (
          <motion.div key="deposit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            {depositStep === 'amount' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">Enter Deposit Amount (₹)</label>
                  <input 
                    type="number" 
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)} 
                    placeholder="Min ₹100" 
                    className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" 
                    required 
                  />
                </div>
                <button 
                  onClick={() => {
                    if (Number(depositAmount) < 100) {
                      showToast('Minimum deposit is ₹100');
                      return;
                    }
                    setDepositStep('payment');
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors"
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-500/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 text-center">
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-bold mb-2">Send ₹{depositAmount} To</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white mb-4">{adminSettings?.depositUpiId || 'admin@upi'}</p>
                  {adminSettings?.depositQrCode ? (
                    <img src={adminSettings.depositQrCode} alt="QR Code" className="mx-auto rounded-xl shadow-md w-48 h-48 object-contain bg-white p-2" />
                  ) : (
                    <div className="mx-auto w-48 h-48 bg-white rounded-xl shadow-md flex items-center justify-center">
                      <QrCode size={64} className="text-slate-300" />
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(adminSettings?.depositUpiId || 'admin@upi');
                      showToast('UPI ID copied!');
                    }}
                    className="mt-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1 mx-auto"
                  >
                    <Copy size={14} /> Copy UPI ID
                  </button>
                </div>

                <form onSubmit={handleDeposit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">UTR / Reference Number</label>
                    <input type="text" value={depositUtr} onChange={e => setDepositUtr(e.target.value)} placeholder="Enter 12-digit UTR" className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Payment Screenshot</label>
                    <div className="relative border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required={!screenshotBase64} />
                      {screenshotBase64 ? (
                        <div className="space-y-2">
                          <CheckCircle2 className="mx-auto text-emerald-500" size={32} />
                          <p className="text-sm font-bold text-emerald-500">Screenshot Uploaded</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="mx-auto text-slate-400" size={32} />
                          <p className="text-sm text-slate-500">Tap to upload screenshot (Max 1MB)</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setDepositStep('amount')} className="flex-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white/60 font-bold py-4 rounded-xl transition-colors">
                      Back
                    </button>
                    <button type="submit" disabled={isSubmittingDeposit} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50">
                      {isSubmittingDeposit ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'withdraw' && (
          <motion.div key="withdraw" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-500/20 flex items-start gap-3">
              <Building2 className="text-orange-500 shrink-0 mt-1" size={20} />
              <div>
                <p className="text-sm font-bold text-orange-800 dark:text-orange-400">Minimum Withdrawal: ₹{adminSettings?.minWithdrawalAmount || 1000}</p>
                <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">Please ensure your details are correct. Withdrawals take 24-48 hours to process.</p>
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Withdrawal Amount (₹)</label>
                <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder={`Max: ₹${profile.walletBalance}`} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" required min={adminSettings?.minWithdrawalAmount || 1000} max={profile.walletBalance} />
              </div>
              
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                  <button 
                    type="button"
                    onClick={() => setWithdrawType('bank')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${withdrawType === 'bank' ? 'bg-white dark:bg-[#151619] text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Bank Transfer
                  </button>
                  <button 
                    type="button"
                    onClick={() => setWithdrawType('upi')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${withdrawType === 'upi' ? 'bg-white dark:bg-[#151619] text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    UPI ID
                  </button>
                </div>

                {withdrawType === 'bank' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500">Account Holder Name</label>
                      <input type="text" value={bankDetails.accountName} onChange={e => setBankDetails({...bankDetails, accountName: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500">Account Number</label>
                      <input type="text" value={bankDetails.accountNumber} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500">IFSC Code</label>
                      <input type="text" value={bankDetails.ifscCode} onChange={e => setBankDetails({...bankDetails, ifscCode: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none uppercase" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-500">Bank Name</label>
                      <input type="text" value={bankDetails.bankName} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-500">UPI ID</label>
                    <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="username@upi" className="w-full bg-white dark:bg-[#151619] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none" required />
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmittingWithdraw || Number(withdrawAmount) > profile.walletBalance} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-50 mt-4">
                {isSubmittingWithdraw ? 'Processing...' : 'Request Withdrawal'}
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
