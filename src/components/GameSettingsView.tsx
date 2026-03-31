import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Zap, Save, Eye, EyeOff } from 'lucide-react';

const GameSettingsView: React.FC<{ showToast: (msg: string) => void }> = ({ showToast }) => {
  const [settings, setSettings] = useState({
    nextColor: 'Red',
    nextNumber: 0,
    nextSize: 'Big',
    enabled: false,
    showColor: true,
    showNumber: true,
    showSize: true
  });

  useEffect(() => {
    const fetchSettings = async () => {
      const docRef = doc(db, 'admin_game_settings', 'color_prediction');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings({
          nextColor: data.nextColor || 'Red',
          nextNumber: data.nextNumber || 0,
          nextSize: data.nextSize || 'Big',
          enabled: data.enabled || false,
          showColor: data.showColor !== false,
          showNumber: data.showNumber !== false,
          showSize: data.showSize !== false
        });
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'admin_game_settings', 'color_prediction'), settings);
      showToast('Game settings updated!');
    } catch (err) {
      showToast('Error updating settings');
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-white dark:bg-[#151619] rounded-3xl border border-slate-200 dark:border-white/10">
      
      {/* Display Settings */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Eye className="text-blue-500" /> Display Settings
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Choose which prediction elements are visible to users. If Color is enabled, Violet will be excluded.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5">
            <span className="font-bold">Show Color</span>
            <button 
              onClick={() => setSettings({...settings, showColor: !settings.showColor})}
              className={`w-12 h-6 rounded-full transition-colors ${settings.showColor ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.showColor ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5">
            <span className="font-bold">Show Number</span>
            <button 
              onClick={() => setSettings({...settings, showNumber: !settings.showNumber})}
              className={`w-12 h-6 rounded-full transition-colors ${settings.showNumber ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.showNumber ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5">
            <span className="font-bold">Show Size (Big/Small)</span>
            <button 
              onClick={() => setSettings({...settings, showSize: !settings.showSize})}
              className={`w-12 h-6 rounded-full transition-colors ${settings.showSize ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.showSize ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      <hr className="border-slate-200 dark:border-white/10" />

      {/* Override Settings */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="text-rose-500" /> Color Prediction Override
        </h2>
        
        <div className="flex items-center gap-4">
          <label className="text-sm font-bold">Enable Override</label>
          <button 
            onClick={() => setSettings({...settings, enabled: !settings.enabled})}
            className={`w-12 h-6 rounded-full transition-colors ${settings.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1">Color</label>
            <select value={settings.nextColor} onChange={e => setSettings({...settings, nextColor: e.target.value})} className="w-full p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10">
              <option>Red</option>
              <option>Green</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Number</label>
            <input type="number" value={settings.nextNumber} onChange={e => setSettings({...settings, nextNumber: Number(e.target.value)})} className="w-full p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Size</label>
            <select value={settings.nextSize} onChange={e => setSettings({...settings, nextSize: e.target.value})} className="w-full p-3 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10">
              <option>Big</option>
              <option>Small</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
        <Save size={18} /> Save Settings
      </button>
    </div>
  );
};

export default GameSettingsView;
