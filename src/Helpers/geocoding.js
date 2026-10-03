// Coordinates for Tunisian governorates and key delegations
export const TUNISIA_COORDINATES = {
  // Governorates centers
  "tunis": { lat: 36.8065, lng: 10.1815 },
  "ariana": { lat: 36.8665, lng: 10.1647 },
  "ben arous": { lat: 36.7531, lng: 10.2189 },
  "manouba": { lat: 36.8081, lng: 10.0972 },
  "bizerte": { lat: 37.2744, lng: 9.8739 },
  "nabeul": { lat: 36.4561, lng: 10.7376 },
  "hammamet": { lat: 36.4000, lng: 10.6167 },
  "zaghouan": { lat: 36.4029, lng: 10.1429 },
  "sousse": { lat: 35.8256, lng: 10.63699 },
  "monastir": { lat: 35.7779, lng: 10.8262 },
  "mahdia": { lat: 35.5047, lng: 11.0622 },
  "sfax": { lat: 34.7406, lng: 10.7603 },
  "beja": { lat: 36.7256, lng: 9.1817 },
  "jendouba": { lat: 36.5011, lng: 8.7802 },
  "le kef": { lat: 36.1742, lng: 8.7049 },
  "kef": { lat: 36.1742, lng: 8.7049 },
  "siliana": { lat: 36.0850, lng: 9.3708 },
  "kairouan": { lat: 35.6781, lng: 10.0963 },
  "kasserine": { lat: 35.1676, lng: 8.8365 },
  "sidi bouzid": { lat: 35.0382, lng: 9.4849 },
  "gafsa": { lat: 34.4250, lng: 8.7842 },
  "tozeur": { lat: 33.9197, lng: 8.1335 },
  "kebili": { lat: 33.7044, lng: 8.9690 },
  "gabes": { lat: 33.8815, lng: 10.0982 },
  "medenine": { lat: 33.3549, lng: 10.5055 },
  "djerba": { lat: 33.8076, lng: 10.8451 },
  "tataouine": { lat: 32.9297, lng: 10.4518 },

  // Key Delegations & Neighborhoods
  "la marsa": { lat: 36.8782, lng: 10.3247 },
  "marsa": { lat: 36.8782, lng: 10.3247 },
  "carthage": { lat: 36.8529, lng: 10.3217 },
  "sidi bou said": { lat: 36.8687, lng: 10.3418 },
  "la goulette": { lat: 36.8181, lng: 10.3050 },
  "le kram": { lat: 36.8329, lng: 10.3182 },
  "kram": { lat: 36.8329, lng: 10.3182 },
  "lac 1": { lat: 36.8288, lng: 10.2312 },
  "lac 2": { lat: 36.8385, lng: 10.2520 },
  "les berges du lac": { lat: 36.8335, lng: 10.2393 },
  "el menzah": { lat: 36.8344, lng: 10.1772 },
  "menzah": { lat: 36.8344, lng: 10.1772 },
  "ennasr": { lat: 36.8576, lng: 10.1589 },
  "nasr": { lat: 36.8576, lng: 10.1589 },
  "ariana ville": { lat: 36.8625, lng: 10.1956 },
  "la soukra": { lat: 36.8837, lng: 10.2524 },
  "soukra": { lat: 36.8837, lng: 10.2524 },
  "raoued": { lat: 36.9208, lng: 10.1989 },
  "el mourouj": { lat: 36.7328, lng: 10.2155 },
  "mourouj": { lat: 36.7328, lng: 10.2155 },
  "rades": { lat: 36.7678, lng: 10.2747 },
  "ezzahra": { lat: 36.7441, lng: 10.3075 },
  "hammam lif": { lat: 36.7297, lng: 10.3400 },
  "megrine": { lat: 36.7692, lng: 10.2372 },
  "fouchana": { lat: 36.7028, lng: 10.1706 },
  "mohamadia": { lat: 36.6744, lng: 10.1583 },
  "mornag": { lat: 36.6806, lng: 10.2925 },
  "denden": { lat: 36.8042, lng: 10.1172 },
  "oued ellil": { lat: 36.8292, lng: 10.0469 },
  "bardo": { lat: 36.8094, lng: 10.1417 },
  "centre ville": { lat: 36.8000, lng: 10.1800 },
  "lafayette": { lat: 36.8120, lng: 10.1810 },
  "belvedere": { lat: 36.8200, lng: 10.1700 },
  "el manar": { lat: 36.8330, lng: 10.1500 },
  "manar": { lat: 36.8330, lng: 10.1500 },
};

/**
 * Resolves latitude and longitude for a customer or address in Tunisia.
 * If coordinates are provided on the object, returns them directly.
 * Otherwise, maps governorate/delegation and adds a deterministic jitter by id.
 */
