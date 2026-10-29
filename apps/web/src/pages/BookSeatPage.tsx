import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { formatPaise } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  ArrowRight,
  Filter,
  Flame,
  Lock,
  Smartphone,
  Building2,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

interface Seat {
  id: string;
  seatNumber: string;
  seatType: string;
  amenities: string[];
  status: string;
  positionX: number;
  positionY: number;
  label?: string;
  pricing?: { pricePaise: number };
}

interface Section {
  id: string;
  name: string;
  sectionType: string;
  seats: Seat[];
}

interface Floor {
  id: string;
  floorNumber: number;
  name: string;
  sections: Section[];
}

interface Shift {
  id: string;
  slot: string;
  name: string;
  startTime: string;
  endTime: string;
}

export default function BookSeatPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(tomorrowStr);
  const [selectedShift, setSelectedShift] = useState<string>('FULL_DAY');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [filterAmenity, setFilterAmenity] = useState<string>('ALL');

  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [activeHold, setActiveHold] = useState<any>(null);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(0);
  const [paymentOption, setPaymentOption] = useState<'TOKEN' | 'FULL'>('FULL');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  // Payment Gateway Modal State
  const [gatewayOrder, setGatewayOrder] = useState<any>(null);
  const [gatewayMethod, setGatewayMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [upiId, setUpiId] = useState('student@okaxis');
  const [selectedUpiApp, setSelectedUpiApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'qr'>('gpay');
  const [cardNumber, setCardNumber] = useState('4532 8190 2341 8892');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('672');
  const [cardHolder, setCardHolder] = useState('STUDENT SCHOLAR');
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // 1. Fetch Floors & Sections
  const { data: floorsData, isLoading: loadingFloors } = useQuery({
    queryKey: ['floors'],
    queryFn: () => api.get<Floor[]>('/floors'),
  });

  const floors = floorsData?.data || [];

  // Set default floor dynamically based on available active floors
  useEffect(() => {
    if (floors.length > 0) {
      const exists = floors.some((f) => f.id === selectedFloorId);
      if (!exists) {
        setSelectedFloorId(floors[0].id);
      }
    }
  }, [floors, selectedFloorId]);

  // 1b. Fetch Dynamic Seat Types from backend
  const { data: seatTypesData } = useQuery({
    queryKey: ['seat-types'],
    queryFn: () => api.get<any[]>('/seat-types'),
  });
  const seatTypes = seatTypesData?.data || [];

  // 2. Fetch Shifts
  const { data: shiftsData } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get<Shift[]>('/shifts'),
  });
  const shifts = shiftsData?.data || [];

  // 3. Fetch Seat Availability
  const { data: availData, isLoading: loadingAvail, refetch: refetchAvail } = useQuery({
    queryKey: ['availability', selectedDate, selectedShift, selectedFloorId],
    queryFn: () =>
      api.get<any>('/availability', {
        date: selectedDate,
        shiftSlot: selectedShift,
        floorId: selectedFloorId || undefined,
      }),
    enabled: !!selectedDate && !!selectedShift,
  });

  // 4. Fetch user's own bookings to enforce 1-seat-per-user limit
  const { data: myBookingsData } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => api.get<any>('/bookings/my'),
  });

  const myBookingsList: any[] = Array.isArray(myBookingsData?.data)
    ? myBookingsData.data
    : (myBookingsData?.data?.bookings || (myBookingsData as any)?.bookings || []);

  const existingBookingForDate = myBookingsList.find(
    (b: any) =>
      ['CONFIRMED', 'CHECKED_IN', 'PARTIALLY_PAID', 'PAID'].includes(b.status) &&
      b.date?.split('T')[0] === selectedDate
  );

  // Structured Availability Map: maps seatId -> full booking & color status
  const availabilityMap: Record<
    string,
    {
      status: 'AVAILABLE' | 'HALF_DAY_BOOKED' | 'BOOKED' | 'MAINTENANCE';
      isAvailableForShift: boolean;
      isHalfDayBooked: boolean;
      isFullDayBooked: boolean;
      bookedShifts: string[];
    }
  > = {};

  if (availData?.data?.seats) {
    for (const item of availData.data.seats) {
      const sId = item.seat?.id || item.seatId;
      if (!sId) continue;

      const currentShiftAvail = item.shifts?.find((sh: any) => sh.shiftSlot === selectedShift);
      const isShiftAvail = currentShiftAvail ? currentShiftAvail.available : true;
      const isBlocked = item.seat?.status === 'BLOCKED' || item.status === 'BLOCKED';
      const isFull = item.isFullDayBooked ?? (item.bookedShifts?.includes('FULL_DAY') || item.bookedShifts?.length >= 2);
      const isHalf = item.isHalfDayBooked ?? (!isFull && item.bookedShifts?.length === 1);

      let status: 'AVAILABLE' | 'HALF_DAY_BOOKED' | 'BOOKED' | 'MAINTENANCE' = 'AVAILABLE';
      if (isBlocked) {
        status = 'MAINTENANCE';
      } else if (!isShiftAvail || isFull) {
        // Red: Fully booked or booked for this selected shift
        status = 'BOOKED';
      } else if (isHalf) {
        // Yellow: Booked for half day (morning or evening)
        status = 'HALF_DAY_BOOKED';
      } else {
        // Green: Available
        status = 'AVAILABLE';
      }

      availabilityMap[sId] = {
        status,
        isAvailableForShift: isShiftAvail && !isBlocked,
        isHalfDayBooked: !!isHalf,
        isFullDayBooked: !!isFull,
        bookedShifts: item.bookedShifts || [],
      };
    }
  }

  // Hold Timer countdown
  useEffect(() => {
    if (!activeHold?.holdExpiresAt) return;
    const expiresAt = new Date(activeHold.holdExpiresAt).getTime();

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setHoldSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setActiveHold(null);
        setSelectedSeat(null);
        refetchAvail();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold, refetchAvail]);

  // Mutation: Hold Seat
  const holdMutation = useMutation({
    mutationFn: (seatId: string) =>
      api.post('/bookings/hold', {
        seatId,
        date: selectedDate,
        shiftSlot: selectedShift,
      }),
    onSuccess: (res: any) => {
      setActiveHold(res.data);
      refetchAvail();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to hold seat. It may have just been taken.');
      refetchAvail();
    },
  });

  // Mutation: Release Hold
  const releaseMutation = useMutation({
    mutationFn: (holdId: string) => api.delete(`/bookings/hold/${holdId}`),
    onSuccess: () => {
      setActiveHold(null);
      setSelectedSeat(null);
      refetchAvail();
    },
  });

  // 1. Create order and launch Payment Gateway
  const handleProceedToPayment = async () => {
    if (!activeHold) return;
    setIsProcessingPayment(true);

    try {
      const orderRes: any = await api.post('/payments/order', {
        bookingId: activeHold.id,
        paymentType: paymentOption === 'FULL' ? 'BOOKING_FULL' : 'BOOKING_TOKEN',
      });

      const orderData = orderRes.data;
      setGatewayOrder(orderData);
    } catch (err: any) {
      alert(err.message || 'Failed to initiate payment gateway');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // 2. Authorize and complete payment inside Gateway
  const handleCompleteGatewayPayment = async () => {
    if (!gatewayOrder || !activeHold) return;
    setIsAuthorizing(true);

    try {
      // Realistic gateway authorization delay
      await new Promise((r) => setTimeout(r, 900));

      const paymentId = `pay_rzp_${Date.now()}`;
      await api.post('/payments/verify', {
        razorpayOrderId: gatewayOrder.razorpayOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: 'simulated_valid_signature',
      });

      // Retrieve final confirmed booking
      const bookingRes: any = await api.get(`/bookings/${activeHold.id}`);
      setConfirmedBooking(bookingRes.data);
      setGatewayOrder(null);
      setActiveHold(null);
      setSelectedSeat(null);
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    } catch (err: any) {
      alert(err.message || 'Payment authorization failed. Please try again.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const currentFloor = floors.find((f) => f.id === selectedFloorId);

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <span>Library Seat Booking</span>
            <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full font-medium">
              Live Availability
            </span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Choose your preferred date, shift timing, and study space.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm">
          <Calendar className="w-4 h-4 text-primary ml-1" />
          <input
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Shift Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {shifts.map((shift) => {
          const isSelected = selectedShift === shift.slot;
          return (
            <button
              key={shift.id}
              onClick={() => setSelectedShift(shift.slot)}
              className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10 ring-2 ring-primary/20'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sm text-foreground">{shift.name}</span>
                <Clock className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <p className="text-xs text-muted-foreground">
                {shift.startTime} – {shift.endTime}
              </p>
              {shift.slot === 'FULL_DAY' && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Floor & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        {/* Floor Selection */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setSelectedFloorId(floor.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedFloorId === floor.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {floor.name}
            </button>
          ))}
        </div>

        {/* Dynamic Seat Type & Amenity Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1 shrink-0" />
          <button
            onClick={() => setFilterAmenity('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              filterAmenity === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border/60'
            }`}
          >
            All Desks
          </button>
          {seatTypes.map((type: any) => (
            <button
              key={type.code}
              onClick={() => setFilterAmenity(type.code)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                filterAmenity === type.code
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-muted border border-border/60'
              }`}
            >
              {type.name}
            </button>
          ))}
          {['AC', 'WIFI', 'CHARGING_POINT'].map((amenity) => (
            <button
              key={amenity}
              onClick={() => setFilterAmenity(amenity)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                filterAmenity === amenity
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-muted border border-border/60'
              }`}
            >
              {amenity.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 1 Seat Per User Notice Banner */}
      {existingBookingForDate && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">
                You already have Desk {existingBookingForDate.seat?.seatNumber} reserved for {selectedDate}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Each member can book only 1 seat per date. Your access pass is ready in My Bookings.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/bookings')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>View My Pass</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Seat Map Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-card/50 p-3 rounded-lg border border-border/60">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-600 flex items-center justify-center font-bold text-[10px]">
            ✓
          </div>
          <span className="font-semibold text-foreground">Available (Green)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-amber-400/30 border border-amber-500 text-amber-600 flex items-center justify-center font-bold text-[10px]">
            ◐
          </div>
          <span className="font-semibold text-amber-700 dark:text-amber-400">Half Day Booked (Yellow)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-rose-500/20 border border-rose-500/60 text-rose-600 flex items-center justify-center font-bold text-[10px]">
            ✕
          </div>
          <span className="font-semibold text-rose-600 dark:text-rose-400">Booked (Red)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-orange-500/20 border border-orange-500 text-orange-600 flex items-center justify-center text-[10px]">
            ⏳
          </div>
          <span>On Hold (10m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md bg-muted border border-border text-muted-foreground flex items-center justify-center text-[10px]">
            🔧
          </div>
          <span>Maintenance</span>
        </div>
      </div>

      {/* Visual Seat Map Sections */}
      {loadingFloors || loadingAvail ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3 bg-card rounded-2xl border border-border">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading interactive floor map...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {currentFloor?.sections.map((section) => {
            const filteredSeats = section.seats.filter((seat) => {
              if (filterAmenity === 'ALL') return true;
              const isSeatTypeFilter = seatTypes.some((st: any) => st.code === filterAmenity);
              if (isSeatTypeFilter || seat.seatType === filterAmenity) {
                return seat.seatType === filterAmenity;
              }
              return seat.amenities.includes(filterAmenity);
            });

            if (filteredSeats.length === 0) return null;

            return (
              <div key={section.id} className="bg-card rounded-2xl p-5 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
                  <div>
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                      <span>{section.name}</span>
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-muted text-muted-foreground">
                        {section.sectionType.replace('_', ' ')}
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {filteredSeats.length} desks
                  </span>
                </div>

                {/* Seat Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
                  {filteredSeats.map((seat) => {
                    const info = availabilityMap[seat.id] || {
                      status: 'AVAILABLE',
                      isAvailableForShift: true,
                      isHalfDayBooked: false,
                      isFullDayBooked: false,
                      bookedShifts: [],
                    };

                    const isHeld = activeHold?.seatId === seat.id;
                    const isBooked = info.status === 'BOOKED';
                    const isHalfDay = info.status === 'HALF_DAY_BOOKED';
                    const isMaintenance = info.status === 'MAINTENANCE';
                    const isAvailable = info.status === 'AVAILABLE';
                    const isSelected = selectedSeat?.id === seat.id;

                    let bgClass = '';
                    if (isSelected) {
                      bgClass = 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105 ring-2 ring-primary/40';
                    } else if (isHeld) {
                      bgClass = 'bg-orange-500/20 border-orange-500 text-orange-600 animate-pulse';
                    } else if (isBooked) {
                      // RED as requested by user!
                      bgClass = 'bg-rose-500/15 border-rose-500/60 text-rose-600 dark:text-rose-400 font-bold';
                    } else if (isHalfDay) {
                      // YELLOW as requested by user!
                      bgClass = 'bg-amber-400/25 border-amber-500 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-400/35';
                    } else if (isMaintenance) {
                      bgClass = 'bg-muted/70 border-border text-muted-foreground opacity-60 cursor-not-allowed';
                    } else {
                      // GREEN (Available)
                      bgClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20';
                    }

                    return (
                      <button
                        key={seat.id}
                        disabled={isMaintenance}
                        onClick={() => setSelectedSeat(seat)}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-1.5 transition-all relative ${bgClass}`}
                      >
                        <span className="font-extrabold text-xs tracking-tight">{seat.seatNumber}</span>

                        {isBooked ? (
                          <span className="text-[9px] text-rose-600 dark:text-rose-400 font-extrabold uppercase mt-0.5">
                            BOOKED
                          </span>
                        ) : isHalfDay ? (
                          <span className="text-[9px] text-amber-700 dark:text-amber-400 font-extrabold uppercase mt-0.5">
                            HALF DAY
                          </span>
                        ) : (
                          <span className="text-[9px] opacity-75 mt-0.5 uppercase truncate w-full text-center">
                            {seat.seatType}
                          </span>
                        )}

                        {/* Top indicator dot */}
                        {isAvailable && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        )}
                        {isHalfDay && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                        {isBooked && (
                          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Seat Drawer / Action Card */}
      {selectedSeat && !activeHold && (() => {
        const selectedSeatInfo = availabilityMap[selectedSeat.id] || {
          status: 'AVAILABLE',
          isAvailableForShift: true,
          isHalfDayBooked: false,
          isFullDayBooked: false,
          bookedShifts: [],
        };

        const isSelectedSeatBooked = selectedSeatInfo.status === 'BOOKED';
        const isSelectedSeatHalfDay = selectedSeatInfo.status === 'HALF_DAY_BOOKED';
        const cannotHoldDueToHalfDay = selectedShift === 'FULL_DAY' && isSelectedSeatHalfDay;
        const cannotHoldDueToExistingUserBooking = !!existingBookingForDate && existingBookingForDate.seatId !== selectedSeat.id;
        const isHoldDisabled =
          isSelectedSeatBooked ||
          cannotHoldDueToHalfDay ||
          cannotHoldDueToExistingUserBooking ||
          holdMutation.isPending;

        return (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-2xl p-4 lg:p-6 backdrop-blur-lg animate-in slide-in-from-bottom-5">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border ${
                  isSelectedSeatBooked
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : isSelectedSeatHalfDay
                    ? 'bg-amber-400/20 border-amber-500/40 text-amber-600'
                    : 'bg-primary/10 border-primary/20 text-primary'
                }`}>
                  {selectedSeat.seatNumber}
                </div>
                <div>
                  <h4 className="font-bold text-base text-foreground flex items-center gap-2">
                    <span>Desk {selectedSeat.seatNumber}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {selectedSeat.seatType}
                    </span>
                    {isSelectedSeatBooked && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 border border-rose-500/20">
                        Booked (Red)
                      </span>
                    )}
                    {isSelectedSeatHalfDay && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-400/20 text-amber-600 border border-amber-500/30">
                        Half Day Booked (Yellow)
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    {cannotHoldDueToExistingUserBooking ? (
                      <span className="text-amber-600 font-semibold">
                        Limit: You already have Desk {existingBookingForDate?.seat?.seatNumber} reserved for {selectedDate}.
                      </span>
                    ) : cannotHoldDueToHalfDay ? (
                      <span className="text-amber-600 font-semibold">
                        Already booked for half day ({selectedSeatInfo.bookedShifts.join(', ')}). Select Morning or Evening shift to book.
                      </span>
                    ) : isSelectedSeatBooked ? (
                      <span className="text-rose-500 font-semibold">
                        This desk is booked for {selectedShift} on {selectedDate}.
                      </span>
                    ) : (
                      <span>Amenities: {selectedSeat.amenities.join(', ') || 'Standard study desk'}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedSeat(null)}
                  className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={isHoldDisabled}
                  onClick={() => holdMutation.mutate(selectedSeat.id)}
                  className={`px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all flex items-center gap-2 ${
                    isHoldDisabled
                      ? 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
                      : 'bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90'
                  }`}
                >
                  {holdMutation.isPending
                    ? 'Holding Desk...'
                    : cannotHoldDueToExistingUserBooking
                    ? '1-Seat Limit Reached'
                    : isSelectedSeatBooked
                    ? 'Desk Unavailable'
                    : cannotHoldDueToHalfDay
                    ? 'Select Half-Day Shift'
                    : 'Hold & Continue'}
                  {!isHoldDisabled && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Active Hold & Payment Modal */}
      {activeHold && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Header with Hold Countdown */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-pulse" />
                <h3 className="font-bold text-lg text-foreground">Desk Reserved on Hold</h3>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full font-mono font-bold text-sm">
                <span>{Math.floor(holdSecondsLeft / 60)}:{(holdSecondsLeft % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>

            {/* Hold Details */}
            <div className="space-y-3 bg-muted/30 p-4 rounded-xl border border-border/50 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desk Number:</span>
                <span className="font-semibold">{activeHold.seat?.seatNumber} ({activeHold.seat?.seatType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking Date:</span>
                <span className="font-semibold">{activeHold.date?.split('T')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift Slot:</span>
                <span className="font-semibold">{activeHold.shiftSlot} ({activeHold.shiftStartTime} - {activeHold.shiftEndTime})</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 font-medium">
                <span className="text-muted-foreground">Full Slot Fee:</span>
                <span className="font-bold text-foreground">{formatPaise(activeHold.agreedPricePaise)}</span>
              </div>
            </div>

            {/* Payment Options Selection */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Payment Option
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentOption('TOKEN')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    paymentOption === 'TOKEN'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="font-bold text-sm text-foreground">Token Deposit</p>
                  <p className="text-primary font-extrabold text-base mt-0.5">
                    {formatPaise(activeHold.tokenAmountPaise)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Balance due at reception on arrival.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentOption('FULL')}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    paymentOption === 'FULL'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card'
                  }`}
                >
                  <p className="font-bold text-sm text-foreground">Full Payment</p>
                  <p className="text-primary font-extrabold text-base mt-0.5">
                    {formatPaise(activeHold.agreedPricePaise)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Direct access & priority check-in.
                  </p>
                </button>
              </div>
            </div>

            {/* Payment Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => releaseMutation.mutate(activeHold.id)}
                className="flex-1 py-3 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-all"
              >
                Release Hold
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleProceedToPayment}
                className="flex-[2] py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingPayment ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Opening Payment Gateway...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Proceed to Payment ({paymentOption === 'TOKEN' ? formatPaise(activeHold.tokenAmountPaise) : formatPaise(activeHold.agreedPricePaise)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realistic Razorpay Payment Gateway Modal */}
      {gatewayOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-card text-card-foreground border border-border rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Gateway Brand Header */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm tracking-wide uppercase">Razorpay</span>
                    <span className="text-[10px] bg-emerald-400 text-emerald-950 font-bold px-1.5 py-0.5 rounded">
                      SECURE
                    </span>
                  </div>
                  <p className="text-xs text-blue-100">MyLibrary Study Spaces</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-blue-200">Amount Due</p>
                <p className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {formatPaise(gatewayOrder.amountPaise)}
                </p>
              </div>
            </div>

            {/* Order Ref Bar */}
            <div className="bg-muted/60 px-4 py-2 border-b border-border flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Order: <span className="font-mono font-medium text-foreground">{gatewayOrder.razorpayOrderId}</span></span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Lock className="w-3 h-3" /> 256-bit SSL Encrypted
              </span>
            </div>

            {/* Gateway Body: Method Selectors + Form */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* Tabs for Payment Methods */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setGatewayMethod('UPI')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    gatewayMethod === 'UPI'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => setGatewayMethod('CARD')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    gatewayMethod === 'CARD'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setGatewayMethod('NETBANKING')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    gatewayMethod === 'NETBANKING'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Net Banking
                </button>
              </div>

              {/* UPI Tab */}
              {gatewayMethod === 'UPI' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'gpay', name: 'GPay', icon: '⚡' },
                      { id: 'phonepe', name: 'PhonePe', icon: '🟣' },
                      { id: 'paytm', name: 'Paytm', icon: '🔵' },
                      { id: 'qr', name: 'QR Code', icon: '⬛' },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedUpiApp(app.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          selectedUpiApp === app.id
                            ? 'border-primary bg-primary/10 font-bold'
                            : 'border-border bg-card hover:border-border/80'
                        }`}
                      >
                        <div className="text-base">{app.icon}</div>
                        <div className="text-[11px] mt-1">{app.name}</div>
                      </button>
                    ))}
                  </div>

                  {selectedUpiApp === 'qr' ? (
                    <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-center">
                      <div className="w-36 h-36 bg-white p-2 rounded-xl border shadow-sm flex items-center justify-center">
                        <QrCode className="w-32 h-32 text-slate-900" />
                      </div>
                      <p className="text-xs font-semibold text-foreground mt-2">
                        Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Exact payable amount: {formatPaise(gatewayOrder.amountPaise)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-foreground">Enter UPI ID</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          placeholder="e.g. mobile@upi or student@okhdfcbank"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setUpiId('library.student@upi')}
                          className="absolute right-2 top-2 text-[10px] px-2 py-1 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80"
                        >
                          Auto Fill
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        A payment collect request will be approved securely in your UPI app.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Cards Tab */}
              {gatewayMethod === 'CARD' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">Card Details</span>
                    <button
                      type="button"
                      onClick={() => {
                        setCardNumber('4012 8888 1881 1881');
                        setCardExpiry('12/28');
                        setCardCvv('981');
                        setCardHolder('STUDENT TEST CARD');
                      }}
                      className="text-[10px] text-primary hover:underline font-bold"
                    >
                      Fill Demo Test Card
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="Card Number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM / YY"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="CVV"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Cardholder Name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Net Banking Tab */}
              {gatewayMethod === 'NETBANKING' && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-foreground">Popular Indian Banks</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'HDFC', name: 'HDFC Bank' },
                      { id: 'SBI', name: 'State Bank of India' },
                      { id: 'ICICI', name: 'ICICI Bank' },
                      { id: 'AXIS', name: 'Axis Bank' },
                      { id: 'KOTAK', name: 'Kotak Mahindra' },
                      { id: 'PNB', name: 'Punjab National' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                          selectedBank === b.id
                            ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                            : 'border-border bg-card hover:bg-muted/40'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Desk Booking Summary Pill */}
              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-foreground">Desk {activeHold?.seat?.seatNumber}</span>
                  <span className="text-muted-foreground ml-1.5 font-normal">
                    ({activeHold?.shiftSlot?.replace('_', ' ')})
                  </span>
                </div>
                <div className="font-extrabold text-foreground">
                  {formatPaise(gatewayOrder.amountPaise)}
                </div>
              </div>
            </div>

            {/* Gateway Actions */}
            <div className="p-4 border-t border-border bg-muted/20 flex items-center gap-3">
              <button
                type="button"
                disabled={isAuthorizing}
                onClick={() => setGatewayOrder(null)}
                className="flex-1 py-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAuthorizing}
                onClick={handleCompleteGatewayPayment}
                className="flex-[2] py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
              >
                {isAuthorizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay {formatPaise(gatewayOrder.amountPaise)} Securely</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Success Modal */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-extrabold text-xl text-foreground">Booking Confirmed!</h3>
              <p className="text-muted-foreground text-xs mt-1">
                Your study desk has been secured. Your digital access pass is ready.
              </p>
            </div>

            <div className="bg-muted/40 p-4 rounded-xl border border-border/50 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desk:</span>
                <span className="font-bold">{confirmedBooking.seat?.seatNumber} ({confirmedBooking.seat?.seatType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-bold">{confirmedBooking.date?.split('T')[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shift:</span>
                <span className="font-bold">{confirmedBooking.shiftSlot}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Status:</span>
                <span className="font-bold text-emerald-500">
                  {confirmedBooking.totalPaidPaise >= confirmedBooking.agreedPricePaise ? 'Fully Paid' : `Token Paid (${formatPaise(confirmedBooking.totalPaidPaise)})`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => navigate('/bookings')}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90"
              >
                View Pass in My Bookings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
