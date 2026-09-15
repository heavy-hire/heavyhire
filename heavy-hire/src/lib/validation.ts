import { z } from "zod";

export const equipmentCategories = [
  "CONSTRUCTION",
  "AGRICULTURAL",
  "HEAVY_TRANSPORT",
  "REFRIGERATED",
] as const;

export const equipmentCreateSchema = z.object({
  title: z.string().min(3).max(120),
  category: z.enum(equipmentCategories),
  description: z.string().min(10).max(5000),
  specs: z.record(z.any()).optional(),
  pricePerDay: z.number().positive(),
  pricePerWeek: z.number().positive().nullable().optional(),
  pricePerMonth: z.number().positive().nullable().optional(),
  location: z.string().min(2).max(200),
  city: z.string().min(2).max(100),
  country: z.string().min(2).max(100).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  images: z.array(z.string().url()).optional(),
  minHireDays: z.number().int().positive().max(365).optional(),
});

export const equipmentUpdateSchema = equipmentCreateSchema.partial().extend({
  isAvailable: z.boolean().optional(),
});

// Fields only an ADMIN may change.
export const equipmentAdminOnlyFields = ["isApproved", "isFeatured"] as const;

export const equipmentAdminUpdateSchema = z.object({
  isApproved: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
});

export const messageCreateSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const bookingTransitionSchema = z.object({
  action: z.enum(["pickup", "complete"]),
  photos: z.array(z.string().url()).min(1).max(10),
});

export const verificationSubmitSchema = z.object({
  idDocumentUrl: z.string().url(),
});

export const uploadPurposes = ["equipment", "verification", "booking-photo"] as const;

export const uploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  purpose: z.enum(uploadPurposes).default("equipment"),
});
