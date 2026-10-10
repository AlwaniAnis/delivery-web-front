import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useHistory } from "react-router-dom";
import { Button, Input, Modal, SelectPicker, Loader } from "rsuite";
import Swal from "sweetalert2";
import {
  FaAddressBook,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
  FaClock,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaCopy,
  FaBuilding,
  FaHeadset,
  FaMoneyBillWave,
  FaTruck,
  FaUserShield,
  FaCommentDots,
} from "react-icons/fa";
import { APi } from "../../Api";
import { globalContactsState } from "../../Atoms/globalContacts.atom";
import { activeRoleState, normalizeRole } from "../../Atoms/auth.atom";
import useB2B from "../../hooks/useB2B";

const CONTACT_DEPARTMENTS = [
  { label: "Service Client & Réclamations", value: "Service Client & Réclamations", color: "#2563eb", bg: "#eff6ff" },
  { label: "Comptabilité & Recouvrement COD", value: "Comptabilité & Recouvrement COD", color: "#059669", bg: "#ecfdf5" },
  { label: "Opérations & Expéditions Dépôt", value: "Opérations & Expéditions Dépôt", color: "#d97706", bg: "#fffbeb" },
  { label: "Direction & Partenariats B2B", value: "Direction & Partenariats B2B", color: "#7c3aed", bg: "#f5f3ff" },
  { label: "Support Technique", value: "Support Technique", color: "#475569", bg: "#f1f5f9" },
];

const emptyForm = {
  id: 0,
  name: "",
  roleTitle: "",
  department: "Service Client & Réclamations",
  phone: "",
  whatsapp: "",
  email: "",
  hours: "Lun - Sam : 08h30 - 18h00",
  description: "",
};

