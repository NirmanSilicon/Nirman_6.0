import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRailStore } from '../../stores/useRailStore';
import { Car, X, Check, MapPin, Navigation } from 'lucide-react';
import { formatEpochTo12Hour } from '../dashboard/passengerUtils';
import { useEscapeKey } from '../../hooks/useDismissible';

interface CabRouteDefaults {
  destName: string;
  deboardName: string;
  highwayTitle: string;
  pickupName: string;
  dropName: string;
  driveMins: number;
  roadSubtext: string;
  fare: string;
  dispatchHeader: string;
  driverName: string;
  driverSpot: string;
  minsSaved: number;
}

function getDefaultCabConfig(
  isKolkata: boolean,
  isKhurda: boolean,
  deboardCode?: string,
  destCode?: string
): CabRouteDefaults {
  if (isKolkata) {
    const isMecheda = deboardCode === 'MCA';
    return {
      destName: 'Howrah Station',
      deboardName: isMecheda ? 'Mecheda Junction' : 'Santragachi Junction',
      highwayTitle: 'Kona Expressway Road Transfer',
      pickupName: isMecheda
        ? 'Mecheda Junction (MCA) — Station Exit Gate 1'
        : 'Santragachi Junction (SRC) — Kona Expressway Gate',
      dropName: 'Howrah Station (HWH) — Platform 1 Main Portico',
      driveMins: 18,
      roadSubtext: '10.5 km via Kona Expressway & Vidyasagar Setu (18 mins)',
      fare: '₹280',
      dispatchHeader: isMecheda ? 'Cab Dispatched to MCA Gate 1' : 'Cab Dispatched to SRC Kona Gate',
      driverName: 'Subhash Mondal',
      driverSpot: isMecheda ? 'Mecheda Junction Gate 1' : 'Santragachi Junction Kona Expressway Gate',
      minsSaved: 25,
    };
  }

  if (isKhurda) {
    const isPuri = destCode === 'PURI';
    return {
      destName: isPuri ? 'Puri Terminal' : 'Bhubaneswar Station',
      deboardName: 'Khurda Road Junction',
      highwayTitle: isPuri ? 'NH-316 Highway Road Transfer' : 'NH-16 Highway Road Transfer',
      pickupName: 'Khurda Road Junction (KUR) — Station Portico Gate 1',
      dropName: isPuri
        ? 'Puri Terminal (PURI) — VIP Road Entrance'
        : 'Bhubaneswar (BBS) — Platform 1 Main Concourse',
      driveMins: 26,
      roadSubtext: '18.5 km via NH-16 Expressway (26 mins)',
      fare: isPuri ? '₹650' : '₹390',
      dispatchHeader: 'Cab Dispatched to KUR Gate 1',
      driverName: 'Rajesh Sahu',
      driverSpot: 'Khurda Road Junction Portico Gate 1',
      minsSaved: 28,
    };
  }

  const isPuri = destCode === 'PURI';
  return {
    destName: isPuri ? 'Puri Terminal' : 'Bhubaneswar Station',
    deboardName: 'Cuttack Junction',
    highwayTitle: 'NH-16 Highway Road Transfer',
    pickupName: 'Cuttack Junction (CTC) — Exit Gate 2 Portico',
    dropName: isPuri
      ? 'Puri Terminal (PURI) — VIP Road Entrance'
      : 'Bhubaneswar (BBS) — Platform 1 Main Concourse',
    driveMins: 38,
    roadSubtext: '27.4 km via NH-16 Expressway (38 mins)',
    fare: '₹480',
    dispatchHeader: 'Cab Dispatched to CTC Gate 2',
    driverName: 'Rajesh Sahu',
    driverSpot: 'Cuttack Junction Exit Gate 2',
    minsSaved: 21,
  };
}

