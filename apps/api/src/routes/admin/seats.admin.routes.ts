import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database.js';
import { authenticate, requireStaff, requireAdmin } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createSeatSchema, updateSeatSchema } from '@mylibrary/shared';

const router = Router();
router.use(authenticate, requireStaff);

/**
 * POST /api/v1/admin/seats
 * Create a new seat in a section.
 */
router.post(
  '/seats',
  requireAdmin,
  validateBody(createSeatSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const seat = await prisma.seat.create({
        data: {
          sectionId: req.body.sectionId,
          seatNumber: req.body.seatNumber,
          seatType: req.body.seatType,
          amenities: req.body.amenities || [],
          positionX: req.body.positionX || 0,
          positionY: req.body.positionY || 0,
          label: req.body.label,
          status: 'ACTIVE',
        },
        include: { section: { include: { floor: true } } },
      });
      res.status(201).json({ success: true, data: seat });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/seats/:id
 * Update seat details, status, or amenities.
 */
router.patch(
  '/seats/:id',
  requireAdmin,
  validateBody(updateSeatSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const seat = await prisma.seat.update({
        where: { id },
        data: req.body,
        include: { section: { include: { floor: true } } },
      });
      res.json({ success: true, data: seat });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/seats/:id/block
 * Block seat for maintenance or administrative hold.
 */
router.post(
  '/seats/:id/block',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { reason, startDate, endDate } = req.body;
      const block = await prisma.seatBlock.create({
        data: {
          seatId: id,
          reason: reason || 'Maintenance',
          startDate: new Date(startDate || Date.now()),
          endDate: endDate ? new Date(endDate) : null,
          createdBy: req.user!.userId,
        },
      });

      // Update seat status
      await prisma.seat.update({
        where: { id },
        data: { status: 'MAINTENANCE' },
      });

      res.status(201).json({ success: true, data: block });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/seats/:id
 * Permanently delete a seat.
 */
router.delete(
  '/seats/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check active bookings
      const activeBookings = await prisma.booking.count({
        where: {
          seatId: id,
          date: { gte: today },
          status: { in: ['HELD', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CHECKED_IN'] },
        },
      });

      if (activeBookings > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ACTIVE_BOOKINGS',
            message: `Cannot delete seat with ${activeBookings} active booking(s). Mark as MAINTENANCE or cancel bookings first.`,
          },
        });
        return;
      }

      // Delete blocks and past bookings then delete seat
      await prisma.seatBlock.deleteMany({ where: { seatId: id } });
      await prisma.booking.deleteMany({ where: { seatId: id } });
      await prisma.seat.delete({ where: { id } });

      res.json({ success: true, message: 'Seat deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════
// FLOOR MANAGEMENT
// ═══════════════════════════════════════════════

/**
 * POST /api/v1/admin/floors
 * Create a new library floor.
 */
router.post(
  '/floors',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, floorNumber, description, status } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: { message: 'Floor name is required' } });
        return;
      }

      // Compute next floor number if not specified
      let fNum = typeof floorNumber === 'number' ? floorNumber : parseInt(floorNumber, 10);
      if (isNaN(fNum)) {
        const highest = await prisma.floor.findFirst({ orderBy: { floorNumber: 'desc' } });
        fNum = (highest?.floorNumber ?? -1) + 1;
      }

      const floor = await prisma.floor.create({
        data: {
          name,
          floorNumber: fNum,
          description: description || null,
          status: status || 'ACTIVE',
        },
        include: { sections: { include: { seats: true } } },
      });

      res.status(201).json({ success: true, data: floor });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/floors/:id
 * Update floor details.
 */
router.patch(
  '/floors/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { name, floorNumber, description, status } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (floorNumber !== undefined) data.floorNumber = parseInt(floorNumber, 10);
      if (description !== undefined) data.description = description;
      if (status !== undefined) data.status = status;

      const floor = await prisma.floor.update({
        where: { id },
        data,
        include: { sections: { include: { seats: true } } },
      });

      res.json({ success: true, data: floor });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/floors/:id
 * Delete a floor and all its sections and seats.
 */
router.delete(
  '/floors/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check active bookings on this floor
      const activeBookings = await prisma.booking.count({
        where: {
          seat: { section: { floorId: id } },
          date: { gte: today },
          status: { in: ['HELD', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CHECKED_IN'] },
        },
      });

      if (activeBookings > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ACTIVE_BOOKINGS',
            message: `Cannot delete floor with ${activeBookings} active booking(s). You can set its status to INACTIVE instead.`,
          },
        });
        return;
      }

      // Delete floor (cascade deletes sections and seats)
      await prisma.floor.delete({ where: { id } });

      res.json({ success: true, message: 'Floor removed successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════
// SECTION MANAGEMENT
// ═══════════════════════════════════════════════

/**
 * POST /api/v1/admin/sections
 * Create a section in a floor.
 */
router.post(
  '/sections',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { floorId, name, sectionType, description } = req.body;
      if (!floorId || !name) {
        res.status(400).json({ success: false, error: { message: 'floorId and name are required' } });
        return;
      }

      const section = await prisma.section.create({
        data: {
          floorId,
          name,
          sectionType: sectionType || 'GENERAL',
          description: description || null,
        },
        include: { seats: true },
      });

      res.status(201).json({ success: true, data: section });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/sections/:id
 * Update section.
 */
router.patch(
  '/sections/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { name, sectionType, description } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (sectionType !== undefined) data.sectionType = sectionType;
      if (description !== undefined) data.description = description;

      const section = await prisma.section.update({
        where: { id },
        data,
        include: { seats: true },
      });

      res.json({ success: true, data: section });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/sections/:id
 * Delete a section.
 */
router.delete(
  '/sections/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeBookings = await prisma.booking.count({
        where: {
          seat: { sectionId: id },
          date: { gte: today },
          status: { in: ['HELD', 'CONFIRMED', 'PARTIALLY_PAID', 'PAID', 'CHECKED_IN'] },
        },
      });

      if (activeBookings > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'ACTIVE_BOOKINGS',
            message: `Cannot delete section with ${activeBookings} active booking(s).`,
          },
        });
        return;
      }

      await prisma.section.delete({ where: { id } });
      res.json({ success: true, message: 'Section deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

// ═══════════════════════════════════════════════
// SEAT TYPE CONFIGURATION
// ═══════════════════════════════════════════════

/**
 * GET /api/v1/admin/seat-types
 * List all seat types (active & inactive).
 */
router.get(
  '/seat-types',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const seatTypes = await prisma.seatTypeConfig.findMany({
        orderBy: { createdAt: 'asc' },
      });

      // Also attach seat counts per type
      const seats = await prisma.seat.groupBy({
        by: ['seatType'],
        _count: { id: true },
      });
      const countsMap = Object.fromEntries(seats.map((s) => [s.seatType, s._count.id]));

      const data = seatTypes.map((st) => ({
        ...st,
        deskCount: countsMap[st.code] || 0,
      }));

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/admin/seat-types
 * Create a new seat type and its pricing rules.
 */
router.post(
  '/seat-types',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, name, description, color, defaultPricePaise } = req.body;
      if (!code || !name) {
        res.status(400).json({ success: false, error: { message: 'Code and name are required' } });
        return;
      }

      const normalizedCode = code.toUpperCase().trim().replace(/[^A-Z0-9_]/g, '_');

      const existing = await prisma.seatTypeConfig.findUnique({
        where: { code: normalizedCode },
      });
      if (existing) {
        res.status(400).json({
          success: false,
          error: { message: `Seat type with code ${normalizedCode} already exists.` },
        });
        return;
      }

      const pricePaise = parseInt(defaultPricePaise || '50000', 10);

      const seatType = await prisma.seatTypeConfig.create({
        data: {
          code: normalizedCode,
          name,
          description: description || null,
          color: color || 'blue',
          defaultPricePaise: pricePaise,
          isActive: true,
        },
      });

      // Auto-create pricing rules for all active shift types
      const activeShifts = await prisma.shiftType.findMany({ where: { isActive: true } });
      for (const shift of activeShifts) {
        const multiplier = shift.slot === 'FULL_DAY' ? 1.0 : 0.6;
        const shiftPrice = Math.round(pricePaise * multiplier);
        await prisma.pricingRule.upsert({
          where: {
            shiftTypeId_seatType: {
              shiftTypeId: shift.id,
              seatType: normalizedCode,
            },
          },
          update: { pricePaise: shiftPrice, isActive: true },
          create: {
            shiftTypeId: shift.id,
            seatType: normalizedCode,
            pricePaise: shiftPrice,
            isActive: true,
          },
        });
      }

      res.status(201).json({ success: true, data: seatType });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/v1/admin/seat-types/:id
 * Update an existing seat type.
 */
router.patch(
  '/seat-types/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const { name, description, color, defaultPricePaise, isActive } = req.body;
      const data: any = {};
      if (name !== undefined) data.name = name;
      if (description !== undefined) data.description = description;
      if (color !== undefined) data.color = color;
      if (defaultPricePaise !== undefined) data.defaultPricePaise = parseInt(defaultPricePaise, 10);
      if (isActive !== undefined) data.isActive = !!isActive;

      const seatType = await prisma.seatTypeConfig.update({
        where: { id },
        data,
      });

      // Update pricing rules if default price changed
      if (defaultPricePaise !== undefined) {
        const pricePaise = parseInt(defaultPricePaise, 10);
        const activeShifts = await prisma.shiftType.findMany({ where: { isActive: true } });
        for (const shift of activeShifts) {
          const multiplier = shift.slot === 'FULL_DAY' ? 1.0 : 0.6;
          await prisma.pricingRule.updateMany({
            where: {
              shiftTypeId: shift.id,
              seatType: seatType.code,
            },
            data: { pricePaise: Math.round(pricePaise * multiplier) },
          });
        }
      }

      res.json({ success: true, data: seatType });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/v1/admin/seat-types/:id
 * Delete or deactivate a seat type.
 */
router.delete(
  '/seat-types/:id',
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const seatType = await prisma.seatTypeConfig.findUnique({ where: { id } });
      if (!seatType) {
        res.status(404).json({ success: false, error: { message: 'Seat type not found' } });
        return;
      }

      // Check if any seats currently use this seat type
      const seatsCount = await prisma.seat.count({
        where: { seatType: seatType.code },
      });

      if (seatsCount > 0) {
        // Safe action: deactivate it so it doesn't show in new filters or creation dropdowns
        await prisma.seatTypeConfig.update({
          where: { id },
          data: { isActive: false },
        });
        res.json({
          success: true,
          message: `Seat type is assigned to ${seatsCount} desk(s). It has been deactivated and removed from live filters.`,
        });
        return;
      }

      // If no seats use it, permanently delete seat type and pricing rules
      await prisma.pricingRule.deleteMany({ where: { seatType: seatType.code } });
      await prisma.seatTypeConfig.delete({ where: { id } });

      res.json({ success: true, message: 'Seat type deleted permanently' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
