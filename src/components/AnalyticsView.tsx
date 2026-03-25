import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const data = [
  { name: 'Mon', activeUsers: 400, transactions: 240 },
  { name: 'Tue', activeUsers: 300, transactions: 139 },
  { name: 'Wed', activeUsers: 200, transactions: 980 },
  { name: 'Thu', activeUsers: 278, transactions: 390 },
  { name: 'Fri', activeUsers: 189, transactions: 480 },
  { name: 'Sat', activeUsers: 239, transactions: 380 },
  { name: 'Sun', activeUsers: 349, transactions: 430 },
];

export const AnalyticsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-white">Analytics Overview</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 shadow-xl">
          <h4 className="text-sm font-black text-white/60 uppercase tracking-widest mb-4">Active Users</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                <Legend />
                <Line type="monotone" dataKey="activeUsers" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-[#151619] border border-white/10 rounded-2xl p-6 shadow-xl">
          <h4 className="text-sm font-black text-white/60 uppercase tracking-widest mb-4">Transactions</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{ backgroundColor: '#000', borderColor: '#333' }} />
                <Legend />
                <Bar dataKey="transactions" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
