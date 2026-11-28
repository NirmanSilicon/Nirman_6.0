import React, { useState, useEffect, useRef } from 'react';
import { Hotel, RoomOption, HotelBooking, HotelAutocompleteSuggestion, PropertyType } from '../../types';
import { ALL_VERIFIED_HOTELS, searchWorldwideAccommodations, getHotelAutocompleteSuggestions } from '../../utils/worldwideHotelEngine';
import { HotelCard } from './HotelCard';
import { HotelDetailModal } from './HotelDetailModal';
import { BookingModal } from './BookingModal';
import { HotelMapExplorer } from './HotelMapExplorer';
import { CurrencyCode, CURRENCIES, convertPrice, formatCurrency } from '../../utils/currency';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Home,
  Waves,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  MapPin,
  CalendarCheck,
  Sparkles,
  Bed,
  Layers,
  Map as MapIcon,
  Grid,
  Columns,
  RefreshCw,
  Coins,
  Compass,
  X,
  ChevronRight,
  Globe2,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface HotelDirectoryProps {
  onNavigateToTrips?: () => void;
}

export const HotelDirectory: React.FC<HotelDirectoryProps> = ({ onNavigateToTrips }) => {
  const { isAuthenticated, openAuthPrompt } = useAuth();
  const [hotels, setHotels] = useState<Hotel[]>(ALL_VERIFIED_HOTELS);
  const [totalResults, setTotalResults] = useState<number>(ALL_VERIFIED_HOTELS.length);
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // View Mode: 'GRID' | 'MAP' | 'SPLIT'
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP' | 'SPLIT'>('GRID');

  // Currency State (default Indian Rupee)
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('INR');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<HotelAutocompleteSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsBoxRef = useRef<HTMLDivElement>(null);

  // Dynamic price bounds based on selected currency
  const getPriceRange = (curr: CurrencyCode) => {
    switch (curr) {
      case 'INR':
        return { min: 1000, max: 40000, step: 500, defaultVal: 30000 };
      case 'USD':
        return { min: 20, max: 600, step: 10, defaultVal: 500 };
      case 'EUR':
        return { min: 20, max: 550, step: 10, defaultVal: 450 };
      case 'GBP':
        return { min: 15, max: 500, step: 10, defaultVal: 400 };
    }
  };

  const currentPriceRange = getPriceRange(selectedCurrency);
  const [maxPrice, setMaxPrice] = useState<number>(currentPriceRange.defaultVal);
  const [sortBy, setSortBy] = useState<'SCORE' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING'>('SCORE');

  // Update max price when currency changes
  useEffect(() => {
    const range = getPriceRange(selectedCurrency);
    setMaxPrice(range.defaultVal);
  }, [selectedCurrency]);

  // Accessibility Checkbox Filters
  const [filterWheelchair, setFilterWheelchair] = useState(false);
  const [filterRollInShower, setFilterRollInShower] = useState(false);
  const [filterElevator, setFilterElevator] = useState(false);
  const [filterRamp, setFilterRamp] = useState(false);
  const [filterParking, setFilterParking] = useState(false);
  const [filterTransit, setFilterTransit] = useState(false);
  const [filterPoolHoist, setFilterPoolHoist] = useState(false);
  const [filterServiceAnimal, setFilterServiceAnimal] = useState(false);
  const [filterGroundFloor, setFilterGroundFloor] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Active Modals & Selected Hotel
  const [inspectingHotel, setInspectingHotel] = useState<Hotel | null>(null);
  const [selectedMapHotel, setSelectedMapHotel] = useState<Hotel | null>(null);
  const [bookingHotel, setBookingHotel] = useState<Hotel | null>(null);
  const [bookingRoom, setBookingRoom] = useState<RoomOption | null>(null);

  // Handle Autocomplete Input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0) {
      const items = getHotelAutocompleteSuggestions(val);
      setSuggestions(items);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        suggestionsBoxRef.current &&
        !suggestionsBoxRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch worldwide accommodations via backend API & unified engine
  const executeSearch = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('query', searchQuery);
      if (selectedPropertyType !== 'ALL') queryParams.append('propertyType', selectedPropertyType);
      if (selectedCity !== 'ALL') queryParams.append('city', selectedCity);
      if (selectedCountry !== 'ALL') queryParams.append('country', selectedCountry);
      if (filterWheelchair) queryParams.append('wheelchair', 'true');
      if (filterRollInShower) queryParams.append('bathroom', 'true');
      if (filterElevator) queryParams.append('elevator', 'true');
      if (filterRamp) queryParams.append('ramp', 'true');
      if (filterParking) queryParams.append('parking', 'true');
      if (filterTransit) queryParams.append('transit', 'true');
      if (filterPoolHoist) queryParams.append('poolHoist', 'true');
      if (filterServiceAnimal) queryParams.append('serviceAnimal', 'true');
      if (filterGroundFloor) queryParams.append('groundFloor', 'true');

      const [searchRes, bookingsRes] = await Promise.all([
        fetch(getApiEndpoint(`${API_ENDPOINTS.HOTELS_SEARCH}?${queryParams.toString()}`)),
        fetch(getApiEndpoint(API_ENDPOINTS.BOOKINGS)),
      ]);

      if (searchRes.ok) {
        const data = await searchRes.json();
        setHotels(data.results || []);
        setTotalResults(data.total || 0);
      } else {
        // Fallback to client-side engine
        const fallback = await searchWorldwideAccommodations({
          query: searchQuery,
          propertyType: selectedPropertyType,
          city: selectedCity,
          country: selectedCountry,
          wheelchairOnly: filterWheelchair,
          bathroomOnly: filterRollInShower,
          elevatorOnly: filterElevator,
          rampOnly: filterRamp,
          parkingOnly: filterParking,
          transitOnly: filterTransit,
        });
        setHotels(fallback.results);
        setTotalResults(fallback.total);
      }

      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setBookings(bData);
      }
    } catch (e) {
      console.warn('Fallback accommodation search:', e);
      const fallback = await searchWorldwideAccommodations({
        query: searchQuery,
        propertyType: selectedPropertyType,
        city: selectedCity,
        country: selectedCountry,
        wheelchairOnly: filterWheelchair,
      });
      setHotels(fallback.results);
      setTotalResults(fallback.total);
    } finally {
      setIsLoading(false);
    }
  };

  // Run search when filters change
  useEffect(() => {
    executeSearch();
  }, [
    selectedPropertyType,
    selectedCity,
    selectedCountry,
    filterWheelchair,
    filterRollInShower,
    filterElevator,
    filterRamp,
    filterParking,
    filterTransit,
    filterPoolHoist,
    filterServiceAnimal,
    filterGroundFloor,
  ]);

  // Handle Search Submission
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    executeSearch();
  };

  // Handle Selecting a suggestion
  const handleSelectSuggestion = (s: HotelAutocompleteSuggestion) => {
    setSearchQuery(s.query);
    setShowSuggestions(false);
    if (s.city) setSelectedCity(s.city);
    if (s.country) setSelectedCountry(s.country);
    if (s.propertyType) setSelectedPropertyType(s.propertyType);
    if (s.coordinates) {
      // Focus map
      const found = hotels.find((h) => h.id === s.id.replace('prop-', ''));
      if (found) setSelectedMapHotel(found);
    }
    setTimeout(() => {
      executeSearch();
    }, 50);
  };

  // Client-side filtering & sorting converted to active currency
  const filteredHotels = hotels
    .filter((h) => {
      const priceInSelectedCurrency = convertPrice(
        h.pricePerNightStarting,
        h.currency || 'INR',
        selectedCurrency
      );
      return priceInSelectedCurrency <= maxPrice;
    })
    .sort((a, b) => {
      if (sortBy === 'SCORE') {
        return b.accessibility.overallScore - a.accessibility.overallScore;
      }
      if (sortBy === 'PRICE_ASC') {
        const priceA = convertPrice(a.pricePerNightStarting, a.currency || 'INR', selectedCurrency);
        const priceB = convertPrice(b.pricePerNightStarting, b.currency || 'INR', selectedCurrency);
        return priceA - priceB;
      }
      if (sortBy === 'PRICE_DESC') {
        const priceA = convertPrice(a.pricePerNightStarting, a.currency || 'INR', selectedCurrency);
        const priceB = convertPrice(b.pricePerNightStarting, b.currency || 'INR', selectedCurrency);
        return priceB - priceA;
      }
      if (sortBy === 'RATING') {
        return (b.averageRating || 0) - (a.averageRating || 0);
      }
      return 0;
    });

  const handleBookingConfirmed = (newBooking: HotelBooking) => {
    setBookings((prev) => [newBooking, ...prev]);
  };

  const activeConfirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED');

  return (
    <div className="space-y-6">
      {/* Top Banner & Global Search Scope Notification */}
      <div className="p-6 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-950 text-white rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-4xl space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-blue-500/30 text-blue-200 rounded-full text-xs font-bold border border-blue-400/40 flex items-center gap-1.5 backdrop-blur-xs">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Worldwide Accommodations & Guest Houses</span>
            </span>
            <span className="px-3 py-1 bg-emerald-500/30 text-emerald-300 rounded-full text-xs font-bold border border-emerald-400/40 flex items-center gap-1.5 backdrop-blur-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Universal Accessibility Audited</span>
            </span>
            <span className="px-3 py-1 bg-amber-500/30 text-amber-200 rounded-full text-xs font-bold border border-amber-400/40 flex items-center gap-1.5 backdrop-blur-xs">
              <span>{CURRENCIES[selectedCurrency].symbol} Multi-Currency Ready</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight">
            Worldwide Accessible Hotels & Guest Houses
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Search thousands of hotels, guest houses, hostels, resorts, and homestays across every country in the world — with certified door widths, step-free access, roll-in showers, and map visualization.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Active User Reservations Alert if any */}
      {activeConfirmedBookings.length > 0 && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                You have {activeConfirmedBookings.length} confirmed accessible reservation
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Next Stay: <strong>{activeConfirmedBookings[0].hotelName}</strong> ({activeConfirmedBookings[0].checkInDate} to {activeConfirmedBookings[0].checkOutDate})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-lg border border-emerald-300 dark:border-emerald-700">
              PIN: {activeConfirmedBookings[0].verificationPin}
            </span>
            <button
              onClick={() => onNavigateToTrips && onNavigateToTrips()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              View Pass
            </button>
          </div>
        </div>
      )}

      {/* Primary Search Bar with Real-Time Autocomplete */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Autocomplete Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="🔍 Search hotels, guest houses, cities, countries, or destinations (e.g., Bhubaneswar, Paris, Taj Mahal, London)..."
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => {
                if (searchQuery.trim().length > 0) {
                  setSuggestions(getHotelAutocompleteSuggestions(searchQuery));
                  setShowSuggestions(true);
                }
              }}
              className="w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Autocomplete Suggestions Dropdown Menu */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsBoxRef}
                className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 flex items-center justify-between">
                  <span>Instant Suggestions</span>
                  <span>Press Enter to Search</span>
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        {s.type === 'CITY' ? (
                          <Building2 className="w-4 h-4" />
                        ) : s.type === 'PROPERTY_TYPE' ? (
                          <Home className="w-4 h-4" />
                        ) : s.type === 'CHAIN' ? (
                          <Sparkles className="w-4 h-4" />
                        ) : (
                          <MapPin className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {s.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search Stays</span>
          </button>

          {/* Currency Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
            <span className="text-[11px] font-bold text-slate-500 px-2 hidden sm:inline flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-blue-500" />
              Currency:
            </span>
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
              const info = CURRENCIES[code];
              const isSelected = selectedCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCurrency(code)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
                  title={`${info.name} (${info.symbol})`}
                >
                  <span>{info.symbol}</span>
                  <span>{code}</span>
                </button>
              );
            })}
          </div>
        </form>

        {/* Quick Location Chips Bar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-400 shrink-0 text-[11px] flex items-center gap-1">
            <Globe2 className="w-3.5 h-3.5 text-blue-500" />
            Top Global Cities:
          </span>
          {[
            { label: 'All Worldwide', city: 'ALL', country: 'ALL' },
            { label: '🏛️ Bhubaneswar & Odisha', city: 'Bhubaneswar', country: 'India' },
            { label: '🌊 Puri Beachfront', city: 'Puri', country: 'India' },
            { label: '🕌 New Delhi', city: 'New Delhi', country: 'India' },
            { label: '🌊 Mumbai Gateway', city: 'Mumbai', country: 'India' },
            { label: '🗼 Paris', city: 'Paris', country: 'France' },
            { label: '💂 London', city: 'London', country: 'United Kingdom' },
            { label: '🏙️ Dubai', city: 'Dubai', country: 'United Arab Emirates' },
            { label: '🌸 Tokyo', city: 'Tokyo', country: 'Japan' },
            { label: '🌴 Singapore', city: 'Singapore', country: 'Singapore' },
            { label: '🗽 New York', city: 'New York', country: 'United States' },
          ].map((loc) => {
            const active = selectedCity === loc.city && selectedCountry === loc.country;
            return (
              <button
                key={loc.label}
                type="button"
                onClick={() => {
                  setSelectedCity(loc.city);
                  setSelectedCountry(loc.country);
                }}
                className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs shrink-0 ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {loc.label}
              </button>
            );
          })}
        </div>

        {/* Property type tabs + View mode selector + Filter toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Property Type Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'All Properties' },
              { id: 'HOTEL', label: '🏨 Hotels' },
              { id: 'GUEST_HOUSE', label: '🏡 Guest Houses' },
              { id: 'RESORT', label: '🌴 Resorts' },
              { id: 'HOSTEL', label: '🛏️ Hostels' },
              { id: 'HOMESTAY', label: '🏯 Homestays & Ryokans' },
              { id: 'VILLA', label: '🏰 Villas' },
              { id: 'MOTEL', label: '🚗 Motels' },
              { id: 'LODGE', label: '🌲 Lodges' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedPropertyType(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedPropertyType === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right Actions: View Mode Switcher & Filter Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'GRID' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MAP')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'MAP' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Interactive Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('SPLIT')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'SPLIT' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Side-by-Side Split View"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                showFiltersPanel
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Accessibility Filters Panel */}
        {showFiltersPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 text-xs animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Max Price Slider */}
              <div>
                <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Max Price / Night</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black">
                    {formatCurrency(maxPrice, selectedCurrency)}
                  </span>
                </div>
                <input
                  type="range"
                  min={currentPriceRange.min}
                  max={currentPriceRange.max}
                  step={currentPriceRange.step}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Sort Accommodations
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="SCORE">Highest Accessibility Score</option>
                  <option value="PRICE_ASC">Price: Low to High</option>
                  <option value="PRICE_DESC">Price: High to Low</option>
                  <option value="RATING">Top Traveler Rating</option>
                </select>
              </div>

              {/* Country Filter */}
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Country
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-semibold"
                >
                  <option value="ALL">All Countries Worldwide</option>
                  <option value="India">India</option>
                  <option value="France">France</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="United States">United States</option>
                  <option value="Japan">Japan</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Italy">Italy</option>
                  <option value="Spain">Spain</option>
                  <option value="Germany">Germany</option>
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPropertyType('ALL');
                    setSelectedCity('ALL');
                    setSelectedCountry('ALL');
                    setMaxPrice(currentPriceRange.defaultVal);
                    setFilterWheelchair(false);
                    setFilterRollInShower(false);
                    setFilterElevator(false);
                    setFilterRamp(false);
                    setFilterParking(false);
                    setFilterTransit(false);
                    setFilterPoolHoist(false);
                    setFilterServiceAnimal(false);
                    setFilterGroundFloor(false);
                    setSearchQuery('');
                  }}
                  className="w-full py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            </div>

            {/* Accessibility Checkbox Toggles */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white block mb-2">
                Filter by Verified Accessibility Features:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterWheelchair}
                    onChange={(e) => setFilterWheelchair(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Wheelchair Accessible</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterRollInShower}
                    onChange={(e) => setFilterRollInShower(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Roll-in Shower / Grab Rails</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterElevator}
                    onChange={(e) => setFilterElevator(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Braille / Audio Lift</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterRamp}
                    onChange={(e) => setFilterRamp(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Zero-Step Ramp</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterParking}
                    onChange={(e) => setFilterParking(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Accessible Parking</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterTransit}
                    onChange={(e) => setFilterTransit(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Step-Free Transit Link</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterServiceAnimal}
                    onChange={(e) => setFilterServiceAnimal(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Service Animals Welcomed</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={filterPoolHoist}
                    onChange={(e) => setFilterPoolHoist(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Pool Chair Hoist</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Results View Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
        <span>
          Found <strong>{filteredHotels.length}</strong> worldwide properties matching your criteria in{' '}
          <strong className="text-blue-600 dark:text-blue-400">
            {CURRENCIES[selectedCurrency].name} ({CURRENCIES[selectedCurrency].symbol})
          </strong>
        </span>
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Universal Accessibility Audits Active</span>
        </span>
      </div>

      {/* Content Rendering based on ViewMode */}
      {viewMode === 'MAP' ? (
        /* Full Map View */
        <div className="space-y-4">
          <HotelMapExplorer
            hotels={filteredHotels}
            selectedHotel={selectedMapHotel}
            displayCurrency={selectedCurrency}
            onSelectHotel={(h) => {
              setSelectedMapHotel(h);
              setInspectingHotel(h);
            }}
            onBookHotel={(h) => {
              if (!isAuthenticated) {
                openAuthPrompt('Please sign in or register to book your stay.', 'REGISTER');
                return;
              }
              setBookingHotel(h);
              setBookingRoom(h.rooms[0]);
            }}
          />
        </div>
      ) : viewMode === 'SPLIT' ? (
        /* Split Screen: Map on Left, List on Right */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 sticky top-20">
            <HotelMapExplorer
              hotels={filteredHotels}
              selectedHotel={selectedMapHotel}
              displayCurrency={selectedCurrency}
              onSelectHotel={(h) => {
                setSelectedMapHotel(h);
                setInspectingHotel(h);
              }}
              onBookHotel={(h) => {
                if (!isAuthenticated) {
                  openAuthPrompt('Please sign in or register to book your stay.', 'REGISTER');
                  return;
                }
                setBookingHotel(h);
                setBookingRoom(h.rooms[0]);
              }}
            />
          </div>

          <div className="lg:col-span-6 space-y-4 max-h-[780px] overflow-y-auto pr-1">
            {filteredHotels.length > 0 ? (
              filteredHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  displayCurrency={selectedCurrency}
                  onSelect={(h) => {
                    setSelectedMapHotel(h);
                    setInspectingHotel(h);
                  }}
                  onBookNow={(h) => {
                    if (!isAuthenticated) {
                      openAuthPrompt('Please sign in or register to book your stay.', 'REGISTER');
                      return;
                    }
                    setBookingHotel(h);
                    setBookingRoom(h.rooms[0]);
                  }}
                />
              ))
            ) : (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500">No accommodations found for current filter.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standard Grid View */
        <div className="space-y-4">
          {filteredHotels.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  displayCurrency={selectedCurrency}
                  onSelect={(h) => setInspectingHotel(h)}
                  onBookNow={(h) => {
                    if (!isAuthenticated) {
                      openAuthPrompt(
                        'Please sign in or register to book your stay and reserve accessible rooms.',
                        'REGISTER'
                      );
                      return;
                    }
                    setBookingHotel(h);
                    setBookingRoom(h.rooms[0]);
                  }}
                />
              ))}
            </div>
          ) : (
            /* No Results Found State */
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No accommodations found for "{searchQuery || 'your criteria'}"
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                We search authentic OpenStreetMap international accommodation records and verified accessibility registries. Try searching a major city (e.g. Bhubaneswar, Paris, London, Tokyo) or resetting filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedPropertyType('ALL');
                  setSelectedCity('ALL');
                  setSelectedCountry('ALL');
                  setMaxPrice(currentPriceRange.defaultVal);
                  setSearchQuery('');
                  setFilterWheelchair(false);
                  setFilterRollInShower(false);
                  setFilterElevator(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Reset Search Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Inspection Modal */}
      <HotelDetailModal
        hotel={inspectingHotel}
        displayCurrency={selectedCurrency}
        isOpen={!!inspectingHotel}
        onClose={() => setInspectingHotel(null)}
        onBookRoom={(h, room) => {
          if (!isAuthenticated) {
            setInspectingHotel(null);
            openAuthPrompt(
              'Please sign in or register to book your stay and reserve accessible rooms.',
              'REGISTER'
            );
            return;
          }
          setBookingHotel(h);
          setBookingRoom(room);
        }}
      />

      {/* Booking Form & Pass Modal */}
      <BookingModal
        hotel={bookingHotel}
        selectedRoom={bookingRoom}
        displayCurrency={selectedCurrency}
        isOpen={!!bookingHotel}
        onClose={() => setBookingHotel(null)}
        onBookingConfirmed={handleBookingConfirmed}
      />
    </div>
  );
};
