import React from 'react';
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

export const FraudDetectionView: React.FC = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <ShieldAlert className="text-red-500" /> Fraud Detection
      </h3>
      <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="text-center py-12">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-white mb-2">No Fraud Alerts</h4>
          <p className="text-white/50">Everything looks normal. No suspicious activity detected.</p>
        </div>
      </div>
    </div>
  );
};
