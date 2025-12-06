import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { NavTab, UserProfile, FavoritePlace } from './types';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import FavoritesPage from './pages/FavoritesPage';
import SettingsPage from './pages/SettingsPage';
import BottomNav from './components/BottomNav';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>(NavTab.HOME);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Noise Simulation State
  const [currentNoiseLevel, setCurrentNoiseLevel] = useState(45);
  const [lastNotifiedTime, setLastNotifiedTime] = useState(0);

  // Apply theme to HTML tag
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Noise Simulation Engine
  useEffect(() => {
    if (!userProfile) return;

    const interval = setInterval(() => {
      // Simulate random noise fluctuation between 30dB (library) and 90dB (heavy traffic)
      // Base trend on time of day? For now, just random walk.
      const change = Math.floor(Math.random() * 10) - 4; // -4 to +5
      let newLevel = currentNoiseLevel + change;
      if (newLevel < 30) newLevel = 30;
      if (newLevel > 100) newLevel = 100;
      
      setCurrentNoiseLevel(newLevel);

      // Check Notification Threshold
      // User sensitivity is stored as positive integer now (30-100), e.g., 70
      // If simulated noise > sensitivity, trigger alert.
      if (newLevel > userProfile.noiseSensitivity) {
        const now = Date.now();
        // Cooldown of 60 seconds
        if (now - lastNotifiedTime > 60000) {
          triggerNoiseNotification(newLevel);
          setLastNotifiedTime(now);
        }
      }

    }, 3000);

    return () => clearInterval(interval);
  }, [userProfile, currentNoiseLevel, lastNotifiedTime]);

  const triggerNoiseNotification = (level: number) => {
    // 1. In-app toast (simplified via console/UI update for now, or alert)
    console.log(`⚠️ High Noise Alert: ${level}dB detected!`);

    // 2. Browser Notification
    if (Notification.permission === 'granted') {
      new Notification('Mimo Noise Alert ⚠️', {
        body: `Current noise level (${level}dB) exceeds your threshold. Re-routing suggested.`,
        icon: '/icon.png' // Placeholder
      });
    }
  };

  // Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        if (user) {
          await fetchOrCreateUserProfile(user);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchOrCreateUserProfile = async (user: User) => {
    const defaultProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Traveler',
      noiseSensitivity: 70, // Default to 70dB
      favorites: [
         { id: '1', name: 'Home', type: 'home', address: 'Set your home address' },
         { id: '2', name: 'Work', type: 'work', address: 'Set your work address' }
      ]
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        // Create new profile
        await setDoc(userRef, defaultProfile);
        setUserProfile(defaultProfile);
      }
    } catch (error: any) {
      console.warn("Firestore access failed, using local fallback:", error.message);
      setUserProfile(defaultProfile);
    }
  };

  const updateProfileData = async (name: string, sensitivity: number) => {
    if (!currentUser || !userProfile) return;
    
    const updatedProfile = { ...userProfile, displayName: name, noiseSensitivity: sensitivity };
    setUserProfile(updatedProfile);
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: name,
        noiseSensitivity: sensitivity
      });
    } catch (error) {
      console.warn("Failed to sync profile update to DB:", error);
    }
  };

  const addFavorite = async (place: Omit<FavoritePlace, 'id'>) => {
    if (!currentUser || !userProfile) return;

    const newFavorite = { ...place, id: Date.now().toString() };
    const updatedFavorites = [...userProfile.favorites, newFavorite];
    
    const updatedProfile = { ...userProfile, favorites: updatedFavorites };
    setUserProfile(updatedProfile);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { favorites: updatedFavorites });
    } catch (error) {
      console.warn("Failed to sync favorites to DB:", error);
    }
  };

  const updateFavorite = async (id: string, updates: Partial<FavoritePlace>) => {
    if (!currentUser || !userProfile) return;

    const updatedFavorites = userProfile.favorites.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );

    const updatedProfile = { ...userProfile, favorites: updatedFavorites };
    setUserProfile(updatedProfile);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { favorites: updatedFavorites });
    } catch (error) {
      console.warn("Failed to sync favorite update to DB:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--bg-main)]">
        <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-[var(--primary)] rounded-full mb-4"></div>
        </div>
      </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <AuthPage />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case NavTab.HOME:
        return <HomePage user={userProfile} onNavigate={setCurrentTab} currentNoiseLevel={currentNoiseLevel} />;
      case NavTab.MAP:
        return <MapPage noiseLevel={currentNoiseLevel} userSensitivity={userProfile.noiseSensitivity} />;
      case NavTab.FAVORITES:
        return (
          <FavoritesPage 
            favorites={userProfile.favorites} 
            onAddFavorite={addFavorite}
            onUpdateFavorite={updateFavorite}
          />
        );
      case NavTab.SETTINGS:
        return (
          <SettingsPage 
            user={userProfile} 
            onUpdateProfile={updateProfileData} 
            isDarkMode={theme === 'dark'}
            onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
          />
        );
      default:
        return <HomePage user={userProfile} onNavigate={setCurrentTab} currentNoiseLevel={currentNoiseLevel} />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[var(--bg-main)] font-sans transition-colors duration-300 overflow-hidden text-[var(--text-main)]">
        {/* Navigation - Sidebar on Desktop, Bottom on Mobile */}
        <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Main Content Area */}
        <main className="flex-1 relative h-full overflow-y-auto overflow-x-hidden md:p-0 pb-20">
            {renderContent()}
        </main>
    </div>
  );
};

export default App;