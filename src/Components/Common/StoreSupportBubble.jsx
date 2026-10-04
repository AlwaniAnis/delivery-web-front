import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { useRecoilValue } from "recoil";
import {
  FaWhatsapp,
  FaCommentDots,
  FaTimes,
  FaWarehouse,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaHeadset,
  FaUserTie,
  FaPaperPlane,
  FaExclamationCircle,
  FaClock,
} from "react-icons/fa";
import { activeRoleState, currentUserState, normalizeRole } from "../../Atoms/auth.atom";
import { MyStore } from "../../Atoms/store.atom";
import { StoresList } from "../../Atoms/stores.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { DepotAgentsList } from "../../Atoms/depotAgents.atom";
import { globalContactsState, formatWhatsAppUrl } from "../../Atoms/globalContacts.atom";

export default function StoreSupportBubble() {
  const history = useHistory();
  const activeRole = useRecoilValue(activeRoleState);
  const currentUser = useRecoilValue(currentUserState);
  const myStore = useRecoilValue(MyStore);
  const storesList = useRecoilValue(StoresList);
  const depotsList = useRecoilValue(preparationPlacesState);
  const depotAgents = useRecoilValue(DepotAgentsList);
  const globalContacts = useRecoilValue(globalContactsState);

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("depot"); // "depot" | "global" | "whatsapp"
  const [quickMessage, setQuickMessage] = useState("");
  const [selectedPhone, setSelectedPhone] = useState("");

  // Exclusively visible for Partner Stores (B2Bclient), not Principal Store (Admin)
  const isB2B = normalizeRole(activeRole) === "B2Bclient";
  if (!isB2B) return null;

  // Determine the current partner store and its assigned territory depot
  const storeId = Number(myStore?.id || currentUser?.storeId || currentUser?.eStoreId || 0);
  const matchedStore =
    storesList.find((s) => Number(s.id) === storeId) || myStore || {};
  const storeName =
    matchedStore?.name_fr ||
    matchedStore?.name ||
    currentUser?.fullName ||
    "Boutique Partenaire";

  const storeDepotId = Number(
    matchedStore?.preparationPlaceId ||
      myStore?.preparationPlaceId ||
      currentUser?.preparationPlaceId ||
      depotsList[0]?.id ||
      0
  );

  const assignedDepot =
    depotsList.find((d) => Number(d.id) === storeDepotId) || depotsList[0] || null;

  // Depot agents belonging to this store's territory depot
  const assignedDepotAgents = depotAgents.filter(
    (ag) =>
      Number(ag.preparationPlaceId || ag.depotId) === Number(assignedDepot?.id) &&
      ag.isActive !== false
  );

  // Determine primary WhatsApp number (from Global Contacts or Assigned Depot)
  const primaryGlobalContact =
    globalContacts.find((c) => c.isPrimaryWhatsapp && (c.whatsapp || c.phone)) ||
    globalContacts.find((c) => c.whatsapp || c.phone) ||
    null;

  const defaultWhatsappNumber =
    selectedPhone ||
    primaryGlobalContact?.whatsapp ||
    primaryGlobalContact?.phone ||
    assignedDepot?.phone ||
    assignedDepotAgents[0]?.phone1 ||
    "";

  const composedText = quickMessage.trim()
    ? `Bonjour, ici la boutique *${storeName}* : ${quickMessage.trim()}`
    : `Bonjour, ici la boutique *${storeName}*, j'ai besoin d'assistance concernant nos livraisons.`;

  const directWhatsAppHref = formatWhatsAppUrl(defaultWhatsappNumber, composedText);

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 9990,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Expanded Chat / Contacts Popover Window */}
      {isOpen && (
        <div
          style={{
            width: "375px",
            maxWidth: "calc(100vw - 32px)",
            background: "#ffffff",
            borderRadius: "18px",
            boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.32)",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            marginBottom: "14px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              color: "#ffffff",
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "22px",
                }}
              >
                <FaWhatsapp />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.96rem", lineHeight: 1.2 }}>
                  Assistance & Contact Direct
                </div>
                <div style={{ fontSize: "0.74rem", opacity: 0.9, marginTop: "2px" }}>
                  Dépôt du Territoire & Support Tawsil
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.18)",
                border: "none",
                color: "#fff",
                width: "30px",
                height: "30px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Fermer"
            >
              <FaTimes size={13} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              padding: "4px",
              gap: "4px",
            }}
          >
            <button
              onClick={() => setActiveTab("depot")}
              style={{
                border: "none",
                background: activeTab === "depot" ? "#ffffff" : "transparent",
                color: activeTab === "depot" ? "#0f172a" : "#64748b",
                fontWeight: activeTab === "depot" ? 800 : 600,
                fontSize: "0.75rem",
                padding: "8px 6px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: activeTab === "depot" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <FaWarehouse size={11} style={{ color: "#d97706" }} />
              Mon Dépôt
            </button>

            <button
              onClick={() => setActiveTab("global")}
              style={{
                border: "none",
                background: activeTab === "global" ? "#ffffff" : "transparent",
                color: activeTab === "global" ? "#0f172a" : "#64748b",
                fontWeight: activeTab === "global" ? 800 : 600,
                fontSize: "0.75rem",
                padding: "8px 6px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: activeTab === "global" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <FaHeadset size={11} style={{ color: "#2563eb" }} />
              Support ({globalContacts.length})
            </button>

            <button
              onClick={() => setActiveTab("whatsapp")}
              style={{
                border: "none",
                background: activeTab === "whatsapp" ? "#ffffff" : "transparent",
                color: activeTab === "whatsapp" ? "#059669" : "#64748b",
                fontWeight: activeTab === "whatsapp" ? 800 : 600,
                fontSize: "0.75rem",
                padding: "8px 6px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: activeTab === "whatsapp" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
              }}
            >
              <FaWhatsapp size={12} style={{ color: "#059669" }} />
              Chat Direct
            </button>
          </div>

          {/* Body Content */}
          <div
            style={{
              padding: "14px 16px",
              maxHeight: "340px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {/* TAB 1: MON DÉPÔT DE TERRITOIRE & AGENTS */}
            {activeTab === "depot" && (
              <>
                {assignedDepot ? (
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "12px",
                      padding: "12px 14px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div>
                        <span
                          style={{
                            background: "#fef3c7",
                            color: "#92400e",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            textTransform: "uppercase",
                          }}
                        >
                          Dépôt de votre territoire
                        </span>
                        <h4 style={{ margin: "6px 0 2px", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                          {assignedDepot.name}
                        </h4>
                        {assignedDepot.code && (
                          <div style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "#b45309", fontWeight: 700 }}>
                            Code: {assignedDepot.code}
                          </div>
                        )}
                      </div>
                    </div>

                    {assignedDepot.address && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#475569",
                          marginTop: "8px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "6px",
                        }}
                      >
                        <FaMapMarkerAlt style={{ color: "#d97706", marginTop: "3px", flexShrink: 0 }} size={12} />
                        <span>{assignedDepot.address}</span>
                      </div>
                    )}

                    {assignedDepot.phone ? (
                      <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                        <a
                          href={`tel:${assignedDepot.phone}`}
                          style={{
                            flex: 1,
                            background: "#ffffff",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            padding: "7px 10px",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <FaPhoneAlt size={11} style={{ color: "#2563eb" }} />
                          {assignedDepot.phone}
                        </a>
                        <a
                          href={formatWhatsAppUrl(
                            assignedDepot.phone,
                            `Bonjour Dépôt ${assignedDepot.name}, ici la boutique ${storeName}.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "#16a34a",
                            color: "#ffffff",
                            borderRadius: "8px",
                            padding: "7px 12px",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                          }}
                        >
                          <FaWhatsapp size={13} />
                          WhatsApp
                        </a>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "8px", fontStyle: "italic" }}>
                        Aucun numéro direct renseigné sur la fiche dépôt.
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "16px", color: "#64748b", fontSize: "0.82rem" }}>
                    Aucun dépôt de rattachement configuré.
                  </div>
                )}

                {/* Depot Agents of this Depot */}
                <div>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      fontWeight: 800,
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <FaUserTie size={11} style={{ color: "#4f46e5" }} />
                    Agents responsables du dépôt ({assignedDepotAgents.length})
                  </div>

                  {assignedDepotAgents.length === 0 ? (
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        fontSize: "0.76rem",
                        color: "#64748b",
                      }}
                    >
                      Utilisez le numéro principal du dépôt ou l'onglet Support pour joindre un responsable.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {assignedDepotAgents.map((ag) => {
                        const agentName =
                          `${ag.firstName || ""} ${ag.lastName || ""}`.trim() ||
                          ag.fullName ||
                          "Agent de Dépôt";
                        const agentPhone = ag.phone1 || ag.phone2 || "";
                        return (
                          <div
                            key={ag.id}
                            style={{
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "10px 12px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "0.82rem", color: "#0f172a" }}>
                                {agentName}
                              </div>
                              {agentPhone && (
                                <div style={{ fontSize: "0.74rem", color: "#475569", fontFamily: "monospace" }}>
                                  📞 {agentPhone}
                                </div>
                              )}
                              {ag.email && (
                                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                  ✉️ {ag.email}
                                </div>
                              )}
                            </div>

                            {agentPhone && (
                              <div style={{ display: "flex", gap: "6px" }}>
                                <a
                                  href={`tel:${agentPhone}`}
                                  style={{
                                    background: "#eff6ff",
                                    color: "#2563eb",
                                    border: "1px solid #bfdbfe",
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textDecoration: "none",
                                  }}
                                  title={`Appeler ${agentName}`}
                                >
                                  <FaPhoneAlt size={12} />
                                </a>
                                <a
                                  href={formatWhatsAppUrl(
                                    agentPhone,
                                    `Bonjour ${agentName}, ici la boutique ${storeName}.`
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    border: "1px solid #bbf7d0",
                                    width: "32px",
                                    height: "32px",
                                    borderRadius: "8px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    textDecoration: "none",
                                  }}
                                  title={`WhatsApp ${agentName}`}
                                >
                                  <FaWhatsapp size={15} />
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* TAB 2: CONTACTS GLOBAUX (GÉRÉS PAR L'ADMIN) */}
            {activeTab === "global" && (
              <>
                {globalContacts.length === 0 ? (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px dashed #cbd5e1",
                      borderRadius: "12px",
                      padding: "20px 14px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "0.8rem",
                    }}
                  >
                    Aucun contact global additionnel n'a été publié par l'administration pour le moment.
                    Vous pouvez contacter votre dépôt dans l'onglet <strong>Mon Dépôt</strong> ou ouvrir une réclamation.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {globalContacts.map((gc) => {
                      const waNumber = gc.whatsapp || gc.phone;
                      return (
                        <div
                          key={gc.id}
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "12px",
                            padding: "12px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                            <div>
                              <span
                                style={{
                                  background: "#e0e7ff",
                                  color: "#3730a3",
                                  fontSize: "0.68rem",
                                  fontWeight: 800,
                                  padding: "2px 7px",
                                  borderRadius: "6px",
                                }}
                              >
                                {gc.department || "Support Tawsil"}
                              </span>
                              <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#0f172a", marginTop: "4px" }}>
                                {gc.title}
                              </div>
                            </div>
                          </div>

                          {gc.workingHours && (
                            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FaClock size={10} /> {gc.workingHours}
                            </div>
                          )}

                          <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
                            {gc.phone && (
                              <a
                                href={`tel:${gc.phone}`}
                                style={{
                                  background: "#ffffff",
                                  color: "#0f172a",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "8px",
                                  padding: "5px 10px",
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <FaPhoneAlt size={10} style={{ color: "#2563eb" }} />
                                {gc.phone}
                              </a>
                            )}

                            {waNumber && (
                              <a
                                href={formatWhatsAppUrl(
                                  waNumber,
                                  `Bonjour (${gc.title}), ici la boutique ${storeName}.`
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: "#16a34a",
                                  color: "#ffffff",
                                  borderRadius: "8px",
                                  padding: "5px 10px",
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <FaWhatsapp size={13} />
                                WhatsApp
                              </a>
                            )}

                            {gc.email && (
                              <a
                                href={`mailto:${gc.email}?subject=${encodeURIComponent(`Demande Boutique ${storeName}`)}`}
                                style={{
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                  borderRadius: "8px",
                                  padding: "5px 10px",
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                              >
                                <FaEnvelope size={10} />
                                Email
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TAB 3: DISCUSSION WHATSAPP RAPIDE */}
            {activeTab === "whatsapp" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "0.78rem",
                    color: "#166534",
                  }}
                >
                  Envoyez un message WhatsApp directement à votre <strong>Dépôt</strong> ou au <strong>Support Tawsil</strong>.
                </div>

                <div>
                  <label style={{ fontSize: "0.74rem", fontWeight: 800, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Destinataire WhatsApp :
                  </label>
                  <select
                    value={selectedPhone}
                    onChange={(e) => setSelectedPhone(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      background: "#fff",
                    }}
                  >
                    <option value="">
                      Par défaut ({primaryGlobalContact?.title || assignedDepot?.name || "Support / Dépôt"})
                    </option>
                    {assignedDepot?.phone && (
                      <option value={assignedDepot.phone}>
                        🏬 Dépôt : {assignedDepot.name} ({assignedDepot.phone})
                      </option>
                    )}
                    {assignedDepotAgents
                      .filter((a) => a.phone1 || a.phone2)
                      .map((a) => (
                        <option key={`ag-${a.id}`} value={a.phone1 || a.phone2}>
                          👤 Agent Dépôt : {a.firstName} {a.lastName} ({a.phone1 || a.phone2})
                        </option>
                      ))}
                    {globalContacts
                      .filter((c) => c.whatsapp || c.phone)
                      .map((c) => (
                        <option key={`gc-${c.id}`} value={c.whatsapp || c.phone}>
                          🛡️ {c.title} ({c.whatsapp || c.phone})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.74rem", fontWeight: 800, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Votre message :
                  </label>
                  <textarea
                    rows={3}
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="Ex: Bonjour, pouvez-vous vérifier le statut de ramassage pour notre boutique aujourd'hui ?"
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.8rem",
                      resize: "vertical",
                    }}
                  />
                </div>

                {directWhatsAppHref ? (
                  <a
                    href={directWhatsAppHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                      color: "#ffffff",
                      borderRadius: "10px",
                      padding: "10px 14px",
                      fontSize: "0.84rem",
                      fontWeight: 800,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
                    }}
                  >
                    <FaWhatsapp size={17} />
                    Démarrer la discussion WhatsApp
                  </a>
                ) : (
                  <div style={{ fontSize: "0.76rem", color: "#dc2626", textAlign: "center", fontWeight: 600 }}>
                    Aucun numéro WhatsApp configuré pour ce destinataire.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Quick Link to Reclamations */}
          <div
            style={{
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              padding: "10px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>
              Besoin d'un suivi de ticket ?
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                history.push("/reclamations");
              }}
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "0.74rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <FaExclamationCircle size={11} />
              Mes Réclamations
            </button>
          </div>
        </div>
      )}

      {/* Floating Launcher Button (WhatsApp / Chat Bubble) */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          background: isOpen
            ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
            : "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
          color: "#ffffff",
          border: "none",
          borderRadius: "999px",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          boxShadow: "0 10px 25px -4px rgba(21, 128, 61, 0.5)",
          fontWeight: 800,
          fontSize: "0.88rem",
          marginLeft: "auto",
          transition: "all 0.2s ease",
        }}
        title="Contacter votre Dépôt ou le Support sur WhatsApp"
      >
        <FaWhatsapp size={22} />
        <span>{isOpen ? "Fermer" : "WhatsApp & Contacts"}</span>
      </button>
    </div>
  );
}
