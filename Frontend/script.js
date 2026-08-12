/* =====================================================
   EXCEL TRAVEL & TOURS — Interactivity (multi-page)
   ===================================================== */
(function () {
  "use strict";

  /* ---------- Backend ----------
     The contact forms POST here. Replace the Render URL below with your own
     once the service is deployed (Render shows it on the service page).
     Running from localhost automatically talks to a local backend instead. */
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  const API_BASE = isLocal
    ? "http://localhost:3000"
    : "https://excel-travel-backend.onrender.com";

  /* ---------- Real photos ---------- */
  const IMG = {
    nyabugogo: "./images/Nyabugogo.jpg",
    nyabarongo: "./images/Nyabarongo.jpg",
    kicukiro:  "./images/kicukiro.jpg",
    nyagatare: "./images/Nyagatare.jpeg",
    remera:"./images/remera.jpg",
    kivu:      "https://images.unsplash.com/photo-1514548383638-cef9251a73ec?auto=format&fit=crop&w=1200&q=80",
    hills:     "https://images.unsplash.com/photo-1565349479047-d6211d4efc90?auto=format&fit=crop&w=1200&q=80",
    kigali:    "https://images.unsplash.com/photo-1687986261123-b17f08f2796c?auto=format&fit=crop&w=1200&q=80",
  };

  /* ---------- Data ---------- */
  const ROUTES = [
    { from: "Nyabugogo", to: "Nyagatare",   time: "3h",    price: 6712,   img: IMG.nyabugogo, label: "Nyabugogo" },
    { from: "Nyanza",    to: "Nyamata",  time: "50m",     price: 1029,   img: IMG.nyabarongo, label: "Nyamata" },
    { from: "Nyabugogo",    to: "Rwemasha",   time: "3h 30m", price: 9200,   img: IMG.kicukiro,  label: "Rwemasha" },
  ];

  const DESTINATIONS = [
    { from: "Nyanza",    to: "Nyamata",  time: "50m",     price: 1029, img: IMG.nyabarongo, label: "Nyamata" },
    { from: "Nyagatare", to: "Remera",   time: "2h 30m", price: 6000, img: IMG.remera, label: "Remera" },
    { stops: ["Nyagatare", "Rwamagana", "Nyabugogo"], time: "3h",     price: 6712,  img: IMG.nyagatare,  label: "Nyabugogo" },
    { stops: ["Nyabugogo", "Kayonza", "Nyagatare", "Rwemasha"], time: "3h 30m", price: 9200,  img: IMG.kicukiro,  label: "Rwemasha" },
    { stops: ["Nyanza", "Nyamata", "Ramiro"], time: "1h", price: 2198,  img: IMG.kivu,       label: "Ramiro" },
  ];

  const money = (amount) => new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(amount);

  /* ---------- Render: Route cards ---------- */
  function routeCardHTML(r) {
    const stops = r.stops || [r.from, r.to];
    const from = stops[0];
    const to = stops[stops.length - 1];
    const pathHTML = stops
      .map((s, i) => (i === 0 ? s : `<span class="arrow">&rarr;</span> ${s}`))
      .join(" ");
    return `
      <article class="route-card" data-from="${from}" data-to="${to}" data-price="${r.price}">
        <div class="route-img">
          <span class="route-badge">${r.label}</span>
          <img src="${r.img}" alt="${to}, Rwanda" loading="lazy" />
        </div>
        <div class="route-body">
          <div class="route-name">${pathHTML}</div>
          <div class="route-meta">
            <span class="route-time">${r.time}</span>
            <span class="route-price">${money(r.price)}</span>
          </div>
        </div>
      </article>`;
  }

  function renderRoutes() {
    const grid = document.getElementById("routesGrid");
    if (grid) { grid.innerHTML = ROUTES.map(routeCardHTML).join(""); }

    const all = document.getElementById("destinationsGrid");
    if (all) { all.innerHTML = DESTINATIONS.map(routeCardHTML).join(""); }
  }

  /* ---------- Contact form submission ---------- */

  /**
   * Shared submit handler for both contact forms.
   * `fields` holds the input elements; `out` is the feedback paragraph.
   */
  async function submitContact({ btn, out, fields, source, successText }) {
    const name    = fields.name.value.trim();
    const email   = fields.email.value.trim();
    const message = fields.message.value.trim();
    const subject = fields.subject ? fields.subject.value : "General enquiry";
    const company = fields.company ? fields.company.value : "";

    out.classList.remove("error");
    out.style.color = "";

    if (!name || !email || !message) {
      out.textContent = "Please fill in your name, email and message.";
      out.classList.add("error");
      return;
    }

    const originalLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending…";
    out.textContent = "";

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, company, source }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        out.textContent = data.error || "We could not send your message. Please try again.";
        out.classList.add("error");
        return;
      }

      out.style.color = "var(--green-dark)";
      out.textContent = successText(name.split(" ")[0]);
      fields.name.value = ""; fields.email.value = ""; fields.message.value = "";
    } catch (err) {
      out.textContent = "Network problem — please check your connection and try again.";
      out.classList.add("error");
    } finally {
      btn.disabled = false;
      btn.textContent = originalLabel;
    }
  }

  /* ---------- Contact widget (on routes page) ---------- */
  function initWidgetContact() {
    const btn = document.getElementById("widgetContactSend");
    if (!btn) return;
    btn.addEventListener("click", () =>
      submitContact({
        btn,
        out: document.getElementById("widgetFeedback"),
        fields: {
          name:    document.getElementById("wName"),
          email:   document.getElementById("wEmail"),
          message: document.getElementById("wMsg"),
          company: document.getElementById("wCompany"),
        },
        source: "routes page widget",
        successText: (first) => `✓ Thanks ${first}! We'll be in touch within 24 hours.`,
      })
    );
  }

  /* ---------- Contact form (contact.html) ---------- */
  function initContact() {
    const btn = document.getElementById("contactSend");
    if (!btn) return;
    btn.addEventListener("click", () =>
      submitContact({
        btn,
        out: document.getElementById("contactFeedback"),
        fields: {
          name:    document.getElementById("cName"),
          email:   document.getElementById("cEmail"),
          message: document.getElementById("cMsg"),
          subject: document.getElementById("cSubject"),
          company: document.getElementById("cCompany"),
        },
        source: "contact page",
        successText: (first) => `✓ Thanks ${first}! Your message has been sent — we'll reply within 24 hours.`,
      })
    );
  }

  /* ---------- Header scroll + mobile menu ---------- */
  function initHeader() {
    const header = document.getElementById("header");
    if (header) {
      window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 8));
    }
    const toggle = document.getElementById("menuToggle");
    const nav = document.getElementById("nav");
    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        toggle.classList.toggle("open", open);
        toggle.setAttribute("aria-expanded", String(open));
      });
      nav.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => {
          nav.classList.remove("open");
          toggle.classList.remove("open");
          toggle.setAttribute("aria-expanded", "false");
        })
      );
    }
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach(e => e.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -40px 0px" });

    els.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("in");
      } else {
        io.observe(el);
      }
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    renderRoutes();
    initWidgetContact();
    initContact();
    initHeader();
    initReveal();
  });
})();
