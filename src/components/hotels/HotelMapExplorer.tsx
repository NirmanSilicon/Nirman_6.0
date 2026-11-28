import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Hotel } from '../../types';
import { formatCurrency, convertPrice } from '../../utils/currency';
import { MapPin, Navigation, Maximize2, Sparkles, Building2, Home, Waves, ShieldCheck } from 'lucide-react';

interface HotelMapExplorerProps {
  hotels: Hotel[];
  selectedHotel: Hotel | null;
  displayCurrency?: string;
  onSelectHotel: (hotel: Hotel) => void;
  onBookHotel: (hotel: Hotel) => void;
}

export const HotelMapExplorer: React.FC<HotelMapExplorerProps> = ({
  hotels,
  selectedHotel,
  displayCurrency = 'INR',
  onSelectHotel,
  onBookHotel,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] = [20.2961, 85.8245]; // Default to Bhubaneswar/Odisha, or dynamically fit
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 5,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // High quality CARTO Voyager tiles with clean labels
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when hotels change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    if (hotels.length === 0) return;

    const latLngBounds = L.latLngBounds([]);

    hotels.forEach((hotel) => {
      const [lat, lng] = hotel.coordinates;
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      latLngBounds.extend([lat, lng]);

      const isSelected = selectedHotel?.id === hotel.id;
      const isHighlyAccessible = hotel.accessibilityStatus === 'HIGHLY_ACCESSIBLE' || hotel.accessibility.overallScore >= 80;
      const isPartiallyAccessible = hotel.accessibilityStatus === 'PARTIALLY_ACCESSIBLE' || (hotel.accessibility.overallScore >= 40 && hotel.accessibility.overallScore < 80);

      const pinBg = isHighlyAccessible ? '#059669' : isPartiallyAccessible ? '#d97706' : '#475569';
      const badgeBorder = isSelected ? 'border-4 border-blue-500 scale-125' : 'border-2 border-white';

      const priceConverted = convertPrice(hotel.pricePerNightStarting, hotel.currency || 'INR', displayCurrency);
      const priceText = formatCurrency(priceConverted, displayCurrency);

      const iconHtml = `
        <div class="hotel-marker-container flex flex-col items-center cursor-pointer transition-transform duration-200" style="transform: translate(-50%, -100%);">
          <div class="px-2 py-1 bg-slate-950/90 text-white text-[11px] font-black rounded-lg shadow-xl ${badgeBorder} flex items-center gap-1 backdrop-blur-md" style="background-color: ${pinBg};">
            <span>${hotel.propertyType === 'GUEST_HOUSE' ? '🏡' : hotel.propertyType === 'RESORT' ? '🌴' : hotel.propertyType === 'HOSTEL' ? '🛏️' : '🏨'}</span>
            <span>${priceText}</span>
          </div>
          <div class="w-2 h-2 rotate-45 -mt-1 shadow-md" style="background-color: ${pinBg};"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-hotel-pin',
        html: iconHtml,
        iconSize: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupContent = document.createElement('div');
      popupContent.className = 'hotel-popup-card p-1 max-w-[240px] text-slate-900 font-sans';
      popupContent.innerHTML = `
        <div class="rounded-xl overflow-hidden shadow-sm mb-2 relative">
          <img src="${hotel.imageUrl}" alt="${hotel.name}" class="w-full h-24 object-cover" />
          <span class="absolute top-1.5 right-1.5 px-2 py-0.5 bg-slate-900/80 text-white rounded-full text-[10px] font-bold">
            ${hotel.accessibility.overallScore}% Accessible
          </span>
        </div>
        <div class="font-bold text-xs leading-tight mb-1">${hotel.name}</div>
        <div class="text-[11px] text-slate-500 mb-2">${hotel.city}, ${hotel.country}</div>
        <div class="flex items-center justify-between gap-2 border-t pt-2 border-slate-100">
          <div class="font-black text-xs text-blue-600">${priceText}/night</div>
          <button id="popup-btn-${hotel.id}" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold">
            Details
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 260, offset: [0, -25] });

      marker.on('click', () => {
        onSelectHotel(hotel);
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${hotel.id}`);
        if (btn) {
          btn.onclick = () => onSelectHotel(hotel);
        }
      });

      marker.addTo(markersGroup);
    });

    if (latLngBounds.isValid()) {
      if (selectedHotel) {
        map.flyTo(selectedHotel.coordinates, 14, { duration: 1.2 });
      } else {
        map.fitBounds(latLngBounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [hotels, selectedHotel, displayCurrency]);

  return (
    <div className="relative w-full h-[480px] sm:h-[540px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Map Overlay Legend */}
      <div className="absolute top-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg text-xs space-y-1.5">
        <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Worldwide Accommodations ({hotels.length})</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
            <span>Highly Accessible</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
            <span>Partially Accessible</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span>
            <span>Audit Pending</span>
          </span>
        </div>
      </div>
    </div>
  );
};
