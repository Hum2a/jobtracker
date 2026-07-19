export type { Application, Note, Reminder, Document, Stats, Status, DocumentType } from "../shared/schema";
export {
  STATUSES,
  DOCUMENT_TYPES,
  createApplicationSchema,
  updateApplicationSchema,
  createNoteSchema,
  createReminderSchema,
  importPayloadSchema,
  documentTypeSchema,
  isDueSoon,
} from "../shared/schema";

export interface Env {
  DATABASE_URL: string;
  API_KEY: string;
  DOCS: R2Bucket;
  RESEND_API_KEY?: string;
  DIGEST_TO?: string;
  DIGEST_FROM?: string;
  ASSETS: Fetcher;
}
