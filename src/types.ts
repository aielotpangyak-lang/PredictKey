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
  isFrozen?: boolean;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  walletBalance: number;
  vipLevel: number; // 1 to 7
  totalDeposits: number;
  claimedRewards: string[]; // e.g., ['3_referrals', '10_referrals', 'vip_2_reward']
  bankDetails?: BankDetails;
  withdrawalDetails?: {
    type: 'bank' | 'upi';
    bank?: BankDetails;
    upiId?: string;
  };
  lastLoginRewardDate?: string; // YYYY-MM-DD
  lastSpinDate?: string; // YYYY-MM-DD
  dailyFreeSpinsUsed?: number;
  claimedVipRewards?: number[]; // Array of VIP levels already claimed
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
  status?: 'win' | 'loss' | 'pending';
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

export interface PhysicalReward {
  id: string;
  userId: string;
  item: string;
  status: 'pending_claim' | 'pending_delivery' | 'delivered';
  address?: string;
  createdAt: any;
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

// --- Prediction App Types ---

export type WingoType = '30s' | '1min' | '3min' | '5min';

export interface ColorPrediction {
  id: string;
  type: WingoType;
  period: string;
  prediction: {
    color: 'Red' | 'Green' | 'Violet';
    number: number;
    size: 'Big' | 'Small';
    confidence: number;
  };
  history: {
    period: string;
    result: {
      color: 'Red' | 'Green' | 'Violet';
      number: number;
      size: 'Big' | 'Small';
    };
  }[];
  trends: {
    currentStreak: number;
    streakType: 'Red' | 'Green' | 'Violet' | 'Big' | 'Small';
  };
}

export interface CricketMatch {
  id: string;
  teams: { name: string; logo?: string; playingXI?: string[] }[];
  time: any;
  venue: string;
  league?: string;
  status: 'live' | 'upcoming' | 'finished';
  actualWinner?: string;
  predictionResult?: 'win' | 'loss' | 'pending';
  predictions?: {
    winProbability: { [teamName: string]: number };
    topBatsman: string;
    topBowler: string;
    tossPrediction?: string;
    expectedScoreRange: string;
    whoWillWin?: string;
  };
  isLive: boolean;
}

export interface AviatorPrediction {
  id: string;
  multiplierRange: string; // e.g., "1.2x to 2.5x"
  strategy: string; // e.g., "Safe cashout under 1.5x"
  riskLevel: 'Low' | 'Medium' | 'High';
  history: number[]; // last 10 round multipliers
}

export interface StockPrediction {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  changePercent: number;
  signal: 'Buy' | 'Sell' | 'Hold';
  confidence: number;
  insights: {
    trend: string;
    entry: number;
    exit: number;
    support: number;
    resistance: number;
    history: { date: string; price: number }[];
  };
  createdAt?: any;
}

export interface AdminSettings {
  depositUpiId: string;
  depositQrCode: string; // base64 or URL
  minWithdrawalAmount: number;
  upiId?: string; // fallback or additional
}
