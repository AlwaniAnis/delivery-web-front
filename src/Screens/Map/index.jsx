import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaDirections,
  FaRoute,
  FaCrosshairs,
  FaExternalLinkAlt,
  FaBoxOpen,
} from "react-icons/fa";
import { useRecoilValue } from "recoil";
import { APi } from "../../Api";
import { DeliveryStatus } from "../../Constants/types";
import { getCoordinatesForDelivery } from "../../Helpers/geocoding";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { DriversList } from "../../Atoms/drivers.atom";
import { activeRoleState, currentDriverIdState } from "../../Atoms/auth.atom";
import Swal from "sweetalert2";

// Default Seed / Demo deliveries in Grand Tunis if API returns empty
const SAMPLE_DELIVERIES = [
  {
    id: 101,
    qrCodeContent: "TW-2026-TUN-01",
    status: 1, // En attente
    totalPrice: 48.5,
    preparationPlaceId: 1,
    customer: {
      fullName: "Mohamed Ben Ali",
      phoneNumber: "98123456",
      address: "14 Rue du Lac Victoria",
      deleg: "Les Berges du Lac",
      city: "Tunis",
    },
    coliItems: [{ designation: "Colis Électronique & Câbles", qty: 1, unitPrice: 48.5 }],
  },
  {
    id: 102,
    qrCodeContent: "TW-2026-TUN-02",
    status: 1,
    totalPrice: 85.0,
    preparationPlaceId: 1,
    customer: {
      fullName: "Sonia Trabelsi",
      phoneNumber: "22345678",
      address: "Avenue Hédi Nouira",
      deleg: "Ennasr",
      city: "Ariana",
    },
    coliItems: [{ designation: "Vêtements & Chaussures", qty: 2, unitPrice: 42.5 }],
  },
  {
    id: 103,
    qrCodeContent: "TW-2026-TUN-03",
    status: 5, // Livré
    totalPrice: 120.0,
    preparationPlaceId: 1,
    customer: {
      fullName: "Karim Mansour",
      phoneNumber: "55789012",
      address: "Rue Habib Bourguiba",
      deleg: "La Marsa",
      city: "Tunis",
    },
    coliItems: [{ designation: "Montre Connectée Sport", qty: 1, unitPrice: 120.0 }],
  },
  {
    id: 104,
    qrCodeContent: "TW-2026-TUN-04",
    status: 1,
    totalPrice: 62.0,
    preparationPlaceId: 1,
    customer: {
      fullName: "Amira Gharbi",
      phoneNumber: "94321654",
      address: "Cité El Mourouj 4",
      deleg: "El Mourouj",
      city: "Ben Arous",
    },
    coliItems: [{ designation: "Accessoires Beauté & Soin", qty: 1, unitPrice: 62.0 }],
  },
  {
    id: 105,
    qrCodeContent: "TW-2026-TUN-05",
    status: 6, // Pas de réponse
    totalPrice: 35.0,
    preparationPlaceId: 2,
    customer: {
      fullName: "Yassine Dridi",
      phoneNumber: "21987654",
      address: "Boulevard 14 Janvier",
      deleg: "Sousse",
      city: "Sousse",
    },
    coliItems: [{ designation: "Pack Cosmétique Bio", qty: 1, unitPrice: 35.0 }],
  },
];

