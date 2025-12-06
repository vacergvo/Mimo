import React, { useState, useEffect, useRef } from 'react';
import Input from '../components/Input';
import L from 'leaflet';

interface MapPageProps {
  noiseLevel: number;
  userSensitivity: number;
}

const MapPage: React.FC<MapPageProps> = ({ noiseLevel, userSensitivity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [routeActive, setRouteActive] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center (New Yorkish for demo)
    const map = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 14);
    mapInstanceRef.current = map;

    // Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Custom Icon
    const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    // Add User Marker
    L.marker([40.7128, -74.0060], { icon: userIcon }).addTo(map)
      .bindPopup("You are here")
      .openPopup();

    // Add Noisy Zones (Simulated Red Circles)
    const noisyZones = [
        { lat: 40.715, lng: -74.008, rad: 300 },
        { lat: 40.711, lng: -74.002, rad: 200 }
    ];

    noisyZones.forEach(zone => {
        L.circle([zone.lat, zone.lng], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.2,
            radius: zone.rad,
            stroke: false
        }).addTo(map).bindPopup(`High Noise Area (>80dB)`);
    });

    // Click to simulate route
    map.on('click', () => {
        setRouteActive(true);
    });

    // Force resize calculation after render
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-200 overflow-hidden">
      {/* Search Bar Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 z-[400] pt-4 md:pt-4 bg-gradient-to-b from-white/90 to-transparent pointer-events-none">
        <div className="relative shadow-lg rounded-xl pointer-events-auto max-w-md mx-auto">
          <Input 
            placeholder="Search destination..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-3 border-none shadow-sm"
            onFocus={() => setIsSearching(true)}
            onBlur={() => setTimeout(() => setIsSearching(false), 200)}
          />
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {isSearching && (
          <div className="mt-2 bg-white rounded-xl shadow-xl p-2 animate-fade-in pointer-events-auto max-w-md mx-auto">
            <div className="p-3 hover:bg-emerald-50 rounded-lg cursor-pointer flex items-center gap-3">
              <span className="p-2 bg-gray-100 rounded-full">🌳</span>
              <div>
                <p className="font-medium text-gray-800">Central Park</p>
                <p className="text-xs text-gray-500">New York, NY</p>
              </div>
            </div>
            <div className="p-3 hover:bg-emerald-50 rounded-lg cursor-pointer flex items-center gap-3">
              <span className="p-2 bg-gray-100 rounded-full">☕</span>
              <div>
                <p className="font-medium text-gray-800">Quiet Cafe</p>
                <p className="text-xs text-gray-500">Main St, Brooklyn</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Route Card (Simulated) */}
      {routeActive && (
          <div className="absolute bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[var(--bg-card)] p-4 rounded-2xl shadow-xl z-[400] border border-[var(--primary)]/20 animate-slide-up">
            <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                    <h3 className="font-bold text-[var(--text-main)] text-lg">Recommended Route</h3>
                    <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">QUIET</span>
                    <span className="text-sm text-[var(--text-sub)]">15 min • 1.2 km</span>
                    </div>
                </div>
                <div className="text-right">
                    <button 
                        onClick={() => setRouteActive(false)}
                        className="block px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold shadow-md hover:bg-[var(--primary-hover)]"
                    >
                        Go
                    </button>
                </div>
            </div>
            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 w-2/3 h-full"></div>
            </div>
            <p className="text-xs text-[var(--text-sub)] mt-2 text-center">Avoids construction on 5th Ave</p>
            </div>
      )}

      {/* Map Controls */}
      <div className="absolute right-4 bottom-32 md:bottom-48 z-[400] flex flex-col gap-3">
        <button className="p-3 bg-white rounded-full shadow-lg text-gray-600 hover:text-emerald-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
        <button className="p-3 bg-white rounded-full shadow-lg text-gray-600 hover:text-emerald-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
        </button>
      </div>

      {/* Live Noise Indicator on Map */}
      <div className="absolute top-24 right-4 z-[400] bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-gray-200 text-xs font-bold flex items-center gap-2">
         <div className={`w-2 h-2 rounded-full ${noiseLevel > userSensitivity ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
         <span>Live: {noiseLevel} dB</span>
      </div>
    </div>
  );
};

export default MapPage;