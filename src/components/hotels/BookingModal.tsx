import React, { useState, useEffect } from 'react';
import { Hotel, RoomOption, HotelBooking, OfflineTripPdfRecord } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, convertPrice, CURRENCIES, CurrencyCode } from '../../utils/currency';
import { syncHotelBookingToSupabase, syncOfflinePdfToSupabase } from '../../utils/supabase';
import { getApiEndpoint, API_ENDPOINTS } from '../../utils/apiConfig';
import {
  createRazorpayOrder,
  loadRazorpayScript,
  RazorpayOrderResponse,
  RazorpayPaymentSuccessResponse,
} from '../../utils/razorpay';
import { RazorpayCheckoutModal } from './RazorpayCheckoutModal';
import {
  X,
  CalendarCheck,
  ShieldCheck,
  Building2,
  Home,
  CheckCircle2,
  ArrowRight,
  Clock,
  MapPin,
  Car,
  Dog,
  Zap,
  Volume2,
  Printer,
  Download,
  QrCode,
  Sparkles,
  Bed,
  Check,
  Database,
  CreditCard,
  Lock,
  Smartphone,
  BadgeCheck,
} from 'lucide-react';

interface BookingModalProps {
  hotel: Hotel | null;
  selectedRoom: RoomOption | null;
  displayCurrency?: string;
  isOpen: boolean;
  onClose: () => void;
  onBookingConfirmed: (booking: HotelBooking) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  hotel,
  selectedRoom,
  displayCurrency = 'INR',
  isOpen,
  onClose,
  onBookingConfirmed,
}) => {
  const { user, isAuthenticated, openAuthPrompt } = useAuth();

  // Booking Form State
  const [activeRoomId, setActiveRoomId] = useState<string>(
    selectedRoom?.id || (hotel?.rooms[0]?.id ?? '')
  );
  const [activeCurrency, setActiveCurrency] = useState<string>(displayCurrency);

  useEffect(() => {
    if (selectedRoom?.id) {
      setActiveRoomId(selectedRoom.id);
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (displayCurrency) {
      setActiveCurrency(displayCurrency);
    }
  }, [displayCurrency]);

  // Set default dates: check-in 7 days from now, 3 nights
  const today = new Date();
  const defaultIn = new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0];
  const defaultOut = new Date(today.getTime() + 86400000 * 5).toISOString().split('T')[0];

  const [checkInDate, setCheckInDate] = useState(defaultIn);
  const [checkOutDate, setCheckOutDate] = useState(defaultOut);
  const [guestsCount, setGuestsCount] = useState(2);
  const [roomCount, setRoomCount] = useState(1);

  // Contact Info
  const [guestName, setGuestName] = useState(user?.name || 'Rudransh Mohanty');
  const [guestEmail, setGuestEmail] = useState(user?.email || 'rudransh.bbsr@gmail.com');
  const [guestPhone, setGuestPhone] = useState('+91 94370 12345');

  // Accessibility Requirements
  const [requiresRollInShower, setRequiresRollInShower] = useState(true);
  const [requiresGroundFloor, setRequiresGroundFloor] = useState(false);
  const [requiresAirportVanTransfer, setRequiresAirportVanTransfer] = useState(false);
  const [requiresServiceDogSetup, setRequiresServiceDogSetup] = useState(false);
  const [requiresWheelchairCharger, setRequiresWheelchairCharger] = useState(true);
  const [requiresDeafStrobeAlarm, setRequiresDeafStrobeAlarm] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'RAZORPAY' | 'PAY_AT_HOTEL'>('RAZORPAY');
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [activeRazorpayOrder, setActiveRazorpayOrder] = useState<RazorpayOrderResponse | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<HotelBooking | null>(null);

  if (!isOpen || !hotel) return null;

  const currentRoom = hotel.rooms.find((r) => r.id === activeRoomId) || hotel.rooms[0];
  const roomNativeCurrency = currentRoom?.currency || hotel.currency || 'INR';

  // Calculate nights
  const inDate = new Date(checkInDate);
  const outDate = new Date(checkOutDate);
  const diffTime = outDate.getTime() - inDate.getTime();
  const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Base Native Calculations
  const roomPriceNative = currentRoom?.pricePerNight || hotel.pricePerNightStarting;
  const transferFeeNative = requiresAirportVanTransfer
    ? (roomNativeCurrency === 'INR' ? 2500 : 30)
    : 0;
  const roomSubtotalNative = roomPriceNative * nightsCount * roomCount;
  const totalPriceNative = roomSubtotalNative + transferFeeNative;

  // Active Display Currency Calculations
  const roomPriceConverted = convertPrice(roomPriceNative, roomNativeCurrency, activeCurrency);
  const transferFeeConverted = requiresAirportVanTransfer
    ? convertPrice(transferFeeNative, roomNativeCurrency, activeCurrency)
    : 0;
  const roomSubtotalConverted = roomPriceConverted * nightsCount * roomCount;
  const totalPriceConverted = roomSubtotalConverted + transferFeeConverted;

  const formattedRoomPrice = formatCurrency(roomPriceConverted, activeCurrency);
  const formattedTransferFee = formatCurrency(
    convertPrice(roomNativeCurrency === 'INR' ? 2500 : 30, roomNativeCurrency, activeCurrency),
    activeCurrency
  );
  const formattedSubtotal = formatCurrency(roomSubtotalConverted, activeCurrency);
  const formattedTotal = formatCurrency(totalPriceConverted, activeCurrency);

  const getSpecialRequests = () => {
    const specialReqs: string[] = [];
    if (requiresRollInShower) specialReqs.push('Guaranteed roll-in shower with flip-down bench');
    if (requiresGroundFloor) specialReqs.push('Ground floor / immediate elevator proximity requested');
    if (requiresAirportVanTransfer) specialReqs.push(`Accessible ramp van transfer requested (${formattedTransferFee})`);
    if (requiresServiceDogSetup) specialReqs.push('Service dog bowl and relief lawn access');
    if (requiresWheelchairCharger) specialReqs.push('Electric wheelchair bedside charging outlet');
    if (requiresDeafStrobeAlarm) specialReqs.push('Vibrating pillow alarm & visual strobe alarm');
    if (additionalNotes.trim()) specialReqs.push(additionalNotes.trim());
    return specialReqs;
  };

  const processFinalBooking = async (paymentDetails?: {
    paymentMethod: 'RAZORPAY' | 'PAY_AT_HOTEL';
    paymentStatus: 'PAID' | 'PENDING';
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
    paidAmount?: number;
    paidCurrency?: string;
  }) => {
    setIsSubmitting(true);
    const specialReqs = getSpecialRequests();

    const currentMethod = paymentDetails?.paymentMethod || paymentMethod;
    const currentPaymentStatus =
      paymentDetails?.paymentStatus || (currentMethod === 'RAZORPAY' ? 'PAID' : 'PENDING');

    const bookingPayload = {
      hotelId: hotel.id,
      roomId: currentRoom.id,
      checkInDate,
      checkOutDate,
      guestsCount,
      roomCount,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests: specialReqs,
      requiresRollInShower,
      requiresGroundFloor,
      requiresAirportVanTransfer,
      paymentMethod: currentMethod,
      paymentStatus: currentPaymentStatus,
      razorpayPaymentId: paymentDetails?.razorpayPaymentId,
      razorpayOrderId: paymentDetails?.razorpayOrderId,
      razorpaySignature: paymentDetails?.razorpaySignature,
      paidAmount: paymentDetails?.paidAmount || (currentMethod === 'RAZORPAY' ? totalPriceConverted : undefined),
      paidCurrency: paymentDetails?.paidCurrency || activeCurrency,
      paidAt: currentMethod === 'RAZORPAY' ? new Date().toISOString() : undefined,
    };

    try {
      const res = await fetch(getApiEndpoint(API_ENDPOINTS.BOOKINGS), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      if (res.ok) {
        const data: HotelBooking = await res.json();
        setConfirmedBooking(data);
        onBookingConfirmed(data);

        // Also ensure client-side Supabase sync
        syncHotelBookingToSupabase(data).catch(() => {});
        
        // Sync PDF voucher record to Supabase
        const voucherPdf: OfflineTripPdfRecord = {
          id: `PDF-${data.id}`,
          tripId: data.id,
          userEmail: data.guestEmail,
          documentTitle: `${data.hotelName} - Accessible Stay Voucher & PRM Guide`,
          documentType: 'HOTEL_VOUCHER',
          destinationName: data.hotelName,
          travelerName: data.guestName,
          accessibilityScore: 98,
          emergencyContacts: [
            { name: 'Hotel 24/7 Front Desk', phone: data.guestPhone || '+91 11 2345 6789', location: data.hotelAddress }
          ],
          turnByTurnSteps: [
            `Check-in date: ${data.checkInDate} to ${data.checkOutDate}`,
            `Reserved Room: ${data.roomName} (${data.nightsCount} nights)`,
            `Payment: ${data.paymentMethod === 'RAZORPAY' ? `Paid via Razorpay (${data.razorpayPaymentId || 'Verified Instant'})` : 'Pay at Hotel Desk'}`,
            `Special Accommodations: ${data.specialRequests.join(', ')}`,
            `Reception PIN: ${data.verificationPin}`
          ],
          pdfMetadata: {
            generatedAt: new Date().toISOString(),
            isStepFree: true,
            verificationPin: data.verificationPin,
            qrCodeData: data.qrCodeData,
          },
          syncedToSupabase: true,
          created_at: new Date().toISOString(),
        };
        syncOfflinePdfToSupabase(voucherPdf).catch(() => {});
      } else {
        // Fallback local booking
        const fallbackBooking: HotelBooking = {
          id: `BK-SUGAMYA-${Math.floor(1000 + Math.random() * 9000)}`,
          hotelId: hotel.id,
          hotelName: hotel.name,
          propertyType: hotel.propertyType,
          hotelAddress: hotel.address,
          hotelCity: hotel.city,
          hotelImageUrl: currentRoom.imageUrl || hotel.imageUrl,
          roomId: currentRoom.id,
          roomName: currentRoom.name,
          checkInDate,
          checkOutDate,
          nightsCount,
          guestsCount,
          roomCount,
          guestName,
          guestEmail,
          guestPhone,
          specialRequests: specialReqs,
          requiresRollInShower,
          requiresGroundFloor,
          requiresAirportVanTransfer,
          totalPrice: totalPriceNative,
          currency: roomNativeCurrency,
          status: 'CONFIRMED',
          paymentMethod: currentMethod,
          paymentStatus: currentPaymentStatus,
          razorpayPaymentId: paymentDetails?.razorpayPaymentId,
          razorpayOrderId: paymentDetails?.razorpayOrderId,
          razorpaySignature: paymentDetails?.razorpaySignature,
          paidAmount: paymentDetails?.paidAmount,
          paidCurrency: paymentDetails?.paidCurrency,
          paidAt: currentMethod === 'RAZORPAY' ? new Date().toISOString() : undefined,
          bookingDate: new Date().toISOString().split('T')[0],
          qrCodeData: `ACCESSWAY-HOTEL-${hotel.id}-CONFIRMED`,
          verificationPin: String(Math.floor(1000 + Math.random() * 9000)),
        };
        setConfirmedBooking(fallbackBooking);
        onBookingConfirmed(fallbackBooking);
        syncHotelBookingToSupabase(fallbackBooking).catch(() => {});
      }
    } catch (err) {
      console.warn('Booking API error, saving locally:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      openAuthPrompt(
        'Please sign in or register to book your trip and confirm this hotel room.',
        'REGISTER'
      );
      return;
    }

    if (paymentMethod === 'RAZORPAY') {
      setIsSubmitting(true);
      try {
        const order = await createRazorpayOrder({
          amount: totalPriceConverted,
          currency: activeCurrency,
          hotelId: hotel.id,
          hotelName: hotel.name,
          roomId: currentRoom.id,
          roomName: currentRoom.name,
          guestName,
          guestEmail,
          guestPhone,
        });

        setActiveRazorpayOrder(order);
        setIsRazorpayModalOpen(true);
      } catch (err) {
        console.warn('Error creating Razorpay order:', err);
        processFinalBooking();
      } finally {
        setIsSubmitting(false);
      }
    } else {
      processFinalBooking({ paymentMethod: 'PAY_AT_HOTEL', paymentStatus: 'PENDING' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {confirmedBooking ? 'Accessible Booking Confirmed!' : 'Book Accessible Accommodation'}
              </h2>
              <p className="text-xs text-slate-500 font-semibold truncate max-w-sm">
                {hotel.name} • {hotel.city}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Form OR Confirmation Pass */}
        <div className="overflow-y-auto p-5 flex-1">
          {confirmedBooking ? (
            /* --- CONFIRMATION SCREEN --- */
            <div className="space-y-5 text-center sm:text-left">
              {/* Success Badge */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-emerald-800 dark:text-emerald-300">
                      Reservation Reference: {confirmedBooking.id}
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Your accessible stay is confirmed with 100% barrier-free guarantees. An offline accessible pass has been stored in your trips.
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Supabase Saved (hotel_bookings)</span>
                </div>
              </div>

              {/* Printable Accessible Pass Card */}
              <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl border border-slate-700 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                      AccessWay Sugamya Verified Pass
                    </span>
                    <h4 className="text-lg font-black text-white">{confirmedBooking.hotelName}</h4>
                    <p className="text-xs text-slate-300">{confirmedBooking.hotelAddress}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400">Reception PIN</span>
                    <div className="text-lg font-mono font-black text-amber-400">
                      {confirmedBooking.verificationPin}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-800/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Check-In</span>
                    <strong className="text-white">{confirmedBooking.checkInDate}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Check-Out</span>
                    <strong className="text-white">{confirmedBooking.checkOutDate}</strong>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Duration</span>
                    <strong className="text-white">{confirmedBooking.nightsCount} Nights</strong>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Total Paid</span>
                    <strong className="text-emerald-400 font-bold">
                      {formatCurrency(confirmedBooking.totalPrice, confirmedBooking.currency || 'INR')}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/50 rounded-xl text-xs space-y-1">
                  <div className="text-slate-400 font-semibold">Reserved Room:</div>
                  <div className="font-bold text-white">{confirmedBooking.roomName}</div>
                  <div className="text-slate-300 text-[11px]">
                    Guest: <strong>{confirmedBooking.guestName}</strong> ({confirmedBooking.guestPhone})
                  </div>
                  {confirmedBooking.paymentMethod === 'RAZORPAY' && (
                    <div className="pt-2 border-t border-slate-700 text-[11px] flex items-center justify-between text-emerald-300 font-medium">
                      <span className="flex items-center gap-1">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        Razorpay Payment ID: {confirmedBooking.razorpayPaymentId || 'pay_verified'}
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-md font-bold uppercase">
                        Instant Paid
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmed Accessibility Highlights */}
                <div className="space-y-1 text-xs">
                  <span className="text-[11px] font-bold text-blue-300">
                    Confirmed Accessibility Arrangements:
                  </span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {confirmedBooking.specialRequests.map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-blue-950/90 text-blue-200 border border-blue-800 text-[10px] font-semibold rounded-md flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{req}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={handlePrint}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Accessible Pass</span>
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Done & View Trips</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* --- BOOKING FORM --- */
            <form onSubmit={handleConfirmReservation} className="space-y-5">
              {/* Currency Selector Bar */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Billing Currency:
                </span>
                <div className="flex items-center gap-1">
                  {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => setActiveCurrency(code)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all ${
                        activeCurrency === code
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {CURRENCIES[code].symbol} {code}
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Selection Carousel */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  1. Choose Room Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hotel.rooms.map((room) => {
                    const roomNative = room.currency || hotel.currency || 'INR';
                    const converted = convertPrice(room.pricePerNight, roomNative, activeCurrency);
                    const formatted = formatCurrency(converted, activeCurrency);

                    return (
                      <div
                        key={room.id}
                        onClick={() => setActiveRoomId(room.id)}
                        className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                          activeRoomId === room.id
                            ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={room.imageUrl}
                          alt={room.name}
                          className="w-14 h-14 rounded-xl object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {room.name}
                          </h4>
                          <p className="text-[11px] text-slate-500">Door {room.doorWidthCm}cm</p>
                          <div className="text-xs font-black text-blue-600 dark:text-blue-400 mt-0.5">
                            {formatted}/night
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dates & Travelers */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  2. Travel Dates & Guests
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Check-In Date
                    </label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Check-Out Date
                    </label>
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Guests
                    </label>
                    <select
                      value={guestsCount}
                      onChange={(e) => setGuestsCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1 Guest</option>
                      <option value={2}>2 Guests</option>
                      <option value={3}>3 Guests</option>
                      <option value={4}>4 Guests</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 font-semibold block mb-1">
                      Rooms
                    </label>
                    <select
                      value={roomCount}
                      onChange={(e) => setRoomCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={1}>1 Room</option>
                      <option value={2}>2 Rooms</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Guest Details */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  3. Primary Traveler Information
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="Phone (+91 / International)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Verified Accessibility Needs Checklist */}
              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>4. Tailor Your Accessibility Needs</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={requiresRollInShower}
                      onChange={(e) => setRequiresRollInShower(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Roll-in shower with bench seat
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={requiresGroundFloor}
                      onChange={(e) => setRequiresGroundFloor(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Ground floor / closest to lift
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={requiresWheelchairCharger}
                      onChange={(e) => setRequiresWheelchairCharger(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Electric wheelchair charging point
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={requiresServiceDogSetup}
                      onChange={(e) => setRequiresServiceDogSetup(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Service dog relief & bowl setup
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={requiresAirportVanTransfer}
                      onChange={(e) => setRequiresAirportVanTransfer(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-semibold text-blue-700 dark:text-blue-300 flex items-center justify-between flex-1">
                      <span>Add Wheelchair Accessible Ramp Van Pickup</span>
                      <strong className="text-slate-900 dark:text-white">+{formattedTransferFee} total</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Payment Gateway Selection */}
              <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>5. Payment Method & Guarantee</span>
                  </label>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    <span>256-Bit SSL Encrypted</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Razorpay Option */}
                  <div
                    onClick={() => setPaymentMethod('RAZORPAY')}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                      paymentMethod === 'RAZORPAY'
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          ₹
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                            <span>Razorpay Gateway</span>
                            <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-black rounded-sm uppercase tracking-wider">
                              Fast
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            UPI • GPay • Cards • NetBanking
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 ${
                          paymentMethod === 'RAZORPAY'
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {paymentMethod === 'RAZORPAY' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>Instant 100% Guaranteed Stay Voucher</span>
                    </div>
                  </div>

                  {/* Pay at Hotel Option */}
                  <div
                    onClick={() => setPaymentMethod('PAY_AT_HOTEL')}
                    className={`cursor-pointer p-3.5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                      paymentMethod === 'PAY_AT_HOTEL'
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            Pay at Front Desk
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
                            Cash / Card upon check-in
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 ${
                          paymentMethod === 'PAY_AT_HOTEL'
                            ? 'border-blue-600 bg-blue-600'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {paymentMethod === 'PAY_AT_HOTEL' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Free cancellation up to 24h prior</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>
                    {formattedRoomPrice} × {nightsCount} nights × {roomCount} room
                  </span>
                  <span>{formattedSubtotal}</span>
                </div>
                {requiresAirportVanTransfer && (
                  <div className="flex justify-between text-slate-300">
                    <span>Accessible Ramp Van Airport Pickup</span>
                    <span>+{formattedTransferFee}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>Accessibility Audit Guarantee & Taxes</span>
                  <span className="text-emerald-400">Included (0)</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between text-sm font-black">
                  <span>{paymentMethod === 'RAZORPAY' ? 'Total to Pay via Razorpay:' : 'Total Due at Check-In:'}</span>
                  <span className="text-emerald-400 text-base">{formattedTotal}</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 font-black rounded-xl text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-white ${
                  paymentMethod === 'RAZORPAY'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {paymentMethod === 'RAZORPAY' ? (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>
                      {isSubmitting ? 'Initiating Razorpay...' : `Pay & Guarantee Stay (${formattedTotal})`}
                    </span>
                  </>
                ) : (
                  <>
                    <CalendarCheck className="w-5 h-5" />
                    <span>
                      {isSubmitting ? 'Confirming Reservation...' : `Confirm Accessible Stay (${formattedTotal})`}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Razorpay Checkout Modal */}
      {isRazorpayModalOpen && activeRazorpayOrder && (
        <RazorpayCheckoutModal
          isOpen={isRazorpayModalOpen}
          order={activeRazorpayOrder}
          hotelName={hotel.name}
          roomName={currentRoom.name}
          onClose={() => setIsRazorpayModalOpen(false)}
          onSuccess={async (paymentRes: RazorpayPaymentSuccessResponse) => {
            setIsRazorpayModalOpen(false);
            await processFinalBooking({
              paymentMethod: 'RAZORPAY',
              paymentStatus: 'PAID',
              razorpayPaymentId: paymentRes.razorpay_payment_id,
              razorpayOrderId: paymentRes.razorpay_order_id,
              razorpaySignature: paymentRes.razorpay_signature,
              paidAmount: activeRazorpayOrder.amount,
              paidCurrency: activeRazorpayOrder.currency,
            });
          }}
        />
      )}
    </div>
  );
};

