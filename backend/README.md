# Excel Travel — Contact Backend

A small Express service that takes the website's contact forms and emails them
to the team through [Resend](https://resend.com). No database, no stored data —
each submission is validated and forwarded straight to the inbox.

## Endpoints

| Method | Path           | Purpose                                  |
| ------ | -------------- | ---------------------------------------- |
| `GET`  | `/health`      | Health check (Render pings this)         |
| `POST` | `/api/contact` | Accepts a form submission and emails it  |

`POST /api/contact` expects JSON:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "subject": "Booking support",
  "message": "Do you run a Sunday service to Nyagatare?",
  "source": "contact page",
  "company": ""
}
```

`name`, `email` and `message` are required. `company` is a honeypot — it is
hidden on the real form, so anything arriving in it is treated as a bot and
silently discarded. Replies go to `ok: true` on success, or
`{ ok: false, error: "..." }` with a 4xx/5xx status on failure.

## Environment variables

Copy `.env.example` to `.env` and fill it in. `.env` is gitignored — never
commit it.

| Variable          | Required | Notes                                             |
| ----------------- | -------- | ------------------------------------------------- |
| `RESEND_API_KEY`  | yes      | From <https://resend.com/api-keys>                |
| `CONTACT_TO`      | no       | Inbox for enquiries. Default `special.net1@gmail.com` |
| `MAIL_FROM`       | no       | Sender. Default `Excel Travel & Tours <noreply@send.excel.rw>` |
| `ALLOWED_ORIGINS` | no       | Comma-separated sites allowed to POST. Empty = all |
| `PORT`            | no       | Render sets this automatically                    |

`MAIL_FROM` must stay on a domain verified at
<https://resend.com/domains>. `send.excel.rw` is verified, so enquiries deliver
to any recipient. Using Resend's shared `onboarding@resend.dev` sender instead
would restrict delivery to the account owner's own address only.

## The enquiry email

[`emailTemplate.js`](emailTemplate.js) builds the message that lands in the
inbox — a branded card carrying the subject, a **Reply to …** button, the
sender's details, and the message body. It uses table-based layout with inline
styles because Outlook supports neither flexbox nor grid, and most clients strip
`<style>` blocks. A plain-text alternative is sent alongside it for clients that
prefer one.

`replyTo` is set to the visitor's address, so hitting Reply in the inbox answers
them directly rather than replying to the server.

To preview a change without sending mail:

```bash
node -e "import('./emailTemplate.js').then(({buildEmail})=>\
require('fs').writeFileSync('preview.html',buildEmail({\
name:'Aline Uwase',email:'aline@example.com',subject:'Private charter',\
message:'Hello,\nDo you run a charter to Nyagatare?',source:'contact page'}).html))"
open preview.html
```

## Running locally

```bash
cd backend
npm install
npm run dev     # or: npm start
```

Then open the frontend from `localhost` — `script.js` automatically points at
`http://localhost:3000` when served from localhost, and at the Render URL
otherwise.

## Deploying to Render

**Option A — Blueprint (uses `render.yaml`)**

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, pick the repo. It reads `backend/render.yaml`.
3. Set `RESEND_API_KEY` and `ALLOWED_ORIGINS` when prompted.

**Option B — Manual**

1. In Render: **New → Web Service**, connect the repo.
2. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. Under **Environment**, add `RESEND_API_KEY`, `CONTACT_TO`, `MAIL_FROM` and
   `ALLOWED_ORIGINS`.

### After deploying

1. Copy the service URL Render gives you (e.g.
   `https://excel-travel-backend.onrender.com`).
2. Put it in `API_BASE` near the top of `Frontend/script.js`.
3. Set `ALLOWED_ORIGINS` on Render to your Vercel URL so other sites cannot use
   your mail quota, e.g. `https://excel-travel.vercel.app`.

Note that Render's free tier sleeps after inactivity, so the first submission
after an idle period can take ~30 seconds while the service wakes up.

