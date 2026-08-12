/* =====================================================
   EXCEL TRAVEL & TOURS — Interactivity (multi-page)
   ===================================================== */
(function () {
  "use strict";

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

  /* ---------- Contact widget (on index & routes pages) ---------- */
  function initWidgetContact() {
    const btn = document.getElementById("widgetContactSend");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const name  = document.getElementById("wName");
      const email = document.getElementById("wEmail");
      const msg   = document.getElementById("wMsg");
      const out   = document.getElementById("widgetFeedback");
      out.classList.remove("error");
      if (!name.value.trim() || !email.value.trim() || !msg.value.trim()) {
        out.textContent = "Please fill in your name, email and message.";
        out.classList.add("error");
        return;
      }
      out.style.color = "var(--green-dark)";
      out.textContent = `✓ Thanks ${name.value.trim().split(" ")[0]}! We'll be in touch within 24 hours.`;
      name.value = ""; email.value = ""; msg.value = "";
    });
  }

  /* ---------- Contact form (contact.html) ---------- */
  function initContact() {
    const btn = document.getElementById("contactSend");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const name  = document.getElementById("cName");
      const email = document.getElementById("cEmail");
      const msg   = document.getElementById("cMsg");
      const out   = document.getElementById("contactFeedback");
      out.classList.remove("error");
      if (!name.value.trim() || !email.value.trim() || !msg.value.trim()) {
        out.textContent = "Please fill in your name, email and message."; out.classList.add("error"); return;
      }
      out.style.color = "var(--green-dark)";
      out.textContent = `✓ Thanks ${name.value.trim().split(" ")[0]}! Your message has been sent — we'll reply within 24 hours.`;
      name.value = ""; email.value = ""; msg.value = "";
    });
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