export default function GlobalContacts() {
  const [contacts, setContacts] = useRecoilState(globalContactsState);
  const activeRole = useRecoilValue(activeRoleState);
  const { isB2B } = useB2B();
  const history = useHistory();

  const normalizedRole = normalizeRole(activeRole);
  const isAdmin = !isB2B && normalizedRole === "admin";

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");

  // Modal State (Admin Add / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const persistContacts = (nextList) => {
    setContacts(nextList);
    try {
      localStorage.setItem("tawsil_global_contacts", JSON.stringify(nextList));
    } catch (e) {}
  };

  const fetchContacts = () => {
    setLoading(true);
    APi.createAPIEndpoint(APi.ENDPOINTS.GlobalContact + "/getAll")
      .customGet()
      .then((res) => {
        setLoading(false);
        const list = res.data?.data || res.data;
        if (Array.isArray(list)) {
          persistContacts(list);
        }
      })
      .catch(() => {
        APi.createAPIEndpoint(APi.ENDPOINTS.GlobalContact)
          .fetchAll()
          .then((res) => {
            const list = res.data?.data || res.data;
            if (Array.isArray(list)) {
              persistContacts(list);
            }
          })
          .finally(() => {
            setLoading(false);
          });
      });
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleOpenAdd = () => {
    setEditingContact({ ...emptyForm, id: 0 });
    setFormError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (contact) => {
    setEditingContact({
      id: contact.id,
      name: contact.name || "",
      roleTitle: contact.roleTitle || "",
      department: contact.department || "Service Client & Réclamations",
      phone: contact.phone || "",
      whatsapp: contact.whatsapp || "",
      email: contact.email || "",
      hours: contact.hours || "Lun - Sam : 08h30 - 18h00",
      description: contact.description || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSaveContact = () => {
    if (!editingContact.name.trim()) {
      setFormError("Veuillez saisir le nom du contact ou du service.");
      return;
    }
    if (!editingContact.phone.trim() && !editingContact.email.trim()) {
      setFormError("Veuillez saisir au moins un numéro de téléphone ou une adresse email.");
      return;
    }

    const payload = {
      ...editingContact,
      name: editingContact.name.trim(),
      roleTitle: editingContact.roleTitle.trim(),
      phone: editingContact.phone.trim(),
      whatsapp: editingContact.whatsapp.trim(),
      email: editingContact.email.trim(),
      hours: editingContact.hours.trim(),
      description: editingContact.description.trim(),
    };

    if (editingContact.id) {
      // Update existing contact
      APi.createAPIEndpoint(APi.ENDPOINTS.GlobalContact)
        .update(editingContact.id, payload)
        .then(() => {
          const next = contacts.map((c) => (c.id === editingContact.id ? payload : c));
          persistContacts(next);
          setModalOpen(false);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Contact mis à jour !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch(() => {
          const next = contacts.map((c) => (c.id === editingContact.id ? payload : c));
          persistContacts(next);
          setModalOpen(false);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Contact mis à jour !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    } else {
      // Create new contact
      const toCreate = { ...payload, id: Date.now() };
      APi.createAPIEndpoint(APi.ENDPOINTS.GlobalContact)
        .create(payload)
        .then((res) => {
          const created = res.data?.id ? { ...payload, ...res.data } : toCreate;
          persistContacts([created, ...contacts]);
          setModalOpen(false);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Contact global ajouté !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch(() => {
          persistContacts([toCreate, ...contacts]);
          setModalOpen(false);
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Contact global ajouté !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    }
  };

  const handleDeleteContact = (contact) => {
    Swal.fire({
      title: "Supprimer ce contact ?",
      text: `${contact.name} (${contact.department})`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    }).then((res) => {
      if (res.isConfirmed) {
        APi.createAPIEndpoint(APi.ENDPOINTS.GlobalContact)
          .delete(contact.id)
          .then(() => {
            persistContacts(contacts.filter((c) => c.id !== contact.id));
            Swal.fire("Supprimé", "Le contact a été retiré.", "success");
          })
          .catch(() => {
            persistContacts(contacts.filter((c) => c.id !== contact.id));
            Swal.fire("Supprimé", "Le contact a été retiré.", "success");
          });
      }
    });
  };

  const handleCopy = (text, label) => {
    if (!text) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    Swal.fire({
      position: "top-end",
      icon: "info",
      title: `${label} copié : ${text}`,
      showConfirmButton: false,
      timer: 1200,
    });
  };

  const filteredContacts = contacts.filter((c) => {
    if (deptFilter !== "ALL" && c.department !== deptFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (c.name || "").toLowerCase().includes(q) ||
      (c.roleTitle || "").toLowerCase().includes(q) ||
      (c.department || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.description || "").toLowerCase().includes(q)
    );
  });

  const getDeptBadge = (deptName) => {
    return (
      CONTACT_DEPARTMENTS.find((d) => d.value === deptName) || {
        label: deptName || "Support",
        color: "#2563eb",
        bg: "#eff6ff",
      }
    );
  };

  const getDeptIcon = (deptName) => {
    if ((deptName || "").includes("Comptabilité")) return <FaMoneyBillWave />;
    if ((deptName || "").includes("Opérations")) return <FaTruck />;
    if ((deptName || "").includes("Direction")) return <FaUserShield />;
    return <FaHeadset />;
  };

  return (
    <div style={{ padding: "16px", maxWidth: "1450px", margin: "0 auto" }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          borderRadius: "16px",
          padding: "22px 24px",
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
              background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
            }}
          >
            <FaAddressBook />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                {isAdmin
                  ? "Gestion des Contacts Globaux (Support Boutiques)"
                  : "Contacts Utiles & Support Administration"}
              </h2>
              <span
                style={{
                  background: isAdmin ? "#7c3aed" : "#2563eb",
                  color: "#fff",
                  fontSize: "0.74rem",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontWeight: 700,
                }}
              >
                {isAdmin ? "Configuré par l'Admin" : "Annuaire Officiel"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              {isAdmin
                ? "Ajoutez et mettez à jour les contacts officiels mis à la disposition des boutiques partenaires"
                : "Retrouvez tous les numéros directs, WhatsApp et emails des services Squad Delivery pour vous assister"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {isB2B && (
            <Button
              onClick={() => history.push("/reclamations")}
              style={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                fontWeight: 700,
                borderRadius: "10px",
                padding: "10px 16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FaCommentDots /> Ouvrir une Réclamation
            </Button>
          )}

          {isAdmin && (
            <Button
              appearance="primary"
              onClick={handleOpenAdd}
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
                fontWeight: 800,
                borderRadius: "10px",
                padding: "10px 18px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
              }}
            >
              <FaPlus /> Ajouter un Contact Global
            </Button>
          )}
        </div>
      </div>

      {/* Search & Department Filter Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "14px 18px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ position: "relative", minWidth: "260px", flex: 1 }}>
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
            placeholder="Rechercher un service, un responsable, un numéro ou un email..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            style={{ paddingLeft: "34px", borderRadius: "8px" }}
          />
        </div>

        <SelectPicker
          data={[
            { label: "Tous les Services / Départements", value: "ALL" },
            ...CONTACT_DEPARTMENTS.map((d) => ({ label: d.label, value: d.value })),
          ]}
          value={deptFilter}
          onChange={(val) => setDeptFilter(val || "ALL")}
          cleanable={false}
          searchable={false}
          style={{ width: "280px", maxWidth: "100%", flex: "1 1 200px" }}
        />
      </div>

      {/* Contacts Cards Grid */}
      {loading ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "50px 20px",
            textAlign: "center",
          }}
        >
          <Loader size="md" content="Chargement des contacts..." />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "50px 20px",
            textAlign: "center",
            color: "#64748b",
          }}
        >
          <FaAddressBook size={40} style={{ color: "#cbd5e1", marginBottom: "10px" }} />
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "#334155" }}>
            Aucun contact global configuré
          </div>
          <p style={{ margin: "6px 0 0", fontSize: "0.85rem" }}>
            {isAdmin
              ? "Cliquez sur « Ajouter un Contact Global » pour publier les numéros et emails de support pour les boutiques."
              : "L'administration n'a pas encore publié de contacts dans cette catégorie."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 290px), 1fr))",
            gap: "16px",
          }}
        >
          {filteredContacts.map((contact, idx) => {
            const badge = getDeptBadge(contact.department);
            const cleanWhatsapp = (contact.whatsapp || contact.phone || "").replace(/[^0-9+]/g, "");

            return (
              <div
                key={contact.id || idx}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: "1px solid #e2e8f0",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.03)",
                }}
              >
                <div>
                  {/* Department Pill & Admin Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "8px",
                      marginBottom: "12px",
                    }}
                  >
                    <span
                      style={{
                        background: badge.bg,
                        color: badge.color,
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.73rem",
                        fontWeight: 800,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {getDeptIcon(contact.department)}
                      {contact.department}
                    </span>

                    {isAdmin && (
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        <button
                          onClick={() => handleOpenEdit(contact)}
                          style={{
                            background: "#f1f5f9",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "5px 8px",
                            cursor: "pointer",
                          }}
                          title="Modifier ce contact"
                        >
                          <FaEdit size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact)}
                          style={{
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                            borderRadius: "8px",
                            padding: "5px 8px",
                            cursor: "pointer",
                          }}
                          title="Supprimer ce contact"
                        >
                          <FaTrash size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Contact Name & Role */}
                  <h3 style={{ margin: "0 0 2px", fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    {contact.name}
                  </h3>
                  {contact.roleTitle && (
                    <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                      {contact.roleTitle}
                    </div>
                  )}

                  {contact.description && (
                    <p
                      style={{
                        margin: "6px 0 12px",
                        fontSize: "0.8rem",
                        color: "#64748b",
                        lineHeight: 1.45,
                      }}
                    >
                      {contact.description}
                    </p>
                  )}

                  {/* Details List */}
                  <div
                    style={{
                      background: "#f8fafc",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    {contact.phone && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                          <FaPhoneAlt style={{ color: "#2563eb" }} size={13} />
                          <span>{contact.phone}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(contact.phone, "Téléphone")}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Copier le numéro"
                        >
                          <FaCopy size={11} /> Copier
                        </button>
                      </div>
                    )}

                    {contact.whatsapp && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.84rem", fontWeight: 700, color: "#15803d" }}>
                        <FaWhatsapp style={{ color: "#16a34a" }} size={15} />
                        <span>WhatsApp : {contact.whatsapp}</span>
                      </div>
                    )}

                    {contact.email && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#334155", fontWeight: 600 }}>
                          <FaEnvelope style={{ color: "#4f46e5" }} size={13} />
                          <span>{contact.email}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(contact.email, "Email")}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#64748b",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FaCopy size={11} /> Copier
                        </button>
                      </div>
                    )}

                    {contact.hours && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.76rem", color: "#64748b" }}>
                        <FaClock style={{ color: "#d97706" }} size={12} />
                        <span>{contact.hours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons for Stores */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px" }}>
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      style={{
                        flex: 1,
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FaPhoneAlt size={12} /> Appeler
                    </a>
                  )}

                  {(contact.whatsapp || contact.phone) && (
                    <a
                      href={`https://wa.me/${cleanWhatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        background: "#f0fdf4",
                        color: "#15803d",
                        border: "1px solid #bbf7d0",
                        borderRadius: "10px",
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FaWhatsapp size={14} /> WhatsApp
                    </a>
                  )}

                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      style={{
                        flex: 1,
                        background: "#f5f3ff",
                        color: "#5b21b6",
                        border: "1px solid #ddd6fe",
                        borderRadius: "10px",
                        padding: "8px 12px",
                        fontSize: "0.8rem",
                        fontWeight: 800,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FaEnvelope size={12} /> Email
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADMIN ADD / EDIT MODAL */}
      <Modal size="md" open={modalOpen} onClose={() => setModalOpen(false)}>
        <Modal.Header>
          <Modal.Title style={{ fontWeight: 800 }}>
            {editingContact.id ? "Modifier le Contact Global" : "Ajouter un Contact Global"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                Département / Service * :
              </label>
              <SelectPicker
                data={CONTACT_DEPARTMENTS.map((d) => ({ label: d.label, value: d.value }))}
                block
                cleanable={false}
                searchable={false}
                value={editingContact.department}
                onChange={(val) => setEditingContact((prev) => ({ ...prev, department: val }))}
              />
            </div>

            <div className="responsive-grid-2">
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Nom du Contact ou Service * :
                </label>
                <Input
                  placeholder="Ex: Support Boutique / M. Karim"
                  value={editingContact.name}
                  onChange={(val) => setEditingContact((prev) => ({ ...prev, name: val }))}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Fonction / Rôle :
                </label>
                <Input
                  placeholder="Ex: Responsable Relation Boutiques"
                  value={editingContact.roleTitle}
                  onChange={(val) => setEditingContact((prev) => ({ ...prev, roleTitle: val }))}
                />
              </div>
            </div>

            <div className="responsive-grid-2">
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Téléphone Direct * :
                </label>
                <Input
                  placeholder="Ex: +216 71 800 100"
                  value={editingContact.phone}
                  onChange={(val) => setEditingContact((prev) => ({ ...prev, phone: val }))}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Numéro WhatsApp (Optionnel) :
                </label>
                <Input
                  placeholder="Ex: +216 55 100 200"
                  value={editingContact.whatsapp}
                  onChange={(val) => setEditingContact((prev) => ({ ...prev, whatsapp: val }))}
                />
              </div>
            </div>

            <div className="responsive-grid-2">
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Adresse Email :
                </label>
                <Input
                  placeholder="Ex: support@squaddelivery.tn"
                  value={editingContact.email}
                  onChange={(val) => setEditingContact((prev) => ({ ...prev, email: val }))}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Horaires de Disponibilité :
                </label>
                <Input
                  placeholder="Ex: Lun - Sam : 08h30 - 18h00"
                  value={editingContact.hours}
                  onChange={(val) => setEditingContact((prev) => ({ ...prev, hours: val }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                Note / Précisions pour les Boutiques :
              </label>
              <Input
                as="textarea"
                rows={3}
                placeholder="Ex: Contactez ce numéro pour toute urgence concernant le suivi des colis ou le virement COD..."
                value={editingContact.description}
                onChange={(val) => setEditingContact((prev) => ({ ...prev, description: val }))}
              />
            </div>

            {formError && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {formError}
              </div>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setModalOpen(false)} appearance="subtle">
            Annuler
          </Button>
          <Button
            onClick={handleSaveContact}
            appearance="primary"
            style={{ background: "#4f46e5", fontWeight: 700 }}
          >
            {editingContact.id ? "Enregistrer les modifications" : "Publier le Contact"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
