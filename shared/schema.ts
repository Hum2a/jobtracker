import { z } from "zod";

export const STATUSES = ["wishlist", "applied", "interview", "offer", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const DOCUMENT_TYPES = ["resume", "cover_letter"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const statusSchema = z.enum(STATUSES);
export const documentTypeSchema = z.enum(DOCUMENT_TYPES);

export const applicationSchema = z.object({
  id: z.number().int(),
  company: z.string(),
  roleTitle: z.string(),
  industry: z.string(),
  location: z.string().nullable(),
  jobUrl: z.string().nullable(),
  status: statusSchema,
  appliedDate: z.string().nullable(),
  salaryRange: z.string().nullable(),
  source: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  dueSoon: z.boolean().optional(),
});
export type Application = z.infer<typeof applicationSchema>;

export const noteSchema = z.object({
  id: z.number().int(),
  applicationId: z.number().int(),
  body: z.string(),
  createdAt: z.string(),
});
export type Note = z.infer<typeof noteSchema>;

export const reminderSchema = z.object({
  id: z.number().int(),
  applicationId: z.number().int(),
  dueDate: z.string(),
  message: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  dueSoon: z.boolean().optional(),
});
export type Reminder = z.infer<typeof reminderSchema>;

export const documentSchema = z.object({
  id: z.number().int(),
  type: documentTypeSchema,
  filename: z.string(),
  storageKey: z.string(),
  applicationId: z.number().int().nullable(),
  createdAt: z.string(),
});
export type Document = z.infer<typeof documentSchema>;

export const createApplicationSchema = z.object({
  company: z.string().min(1),
  roleTitle: z.string().min(1),
  industry: z.string().min(1),
  location: z.string().nullable().optional(),
  jobUrl: z.string().nullable().optional(),
  status: statusSchema.default("wishlist"),
  appliedDate: z.string().nullable().optional(),
  salaryRange: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type CreateApplication = z.infer<typeof createApplicationSchema>;

export const updateApplicationSchema = z.object({
  company: z.string().min(1).optional(),
  roleTitle: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  jobUrl: z.string().nullable().optional(),
  status: statusSchema.optional(),
  appliedDate: z.string().nullable().optional(),
  salaryRange: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
});
export type UpdateApplication = z.infer<typeof updateApplicationSchema>;

export const createNoteSchema = z.object({
  body: z.string().min(1),
});

export const createReminderSchema = z.object({
  dueDate: z.string().min(1),
  message: z.string().min(1),
});

export const importReminderSchema = z.object({
  dueDate: z.string().min(1),
  message: z.string().min(1),
});

export const importApplicationSchema = z.object({
  company: z.string().min(1),
  roleTitle: z.string().min(1),
  industry: z.string().min(1),
  status: statusSchema.default("wishlist"),
  location: z.string().nullable().optional(),
  jobUrl: z.string().nullable().optional(),
  appliedDate: z.string().nullable().optional(),
  salaryRange: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  notes: z.array(z.string()).optional(),
  reminders: z.array(importReminderSchema).optional(),
});

export const importPayloadSchema = z.object({
  applications: z.array(importApplicationSchema).min(1),
});

export const statsSchema = z.object({
  total: z.number(),
  openPipeline: z.number(),
  avgPerWeek: z.number(),
  remindersOpen: z.number(),
  remindersDueSoon: z.number(),
  byStatus: z.record(z.string(), z.number()),
  funnel: z.object({
    wishlistToApplied: z.number(),
    appliedToInterview: z.number(),
    interviewToOffer: z.number(),
  }),
  byIndustry: z.array(z.object({ name: z.string(), count: z.number() })),
  bySource: z.array(z.object({ name: z.string(), count: z.number() })),
  perWeek: z.array(z.object({ week: z.string(), count: z.number() })),
  perMonth: z.array(z.object({ month: z.string(), count: z.number() })),
  reminderHealth: z.object({
    open: z.number(),
    dueSoon: z.number(),
    completed: z.number(),
    overdue: z.number(),
  }),
});
export type Stats = z.infer<typeof statsSchema>;

/** Due soon = incomplete and due within 3 days (inclusive of today). */
export function isDueSoon(dueDate: string, completed: boolean, now = new Date()): boolean {
  if (completed) return false;
  const due = new Date(dueDate + (dueDate.length === 10 ? "T23:59:59" : ""));
  if (Number.isNaN(due.getTime())) return false;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 3);
  end.setHours(23, 59, 59, 999);
  return due >= start && due <= end;
}
