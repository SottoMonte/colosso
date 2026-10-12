const fallbackImage =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1000&q=85";
const cartStorageKey = "colosso-cart-v1";
const euroFormatter = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });

const state = {
  page: document.body.dataset.page || "home",
  site: {},
  services: [],
  cart: readCart(),
  search: "",
  category: "tutte",
  sort: "featured",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return fallbackImage;
  try {
    const url = new URL(value.trim(), window.location.href);
    if (url.origin === window.location.origin || url.protocol === "https:") return url.href;
  } catch {
    return fallbackImage;
  }
  return fallbackImage;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("it-IT");
}

function serviceLink(service) {
  return `prodotto.html?id=${encodeURIComponent(String(service.id || ""))}`;
}

function readCart() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(cartStorageKey) || "{}");
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
    return Object.fromEntries(
      Object.entries(stored).filter(([, quantity]) => Number.isSafeInteger(quantity) && quantity > 0),
    );
  } catch {
    return {};
  }
}

function saveCart() {
  try {
    window.localStorage.setItem(cartStorageKey, JSON.stringify(state.cart));
  } catch {
    const feedback = document.querySelector("#cart-feedback");
    if (feedback) feedback.textContent = "Il browser non ha potuto salvare il carrello su questo dispositivo.";
  }
}

function servicePriceCents(service) {
  const value = service.price;
  const amount = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
}

function servicePricePeriod(service) {
  if (service.price_period === "mensile") return "mensile";
  if (service.price_period === "annuale") return "annuale";
  return "una tantum";
}

function pricePeriodSuffix(period) {
  if (period === "mensile") return " / mese";
  if (period === "annuale") return " / anno";
  return "";
}

function formatEuro(cents) {
  return euroFormatter.format(cents / 100);
}

function servicePriceText(service) {
  const cents = servicePriceCents(service);
  if (cents === null) return "Prezzo da definire";
  const period = servicePricePeriod(service);
  return `Da ${formatEuro(cents)}${period === "una tantum" ? " una tantum" : pricePeriodSuffix(period)}`;
}

function serviceCard(service, index) {
  const name = String(service.name || "Servizio Colosso");
  const link = escapeHtml(serviceLink(service));
  const id = escapeHtml(String(service.id || ""));
  return `
    <article class="service-card">
      <a class="service-card__media" href="${link}" aria-label="Scopri ${escapeHtml(name)}">
        <img src="${escapeHtml(safeImageUrl(service.image))}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" />
        <span class="service-card__media-index" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span>
      </a>
      <div class="service-card__body">
        <div class="service-card__tags"><span>${escapeHtml(service.category || "Servizi")}</span><span>${escapeHtml(service.kind || "")}</span></div>
        <h3><a href="${link}">${escapeHtml(name)}</a></h3>
        <p class="service-card__description">${escapeHtml(service.description || "")}</p>
        <div class="service-card__purchase">
          <span class="service-card__price">${escapeHtml(servicePriceText(service))}</span>
          <button class="service-card__add" type="button" data-add-to-cart="${id}">Aggiungi</button>
        </div>
        <div class="service-card__footer">
          <span class="service-card__format">${escapeHtml(service.format || "Su richiesta")}</span>
          <a class="service-card__link" href="${link}">Dettagli <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </article>
  `;
}

function activeServices() {
  return state.services.filter((service) => service.available !== false);
}

function cartEntries() {
  return Object.entries(state.cart)
    .map(([id, quantity]) => ({
      service: state.services.find((item) => item.id === id),
      quantity,
    }))
    .filter(({ service }) => service && service.available !== false);
}

function renderCartCount() {
  const quantity = Object.values(state.cart).reduce((total, itemQuantity) => total + itemQuantity, 0);
  const label = `Carrello, ${quantity} ${quantity === 1 ? "articolo" : "articoli"}`;
  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = String(quantity);
  });
  document.querySelectorAll("[data-cart-link]").forEach((element) => {
    element.setAttribute("aria-label", label);
  });
}

