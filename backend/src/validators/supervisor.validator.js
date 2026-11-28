const { z } = require('zod');

const verifyIncidentSchema = z
  .object({
    verificationStatus: z.enum(['VERIFIED', 'REJECTED'], {
      required_error: 'verificationStatus is required (VERIFIED or REJECTED)',
      invalid_type_error: 'verificationStatus must be VERIFIED or REJECTED',
    }),
    verificationNotes: z
      .string({ required_error: 'verificationNotes are mandatory' })
      .trim()
      .min(3, 'verificationNotes must be at least 3 characters')
      .max(1000, 'verificationNotes cannot exceed 1000 characters'),
    confirmedWorkerId: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

const resolveIncidentSchema = z
  .object({
    resolutionNotes: z
      .string({ required_error: 'resolutionNotes are mandatory' })
      .trim()
      .min(3, 'resolutionNotes must be at least 3 characters')
      .max(1000, 'resolutionNotes cannot exceed 1000 characters'),
  })
  .strict();

module.exports = { verifyIncidentSchema, resolveIncidentSchema };
