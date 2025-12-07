
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface SettingsPageProps {
  user: UserProfile;
  onUpdateProfile: (name: string, sensitivity: number, age: string) => Promise<void>;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ user, onUpdateProfile, isDarkMode, onToggleTheme }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.displayName);
  const [age, setAge] = useState(user.age || '');
  const [sensitivity, setSensitivity] = useState(user.noiseSensitivity);
  const [loading, setLoading] = useState(false);
  const [requestPermission, setRequestPermission] = useState(false);

  // Sync state if user prop updates externally
  useEffect(() => {
    setName(user.displayName);
    setAge(user.age || '');
    setSensitivity(user.noiseSensitivity);
  }, [user]);

  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        setRequestPermission(true);
    }
  }, []);

  const handlePermission = () => {
    Notification.requestPermission().then(() => setRequestPermission(false));
  };

  const handleSave = async () => {
    setLoading(true);
    await onUpdateProfile(name, sensitivity, age);
    setLoading(false);
    setIsEditing(false);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  // Calculate percentage for slider gradient (30dB to 100dB range)
  const sliderPercentage = ((sensitivity - 30) / (100 - 30)) * 100;

  return (
    <div className="p-6 pt-12 pb-24 space-y-8 animate-fade-in transition-colors duration-300 h-full overflow-y-auto w-full">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
             <h1 className="text-3xl font-bold text-[var(--text-main)]">Settings ⚙️</h1>
             <span className="text-xs text-[var(--text-sub)] bg-[var(--bg-input)] px-2 py-1 rounded-md">ID: {user.uid.slice(0,6)}...</span>
        </div>

        {/* Profile Section */}
        <section className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--primary)]/20 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-[var(--text-main)]">Profile</h2>
                {!isEditing && (
                    <button 
                        onClick={() => setIsEditing(true)} 
                        className="text-sm text-[var(--primary)] hover:underline font-medium"
                    >
                        Edit
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 relative">
                    <label className="text-xs font-bold text-[var(--text-sub)] uppercase tracking-wider block mb-1">Display Name</label>
                    {isEditing ? (
                    <Input 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Your name"
                    />
                    ) : (
                    <p className="text-lg font-medium text-[var(--text-main)] py-2 border-b border-[var(--primary)]/10">{name}</p>
                    )}
                </div>

                <div className="col-span-1 relative">
                    <label className="text-xs font-bold text-[var(--text-sub)] uppercase tracking-wider block mb-1">Age</label>
                    {isEditing ? (
                    <Input 
                        value={age} 
                        onChange={(e) => setAge(e.target.value)} 
                        placeholder="Age"
                        type="number"
                        min="0"
                        max="120"
                    />
                    ) : (
                    <p className="text-lg font-medium text-[var(--text-main)] py-2 border-b border-[var(--primary)]/10">{age || '--'}</p>
                    )}
                </div>
            </div>

            {isEditing && (
            <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} isLoading={loading} className="py-2 text-sm">Save Changes</Button>
                <Button variant="secondary" onClick={() => setIsEditing(false)} className="py-2 text-sm">Cancel</Button>
            </div>
            )}
        </section>

        {/* Noise Sensitivity Section */}
        <section className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--primary)]/20 space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-semibold text-[var(--text-main)] mb-1">Noise Sensitivity</h2>
                    <p className="text-sm text-[var(--text-sub)]">Set your tolerance for city noise.</p>
                </div>
                {requestPermission && (
                    <button onClick={handlePermission} className="text-xs text-[var(--primary)] underline">Enable Alerts</button>
                )}
            </div>

            <div className="bg-[var(--bg-input)] rounded-2xl p-6 flex flex-col items-center">
                <span className="text-4xl font-bold text-[var(--text-main)] mb-2">{sensitivity} dB</span>
                <span className="text-xs font-bold text-[var(--text-sub)] uppercase tracking-widest mb-6">Threshold</span>
                
                <div className="w-full relative h-6 flex items-center">
                    <input 
                        type="range" 
                        min="30" 
                        max="100" 
                        value={sensitivity} 
                        onChange={(e) => setSensitivity(Number(e.target.value))}
                        onMouseUp={handleSave} 
                        onTouchEnd={handleSave}
                        className="w-full h-3 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                        style={{
                            background: `linear-gradient(to right, var(--primary) ${sliderPercentage}%, var(--bg-main) ${sliderPercentage}%)`,
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    />
                </div>
                
                <div className="flex justify-between w-full mt-2 text-xs text-[var(--text-sub)] font-medium">
                    <span>Quiet (30dB)</span>
                    <span>Loud (100dB)</span>
                </div>
            </div>
            <p className="text-xs text-center text-[var(--text-sub)] italic">
            Mimo will avoid routes louder than this level.
            </p>
        </section>

        {/* Theme Toggle */}
        <section className="bg-[var(--bg-card)] p-6 rounded-3xl shadow-sm border border-[var(--primary)]/20 flex justify-between items-center">
            <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Dark Mode</h2>
            <p className="text-sm text-[var(--text-sub)]">Switch between Day and Night</p>
            </div>
            <button 
            onClick={onToggleTheme}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ease-in-out ${isDarkMode ? 'bg-[var(--primary)]' : 'bg-gray-300'}`}
            >
            <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </button>
        </section>

        <section>
            <Button variant="danger" onClick={handleLogout} className="mt-8">
            Sign Out
            </Button>
            <p className="text-center text-xs text-[var(--text-sub)] mt-4">Version 2.0.0 • Mimo Inc.</p>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