function cartPriceTotals(entries) {
  const totals = new Map();
  let unpricedQuantity = 0;
  entries.forEach(({ service, quantity }) => {
    const cents = servicePriceCents(service);
    if (cents === null) {
      unpricedQuantity += quantity;
      return;
    }
    const period = servicePricePeriod(service);
    totals.set(period, (totals.get(period) || 0) + cents * quantity);
  });
  return { totals, unpricedQuantity };
}

function cartVoucherDiscountCents(amount, initialTotal) {
  const normalizedAmount = String(amount ?? "").trim();
  const numericAmount = normalizedAmount ? Number(normalizedAmount) : Number.NaN;
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 0;
  return Math.min(Math.round(numericAmount * 100), initialTotal);
}

function renderCart() {
  renderCartCount();
  const list = document.querySelector("#cart-items");
  if (!list) return;

  const entries = cartEntries();
  list.innerHTML = entries.map(({ service, quantity }) => {
    const id = escapeHtml(String(service.id));
    const name = String(service.name || "Servizio Colosso");
    const cents = servicePriceCents(service);
    const period = servicePricePeriod(service);
    const amount = cents === null
      ? "Da definire"
      : `Da ${formatEuro(cents * quantity)}${pricePeriodSuffix(period)}`;
    return `
      <article class="cart-line">
        <img class="cart-line__image" src="${escapeHtml(safeImageUrl(service.image))}" alt="" loading="lazy" decoding="async" />
        <div class="cart-line__content">
          <p class="cart-line__category">${escapeHtml(service.category || "Servizi")}</p>
          <h2>${escapeHtml(name)}</h2>
          <p class="cart-line__unit">${escapeHtml(servicePriceText(service))}</p>
          <div class="cart-line__controls">
            <div class="cart-quantity" role="group" aria-label="Quantità di ${escapeHtml(name)}">
              <button type="button" data-cart-change="-1" data-service-id="${id}" aria-label="Riduci ${escapeHtml(name)} di uno">−</button>
              <input class="cart-quantity__input" type="number" min="0" max="99" step="1" inputmode="numeric" value="${quantity}" data-cart-quantity="true" data-service-id="${id}" aria-label="Quantità di ${escapeHtml(name)}" />
              <button type="button" data-cart-change="1" data-service-id="${id}" aria-label="Aumenta ${escapeHtml(name)} di uno">+</button>
            </div>
            <button class="cart-line__remove" type="button" data-cart-remove="${id}">Rimuovi</button>
          </div>
        </div>
        <strong class="cart-line__amount">${escapeHtml(amount)}</strong>
      </article>
    `;
  }).join("");

  const empty = document.querySelector("#cart-empty");
  const sidebar = document.querySelector("#cart-sidebar");
  const form = document.querySelector("#cart-order-form");
  if (empty) empty.hidden = entries.length > 0;
  if (sidebar) sidebar.hidden = entries.length === 0;
  if (form) form.hidden = entries.length === 0;

  const { totals, unpricedQuantity } = cartPriceTotals(entries);
  const totalRows = document.querySelector("#cart-totals");
  if (totalRows) {
    const periods = [...totals.keys()];
    const breakdown = periods.length
      ? periods.map((period) => {
        const label = unpricedQuantity
          ? period === "una tantum" ? "Parziale una tantum" : `Parziale ${period}`
          : period === "mensile" ? "Canone mensile da"
            : period === "annuale" ? "Canone annuale da"
              : periods.length === 1 ? "Totale da" : "Una tantum da";
        return `<p class="cart-total"><span>${escapeHtml(label)}</span><strong>${escapeHtml(formatEuro(totals.get(period)))}${escapeHtml(pricePeriodSuffix(period))}</strong></p>`;
      }).join("")
      : '<p class="cart-total"><span>Totale</span><strong>Da definire</strong></p>';
    const initialTotal = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
    const discountInput = document.querySelector("#voucher-discount")?.value || "";
    const discountCents = cartVoucherDiscountCents(discountInput, initialTotal);
    const initialLabel = discountCents
      ? unpricedQuantity ? "Totale parziale prima dello sconto" : "Totale prima dello sconto"
      : unpricedQuantity ? "Totale iniziale parziale" : "Totale iniziale stimato";
    const initialAmount = periods.length ? `Da ${formatEuro(initialTotal)}` : "Da definire";
    const initialRow = `<p class="cart-total${discountCents ? "" : " cart-total--initial"}"><span>${escapeHtml(initialLabel)}</span><strong>${escapeHtml(initialAmount)}</strong></p>`;
    const discountRows = discountCents
      ? `<p class="cart-total cart-total--discount"><span>Sconto Cartaway simulato</span><strong>− ${escapeHtml(formatEuro(discountCents))}</strong></p><p class="cart-total cart-total--initial"><span>${unpricedQuantity ? "Totale parziale dopo lo sconto" : "Totale stimato dopo lo sconto"}</span><strong>Da ${escapeHtml(formatEuro(Math.max(0, initialTotal - discountCents)))}</strong></p>`
      : "";
    totalRows.innerHTML = `${breakdown}${initialRow}${discountRows}`;
  }

  const pricingNote = document.querySelector("#cart-pricing-note");
  if (pricingNote) {
    pricingNote.hidden = entries.length === 0;
    pricingNote.textContent = unpricedQuantity
      ? `Il totale iniziale somma le voci una tantum e il primo periodo dei canoni. È parziale: ${unpricedQuantity} ${unpricedQuantity === 1 ? "quantità è" : "quantità sono"} senza prezzo. Importi indicativi, da confermare nel preventivo.`
      : "Il totale iniziale somma le voci una tantum e il primo periodo dei canoni. Prezzi indicativi; componenti, licenze ed eventuale IVA si confermano nel preventivo.";
  }
}

