import { pgTable, serial, text, integer, boolean, timestamp, date, jsonb, unique } from "drizzle-orm/pg-core";
export const events = pgTable("events", {
  id: serial("id").primaryKey(), eventName: text("event_name").notNull(), eventDate: date("event_date"),
  eventLocation: text("event_location"), eventLogoUrl: text("event_logo_url"),
  eventStatus: text("event_status").notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const participants = pgTable("participants", {
  id: serial("id").primaryKey(), participantCode: text("participant_code").notNull().unique(),
  fullName: text("full_name").notNull(), institution: text("institution"), photoUrl: text("photo_url"),
  registrationStatus: text("registration_status").notNull().default("terdaftar"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(), username: text("username").notNull().unique(), passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("petugas"), activeStatus: boolean("active_status").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(), eventId: integer("event_id").notNull().references(() => events.id),
  participantId: integer("participant_id").notNull().references(() => participants.id),
  checkinTime: timestamp("checkin_time", { withTimezone: true }).notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(), deviceId: text("device_id"),
  staffId: integer("staff_id").references(() => staff.id), syncStatus: text("sync_status").notNull().default("tersinkron")
}, t => [unique("attendance_event_participant_unique").on(t.eventId, t.participantId)]);
export const scanLogs = pgTable("scan_logs", {
  id: serial("id").primaryKey(), eventId: integer("event_id").references(() => events.id),
  participantId: integer("participant_id").references(() => participants.id), scannedCode: text("scanned_code").notNull(),
  scanTime: timestamp("scan_time", { withTimezone: true }).defaultNow().notNull(), resultStatus: text("result_status").notNull(),
  deviceId: text("device_id"), staffId: integer("staff_id").references(() => staff.id), syncStatus: text("sync_status").notNull().default("tersinkron")
});
export const appSettings = pgTable("app_settings", {
  id: serial("id").primaryKey(), eventId: integer("event_id").references(() => events.id), logoUrl: text("logo_url"),
  title: text("title").notNull().default("Loket Kegiatan"), subtitle: text("subtitle").default("Registrasi dan absensi peserta"),
  primaryColor: text("primary_color").default("#155e63"), backgroundColor: text("background_color").default("#f4f7f8"),
  welcomeMessage: text("welcome_message").default("Selamat datang"), successMessage: text("success_message").default("Check-in berhasil"),
  duplicateMessage: text("duplicate_message").default("Anda sudah terabsen"), scannerSettings: jsonb("scanner_settings").$type<Record<string, unknown>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});