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
  FaListUl,
  FaMapMarkedAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";
import { useRecoilValue } from "recoil";
import { APi } from "../../Api";
import { getCoordinatesForDelivery } from "../../Helpers/geocoding";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDriverIdState } from "../../Atoms/auth.atom";
import Swal from "sweetalert2";

export default function MyMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLayerRef = useRef(null);

  const activeRole = useRecoilValue(activeRoleState);
  const globalDriverId = useRecoilValue(currentDriverIdState);
  const depots = useRecoilValue(preparationPlacesState);

  const [deliveries, setDeliveries] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all"); // 'all' | 'pending' | 'delivered'
  const [selectedDepotFilter, setSelectedDepotFilter] = useState("all");
  const [viewScope, setViewScope] = useState(activeRole === "driver" ? "driver" : "all");
  const [mapReady, setMapReady] = useState(false);

  // Responsive state for mobile driver usage
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 992 : false
  );
  const [mobileTab, setMobileTab] = useState("map"); // 'map' | 'list' | 'detail'

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 992;
      setIsMobile(mobile);
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 150);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // When switching tabs on mobile, force Leaflet to recalculate container bounds
  useEffect(() => {
    if (mobileTab === "map" && mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 100);
    }
  }, [mobileTab]);

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
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
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

  // Fetch Deliveries from API (Real Data only, no fake fallbacks)
  const fetchDeliveries = () => {
    setLoading(true);

    const tryFetchAllDeliveries = () => {
      APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, { page: 1, take: 50 })
        .fetchAll()
        .then((res) => {
          setLoading(false);
          const list = res.data?.data || [];
          setDeliveries(list);
          if (list.length > 0 && !selectedStop) {
            setSelectedStop(list[0]);
          }
        })
        .catch((err) => {
          setLoading(false);
          console.warn("Failed to fetch all deliveries:", err);
          setDeliveries([]);
        });
    };

    if (viewScope === "driver" && globalDriverId) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/getForDriver", {
        driverId: globalDriverId,
        take: 50,
      })
        .fetchAll()
        .then((res) => {
          setLoading(false);
          const list = res.data?.data || [];
          if (list.length > 0) {
            setDeliveries(list);
            if (!selectedStop) setSelectedStop(list[0]);
          } else {
            // Driver has no assigned deliveries, fetch all as fallback for review
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
    if (!("geolocation" in navigator)) return;

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
          mapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, {
            duration: 1.2,
          });
        }
      },
      (err) => {
        console.warn("Geolocation warning:", err.message);
        setGpsActive(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

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
        console.warn("Watch position warning:", err.message);
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

    // 1. Add All Dépôts
    depots.forEach((dp) => {
      let dpCoords = { lat: 36.8431, lng: 10.2033 };
      if (
        dp.name?.toLowerCase().includes("sousse") ||
        dp.code?.toLowerCase().includes("sousse")
      ) {
        dpCoords = { lat: 35.8256, lng: 10.6369 };
      }

      const depotIcon = L.divIcon({
        className: "custom-depot-icon",
        html: `
          <div style="
            background: #312e81;
            color: #fff;
            width: 36px;
            height: 36px;
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
        iconSize: [36, 36],
        iconAnchor: [18, 18],
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
              width: 42px;
              height: 42px;
              background: #10b981;
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid white;
              box-shadow: 0 4px 16px rgba(16, 185, 129, 0.6);
              font-size: 19px;
            ">
              🚚
            </div>
            <div style="
              position: absolute;
              top: -5px;
              left: -5px;
              width: 52px;
              height: 52px;
              border-radius: 50%;
              border: 2px solid #10b981;
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
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
      if (filterStatus === "pending" && d.status === 5) return false;
      if (filterStatus === "delivered" && d.status !== 5) return false;

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

      let markerBg = "#2563eb";
      if (isDelivered) markerBg = "#10b981";
      else if (isFailed) markerBg = "#ef4444";
      else if (isPostponed) markerBg = "#f59e0b";

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
            ${isSelected ? "transform: scale(1.25); z-index: 1000;" : ""}
          ">
            <div style="
              width: ${isSelected ? "36px" : "30px"};
              height: ${isSelected ? "36px" : "30px"};
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
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: stopIcon }).addTo(
        markersLayer
      );

      marker.on("click", () => {
        setSelectedStop(item);
      });

      bounds.extend([coords.lat, coords.lng]);
    });

    // 5. Draw Polyline Route Path
    if (routeCoords.length > 1) {
      L.polyline(routeCoords, {
        color: "#4f46e5",
        weight: 4,
        opacity: 0.8,
        dashArray: "8, 8",
        lineCap: "round",
      }).addTo(routeLayer);
    }

    if (bounds.isValid() && (!selectedStop || !driverLocation)) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [
    mapReady,
    deliveries,
    driverLocation,
    filterStatus,
    selectedDepotFilter,
    depots,
    selectedStop,
  ]);

  // Center on Current GPS Position
  const centerOnCurrentLocation = () => {
    if (driverLocation && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([driverLocation.lat, driverLocation.lng], 16, {
        duration: 1.2,
      });
    } else {
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
              mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16, {
                duration: 1.2,
              });
            }
          },
          () => {
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
  const centerOnStop = (stop, autoSwitchTab = false) => {
    setSelectedStop(stop);
    if (autoSwitchTab && isMobile) {
      setMobileTab("map");
    }
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

  const selectedCoords = selectedStop ? getCoordinatesForDelivery(selectedStop) : null;
  const googleMapsUrl = selectedCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedCoords.lat},${selectedCoords.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        selectedStop?.customer?.address || "Tunis"
      )}`;
  const wazeUrl = selectedCoords
    ? `https://waze.com/ul?ll=${selectedCoords.lat},${selectedCoords.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(
        selectedStop?.customer?.address || "Tunis"
      )}`;

  const visibleDeliveries = deliveries.filter((d) => {
    if (filterStatus === "pending") return d.status !== 5;
    if (filterStatus === "delivered") return d.status === 5;
    return true;
  });

  return (
    <div
      style={{
        padding: isMobile ? "8px 6px" : "16px",
        maxWidth: "1600px",
        margin: "0 auto",
      }}
    >
      {/* Top Header Banner - Mobile Optimized */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          borderRadius: "16px",
          padding: isMobile ? "14px 16px" : "20px 24px",
          marginBottom: "12px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                width: isMobile ? "40px" : "48px",
                height: isMobile ? "40px" : "48px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? "18px" : "22px",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)",
                flexShrink: 0,
              }}
            >
              <FaRoute />
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: isMobile ? "1.1rem" : "1.3rem",
                    fontWeight: 800,
                    color: "#fff",
                  }}
                >
                  Itinéraire & Suivi GPS
                </h3>
                <span
                  style={{
                    background: gpsActive
                      ? "rgba(16, 185, 129, 0.2)"
                      : "rgba(245, 158, 11, 0.2)",
                    color: gpsActive ? "#34d399" : "#fbbf24",
                    border: gpsActive
                      ? "1px solid rgba(16, 185, 129, 0.4)"
                      : "1px solid rgba(245, 158, 11, 0.4)",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  {gpsActive
                    ? `● GPS En Direct (±${gpsAccuracy || 10}m)`
                    : "○ En attente signal GPS"}
                </span>
              </div>
            </div>
          </div>

          {/* Counter Badges - Thumb Friendly on Mobile */}
          <div
            style={{
              display: "flex",
              width: isMobile ? "100%" : "auto",
              gap: "8px",
              justifyContent: isMobile ? "space-between" : "flex-end",
            }}
          >
            <div
              style={{
                flex: isMobile ? 1 : "auto",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: isMobile ? "6px 8px" : "8px 14px",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontWeight: 600 }}>
                Colis
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>
                {totalStops}
              </div>
            </div>

            <div
              style={{
                flex: isMobile ? 1 : "auto",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: isMobile ? "6px 8px" : "8px 14px",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 600 }}>
                Livrés
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#10b981" }}>
                {deliveredCount}
              </div>
            </div>

            <div
              style={{
                flex: isMobile ? 1.4 : "auto",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: isMobile ? "6px 8px" : "8px 14px",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "0.68rem", color: "#f87171", fontWeight: 600 }}>
                À Encaisser
              </div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fca5a5" }}>
                {remainingCash.toFixed(3)}{" "}
                <span style={{ fontSize: "0.65rem" }}>TND</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE TAB BAR SWITCHER (Driver Phone Mode) */}
      {isMobile && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px",
            background: "#ffffff",
            padding: "6px",
            borderRadius: "12px",
            marginBottom: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={() => setMobileTab("map")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 8px",
              borderRadius: "10px",
              border: "none",
              background:
                mobileTab === "map"
                  ? "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)"
                  : "#f8fafc",
              color: mobileTab === "map" ? "#ffffff" : "#475569",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <FaMapMarkedAlt size={16} /> Carte GPS
          </button>

          <button
            onClick={() => setMobileTab("list")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "10px 8px",
              borderRadius: "10px",
              border: "none",
              background:
                mobileTab === "list"
                  ? "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)"
                  : "#f8fafc",
              color: mobileTab === "list" ? "#ffffff" : "#475569",
              fontWeight: 800,
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <FaListUl size={14} /> Liste Colis ({deliveries.length})
          </button>
        </div>
      )}

      {/* Scope, Depot & Status Filter Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          padding: isMobile ? "10px 12px" : "12px 18px",
          marginBottom: "12px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {/* Status filter chips */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              background: "#f1f5f9",
              padding: "3px",
              borderRadius: "8px",
              width: isMobile ? "100%" : "auto",
              justifyContent: isMobile ? "space-between" : "flex-start",
            }}
          >
            {[
              { id: "all", label: "Tous" },
              { id: "pending", label: "En attente" },
              { id: "delivered", label: "Livrés" },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                style={{
                  flex: isMobile ? 1 : "auto",
                  background: filterStatus === st.id ? "#fff" : "transparent",
                  color: filterStatus === st.id ? "#0f172a" : "#64748b",
                  fontWeight: filterStatus === st.id ? 700 : 500,
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow:
                    filterStatus === st.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Depot Filter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              width: isMobile ? "100%" : "auto",
              marginTop: isMobile ? "4px" : "0",
            }}
          >
            <select
              value={selectedDepotFilter}
              onChange={(e) => setSelectedDepotFilter(e.target.value)}
              style={{
                width: isMobile ? "100%" : "auto",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#1e293b",
                background: "#f8fafc",
                outline: "none",
              }}
            >
              <option value="all">🏬 Tous les Dépôts & Hubs</option>
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
            width: isMobile ? "100%" : "auto",
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
            justifyContent: "center",
            gap: "6px",
            boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
          }}
        >
          <FaCrosshairs /> Centrer Sur Ma Position GPS
        </button>
      </div>

      {/* MAIN CONTAINER: Responsive Desktop Grid VS Mobile Tabs */}
      <div
        style={{
          display: isMobile ? "block" : "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 380px) 1fr",
          gap: "16px",
          alignItems: "stretch",
        }}
      >
        {/* STOPS LIST (Visible on Desktop OR when mobileTab === 'list') */}
        {(!isMobile || mobileTab === "list") && (
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              maxHeight: isMobile ? "none" : "780px",
              marginBottom: isMobile ? "16px" : "0",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                Arrêts de la Tournée ({visibleDeliveries.length})
              </h4>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                {pendingCount} en attente
              </span>
            </div>

            {/* List of stops */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {visibleDeliveries.map((item, index) => {
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
                    onClick={() => centerOnStop(item, true)}
                    style={{
                      background: isSelected
                        ? "#eff6ff"
                        : isDelivered
                        ? "#f8fafc"
                        : "#fff",
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
                          width: "32px",
                          height: "32px",
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
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          flexShrink: 0,
                          marginTop: "2px",
                        }}
                      >
                        {isDelivered ? "✓" : index + 1}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: "#0f172a",
                              fontSize: "0.92rem",
                            }}
                          >
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
                            fontSize: "0.8rem",
                            marginTop: "2px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          📍 {item.customer?.address || ""},{" "}
                          {item.customer?.deleg || ""} {item.customer?.city || "Tunis"}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "8px",
                            paddingTop: "6px",
                            borderTop: "1px dashed #e2e8f0",
                          }}
                        >
                          {/* Direct Call Button on Mobile */}
                          {item.customer?.phoneNumber ? (
                            <a
                              href={`tel:${item.customer.phoneNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                background: "#ecfdf5",
                                color: "#059669",
                                border: "1px solid #a7f3d0",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <FaPhoneAlt size={10} /> Appeler
                            </a>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              📦 {item.coliItems?.length || 1} colis
                            </span>
                          )}

                          <span
                            style={{
                              fontWeight: 800,
                              color: "#0f172a",
                              fontSize: "0.9rem",
                            }}
                          >
                            {totalAmt}{" "}
                            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                              TND
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {visibleDeliveries.length === 0 && (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  <FaBoxOpen
                    size={36}
                    style={{ color: "#cbd5e1", marginBottom: "8px" }}
                  />
                  <div style={{ fontWeight: 600 }}>Aucune livraison disponible</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MAP & ACTIVE STOP CONTAINER (Visible on Desktop OR when mobileTab === 'map') */}
        {(!isMobile || mobileTab === "map") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Map Element */}
            <div
              style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                height: isMobile ? "calc(100vh - 360px)" : "480px",
                minHeight: isMobile ? "380px" : "480px",
                background: "#e2e8f0",
              }}
            >
              <div
                ref={mapContainerRef}
                style={{ width: "100%", height: "100%", zIndex: 1 }}
              />

              {/* Floating GPS Target Button */}
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  zIndex: 1000,
                }}
              >
                <button
                  onClick={centerOnCurrentLocation}
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
                  }}
                >
                  <FaCrosshairs style={{ color: "#10b981", fontSize: "15px" }} />
                  <span>Ma Position</span>
                </button>
              </div>

              {/* Map Legend */}
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  left: "10px",
                  zIndex: 1000,
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "0.72rem",
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span>🚚</span> GPS
                </span>
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#2563eb",
                    }}
                  ></span>
                  À Livrer
                </span>
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#10b981",
                    }}
                  ></span>
                  Livré
                </span>
              </div>
            </div>

            {/* Mobile / Desktop Active Stop Card with Big Thumb-Friendly Buttons */}
            {selectedStop ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  padding: isMobile ? "14px 16px" : "20px 24px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    marginBottom: "14px",
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
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        Arrêt Sélectionné
                      </span>
                      <span
                        style={{
                          fontFamily: "monospace",
                          color: "#64748b",
                          fontSize: "0.78rem",
                        }}
                      >
                        #{selectedStop.qrCodeContent || selectedStop.id}
                      </span>
                    </div>

                    <h3
                      style={{
                        margin: "6px 0 2px",
                        fontSize: isMobile ? "1.15rem" : "1.25rem",
                        fontWeight: 800,
                        color: "#0f172a",
                      }}
                    >
                      {selectedStop.customer?.fullName || "Client"}
                    </h3>
                    <div
                      style={{
                        color: "#475569",
                        fontSize: "0.82rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FaMapMarkerAlt style={{ color: "#ef4444" }} />
                      <span>
                        {selectedStop.customer?.address || ""},{" "}
                        {selectedStop.customer?.deleg || ""}{" "}
                        {selectedStop.customer?.city || "Tunis"}
                      </span>
                    </div>
                  </div>

                  {/* Cash to collect badge */}
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      padding: "8px 14px",
                      borderRadius: "10px",
                      textAlign: "right",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "#991b1b",
                        fontWeight: 700,
                      }}
                    >
                      À ENCAISSER
                    </div>
                    <div
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 900,
                        color: "#b91c1c",
                      }}
                    >
                      {(
                        selectedStop.coliItems?.reduce(
                          (s, it) => s + it.qty * it.unitPrice,
                          0
                        ) ||
                        selectedStop.totalPrice ||
                        0
                      ).toFixed(3)}{" "}
                      <span style={{ fontSize: "0.75rem" }}>TND</span>
                    </div>
                  </div>
                </div>

                {/* DRIVER ACTION BUTTONS - 1-TAP NAVIGATION & CALL */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {selectedStop.customer?.phoneNumber ? (
                    <a
                      href={`tel:${selectedStop.customer.phoneNumber}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        background: "#10b981",
                        color: "#fff",
                        textDecoration: "none",
                        padding: "12px",
                        borderRadius: "10px",
                        fontSize: "0.88rem",
                        fontWeight: 800,
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                      }}
                    >
                      <FaPhoneAlt size={13} /> Appeler
                    </a>
                  ) : (
                    <button
                      disabled
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#f1f5f9",
                        color: "#94a3b8",
                        border: "none",
                        padding: "12px",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      Pas de téléphone
                    </button>
                  )}

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#2563eb",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "12px",
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
                    }}
                  >
                    <FaDirections size={15} /> Maps GPS
                  </a>

                  <a
                    href={wazeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      gridColumn: isMobile ? "span 2" : "auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      background: "#0891b2",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "12px",
                      borderRadius: "10px",
                      fontSize: "0.88rem",
                      fontWeight: 800,
                      boxShadow: "0 2px 8px rgba(8, 145, 178, 0.3)",
                    }}
                  >
                    <FaExternalLinkAlt size={12} /> Waze GPS
                  </a>
                </div>

                {/* STATUS CONFIRMATION BAR */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1fr",
                    gap: "8px",
                    paddingTop: "12px",
                    borderTop: "1px solid #f1f5f9",
                  }}
                >
                  <button
                    onClick={() => updateStopStatus(selectedStop.id, 5)}
                    style={{
                      gridColumn: isMobile ? "span 2" : "auto",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "12px",
                      fontSize: "0.92rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <FaCheckCircle size={15} /> ✓ Marquer Livré & Encaissé
                  </button>

                  <button
                    onClick={() => updateStopStatus(selectedStop.id, 6)}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #f59e0b",
                      color: "#d97706",
                      borderRadius: "10px",
                      padding: "10px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <FaTimesCircle size={13} /> Pas de Réponse
                  </button>

                  <button
                    onClick={() => updateStopStatus(selectedStop.id, 9)}
                    style={{
                      background: "#fff",
                      border: "1.5px solid #94a3b8",
                      color: "#475569",
                      borderRadius: "10px",
                      padding: "10px",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <FaClock size={13} /> Reporté
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  padding: "20px",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.85rem",
                }}
              >
                Sélectionnez un arrêt sur la carte ou dans la liste pour lancer le GPS et appeler le client.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
