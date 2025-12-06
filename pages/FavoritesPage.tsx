import React, { useState } from 'react';
import { FavoritePlace } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';

interface FavoritesPageProps {
  favorites: FavoritePlace[];
  onAddFavorite: (place: Omit<FavoritePlace, 'id'>) => Promise<void>;
  onUpdateFavorite: (id: string, updates: Partial<FavoritePlace>) => Promise<void>;
}

const FavoritesPage: React.FC<FavoritesPageProps> = ({ favorites, onAddFavorite, onUpdateFavorite }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // State for new place
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  // State for editing existing place
  const [editAddress, setEditAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!newName || !newAddress) return;
    setLoading(true);
    await onAddFavorite({
      name: newName,
      address: newAddress,
      type: 'other'
    });
    setNewName('');
    setNewAddress('');
    setIsAdding(false);
    setLoading(false);
  };

  const startEditing = (place: FavoritePlace) => {
    setEditingId(place.id);
    setEditAddress(place.address);
  };

  const saveEdit = async (id: string) => {
    setLoading(true);
    await onUpdateFavorite(id, { address: editAddress });
    setEditingId(null);
    setLoading(false);
  };

  const homePlace = favorites.find(f => f.type === 'home');
  const workPlace = favorites.find(f => f.type === 'work');
  const otherPlaces = favorites.filter(f => f.type !== 'home' && f.type !== 'work');

  const renderPlaceCard = (place: FavoritePlace) => {
    const isEditingThis = editingId === place.id;
    
    return (
      <div key={place.id} className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-sm border border-[var(--primary)]/20 flex flex-col gap-2 transition-colors duration-200 hover:border-[var(--primary)]/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className={`p-3 rounded-full bg-[var(--bg-input)] text-[var(--text-main)]`}>
              {place.type === 'home' ? '🏠' : place.type === 'work' ? '💼' : '📍'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-[var(--text-main)]">{place.name}</h3>
              {!isEditingThis && (
                 <p className="text-sm text-[var(--text-sub)] truncate">{place.address}</p>
              )}
            </div>
          </div>
          
          {!isEditingThis && (
            <button 
              onClick={() => startEditing(place)}
              className="text-[var(--text-sub)] hover:text-[var(--primary)] p-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {isEditingThis && (
          <div className="mt-2 flex gap-2 animate-fade-in">
            <Input 
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              placeholder="Enter address"
              autoFocus
            />
            <button 
              onClick={() => saveEdit(place.id)}
              disabled={loading}
              className="px-4 bg-[var(--primary)] text-[var(--text-inverse)] rounded-xl hover:opacity-90 transition-opacity"
            >
              ✓
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 pt-12 pb-24 h-full min-h-screen transition-colors duration-300 w-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--text-main)]">Saved Places 🌟</h1>
            <button 
            onClick={() => setIsAdding(!isAdding)}
            className="p-2 bg-[var(--primary)] text-[var(--text-inverse)] rounded-full hover:bg-[var(--primary-hover)] transition-colors shadow-lg"
            >
            <svg className={`w-6 h-6 transition-transform ${isAdding ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            </button>
        </div>

        {isAdding && (
            <div className="bg-[var(--bg-card)] p-4 rounded-2xl shadow-lg mb-6 animate-fade-in border border-[var(--primary)]/20">
            <h3 className="font-semibold text-[var(--text-main)] mb-3">Add New Place</h3>
            <div className="space-y-3">
                <Input 
                placeholder="Name (e.g., Gym)" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                />
                <Input 
                placeholder="Address" 
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                />
                <div className="flex gap-2 pt-2">
                <Button onClick={handleAdd} isLoading={loading} className="py-2 text-sm">Save Place</Button>
                <Button variant="secondary" onClick={() => setIsAdding(false)} className="py-2 text-sm">Cancel</Button>
                </div>
            </div>
            </div>
        )}

        <div className="space-y-4">
            {/* Render Home and Work first */}
            {homePlace && renderPlaceCard(homePlace)}
            {workPlace && renderPlaceCard(workPlace)}
            
            <div className="h-px bg-[var(--text-sub)] opacity-20 my-4"></div>

            {otherPlaces.length === 0 && !isAdding && (
            <div className="text-center py-8 opacity-50 text-[var(--text-sub)]">
                <p>Add more favorite spots!</p>
            </div>
            )}

            {otherPlaces.map(renderPlaceCard)}
        </div>
      </div>
    </div>
  );
};

export default FavoritesPage;