function setCartQuantity(serviceId, quantity) {
  if (!Number.isSafeInteger(quantity)) return;
  if (quantity <= 0) {
    delete state.cart[serviceId];
  } else {
    state.cart[serviceId] = Math.min(quantity, 99);
  }
  saveCart();
  renderCart();
}

function addToCart(serviceId) {
  const service = activeServices().find((item) => item.id === serviceId);
  if (!service) return;
  state.cart[serviceId] = Math.min((state.cart[serviceId] || 0) + 1, 99);
  saveCart();
  renderCart();
  const feedback = document.querySelector("#cart-feedback");
  if (feedback) feedback.textContent = `${service.name} aggiunto al carrello.`;
}

function submitCartRequest(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const entries = cartEntries();
  const status = document.querySelector("#cart-order-status");
  if (!entries.length) {
    if (status) status.textContent = "Aggiungi almeno un servizio al carrello.";
    return;
  }

  const fields = new FormData(form);
  const name = String(fields.get("name") || "").trim();
  const email = String(fields.get("email") || "").trim();
  const phone = String(fields.get("phone") || "").trim();
  const notes = String(fields.get("notes") || "").trim();
  const voucher = String(fields.get("voucher") || "").trim();
  if (!email && !phone) {
    if (status) status.textContent = "Inserisci un recapito email o telefono.";
    return;
  }

  const lines = entries.map(({ service, quantity }) => {
    const cents = servicePriceCents(service);
    const price = cents === null
      ? "prezzo da definire"
      : `da ${formatEuro(cents)}${servicePricePeriod(service) === "una tantum" ? " una tantum" : pricePeriodSuffix(servicePricePeriod(service))}`;
    return `- ${service.name} x ${quantity}: ${price}`;
  });
  const { totals, unpricedQuantity } = cartPriceTotals(entries);
  const totalLines = [...totals.entries()].map(([period, cents]) => {
    const label = period === "mensile" ? "Totale mensile da" : period === "annuale" ? "Totale annuale da" : "Totale una tantum da";
    return `${label}: ${formatEuro(cents)}${pricePeriodSuffix(period)}`;
  });
  const initialTotal = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  const voucherDiscountCents = cartVoucherDiscountCents(fields.get("voucher_discount"), initialTotal);
  const initialTotalLabel = unpricedQuantity ? "Totale iniziale parziale" : "Totale iniziale stimato";
  const initialTotalAmount = totals.size ? `da ${formatEuro(initialTotal)}` : "da definire";
  const message = [
    `Buongiorno ${state.site.brand || "Colosso"}, vorrei inviare una richiesta d'ordine.`,
    "",
    "Servizi:",
    ...lines,
    ...totalLines,
    `${initialTotalLabel}: ${initialTotalAmount}`,
    "Calcolato sommando le voci una tantum e il primo periodo dei canoni.",
    voucherDiscountCents ? `Sconto Cartaway indicato: ${formatEuro(voucherDiscountCents)} (simulazione da verificare).` : "",
    voucherDiscountCents ? `Totale stimato dopo lo sconto: da ${formatEuro(Math.max(0, initialTotal - voucherDiscountCents))} (simulazione).` : "",
    "Importi indicativi di partenza, da confermare nel preventivo.",
    unpricedQuantity ? `${unpricedQuantity} quantità senza prezzo, da preventivare.` : "",
    "",
    `Nome: ${name}`,
    email ? `Email: ${email}` : "",
    phone ? `Telefono: ${phone}` : "",
    notes ? `Note: ${notes}` : "",
    voucher ? `Codice buono Cartaway: ${voucher} (da verificare)` : "",
    "",
    "Confermate disponibilità, prezzi e condizioni prima dell'acquisto? Il sito non ha elaborato un pagamento.",
  ].filter(Boolean).join("\n");

  const whatsapp = String(state.site.whatsapp || "").replace(/\D/g, "");
  const destinationEmail = String(state.site.email || "").trim();
  if (whatsapp.length >= 8) {
    window.location.assign(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`);
    return;
  }
  if (destinationEmail) {
    const subject = encodeURIComponent(`Richiesta d'ordine - ${state.site.brand || "Colosso"}`);
    window.location.assign(`mailto:${destinationEmail}?subject=${subject}&body=${encodeURIComponent(message)}`);
    return;
  }
  if (status) status.textContent = "Configura un recapito WhatsApp o email aziendale prima di inviare l'ordine.";
}

function setupCart() {
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const addButton = target.closest("[data-add-to-cart]");
    if (addButton) {
      addToCart(addButton.dataset.addToCart);
      return;
    }
    const changeButton = target.closest("[data-cart-change]");
    if (changeButton) {
      const serviceId = changeButton.dataset.serviceId;
      setCartQuantity(serviceId, (state.cart[serviceId] || 0) + Number(changeButton.dataset.cartChange));
      return;
    }
    const removeButton = target.closest("[data-cart-remove]");
    if (removeButton) setCartQuantity(removeButton.dataset.cartRemove, 0);
  });

  document.addEventListener("change", (event) => {
    const target = event.target instanceof HTMLInputElement ? event.target : null;
    if (!target?.matches("[data-cart-quantity]")) return;
    const quantity = Number(target.value);
    if (target.value === "" || !Number.isSafeInteger(quantity) || quantity < 0) {
      target.value = String(state.cart[target.dataset.serviceId] || 1);
      return;
    }
    setCartQuantity(target.dataset.serviceId, quantity);
  });

  const form = document.querySelector("#cart-order-form");
  if (form) {
    form.addEventListener("submit", submitCartRequest);
    form.querySelectorAll('[name="voucher"], [name="voucher_discount"]').forEach((input) => {
      input.addEventListener("input", renderCart);
    });
  }
  window.addEventListener("storage", (event) => {
    if (event.key !== cartStorageKey) return;
    state.cart = readCart();
    renderCart();
  });
  renderCart();
}

