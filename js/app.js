let map = null;
let mapReady = false;

const markers = new Map();
const locationList = document.getElementById("location-list");
const locationDetail = document.getElementById("location-detail");
const detailContent = document.getElementById("detail-content");
const backButton = document.getElementById("back-button");

let activeLocationId = null;

function telHref(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return `tel:+55${digits}`;
}

function emailLabel(email) {
  const at = String(email).indexOf("@");
  if (at < 0) return email;
  return `${email.slice(0, at + 1)}<wbr>${email.slice(at + 1)}`;
}

function renderDetail(location) {
  detailContent.innerHTML = `
    <h2 class="detail__title">${location.title}</h2>
    <p class="detail__subtitle">${location.address}</p>
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-item__label">Telefone</span>
        <p class="detail-item__value"><a href="${telHref(location.phone)}">${location.phone}</a></p>
      </div>
      <div class="detail-item">
        <span class="detail-item__label">E-mail</span>
        <p class="detail-item__value"><a href="mailto:${location.email}">${location.email}</a></p>
      </div>
      <div class="detail-item">
        <span class="detail-item__label">Endereço completo</span>
        <p class="detail-item__value">${location.address}</p>
      </div>
      <div class="detail-item">
        <span class="detail-item__label">Cidade / UF</span>
        <p class="detail-item__value">${location.city} - ${location.state}</p>
      </div>
    </div>
  `;
}

function showList() {
  locationDetail.hidden = true;
  locationList.hidden = false;
  activeLocationId = null;
  updateActiveCards();
}

function showDetail(location, options = {}) {
  const { panMap = true, openPopup = true } = options;

  activeLocationId = location.id;
  renderDetail(location);
  locationList.hidden = true;
  locationDetail.hidden = false;
  updateActiveCards();

  const marker = markers.get(location.id);
  if (!marker || !map) {
    return;
  }

  if (panMap) {
    map.flyTo([location.lat, location.lng], 14, { duration: 0.8 });
  }

  if (openPopup) {
    marker.openPopup();
  }
}

function updateActiveCards() {
  document.querySelectorAll(".location-card").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.id === activeLocationId);
  });
}

function createMarker(location) {
  const marker = L.marker([location.lat, location.lng]).addTo(map);

  marker.bindPopup(`
    <p class="popup-title">${location.title}</p>
    <p class="popup-address">${location.phone}</p>
    <p class="popup-address"><a href="mailto:${location.email}">${location.email}</a></p>
  `);

  marker.on("click", () => {
    showDetail(location, { panMap: false, openPopup: false });
  });

  markers.set(location.id, marker);
}

function renderLocationList() {
  if (!locationList || locationList.childElementCount) {
    return;
  }

  LOCATIONS.forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "location-card__open";
    button.innerHTML = `
      <h3 class="location-card__title">${location.title}</h3>
      <p class="location-card__address">${location.address}</p>
    `;

    const contact = document.createElement("div");
    contact.className = "location-card__contact";
    contact.innerHTML = `
      <a href="${telHref(location.phone)}">${location.phone}</a>
      <a href="mailto:${location.email}">${emailLabel(location.email)}</a>
    `;

    const body = document.createElement("div");
    body.className = "location-card__body";
    body.appendChild(button);
    body.appendChild(contact);

    const photo = document.createElement("img");
    photo.className = "location-card__photo";
    photo.src = location.image;
    photo.alt = "";

    const card = document.createElement("div");
    card.className = "location-card";
    card.dataset.id = location.id;
    card.appendChild(photo);
    card.appendChild(body);

    button.addEventListener("click", () => {
      showDetail(location);
    });

    locationList.appendChild(card);
    createMarker(location);
  });
}

function initMap() {
  if (mapReady) {
    map.invalidateSize();
    return;
  }

  map = L.map("map", {
    zoomControl: true,
    scrollWheelZoom: false,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  renderLocationList();

  const bounds = L.latLngBounds(
    LOCATIONS.map((location) => [location.lat, location.lng])
  );
  map.fitBounds(bounds.pad(0.18));

  mapReady = true;

  requestAnimationFrame(() => {
    map.invalidateSize();
    map.fitBounds(bounds.pad(0.18));
  });
}

window.initEstadiaMap = initMap;

if (backButton) {
  backButton.addEventListener("click", showList);
}

if (document.getElementById("map")) {
  initMap();
}

function renderGifts(gifts, category) {
  const list = document.getElementById("gift-list");
  if (!list) return;
  const brl = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  list.innerHTML = gifts
    .filter((gift) => category === "Todos" || gift.category === category)
    .map(
      (gift) => `
      <article class="gift-card">
        <div class="gift-img"><img src="${gift.image}" alt="" loading="lazy"></div>
        <h3>${gift.title}</h3>
        <p class="price">${brl.format(gift.price)}</p>
        <button class="gift-btn" type="button" data-gift-id="${gift.id}">Presentear</button>
      </article>`
    )
    .join("");
}

async function startCheckout(button) {
  const card = button.closest(".gift-card");
  const previous = card.querySelector(".gift-error");
  if (previous) previous.remove();
  button.disabled = true;
  button.textContent = "Abrindo...";
  try {
    const response = await fetch("/.netlify/functions/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: button.dataset.giftId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.checkout_url !== "string") {
      throw new Error(data.error || "Não foi possível abrir o pagamento.");
    }
    window.location.href = data.checkout_url;
  } catch (error) {
    button.disabled = false;
    button.textContent = "Presentear";
    const note = document.createElement("p");
    note.className = "gift-error";
    note.textContent = error.message || "Não foi possível abrir o pagamento.";
    button.after(note);
  }
}

async function initGifts() {
  const menu = document.getElementById("gift-menu");
  const list = document.getElementById("gift-list");
  const status = new URLSearchParams(location.search).get("pagamento");
  const messages = {
    aprovado: "Pagamento recebido. Obrigado pelo presente.",
    pendente: "Pagamento em análise. O presente é confirmado quando o Mercado Pago aprovar.",
    recusado: "O pagamento não foi concluído. Você pode escolher o presente de novo.",
  };
  const banner = document.getElementById("gift-status");
  if (banner && messages[status]) {
    banner.hidden = false;
    banner.textContent = messages[status];
    if (location.hash !== "#presentes") location.hash = "presentes";
  }
  if (!menu || !list) return;
  let gifts = [];
  try {
    const response = await fetch("./js/gifts.json");
    if (response.ok) gifts = await response.json();
  } catch {
    gifts = [];
  }
  if (!Array.isArray(gifts) || gifts.length === 0) return;
  const categories = ["Todos", ...new Set(gifts.map((gift) => gift.category))];
  menu.innerHTML = categories
    .map(
      (category, index) =>
        `<button type="button" class="${index === 0 ? "active" : ""}" data-gift-cat="${category}">${category}</button>`
    )
    .join("");
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    menu.querySelectorAll("button").forEach((item) => {
      item.classList.toggle("active", item === button);
    });
    renderGifts(gifts, button.dataset.giftCat);
  });
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gift-id]");
    if (!button || button.disabled) return;
    startCheckout(button);
  });
  renderGifts(gifts, categories[0]);
}

initGifts();
