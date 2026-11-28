import { Destination } from '../types';

export interface SearchSuggestion {
  id: string;
  type: 'DESTINATION' | 'CITY' | 'STATE' | 'COUNTRY' | 'CATEGORY';
  title: string;
  subtitle: string;
  query: string;
  destination?: Destination;
  badge?: string;
  score?: number;
  imageUrl?: string;
}

export interface DestinationFilterOptions {
  searchQuery: string;
  country: string; // 'ALL' | specific country
  state: string; // 'ALL' | specific state
  city: string; // 'ALL' | specific city
  category: string; // 'ALL' | 'HERITAGE' | 'MUSEUM' | 'RELIGIOUS' | 'PARK' | 'TRANSPORT_HUB'
  attractionType: string; // 'ALL' | specific
  minScore: number; // 0, 75, 90, 95
  wheelchairOnly: boolean;
  accessibleToiletOnly: boolean;
  accessibleParkingOnly: boolean;
  accessibleTransitOnly: boolean;
  zeroStairsOnly: boolean;
  rampOnly: boolean;
  sortBy: 'SCORE_DESC' | 'NAME_ASC' | 'POPULARITY' | 'CROWD_LOW';
}

export const DEFAULT_FILTERS: DestinationFilterOptions = {
  searchQuery: '',
  country: 'ALL',
  state: 'ALL',
  city: 'ALL',
  category: 'ALL',
  attractionType: 'ALL',
  minScore: 0,
  wheelchairOnly: false,
  accessibleToiletOnly: false,
  accessibleParkingOnly: false,
  accessibleTransitOnly: false,
  zeroStairsOnly: false,
  rampOnly: false,
  sortBy: 'SCORE_DESC',
};

// Normalize text for flexible searching (case-insensitive, strips punctuation)
export function normalizeSearchString(text: string = ''): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a destination matches a free-text search query
 */
export function matchesDestinationSearch(destination: Destination, query: string): boolean {
  if (!query || query.trim() === '') return true;

  const normalizedQuery = normalizeSearchString(query);
  const queryTokens = normalizedQuery.split(' ').filter((t) => t.length > 0);

  // Searchable text corpus for the destination
  const corpus = [
    destination.name,
    destination.localName || '',
    destination.city,
    destination.state || '',
    destination.country,
    destination.continent || '',
    destination.category,
    destination.attractionType || '',
    destination.address,
    ...(destination.tags || []),
    destination.facilities.pathSurface || '',
    destination.facilities.accessibilityNotes || '',
    destination.description,
  ]
    .map(normalizeSearchString)
    .join(' ');

  // Direct substring match
  if (corpus.includes(normalizedQuery)) return true;

  // Multi-token match (all tokens or key token in corpus)
  return queryTokens.every((token) => corpus.includes(token));
}

/**
 * Generate autocomplete suggestions based on current input text
 */
