
import React, { useState, useEffect, useRef } from 'react';
import Input from '../components/Input';
import L from 'leaflet';

interface MapPageProps {
  noiseLevel: number;
  userSensitivity: number;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

const MapPage: React.FC<MapPageProps> = ({ noiseLevel, userSensitivity }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [routeActive, setRouteActive] = useState(false);
  const [destinationInfo, setDestinationInfo] = useState<{name: string, dist: string} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  
  // Track user position in state for calculations
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // 1. Initialize Map & Geolocation
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default view (fallback)
    const map = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 14);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Custom User Icon
    const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59,130,246,0.6);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
    });

    // Create User Marker (Hidden initially until location found)
    userMarkerRef.current = L.marker([0, 0], { icon: userIcon }).bindPopup("You are here");

    // Add Noisy Zones (Static for demo)
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
        }).addTo(map);
    });

    // Start Real-time Tracking
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocationError(null);
          const { latitude, longitude } = position.coords;
          const newPos: [number, number] = [latitude, longitude];
          
          setUserPos(newPos);

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(newPos);
            if (!map.hasLayer(userMarkerRef.current)) {
              userMarkerRef.current.addTo(map);
              map.setView(newPos, 15); // Fly to user on first fix
            }
          }
        },
        (error) => {
          // Fix: Access error properties explicitly instead of printing the object
          console.error("Error getting location:", error.message);
          
          let msg = "Location unavailable.";
          switch(error.code) {
              case error.PERMISSION_DENIED:
                  msg = "Location permission denied. Please enable it in your browser settings.";
                  break;
              case error.POSITION_UNAVAILABLE:
                  msg = "Location information is unavailable.";
                  break;
              case error.TIMEOUT:
                  msg = "The request to get user location timed out.";
                  break;
          }
          setLocationError(msg);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
        setLocationError("Geolocation is not supported by this browser.");
    }
  }, []);

  // 2. Search Logic (Nominatim API)
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          setSearchResults(data);
        } catch (error) {
          console.error("Search failed:", error);
        }
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 1000); // 1 sec debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // 3. Handle Selecting a Place
  const handleSelectPlace = (place: SearchResult) => {
    if (!mapInstanceRef.current || !userPos) {
        alert("Waiting for your location... (Ensure permissions are enabled)");
        return;
    }

    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const destLatLng: [number, number] = [lat, lon];

    // Remove old stuff
    if (destMarkerRef.current) mapInstanceRef.current.removeLayer(destMarkerRef.current);
    if (routeLineRef.current) mapInstanceRef.current.removeLayer(routeLineRef.current);

    // Add Destination Marker
    destMarkerRef.current = L.marker(destLatLng).addTo(mapInstanceRef.current)
      .bindPopup(place.display_name.split(',')[0])
      .openPopup();

    // Draw Line (Simple direct route)
    // In a full app, this would use a routing API (like OSRM)
    const latlngs = [
        userPos,
        destLatLng
    ];
    
    routeLineRef.current = L.polyline(latlngs, {color: '#10b981', weight: 5, opacity: 0.7}).addTo(mapInstanceRef.current);

    // Zoom to fit bounds
    mapInstanceRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });

    // Calculate simulated distance (Haversine roughly)
    const R = 6371; // km
    const dLat = (lat - userPos[0]) * Math.PI / 180;
    const dLon = (lon - userPos[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userPos[0] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km

    setDestinationInfo({
        name: place.display_name.split(',')[0],
        dist: d < 1 ? `${(d * 1000).toFixed(0)} m` : `${d.toFixed(1)} km`
    });

    setRouteActive(true);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current && userPos) {
      mapInstanceRef.current.setView(userPos, 16, { animate: true });
    } else {
        alert("Location not found yet.");
    }
  };

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
          />
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          
          {/* Loading Spinner */}
          {searchQuery.length > 2 && isSearching && searchResults.length === 0 && (
             <div className="absolute right-4 top-3.5">
                <div className="animate-spin h-5 w-5 border-2 border-[var(--primary)] border-t-transparent rounded-full"></div>
             </div>
          )}
        </div>

        {/* Location Error Banner */}
        {locationError && (
            <div className="max-w-md mx-auto mt-2 pointer-events-auto bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-sm font-medium">{locationError}</span>
                <button onClick={() => setLocationError(null)} className="text-red-500 hover:text-red-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        )}
        
        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white rounded-xl shadow-xl overflow-hidden pointer-events-auto max-w-md mx-auto max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
                <div 
                    key={result.place_id}
                    onClick={() => handleSelectPlace(result)}
                    className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0"
                >
                <span className="p-2 bg-gray-100 rounded-full flex-shrink-0">📍</span>
                <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{result.display_name.split(',')[0]}</p>
                    <p className="text-xs text-gray-500 truncate">{result.display_name}</p>
                </div>
                </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Route Card */}
      {routeActive && destinationInfo && (
          <div className="absolute bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-[var(--bg-card)] p-4 rounded-2xl shadow-xl z-[400] border border-[var(--primary)]/20 animate-slide-up">
            <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                    <h3 className="font-bold text-[var(--text-main)] text-lg">To: {destinationInfo.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">DIRECT</span>
                    <span className="text-sm text-[var(--text-sub)]">{destinationInfo.dist} (Straight line)</span>
                    </div>
                </div>
                <div className="text-right">
                    <button 
                        onClick={() => setRouteActive(false)}
                        className="block px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold shadow-md hover:bg-[var(--primary-hover)]"
                    >
                        End
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* Map Controls */}
      <div className="absolute right-4 bottom-32 md:bottom-48 z-[400] flex flex-col gap-3">
        <button 
            onClick={handleRecenter}
            className="p-3 bg-white rounded-full shadow-lg text-gray-600 hover:text-emerald-600 transition-colors"
            title="Recenter on me"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
