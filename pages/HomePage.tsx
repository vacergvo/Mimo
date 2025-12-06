import React from 'react';
import { UserProfile, NavTab } from '../types';
import Button from '../components/Button';

interface HomePageProps {
  user: UserProfile;
  onNavigate: (tab: NavTab) => void;
  currentNoiseLevel: number;
}

const HomePage: React.FC<HomePageProps> = ({ user, onNavigate, currentNoiseLevel }) => {
  const getFirstName = (displayName: string) => {
    return displayName.split(' ')[0] || 'User';
  };

  const quickLinks = [
    { id: 'home', label: 'Home', icon: '🏠', color: 'bg-[var(--bg-input)] text-[var(--text-main)]' },
    { id: 'work', label: 'Work', icon: '💼', color: 'bg-blue-500/10 text-blue-500' },
    { id: 'school', label: 'School', icon: '🎓', color: 'bg-orange-500/10 text-orange-500' },
  ];

  const getNoiseStatus = (level: number) => {
      if (level < 50) return { text: "Quiet 🍃", color: "text-emerald-500" };
      if (level < 70) return { text: "Moderate 😐", color: "text-yellow-500" };
      return { text: "Noisy 🔊", color: "text-red-500" };
  };

  const status = getNoiseStatus(currentNoiseLevel);

  return (
    <div className="p-6 pt-12 pb-24 animate-fade-in space-y-8 h-full transition-colors duration-300 overflow-y-auto w-full">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">
              Hi, {getFirstName(user.displayName)} <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-[var(--text-sub)] mt-1">Where do you want to go quietly today?</p>
          </div>
        </header>

        <section>
          <Button 
            onClick={() => onNavigate(NavTab.MAP)}
            className="h-32 text-lg flex-col gap-2 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:opacity-90 shadow-lg text-[var(--text-inverse)] transform hover:scale-[1.01] transition-transform"
          >
            <span className="text-3xl">🗺️</span>
            Find a quiet route
          </Button>
        </section>

        <section className="bg-[var(--bg-card)] rounded-2xl p-6 shadow-sm border border-[var(--primary)]/20">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-full ${currentNoiseLevel > 70 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--text-main)] text-lg">Live Noise Level</h3>
              <p className={`text-sm font-medium ${status.color}`}>{status.text} nearby</p>
            </div>
            <div className="ml-auto flex flex-col items-end">
              <span className={`text-2xl font-bold ${currentNoiseLevel > user.noiseSensitivity ? 'text-red-500 animate-pulse' : 'text-[var(--text-main)]'}`}>
                {currentNoiseLevel} dB
              </span>
              {currentNoiseLevel > user.noiseSensitivity && <span className="text-xs text-red-500">Above limit!</span>}
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Favorites Places</h2>
            <button onClick={() => onNavigate(NavTab.FAVORITES)} className="text-sm text-[var(--text-sub)] hover:text-[var(--primary)] font-medium">View all</button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map(link => (
              <button 
                key={link.id}
                onClick={() => onNavigate(NavTab.FAVORITES)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95 ${link.color}`}
              >
                <span className="text-3xl">{link.icon}</span>
                <span className="text-sm font-medium">{link.label}</span>
              </button>
            ))}
            <button 
                onClick={() => onNavigate(NavTab.FAVORITES)}
                className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 bg-[var(--bg-card)] border-2 border-dashed border-[var(--primary)]/30 text-[var(--text-sub)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors"
            >
               <span className="text-2xl">+</span>
               <span className="text-sm font-medium">Add</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;