
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
      const change = Math.floor(Math.random() * 10) - 4; 
      let newLevel = currentNoiseLevel + change;
      if (newLevel < 30) newLevel = 30;
      if (newLevel > 100) newLevel = 100;
      
      setCurrentNoiseLevel(newLevel);

      if (newLevel > userProfile.noiseSensitivity) {
        const now = Date.now();
        if (now - lastNotifiedTime > 60000) {
          triggerNoiseNotification(newLevel);
          setLastNotifiedTime(now);
        }
      }

    }, 3000);

    return () => clearInterval(interval);
  }, [userProfile, currentNoiseLevel, lastNotifiedTime]);

  const triggerNoiseNotification = (level: number) => {
    console.log(`⚠️ High Noise Alert: ${level}dB detected!`);
    if (Notification.permission === 'granted') {
      new Notification('Mimo Noise Alert ⚠️', {
        body: `Current noise level (${level}dB) exceeds your threshold. Re-routing suggested.`,
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
          setTheme('light'); // Reset theme on logout
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper: Save to LocalStorage (Backup)
  const saveToLocal = (uid: string, data: UserProfile) => {
    try {
        localStorage.setItem(`mimo_user_${uid}`, JSON.stringify(data));
    } catch (e) {
        console.error("Local storage save failed", e);
    }
  };

  // Helper: Load from LocalStorage
  const loadFromLocal = (uid: string): UserProfile | null => {
    try {
        const data = localStorage.getItem(`mimo_user_${uid}`);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
  };

  const fetchOrCreateUserProfile = async (user: User) => {
    // 1. Define default structure
    const defaultProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || 'Traveler',
      noiseSensitivity: 70,
      age: '', 
      theme: 'light',
      favorites: [
         { id: '1', name: 'Home', type: 'home', address: 'Set your home address' },
         { id: '2', name: 'Work', type: 'work', address: 'Set your work address' }
      ]
    };

    try {
      // 2. Try to fetch from Firestore
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const merged = {
          ...defaultProfile,
          ...data,
          favorites: data.favorites || defaultProfile.favorites
        } as UserProfile;
        
        setUserProfile(merged);
        if (merged.theme) setTheme(merged.theme);
        saveToLocal(user.uid, merged); // Sync to local backup
      } else {
        // 3. If new user, save default profile to Firestore
        await setDoc(userRef, defaultProfile);
        setUserProfile(defaultProfile);
        saveToLocal(user.uid, defaultProfile);
      }
    } catch (error: any) {
      console.warn("⚠️ FIRESTORE PERMISSION ERROR: Using Local Storage Fallback.");
      
      // 4. Fallback: Try to load from LocalStorage
      const localData = loadFromLocal(user.uid);
      if (localData) {
        console.log("Loaded profile from Local Storage");
        setUserProfile(localData);
        if (localData.theme) setTheme(localData.theme);
      } else {
        console.log("No local data found, using defaults");
        setUserProfile(defaultProfile);
        saveToLocal(user.uid, defaultProfile);
      }
    }
  };

  const handleToggleTheme = async () => {
    if (!currentUser || !userProfile) return;

    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    const updatedProfile = { ...userProfile, theme: newTheme };
    setUserProfile(updatedProfile);
    saveToLocal(currentUser.uid, updatedProfile);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { theme: newTheme });
    } catch (error) {
       // Silent fail for theme persistence if permission denied
    }
  };

  const updateProfileData = async (name: string, sensitivity: number, age: string) => {
    if (!currentUser || !userProfile) return;
    
    // 1. Optimistic UI Update & Local Save
    const updatedProfile = { ...userProfile, displayName: name, noiseSensitivity: sensitivity, age };
    setUserProfile(updatedProfile);
    saveToLocal(currentUser.uid, updatedProfile); // ALWAYS save to local
    
    // 2. Try Firestore Update
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        displayName: name,
        noiseSensitivity: sensitivity,
        age: age
      });
    } catch (error) {
      console.error("Firestore sync failed (Permissions). Data saved locally.");
    }
  };

  const addFavorite = async (place: Omit<FavoritePlace, 'id'>) => {
    if (!currentUser || !userProfile) return;

    const newFavorite = { ...place, id: Date.now().toString() };
    const updatedFavorites = [...userProfile.favorites, newFavorite];
    const updatedProfile = { ...userProfile, favorites: updatedFavorites };
    
    setUserProfile(updatedProfile);
    saveToLocal(currentUser.uid, updatedProfile);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { favorites: updatedFavorites });
    } catch (error) {
      console.warn("Firestore sync failed (Permissions). Data saved locally.");
    }
  };

  const updateFavorite = async (id: string, updates: Partial<FavoritePlace>) => {
    if (!currentUser || !userProfile) return;

    const updatedFavorites = userProfile.favorites.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );

    const updatedProfile = { ...userProfile, favorites: updatedFavorites };
    setUserProfile(updatedProfile);
    saveToLocal(currentUser.uid, updatedProfile);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { favorites: updatedFavorites });
    } catch (error) {
      console.warn("Firestore sync failed (Permissions). Data saved locally.");
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
            onToggleTheme={handleToggleTheme}
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
