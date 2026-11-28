import { Destination } from '../types';
import { INDIA_DESTINATIONS } from './destinationsIndia';
import { INTERNATIONAL_DESTINATIONS } from './destinationsInternational';

// Combine India and Worldwide international destinations into one unified database
export const ALL_DESTINATIONS: Destination[] = [
  ...INDIA_DESTINATIONS,
  ...INTERNATIONAL_DESTINATIONS,
];

// Helper to extract unique countries
export function getUniqueCountries(destinations: Destination[] = ALL_DESTINATIONS): string[] {
  const set = new Set<string>();
  destinations.forEach((d) => {
    if (d.country) set.add(d.country);
  });
  return Array.from(set).sort();
}

// Helper to extract unique states for a given country (or all)
export function getUniqueStates(country?: string, destinations: Destination[] = ALL_DESTINATIONS): string[] {
  const set = new Set<string>();
  destinations.forEach((d) => {
    if (!country || country === 'ALL' || d.country === country) {
      if (d.state) set.add(d.state);
    }
  });
  return Array.from(set).sort();
}

// Helper to extract unique cities
export function getUniqueCities(country?: string, state?: string, destinations: Destination[] = ALL_DESTINATIONS): string[] {
  const set = new Set<string>();
  destinations.forEach((d) => {
    const matchCountry = !country || country === 'ALL' || d.country === country;
    const matchState = !state || state === 'ALL' || d.state === state;
    if (matchCountry && matchState && d.city) {
      // Clean city name (e.g., "Paris", "New Delhi", "Tokyo")
      const primaryCity = d.city.split(',')[0].trim();
      set.add(primaryCity);
    }
  });
  return Array.from(set).sort();
}

// Helper to extract unique attraction types
export function getUniqueAttractionTypes(destinations: Destination[] = ALL_DESTINATIONS): string[] {
  const set = new Set<string>();
  destinations.forEach((d) => {
    if (d.attractionType) set.add(d.attractionType);
  });
  return Array.from(set).sort();
}

// Popular sample searches requested in requirements
export const POPULAR_SEARCH_PRESETS = [
  { label: 'Konark', query: 'Konark', desc: 'Konark Sun Temple, Odisha' },
  { label: 'Delhi', query: 'Delhi', desc: 'India Gate, Red Fort, Qutub Minar, Lotus Temple' },
  { label: 'Paris', query: 'Paris', desc: 'Eiffel Tower, Louvre Museum, Arc de Triomphe' },
  { label: 'Dubai', query: 'Dubai', desc: 'Burj Khalifa, Dubai Mall, Palm Jumeirah' },
  { label: 'Japan', query: 'Japan', desc: 'Tokyo, Kyoto, Mount Fuji, Osaka' },
  { label: 'Odisha', query: 'Odisha', desc: 'Konark, Puri Jagannath, Sea Beach' },
  { label: 'Taj Mahal', query: 'Taj Mahal', desc: 'Agra, Uttar Pradesh' },
  { label: 'Rome', query: 'Rome', desc: 'Colosseum, Vatican Museums' },
  { label: 'Golden Temple', query: 'Golden Temple', desc: 'Amritsar, Punjab' },
  { label: 'Singapore', query: 'Singapore', desc: 'Gardens by the Bay, Marina Bay' },
];
