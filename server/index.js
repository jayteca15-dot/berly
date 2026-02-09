import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET =
  process.env.JWT_SECRET ||
  // Fallback secret for local/offline usage. For production, set JWT_SECRET.
  "berlybeauty_change_me_in_env";

const ADMIN_EMAIL_DEFAULT = process.env.ADMIN_EMAIL || "jayteca15@gmail.com";
const ADMIN_PASSWORD_DEFAULT = process.env.ADMIN_PASSWORD || "Berly2026";

const ADMIN_FILE = path.join(__dirname, "admin.json");

const COOKIE_NAME = "berly_admin_session";
const IS_PROD = process.env.NODE_ENV === "production";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

function signToken(email) {
  return jwt.sign({ sub: email, role: "admin" }, JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function getTokenFromCookie(req) {
  return req.cookies?.[COOKIE_NAME] || null;
}

function readJsonSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeJsonSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

async function ensureAdminRecord() {
  const existing = readJsonSafe(ADMIN_FILE);
  if (existing?.email && existing?.passwordHash) return existing;

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD_DEFAULT, 12);
  const record = {
    email: ADMIN_EMAIL_DEFAULT,
    passwordHash,
    updatedAt: new Date().toISOString(),
  };

  // Create server/admin.json the first time.
  writeJsonSafe(ADMIN_FILE, record);
  return record;
}

function getTokenFromRequest(req) {
  const auth = req.headers.authorization;
  if (auth) {
    const [type, token] = auth.split(" ");
    if (type === "Bearer" && token) return token;
  }
  return getTokenFromCookie(req);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const allowFromEnv = (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allow = new Set([
    ...allowFromEnv,
    "http://localhost:5173",
    "http://localhost:4173",
    `http://localhost:${PORT}`,
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
  ]);

  return allow.has(origin);
}

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    // The Vite single-file build uses inline scripts/styles; a strict CSP would block it.
    // In production you can configure CSP for your deployment environment.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cookieParser());

app.use(
  cors({
    origin: (origin, cb) => {
      // If origin isn't allowed, don't attach CORS headers (cross-site will fail),
      // but don't throw an error that could break same-origin requests.
      if (!origin) return cb(null, true);
      if (isAllowedOrigin(origin)) return cb(null, origin);
      return cb(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_, res) => {
  res.json({ ok: true, service: "berly-beauty-auth" });
});

app.post("/api/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ ok: false, message: "Missing email/password" });
  }

  const admin = await ensureAdminRecord();

  const emailOk =
    String(email).trim().toLowerCase() ===
    String(admin.email).trim().toLowerCase();
  if (!emailOk) {
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  }

  const passOk = await bcrypt.compare(String(password), admin.passwordHash);
  if (!passOk) {
    return res.status(401).json({ ok: false, message: "Invalid credentials" });
  }

  const token = signToken(admin.email);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ ok: true, email: admin.email });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
  });
  res.json({ ok: true });
});

app.get("/api/me", async (req, res) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ ok: false });

  try {
    const payload = verifyToken(token);
    res.json({ ok: true, payload });
  } catch {
    res.status(401).json({ ok: false });
  }
});

// Optional: serve the built website (dist/) for production usage.
const distPath = path.join(process.cwd(), "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, async () => {
  await ensureAdminRecord();
  console.log(`Berly Beauty backend running on http://localhost:${PORT}`);
  console.log(`Admin file: ${ADMIN_FILE}`);
});