## Security

The endpoint is public and unauthenticated by necessity — anyone must be able to
send the form. So it is built on the assumption that **any request may be
hostile**, and every field is treated as untrusted.

### Injection

| Vector | Handling |
| ------ | -------- |
| **Email header injection** (`Name\r\nBcc: attacker@…`) | CR/LF and all C0 control characters are stripped from `name`, `email`, `subject` and `source` before they reach the Subject or Reply-To headers. The email regex also rejects any whitespace outright. |
| **HTML injection into the email** | Every visitor-supplied value is escaped (`&`, `<`, `>`, `"`, `'`) before templating. The message body escapes first, then converts newlines to `<br>` — never the reverse. |
| **Attribute breakout** in the `mailto:` link | Quotes are escaped, so the address cannot terminate the `href`. The subject is `encodeURIComponent`-ed. |
| **Bidi/invisible character spoofing** | U+202A–U+202E and U+2066–U+2069 are stripped, so text cannot be made to display in reverse. |
| **Prototype pollution** | Fields are read individually and coerced with `typeof v === "string"`; non-strings become `""`. Nothing is merged or spread. |
| **Malformed JSON / wrong content-type** | Caught by a body-parser error handler and answered with the normal JSON error shape. |

### Abuse and denial of service

- **Per-IP rate limit** — 5 *successful* sends per IP per 15 minutes. Rejected
  submissions do not count, so a visitor mistyping their email is not locked out.
- **Global rate limit** — 60 sends/hour across all callers, protecting the
  Resend quota from a botnet spread across many IPs.
- **Honeypot** — hidden `company` field; bots that fill it get a fake success so
  they do not learn to retry.
- **Size caps** — 32 kB body, and per-field limits (name 100, email 200,
  subject 150, message 5000, source 60).
- **`trust proxy` is `1`, not `true`** — trusting every hop would let a client
  forge `X-Forwarded-For` and sidestep the per-IP limit.

### Headers and secrets

- **`helmet()`** sets `nosniff`, `X-Frame-Options`, HSTS and `Referrer-Policy`;
  the `X-Powered-By` version banner is removed.
- **Errors are generic** to the client (`"Something went wrong"`); details go to
  the server log only, so Resend responses and stack traces are never exposed.
- **The API key lives only in `.env`**, which is gitignored, and in Render's
  dashboard. It is never logged.

### Allowed origins

Only these three may call the API from a browser:

```
https://excel.rw
https://www.excel.rw
https://excel-travel-website.vercel.app
```

Matching is exact, so `http://excel.rw` (plain HTTP), `https://notexcel.rw` and
`https://excel.rw.evil.com` are all refused. Do not add trailing slashes — an
`Origin` header never has one. The list is baked into `render.yaml` and can be
overridden with the `ALLOWED_ORIGINS` variable; if that is unset the server
falls back to the same three.

When `NODE_ENV` is not `production`, any `localhost` / `127.0.0.1` origin is
also accepted so the site can be tested locally on whatever port your dev server
uses. `render.yaml` sets `NODE_ENV=production`, so the deployed service is
strict.

**Vercel preview deployments** get their own URLs
(`excel-travel-website-git-<branch>-<user>.vercel.app`) and are **not** on the
list — the forms will not send from a preview build. Add the specific preview
URL to `ALLOWED_ORIGINS` if you need to test one.

### What CORS does and does not do

`ALLOWED_ORIGINS` stops *other websites* from POSTing here **from a browser**.
It does not stop `curl`, a script, or any non-browser client — those send no
`Origin` header at all and are allowed through by design (Render's health checks
need this). Treat CORS as tidiness, not as the security boundary. The real
protections against abuse are the rate limits, the honeypot and validation.

### Worth adding later

If spam ever gets through the honeypot, add a CAPTCHA (Cloudflare Turnstile is
free and privacy-friendly) and verify the token server-side before sending.
