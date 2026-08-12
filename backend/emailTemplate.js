/* =====================================================
   EXCEL TRAVEL & TOURS — Enquiry email template
   Table-based layout with inline styles: email clients
   (Outlook especially) do not support flexbox or grid,
   and most strip <style> blocks.
   ===================================================== */

/* Brand palette, mirrored from Frontend/styles.css */
const C = {
  blue: "#0057b8",
  blueDeep: "#06294d",
  dark: "#1f2637",
  muted: "#5b6472",
  border: "#e3e7ef",
  panel: "#f5f7fb",
  page: "#eceff8",
  white: "#ffffff",
  gold: "#f3c63a",
};

const FONT =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_HEAD =
  "'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Visitor input lands inside HTML — escape it. */
export const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** Newlines only become visible in HTML if turned into <br>. */
const nl2br = (v) => escapeHtml(v).replace(/\r?\n/g, "<br />");

/** One label/value line in the details block. */
const detailRow = (label, valueHtml) => `
  <tr>
    <td style="padding:0 0 14px 0;font-family:${FONT};font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};width:96px;vertical-align:top;white-space:nowrap">${label}</td>
    <td style="padding:0 0 14px 0;font-family:${FONT};font-size:15px;color:${C.dark};vertical-align:top">${valueHtml}</td>
  </tr>`;

export function buildEmail({ name, email, subject, message, source }) {
  /* ---------- Plain-text fallback ---------- */
  const text = [
    "NEW ENQUIRY — Excel Travel & Tours",
    "",
    `Name:    ${name}`,
    `Email:   ${email}`,
    `Subject: ${subject}`,
    `Form:    ${source}`,
    "",
    "Message:",
    message,
    "",
    "—",
    `Reply directly to this email to respond to ${name}.`,
  ].join("\n");

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);

  /* ---------- HTML ---------- */
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>New enquiry from ${safeName}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-font-smoothing:antialiased">

  <!-- Inbox preview line, hidden in the body -->
  <div style="display:none;font-size:1px;color:${C.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">
    ${escapeHtml(subject)} — from ${safeName} (${safeEmail})
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page}">
    <tr>
      <td align="center" style="padding:32px 16px">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.white};border-radius:16px;overflow:hidden;box-shadow:0 8px 28px rgba(31,38,55,.10)">

          <!-- Brand bar -->
          <tr>
            <td style="padding:22px 32px;border-bottom:1px solid ${C.border}">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${FONT_HEAD};font-size:17px;font-weight:700;color:${C.blueDeep};letter-spacing:-.01em">
                    Excel Travel <span style="color:${C.blue}">&amp; Tours</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="padding:38px 32px 0 32px">
              <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${C.panel};font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:${C.blue}">
                ${escapeHtml(subject)}
              </div>
              <h1 style="margin:18px 0 0 0;font-family:${FONT_HEAD};font-size:28px;line-height:1.2;font-weight:700;color:${C.dark}">
                You have a new enquiry
              </h1>
              <p style="margin:10px 0 0 0;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.muted}">
                ${safeName} got in touch through the website.
              </p>
            </td>
          </tr>

          <!-- Reply button -->
          <tr>
            <td align="center" style="padding:26px 32px 4px 32px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-radius:999px;background:${C.blue};box-shadow:0 4px 12px rgba(0,87,184,.28)">
                    <a href="mailto:${safeEmail}?subject=${encodeURIComponent("Re: " + subject)}"
                       style="display:inline-block;padding:14px 30px;font-family:${FONT_HEAD};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px">
                      Reply to ${safeName.split(" ")[0]} &nbsp;&rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Details -->
          <tr>
            <td style="padding:32px 32px 8px 32px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${detailRow("Name", safeName)}
                ${detailRow("Email", `<a href="mailto:${safeEmail}" style="color:${C.blue};text-decoration:none">${safeEmail}</a>`)}
                ${detailRow("Subject", escapeHtml(subject))}
                ${detailRow("Form", escapeHtml(source))}
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="padding:0 32px 32px 32px">
              <div style="font-family:${FONT};font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.muted};padding-bottom:10px">Message</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.panel};border-radius:12px;border-left:3px solid ${C.gold}">
                <tr>
                  <td style="padding:18px 20px;font-family:${FONT};font-size:15px;line-height:1.7;color:${C.dark}">
                    ${nl2br(message)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 32px 28px 32px;border-top:1px solid ${C.border};background:#fbfcfe">
              <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};text-align:center">
                Hitting <strong style="color:${C.dark}">Reply</strong> responds straight to ${safeName}.
              </p>
              <p style="margin:8px 0 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#98a1b0;text-align:center">
                Sent automatically from the contact form on the Excel Travel &amp; Tours website.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html };
}
