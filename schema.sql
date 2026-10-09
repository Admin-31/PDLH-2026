-- Skema PostgreSQL. Jalankan npm run db:push untuk membuat tabel dari Drizzle.
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY, event_name TEXT NOT NULL, event_date DATE,
  event_location TEXT, event_logo_url TEXT, event_status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS participants (
  id SERIAL PRIMARY KEY, participant_code TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL,
  institution TEXT, photo_url TEXT, registration_status TEXT NOT NULL DEFAULT 'terdaftar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'petugas', active_status BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY, event_id INTEGER NOT NULL REFERENCES events(id),
  participant_id INTEGER NOT NULL REFERENCES participants(id), checkin_time TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), device_id TEXT, staff_id INTEGER REFERENCES staff(id),
  sync_status TEXT NOT NULL DEFAULT 'tersinkron',
  CONSTRAINT attendance_event_participant_unique UNIQUE(event_id, participant_id)
);
CREATE TABLE IF NOT EXISTS scan_logs (
  id SERIAL PRIMARY KEY, event_id INTEGER REFERENCES events(id), participant_id INTEGER REFERENCES participants(id),
  scanned_code TEXT NOT NULL, scan_time TIMESTAMPTZ NOT NULL DEFAULT NOW(), result_status TEXT NOT NULL,
  device_id TEXT, staff_id INTEGER REFERENCES staff(id), sync_status TEXT NOT NULL DEFAULT 'tersinkron'
);
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY, event_id INTEGER REFERENCES events(id), logo_url TEXT,
  title TEXT NOT NULL DEFAULT 'Loket Kegiatan', subtitle TEXT DEFAULT 'Registrasi dan absensi peserta',
  primary_color TEXT DEFAULT '#155e63', background_color TEXT DEFAULT '#f4f7f8',
  welcome_message TEXT DEFAULT 'Selamat datang', success_message TEXT DEFAULT 'Check-in berhasil',
  duplicate_message TEXT DEFAULT 'Anda sudah terabsen', scanner_settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);