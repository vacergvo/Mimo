
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  noiseSensitivity: number; // 30 to 100 dB
  age?: string; // Storing as string for input ease, can be parsed for stats later
  favorites: FavoritePlace[];
  theme?: 'light' | 'dark';
}

export interface FavoritePlace {
  id: string;
  name: string;
  type: 'home' | 'work' | 'school' | 'other';
  address: string;
}

export enum NavTab {
  HOME = 'home',
  MAP = 'map',
  FAVORITES = 'favorites',
  SETTINGS = 'settings'
}