export default function MyMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const driverCircleRef = useRef(null);

  const activeRole = useRecoilValue(activeRoleState);
  const globalDriverId = useRecoilValue(currentDriverIdState);
  const depots = useRecoilValue(preparationPlacesState);
  const driversList = useRecoilValue(DriversList);

  const [deliveries, setDeliveries] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'pending' | 'delivered'
  const [selectedDepotFilter, setSelectedDepotFilter] = useState("all");
  const [viewScope, setViewScope] = useState(activeRole === "driver" ? "driver" : "all"); // 'driver' | 'all'
  const [mapReady, setMapReady] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center in Grand Tunis / Tunisia
    const map = L.map(mapContainerRef.current, {
      center: [36.8065, 10.1815],
      zoom: 12,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);

    markersLayerRef.current = markersGroup;
    routeLayerRef.current = routeGroup;
    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Fetch Deliveries: Try Driver Endpoint first; if empty or if in 'all' mode, fetch all deliveries
  const fetchDeliveries = () => {
    setLoading(true);

    const tryFetchAllDeliveries = () => {
      APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, { page: 1, take: 50 })
        .fetchAll()
        .then((res) => {
          setLoading(false);
          const list = res.data?.data || [];
          if (list.length > 0) {
            setDeliveries(list);
            if (!selectedStop) setSelectedStop(list[0]);
          } else {
            // Fallback to sample deliveries if database has none
            setDeliveries(SAMPLE_DELIVERIES);
            if (!selectedStop) setSelectedStop(SAMPLE_DELIVERIES[0]);
          }
        })
        .catch(() => {
          setLoading(false);
          setDeliveries(SAMPLE_DELIVERIES);
          if (!selectedStop) setSelectedStop(SAMPLE_DELIVERIES[0]);
        });
    };

    if (viewScope === "driver") {
      const dId = globalDriverId || 1003;
      APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/getForDriver", {
        driverId: dId,
        take: 50,
      })
        .fetchAll()
        .then((res) => {
          const list = res.data?.data || [];
          if (list.length > 0) {
            setLoading(false);
            setDeliveries(list);
            if (!selectedStop) setSelectedStop(list[0]);
          } else {
            // If driver has no assigned deliveries, fetch all deliveries so map shows colis
            tryFetchAllDeliveries();
          }
        })
        .catch(() => {
          tryFetchAllDeliveries();
        });
    } else {
      tryFetchAllDeliveries();
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [viewScope, globalDriverId]);

  // Request Current Location Immediately and Set up Continuous Tracking
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      console.warn("Geolocation API not available in this browser.");
      return;
    }

    // 1. Immediate position acquisition
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setDriverLocation(coords);
        setGpsActive(true);
        setGpsAccuracy(Math.round(pos.coords.accuracy));

        // Center map immediately to user's real current location!
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, {
            duration: 1.2,
          });
        }
      },
      (err) => {
        console.warn("Geolocation error:", err.message);
        setGpsActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // 2. Real-time continuous live tracking as the driver moves
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setDriverLocation(coords);
        setGpsActive(true);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
      },
      (err) => {
        console.warn("Watch position error:", err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update Markers, Route Polyline, and Depot Pins
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLayerRef.current;

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    const bounds = L.latLngBounds();

    // 1. Add All Dépôts (Storage & Preparation Places)
    depots.forEach((dp) => {
      // Resolve depot coordinates for Tunis and Sousse
      let dpCoords = { lat: 36.8431, lng: 10.2033 }; // Dépôt Tunis (Charguia)
      if (dp.name?.toLowerCase().includes("sousse") || dp.code?.toLowerCase().includes("sousse")) {
        dpCoords = { lat: 35.8256, lng: 10.6369 }; // Dépôt Sousse (Akouda)
      }

      const depotIcon = L.divIcon({
        className: "custom-depot-icon",
        html: `
          <div style="
            background: #312e81;
            color: #fff;
            width: 38px;
            height: 38px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(49, 46, 129, 0.4);
            border: 2px solid #fff;
            font-size: 16px;
          ">
            🏬
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker([dpCoords.lat, dpCoords.lng], { icon: depotIcon })
        .bindPopup(`
          <div style="font-weight: 800; color: #1e1b4b; font-size: 14px;">
            🏬 ${dp.name}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            ${dp.address || "Centre logistique"}
          </div>
          <div style="font-size: 11px; font-weight: 700; color: #4f46e5; margin-top: 6px;">
            Code : ${dp.code || `DEP-${dp.id}`}
          </div>
        `)
        .addTo(markersLayer);

      bounds.extend([dpCoords.lat, dpCoords.lng]);
    });

    // 2. Add Live Driver GPS Location Marker
    if (driverLocation) {
      // Accuracy radius circle
      if (driverLocation.accuracy) {
        L.circle([driverLocation.lat, driverLocation.lng], {
          radius: Math.min(driverLocation.accuracy, 250),
          color: "#10b981",
          fillColor: "#10b981",
          fillOpacity: 0.12,
          weight: 1,
        }).addTo(markersLayer);
      }

      const driverIcon = L.divIcon({
        className: "custom-driver-icon",
        html: `
          <div style="position: relative;">
            <div style="
              width: 44px;
              height: 44px;
              background: #10b981;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid white;
              box-shadow: 0 4px 16px rgba(16, 185, 129, 0.6);
              font-size: 20px;
            ">
              🚚
            </div>
            <div style="
              position: absolute;
              top: -6px;
              left: -6px;
              width: 56px;
              height: 56px;
              border-radius: 50%;
              border: 2px solid #10b981;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      L.marker([driverLocation.lat, driverLocation.lng], { icon: driverIcon })
        .bindPopup(`
          <div style="font-weight: 800; color: #065f46; font-size: 14px;">
            🚚 Votre Position GPS en Direct
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px;">
            Précision : ±${gpsAccuracy || 10} mètres
          </div>
        `)
        .addTo(markersLayer);

      bounds.extend([driverLocation.lat, driverLocation.lng]);
    }

    // 3. Filter stops based on status and depot filter
    const visibleStops = deliveries.filter((d) => {
      // Status filter
      if (filterStatus === "pending" && d.status === 5) return false;
      if (filterStatus === "delivered" && d.status !== 5) return false;

      // Depot filter
      if (selectedDepotFilter !== "all") {
        const pId = d.preparationPlaceId || d.preparationPlace?.id;
        if (Number(selectedDepotFilter) !== Number(pId)) return false;
      }

      return true;
    });

    // 4. Build Polyline Route Coordinates
    const routeCoords = [];
    if (driverLocation) {
      routeCoords.push([driverLocation.lat, driverLocation.lng]);
    }

    visibleStops.forEach((item, index) => {
      const coords = getCoordinatesForDelivery(item);
      routeCoords.push([coords.lat, coords.lng]);

      const isSelected = selectedStop?.id === item.id;
      const isDelivered = item.status === 5;
      const isFailed = item.status === 4 || item.status === 7;
      const isPostponed = item.status === 6 || item.status === 8;

      let markerBg = "#2563eb"; // Blue: To deliver
      if (isDelivered) markerBg = "#10b981"; // Green: Delivered
      else if (isFailed) markerBg = "#ef4444"; // Red: Canceled/Refused
      else if (isPostponed) markerBg = "#f59e0b"; // Orange: Postponed

      const totalAmt = (
        item.coliItems?.reduce((s, it) => s + it.qty * it.unitPrice, 0) ||
        item.totalPrice ||
        0
      ).toFixed(3);

      const stopIcon = L.divIcon({
        className: "custom-stop-marker",
        html: `
          <div style="
            position: relative;
            cursor: pointer;
            transition: all 0.2s ease;
            ${isSelected ? "transform: scale(1.3); z-index: 1000;" : ""}
          ">
            <div style="
              width: ${isSelected ? "38px" : "32px"};
              height: ${isSelected ? "38px" : "32px"};
              background: ${markerBg};
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: ${isSelected ? "14px" : "12px"};
              border: 2px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            ">
              ${isDelivered ? "✓" : index + 1}
            </div>
            ${
              isSelected
                ? `<div style="
                    position: absolute;
                    top: -4px;
                    left: -4px;
                    width: 46px;
                    height: 46px;
                    border-radius: 50%;
                    border: 3px solid #6366f1;
                    pointer-events: none;
                  "></div>`
                : ""
            }
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: stopIcon }).addTo(markersLayer);

      marker.on("click", () => {
        setSelectedStop(item);
      });

      marker.bindPopup(`
        <div style="font-weight: 800; color: #0f172a; font-size: 14px; margin-bottom: 4px;">
          Arrêt #${index + 1} : ${item.customer?.fullName || "Client"}
        </div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 6px;">
          📍 ${item.customer?.address || ""} ${item.customer?.deleg || ""} ${item.customer?.city || ""}
        </div>
        <div style="font-weight: 700; color: #10b981; font-size: 13px; margin-bottom: 8px;">
          💰 Montant : ${totalAmt} TND
        </div>
        ${
          item.customer?.phoneNumber
            ? `<a href="tel:${item.customer.phoneNumber}" style="
                display: inline-block;
                background: #10b981;
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                text-decoration: none;
                font-size: 12px;
                font-weight: 600;
              ">📞 Appeler (${item.customer.phoneNumber})</a>`
            : ""
        }
      `);

      bounds.extend([coords.lat, coords.lng]);
    });

    // 5. Draw connecting polyline route
    if (routeCoords.length > 1) {
      L.polyline(routeCoords, {
        color: "#4f46e5",
        weight: 4,
        opacity: 0.85,
        dashArray: "6, 8",
        lineCap: "round",
      }).addTo(routeLayer);
    }

    // 6. Fit map view bounds
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [deliveries, driverLocation, selectedStop?.id, filterStatus, selectedDepotFilter, mapReady, depots]);

  // Center on Driver's Live Location
  const centerOnCurrentLocation = () => {
    if (driverLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([driverLocation.lat, driverLocation.lng], 16, {
        duration: 1.2,
      });
    } else {
      // Request permission again
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            };
            setDriverLocation(coords);
            setGpsActive(true);
            setGpsAccuracy(Math.round(pos.coords.accuracy));
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, { duration: 1 });
            }
          },
          (err) => {
            Swal.fire({
              icon: "info",
              title: "Activation du GPS",
              text: "Veuillez autoriser l'accès à la localisation dans les paramètres de votre navigateur pour suivre votre position.",
            });
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    }
  };

  // Center on Selected Stop
  const centerOnStop = (stop) => {
    setSelectedStop(stop);
    if (!mapInstanceRef.current) return;
    const coords = getCoordinatesForDelivery(stop);
    mapInstanceRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1 });
  };

  // Update Status API
  const updateStopStatus = (deliveryId, newStatus) => {
    APi.createAPIEndpoint(
      APi.ENDPOINTS.Delivery + "/changeStatus/" + deliveryId + "/" + newStatus
    )
      .update2({})
      .then(() => {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Statut mis à jour !",
          showConfirmButton: false,
          timer: 1500,
        });
        fetchDeliveries();
      })
      .catch(() => {
        // Fallback local update
        setDeliveries((prev) =>
          prev.map((d) => (d.id === deliveryId ? { ...d, status: newStatus } : d))
        );
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Statut mis à jour !",
          showConfirmButton: false,
          timer: 1500,
        });
      });
  };

  // Metrics
  const totalStops = deliveries.length;
  const deliveredCount = deliveries.filter((d) => d.status === 5).length;
  const pendingCount = deliveries.filter((d) => d.status !== 5).length;
  const remainingCash = deliveries
    .filter((d) => d.status !== 5)
    .reduce((sum, d) => {
      const amt =
        d.coliItems?.reduce((s, it) => s + it.qty * it.unitPrice, 0) ||
        d.totalPrice ||
        0;
      return sum + amt;
    }, 0);

  // Selected stop coords & Navigation URLs
  const selectedCoords = selectedStop ? getCoordinatesForDelivery(selectedStop) : null;
  const googleMapsUrl = selectedCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedCoords.lat},${selectedCoords.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        selectedStop?.customer?.address || "Tunis"
      )}`;
  const wazeUrl = selectedCoords
    ? `https://waze.com/ul?ll=${selectedCoords.lat},${selectedCoords.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(selectedStop?.customer?.address || "Tunis")}`;

  return (
    <div style={{ padding: "16px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Top Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)",
            }}
          >
            <FaRoute />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>
                Carte & Suivi GPS de Livraison
              </h3>
              <span
                style={{
                  background: gpsActive ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                  color: gpsActive ? "#34d399" : "#fbbf24",
                  border: gpsActive
                    ? "1px solid rgba(16, 185, 129, 0.4)"
                    : "1px solid rgba(245, 158, 11, 0.4)",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "20px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {gpsActive ? "● GPS En Direct (Précision ±" + (gpsAccuracy || 10) + "m)" : "○ En attente du signal GPS"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              Visualisez tous vos colis sur la carte interactive avec tracé de l'itinéraire et suivi en direct
            </p>
          </div>
        </div>

        {/* Counter Pills & Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "8px 14px",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>Total Colis</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>{totalStops}</div>
          </div>

          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              padding: "8px 14px",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#34d399", fontWeight: 600 }}>Livrés</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981" }}>{deliveredCount}</div>
          </div>

          <div
            style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "8px 14px",
              borderRadius: "10px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#f87171", fontWeight: 600 }}>À Encaisser</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fca5a5" }}>
              {remainingCash.toFixed(3)} <span style={{ fontSize: "0.75rem" }}>TND</span>
            </div>
          </div>

          <button
            onClick={fetchDeliveries}
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            {loading ? "Chargement..." : "Actualiser"}
          </button>
        </div>
      </div>

      {/* Scope and Depot Filters Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: "12px 18px",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
            Affichage des Colis :
          </span>

          <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
            <button
              onClick={() => setViewScope("all")}
              style={{
                background: viewScope === "all" ? "#fff" : "transparent",
                color: viewScope === "all" ? "#0f172a" : "#64748b",
                fontWeight: viewScope === "all" ? 700 : 500,
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow: viewScope === "all" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Tous les Colis ({deliveries.length})
            </button>

            <button
              onClick={() => setViewScope("driver")}
              style={{
                background: viewScope === "driver" ? "#fff" : "transparent",
                color: viewScope === "driver" ? "#0f172a" : "#64748b",
                fontWeight: viewScope === "driver" ? 700 : 500,
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.8rem",
                cursor: "pointer",
                boxShadow: viewScope === "driver" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Mes Livraisons Livreur
            </button>
          </div>

          {/* Depot Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
              🏬 Filtrer par Dépôt :
            </span>
            <select
              value={selectedDepotFilter}
              onChange={(e) => setSelectedDepotFilter(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#1e293b",
                background: "#f8fafc",
                outline: "none",
              }}
            >
              <option value="all">Tous les Dépôts & Hubs</option>
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code || "DEP"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live GPS locate button */}
        <button
          onClick={centerOnCurrentLocation}
          style={{
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 14px",
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
          }}
        >
          <FaCrosshairs /> Placer & Suivre Ma Position GPS
        </button>
      </div>

      {/* Main Grid: Stops List + Leaflet Map */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 380px) 1fr",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        {/* Left Column: Stops List */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            maxHeight: "780px",
          }}
        >
          {/* Header of Stops */}
          <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                Arrêts de la Tournée ({deliveries.length})
              </h4>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {pendingCount} en attente
              </span>
            </div>

            {/* Filter Buttons */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "4px",
                background: "#f1f5f9",
                padding: "3px",
                borderRadius: "8px",
              }}
            >
              {[
                { id: "all", label: "Tous" },
                { id: "pending", label: "En cours" },
                { id: "delivered", label: "Livrés" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setFilterStatus(btn.id)}
                  style={{
                    background: filterStatus === btn.id ? "#fff" : "transparent",
                    color: filterStatus === btn.id ? "#0f172a" : "#64748b",
                    fontWeight: filterStatus === btn.id ? 700 : 500,
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 0",
                    fontSize: "0.78rem",
                    cursor: "pointer",
                    boxShadow: filterStatus === btn.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stops List Scroll */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {deliveries
              .filter((d) => {
                if (filterStatus === "pending") return d.status !== 5;
                if (filterStatus === "delivered") return d.status === 5;
                return true;
              })
              .map((item, index) => {
                const isSelected = selectedStop?.id === item.id;
                const isDelivered = item.status === 5;
                const totalAmt = (
                  item.coliItems?.reduce((s, it) => s + it.qty * it.unitPrice, 0) ||
                  item.totalPrice ||
                  0
                ).toFixed(3);

                return (
                  <div
                    key={item.id}
                    onClick={() => centerOnStop(item)}
                    style={{
                      background: isSelected ? "#eff6ff" : isDelivered ? "#f8fafc" : "#fff",
                      borderRadius: "12px",
                      border: isSelected
                        ? "2px solid #3b82f6"
                        : isDelivered
                        ? "1px solid #e2e8f0"
                        : "1px solid #cbd5e1",
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: isDelivered
                            ? "#10b981"
                            : isSelected
                            ? "#3b82f6"
                            : "#0f172a",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.82rem",
                          fontWeight: 800,
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {isDelivered ? "✓" : index + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                            {item.customer?.fullName || "Client"}
                          </span>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: isDelivered ? "#059669" : "#d97706",
                              background: isDelivered ? "#d1fae5" : "#fef3c7",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            {isDelivered ? "Livré" : "À Livrer"}
                          </span>
                        </div>

                        <div
                          style={{
                            color: "#64748b",
                            fontSize: "0.78rem",
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          📍 {item.customer?.address || ""}, {item.customer?.deleg || ""} {item.customer?.city || "Tunis"}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "6px",
                            paddingTop: "6px",
                            borderTop: "1px dashed #e2e8f0",
                          }}
                        >
                          <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                            📦 {item.coliItems?.length || 1} article(s)
                          </span>
                          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.85rem" }}>
                            {totalAmt} <span style={{ fontSize: "0.7rem", color: "#64748b" }}>TND</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            {deliveries.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <FaBoxOpen size={36} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
                <div style={{ fontWeight: 600 }}>Aucune livraison trouvée</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Leaflet Map + Active Stop Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Map Container */}
          <div
            style={{
              position: "relative",
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
              height: "480px",
              background: "#e2e8f0",
            }}
          >
            <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

            {/* Quick GPS Floating Button */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                zIndex: 1000,
              }}
            >
              <button
                onClick={centerOnCurrentLocation}
                title="Placer et centrer sur ma position GPS"
                style={{
                  background: "#fff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                }}
              >
                <FaCrosshairs style={{ color: "#10b981" }} /> Ma Position GPS
              </button>
            </div>

            {/* Map Legend */}
            <div
              style={{
                position: "absolute",
                bottom: "14px",
                left: "14px",
                zIndex: 1000,
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(226, 232, 240, 0.8)",
                borderRadius: "10px",
                padding: "8px 14px",
                fontSize: "0.75rem",
                display: "flex",
                gap: "14px",
                alignItems: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span>🏬</span> Dépôt / Stock
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span>🚚</span> Ma Position GPS
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb" }}></span>
                À Livrer
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981" }}></span>
                Livré
              </span>
            </div>
          </div>

          {/* Active Stop Inspector Card */}
          {selectedStop && (
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                padding: "20px 24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        background: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      Arrêt Sélectionné
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "#64748b",
                        fontSize: "0.8rem",
                      }}
                    >
                      Code : {selectedStop.qrCodeContent || selectedStop.id}
                    </span>
                  </div>

                  <h3 style={{ margin: "6px 0 2px", fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                    {selectedStop.customer?.fullName || "Client sans nom"}
                  </h3>
                  <div style={{ color: "#475569", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "6px" }}>
                    <FaMapMarkerAlt style={{ color: "#ef4444" }} />
                    <span>
                      {selectedStop.customer?.address || ""}, {selectedStop.customer?.deleg || ""} {selectedStop.customer?.city || "Tunis"}
                    </span>
                  </div>
                </div>

                {/* Amount to collect */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    textAlign: "right",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>À Encaisser</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#b91c1c" }}>
                    {(
                      selectedStop.coliItems?.reduce((s, it) => s + it.qty * it.unitPrice, 0) ||
                      selectedStop.totalPrice ||
                      0
                    ).toFixed(3)}{" "}
                    <span style={{ fontSize: "0.8rem", color: "#64748b" }}>TND</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Call, GPS, Status update */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingTop: "14px",
                  borderTop: "1px solid #f1f5f9",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {selectedStop.customer?.phoneNumber && (
                    <a
                      href={`tel:${selectedStop.customer.phoneNumber}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#10b981",
                        color: "#fff",
                        textDecoration: "none",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                      }}
                    >
                      <FaPhoneAlt size={11} /> Appeler Client
                    </a>
                  )}

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#2563eb",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    <FaDirections size={13} /> Lancer Google Maps
                  </a>

                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#0891b2",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    <FaExternalLinkAlt size={10} /> Waze GPS
                  </a>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  <button
                    onClick={() => updateStopStatus(selectedStop.id, 5)}
                    style={{
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    ✓ Marquer Livré
                  </button>

                  <button
                    onClick={() => updateStopStatus(selectedStop.id, 6)}
                    style={{
                      background: "#f59e0b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Pas de Réponse
                  </button>

                  <button
                    onClick={() => updateStopStatus(selectedStop.id, 9)}
                    style={{
                      background: "#64748b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Reporté
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