function renderHome() {
  const featuredGrid = document.querySelector("[data-home-services]");
  if (featuredGrid) {
    const featured = activeServices().filter((service) => service.featured === true).slice(0, 4);
    featuredGrid.innerHTML = featured.length
      ? featured.map(serviceCard).join("")
      : '<p class="empty-state">I servizi in evidenza saranno disponibili a breve.</p>';
  }

  const packagesGrid = document.querySelector("[data-subscriptions]");
  if (packagesGrid) {
    const packages = activeServices().filter((service) => service.category === "Abbonamenti");
    packagesGrid.innerHTML = packages.length
      ? packages.map(serviceCard).join("")
      : '<p class="empty-state">I pacchetti in abbonamento saranno disponibili a breve.</p>';
  }
}

function populateCategoryFilter() {
  const filter = document.querySelector("#service-category");
  if (!filter) return;

  const options = [...new Set(activeServices().map((service) => service.category).filter(Boolean))]
    .sort((first, second) => first.localeCompare(second, "it"))
    .map((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      return option;
    });
  filter.replaceChildren(new Option("Tutte le aree", "tutte"), ...options);
}

function renderCatalog() {
  const grid = document.querySelector("#service-grid");
  if (!grid) return;

  const normalizedSearch = normalizeText(state.search);
  const visible = activeServices().filter((service) => {
    const matchesCategory = state.category === "tutte" || service.category === state.category;
    const searchableText = normalizeText(`${service.name} ${service.category} ${service.kind} ${service.description}`);
    return matchesCategory && searchableText.includes(normalizedSearch);
  });

  if (state.sort === "az") {
    visible.sort((first, second) => String(first.name).localeCompare(String(second.name), "it"));
  } else {
    visible.sort((first, second) => Number(second.featured === true) - Number(first.featured === true));
  }

  grid.innerHTML = visible.map(serviceCard).join("");
  const status = document.querySelector("#catalog-status");
  if (status) status.textContent = `${visible.length} ${visible.length === 1 ? "servizio" : "servizi"}`;
  const empty = document.querySelector("#catalog-empty");
  if (empty) empty.hidden = visible.length > 0;
}

