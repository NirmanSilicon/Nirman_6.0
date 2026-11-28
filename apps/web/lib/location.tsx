"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CityLocation {
  id: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  isCurrentLocation?: boolean;
}

export const PRESET_LOCATIONS: CityLocation[] = [
  { id: "delhi", name: "New Delhi", state: "Delhi", latitude: 28.6139, longitude: 77.2090 },
  { id: "bhubaneswar", name: "Bhubaneswar", state: "Odisha", latitude: 20.2961, longitude: 85.8245 },
  { id: "mumbai", name: "Mumbai", state: "Maharashtra", latitude: 19.0760, longitude: 72.8777 },
  { id: "bengaluru", name: "Bengaluru", state: "Karnataka", latitude: 12.9716, longitude: 77.5946 },
  { id: "kolkata", name: "Kolkata", state: "West Bengal", latitude: 22.5726, longitude: 88.3639 },
  { id: "chennai", name: "Chennai", state: "Tamil Nadu", latitude: 13.0827, longitude: 80.2707 },
  { id: "rourkela", name: "Rourkela", state: "Odisha", latitude: 22.2604, longitude: 84.8536 },
];

interface LocationContextType {
  currentLocation: CityLocation;
  setLocation: (loc: CityLocation) => void;
  detectAutoLocation: () => Promise<CityLocation | null>;
  isDetecting: boolean;
  error: string | null;
}

const LocationContext = createContext<LocationContextType | null>(null);

const STORAGE_KEY = "roadguard_selected_location";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentLocation, setCurrentLocation] = useState<CityLocation>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return PRESET_LOCATIONS[0]; // Default New Delhi
  });

  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setLocation = useCallback((loc: CityLocation) => {
    setCurrentLocation(loc);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    }
  }, []);

  const detectAutoLocation = useCallback(async (): Promise<CityLocation | null> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return null;
    }

    setIsDetecting(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let label = "Detected Location";
          let state = "Nearby";

          try {
            // Reverse geocode with OpenStreetMap Nominatim
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
              { headers: { "Accept-Language": "en" } }
            );
            if (res.ok) {
              const data = await res.json();
              label = data.address?.city || data.address?.town || data.address?.suburb || "Detected Location";
              state = data.address?.state || data.address?.country || "Local";
            }
          } catch {
            // Fallback to coordinates
          }

          const detected: CityLocation = {
            id: `detected-${Date.now()}`,
            name: label,
            state: state,
            latitude,
            longitude,
            isCurrentLocation: true,
          };

          setLocation(detected);
          setIsDetecting(false);
          resolve(detected);
        },
        (err) => {
          setIsDetecting(false);
          let msg = "Could not detect location.";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Location permission denied. Please enable location access.";
          } else if (err.code === err.TIMEOUT) {
            msg = "Location request timed out.";
          }
          setError(msg);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    });
  }, [setLocation]);

  // Attempt automatic detection once on first load if no custom location is saved
  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      void detectAutoLocation();
    }
  }, [detectAutoLocation]);

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        setLocation,
        detectAutoLocation,
        isDetecting,
        error,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return ctx;
}
