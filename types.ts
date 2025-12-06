export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  noiseSensitivity: number; // 0 to -100 dB threshold concept
  favorites: FavoritePlace[];
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