function renderServiceDetail() {
  const detail = document.querySelector("#service-detail");
  if (!detail) return;

  const id = new URLSearchParams(window.location.search).get("id");
  const service = activeServices().find((item) => item.id === id);
  const notFound = document.querySelector("#service-not-found");
  if (!service) {
    detail.hidden = true;
    if (notFound) notFound.hidden = false;
    return;
  }

  document.querySelector("#service-title").textContent = service.name || "Servizio Colosso";
  document.querySelector("#service-category").textContent = service.category || "Servizi";
  document.querySelector("#service-kind").textContent = service.format || service.kind || "Su richiesta";
  const price = document.querySelector("#service-price");
  if (price) price.textContent = servicePriceText(service);
  const addButton = document.querySelector("#service-add-to-cart");
  if (addButton) {
    addButton.dataset.addToCart = String(service.id);
    addButton.disabled = false;
  }
  document.querySelector("#service-description").textContent = service.description || "";
  document.querySelector("#service-breadcrumb").textContent = service.name || "Servizio";
  document.title = `${service.name || "Servizio"} — ${state.site.brand || "Colosso"}`;
  const pageDescription = document.querySelector('meta[name="description"]');
  if (pageDescription) {
    pageDescription.content = `${service.name || "Servizio"}: ${service.description || "Scopri i servizi Colosso."}`.slice(0, 160);
  }

  const image = document.querySelector("#service-image");
  image.src = safeImageUrl(service.image);
  image.alt = service.name || "Servizio Colosso";
  image.addEventListener("error", () => {
    image.src = fallbackImage;
  }, { once: true });

  const facts = document.querySelector("#service-facts");
  const specifications = Array.isArray(service.specifications) ? service.specifications : [];
  facts.innerHTML = specifications.map((item) => `
    <div><dt>${escapeHtml(item.label || "")}</dt><dd>${escapeHtml(item.value || "")}</dd></div>
  `).join("");
  facts.hidden = specifications.length === 0;

  document.querySelectorAll("[data-service-contact]").forEach((link) => {
    link.href = `index.html?service=${encodeURIComponent(service.id)}#contatti`;
  });
  detail.hidden = false;
  if (notFound) notFound.hidden = true;
}

