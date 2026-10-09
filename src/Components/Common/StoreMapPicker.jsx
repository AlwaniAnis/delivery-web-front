import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "rsuite";
import {
  FaCompass,
  FaCrosshairs,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
  FaSearch,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { TUNISIA_COORDINATES } from "../../Helpers/geocoding";

const DEFAULT_LAT = 36.8065;
const DEFAULT_LNG = 10.1815;

export default function StoreMapPicker({
  latitude,
  longitude,
  onChange,
  height = "250px",
  title = "Position GPS de la Boutique (Latitude & Longitude)",
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const hasValidCoords =
    latitude !== undefined &&
    latitude !== null &&
    latitude !== "" &&
    longitude !== undefined &&
    longitude !== null &&
    longitude !== "" &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude)) &&
    (Number(latitude) !== 0 || Number(longitude) !== 0);

  const currentLat = hasValidCoords ? Number(latitude) : DEFAULT_LAT;
  const currentLng = hasValidCoords ? Number(longitude) : DEFAULT_LNG;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const storeIcon = L.divIcon({
      className: "store-picker-pin",
      html: `
        <div style="
          background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
          color: white;
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 6px 14px rgba(79, 70, 229, 0.5);
        ">
          <span style="transform: rotate(45deg); font-size: 16px;">🏪</span>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 38],
    });

    const marker = L.marker([currentLat, currentLng], {
      icon: storeIcon,
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    marker.on("dragend", () => {
      const position = marker.getLatLng();
      onChange(
        Number(position.lat.toFixed(6)),
        Number(position.lng.toFixed(6))
      );
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      onChange(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      );
    });

    // Ensure proper rendering inside modals and dynamic containers
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 500);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const markerPos = markerRef.current.getLatLng();
      if (
        Math.abs(markerPos.lat - currentLat) > 0.00005 ||
        Math.abs(markerPos.lng - currentLng) > 0.00005
      ) {
        markerRef.current.setLatLng([currentLat, currentLng]);
        mapInstanceRef.current.panTo([currentLat, currentLng]);
      }
    }
  }, [currentLat, currentLng]);

  const moveToLocation = (targetLat, targetLng, zoom = 15) => {
    const roundedLat = Number(Number(targetLat).toFixed(6));
    const roundedLng = Number(Number(targetLng).toFixed(6));
    onChange(roundedLat, roundedLng);
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([roundedLat, roundedLng]);
      mapInstanceRef.current.flyTo([roundedLat, roundedLng], zoom, {
        duration: 0.8,
      });
    }
  };

  const useCurrentGps = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          moveToLocation(pos.coords.latitude, pos.coords.longitude, 16);
        },
        () => {
          Swal.fire({
            icon: "info",
            title: "GPS Non Disponible",
            text: "Veuillez autoriser l'accès à la localisation dans votre navigateur ou choisir sur la carte.",
          });
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleSearchLocation = async (e) => {
    if (e) e.preventDefault();
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return;

    // 1. Check local Tunisia dictionary first for instant response
    for (const [key, coords] of Object.entries(TUNISIA_COORDINATES)) {
      if (key.includes(q) || q.includes(key)) {
        moveToLocation(coords.lat, coords.lng, 14);
        return;
      }
    }

    // 2. Fallback to OpenStreetMap Nominatim search
    try {
      setSearching(true);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + " Tunisia"
        )}&limit=1`
      );
      const data = await res.json();
      setSearching(false);
      if (Array.isArray(data) && data.length > 0) {
        moveToLocation(parseFloat(data[0].lat), parseFloat(data[0].lon), 15);
      } else {
        Swal.fire({
          icon: "info",
          title: "Lieu introuvable",
          text: "Cliquez directement sur la carte ou déplacez le marqueur 🏪.",
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch {
      setSearching(false);
    }
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${currentLat},${currentLng}`;

  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "14px",
        marginTop: "12px",
        marginBottom: "12px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            fontWeight: 800,
            color: "#1e293b",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <FaCompass style={{ color: "#4f46e5" }} /> {title}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontFamily: "monospace",
              fontWeight: 700,
              color: hasValidCoords ? "#065f46" : "#64748b",
              background: hasValidCoords ? "#ecfdf5" : "#f1f5f9",
              border: `1px solid ${hasValidCoords ? "#a7f3d0" : "#cbd5e1"}`,
              padding: "2px 8px",
              borderRadius: "6px",
            }}
          >
            {currentLat.toFixed(6)}, {currentLng.toFixed(6)}
          </span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#2563eb",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaExternalLinkAlt size={10} /> Google Maps
          </a>
        </div>
      </div>

      {/* Latitude & Longitude Inputs */}
      <div
        className="responsive-grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px",
          marginBottom: "10px",
        }}
      >
        <div>
          <label
            style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              color: "#475569",
              marginBottom: "4px",
              display: "block",
            }}
          >
            Latitude :
          </label>
          <Input
            type="number"
            step="0.000001"
            placeholder="Ex: 36.806500"
            value={latitude ?? ""}
            onChange={(val) => {
              const parsed = val === "" ? "" : parseFloat(val);
              onChange(
                Number.isNaN(parsed) ? 0 : parsed,
                longitude !== undefined && longitude !== ""
                  ? Number(longitude)
                  : currentLng
              );
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              color: "#475569",
              marginBottom: "4px",
              display: "block",
            }}
          >
            Longitude :
          </label>
          <Input
            type="number"
            step="0.000001"
            placeholder="Ex: 10.181500"
            value={longitude ?? ""}
            onChange={(val) => {
              const parsed = val === "" ? "" : parseFloat(val);
              onChange(
                latitude !== undefined && latitude !== ""
                  ? Number(latitude)
                  : currentLat,
                Number.isNaN(parsed) ? 0 : parsed
              );
            }}
          />
        </div>
      </div>

      {/* Search bar + Quick Preset Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          <Input
            size="sm"
            placeholder="Rechercher une ville ou adresse (ex: Ennasr, Lac 2, Sousse, Sfax...)"
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            onPressEnter={handleSearchLocation}
          />
          <button
            type="button"
            onClick={handleSearchLocation}
            disabled={searching}
            style={{
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              padding: "0 12px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              whiteSpace: "nowrap",
            }}
          >
            <FaSearch size={11} /> {searching ? "..." : "Localiser"}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.74rem",
              fontWeight: 700,
              color: "#64748b",
            }}
          >
            Raccourcis :
          </span>
          <button
            type="button"
            onClick={useCurrentGps}
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#065f46",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "0.74rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaCrosshairs size={10} /> Ma Position GPS
          </button>

          {[
            { label: "Tunis Centre", lat: 36.8065, lng: 10.1815 },
            { label: "Ariana / Ennasr", lat: 36.8576, lng: 10.1589 },
            { label: "Les Berges du Lac", lat: 36.8335, lng: 10.2393 },
            { label: "Ben Arous", lat: 36.7531, lng: 10.2189 },
            { label: "Sousse", lat: 35.8256, lng: 10.6369 },
            { label: "Sfax", lat: 34.7406, lng: 10.7603 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => moveToLocation(preset.lat, preset.lng, 14)}
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Leaflet Map */}
      <div
        style={{
          height,
          width: "100%",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1.5px solid #cbd5e1",
          position: "relative",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            zIndex: 1000,
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(4px)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#334155",
            border: "1px solid rgba(203, 213, 225, 0.9)",
            display: "flex",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <FaMapMarkerAlt style={{ color: "#4f46e5" }} />
          Cliquez sur la carte ou glissez le marqueur 🏪 pour définir la position
        </div>
      </div>
    </div>
  );
}
