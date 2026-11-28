const { z } = require('zod');
const { ZONE_STATUSES } = require('../models/Zone.model');
const { USER_STATUSES } = require('../models/User.model');

const createZoneSchema = z
  .object({
    zoneCode: z
      .string({ required_error: 'Zone code is required' })
      .trim()
      .toUpperCase()
      .min(2, 'Zone code must be at least 2 characters')
      .max(40, 'Zone code cannot exceed 40 characters'),
    zoneName: z
      .string({ required_error: 'Zone name is required' })
      .trim()
      .min(2, 'Zone name must be at least 2 characters')
      .max(120, 'Zone name cannot exceed 120 characters'),
    description: z.string().trim().max(500).nullable().optional().default(null),
    status: z.enum(ZONE_STATUSES).optional().default('ACTIVE'),
  })
  .strict();

const updateZoneSchema = z
  .object({
    zoneCode: z.string().trim().toUpperCase().min(2).max(40).optional(),
    zoneName: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    status: z.enum(ZONE_STATUSES).optional(),
  })
  .strict();

const assignSupervisorSchema = z
  .object({
    supervisorId: z.string({ required_error: 'supervisorId is required' }).trim().min(1),
  })
  .strict();

const createSupervisorSchema = z
  .object({
    name: z
      .string({ required_error: 'Supervisor name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(120, 'Name cannot exceed 120 characters'),
    email: z
      .string({ required_error: 'Supervisor ID or Email is required' })
      .trim()
      .toLowerCase()
      .min(3, 'Supervisor ID / Email must be at least 3 characters')
      .max(120, 'Supervisor ID / Email cannot exceed 120 characters'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters')
      .max(128, 'Password cannot exceed 128 characters'),
    status: z.enum(USER_STATUSES).optional().default('ACTIVE'),
    zoneIds: z.array(z.string().trim()).optional().default([]),
  })
  .strict();

const updateSupervisorSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().min(3).max(120).optional(),
    password: z.string().min(6).max(128).optional(),
    status: z.enum(USER_STATUSES).optional(),
  })
  .strict();

module.exports = {
  createZoneSchema,
  updateZoneSchema,
  assignSupervisorSchema,
  createSupervisorSchema,
  updateSupervisorSchema,
};