function renderContactDetails() {
  const site = state.site;
  document.querySelectorAll("[data-brand]").forEach((element) => {
    element.textContent = site.brand || "Colosso";
  });
  document.querySelectorAll("[data-tagline]").forEach((element) => {
    element.textContent = site.tagline || "Assistenza tecnica e soluzioni digitali.";
  });
  document.querySelectorAll("[data-intro]").forEach((element) => {
    element.textContent = site.intro || "";
  });
  document.querySelectorAll("[data-contact-note]").forEach((element) => {
    element.textContent = site.contact_note || "Raccontaci di cosa hai bisogno.";
  });

  const coverage = document.querySelector("[data-coverage]");
  if (coverage && site.coverage) {
    coverage.textContent = site.coverage;
    coverage.hidden = false;
  }

  const phone = String(site.phone || "").trim();
  document.querySelectorAll("[data-phone-link]").forEach((link) => {
    if (!phone) return;
    link.href = `tel:${phone.replace(/[^+\d]/g, "")}`;
    link.textContent = phone;
    link.hidden = false;
  });

  const email = String(site.email || "").trim();
  document.querySelectorAll("[data-email-link]").forEach((link) => {
    if (!email) return;
    link.href = `mailto:${email}`;
    link.textContent = email;
    link.hidden = false;
  });

  const whatsapp = String(site.whatsapp || "").replace(/\D/g, "");
  document.querySelectorAll("[data-whatsapp-link]").forEach((link) => {
    if (whatsapp.length < 8) return;
    link.href = `https://wa.me/${whatsapp}`;
    link.hidden = false;
  });

  const address = document.querySelector("[data-address]");
  if (address && site.address) {
    address.textContent = site.address;
    address.hidden = false;
  }

  const contactState = document.querySelector("[data-contact-state]");
  if (contactState) {
    contactState.textContent = site.email || site.whatsapp
      ? "Puoi inviare la richiesta tramite WhatsApp o email."
      : site.phone
        ? "Puoi chiamarci; per inviare una richiesta serve anche WhatsApp o email."
        : "Recapiti aziendali da configurare prima della pubblicazione.";
  }

  const legal = site.legal || {};
  const legalFields = [
    ["Denominazione", legal.holder],
    ["Forma giuridica", legal.legal_form],
    ["Sede legale", legal.registered_office],
    ["Partita IVA", legal.vat_number],
    ["REA", legal.rea],
  ].filter(([, value]) => String(value || "").trim());
  const legalList = document.querySelector("#legal-details-list");
  const legalSection = document.querySelector("#legal-details");
  if (legalList && legalSection && legalFields.length) {
    legalList.innerHTML = legalFields.map(([label, value]) => `
      <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
    `).join("");
    legalSection.hidden = false;
  }
}

function setupCatalogControls() {
  const search = document.querySelector("#service-search");
  const category = document.querySelector("#service-category");
  const sort = document.querySelector("#service-sort");
  if (!search || !category || !sort) return;

  populateCategoryFilter();
  const requestedCategory = new URLSearchParams(window.location.search).get("categoria");
  if ([...category.options].some((option) => option.value === requestedCategory)) {
    state.category = requestedCategory;
    category.value = requestedCategory;
  }
  search.addEventListener("input", () => {
    state.search = search.value.trim();
    renderCatalog();
  });
  category.addEventListener("change", () => {
    state.category = category.value;
    renderCatalog();
  });
  sort.addEventListener("change", () => {
    state.sort = sort.value;
    renderCatalog();
  });
  renderCatalog();
}

function setupContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const serviceSelect = form.querySelector("[name=service]");
  if (serviceSelect) {
    const options = activeServices().map((service) => new Option(service.name, service.id));
    serviceSelect.replaceChildren(new Option("Seleziona un servizio", ""), ...options);
    const requestedService = new URLSearchParams(window.location.search).get("service");
    if (requestedService && state.services.some((service) => service.id === requestedService)) {
      serviceSelect.value = requestedService;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const service = state.services.find((item) => item.id === fields.get("service"));
    const voucher = String(fields.get("voucher") || "").trim();
    const message = [
      `Buongiorno ${state.site.brand || "Colosso"}, vorrei ricevere informazioni.`,
      "",
      `Nome: ${String(fields.get("name") || "").trim()}`,
      fields.get("email") ? `Email: ${String(fields.get("email")).trim()}` : "",
      fields.get("phone") ? `Telefono: ${String(fields.get("phone")).trim()}` : "",
      service ? `Servizio: ${service.name}` : "",
      `Richiesta: ${String(fields.get("message") || "").trim()}`,
      voucher ? `Codice buono Cartaway: ${voucher} (da verificare)` : "",
      "",
      "Confermate disponibilità, condizioni e l'eventuale sconto applicabile prima dell'acquisto?",
    ].filter(Boolean).join("\n");

    const whatsapp = String(state.site.whatsapp || "").replace(/\D/g, "");
    const email = String(state.site.email || "").trim();
    const status = document.querySelector("#contact-form-status");
    if (whatsapp.length >= 8) {
      window.location.assign(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`);
      return;
    }
    if (email) {
      const subject = encodeURIComponent(`Richiesta informazioni - ${state.site.brand || "Colosso"}`);
      window.location.assign(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(message)}`);
      return;
    }
    if (status) status.textContent = "Configura un recapito WhatsApp o email aziendale prima di inviare la richiesta.";
  });
}

