
import React, { useState, useEffect, useRef } from 'react';
import Input from '../components/Input';
import L from 'leaflet';
import { RouteOption } from '../types';

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
  
  // Routing State
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [destinationName, setDestinationName] = useState<string>('');
  const [locationError, setLocationError] = useState<string | null>(null);

  // Mic Permission State
  const [micStatus, setMicStatus] = useState<'pending' | 'granted' | 'denied'>('pending');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLayersRef = useRef<L.Polyline[]>([]);
  
  // Track user position in state for calculations
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  // 1. Request Microphone Permission
  useEffect(() => {
    const requestMic = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("Media Devices API not supported.");
            setMicStatus('denied');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicStatus('granted');
            // We only need permission to "start" the feature (visualize the simulation).
            // Stop tracks to release the mic and save battery.
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.warn("Microphone permission denied:", err);
            setMicStatus('denied');
        }
    };

    requestMic();
  }, []);

  // 2. Initialize Map & Geolocation
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

    // Add Noisy Zones (Static visualization of "Historical Data")
    const noisyZones = [
        { lat: 40.715, lng: -74.008, rad: 300 },
        { lat: 40.711, lng: -74.002, rad: 200 }
    ];

    noisyZones.forEach(zone => {
        L.circle([zone.lat, zone.lng], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.1,
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

  // 3. Search Logic (Nominatim API)
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
    }, 1000); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // 4. Simulation of Real-Time Street Noise
  // In the future, this useEffect will subscribe to Firestore `onSnapshot` for the active route ID
  useEffect(() => {
    if (routes.length === 0) return;

    const interval = setInterval(() => {
      setRoutes(currentRoutes => {
        return currentRoutes.map(route => {
          // Simulate traffic noise fluctuation
          // "Fast" routes fluctuate more (traffic), "Quiet" routes are stable
          const volatility = route.type === 'fast' ? 5 : 1; 
          const change = Math.floor(Math.random() * (volatility * 2 + 1)) - volatility;
          let newNoise = route.avgNoise + change;
          
          // Clamp values
          if (newNoise < 30) newNoise = 30;
          if (newNoise > 90) newNoise = 90;

          return { ...route, avgNoise: newNoise };
        });
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [routes.length]);

  // 5. Update Map Polylines when routes or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Clear old layers
    routeLayersRef.current.forEach(layer => mapInstanceRef.current?.removeLayer(layer));
    routeLayersRef.current = [];

    routes.forEach(route => {
      const isSelected = route.id === selectedRouteId;
      const opacity = isSelected ? 1 : 0.4;
      const weight = isSelected ? 6 : 4;
      const color = route.type === 'quiet' ? '#10b981' : '#f59e0b'; // Green vs Amber/Orange
      
      // If the route is dangerously loud, turn it red
      const displayColor = route.avgNoise > userSensitivity ? '#ef4444' : color;

      const polyline = L.polyline(route.coordinates, {
        color: displayColor,
        weight: weight,
        opacity: opacity,
        dashArray: isSelected ? undefined : '5, 10'
      }).addTo(mapInstanceRef.current!);

      routeLayersRef.current.push(polyline);
    });

    // Fit bounds to selected route
    if (selectedRouteId) {
        const selected = routes.find(r => r.id === selectedRouteId);
        if (selected && mapInstanceRef.current) {
            mapInstanceRef.current.fitBounds(L.polyline(selected.coordinates).getBounds(), { padding: [50, 50] });
        }
    }

  }, [routes, selectedRouteId, userSensitivity]);


  // Helper: Mock Route Generation
  // Generates coordinate arrays to simulate streets
  const generateMockRoutes = (start: [number, number], end: [number, number], name: string) => {
    // Route 1: Direct (Fast but Noisy)
    const fastCoords: [number, number][] = [start, end]; // Straight line for simplicity in mock
    
    // Route 2: Detour (Quiet)
    // Create a midpoint that is offset to simulate going through side streets
    const midLat = (start[0] + end[0]) / 2;
    const midLng = (start[1] + end[1]) / 2;
    const offset = 0.005; // rough deviation
    const quietCoords: [number, number][] = [
        start,
        [midLat + offset, midLng - offset], // Waypoint
        end
    ];

    const distKm = getDistance(start[0], start[1], end[0], end[1]);

    const fastRoute: RouteOption = {
        id: 'fast_1',
        name: 'Main St',
        type: 'fast',
        distance: `${distKm.toFixed(1)} km`,
        duration: `${(distKm * 3).toFixed(0)} min`, // roughly 20km/h
        avgNoise: 75, // Loud baseline
        coordinates: fastCoords,
        color: '#f59e0b'
    };

    const quietRoute: RouteOption = {
        id: 'quiet_1',
        name: 'Park Ave (Quiet)',
        type: 'quiet',
        distance: `${(distKm * 1.2).toFixed(1)} km`, // 20% longer
        duration: `${(distKm * 4.5).toFixed(0)} min`, // slower
        avgNoise: 45, // Quiet baseline
        coordinates: quietCoords,
        color: '#10b981'
    };

    setRoutes([quietRoute, fastRoute]); // Default to quiet first
    setSelectedRouteId(quietRoute.id);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  };

  const handleSelectPlace = (place: SearchResult) => {
    if (!mapInstanceRef.current || !userPos) {
        alert("Waiting for your location... (Ensure permissions are enabled)");
        return;
    }

    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    const destLatLng: [number, number] = [lat, lon];

    setDestinationName(place.display_name.split(',')[0]);

    // Remove destination marker if exists
    if (destMarkerRef.current) mapInstanceRef.current.removeLayer(destMarkerRef.current);

    // Add Destination Marker
    destMarkerRef.current = L.marker(destLatLng).addTo(mapInstanceRef.current)
      .bindPopup(place.display_name.split(',')[0])
      .openPopup();

    // Generate Routes
    generateMockRoutes(userPos, destLatLng, place.display_name.split(',')[0]);

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

  const handleResetMap = () => {
    // Clear State
    setRoutes([]);
    setSelectedRouteId(null);
    setDestinationName('');
    setSearchQuery('');
    setSearchResults([]);

    // Clear Map Layers
    if (destMarkerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(destMarkerRef.current);
        destMarkerRef.current = null;
    }

    // Polylines are handled by the useEffect dependent on `routes`, 
    // but we can ensure they are cleared here too for safety.
    if (mapInstanceRef.current) {
        routeLayersRef.current.forEach(layer => mapInstanceRef.current?.removeLayer(layer));
        routeLayersRef.current = [];
        
        // Return view to user if possible
        if (userPos) {
            mapInstanceRef.current.setView(userPos, 14, { animate: true });
        }
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

      {/* Route Selection Card */}
      {routes.length > 0 && (
          <div className="absolute bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[var(--bg-card)] p-4 rounded-2xl shadow-xl z-[400] border border-[var(--primary)]/20 animate-slide-up flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <h3 className="font-bold text-[var(--text-main)] text-lg">To: {destinationName}</h3>
                <button 
                    onClick={handleResetMap}
                    className="text-xs text-red-500 hover:underline"
                >
                    Cancel
                </button>
            </div>
            
            <p className="text-xs text-[var(--text-sub)]">Select a route. Noise levels update live.</p>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {routes.map(route => {
                    const isSelected = route.id === selectedRouteId;
                    const isTooLoud = route.avgNoise > userSensitivity;
                    
                    return (
                        <button
                            key={route.id}
                            onClick={() => setSelectedRouteId(route.id)}
                            className={`
                                relative flex items-center justify-between p-3 rounded-xl border-2 transition-all
                                ${isSelected ? 'border-[var(--primary)] bg-[var(--bg-input)]' : 'border-transparent hover:bg-gray-50'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${route.type === 'quiet' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {route.type === 'quiet' ? '🌿' : '⚡'}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm text-[var(--text-main)]">{route.name}</p>
                                    <p className="text-xs text-[var(--text-sub)]">{route.duration} • {route.distance}</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-col items-end">
                                <span className={`text-lg font-bold ${isTooLoud ? 'text-red-500 animate-pulse' : 'text-[var(--text-main)]'}`}>
                                    {route.avgNoise} dB
                                </span>
                                {isTooLoud && <span className="text-[10px] text-red-500 font-bold">LOUD</span>}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="pt-2">
                 <button className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-bold hover:opacity-90 transition-opacity shadow-lg">
                    Start Navigation
                 </button>
            </div>
          </div>
      )}

      {/* Map Controls */}
      <div className="absolute right-4 bottom-32 md:bottom-[28rem] z-[400] flex flex-col gap-3">
        {/* Reset Map Button - Only visible when route is active */}
        {(routes.length > 0 || destinationName) && (
            <button 
                onClick={handleResetMap}
                className="p-3 bg-white rounded-full shadow-lg text-gray-600 hover:text-red-600 transition-colors animate-fade-in"
                title="Reset Map / Clear Route"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        )}

        <button 
            onClick={handleRecenter}
            className="p-3 bg-white rounded-full shadow-lg text-gray-600 hover:text-emerald-600 transition-colors"
            title="Recenter on me"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
      </div>

      {/* Live Noise Indicator on Map - Gated by Permission */}
      <div className="absolute top-24 right-4 z-[400] bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-gray-200 text-xs font-bold flex items-center gap-2">
         {micStatus === 'granted' ? (
             <>
                <div className={`w-2 h-2 rounded-full ${noiseLevel > userSensitivity ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span>Mic: {noiseLevel} dB</span>
             </>
         ) : micStatus === 'denied' ? (
             <>
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span className="text-gray-500">Mic Disabled</span>
             </>
         ) : (
             <>
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <span className="text-gray-500">Connecting...</span>
             </>
         )}
      </div>
    </div>
  );
};

export default MapPage;
