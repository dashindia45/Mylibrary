// ─── API Response Types ───

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── User Types ───

export interface UserProfile {
  id: string;
  name: string;
  status: string;
  contacts: UserContact[];
  roles: string[];
  membership?: MembershipSummary;
  emergencyContact?: string | null;
  createdAt: string;
}

export interface UserContact {
  id: string;
  type: 'EMAIL' | 'PHONE';
  value: string;
  isVerified: boolean;
  isPrimary: boolean;
}

// ─── Seat & Floor Types ───

export interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  description?: string;
  status: string;
  sections: Section[];
}

export interface Section {
  id: string;
  floorId: string;
  name: string;
  sectionType: string;
  description?: string;
  seats: Seat[];
}

export interface Seat {
  id: string;
  sectionId: string;
  seatNumber: string;
  seatType: string;
  amenities: string[];
  positionX: number;
  positionY: number;
  label?: string;
  status: string;
}

export interface SeatAvailability {
  seat: Seat;
  section: { id: string; name: string; sectionType: string };
  floor: { id: string; name: string; floorNumber: number };
  shifts: ShiftAvailability[];
}

export interface ShiftAvailability {
  shiftSlot: string;
  available: boolean;
  pricePaise: number;
  startTime: string;
  endTime: string;
}

// ─── Booking Types ───

export interface Booking {
  id: string;
  userId: string;
  seatId: string;
  date: string;
  shiftSlot: string;
  shiftStartTime: string;
  shiftEndTime: string;
  status: string;
  agreedPricePaise: number;
  totalPaidPaise: number;
  outstandingPaise: number;
  paymentOption: 'FULL' | 'TOKEN';
  holdExpiresAt?: string;
  seat: Seat;
  createdAt: string;
  updatedAt: string;
}

export interface BookingHold {
  holdId: string;
  seatId: string;
  date: string;
  shiftSlot: string;
  pricePaise: number;
  tokenAmountPaise: number;
  expiresAt: string;
}

// ─── Payment Types ───

export interface PaymentOrder {
  id: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  status: string;
}

export interface Payment {
  id: string;
  amountPaise: number;
  method: string;
  status: string;
  providerPaymentId?: string;
  receiptNumber?: string;
  createdAt: string;
}

// ─── Membership & Fee Types ───

export interface MembershipSummary {
  id: string;
  planName: string;
  status: string;
  startDate: string;
  endDate?: string;
  monthlyFeePaise: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  monthlyFeePaise: number;
  description?: string;
  features: string[];
  isActive: boolean;
}

export interface FeeInvoice {
  id: string;
  membershipId: string;
  billingMonth: string;
  amountPaise: number;
  adjustmentPaise: number;
  totalDuePaise: number;
  totalPaidPaise: number;
  outstandingPaise: number;
  dueDate: string;
  status: string;
  daysRemaining: number;
  overdueDays: number;
  payments: Payment[];
  createdAt: string;
}

export interface AdminFeeOverview {
  expectedCollectionPaise: number;
  totalCollectedPaise: number;
  totalOutstandingPaise: number;
  totalOverduePaise: number;
  paidCount: number;
  unpaidCount: number;
  dueTodayCount: number;
  overdueCount: number;
}

export interface AdminMemberFee {
  userId: string;
  userName: string;
  membershipId: string;
  contact: string;
  assignedSeat?: string;
  monthlyFeePaise: number;
  amountPaidPaise: number;
  outstandingPaise: number;
  billingMonth: string;
  dueDate: string;
  daysRemaining: number;
  overdueDays: number;
  feeStatus: string;
  lastPaymentDate?: string;
  lastReminderSent?: string;
}

// ─── Complaint Types ───

export interface Complaint {
  id: string;
  userId: string;
  category: string;
  severity: string;
  status: string;
  subject: string;
  description: string;
  messages: ComplaintMessage[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface ComplaintMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

// ─── Announcement & Notification Types ───

export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetAudience: string;
  publishedAt?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

// ─── Admin Dashboard Types ───

export interface AdminDashboard {
  seats: {
    total: number;
    available: number;
    held: number;
    booked: number;
    maintenance: number;
  };
  bookings: {
    todayConfirmed: number;
    todayCheckedIn: number;
    todayNoShow: number;
    todayExpected: number;
  };
  revenue: {
    todayPaise: number;
    monthPaise: number;
    outstandingBookingPaise: number;
  };
  fees: {
    monthlyExpectedPaise: number;
    monthlyCollectedPaise: number;
    totalOverduePaise: number;
    overdueCount: number;
    dueSoonCount: number;
  };
  complaints: {
    openCount: number;
    inProgressCount: number;
    resolvedTodayCount: number;
  };
  occupancy: {
    dailyPercent: number;
    weeklyAvgPercent: number;
  };
}

// ─── Shift Type ───

export interface ShiftType {
  id: string;
  slot: string;
  name: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}