function setupMenu() {
  const toggle = document.querySelector("#menu-toggle");
  const navigation = document.querySelector("#primary-navigation");
  if (!toggle || !navigation) return;

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.setAttribute("aria-label", expanded ? "Apri il menu" : "Chiudi il menu");
    navigation.classList.toggle("is-open", !expanded);
  });
  navigation.addEventListener("click", (event) => {
    if (!event.target.closest("a")) return;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Apri il menu");
    navigation.classList.remove("is-open");
  });
}

async function initializeSite() {
  setupMenu();
  setupCart();
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  try {
    const [siteResponse, servicesResponse] = await Promise.all([
      fetch("data/site.json", { cache: "no-store" }),
      fetch("data/services.json", { cache: "no-store" }),
    ]);
    if (!siteResponse.ok || !servicesResponse.ok) throw new Error("Dati del sito non disponibili.");

    const [site, catalog] = await Promise.all([siteResponse.json(), servicesResponse.json()]);
    state.site = site || {};
    state.services = Array.isArray(catalog.services) ? catalog.services : [];
    state.cart = Object.fromEntries(
      Object.entries(state.cart).filter(([id]) => activeServices().some((service) => service.id === id)),
    );
    saveCart();
    renderContactDetails();
    setupContactForm();
    renderCart();

    if (state.page === "home") renderHome();
    if (state.page === "catalog") setupCatalogControls();
    if (state.page === "service") renderServiceDetail();
  } catch (error) {
    console.error(error);
    const status = document.querySelector("#catalog-status") || document.querySelector("#service-load-status");
    if (status) status.textContent = "Impossibile caricare i servizi. Riprova tra poco.";
    setupContactForm();
  }
}

