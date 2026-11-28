import React, { useState, useEffect } from 'react';
import { Hotel, RoomOption } from '../../types';
import { formatCurrency, convertPrice, CURRENCIES, CurrencyCode } from '../../utils/currency';
import { ConfidenceRating } from '../common/ConfidenceRating';
import {
  X,
  ShieldCheck,
  Star,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
  Home,
  Waves,
  Sparkles,
  Bed,
  Bath,
  Maximize2,
  Volume2,
  Users,
  Check,
  ChevronRight,
  Phone,
  Mail,
  Clock,
  HelpCircle,
  CalendarCheck,
  Award,
  DollarSign,
} from 'lucide-react';

interface HotelDetailModalProps {
  hotel: Hotel | null;
  displayCurrency?: string;
  isOpen: boolean;
  onClose: () => void;
  onBookRoom: (hotel: Hotel, room: RoomOption) => void;
}

export const HotelDetailModal: React.FC<HotelDetailModalProps> = ({
  hotel,
  displayCurrency = 'INR',
  isOpen,
  onClose,
  onBookRoom,
}) => {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'rooms' | 'accessibility' | 'reviews'>('rooms');
  const [activeCurrency, setActiveCurrency] = useState<string>(displayCurrency);

  useEffect(() => {
    if (displayCurrency) {
      setActiveCurrency(displayCurrency);
    }
  }, [displayCurrency]);

  if (!isOpen || !hotel) return null;

  const allPhotos = [hotel.imageUrl, ...(hotel.galleryImages || [])];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar with Title & Close */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
              {hotel.propertyType === 'HOTEL' ? (
                <Building2 className="w-5 h-5" />
              ) : hotel.propertyType === 'RESORT' ? (
                <Waves className="w-5 h-5" />
              ) : (
                <Home className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {hotel.name}
                </h2>
                {hotel.accessibilityStatus === 'HIGHLY_ACCESSIBLE' || hotel.accessibility.overallScore >= 80 ? (
                  <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-full border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{hotel.accessibility.overallScore}% Highly Accessible</span>
                  </span>
                ) : hotel.accessibilityStatus === 'PARTIALLY_ACCESSIBLE' || hotel.accessibility.overallScore >= 40 ? (
                  <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-xs rounded-full border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Partially Accessible</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-full border border-slate-300 dark:border-slate-700 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Audit Pending</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-500" />
                <span>{hotel.address}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-5 space-y-6 flex-1">
          {/* Main Gallery & Photo Carousel */}
          <div className="space-y-2">
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-900 shadow-md">
              <img
                src={allPhotos[selectedPhotoIndex] || hotel.imageUrl}
                alt={hotel.name}
                className="w-full h-full object-cover transition-opacity duration-300"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-white text-xs font-bold flex items-center gap-1.5 border border-white/20">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>Universal Accessibility Audited</span>
              </div>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-white text-xs font-semibold">
                Photo {selectedPhotoIndex + 1} of {allPhotos.length}
              </div>
            </div>

            {/* Thumbnail Selectors */}
            {allPhotos.length > 1 && (
              <div className="flex flex-wrap gap-2 pb-1">
                {allPhotos.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhotoIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedPhotoIndex === idx
                        ? 'border-blue-600 scale-105 shadow-md'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt="thumbnail"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description & Proximity Banner */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
              {hotel.description}
            </p>
            {hotel.proximityToDestinations.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2 text-xs">
                {hotel.proximityToDestinations.map((p, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-blue-100/70 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-lg font-semibold flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>
                      {p.distanceKm} km from {p.destinationName} ({p.stepFreePath ? '100% Step-Free Route' : 'Accessible transit available'})
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-bold">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`pb-3 relative transition-colors ${
                activeTab === 'rooms'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Accessible Rooms ({hotel.rooms.length})
            </button>
            <button
              onClick={() => setActiveTab('accessibility')}
              className={`pb-3 relative transition-colors ${
                activeTab === 'accessibility'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Certified Audit Specs
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 relative transition-colors ${
                activeTab === 'reviews'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Traveler Reviews ({hotel.reviewsCount})
            </button>
          </div>

          {/* TAB 1: ACCESSIBLE ROOMS */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bed className="w-5 h-5 text-blue-600" />
                  <span>Select an Accessible Room Option</span>
                </h3>

                {/* Currency Switcher in Modal */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <button
                      key={code}
                      onClick={() => setActiveCurrency(code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        activeCurrency === code
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {CURRENCIES[code].symbol} {code}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotel.rooms.map((room) => {
                  const roomNativeCurrency = room.currency || hotel.currency || 'INR';
                  const convertedRoomPrice = convertPrice(
                    room.pricePerNight,
                    roomNativeCurrency,
                    activeCurrency
                  );
                  const formattedRoomPrice = formatCurrency(convertedRoomPrice, activeCurrency);
                  const isConverted = roomNativeCurrency.toUpperCase() !== activeCurrency.toUpperCase();
                  const nativeRoomPrice = formatCurrency(room.pricePerNight, roomNativeCurrency);

                  return (
                  <div
                    key={room.id}
                    className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2.5">
                      <div className="relative h-40 rounded-xl overflow-hidden">
                        <img
                          src={room.imageUrl}
                          alt={room.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute top-2 right-2 px-2.5 py-1 bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-black rounded-md">
                          Door {room.doorWidthCm} cm
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {room.name}
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {room.bedType} • Sleeps {room.capacity}
                        </p>
                      </div>

                      {/* Room Accessibility Badges */}
                      <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1">
                          {room.rollInShower ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Roll-in Shower</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {room.toiletGrabRails ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Grab Rails</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {room.showerChair ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Shower Seat</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {room.emergencyPullCord ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Emergency Alarm</span>
                        </div>
                      </div>

                      {/* Features list */}
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                        {room.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Room Pricing & Action */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-black text-slate-900 dark:text-white">
                            {formattedRoomPrice}
                          </span>
                          <span className="text-xs text-slate-500"> / night</span>
                        </div>
                        {isConverted && (
                          <span className="text-[10px] text-slate-400 font-medium block">
                            (Native: {nativeRoomPrice})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onBookRoom(hotel, room);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <CalendarCheck className="w-4 h-4" />
                        <span>Reserve Room</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          )}

          {/* TAB 2: CERTIFIED AUDIT SPECS */}
          {activeTab === 'accessibility' && (
            <div className="space-y-4">
              {hotel.accessibilityStatus === 'UNAVAILABLE' ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                  <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm mb-0.5">Accessibility Audit Status</div>
                    <p>
                      {hotel.accessibilityDisclaimer ||
                        'Accessibility information not available — please verify with the property before booking.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>Auditor Certification: {hotel.accessibility.verifiedBy}</span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Verified on {hotel.accessibility.verificationDate} • Comprehensive ISO & ADA Standard Audit
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceRating
                      score={hotel.accessibility.confidence || 95}
                      variant="stars"
                      entityName={hotel.name}
                      entityType="HOTEL"
                      auditorName={hotel.accessibility.verifiedBy}
                      verifiedDate={hotel.accessibility.verificationDate}
                    />
                    <div className="text-2xl font-black text-emerald-600">
                      {hotel.accessibility.overallScore}/100
                    </div>
                  </div>
                </div>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500 font-semibold">Entrance & Ramps</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {hotel.accessibility.stepFreeEntrance ? '✅ 100% Step-Free' : '⚠️ Steps Present'}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    Gradient: {hotel.accessibility.entranceRampGradient}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500 font-semibold">Elevators & Lifts</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {hotel.accessibility.elevatorWithBrailleAudio
                      ? `✅ Braille & Audio Voice Chimes (${hotel.accessibility.elevatorDoorWidthCm}cm door)`
                      : 'Ground floor only'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500 font-semibold">PRM Staff & Assistance</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {hotel.accessibility.trainedStaffPrm24_7
                      ? '✅ 24/7 Mobility Escort & Caregiver Assistance'
                      : 'Standard Staff'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500 font-semibold">Service Animals & Relief</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {hotel.accessibility.serviceAnimalReliefArea
                      ? '✅ Dedicated Service Dog Relief Area & Bowls'
                      : 'Pet-friendly upon notice'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500 font-semibold">Pool & Leisure Access</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {hotel.accessibility.poolHoistLift
                      ? '✅ Hydraulic Pool Chair Lift Available'
                      : 'No Pool Lift / Ground Relaxation'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div className="text-slate-500 font-semibold">Sensory & Emergency Safety</div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    {hotel.accessibility.sensoryQuietLounge
                      ? '✅ Sensory De-escalation Quiet Lounge & Evac Chair'
                      : 'Standard Safety'}
                  </div>
                </div>
              </div>

              {/* General Amenities */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                  Property Amenities
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {hotel.amenities.map((amenity, idx) => (
                    <div
                      key={idx}
                      className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRAVELER REVIEWS */}
          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    ★ {hotel.averageRating}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Based on {hotel.reviewsCount} verified guest reviews
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {hotel.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {rev.authorName}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                          <span>{rev.mobilityType}</span>
                          <span>•</span>
                          <span className="text-slate-400">{rev.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                      "{rev.comment}"
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {rev.accessibilityHighlights.map((hl, hIdx) => (
                        <span
                          key={hIdx}
                          className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-md"
                        >
                          ✓ {hl}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Details */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Check-in: {hotel.checkInTime} • Check-out: {hotel.checkOutTime}
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              onBookRoom(hotel, hotel.rooms[0]);
            }}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>
              Book from {formatCurrency(convertPrice(hotel.pricePerNightStarting, hotel.currency || 'INR', activeCurrency), activeCurrency)}/night
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