export const CabModal: React.FC = () => {
  const { cabModalOpen, setCabModalOpen, rescue, activeSnapshot, activeCorridorId } = useRailStore();
  const [isBooked, setIsBooked] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const bookingTimerRef = useRef<number | null>(null);

  const clearBookingTimer = useCallback(() => {
    if (bookingTimerRef.current !== null) {
      window.clearTimeout(bookingTimerRef.current);
      bookingTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearBookingTimer, [clearBookingTimer]);

  const handleClose = useCallback(() => {
    clearBookingTimer();
    setIsBooking(false);
    setCabModalOpen(false);
    setIsBooked(false);
  }, [clearBookingTimer, setCabModalOpen]);

  useEscapeKey(cabModalOpen, handleClose);

  if (!cabModalOpen) return null;

  const plan = rescue?.bailout_plan;
  const isKolkata =
    activeCorridorId === 'SER_HWH_KGP' ||
    plan?.deboard_station_code === 'SRC' ||
    plan?.deboard_station_code === 'MCA';
  const isKhurda = plan?.deboard_station_code === 'KUR';

  const defaults = getDefaultCabConfig(
    isKolkata,
    isKhurda,
    plan?.deboard_station_code,
    plan?.destination_station_code
  );

  const destName = plan?.destination_station_name || defaults.destName;
  const deboardName = plan?.deboard_station_name || defaults.deboardName;
  const highwayTitle = plan?.highway_name || defaults.highwayTitle;
  const { pickupName, dropName, fare, dispatchHeader } = defaults;
  const driveMins = plan?.road_drive_mins ? Math.round(plan.road_drive_mins) : defaults.driveMins;
  const roadSubtext = plan?.road_distance_km
    ? `${plan.road_distance_km} km via ${plan.highway_name || 'Expressway'} (${driveMins} mins)`
    : defaults.roadSubtext;
  const dispatchDesc = `Your driver ${defaults.driverName} is waiting at ${defaults.driverSpot}. Estimated road journey: ${driveMins} minutes to ${destName}.`;

  const defaultRoadEpoch = (activeSnapshot.tick_utc || 1795067700) + driveMins * 60;
  const roadArrival = plan?.final_road_arrival_epoch
    ? formatEpochTo12Hour(plan.final_road_arrival_epoch)
    : formatEpochTo12Hour(defaultRoadEpoch);
  const minsSaved = plan?.minutes_saved ?? defaults.minsSaved;

  const handleConfirm = () => {
    clearBookingTimer();
    setIsBooking(true);
    bookingTimerRef.current = window.setTimeout(() => {
      bookingTimerRef.current = null;
      setIsBooking(false);
      setIsBooked(true);
    }, 1200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E2E8F0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">{highwayTitle}</h3>
              <p className="text-xs text-gray-300">
                {deboardName} ➔ {destName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg cursor-pointer"
            aria-label="Close cab modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {!isBooked ? (
            <>
              {/* Route Summary */}
              <div className="bg-[#FAF9F6] p-3.5 rounded-xl border border-[#E5E7EB] space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="text-[#64748B] block">Pickup Location</span>
                    <strong className="text-[#0F172A]">{pickupName}</strong>
                  </div>
                </div>

                <div className="border-l-2 border-dashed border-[#CBD5E1] ml-2 pl-4 py-1">
                  <span className="text-xs font-mono text-[#64748B]">{roadSubtext}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <Navigation className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs">
                    <span className="text-[#64748B] block">Drop Location</span>
                    <strong className="text-[#0F172A]">{dropName}</strong>
                  </div>
                </div>
              </div>

              {/* Driver & Cab Details */}
              <div className="border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#0F172A]">Prime Sedan (Toyota Etios)</div>
                  <div className="text-xs text-[#64748B]">
                    Driver: {defaults.driverName} • {isKolkata ? 'WB 04 HG 2814' : 'OD 02 AB 4591'}
                  </div>
                  <div className="text-xs text-emerald-600 font-medium mt-0.5">★ 4.9 (420+ trips) • 3 mins away</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[#0F172A]">{fare}</div>
                  <div className="text-xs text-[#64748B]">Fixed Fare</div>
                </div>
              </div>

              {/* Time Advantage Pill */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                <span className="text-emerald-800">Connection Arrival via Road:</span>
                <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-300">
                  {roadArrival} (~{minsSaved}m lead)
                </span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-[#475569] bg-[#F1F5F9] hover:bg-[#E2E8F0] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isBooking}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isBooking ? 'Connecting Driver...' : 'Confirm Cab Dispatch'}
                </button>
              </div>
            </>
          ) : (
            /* Booking Confirmed State */
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="text-base font-bold text-[#0F172A]">{dispatchHeader}</h4>
              <p className="text-xs text-[#64748B] max-w-xs mx-auto">
                {dispatchDesc}
              </p>

              <div className="bg-[#FAF9F6] p-3 rounded-lg border border-[#E2E8F0] text-xs font-mono inline-block">
                OTP: <span className="font-bold text-emerald-700 text-sm tracking-widest">7482</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Close & View Live Radar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
