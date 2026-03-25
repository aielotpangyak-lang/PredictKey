export type UserRole = 'admin' | 'user';

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  uid: string; // Short display UID
  email: string;
  role: UserRole;
  createdAt: any;
  isBlocked?: boolean;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  walletBalance: number;
  vipLevel: number; // 1 to 7
  totalDeposits: number;
  claimedRewards: string[]; // e.g., ['3_referrals', '10_referrals', 'vip_2_reward']
  bankDetails?: BankDetails;
  lastLoginRewardDate?: string; // YYYY-MM-DD
  lastSpinDate?: string; // YYYY-MM-DD
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  type: 'deposit' | 'withdraw' | 'purchase' | 'transfer_in' | 'transfer_out';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  utr?: string;
  screenshotBase64?: string;
  bankDetails?: BankDetails;
  notes?: string;
  createdAt: any;
}

export interface Plan {
  id: string;
  userId: string;
  name: string; // e.g., 'Basic', 'Pro'
  price: number;
  isActive: boolean;
  expiresAt: any;
  dailyPredictionLimit: number;
  predictionsUsedToday: number;
  lastResetDate: string; // YYYY-MM-DD
  createdAt: any;
}

export interface Purchase {
  id: string;
  userId: string;
  userEmail: string;
  utr: string;
  duration: string; // e.g., '1w', '1m', '6m', '1y', or 'custom:45'
  status: 'pending' | 'approved' | 'rejected';
  price: number;
  originalPrice?: number;
  discountApplied?: number;
  couponCode?: string;
  createdAt: any;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
  isActive: boolean;
  createdAt: any;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: any;
  read: boolean;
}

export interface Prediction {
  id: string;
  period: string;
  content: string;
  timestamp: any;
}

export interface StrategyRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestedStrategy: 'conservative' | 'aggressive';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

export interface ResetRequest {
  id: string;
  userId: string;
  email: string;
  targetDay: number;
  status: 'pending' | 'processed';
  createdAt: any;
}

export interface MasterPlanState {
  day: number;
  balance: number;
  level: number;
  totalLoss: number;
  cycleStartBalance: number;
  isCompletedToday: boolean;
  lastCompletedDate: string;
  riskStrategy?: 'conservative' | 'aggressive';
  pendingResetDay?: number;
  history: { period: string, bet: number, isWin: boolean, balanceAfter: number, prediction: string }[];
}

export interface DailyLogin {
  id: string;
  userId: string;
  lastLoginDate: string; // YYYY-MM-DD
  streak: number;
  lastRewardDate?: string; // YYYY-MM-DD
}

export interface Achievement {
  id: string;
  userId: string;
  title: string;
  description: string;
  earnedAt: any;
}

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  rating: number; // 1-5
  comment: string;
  isPublic: boolean; // Admin can toggle this
  createdAt: any;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  totalEarnings: number;
}