export function getCoordinatesForDelivery(delivery) {
  // If delivery or customer already has direct latitude & longitude
  if (delivery?.lat && delivery?.lng) {
    return { lat: Number(delivery.lat), lng: Number(delivery.lng) };
  }
  if (delivery?.customer?.latitude && delivery?.customer?.longitude) {
    return {
      lat: Number(delivery.customer.latitude),
      lng: Number(delivery.customer.longitude),
    };
  }

  const customer = delivery?.customer || {};
  const city = (customer.city || "").toLowerCase().trim();
  const deleg = (customer.deleg || "").toLowerCase().trim();
  const address = (customer.address || "").toLowerCase().trim();

  // Try matching delegation first, then city, then anywhere in address
  let baseCoords = null;
  if (deleg && TUNISIA_COORDINATES[deleg]) {
    baseCoords = TUNISIA_COORDINATES[deleg];
  } else if (city && TUNISIA_COORDINATES[city]) {
    baseCoords = TUNISIA_COORDINATES[city];
  } else {
    // Check address string for known locations
    for (const key of Object.keys(TUNISIA_COORDINATES)) {
      if (address.includes(key)) {
        baseCoords = TUNISIA_COORDINATES[key];
        break;
      }
    }
  }

  // Fallback to Tunis center if nothing matched
  if (!baseCoords) {
    baseCoords = TUNISIA_COORDINATES["tunis"];
  }

  // Apply a subtle deterministic offset based on the delivery ID
  // so distinct packages in the same city don't completely overlap
  const idNum = Number(delivery?.id) || 1;
  const angle = (idNum * 137.5) * (Math.PI / 180); // Golden angle distribution
  const radius = 0.003 + ((idNum % 7) * 0.0015); // ~300m - 1.2km spread

  const offsetLat = Math.sin(angle) * radius;
  const offsetLng = Math.cos(angle) * radius;

  return {
    lat: baseCoords.lat + offsetLat,
    lng: baseCoords.lng + offsetLng,
  };
}

/**
 * Calculate distance between two lat/lng points in km (Haversine formula)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * Resolves coordinates for a depot / preparation place
 */
export function getDepotCoordinates(depot) {
  if (depot?.latitude && depot?.longitude) {
    return { lat: Number(depot.latitude), lng: Number(depot.longitude) };
  }
  const nameOrCode = `${depot?.name || ""} ${depot?.code || ""} ${depot?.address || ""}`.toLowerCase();
  if (nameOrCode.includes("sousse")) {
    return { lat: 35.8256, lng: 10.6369 };
  }
  if (nameOrCode.includes("sfax")) {
    return { lat: 34.7406, lng: 10.7603 };
  }
  return { lat: 36.8431, lng: 10.2033 }; // Dépôt Central Tunis (Charguia / Ariana)
}

/**
 * Sorts deliveries using Nearest-Neighbor ("الأقرب فالأقرب") algorithm:
 * Starts from the chosen origin (Depot at start of day OR Driver's live GPS position)
 * and iteratively visits the closest next stop.
 */
export function sortDeliveriesByNearest(deliveries = [], originPoint, depotPoint, driverLocation = null) {
  if (!Array.isArray(deliveries) || deliveries.length === 0) return [];

  const startPos = originPoint || depotPoint || { lat: 36.8431, lng: 10.2033, label: "Dépôt" };
  const refDepot = depotPoint || { lat: 36.8431, lng: 10.2033 };

  const enriched = deliveries.map((d) => {
    const coords = getCoordinatesForDelivery(d);
    const distFromDepot = calculateDistanceKm(refDepot.lat, refDepot.lng, coords.lat, coords.lng);
    const distFromDriver = driverLocation
      ? calculateDistanceKm(driverLocation.lat, driverLocation.lng, coords.lat, coords.lng)
      : null;
    return {
      ...d,
      _coords: coords,
      _distFromDepotKm: distFromDepot,
      _distFromDriverKm: distFromDriver,
    };
  });

  // Pending stops first (ordered nearest-by-nearest), delivered stops after
  const unvisited = enriched.filter((d) => d.status !== 5);
  const completed = enriched.filter((d) => d.status === 5);

  const orderedPending = [];
  let currentPos = { lat: startPos.lat, lng: startPos.lng };
  let prevLabel = startPos.label || "Dépôt";
  let cumulativeKm = 0;
  let stepCounter = 1;

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const dist = calculateDistanceKm(
        currentPos.lat,
        currentPos.lng,
        candidate._coords.lat,
        candidate._coords.lng
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    const [nextStop] = unvisited.splice(bestIdx, 1);
    const legDist = Number(bestDist.toFixed(1));
    cumulativeKm = Number((cumulativeKm + legDist).toFixed(1));

    orderedPending.push({
      ...nextStop,
      _stepOrder: stepCounter,
      _distFromPrevKm: legDist,
      _prevLabel: prevLabel,
      _cumulativeDistKm: cumulativeKm,
    });

    currentPos = nextStop._coords;
    prevLabel = `Étape #${stepCounter}`;
    stepCounter++;
  }

  const orderedCompleted = completed.map((d, idx) => ({
    ...d,
    _stepOrder: orderedPending.length + idx + 1,
    _distFromPrevKm: d._distFromDepotKm,
    _prevLabel: "Dépôt",
    _cumulativeDistKm: cumulativeKm,
  }));

  return [...orderedPending, ...orderedCompleted];
}

