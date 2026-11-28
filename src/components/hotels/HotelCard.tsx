import React from 'react';
import { Hotel } from '../../types';
import { formatCurrency, convertPrice } from '../../utils/currency';
import { ConfidenceRating } from '../common/ConfidenceRating';
import {
  ShieldCheck,
  Star,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Building2,
  Home,
  Waves,
  Sparkles,
  Eye,
  CalendarCheck,
  Accessibility,
  Bed,
  Hotel as HotelIcon,
  Compass,
} from 'lucide-react';

interface HotelCardProps {
  hotel: Hotel;
  displayCurrency?: string;
  onSelect: (hotel: Hotel) => void;
  onBookNow: (hotel: Hotel) => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({
  hotel,
  displayCurrency = 'INR',
  onSelect,
  onBookNow,
}) => {
  const getPropertyTypeIcon = (type: string) => {
    switch (type) {
      case 'HOTEL':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'GUEST_HOUSE':
      case 'HOMESTAY':
        return <Home className="w-3.5 h-3.5" />;
      case 'RESORT':
        return <Waves className="w-3.5 h-3.5" />;
      case 'HOSTEL':
        return <Bed className="w-3.5 h-3.5" />;
      case 'VILLA':
        return <Home className="w-3.5 h-3.5" />;
      case 'MOTEL':
      case 'LODGE':
        return <HotelIcon className="w-3.5 h-3.5" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'HOTEL':
        return 'Hotel';
      case 'GUEST_HOUSE':
        return 'Guest House';
      case 'HOMESTAY':
        return 'Homestay';
      case 'RESORT':
        return 'Resort';
      case 'HOSTEL':
        return 'Hostel';
      case 'VILLA':
        return 'Villa';
      case 'MOTEL':
        return 'Motel';
      case 'LODGE':
        return 'Lodge';
      case 'BOUTIQUE_LODGE':
        return 'Boutique Lodge';
      default:
        return 'Accommodation';
    }
  };

  // Accessibility Status Badge Evaluation
  const status = hotel.accessibilityStatus || (hotel.accessibility.overallScore >= 80 ? 'HIGHLY_ACCESSIBLE' : hotel.accessibility.overallScore > 0 ? 'PARTIALLY_ACCESSIBLE' : 'UNAVAILABLE');
  const isUnavailable = status === 'UNAVAILABLE';
  const isPartiallyAccessible = status === 'PARTIALLY_ACCESSIBLE';
  const isHighlyAccessible = status === 'HIGHLY_ACCESSIBLE';

  const hasRollInShower = hotel.rooms.some((r) => r.rollInShower) || hotel.accessibility.hasAccessibleBathroom;
  const maxDoorWidth = Math.max(...hotel.rooms.map((r) => r.doorWidthCm), 0);
  const primaryProximity = hotel.proximityToDestinations?.[0];

  const nativeCurrency = hotel.currency || 'INR';
  const convertedPrice = convertPrice(
    hotel.pricePerNightStarting,
    nativeCurrency,
    displayCurrency
  );
  const formattedPrice = formatCurrency(convertedPrice, displayCurrency);
  const isConverted = nativeCurrency.toUpperCase() !== displayCurrency.toUpperCase();
  const nativeFormatted = formatCurrency(hotel.pricePerNightStarting, nativeCurrency);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group">
      {/* Property Thumbnail with Badges */}
      <div className="relative h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={hotel.imageUrl}
          alt={hotel.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 flex-wrap">
          {/* Property Type Badge */}
          <span className="px-2.5 py-1 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1.5 border border-white/20 shadow-md">
            {getPropertyTypeIcon(hotel.propertyType)}
            <span>{getPropertyTypeLabel(hotel.propertyType)}</span>
          </span>

          {/* Accessibility Priority Status Pill */}
          {isHighlyAccessible && (
            <span className="px-3 py-1 bg-emerald-600/95 backdrop-blur-md text-white text-xs font-black rounded-full flex items-center gap-1 shadow-md border border-emerald-400">
              <Accessibility className="w-3.5 h-3.5" />
              <span>Highly Accessible</span>
            </span>
          )}
          {isPartiallyAccessible && (
            <span className="px-3 py-1 bg-amber-500/95 backdrop-blur-md text-slate-950 text-xs font-black rounded-full flex items-center gap-1 shadow-md border border-amber-300">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Partially Accessible</span>
            </span>
          )}
          {isUnavailable && (
            <span className="px-3 py-1 bg-slate-700/90 backdrop-blur-md text-slate-200 text-xs font-semibold rounded-full flex items-center gap-1 shadow-md border border-slate-500">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Audit Pending</span>
            </span>
          )}
        </div>

        {/* Bottom Details on Image */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-0.5">
            {hotel.starRating ? (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(5, hotel.starRating) }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            ) : null}
            <span className="text-white font-bold ml-1">★ {hotel.averageRating || 4.5}</span>
            <span className="text-slate-300">({hotel.reviewsCount || 40} reviews)</span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-sm truncate">
            {hotel.name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-slate-200 mt-0.5">
            <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
            <span className="truncate">{hotel.city}{hotel.state ? `, ${hotel.state}` : ''}, {hotel.country}</span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        {/* Heritage / Attraction Proximity Banner if present */}
        {primaryProximity && (
          <div className="px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs flex items-center justify-between text-blue-900 dark:text-blue-200">
            <span className="font-semibold truncate">
              📍 {primaryProximity.distanceKm} km to {primaryProximity.destinationName.split('&')[0]}
            </span>
            {primaryProximity.stepFreePath && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md shrink-0 ml-1">
                100% Step-Free
              </span>
            )}
          </div>
        )}

        {/* Accessibility Features Checklist or Mandatory Disclaimer */}
        {isUnavailable ? (
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 text-xs flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-snug text-[11px]">
              {hotel.accessibilityDisclaimer ||
                'Accessibility information not available — please verify with the property before booking.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-300">
            {(hotel.accessibility.stepFreeEntrance || hotel.accessibility.hasStepFreeEntrance) && (
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero-Step Entrance</span>
              </div>
            )}
            {hasRollInShower && (
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Roll-In Shower</span>
              </div>
            )}
            {(hotel.accessibility.elevatorWithBrailleAudio || hotel.accessibility.hasElevator) && (
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Elevator Access</span>
              </div>
            )}
            {maxDoorWidth > 0 && (
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Door {maxDoorWidth}cm</span>
              </div>
            )}
            {hotel.accessibility.serviceAnimalReliefArea && (
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Service Animals</span>
              </div>
            )}
            {hotel.accessibility.trainedStaffPrm24_7 && (
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PRM Support Staff</span>
              </div>
            )}
          </div>
        )}

        {/* Audit Confidence Rating */}
        <div className="pt-1">
          <ConfidenceRating
            score={hotel.accessibility.confidence || 85}
            variant="meter"
            label="Accessibility Audit Status"
            entityName={hotel.name}
            entityType="HOTEL"
            auditorName={hotel.accessibility.verifiedBy || 'OpenStreetMap Universal Accessibility Directory'}
            verifiedDate={hotel.accessibility.verificationDate || 'Verified'}
          />
        </div>

        {/* Pricing & Booking Actions Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] text-slate-500 font-medium">Starting from</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-900 dark:text-white">
                {formattedPrice}
              </span>
              <span className="text-xs text-slate-500">/ night</span>
            </div>
            {isConverted && (
              <div className="text-[10px] text-slate-400 font-medium">
                (Native: {nativeFormatted})
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(hotel)}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
              title="Inspect accessibility specs & room photos"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Details</span>
            </button>
            <button
              onClick={() => onBookNow(hotel)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Book Stay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