export function getAutocompleteSuggestions(
  query: string,
  destinations: Destination[],
  maxResults: number = 8
): SearchSuggestion[] {
  if (!query || query.trim().length < 1) {
    return [];
  }

  const normalizedQuery = normalizeSearchString(query);
  const suggestions: SearchSuggestion[] = [];
  const addedIds = new Set<string>();

  // 1. Direct Destination Matches
  destinations.forEach((dest) => {
    const normName = normalizeSearchString(dest.name);
    const normLocal = normalizeSearchString(dest.localName || '');
    const normCity = normalizeSearchString(dest.city);
    const normState = normalizeSearchString(dest.state || '');
    const normCountry = normalizeSearchString(dest.country);
    const normTags = (dest.tags || []).map(normalizeSearchString);

    const isNameMatch = normName.includes(normalizedQuery) || normLocal.includes(normalizedQuery);
    const isTagMatch = normTags.some((t) => t.includes(normalizedQuery));
    const isLocationMatch = normCity.includes(normalizedQuery) || normState.includes(normalizedQuery) || normCountry.includes(normalizedQuery);

    if (isNameMatch || isTagMatch || isLocationMatch) {
      if (!addedIds.has(dest.id)) {
        addedIds.add(dest.id);
        suggestions.push({
          id: dest.id,
          type: 'DESTINATION',
          title: dest.name,
          subtitle: `${dest.city}, ${dest.country}`,
          query: dest.name,
          destination: dest,
          badge: `${dest.accessibilityScore.overall}% Score`,
          score: dest.accessibilityScore.overall,
          imageUrl: dest.imageUrl,
        });
      }
    }
  });

  // 2. City Matches
  const cityMap = new Map<string, { country: string; count: number; sampleImage: string }>();
  destinations.forEach((d) => {
    const primaryCity = d.city.split(',')[0].trim();
    if (normalizeSearchString(primaryCity).includes(normalizedQuery)) {
      const existing = cityMap.get(primaryCity);
      if (!existing) {
        cityMap.set(primaryCity, { country: d.country, count: 1, sampleImage: d.imageUrl });
      } else {
        existing.count += 1;
      }
    }
  });

  cityMap.forEach((val, cityName) => {
    const cityKey = `city-${cityName.toLowerCase()}`;
    if (!addedIds.has(cityKey) && suggestions.length < maxResults + 4) {
      addedIds.add(cityKey);
      suggestions.push({
        id: cityKey,
        type: 'CITY',
        title: cityName,
        subtitle: `${val.country} (${val.count} accessible sights)`,
        query: cityName,
        badge: 'City',
        imageUrl: val.sampleImage,
      });
    }
  });

  // 3. Country / State Matches
  const countryMap = new Map<string, { count: number; sampleImage: string }>();
  destinations.forEach((d) => {
    if (normalizeSearchString(d.country).includes(normalizedQuery)) {
      const existing = countryMap.get(d.country);
      if (!existing) {
        countryMap.set(d.country, { count: 1, sampleImage: d.imageUrl });
      } else {
        existing.count += 1;
      }
    }
  });

  countryMap.forEach((val, countryName) => {
    const countryKey = `country-${countryName.toLowerCase()}`;
    if (!addedIds.has(countryKey) && suggestions.length < maxResults + 6) {
      addedIds.add(countryKey);
      suggestions.push({
        id: countryKey,
        type: 'COUNTRY',
        title: countryName,
        subtitle: `Worldwide Destination (${val.count} accessible places)`,
        query: countryName,
        badge: 'Country',
        imageUrl: val.sampleImage,
      });
    }
  });

  return suggestions.slice(0, maxResults);
}

/**
 * Filter and sort destinations database
 */
export function filterDestinations(
  destinations: Destination[],
  filters: DestinationFilterOptions
): Destination[] {
  return destinations
    .filter((d) => {
      // 1. Text Search
      if (!matchesDestinationSearch(d, filters.searchQuery)) {
        return false;
      }

      // 2. Country Filter
      if (filters.country !== 'ALL' && d.country !== filters.country) {
        return false;
      }

      // 3. State Filter
      if (filters.state !== 'ALL' && d.state !== filters.state) {
        return false;
      }

      // 4. City Filter
      if (filters.city !== 'ALL') {
        const primaryCity = d.city.split(',')[0].trim();
        if (!primaryCity.toLowerCase().includes(filters.city.toLowerCase())) {
          return false;
        }
      }

      // 5. Category Filter
      if (filters.category !== 'ALL' && d.category !== filters.category) {
        return false;
      }

      // 6. Attraction Type Filter
      if (filters.attractionType !== 'ALL' && d.attractionType !== filters.attractionType) {
        return false;
      }

      // 7. Minimum Score
      if (filters.minScore > 0 && d.accessibilityScore.overall < filters.minScore) {
        return false;
      }

      // 8. Specific Facility Requirements
      if (filters.wheelchairOnly && !d.facilities.wheelchairEntrance) {
        return false;
      }
      if (filters.accessibleToiletOnly && !d.facilities.accessibleToilet) {
        return false;
      }
      if (filters.accessibleParkingOnly && !d.facilities.accessibleParking) {
        return false;
      }
      if (filters.accessibleTransitOnly && !d.facilities.accessiblePublicTransport) {
        return false;
      }
      if (filters.zeroStairsOnly && d.facilities.stairs) {
        return false;
      }
      if (filters.rampOnly && !d.facilities.ramp) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'SCORE_DESC') {
        return b.accessibilityScore.overall - a.accessibilityScore.overall;
      }
      if (filters.sortBy === 'NAME_ASC') {
        return a.name.localeCompare(b.name);
      }
      if (filters.sortBy === 'CROWD_LOW') {
        return a.crowd.occupancyPercent - b.crowd.occupancyPercent;
      }
      return 0;
    });
}
