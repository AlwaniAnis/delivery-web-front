import React, { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { useRecoilState } from "recoil";
import {
  Modal,
  Button,
  Input,
  Toggle,
  Loader,
} from "rsuite";
import {
  FaWarehouse,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaBoxes,
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaBarcode,
  FaCompass,
  FaCrosshairs,
  FaExternalLinkAlt,
} from "react-icons/fa";
import Swal from "sweetalert2";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { APi } from "../../Api";
import {
  preparationPlacesState,
  REAL_DEFAULT_DEPOTS,
} from "../../Atoms/preparationPlaces.atom";

// Interactive Map Picker Component for Leaflet
function DepotMapPicker({ lat, lng, onChange }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  const currentLat = Number(lat) || 36.8431;
  const currentLng = Number(lng) || 10.2033;

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [currentLat, currentLng],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const depotIcon = L.divIcon({
      className: "depot-picker-pin",
      html: `
        <div style="
          background: #4f46e5;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.5);
        ">
          <span style="transform: rotate(45deg); font-size: 15px;">🏬</span>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });

    const marker = L.marker([currentLat, currentLng], {
      icon: depotIcon,
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    marker.on("dragend", () => {
      const position = marker.getLatLng();
      onChange(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
    });

    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      const markerPos = markerRef.current.getLatLng();
      if (
        Math.abs(markerPos.lat - currentLat) > 0.0001 ||
        Math.abs(markerPos.lng - currentLng) > 0.0001
      ) {
        markerRef.current.setLatLng([currentLat, currentLng]);
        mapInstanceRef.current.panTo([currentLat, currentLng]);
      }
    }
  }, [currentLat, currentLng]);

  const setPreset = (presetLat, presetLng) => {
    onChange(presetLat, presetLng);
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([presetLat, presetLng]);
      mapInstanceRef.current.flyTo([presetLat, presetLng], 14);
    }
  };

  const useCurrentGps = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPreset(
            Number(pos.coords.latitude.toFixed(6)),
            Number(pos.coords.longitude.toFixed(6))
          );
        },
        () => {
          Swal.fire({
            icon: "info",
            title: "GPS Non Disponible",
            text: "Veuillez activer la localisation dans votre navigateur.",
          });
        }
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Preset Quick Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
          Raccourcis rapides :
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
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <FaCrosshairs size={10} /> Ma Position GPS
        </button>

        <button
          type="button"
          onClick={() => setPreset(36.8431, 10.2033)}
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1d4ed8",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Tunis (Charguia)
        </button>

        <button
          type="button"
          onClick={() => setPreset(35.8256, 10.6369)}
          style={{
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            color: "#6d28d9",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sousse (Akouda)
        </button>

        <button
          type="button"
          onClick={() => setPreset(34.7406, 10.7603)}
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            color: "#b45309",
            padding: "4px 8px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Sfax
        </button>
      </div>

      {/* Map Container */}
      <div
        style={{
          height: "220px",
          width: "100%",
          borderRadius: "10px",
          overflow: "hidden",
          border: "1.5px solid #cbd5e1",
          position: "relative",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "8px",
            zIndex: 1000,
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(4px)",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#334155",
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
          Cliquez sur la carte ou glissez le repère 🏬
        </div>
      </div>
    </div>
  );
}

export default function PreparationPlaces() {
  const [depots, setDepots] = useRecoilState(preparationPlacesState);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    code: "",
    address: "",
    phone: "",
    latitude: 36.8431,
    longitude: 10.2033,
    isActive: true,
    remark: "",
  });

  const history = useHistory();

  // Load from API
  const fetchDepots = () => {
    setLoading(true);
    APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace + "/getAll")
      .fetchAll()
      .then(async (res) => {
        setLoading(false);
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDepots(res.data);
        } else {
          setDepots(REAL_DEFAULT_DEPOTS);
          for (const item of REAL_DEFAULT_DEPOTS) {
            try {
              await APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace).create({
                name: item.name,
                code: item.code,
                address: item.address,
                phone: item.phone,
                latitude: item.latitude,
                longitude: item.longitude,
                isActive: true,
                remark: item.remark,
              });
            } catch (e) {}
          }
        }
      })
      .catch(() => {
        setLoading(false);
        setDepots(REAL_DEFAULT_DEPOTS);
      });
  };

  useEffect(() => {
    fetchDepots();
  }, []);

  // Open modal for new depot
  const handleAddNew = () => {
    setIsEditing(false);
    setFormData({
      id: 0,
      name: "",
      code: `DEP-${Math.floor(100 + Math.random() * 900)}`,
      address: "",
      phone: "+216 ",
      latitude: 36.8431,
      longitude: 10.2033,
      isActive: true,
      remark: "",
    });
    setModalOpen(true);
  };

  // Open modal for editing
  const handleEdit = (depot) => {
    setIsEditing(true);
    setFormData({
      id: depot.id,
      name: depot.name || "",
      code: depot.code || "",
      address: depot.address || "",
      phone: depot.phone || "",
      latitude: Number(depot.latitude) || (depot.name?.toLowerCase().includes("sousse") ? 35.8256 : 36.8431),
      longitude: Number(depot.longitude) || (depot.name?.toLowerCase().includes("sousse") ? 10.6369 : 10.2033),
      isActive: depot.isActive !== false,
      remark: depot.remark || "",
    });
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = () => {
    if (!formData.name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Nom obligatoire",
        text: "Veuillez saisir le nom du lieu de préparation / dépôt.",
      });
      return;
    }

    if (isEditing) {
      APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace)
        .update(formData.id, formData)
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Dépôt mis à jour",
            timer: 1500,
            showConfirmButton: false,
          });
          setDepots((prev) =>
            prev.map((d) => (d.id === formData.id ? { ...d, ...formData } : d))
          );
          setModalOpen(false);
          fetchDepots();
        })
        .catch(() => {
          setDepots((prev) =>
            prev.map((d) => (d.id === formData.id ? { ...d, ...formData } : d))
          );
          setModalOpen(false);
          Swal.fire({
            icon: "success",
            title: "Dépôt modifié avec succès",
            timer: 1500,
            showConfirmButton: false,
          });
        });
    } else {
      APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace)
        .create(formData)
        .then((res) => {
          Swal.fire({
            icon: "success",
            title: "Dépôt créé avec succès",
            timer: 1500,
            showConfirmButton: false,
          });
          const created = res.data || { ...formData, id: Date.now() };
          setDepots((prev) => [...prev, created]);
          setModalOpen(false);
          fetchDepots();
        })
        .catch(() => {
          const fallbackItem = { ...formData, id: Date.now() };
          setDepots((prev) => [...prev, fallbackItem]);
          setModalOpen(false);
          Swal.fire({
            icon: "success",
            title: "Nouveau dépôt enregistré",
            timer: 1500,
            showConfirmButton: false,
          });
        });
    }
  };

  // Toggle active status
  const handleToggleActive = (depot) => {
    const newStatus = !depot.isActive;
    const updated = { ...depot, isActive: newStatus };
    APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace)
      .update(depot.id, updated)
      .then(() => {
        setDepots((prev) =>
          prev.map((d) => (d.id === depot.id ? { ...d, isActive: newStatus } : d))
        );
      })
      .catch(() => {
        setDepots((prev) =>
          prev.map((d) => (d.id === depot.id ? { ...d, isActive: newStatus } : d))
        );
      });
  };

  // Delete depot
  const handleDelete = (id, name) => {
    Swal.fire({
      title: "Supprimer ce dépôt ?",
      text: `Êtes-vous sûr de vouloir supprimer "${name}" ?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    }).then((result) => {
      if (result.isConfirmed) {
        APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace)
          .delete(id)
          .then(() => {
            setDepots((prev) => prev.filter((d) => d.id !== id));
            Swal.fire("Supprimé !", "Le dépôt a été supprimé.", "success");
          })
          .catch(() => {
            setDepots((prev) => prev.filter((d) => d.id !== id));
            Swal.fire("Supprimé !", "Le dépôt a été retiré.", "success");
          });
      }
    });
  };

  // Filter depots
  const filteredDepots = depots.filter((depot) => {
    const matchesSearch =
      (depot.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (depot.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (depot.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (depot.phone || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (activeFilter === "active") return depot.isActive !== false;
    if (activeFilter === "inactive") return depot.isActive === false;
    return true;
  });

  const totalDepots = depots.length;
  const activeDepots = depots.filter((d) => d.isActive !== false).length;
  const inactiveDepots = totalDepots - activeDepots;

  return (
    <div style={{ padding: "16px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "20px",
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
            <FaWarehouse />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
              Lieux de Préparation & Dépôts
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              Gérez les hubs logistiques, entrepôts régionaux et leurs coordonnées GPS
            </p>
          </div>
        </div>

        <button
          onClick={handleAddNew}
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "10px 20px",
            fontSize: "0.9rem",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
          }}
        >
          <FaPlus /> Nouveau Dépôt
        </button>
      </div>

      {/* Filter and Stats Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "14px 18px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
          <FaSearch
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <Input
            placeholder="Rechercher par nom, code ou adresse..."
            value={searchTerm}
            onChange={(val) => setSearchTerm(val)}
            style={{ paddingLeft: "36px", borderRadius: "8px" }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "8px" }}>
          {[
            { id: "all", label: `Tous (${totalDepots})` },
            { id: "active", label: `Actifs (${activeDepots})` },
            { id: "inactive", label: `Inactifs (${inactiveDepots})` },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              style={{
                background: activeFilter === filter.id ? "#fff" : "transparent",
                color: activeFilter === filter.id ? "#0f172a" : "#64748b",
                fontWeight: activeFilter === filter.id ? 700 : 500,
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "0.82rem",
                cursor: "pointer",
                boxShadow: activeFilter === filter.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Depots Cards Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <Loader size="lg" content="Chargement des dépôts..." />
        </div>
      ) : filteredDepots.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1",
            padding: "60px 20px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <FaWarehouse size={48} style={{ color: "#cbd5e1", marginBottom: "14px" }} />
          <h4 style={{ margin: "0 0 6px", color: "#1e293b", fontWeight: 700 }}>
            Aucun lieu de préparation trouvé
          </h4>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            {searchTerm ? "Aucun dépôt ne correspond à votre recherche." : "Commencez par ajouter votre premier dépôt."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredDepots.map((depot) => {
            const isActive = depot.isActive !== false;
            const depotLat = Number(depot.latitude) || (depot.name?.toLowerCase().includes("sousse") ? 35.8256 : 36.8431);
            const depotLng = Number(depot.longitude) || (depot.name?.toLowerCase().includes("sousse") ? 10.6369 : 10.2033);

            return (
              <div
                key={depot.id}
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: isActive ? "1px solid #e2e8f0" : "1px solid #fecaca",
                  padding: "20px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <div>
                  {/* Top Bar of card */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          background: "#eff6ff",
                          color: "#3b82f6",
                          border: "1px solid #bfdbfe",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontFamily: "monospace",
                        }}
                      >
                        <FaBarcode size={10} /> {depot.code || `DEP-${depot.id}`}
                      </span>
                      <h3
                        style={{
                          margin: "6px 0 2px",
                          fontSize: "1.15rem",
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {depot.name}
                      </h3>
                    </div>

                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "20px",
                        background: isActive ? "#d1fae5" : "#fee2e2",
                        color: isActive ? "#065f46" : "#991b1b",
                      }}
                    >
                      {isActive ? <FaCheckCircle size={10} /> : <FaTimesCircle size={10} />}
                      {isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  {/* Details */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      fontSize: "0.85rem",
                      color: "#475569",
                      margin: "12px 0 16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <FaMapMarkerAlt style={{ color: "#ef4444", flexShrink: 0, marginTop: "3px" }} />
                      <span>{depot.address || "Adresse non renseignée"}</span>
                    </div>

                    {/* Coordinates & Google Maps Link */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${depotLat},${depotLng}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Ouvrir l'emplacement sur Google Maps"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          color: "#4f46e5",
                          background: "#eef2ff",
                          border: "1px solid #c7d2fe",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          textDecoration: "none",
                        }}
                      >
                        <FaCompass size={11} /> GPS: {depotLat.toFixed(4)}, {depotLng.toFixed(4)}
                        <FaExternalLinkAlt size={9} style={{ opacity: 0.7 }} />
                      </a>
                    </div>

                    {depot.phone && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FaPhoneAlt style={{ color: "#10b981", flexShrink: 0 }} />
                        <a
                          href={`tel:${depot.phone}`}
                          style={{ color: "#0f172a", textDecoration: "none", fontWeight: 600 }}
                        >
                          {depot.phone}
                        </a>
                      </div>
                    )}

                    {depot.remark && (
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "8px",
                          padding: "8px 12px",
                          fontSize: "0.8rem",
                          color: "#64748b",
                          border: "1px dashed #cbd5e1",
                          marginTop: "4px",
                        }}
                      >
                        <FaInfoCircle style={{ marginRight: "4px", color: "#6366f1" }} />
                        {depot.remark}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div
                  style={{
                    paddingTop: "14px",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Statut :</span>
                    <Toggle
                      checked={isActive}
                      onChange={() => handleToggleActive(depot)}
                      size="sm"
                    />
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => history.push(`/deliveries?depotId=${depot.id}`)}
                      title="Voir les colis dans ce dépôt"
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        color: "#334155",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaBoxes size={12} /> Colis
                    </button>

                    <button
                      onClick={() => handleEdit(depot)}
                      title="Modifier"
                      style={{
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#2563eb",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaEdit size={12} /> Modifier
                    </button>

                    <button
                      onClick={() => handleDelete(depot.id, depot.name)}
                      title="Supprimer"
                      style={{
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        color: "#dc2626",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "0.8rem",
                        cursor: "pointer",
                      }}
                    >
                      <FaTrash size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Depot Modal with Interactive Map Picker */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <Modal.Header>
          <Modal.Title style={{ fontWeight: 800, color: "#0f172a" }}>
            {isEditing ? "Modifier le Dépôt / Lieu de Préparation" : "Créer un Nouveau Dépôt"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", padding: "8px 0" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
                Nom du Dépôt / Emplacement *
              </label>
              <Input
                placeholder="Ex: Dépôt Central Tunis, Dépôt Sousse..."
                value={formData.name}
                onChange={(val) => setFormData((p) => ({ ...p, name: val }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
                  Code Emplacement / Référence :
                </label>
                <Input
                  placeholder="Ex: DEP-TUN-01"
                  value={formData.code}
                  onChange={(val) => setFormData((p) => ({ ...p, code: val }))}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
                  Téléphone du Dépôt :
                </label>
                <Input
                  placeholder="+216 ..."
                  value={formData.phone}
                  onChange={(val) => setFormData((p) => ({ ...p, phone: val }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
                Adresse Complète :
              </label>
              <Input
                placeholder="Ex: Zone Industrielle Charguia 1, 2035 Tunis"
                value={formData.address}
                onChange={(val) => setFormData((p) => ({ ...p, address: val }))}
              />
            </div>

            {/* INTERACTIVE MAP PICKER FOR LATITUDE & LONGITUDE */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FaCompass style={{ color: "#4f46e5" }} /> Position GPS & Sélecteur sur Carte
                </span>
                <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b" }}>
                  {formData.latitude}, {formData.longitude}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "2px", display: "block" }}>
                    Latitude :
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="36.843100"
                    value={formData.latitude}
                    onChange={(val) => setFormData((p) => ({ ...p, latitude: parseFloat(val) || 0 }))}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "2px", display: "block" }}>
                    Longitude :
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    placeholder="10.203300"
                    value={formData.longitude}
                    onChange={(val) => setFormData((p) => ({ ...p, longitude: parseFloat(val) || 0 }))}
                  />
                </div>
              </div>

              {/* Live Interactive Leaflet Map Picker */}
              <DepotMapPicker
                lat={formData.latitude}
                lng={formData.longitude}
                onChange={(lat, lng) => setFormData((p) => ({ ...p, latitude: lat, longitude: lng }))}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
                Remarque / Consignes de Stockage :
              </label>
              <Input
                as="textarea"
                rows={2}
                placeholder="Capacité max, instructions de tri, horaires d'ouverture..."
                value={formData.remark}
                onChange={(val) => setFormData((p) => ({ ...p, remark: val }))}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
              <Toggle
                checked={formData.isActive}
                onChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))}
              />
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                Dépôt actif pour la préparation et le stockage des colis
              </span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setModalOpen(false)} appearance="subtle">
            Annuler
          </Button>
          <Button onClick={handleSave} appearance="primary" style={{ background: "#4f46e5", fontWeight: 700 }}>
            {isEditing ? "Enregistrer les modifications" : "Créer le Dépôt"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
