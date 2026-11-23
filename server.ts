import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Ephemeral fallback if SESSION_SECRET env var is unset (never stored in files or .env.example)
const SESSION_SIGNING_SECRET =
  process.env.SESSION_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

const DATA_DIR = path.resolve(__dirname, 'data');
const CLAIMS_FILE = path.resolve(DATA_DIR, 'portal-auth.json');

type PortalRole = 'admin' | 'superadmin';

interface StoredClaimRecord {
  email: string;
  salt: string;
  hash: string;
  claimedAt: string;
}

type ClaimsStore = Partial<Record<PortalRole, StoredClaimRecord>>;

interface TokenPayload {
  role: PortalRole;
  email: string;
  jti: string;
  exp: number;
}

const revokedTokenIds = new Set<string>();
const failedLoginBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 10;

function isValidRole(value: unknown): value is PortalRole {
  return value === 'admin' || value === 'superadmin';
}

function getEnvPasscodeConfig(role: PortalRole): {
  passcode: string;
  requiredEmail: string;
} {
  const passcode =
    role === 'admin'
      ? (process.env.ADMIN_PASSCODE || '').trim()
      : (process.env.SUPERADMIN_PASSCODE || '').trim();
  const requiredEmail =
    role === 'admin'
      ? (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
      : (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  return { passcode, requiredEmail };
}

function ensureClaimsPathInsideDataDir(): string {
  const normalizedDataPrefix = DATA_DIR + path.sep;
  if (!CLAIMS_FILE.startsWith(normalizedDataPrefix)) {
    throw new Error('Invalid auth claims path.');
  }
  return CLAIMS_FILE;
}

function readClaimsStore(): ClaimsStore {
  try {
    const filePath = ensureClaimsPathInsideDataDir();
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as ClaimsStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeClaimsStore(next: ClaimsStore): void {
  const filePath = ensureClaimsPathInsideDataDir();
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(next, null, 2), {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function hashPassword(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function safeEqualText(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyClaimedPassword(record: StoredClaimRecord, password: string): boolean {
  const candidate = hashPassword(password, record.salt);
  return safeEqualText(candidate.hash, record.hash);
}

function signSessionToken(role: PortalRole, email: string): string {
  const payload: TokenPayload = {
    role,
    email,
    jti: crypto.randomBytes(16).toString('hex'),
    exp: Date.now() + 12 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

function verifySessionToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(body)
    .digest('base64url');
  if (!safeEqualText(sig, expectedSig)) return null;

  try {
    const decoded = JSON.parse(
      Buffer.from(body, 'base64url').toString('utf8')
    ) as TokenPayload;
    if (
      !decoded ||
      !isValidRole(decoded.role) ||
      typeof decoded.email !== 'string' ||
      typeof decoded.jti !== 'string' ||
      typeof decoded.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() > decoded.exp || revokedTokenIds.has(decoded.jti)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const entry = failedLoginBuckets.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    failedLoginBuckets.delete(ip);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX_ATTEMPTS;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = failedLoginBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    failedLoginBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function clearFailedAttempts(ip: string): void {
  failedLoginBuckets.delete(ip);
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  // Public non-secret Supabase client config (URL + anon key only, filtering out placeholders)
  app.get('/api/public-config', (_req: Request, res: Response) => {
    const rawUrl = (
      process.env.VITE_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ''
    ).trim();
    const rawKey = (
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ''
    ).trim();

    const lowerUrl = rawUrl.toLowerCase();
    const lowerKey = rawKey.toLowerCase();
    const looksPlaceholder =
      !rawUrl ||
      !rawKey ||
      lowerUrl.includes('your-project') ||
      lowerUrl.includes('example.supabase.co') ||
      lowerUrl.includes('placeholder') ||
      lowerKey === 'your-anon-key' ||
      lowerKey === 'your_anon_key' ||
      lowerKey.startsWith('your-') ||
      lowerKey.includes('placeholder') ||
      rawKey.length < 20;

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      supabaseUrl: looksPlaceholder ? '' : rawUrl,
      supabaseAnonKey: looksPlaceholder ? '' : rawKey,
    });
  });

  // Check whether role passcode env or claimed scrypt record exists
  app.get('/api/auth/status', (req: Request, res: Response) => {
    const role = req.query.role;
    if (!isValidRole(role)) {
      res.status(400).json({ error: 'Invalid portal role.' });
      return;
    }
    const { passcode } = getEnvPasscodeConfig(role);
    const claims = readClaimsStore();
    const configured = Boolean(passcode || claims[role]?.hash);
    res.setHeader('Cache-Control', 'no-store');
    res.json({ configured });
  });

  // Atomic one-time first-run setup when no env passcode and no prior claim exist
  app.post('/api/auth/claim', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many attempts. Please try again later.' });
      return;
    }

    const { role, email, password } = (req.body || {}) as {
      role?: unknown;
      email?: unknown;
      password?: unknown;
    };

    if (!isValidRole(role)) {
      res.status(400).json({ error: 'Invalid portal role.' });
      return;
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters.' });
      return;
    }

    const { passcode } = getEnvPasscodeConfig(role);
    const claims = readClaimsStore();
    if (passcode || claims[role]?.hash) {
      recordFailedAttempt(ip);
      res.status(409).json({
        error: 'Portal account has already been configured. Please sign in instead.',
      });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const { salt, hash } = hashPassword(password);
    const nextClaims: ClaimsStore = {
      ...claims,
      [role]: {
        email: cleanEmail,
        salt,
        hash,
        claimedAt: new Date().toISOString(),
      },
    };
    writeClaimsStore(nextClaims);
    clearFailedAttempts(ip);

    const token = signSessionToken(role, cleanEmail);
    res.json({ token, email: cleanEmail, role });
  });

  // Server-side password verification
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      res.status(429).json({ error: 'Too many failed login attempts. Try again later.' });
      return;
    }

    const { role, email, password } = (req.body || {}) as {
      role?: unknown;
      email?: unknown;
      password?: unknown;
    };

    if (!isValidRole(role)) {
      res.status(400).json({ error: 'Invalid portal role.' });
      return;
    }
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const { passcode, requiredEmail } = getEnvPasscodeConfig(role);

    if (passcode) {
      const emailOk = !requiredEmail || safeEqualText(cleanEmail, requiredEmail);
      const passOk = safeEqualText(password, passcode);
      if (!emailOk || !passOk) {
        recordFailedAttempt(ip);
        res.status(401).json({ error: 'Invalid portal ID or password.' });
        return;
      }
      clearFailedAttempts(ip);
      const token = signSessionToken(role, cleanEmail);
      res.json({ token, email: cleanEmail, role });
      return;
    }

    const claims = readClaimsStore();
    const record = claims[role];
    if (!record) {
      res.status(412).json({
        error: 'Portal not set up yet. Complete the first-run setup form.',
      });
      return;
    }

    const emailOk = safeEqualText(cleanEmail, record.email.toLowerCase());
    const passOk = verifyClaimedPassword(record, password);
    if (!emailOk || !passOk) {
      recordFailedAttempt(ip);
      res.status(401).json({ error: 'Invalid portal ID or password.' });
      return;
    }

    clearFailedAttempts(ip);
    const token = signSessionToken(role, record.email);
    res.json({ token, email: record.email, role });
  });

  // Verify Bearer token
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const role = req.query.role;
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    const verified = verifySessionToken(token);
    if (!verified) {
      res.status(401).json({ error: 'Session expired or invalid.' });
      return;
    }
    if (isValidRole(role) && verified.role !== role) {
      res.status(403).json({ error: 'Insufficient portal permissions.' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ email: verified.email, role: verified.role });
  });

  // Revoke Bearer token
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      const verified = verifySessionToken(token);
      if (verified) {
        revokedTokenIds.add(verified.jti);
      }
    }
    res.json({ ok: true });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
