import React from 'react';
import { NavTab } from '../types';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: NavTab.HOME, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ), label: 'Home' },
    { id: NavTab.MAP, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ), label: 'Map' },
    { id: NavTab.FAVORITES, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ), label: 'Saved' },
    { id: NavTab.SETTINGS, icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ), label: 'Settings' },
  ];

  return (
    <nav className={`
      /* Mobile Styles (Fixed Bottom) */
      fixed bottom-0 left-0 w-full z-50 
      bg-[var(--nav-bg)] backdrop-blur-md 
      shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)]
      pb-safe pt-2 px-6 rounded-t-3xl 
      transition-colors duration-300

      /* Desktop Styles (Fixed Sidebar) */
      md:static md:w-64 md:h-full md:flex-col md:justify-start md:items-start 
      md:rounded-none md:shadow-none md:border-r md:border-[var(--primary)]/10
      md:p-6 md:bg-[var(--bg-card)] md:z-10
    `}>
      {/* Desktop Logo */}
      <div className="hidden md:flex items-center gap-2 mb-10 w-full">
         <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold text-xl">M</div>
         <h1 className="text-2xl font-bold text-[var(--text-main)] tracking-tight">Mimo</h1>
      </div>

      <div className="flex justify-between items-center max-w-lg mx-auto md:mx-0 md:flex-col md:w-full md:gap-4 md:items-start">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`
                flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300
                md:flex-row md:w-full md:px-4 md:py-3 md:gap-3
                ${isActive 
                  ? 'text-[var(--nav-active)] md:bg-[var(--primary)] md:text-[var(--text-inverse)] md:shadow-lg md:shadow-[var(--primary)]/30' 
                  : 'text-[var(--nav-inactive)] hover:text-[var(--nav-active)] md:hover:bg-[var(--bg-input)] md:hover:text-[var(--text-main)]'}
              `}
            >
              <div className={`p-2 rounded-full transition-colors md:p-0 ${isActive && 'bg-white/20 md:bg-transparent'}`}>
                {item.icon}
              </div>
              <span className={`
                text-[10px] font-medium transition-all duration-300
                md:text-sm md:opacity-100 md:h-auto
                ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden md:opacity-100 md:h-auto'}
              `}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;