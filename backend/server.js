/* =====================================================
   EXCEL TRAVEL & TOURS — Contact mail relay
   Receives the frontend contact forms and sends them
   on to the inbox via Resend. No database.
   ===================================================== */
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Resend } from "resend";
import { buildEmail } from "./emailTemplate.js";

/* ---------- Config ---------- */
const PORT = process.env.PORT || 3000;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_TO = process.env.CONTACT_TO || "special.net1@gmail.com";
const MAIL_FROM = process.env.MAIL_FROM || "Excel Travel & Tours <noreply@send.excel.rw>";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// The sites allowed to POST here, comma-separated. Anything not on this list is
// refused, so a stray origin cannot spend the mail quota.
const DEFAULT_ORIGINS = [
  "https://excel.rw",
  "https://www.excel.rw",
  "https://excel-travel-website.vercel.app",
];

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, "")) // a trailing slash never matches
  .filter(Boolean);

const ORIGINS = ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : DEFAULT_ORIGINS;

// Serving the frontend locally means the browser sends a localhost origin on a
// port that varies by tool (Live Server, Vite, python -m http.server). Accept
// any of them off production rather than maintaining a port list.
const isLocalhost = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

if (!RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY. Set it in .env locally, or in the Render dashboard.");
  process.exit(1);
}

if (ALLOWED_ORIGINS.length === 0) {
  console.warn(
    "Note: ALLOWED_ORIGINS is not set — falling back to the built-in list.\n" +
      "      Set it explicitly if the site's domains ever change."
  );
}

const resend = new Resend(RESEND_API_KEY);
const app = express();

/* ---------- Middleware ---------- */
// Render terminates TLS at its proxy, so trust one hop to get the real
// client IP — without this the rate limiter sees every request as one IP.
// Keep it at 1, not `true`: trusting every hop lets a client forge
// X-Forwarded-For and sidestep the rate limiter.
app.set("trust proxy", 1);

// Sensible security headers; also drops the X-Powered-By version banner.
app.use(helmet());
app.disable("x-powered-by");

app.use(express.json({ limit: "32kb" }));

// Turn body-parser's own errors (malformed JSON, oversized payload) into the
// same JSON shape the frontend expects, rather than an HTML error page.
app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ ok: false, error: "That message is too large." });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ ok: false, error: "Malformed request." });
  }
  return next(err);
});

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = curl, Render's health check, server-to-server.
      // Browsers always send one, so this is not a hole a website can use.
      if (!origin) return callback(null, true);
      if (ORIGINS.includes(origin)) return callback(null, true);
      if (!IS_PRODUCTION && isLocalhost(origin)) return callback(null, true);
      return callback(new Error(`Origin not allowed: ${origin}`));
    },
    methods: ["POST", "GET", "OPTIONS"],
  })
);

// A public send-mail endpoint is a spam magnet; cap it per IP.
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  // Only count messages that actually went out. Otherwise someone who
  // mistypes their email five times is locked out without ever sending.
  skipFailedRequests: true,
  message: { ok: false, error: "Too many messages sent. Please try again in a few minutes." },
});

// Per-IP limits do nothing against a botnet spread over many addresses, and the
// Resend quota is the thing worth protecting. This is the ceiling for everyone
// combined — set well above real traffic for a site of this size.
const globalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: false,
  legacyHeaders: false,
  skipFailedRequests: true,
  keyGenerator: () => "global",
  message: { ok: false, error: "The contact form is busy right now. Please try again shortly." },
});

/* ---------- Helpers ---------- */
const MAX = { name: 100, email: 200, subject: 150, message: 5000, source: 60 };

// Anything that is not a string (arrays, objects, numbers sent by a crafted
// client) becomes an empty string rather than blowing up downstream.
const str = (v) => (typeof v === "string" ? v : "");

/* Characters that must never survive into an email.
   - C0 control chars: CR and LF are the classic email header-injection
     vector ("Name\r\nBcc: victim@example.com"); the rest are invisible junk.
   - Bidi overrides (U+202A..U+202E, U+2066..U+2069) can visually reverse
     text, so a message can display something other than what it says. */
const CONTROL_CHARS = /[\u0000-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;
// Same set, but keeping \n (U+000A) so the message body keeps its paragraphs.
const CONTROL_KEEP_LF = /[\u0000-\u0009\u000B-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g;

/** For fields that belong on one line: name, email, subject, source. */
const singleLine = (v) => str(v).replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();

/** For the message body: newlines are meaningful, everything else goes. */
const multiLine = (v) =>
  str(v)
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_KEEP_LF, "")
    .trim();

// Good-enough shape check. Real validation is whether the reply bounces.
// The \s exclusions also guarantee no CR/LF can reach the Reply-To header.
const looksLikeEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function validate({ name, email, subject, message }) {
  if (!name) return "Please include your name.";
  if (name.length > MAX.name) return "That name is too long.";
  if (!email) return "Please include your email.";
  if (email.length > MAX.email || !looksLikeEmail(email)) return "Please enter a valid email address.";
  if (subject.length > MAX.subject) return "That subject is too long.";
  if (!message) return "Please include a message.";
  if (message.length > MAX.message) return "That message is too long (5000 characters max).";
  return null;
}

/* ---------- Routes ---------- */
// Render pings this to decide the service is live.
app.get("/health", (req, res) => res.json({ ok: true, service: "excel-travel-backend" }));

app.post("/api/contact", globalLimiter, contactLimiter, async (req, res) => {
  const body = req.body || {};

  // Honeypot: hidden on the real form, so anything here is a bot.
  // Report success so the bot does not learn to retry.
  if (str(body.company).trim()) {
    console.warn("Honeypot triggered — discarded a submission.");
    return res.json({ ok: true });
  }

  const payload = {
    name: singleLine(body.name),
    email: singleLine(body.email),
    subject: singleLine(body.subject) || "General enquiry",
    message: multiLine(body.message),
    // `source` is set by our own frontend, so a client-supplied value that is
    // not one we recognise gets recorded but truncated.
    source: singleLine(body.source).slice(0, MAX.source) || "website",
  };

  const problem = validate(payload);
  if (problem) return res.status(400).json({ ok: false, error: problem });

  const { text, html } = buildEmail(payload);

  try {
    const { data, error } = await resend.emails.send({
      from: MAIL_FROM,
      to: [CONTACT_TO],
      subject: `[Excel Travel] ${payload.subject} — ${payload.name}`,
      // Hitting reply in the inbox replies to the visitor, not to Resend.
      replyTo: payload.email,
      text,
      html,
    });

    if (error) {
      console.error("Resend rejected the message:", error);
      return res.status(502).json({ ok: false, error: "We could not send your message. Please try again later." });
    }

    console.log(`Sent enquiry ${data?.id} from ${payload.email} (${payload.source})`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Unexpected error sending mail:", err);
    return res.status(500).json({ ok: false, error: "Something went wrong. Please try again later." });
  }
});

/* ---------- Errors ---------- */
app.use((err, req, res, next) => {
  if (err?.message?.startsWith("Origin not allowed")) {
    return res.status(403).json({ ok: false, error: "This site is not allowed to use the contact API." });
  }
  console.error(err);
  return res.status(500).json({ ok: false, error: "Something went wrong." });
});

/* ---------- Start ---------- */
// Bind 0.0.0.0 so Render's proxy can reach the container.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Excel Travel backend listening on :${PORT}`);
  console.log(`Delivering enquiries to ${CONTACT_TO}`);
  console.log(`Allowed origins: ${ORIGINS.join(", ")}`);
  if (!IS_PRODUCTION) console.log("Dev mode: localhost origins are also accepted.");
});
