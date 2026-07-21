let map = null;
let mapReady = false;

const markers = new Map();
const locationList = document.getElementById("location-list");
const locationDetail = document.getElementById("location-detail");
const detailContent = document.getElementById("detail-content");
const backButton = document.getElementById("back-button");

let activeLocationId = null;

function renderDetail(location) {
  detailContent.innerHTML = `
    <h2 class="detail__title">${location.title}</h2>
    <p class="detail__subtitle">${location.address}</p>
    <div class="detail-grid">
      <div class="detail-item">
        <span class="detail-item__label">Endereço completo</span>
        <p class="detail-item__value">${location.address}</p>
      </div>
      <div class="detail-item">
        <span class="detail-item__label">Logradouro</span>
        <p class="detail-item__value">${location.street}</p>
      </div>
      <div class="detail-item">
        <span class="detail-item__label">Bairro</span>
        <p class="detail-item__value">${location.neighborhood}</p>
      </div>
      <div class="detail-item">
        <span class="detail-item__label">Cidade / UF</span>
        <p class="detail-item__value">${location.city} - ${location.state}</p>
      </div>
      <div class="detail-item">
        <span class="detail-item__label">CEP</span>
        <p class="detail-item__value">${location.cep}</p>
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
    <p class="popup-address">${location.street}</p>
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
    button.className = "location-card";
    button.dataset.id = location.id;
    button.innerHTML = `
      <h3 class="location-card__title">${location.title}</h3>
      <p class="location-card__address">${location.address}</p>
    `;

    button.addEventListener("click", () => {
      showDetail(location);
    });

    locationList.appendChild(button);
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
    scrollWheelZoom: true,
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

if (document.getElementById("estadia")?.classList.contains("active")) {
  initMap();
}
