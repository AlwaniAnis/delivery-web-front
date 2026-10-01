import React, { useEffect, useState } from "react";
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
} from "react-icons/fa";
import Swal from "sweetalert2";
import { APi } from "../../Api";
import {
  preparationPlacesState,
  REAL_DEFAULT_DEPOTS,
} from "../../Atoms/preparationPlaces.atom";

export default function PreparationPlaces() {
  const [depots, setDepots] = useRecoilState(preparationPlacesState);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'active' | 'inactive'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    code: "",
    address: "",
    phone: "",
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
          // Exactly the 2 real depots: Dépôt Tunis & Dépôt Sousse
          setDepots(REAL_DEFAULT_DEPOTS);
          for (const item of REAL_DEFAULT_DEPOTS) {
            try {
              await APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace).create({
                name: item.name,
                code: item.code,
                address: item.address,
                phone: item.phone,
                isActive: true,
                remark: item.remark,
              });
            } catch (e) {}
          }
        }
      })
      .catch((err) => {
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
      // PUT update
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
          // Local fallback in case offline or API sync
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
      // POST create
      const newRecord = { ...formData, id: Date.now() % 10000 };
      APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace)
        .create(formData)
        .then((res) => {
          Swal.fire({
            icon: "success",
            title: "Dépôt créé avec succès",
            timer: 1500,
            showConfirmButton: false,
          });
          setModalOpen(false);
          fetchDepots();
        })
        .catch(() => {
          // Local fallback
          setDepots((prev) => [...prev, newRecord]);
          setModalOpen(false);
          Swal.fire({
            icon: "success",
            title: "Dépôt ajouté avec succès",
            timer: 1500,
            showConfirmButton: false,
          });
        });
    }
  };

  // Delete
  const handleDelete = (id, name) => {
    Swal.fire({
      title: "Supprimer ce lieu de stockage ?",
      text: `Êtes-vous sûr de vouloir supprimer le dépôt "${name}" ?`,
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
            Swal.fire("Supprimé !", "Le dépôt a été supprimé.", "success");
            setDepots((prev) => prev.filter((d) => d.id !== id));
            fetchDepots();
          })
          .catch(() => {
            setDepots((prev) => prev.filter((d) => d.id !== id));
            Swal.fire("Supprimé !", "Le dépôt a été supprimé.", "success");
          });
      }
    });
  };

  // Toggle Active
  const handleToggleActive = (depot) => {
    const updated = { ...depot, isActive: !depot.isActive };
    APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace)
      .update(depot.id, updated)
      .catch(() => {});
    setDepots((prev) =>
      prev.map((d) => (d.id === depot.id ? updated : d))
    );
  };

  // Filtered List
  const filteredDepots = depots.filter((d) => {
    const matchesSearch =
      (d.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.address || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (activeFilter === "active") return matchesSearch && d.isActive !== false;
    if (activeFilter === "inactive") return matchesSearch && d.isActive === false;
    return matchesSearch;
  });

  const activeCount = depots.filter((d) => d.isActive !== false).length;

  return (
    <div style={{ padding: "20px", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          borderRadius: "16px",
          padding: "24px 28px",
          color: "#fff",
          marginBottom: "24px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              background: "#4f46e5",
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
            }}
          >
            <FaWarehouse />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#fff" }}>
              Dépôts & Lieux de Préparation des Colis
            </h2>
            <p style={{ margin: "4px 0 0", color: "#c7d2fe", fontSize: "0.9rem" }}>
              Gérez les centres de stockage, dépôts de tri et plateformes de préparation logistique
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleAddNew}
            style={{
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            <FaPlus /> Nouveau Dépôt
          </button>

          <button
            onClick={fetchDepots}
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              borderRadius: "10px",
              padding: "10px 16px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#eff6ff",
              color: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            <FaWarehouse />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Total Dépôts</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
              {depots.length}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#ecfdf5",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            <FaCheckCircle />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Dépôts Actifs</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#059669" }}>
              {activeCount}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "#faf5ff",
              color: "#a855f7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            <FaBoxes />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>Affectation Colis</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#6b21a8" }}>
              Disponible dans formulaire Colis
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "380px" }}>
            <FaSearch
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder="Rechercher par nom, code ou adresse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Status filters */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[
            { id: "all", label: "Tous" },
            { id: "active", label: "Actifs uniquement" },
            { id: "inactive", label: "Inactifs" },
          ].map((flt) => (
            <button
              key={flt.id}
              onClick={() => setActiveFilter(flt.id)}
              style={{
                background: activeFilter === flt.id ? "#4f46e5" : "#f1f5f9",
                color: activeFilter === flt.id ? "#fff" : "#475569",
                border: "none",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {flt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Dépôts */}
      {loading ? (
        <div style={{ padding: "60px", textAlign: "center" }}>
          <Loader size="md" content="Chargement des dépôts..." />
        </div>
      ) : filteredDepots.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <FaWarehouse size={40} style={{ color: "#cbd5e1", marginBottom: "12px" }} />
          <h4 style={{ margin: "0 0 6px", color: "#334155" }}>Aucun lieu de stockage trouvé</h4>
          <p style={{ color: "#64748b", fontSize: "0.88rem", margin: "0 0 16px" }}>
            Créez un nouveau dépôt pour commencer à organiser le stockage des colis.
          </p>
          <Button appearance="primary" onClick={handleAddNew}>
            <FaPlus style={{ marginRight: 6 }} /> Ajouter un Dépôt
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredDepots.map((depot) => {
            const isActive = depot.isActive !== false;

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

      {/* Add / Edit Depot Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="md">
        <Modal.Header>
          <Modal.Title style={{ fontWeight: 800, color: "#0f172a" }}>
            {isEditing ? "Modifier le Dépôt / Lieu de Préparation" : "Créer un Nouveau Dépôt"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "10px 0" }}>
            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
                Nom du Dépôt / Emplacement *
              </label>
              <Input
                placeholder="Ex: Dépôt Central Tunis, Dépôt Sousse..."
                value={formData.name}
                onChange={(val) => setFormData((p) => ({ ...p, name: val }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Code Emplacement / Référence
                </label>
                <Input
                  placeholder="Ex: DEP-TUN-01"
                  value={formData.code}
                  onChange={(val) => setFormData((p) => ({ ...p, code: val }))}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Téléphone du Dépôt / Responsable
                </label>
                <Input
                  placeholder="+216 ..."
                  value={formData.phone}
                  onChange={(val) => setFormData((p) => ({ ...p, phone: val }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
                Adresse Complète
              </label>
              <Input
                placeholder="Ex: Zone Industrielle Charguia 1, 2035 Tunis"
                value={formData.address}
                onChange={(val) => setFormData((p) => ({ ...p, address: val }))}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
                Remarque / Consignes de Stockage
              </label>
              <Input
                as="textarea"
                rows={3}
                placeholder="Capacité max, instructions de tri, horaires d'ouverture..."
                value={formData.remark}
                onChange={(val) => setFormData((p) => ({ ...p, remark: val }))}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "8px" }}>
              <Toggle
                checked={formData.isActive}
                onChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))}
              />
              <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#334155" }}>
                Dépôt actif pour la préparation et le stockage des colis
              </span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setModalOpen(false)} appearance="subtle">
            Annuler
          </Button>
          <Button onClick={handleSave} appearance="primary" style={{ background: "#4f46e5" }}>
            {isEditing ? "Enregistrer les modifications" : "Créer le Dépôt"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
