import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  AccessibilityProfile,
  UserRole,
  NotificationItem,
  RouteOption,
  Destination,
  OfflineSavedJourney,
  PlannedTrip,
} from '../types';
import { syncTripToSupabase } from '../utils/supabase';

interface AccessibilityContextType {
  profile: AccessibilityProfile;
  updateProfile: (updates: Partial<AccessibilityProfile>) => void;
  resetProfile: () => void;
  role: UserRole;
  setRole: (role: UserRole) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  textSize: 'normal' | 'large' | 'xlarge';
  setTextSize: (size: 'normal' | 'large' | 'xlarge') => void;
  dyslexiaFont: boolean;
  setDyslexiaFont: (val: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (val: boolean) => void;
  simpleMode: boolean;
  setSimpleMode: (val: boolean) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isSpeaking: boolean;
  isAudioMuted: boolean;
  setIsAudioMuted: (val: boolean) => void;
  toggleAudioMute: () => void;
  savedJourneys: OfflineSavedJourney[];
  saveJourneyOffline: (destination: Destination, route: RouteOption) => void;
  removeSavedJourney: (id: string) => void;
  plannedTrips: PlannedTrip[];
  savePlannedTrip: (tripData: Omit<PlannedTrip, 'id' | 'createdAt' | 'savedAt'> & { id?: string }) => PlannedTrip;
  updatePlannedTrip: (id: string, updates: Partial<PlannedTrip>) => void;
  removePlannedTrip: (id: string) => void;
  lastSyncTime: string;
}

const DEFAULT_PROFILE: AccessibilityProfile = {
  wheelchairUser: true,
  limitedMobility: false,
  walkingAssistance: false,
  visualAssistance: false,
  hearingAssistance: false,
  cognitiveFriendly: false,
  elderFriendly: false,
  temporaryInjury: false,
  familyWithStroller: false,
  avoidStairs: true,
  maxWalkingDistanceMeters: 500,
  accessibleToiletRequired: true,
  liftPreferred: true,
  crowdPreference: 'LOW',
  assistancePreferred: true,
  audioNavigationEnabled: true,
  largeTextEnabled: false,
  highContrastEnabled: false,
  voiceGuidanceEnabled: true,
  simpleMode: false,
  shareDataWithAuditors: true,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<AccessibilityProfile>(() => {
    const saved = localStorage.getItem('accessway_profile');
    if (saved) {
      try {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_PROFILE;
  });

  const [role, setRole] = useState<UserRole>(() => {
    return (localStorage.getItem('accessway_role') as UserRole) || 'USER';
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('accessway_contrast') === 'true';
  });

  const [textSize, setTextSize] = useState<'normal' | 'large' | 'xlarge'>(() => {
    return (localStorage.getItem('accessway_text_size') as any) || 'normal';
  });

  const [dyslexiaFont, setDyslexiaFont] = useState<boolean>(() => {
    return localStorage.getItem('accessway_dyslexia') === 'true';
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('accessway_reduced_motion') === 'true';
  });

  const [simpleMode, setSimpleMode] = useState<boolean>(() => {
    return localStorage.getItem('accessway_simple_mode') === 'true';
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'VERIFICATION_UPDATE',
      title: 'Konark Sun Temple Facilities Reverified',
      message: 'Wheelchair ramp and accessible sensory path updated by State Accessibility Audit Board.',
      timestamp: '10 mins ago',
      severity: 'SUCCESS',
      read: false,
    },
    {
      id: 'notif-2',
      type: 'BARRIER_ALERT',
      title: 'Temporary Maintenance at Gate 3',
      message: 'Lift under routine service at London King\'s Cross Station. Alternative Step-Free lift operating at Gate 1.',
      timestamp: '25 mins ago',
      severity: 'WARNING',
      read: false,
    },
  ]);

  const [savedJourneys, setSavedJourneys] = useState<OfflineSavedJourney[]>(() => {
    const saved = localStorage.getItem('accessway_offline_journeys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [plannedTrips, setPlannedTrips] = useState<PlannedTrip[]>(() => {
    const saved = localStorage.getItem('accessway_planned_trips');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('accessway_audio_muted');
    return saved === 'true';
  });

  const toggleAudioMute = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      localStorage.setItem('accessway_audio_muted', String(next));
      if (next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      return next;
    });
  };

  useEffect(() => {
    localStorage.setItem('accessway_audio_muted', String(isAudioMuted));
    if (isAudioMuted && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isAudioMuted]);

  // Sync profile changes to localStorage
  const updateProfile = (updates: Partial<AccessibilityProfile>) => {
    setProfile((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('accessway_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const resetProfile = () => {
    setProfile(DEFAULT_PROFILE);
    localStorage.setItem('accessway_profile', JSON.stringify(DEFAULT_PROFILE));
  };

  // Sync visual accessibility classes to DOM
  useEffect(() => {
    localStorage.setItem('accessway_role', role);
  }, [role]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }
    localStorage.setItem('accessway_contrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    document.documentElement.classList.remove('text-size-large', 'text-size-xlarge');
    if (textSize === 'large') {
      document.documentElement.classList.add('text-size-large');
    } else if (textSize === 'xlarge') {
      document.documentElement.classList.add('text-size-xlarge');
    }
    localStorage.setItem('accessway_text_size', textSize);
  }, [textSize]);

  useEffect(() => {
    if (dyslexiaFont) {
      document.body.classList.add('font-dyslexic');
    } else {
      document.body.classList.remove('font-dyslexic');
    }
    localStorage.setItem('accessway_dyslexia', String(dyslexiaFont));
  }, [dyslexiaFont]);

  useEffect(() => {
    if (reducedMotion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
    localStorage.setItem('accessway_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('accessway_simple_mode', String(simpleMode));
  }, [simpleMode]);

  // Notifications
  const addNotification = useCallback((notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    const newItem: NotificationItem = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'Just now',
      read: false,
    };
    setNotifications((prev) => [newItem, ...prev]);
    // Optional voice announcement if audioNavigation is enabled
    if (profile.audioNavigationEnabled && notif.severity === 'CRITICAL' || notif.severity === 'WARNING') {
      speak(`${notif.title}. ${notif.message}`);
    }
  }, [profile.audioNavigationEnabled]);

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Text to Speech
  const speak = (text: string) => {
    if (isAudioMuted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Planned Trips Library Operations
  const savePlannedTrip = (
    tripData: Omit<PlannedTrip, 'id' | 'createdAt' | 'savedAt'> & { id?: string }
  ): PlannedTrip => {
    const tripId = tripData.id || `trip-${Date.now()}`;
    const nowISO = new Date().toISOString();
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newTrip: PlannedTrip = {
      ...tripData,
      id: tripId,
      createdAt: nowISO,
      savedAt: nowTimeStr,
      syncedToSupabase: true,
    };

    setPlannedTrips((prev) => {
      // Deduplicate: check if a trip with matching destinationId, originName, travelDate, and startTime already exists
      const existingIdx = prev.findIndex(
        (t) =>
          t.id === tripId ||
          (t.destinationId === newTrip.destinationId &&
            t.originName === newTrip.originName &&
            t.travelDate === newTrip.travelDate &&
            t.startTime === newTrip.startTime)
      );

      let updatedList: PlannedTrip[];
      if (existingIdx >= 0) {
        updatedList = [...prev];
        updatedList[existingIdx] = { ...prev[existingIdx], ...newTrip, id: prev[existingIdx].id };
      } else {
        updatedList = [newTrip, ...prev];
      }

      localStorage.setItem('accessway_planned_trips', JSON.stringify(updatedList));
      return updatedList;
    });

    // Also update savedJourneys for backward compatibility
    setSavedJourneys((prev) => {
      const legacyJourney: OfflineSavedJourney = {
        id: tripId,
        savedAt: nowTimeStr,
        destination: newTrip.destination,
        selectedRoute: newTrip.selectedRoute,
        notes: newTrip.notes || `Planned trip from ${newTrip.originName} on ${newTrip.travelDate}`,
        userEmail: newTrip.userEmail || 'traveler@accessway.org',
        syncedToSupabase: true,
      };
      const filtered = prev.filter((j) => j.id !== tripId && j.destination.id !== newTrip.destination.id);
      const updated = [legacyJourney, ...filtered];
      localStorage.setItem('accessway_offline_journeys', JSON.stringify(updated));
      return updated;
    });

    setLastSyncTime('Just now');

    // Async sync to server API and Supabase
    fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trip: newTrip, userEmail: newTrip.userEmail || 'traveler@accessway.org' }),
    }).catch((err) => {
      console.warn('[Planned Trips] Server sync background warning:', err);
    });

    return newTrip;
  };

  const updatePlannedTrip = (id: string, updates: Partial<PlannedTrip>) => {
    setPlannedTrips((prev) => {
      const updatedList = prev.map((t) => (t.id === id ? { ...t, ...updates } : t));
      localStorage.setItem('accessway_planned_trips', JSON.stringify(updatedList));
      return updatedList;
    });

    // Sync update to server
    fetch(`/api/trips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch((err) => {
      console.warn('[Planned Trips] Update sync warning:', err);
    });
  };

  const removePlannedTrip = (id: string) => {
    setPlannedTrips((prev) => {
      const updatedList = prev.filter((t) => t.id !== id);
      localStorage.setItem('accessway_planned_trips', JSON.stringify(updatedList));
      return updatedList;
    });

    setSavedJourneys((prev) => {
      const updatedList = prev.filter((j) => j.id !== id);
      localStorage.setItem('accessway_offline_journeys', JSON.stringify(updatedList));
      return updatedList;
    });

    // Delete on server backend
    fetch(`/api/trips/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  // Offline Journeys (Legacy method mapped to Planned Trips)
  const saveJourneyOffline = (destination: Destination, selectedRoute: RouteOption) => {
    savePlannedTrip({
      title: `${destination.name} Accessible Journey`,
      originName: 'My Current Location',
      originCoords: null,
      originMode: 'CURRENT_LOCATION',
      destinationId: destination.id,
      destinationName: destination.name,
      destinationCity: destination.city,
      destinationCountry: destination.country,
      destinationCoords: destination.coordinates,
      destination,
      travelDate: new Date().toLocaleDateString('en-GB'),
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      travelersCount: 1,
      accessibilityScore: destination.accessibilityScore.overall,
      selectedRoute,
      notes: `Offline snapshot with verified accessibility score of ${destination.accessibilityScore.overall}/100.`,
      userEmail: 'traveler@accessway.org',
    });

    addNotification({
      type: 'ROUTE_UPDATE',
      title: `Saved to Planned Trips: ${destination.name}`,
      message: 'Accessible route, step-free navigation, and trip details saved in your Planned Trips library.',
      severity: 'INFO',
    });
  };

  const removeSavedJourney = (id: string) => {
    removePlannedTrip(id);
  };

  // Attempt initial sync with Supabase and backend trips
  useEffect(() => {
    const fetchCloudTrips = async () => {
      try {
        const res = await fetch('/api/trips');
        if (res.ok) {
          const cloudTrips: any[] = await res.json();
          if (cloudTrips && cloudTrips.length > 0) {
            setPlannedTrips((prev) => {
              const mergedMap = new Map<string, PlannedTrip>();
              prev.forEach((t) => mergedMap.set(t.id, t));
              cloudTrips.forEach((t) => {
                const tripItem: PlannedTrip = {
                  id: t.id,
                  title: t.title || `${t.destination?.name || t.destinationName || 'Planned'} Journey`,
                  originName: t.originName || 'My Current Location',
                  originCoords: t.originCoords || null,
                  originMode: t.originMode || 'CURRENT_LOCATION',
                  destinationId: t.destinationId || t.destination?.id,
                  destinationName: t.destinationName || t.destination?.name,
                  destinationCity: t.destinationCity || t.destination?.city,
                  destinationCountry: t.destinationCountry || t.destination?.country,
                  destinationCoords: t.destinationCoords || t.destination?.coordinates || [0, 0],
                  destination: t.destination || {
                    id: t.destinationId,
                    name: t.destinationName,
                    city: t.destinationCity,
                    country: t.destinationCountry,
                    coordinates: t.destinationCoords || [0, 0],
                    accessibilityScore: { overall: t.accessibilityScore || 95 },
                  },
                  travelDate: t.travelDate || new Date(t.createdAt || Date.now()).toLocaleDateString('en-GB'),
                  startTime: t.startTime || '09:00 AM',
                  endTime: t.endTime || '',
                  travelersCount: t.travelersCount || 1,
                  accessibilityScore: t.accessibilityScore || 95,
                  selectedRoute: t.selectedRoute,
                  preferences: t.preferences,
                  notes: t.notes || '',
                  userEmail: t.userEmail,
                  createdAt: t.createdAt || new Date().toISOString(),
                  savedAt: t.savedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  syncedToSupabase: true,
                };
                mergedMap.set(t.id, tripItem);
              });
              const merged = Array.from(mergedMap.values());
              localStorage.setItem('accessway_planned_trips', JSON.stringify(merged));
              return merged;
            });

            setSavedJourneys((prev) => {
              const mergedMap = new Map<string, OfflineSavedJourney>();
              prev.forEach((t) => mergedMap.set(t.id, t));
              cloudTrips.forEach((t) => {
                if (t.destination && t.selectedRoute) {
                  mergedMap.set(t.id, {
                    id: t.id,
                    savedAt: t.savedAt || 'Recently',
                    destination: t.destination,
                    selectedRoute: t.selectedRoute,
                    notes: t.notes || '',
                    userEmail: t.userEmail,
                    syncedToSupabase: true,
                  });
                }
              });
              const merged = Array.from(mergedMap.values());
              localStorage.setItem('accessway_offline_journeys', JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync initial cloud trips:', err);
      }
    };
    fetchCloudTrips();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AccessibilityContext.Provider
      value={{
        profile,
        updateProfile,
        resetProfile,
        role,
        setRole,
        highContrast,
        setHighContrast,
        textSize,
        setTextSize,
        dyslexiaFont,
        setDyslexiaFont,
        reducedMotion,
        setReducedMotion,
        simpleMode,
        setSimpleMode,
        notifications,
        unreadCount,
        addNotification,
        markNotificationRead,
        clearNotifications,
        speak,
        stopSpeaking,
        isSpeaking,
        isAudioMuted,
        setIsAudioMuted,
        toggleAudioMute,
        savedJourneys,
        saveJourneyOffline,
        removeSavedJourney,
        plannedTrips,
        savePlannedTrip,
        updatePlannedTrip,
        removePlannedTrip,
        lastSyncTime,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