function setupHeroGallery() {
  const hero = document.querySelector("#inizio");
  if (!hero) return;

  const image = hero.querySelector("#hero-image");
  const eyebrow = hero.querySelector("#hero-eyebrow");
  const title = hero.querySelector("#hero-title");
  const intro = hero.querySelector("#hero-intro");
  const action = hero.querySelector("#hero-action");
  const actionLabel = hero.querySelector("#hero-action-label");
  const highlight = hero.querySelector("#hero-delivery-highlight");
  const secondary = hero.querySelector("#hero-delivery-secondary");
  const caption = hero.querySelector("#hero-caption");
  const counter = hero.querySelector("#hero-slide-count");
  const previous = hero.querySelector("#hero-previous");
  const toggle = hero.querySelector("#hero-toggle");
  const next = hero.querySelector("#hero-next");
  if (!image || !eyebrow || !title || !intro || !action || !actionLabel || !highlight || !secondary || !caption || !counter || !previous || !toggle || !next) return;

  const slides = [
    {
      eyebrow: "ASSISTENZA TECNICA · RIPARAZIONI",
      title: "La tecnologia torna a funzionare.",
      intro: "Smartphone, computer ed elettronica: individuiamo il guasto e ti proponiamo il percorso più adatto, prima di intervenire.",
      action: "Scopri le riparazioni",
      href: "catalogo.html?categoria=Riparazioni",
      highlight: "Smartphone, PC ed elettronica",
      secondary: "Diagnosi e preventivo prima di iniziare.",
      caption: "RIPARAZIONI · ASSISTENZA TECNICA",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2200&q=85",
      alt: "Scheda elettronica in fase di riparazione",
    },
    {
      eyebrow: "DOMINI · SITI WEB · EMAIL",
      title: "La tua presenza digitale, fatta bene.",
      intro: "Dominio, hosting, sito ed email professionale: strumenti coerenti con il modo in cui lavori.",
      action: "Esplora i servizi digitali",
      href: "catalogo.html?categoria=Servizi%20digitali",
      highlight: "Web, email e hosting",
      secondary: "Una proposta costruita sul tuo progetto.",
      caption: "SERVIZI DIGITALI · WEB · EMAIL",
      image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=2200&q=85",
      alt: "Infrastruttura server per servizi web e hosting",
    },
    {
      eyebrow: "AUTOMAZIONI · PROCESSI AZIENDALI",
      title: "Meno passaggi manuali. Più spazio al lavoro.",
      intro: "Colleghiamo strumenti e flussi ripetitivi per semplificare attività e informazioni nella tua impresa.",
      action: "Parliamo dei tuoi processi",
      href: "prodotto.html?id=automazione-processi",
      highlight: "Dall'analisi alla soluzione",
      secondary: "Automazioni progettate sul tuo processo.",
      caption: "AUTOMAZIONI · PROCESSI AZIENDALI",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=2200&q=85",
      alt: "Persone collaborano a un progetto digitale",
    },
    {
      eyebrow: "ASSISTENZA CONTINUATIVA · COLOSSO CARE",
      title: "Un riferimento tecnico, quando ti serve.",
      intro: "Supporto continuativo per dispositivi e strumenti digitali, con attività e frequenza concordate.",
      action: "Scopri i pacchetti",
      href: "catalogo.html?categoria=Abbonamenti",
      highlight: "Assistenza e servizi ricorrenti",
      secondary: "Perimetro e canone definiti prima di iniziare.",
      caption: "SUPPORTO CONTINUATIVO · COLOSSO CARE",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=2200&q=85",
      alt: "Professionista al lavoro su un computer",
    },
    {
      eyebrow: "UN VANTAGGIO CHE VIAGGIA CON TE",
      title: "Hai un buono Cartaway?",
      intro: "Inserisci il codice nella richiesta Colosso. Verifichiamo validità e sconto applicabile prima di confermare l'acquisto.",
      action: "Usa il tuo buono",
      href: "#buoni",
      highlight: "Il codice si inserisce nella richiesta",
      secondary: "Validità e sconto verificati prima della conferma.",
      caption: "BUONO CARTAWAY · CODICE E SCONTO DA VERIFICARE",
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=2200&q=85",
      alt: "Pagamento digitale con carta",
    },
  ];

  let activeIndex = 0;
  let autoplayTimer = 0;
  let renderToken = 0;
  let isPlaying = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function updatePlaybackControl() {
    const label = isPlaying ? "Metti in pausa la galleria" : "Avvia la galleria";
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("aria-pressed", String(isPlaying));
    toggle.title = label;
    toggle.textContent = isPlaying ? "Ⅱ" : "▶";
  }

  function stopAutoplay() {
    window.clearInterval(autoplayTimer);
    autoplayTimer = 0;
  }

  function startAutoplay() {
    stopAutoplay();
    if (!isPlaying || document.hidden) return;
    autoplayTimer = window.setInterval(() => showSlide(activeIndex + 1), 7000);
  }

  function showSlide(slideIndex) {
    activeIndex = (slideIndex + slides.length) % slides.length;
    const slide = slides[activeIndex];
    const token = ++renderToken;
    hero.classList.add("is-changing");

    window.setTimeout(() => {
      if (token !== renderToken) return;
      image.src = slide.image;
      image.alt = slide.alt;
      eyebrow.textContent = slide.eyebrow;
      title.textContent = slide.title;
      intro.textContent = slide.intro;
      action.href = slide.href;
      actionLabel.textContent = slide.action;
      highlight.textContent = slide.highlight;
      secondary.textContent = slide.secondary;
      caption.textContent = slide.caption;
      counter.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
      window.requestAnimationFrame(() => hero.classList.remove("is-changing"));
    }, 160);
  }

  previous.addEventListener("click", () => {
    showSlide(activeIndex - 1);
    startAutoplay();
  });
  next.addEventListener("click", () => {
    showSlide(activeIndex + 1);
    startAutoplay();
  });
  toggle.addEventListener("click", () => {
    isPlaying = !isPlaying;
    updatePlaybackControl();
    startAutoplay();
  });
  document.addEventListener("visibilitychange", startAutoplay);

  updatePlaybackControl();
  startAutoplay();
}

setupHeroGallery();
initializeSite();