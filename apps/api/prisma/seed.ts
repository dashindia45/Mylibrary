import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Roles ───
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN', description: 'Full system access' },
    }),
    prisma.role.upsert({
      where: { name: 'LIBRARY_MANAGER' },
      update: {},
      create: { name: 'LIBRARY_MANAGER', description: 'Library management access' },
    }),
    prisma.role.upsert({
      where: { name: 'RECEPTION_STAFF' },
      update: {},
      create: { name: 'RECEPTION_STAFF', description: 'Check-in and booking verification' },
    }),
    prisma.role.upsert({
      where: { name: 'SUPPORT_STAFF' },
      update: {},
      create: { name: 'SUPPORT_STAFF', description: 'Complaints and support' },
    }),
    prisma.role.upsert({
      where: { name: 'MEMBER' },
      update: {},
      create: { name: 'MEMBER', description: 'Library member' },
    }),
  ]);
  console.log(`  ✅ ${roles.length} roles created`);

  // ─── Shift Types ───
  const shifts = await Promise.all([
    prisma.shiftType.upsert({
      where: { slot: 'FULL_DAY' },
      update: {},
      create: { slot: 'FULL_DAY', name: 'Full Day', startTime: '07:00', endTime: '22:00', sortOrder: 1 },
    }),
    prisma.shiftType.upsert({
      where: { slot: 'MORNING' },
      update: {},
      create: { slot: 'MORNING', name: 'Morning Half Day', startTime: '07:00', endTime: '13:00', sortOrder: 2 },
    }),
    prisma.shiftType.upsert({
      where: { slot: 'EVENING' },
      update: {},
      create: { slot: 'EVENING', name: 'Evening Half Day', startTime: '14:00', endTime: '22:00', sortOrder: 3 },
    }),
  ]);
  console.log(`  ✅ ${shifts.length} shift types created`);

  // ─── Operating Hours (Mon-Sat open, Sun closed) ───
  for (let day = 0; day < 7; day++) {
    await prisma.operatingHour.upsert({
      where: { dayOfWeek: day },
      update: {},
      create: {
        dayOfWeek: day,
        openTime: '07:00',
        closeTime: '22:00',
        isClosed: day === 0, // Sunday closed
      },
    });
  }
  console.log('  ✅ Operating hours created');

  // ─── Floors and Sections ───
  const floor1 = await prisma.floor.upsert({
    where: { floorNumber: 1 },
    update: {},
    create: { name: 'Ground Floor', floorNumber: 1, description: 'Main study hall' },
  });

  const floor2 = await prisma.floor.upsert({
    where: { floorNumber: 2 },
    update: {},
    create: { name: 'First Floor', floorNumber: 2, description: 'Premium & quiet zone' },
  });

  const section1 = await prisma.section.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      floorId: floor1.id,
      name: 'General Area',
      sectionType: 'GENERAL',
      description: 'Open study area with standard desks',
    },
  });

  const section2 = await prisma.section.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      floorId: floor1.id,
      name: 'AC Section',
      sectionType: 'AC',
      description: 'Air-conditioned study area',
    },
  });

  const section3 = await prisma.section.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      floorId: floor2.id,
      name: 'Quiet Zone',
      sectionType: 'QUIET_ZONE',
      description: 'Silent study area — no talking',
    },
  });

  const section4 = await prisma.section.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      floorId: floor2.id,
      name: 'Premium Cabins',
      sectionType: 'PREMIUM',
      description: 'Private study cabins with all amenities',
    },
  });

  console.log('  ✅ 2 floors, 4 sections created');

  // ─── Seats ───
  const seatConfigs = [
    // Ground Floor — General Area: 5 rows x 6 seats = 30 seats
    ...Array.from({ length: 30 }, (_, i) => ({
      sectionId: section1.id,
      seatNumber: `G${String(i + 1).padStart(2, '0')}`,
      seatType: 'STANDARD' as const,
      amenities: i % 3 === 0 ? ['CHARGING_POINT', 'WIFI'] : ['WIFI'],
      positionX: (i % 6) * 80 + 40,
      positionY: Math.floor(i / 6) * 70 + 40,
      label: `Row ${String.fromCharCode(65 + Math.floor(i / 6))}`,
    })),

    // Ground Floor — AC Section: 4 rows x 5 seats = 20 seats
    ...Array.from({ length: 20 }, (_, i) => ({
      sectionId: section2.id,
      seatNumber: `AC${String(i + 1).padStart(2, '0')}`,
      seatType: 'STANDARD' as const,
      amenities: ['AC', 'CHARGING_POINT', 'WIFI'],
      positionX: (i % 5) * 90 + 40,
      positionY: Math.floor(i / 5) * 70 + 40,
      label: `Row ${String.fromCharCode(65 + Math.floor(i / 5))}`,
    })),

    // First Floor — Quiet Zone: 3 rows x 5 seats = 15 seats
    ...Array.from({ length: 15 }, (_, i) => ({
      sectionId: section3.id,
      seatNumber: `Q${String(i + 1).padStart(2, '0')}`,
      seatType: i < 5 ? ('WINDOW' as const) : ('STANDARD' as const),
      amenities: i < 5 ? ['WINDOW', 'DESK_LAMP', 'CHARGING_POINT', 'WIFI'] : ['DESK_LAMP', 'CHARGING_POINT', 'WIFI'],
      positionX: (i % 5) * 90 + 40,
      positionY: Math.floor(i / 5) * 80 + 40,
      label: `Row ${String.fromCharCode(65 + Math.floor(i / 5))}`,
    })),

    // First Floor — Premium Cabins: 2 rows x 4 cabins = 8 cabins
    ...Array.from({ length: 8 }, (_, i) => ({
      sectionId: section4.id,
      seatNumber: `P${String(i + 1).padStart(2, '0')}`,
      seatType: 'CABIN' as const,
      amenities: ['AC', 'CHARGING_POINT', 'DESK_LAMP', 'LOCKER', 'WIFI'],
      positionX: (i % 4) * 120 + 60,
      positionY: Math.floor(i / 4) * 100 + 50,
      label: `Cabin ${String.fromCharCode(65 + Math.floor(i / 4))}`,
    })),
  ];

  let seatCount = 0;
  for (const seatConfig of seatConfigs) {
    await prisma.seat.upsert({
      where: {
        sectionId_seatNumber: {
          sectionId: seatConfig.sectionId,
          seatNumber: seatConfig.seatNumber,
        },
      },
      update: {},
      create: seatConfig,
    });
    seatCount++;
  }
  console.log(`  ✅ ${seatCount} seats created (30 General + 20 AC + 15 Quiet + 8 Premium)`);

  // ─── Pricing Rules ───
  const pricingConfigs = [
    // Full Day
    { shiftSlot: 'FULL_DAY', seatType: 'STANDARD', pricePaise: 150000 },  // ₹1,500
    { shiftSlot: 'FULL_DAY', seatType: 'WINDOW', pricePaise: 180000 },    // ₹1,800
    { shiftSlot: 'FULL_DAY', seatType: 'CABIN', pricePaise: 250000 },     // ₹2,500
    { shiftSlot: 'FULL_DAY', seatType: 'PREMIUM', pricePaise: 220000 },   // ₹2,200
    // Morning
    { shiftSlot: 'MORNING', seatType: 'STANDARD', pricePaise: 8000 },     // ₹80
    { shiftSlot: 'MORNING', seatType: 'WINDOW', pricePaise: 11000 },      // ₹110
    { shiftSlot: 'MORNING', seatType: 'CABIN', pricePaise: 20000 },       // ₹200
    { shiftSlot: 'MORNING', seatType: 'PREMIUM', pricePaise: 17000 },     // ₹170
    // Evening
    { shiftSlot: 'EVENING', seatType: 'STANDARD', pricePaise: 10000 },    // ₹100
    { shiftSlot: 'EVENING', seatType: 'WINDOW', pricePaise: 13000 },      // ₹130
    { shiftSlot: 'EVENING', seatType: 'CABIN', pricePaise: 22000 },       // ₹220
    { shiftSlot: 'EVENING', seatType: 'PREMIUM', pricePaise: 19000 },     // ₹190
  ];

  for (const pc of pricingConfigs) {
    const shift = shifts.find((s) => s.slot === pc.shiftSlot);
    if (!shift) continue;

    await prisma.pricingRule.upsert({
      where: {
        shiftTypeId_seatType: {
          shiftTypeId: shift.id,
          seatType: pc.seatType,
        },
      },
      update: { pricePaise: pc.pricePaise },
      create: {
        shiftTypeId: shift.id,
        seatType: pc.seatType,
        pricePaise: pc.pricePaise,
      },
    });
  }
  console.log(`  ✅ ${pricingConfigs.length} pricing rules created`);

  // ─── Library Settings ───
  const settings = [
    { key: 'token_amount_paise', value: '10000', label: 'Booking Token Amount (paise)', category: 'booking' },
    { key: 'hold_duration_minutes', value: '10', label: 'Seat Hold Duration (minutes)', category: 'booking' },
    { key: 'reservation_window_hours', value: '48', label: 'Reservation Window (hours)', category: 'booking' },
    { key: 'checkin_grace_minutes', value: '30', label: 'Check-in Grace Period (minutes)', category: 'booking' },
    { key: 'cancellation_deadline_hours', value: '2', label: 'Cancellation Deadline (hours before shift)', category: 'booking' },
    { key: 'waitlist_claim_minutes', value: '15', label: 'Waitlist Claim Window (minutes)', category: 'booking' },
    { key: 'library_name', value: 'MyLibrary Study Hub', label: 'Library Name', category: 'general' },
    { key: 'library_address', value: '123 Study Lane, Knowledge Park, Noida, UP 201301', label: 'Library Address', category: 'general' },
    { key: 'library_phone', value: '+91-9876543210', label: 'Library Phone', category: 'general' },
    { key: 'library_email', value: 'info@mylibrary.in', label: 'Library Email', category: 'general' },
    { key: 'fee_due_day', value: '5', label: 'Monthly Fee Due Day', category: 'fees' },
    { key: 'late_fee_enabled', value: 'false', label: 'Enable Late Fees', category: 'fees' },
    { key: 'late_fee_per_day_paise', value: '5000', label: 'Late Fee Per Day (paise)', category: 'fees' },
  ];

  for (const s of settings) {
    await prisma.librarySetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`  ✅ ${settings.length} library settings created`);

  // ─── Membership Plans ───
  await prisma.membershipPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      name: 'Basic',
      monthlyFeePaise: 200000, // ₹2,000
      description: 'Access to general and AC sections',
      features: ['General area access', 'AC section access', 'WiFi', 'Charging points'],
    },
  });

  await prisma.membershipPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      name: 'Premium',
      monthlyFeePaise: 350000, // ₹3,500
      description: 'Full access including quiet zone and premium cabins',
      features: ['All section access', 'Premium cabin access', 'Quiet zone', 'Locker', 'All amenities'],
    },
  });

  await prisma.membershipPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000012',
      name: 'Student',
      monthlyFeePaise: 150000, // ₹1,500
      description: 'Discounted plan for students with valid ID',
      features: ['General area access', 'AC section access', 'WiFi', 'Student discount'],
    },
  });
  console.log('  ✅ 3 membership plans created');

  // ─── Admin User ───
  const superAdminRole = roles.find((r) => r.name === 'SUPER_ADMIN')!;
  const adminUser = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000100' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000100',
      name: 'Library Admin',
      contacts: {
        create: {
          type: 'EMAIL',
          value: 'admin@mylibrary.in',
          isVerified: true,
          isPrimary: true,
        },
      },
      userRoles: {
        create: { roleId: superAdminRole.id },
      },
    },
  });
  console.log(`  ✅ Admin user created (admin@mylibrary.in)`);

  console.log('\n✅ Seed complete!');
  console.log('📊 Summary: 5 roles, 3 shifts, 2 floors, 4 sections, 73 seats, 12 pricing rules, 3 plans');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
