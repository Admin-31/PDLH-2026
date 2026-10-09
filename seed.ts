import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";
async function main() {
  await pool.query(`CREATE TABLE IF NOT EXISTS events (id SERIAL PRIMARY KEY,event_name TEXT NOT NULL,event_date DATE,event_location TEXT,event_logo_url TEXT,event_status TEXT NOT NULL DEFAULT 'active',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS participants (id SERIAL PRIMARY KEY,participant_code TEXT NOT NULL UNIQUE,full_name TEXT NOT NULL,institution TEXT,photo_url TEXT,registration_status TEXT NOT NULL DEFAULT 'terdaftar',created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS staff (id SERIAL PRIMARY KEY,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'petugas',active_status BOOLEAN NOT NULL DEFAULT TRUE,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS attendance (id SERIAL PRIMARY KEY,event_id INTEGER NOT NULL REFERENCES events(id),participant_id INTEGER NOT NULL REFERENCES participants(id),checkin_time TIMESTAMPTZ NOT NULL,received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),device_id TEXT,staff_id INTEGER REFERENCES staff(id),sync_status TEXT NOT NULL DEFAULT 'tersinkron',CONSTRAINT attendance_event_participant_unique UNIQUE(event_id,participant_id))`);
  await pool.query(`CREATE TABLE IF NOT EXISTS scan_logs (id SERIAL PRIMARY KEY,event_id INTEGER REFERENCES events(id),participant_id INTEGER REFERENCES participants(id),scanned_code TEXT NOT NULL,scan_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),result_status TEXT NOT NULL,device_id TEXT,staff_id INTEGER REFERENCES staff(id),sync_status TEXT NOT NULL DEFAULT 'tersinkron')`);
  await pool.query(`CREATE TABLE IF NOT EXISTS app_settings (id SERIAL PRIMARY KEY,event_id INTEGER REFERENCES events(id),logo_url TEXT,title TEXT NOT NULL DEFAULT 'Loket Kegiatan',subtitle TEXT DEFAULT 'Registrasi dan absensi peserta',primary_color TEXT DEFAULT '#155e63',background_color TEXT DEFAULT '#f4f7f8',welcome_message TEXT DEFAULT 'Selamat datang',success_message TEXT DEFAULT 'Check-in berhasil',duplicate_message TEXT DEFAULT 'Anda sudah terabsen',scanner_settings JSONB DEFAULT '{}'::jsonb,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  await pool.query(`INSERT INTO events(event_name,event_date,event_location) SELECT 'Konferensi Contoh','2026-11-20','Lokasi kegiatan' WHERE NOT EXISTS (SELECT 1 FROM events)`);
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "GantiPassword123!";
  const hash = await bcrypt.hash(password, 12);
  await pool.query(`INSERT INTO staff(username,password_hash,role) VALUES($1,$2,'admin') ON CONFLICT(username) DO NOTHING`, [username, hash]);
  await pool.query(`INSERT INTO app_settings(title,subtitle) SELECT 'Loket Kegiatan','Registrasi dan absensi peserta' WHERE NOT EXISTS (SELECT 1 FROM app_settings)`);
  for (let i=1; i<=50; i++) {
    const code = `EVT2026-${String(i).padStart(4,"0")}`;
    await pool.query(`INSERT INTO participants(participant_code,full_name,institution,registration_status) VALUES($1,$2,$3,'terdaftar') ON CONFLICT(participant_code) DO NOTHING`,
      [code, `Peserta Demo ${String(i).padStart(2,"0")}`, `Lembaga Demonstrasi ${((i-1)%10)+1}`]);
  }
  console.log(`Seed selesai. Login awal: ${username} / ${password}. Segera ganti password sebelum dipakai sungguhan.`);
  await pool.end();
}
main().catch(e=>{ console.error(e); process.exit(1); });