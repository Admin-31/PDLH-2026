import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
const app = express();
const port = Number(process.env.PORT || 3000);
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req,file,cb) => cb(null, /image\/(png|jpeg|webp|gif|svg\+xml)/.test(file.mimetype)) });
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" }, contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(session({
  name: "loket.sid", secret: process.env.SESSION_SECRET || "dev-only-change-this-secret-now",
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 8*60*60*1000 }
}));
app.use("/uploads", express.static(uploadDir));
const distDir = path.resolve("dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) return next();
    res.sendFile(path.join(distDir, "index.html"));
  });
}
declare module "express-session" { interface SessionData { staff?: { id:number; username:string; role:string } } }
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => req.session.staff ? next() : res.status(401).json({ error:"Silakan masuk terlebih dahulu." });
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => req.session.staff?.role === "admin" ? next() : res.status(403).json({ error:"Akses khusus administrator." });
app.get("/api/health", async (_req,res) => { try { await pool.query("SELECT 1"); res.json({ok:true}); } catch { res.status(503).json({ok:false,error:"Database belum terhubung"}); } });
app.post("/api/auth/login", async (req,res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string") return res.status(400).json({error:"Nama pengguna dan kata sandi wajib diisi."});
  try {
    const result = await pool.query("SELECT id,username,password_hash,role,active_status FROM staff WHERE username=$1", [username]);
    const user = result.rows[0];
    if (!user || !user.active_status || !(await bcrypt.compare(password,user.password_hash))) return res.status(401).json({error:"Nama pengguna atau kata sandi tidak sesuai."});
    req.session.staff = { id:user.id, username:user.username, role:user.role };
    res.json({staff:req.session.staff});
  } catch { res.status(500).json({error:"Gagal memproses login. Periksa konfigurasi database."}); }
});
app.post("/api/auth/logout", (req,res) => req.session.destroy(()=>res.json({ok:true})));
app.get("/api/auth/me", (req,res) => res.json({staff:req.session.staff || null}));
app.get("/api/events/active", requireAuth, async (_req,res) => {
  const r=await pool.query("SELECT * FROM events WHERE event_status='active' ORDER BY id LIMIT 1");
  res.json(r.rows[0] || null);
});
app.get("/api/settings", requireAuth, async (_req,res) => {
  const r=await pool.query("SELECT * FROM app_settings ORDER BY id LIMIT 1"); res.json(r.rows[0] || {});
});
app.put("/api/settings", requireAuth, requireAdmin, async (req,res) => {
  const allowed=["title","subtitle","logo_url","primary_color","background_color","welcome_message","success_message","duplicate_message"];
  const body=req.body || {};
  const values=allowed.map(k=>body[k] ?? null);
  const result=await pool.query(`UPDATE app_settings SET title=COALESCE($1,title),subtitle=COALESCE($2,subtitle),logo_url=COALESCE($3,logo_url),primary_color=COALESCE($4,primary_color),background_color=COALESCE($5,background_color),welcome_message=COALESCE($6,welcome_message),success_message=COALESCE($7,success_message),duplicate_message=COALESCE($8,duplicate_message),updated_at=NOW() WHERE id=(SELECT id FROM app_settings ORDER BY id LIMIT 1) RETURNING *`,values);
  res.json(result.rows[0] || {});
});
app.post("/api/upload", requireAuth, requireAdmin, upload.single("image"), (req,res) => {
  if (!req.file) return res.status(400).json({error:"Pilih berkas gambar (maksimal 5 MB)."});
  const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g,"") || ".img";
  const finalName = `${randomUUID()}${ext}`;
  fs.renameSync(req.file.path,path.join(uploadDir,finalName));
  res.json({url:`/uploads/${finalName}`});
});
app.get("/api/participants", requireAuth, async (req,res) => {
  const q=String(req.query.q || "").trim();
  const result=await pool.query(`SELECT p.*, a.checkin_time FROM participants p LEFT JOIN attendance a ON a.participant_id=p.id AND a.event_id=(SELECT id FROM events WHERE event_status='active' ORDER BY id LIMIT 1) WHERE ($1='' OR p.participant_code ILIKE $2 OR p.full_name ILIKE $2 OR COALESCE(p.institution,'') ILIKE $2) ORDER BY p.id LIMIT 1000`,[q,`%${q}%`]);
  res.json(result.rows);
});
app.post("/api/participants", requireAuth, requireAdmin, async (req,res) => {
  const {participant_code,full_name,institution="",photo_url="",registration_status="terdaftar"}=req.body||{};
  if (!participant_code?.trim() || !full_name?.trim()) return res.status(400).json({error:"ID peserta dan nama lengkap wajib diisi."});
  try { const r=await pool.query("INSERT INTO participants(participant_code,full_name,institution,photo_url,registration_status) VALUES($1,$2,$3,$4,$5) RETURNING *",[participant_code.trim(),full_name.trim(),institution,photo_url,registration_status]); res.status(201).json(r.rows[0]); }
  catch(e:any) { res.status(e.code==="23505"?409:500).json({error:e.code==="23505"?"ID peserta sudah digunakan.":"Gagal menyimpan peserta."}); }
});
app.put("/api/participants/:id", requireAuth, requireAdmin, async (req,res) => {
  const {participant_code,full_name,institution="",photo_url="",registration_status="terdaftar"}=req.body||{};
  if (!participant_code?.trim() || !full_name?.trim()) return res.status(400).json({error:"ID peserta dan nama lengkap wajib diisi."});
  try { const r=await pool.query("UPDATE participants SET participant_code=$1,full_name=$2,institution=$3,photo_url=$4,registration_status=$5,updated_at=NOW() WHERE id=$6 RETURNING *",[participant_code,full_name,institution,photo_url,registration_status,req.params.id]); res.json(r.rows[0]||null); }
  catch(e:any) { res.status(e.code==="23505"?409:500).json({error:e.code==="23505"?"ID peserta sudah digunakan.":"Gagal memperbarui peserta."}); }
});
app.delete("/api/participants/:id", requireAuth, requireAdmin, async (req,res) => {
  try { await pool.query("DELETE FROM participants WHERE id=$1",[req.params.id]); res.json({ok:true}); } catch { res.status(409).json({error:"Peserta memiliki riwayat kehadiran dan tidak dapat dihapus."}); }
});
app.post("/api/participants/import", requireAuth, requireAdmin, async (req,res) => {
  const rows=req.body?.rows;
  if (!Array.isArray(rows) || rows.length>5000) return res.status(400).json({error:"Data CSV tidak valid atau terlalu banyak."});
  let inserted=0, skipped=0;
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of rows) {
      if (!row.participant_code || !row.full_name) { skipped++; continue; }
      const r=await client.query("INSERT INTO participants(participant_code,full_name,institution,photo_url,registration_status) VALUES($1,$2,$3,$4,$5) ON CONFLICT(participant_code) DO NOTHING",[String(row.participant_code).trim(),String(row.full_name).trim(),row.institution||"",row.photo_url||"",row.registration_status||"terdaftar"]);
      if(r.rowCount) inserted++; else skipped++;
    }
    await client.query("COMMIT"); res.json({inserted,skipped});
  } catch { await client.query("ROLLBACK"); res.status(500).json({error:"Impor gagal; tidak ada perubahan yang disimpan."}); } finally { client.release(); }
});
app.get("/api/attendance", requireAuth, async (req,res) => {
  const q=String(req.query.q||"").trim();
  const r=await pool.query(`SELECT a.id,p.participant_code,p.full_name,p.institution,a.checkin_time,a.sync_status,s.username AS staff_username FROM attendance a JOIN participants p ON p.id=a.participant_id LEFT JOIN staff s ON s.id=a.staff_id WHERE ($1='' OR p.participant_code ILIKE $2 OR p.full_name ILIKE $2 OR COALESCE(p.institution,'') ILIKE $2) ORDER BY a.checkin_time DESC LIMIT 2000`,[q,`%${q}%`]); res.json(r.rows);
});
app.get("/api/stats", requireAuth, async (_req,res) => {
  const r=await pool.query(`SELECT (SELECT COUNT(*) FROM participants)::int AS total, (SELECT COUNT(*) FROM attendance WHERE event_id=(SELECT id FROM events WHERE event_status='active' ORDER BY id LIMIT 1))::int AS hadir, (SELECT COUNT(*) FROM scan_logs WHERE scan_time::date=CURRENT_DATE)::int AS scan_hari_ini`);
  const row=r.rows[0]||{total:0,hadir:0,scan_hari_ini:0}; res.json({...row,belum:row.total-row.hadir,persentase:row.total?Math.round(row.hadir/row.total*100):0});
});
app.post("/api/checkin", requireAuth, async (req,res) => {
  const { participant_code, transaction_id, local_time, device_id }=req.body||{};
  if (typeof participant_code!=="string" || !participant_code.trim()) return res.status(400).json({status:"invalid",message:"ID Tidak Valid"});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    const event=(await client.query("SELECT id FROM events WHERE event_status='active' ORDER BY id LIMIT 1")).rows[0];
    if(!event) { await client.query("ROLLBACK"); return res.status(500).json({error:"Belum ada kegiatan aktif."}); }
    // Idempotensi transaksi offline: transaksi yang sama tidak diproses ulang.
    if(transaction_id) {
      const seen=await client.query("SELECT id FROM scan_logs WHERE scanned_code=$1 AND event_id=$2 AND device_id=$3 AND result_status='transaksi_offline' LIMIT 1",[transaction_id,event.id,device_id||""]);
      if(seen.rowCount) { await client.query("COMMIT"); return res.json({status:"synced",message:"Transaksi ini sudah diterima server."}); }
    }
    const normalized=participant_code.trim();
    const p=(await client.query("SELECT * FROM participants WHERE participant_code=$1",[normalized])).rows[0];
    if(!p) {
      await client.query("INSERT INTO scan_logs(event_id,scanned_code,result_status,device_id,staff_id) VALUES($1,$2,'tidak_ditemukan',$3,$4)",[event.id,normalized,device_id||null,req.session.staff?.id||null]);
      await client.query("COMMIT"); return res.status(404).json({status:"not_found",message:"Peserta Tidak Terdaftar"});
    }
    if(p.registration_status!=="terdaftar") { await client.query("COMMIT"); return res.status(403).json({status:"inactive",message:"Status registrasi peserta tidak aktif.",participant:p}); }
    const existing=(await client.query("SELECT checkin_time FROM attendance WHERE event_id=$1 AND participant_id=$2",[event.id,p.id])).rows[0];
    if(existing) {
      await client.query("INSERT INTO scan_logs(event_id,participant_id,scanned_code,result_status,device_id,staff_id) VALUES($1,$2,$3,'sudah_hadir',$4,$5)",[event.id,p.id,normalized,device_id||null,req.session.staff?.id||null]);
      await client.query("COMMIT"); return res.json({status:"duplicate",message:"Anda Sudah Terabsen",checkin_time:existing.checkin_time,participant:p});
    }
    const time=local_time && !Number.isNaN(Date.parse(local_time)) ? new Date(local_time) : new Date();
    const ins=await client.query("INSERT INTO attendance(event_id,participant_id,checkin_time,staff_id,device_id,sync_status) VALUES($1,$2,$3,$4,$5,'tersinkron') ON CONFLICT(event_id,participant_id) DO NOTHING RETURNING checkin_time",[event.id,p.id,time,req.session.staff?.id||null,device_id||null]);
    if(!ins.rowCount) {
      const prior=(await client.query("SELECT checkin_time FROM attendance WHERE event_id=$1 AND participant_id=$2",[event.id,p.id])).rows[0];
      await client.query("COMMIT"); return res.json({status:"duplicate",message:"Anda Sudah Terabsen",checkin_time:prior.checkin_time,participant:p});
    }
    await client.query("INSERT INTO scan_logs(event_id,participant_id,scanned_code,result_status,device_id,staff_id) VALUES($1,$2,$3,$4,$5,$6)",[event.id,p.id,normalized,transaction_id?"transaksi_offline":"berhasil",device_id||null,req.session.staff?.id||null]);
    await client.query("COMMIT"); res.json({status:"success",message:"Check-in Berhasil",checkin_time:time,participant:p});
  } catch(e) { await client.query("ROLLBACK"); console.error(e); res.status(500).json({error:"Check-in gagal diproses. Data belum dinyatakan tersimpan."}); } finally { client.release(); }
});
app.get("/api/offline/snapshot", requireAuth, async (_req,res) => {
  const [p,e,s]=await Promise.all([pool.query("SELECT id,participant_code,full_name,institution,photo_url,registration_status FROM participants"),pool.query("SELECT * FROM events WHERE event_status='active' ORDER BY id LIMIT 1"),pool.query("SELECT id,checkin_time FROM attendance WHERE event_id=(SELECT id FROM events WHERE event_status='active' ORDER BY id LIMIT 1)")]);
  res.json({participants:p.rows,event:e.rows[0]||null,attendance:s.rows});
});
app.post("/api/offline/sync", requireAuth, async (req,res) => {
  const items=req.body?.items;
  if(!Array.isArray(items)||items.length>500) return res.status(400).json({error:"Antrean sinkronisasi tidak valid."});
  const results=[];
  for(const item of items) {
    try {
      const r=await fetch(`http://127.0.0.1:${port}/api/checkin`,{method:"POST",headers:{"Content-Type":"application/json","Cookie":req.headers.cookie||""},body:JSON.stringify(item)});
      const data=await r.json(); results.push({transaction_id:item.transaction_id,status:r.ok?data.status:"failed",message:data.message||data.error||"Gagal"});
    } catch { results.push({transaction_id:item.transaction_id,status:"failed",message:"Gagal menghubungi server"}); }
  }
  res.json({results});
});
app.get("/api/export/participants.csv", requireAuth, async (_req,res) => {
  const r=await pool.query("SELECT id,participant_code,full_name,institution,photo_url,registration_status FROM participants ORDER BY id");
  const csv=["participant_code,full_name,institution,photo_url,registration_status",...r.rows.map(x=>[x.participant_code,x.full_name,x.institution,x.photo_url,x.registration_status].map((v:any)=>`"${String(v??"").replace(/"/g,'""')}"`).join(","))].join("\r\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8"); res.setHeader("Content-Disposition",'attachment; filename="peserta.csv"'); res.send("\uFEFF"+csv);
});
app.get("/api/export/attendance.csv", requireAuth, async (_req,res) => {
  const r=await pool.query("SELECT p.participant_code,p.full_name,p.institution,a.checkin_time,a.sync_status FROM attendance a JOIN participants p ON p.id=a.participant_id ORDER BY a.checkin_time DESC");
  const csv=["participant_code,full_name,institution,checkin_time,sync_status",...r.rows.map(x=>[x.participant_code,x.full_name,x.institution,x.checkin_time,x.sync_status].map((v:any)=>`"${String(v??"").replace(/"/g,'""')}"`).join(","))].join("\r\n");
  res.setHeader("Content-Type","text/csv; charset=utf-8"); res.setHeader("Content-Disposition",'attachment; filename="laporan-kehadiran.csv"'); res.send("\uFEFF"+csv);
});
app.use((err:any,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{ console.error(err); res.status(500).json({error:"Terjadi kesalahan pada server."}); });
app.listen(port,"0.0.0.0",()=>console.log(`Server API berjalan pada port ${port}`));