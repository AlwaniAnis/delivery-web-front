import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { useHistory } from "react-router-dom";
import { Button, Input, Modal, SelectPicker, Loader } from "rsuite";
import Swal from "sweetalert2";
import moment from "moment";
import {
  FaCommentDots,
  FaPlus,
  FaReply,
  FaStore,
  FaBoxOpen,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaSearch,
  FaPaperPlane,
  FaTrash,
  FaUserShield,
  FaFilter,
  FaAddressBook,
  FaPhoneAlt,
  FaWhatsapp,
  FaEnvelope,
} from "react-icons/fa";
import { APi } from "../../Api";
import { reclamationsState } from "../../Atoms/reclamations.atom";
import { globalContactsState } from "../../Atoms/globalContacts.atom";
import { MyStore } from "../../Atoms/store.atom";
import { StoresList } from "../../Atoms/stores.atom";
import { activeRoleState, currentUserState, normalizeRole } from "../../Atoms/auth.atom";
import useB2B from "../../hooks/useB2B";

const RECLAMATION_CATEGORIES = [
  { label: "Retard de livraison", value: "Retard de livraison" },
  { label: "Montant / Encaissement COD", value: "Montant / Encaissement COD" },
  { label: "Colis endommagé ou perdu", value: "Colis endommagé ou perdu" },
  { label: "Modification adresse / téléphone client", value: "Modification Destinataire" },
  { label: "Demande de retour colis", value: "Demande de retour colis" },
  { label: "Autre réclamation", value: "Autre" },
];

const RECLAMATION_PRIORITIES = [
  { label: "Normale", value: "Normale" },
  { label: "Haute", value: "Haute" },
  { label: "Urgente", value: "Urgente" },
];

const RECLAMATION_STATUSES = [
  { value: 1, label: "En attente", bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  { value: 2, label: "En cours de traitement", bg: "#e0e7ff", color: "#3730a3", border: "#c7d2fe" },
  { value: 3, label: "Répondue / Résolue", bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
  { value: 4, label: "Clôturée", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
];

export default function Reclamations() {
  const [reclamations, setReclamations] = useRecoilState(reclamationsState);
  const globalContacts = useRecoilValue(globalContactsState);
  const currentStore = useRecoilValue(MyStore);
  const storesList = useRecoilValue(StoresList);
  const activeRole = useRecoilValue(activeRoleState);
  const currentUser = useRecoilValue(currentUserState);
  const history = useHistory();

  const normalizedRole = normalizeRole(activeRole);
  const { isB2B } = useB2B();
  const isAdmin = !isB2B && normalizedRole === "admin";

  const activeStoreId = Number(
    currentStore?.id || currentUser?.storeId || currentUser?.eStoreId || 1
  );

  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(0);
  const [storeFilter, setStoreFilter] = useState(isB2B ? activeStoreId : 0);

  // Create Modal (Store or Admin)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [newRec, setNewRec] = useState({
    storeId: activeStoreId || storesList[0]?.id || 1,
    deliveryId: null,
    category: "Retard de livraison",
    priority: "Normale",
    subject: "",
    message: "",
  });

  // Detail & Reply Modal (Admin replies / Store views & follows up)
  const [selectedRec, setSelectedRec] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState(3);
  const [submittingReply, setSubmittingReply] = useState(false);

  const persistReclamations = (nextList) => {
    setReclamations(nextList);
    try {
      localStorage.setItem("tawsil_reclamations", JSON.stringify(nextList));
    } catch (e) {}
  };

  // Normalize backend Reclamation entity for UI display
  const normalizeReclamation = (rec) => {
    const matchedStore =
      rec.store ||
      storesList.find((s) => Number(s.id) === Number(rec.storeId || rec.eStoreId));
    const storeName =
      rec.storeName ||
      matchedStore?.name_fr ||
      matchedStore?.name ||
      `Boutique #${rec.storeId || 1}`;
    const deliveryCode =
      rec.deliveryCode ||
      rec.delivery?.qrCodeContent ||
      rec.delivery?.code ||
      (rec.deliveryId ? `#${rec.deliveryId}` : null);
    const customerName =
      rec.customerName || rec.delivery?.customer?.fullName || null;
    const customerPhone =
      rec.customerPhone || rec.delivery?.customer?.phoneNumber || null;

    const rawReplies = Array.isArray(rec.replies) ? rec.replies : [];
    const lastReply = rawReplies.length > 0 ? rawReplies[rawReplies.length - 1] : null;
    const adminReply =
      rec.adminReply ||
      (lastReply ? lastReply.message || lastReply.text || "" : "");

    return {
      ...rec,
      storeName,
      deliveryCode,
      customerName,
      customerPhone,
      adminReply,
      status: rec.status || (rawReplies.length > 0 ? 3 : 1),
    };
  };

  // Fetch Reclamations from Swagger API (/api/Reclamation/store/{storeId})
  const fetchReclamations = async () => {
    setLoading(true);
    try {
      if (isB2B && activeStoreId) {
        const res = await APi.createAPIEndpoint(
          `${APi.ENDPOINTS.Reclamation}/store/${activeStoreId}`
        ).customGet();
        const list = res.data?.data || res.data;
        if (Array.isArray(list)) {
          persistReclamations(list.map(normalizeReclamation));
        }
        setLoading(false);
        return;
      }

      if (storeFilter) {
        const res = await APi.createAPIEndpoint(
          `${APi.ENDPOINTS.Reclamation}/store/${storeFilter}`
        ).customGet();
        const list = res.data?.data || res.data;
        if (Array.isArray(list)) {
          persistReclamations(list.map(normalizeReclamation));
        }
        setLoading(false);
        return;
      }

      // Admin viewing all stores: fetch per store from /api/Reclamation/store/{storeId}
      const targetStores =
        storesList.length > 0
          ? storesList
          : [{ id: activeStoreId || 1 }];
      const results = await Promise.allSettled(
        targetStores.map((st) =>
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Reclamation}/store/${st.id}`).customGet()
        )
      );
      const mergedMap = new Map();
      results.forEach((r) => {
        if (r.status === "fulfilled") {
          const arr = r.value?.data?.data || r.value?.data;
          if (Array.isArray(arr)) {
            arr.forEach((item) => {
              if (item && item.id) {
                mergedMap.set(item.id, normalizeReclamation(item));
              }
            });
          }
        }
      });
      if (mergedMap.size > 0) {
        const sorted = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0)
        );
        persistReclamations(sorted);
      }
    } catch (e) {
      // Keep cached reclamations on error
    } finally {
      setLoading(false);
    }
  };

  // Load Store's Deliveries so Store can link a parcel to a reclamation
  const fetchStoreDeliveries = () => {
    const query = { page: 1, take: 200 };
    if (isB2B && activeStoreId) {
      query.storeId = activeStoreId;
    }
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, query)
      .fetchAll()
      .then((res) => {
        const list = res.data?.data || res.data;
        if (Array.isArray(list)) {
          setDeliveries(list);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchReclamations();
    fetchStoreDeliveries();
  }, [activeStoreId, isB2B, storeFilter, storesList.length]);

  // Create a new Reclamation
  const handleCreateReclamation = () => {
    if (!newRec.subject.trim()) {
      setFormError("Veuillez saisir l'objet de la réclamation.");
      return;
    }
    if (!newRec.message.trim()) {
      setFormError("Veuillez décrire votre réclamation en détail.");
      return;
    }

    const targetStoreId = isB2B
      ? activeStoreId || currentStore?.id || 1
      : Number(newRec.storeId || activeStoreId || storesList[0]?.id || 1);

    const matchedStore =
      storesList.find((s) => Number(s.id) === Number(targetStoreId)) || currentStore;
    const storeName =
      matchedStore?.name_fr ||
      matchedStore?.name ||
      currentUser?.fullName ||
      `Boutique #${targetStoreId}`;

    const matchedDelivery = deliveries.find(
      (d) => Number(d.id) === Number(newRec.deliveryId)
    );

    const payload = {
      storeId: targetStoreId,
      deliveryId: newRec.deliveryId || null,
      driverId: matchedDelivery?.driverId || null,
      preparationPlaceId:
        matchedDelivery?.preparationPlaceId ||
        matchedStore?.preparationPlaceId ||
        1,
      category: newRec.category || "Autre",
      priority: newRec.priority || "Normale",
      subject: newRec.subject.trim(),
      message: newRec.message.trim(),
      status: 1, // En attente
      createdDate: new Date().toISOString(),
    };

    const uiFallbackItem = normalizeReclamation({
      ...payload,
      storeName,
      deliveryCode:
        matchedDelivery?.qrCodeContent ||
        matchedDelivery?.code ||
        (newRec.deliveryId ? `#${newRec.deliveryId}` : null),
      customerName: matchedDelivery?.customer?.fullName || null,
      customerPhone: matchedDelivery?.customer?.phoneNumber || null,
      replies: [],
    });

    APi.createAPIEndpoint(APi.ENDPOINTS.Reclamation)
      .create(payload)
      .then((res) => {
        const created = res.data?.id
          ? normalizeReclamation({ ...uiFallbackItem, ...res.data })
          : { ...uiFallbackItem, id: Date.now() };
        persistReclamations([created, ...reclamations]);
        setCreateModalOpen(false);
        setFormError("");
        setNewRec({
          storeId: activeStoreId || storesList[0]?.id || 1,
          deliveryId: null,
          category: "Retard de livraison",
          priority: "Normale",
          subject: "",
          message: "",
        });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Réclamation envoyée avec succès !",
          showConfirmButton: false,
          timer: 1800,
        });
      })
      .catch(() => {
        const created = { ...uiFallbackItem, id: Date.now() };
        persistReclamations([created, ...reclamations]);
        setCreateModalOpen(false);
        setFormError("");
        setNewRec({
          storeId: activeStoreId || storesList[0]?.id || 1,
          deliveryId: null,
          category: "Retard de livraison",
          priority: "Normale",
          subject: "",
          message: "",
        });
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Réclamation enregistrée et transmise à l'administration !",
          showConfirmButton: false,
          timer: 1800,
        });
      });
  };

  // Open Reclamation Thread / Reply Modal & Fetch full Reclamation details (/api/Reclamation/{id})
  const openReclamationModal = (rec) => {
    const normalized = normalizeReclamation(rec);
    setSelectedRec(normalized);
    setReplyText("");
    setReplyStatus(isAdmin ? (normalized.status === 1 ? 3 : normalized.status || 3) : normalized.status || 1);

    if (rec.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Reclamation)
        .fetchById(rec.id)
        .then((res) => {
          if (res.data && res.data.id) {
            const fresh = normalizeReclamation({ ...normalized, ...res.data });
            setSelectedRec(fresh);
            persistReclamations(
              reclamations.map((r) => (r.id === fresh.id ? fresh : r))
            );
          }
        })
        .catch(() => {});
    }
  };

  // Submit Reply via POST /api/Reclamation/reply (ReplyModel: { reclamationId, userId, message })
  const handleSendReply = () => {
    if (!selectedRec) return;
    if (!replyText.trim() && (!isAdmin || replyStatus === selectedRec.status)) {
      Swal.fire("Attention", "Veuillez saisir un message de réponse.", "warning");
      return;
    }

    setSubmittingReply(true);
    const nowIso = new Date().toISOString();
    const replyPayload = {
      reclamationId: Number(selectedRec.id),
      userId: currentUser?.id ? Number(currentUser.id) : null,
      message: replyText.trim(),
    };

    const finalizeReplyUpdate = (serverReply = null) => {
      setSubmittingReply(false);
      const newReplyMsg = replyText.trim()
        ? {
            id: serverReply?.id || Date.now(),
            reclamationId: selectedRec.id,
            userId: currentUser?.id || null,
            senderRole: isAdmin ? "admin" : "store",
            senderName:
              serverReply?.user?.fullName ||
              (isAdmin
                ? currentUser?.fullName || "Administration Tawsil"
                : selectedRec.storeName || currentStore?.name_fr || "Boutique"),
            message: serverReply?.message || replyText.trim(),
            text: serverReply?.message || replyText.trim(),
            date: serverReply?.date || serverReply?.createdDate || nowIso,
          }
        : null;

      const updatedReplies = newReplyMsg
        ? [...(selectedRec.replies || []), newReplyMsg]
        : selectedRec.replies || [];

      const nextStatus = isAdmin
        ? Number(replyStatus || 3)
        : selectedRec.status === 3
        ? 2
        : selectedRec.status;

      const updatedRec = normalizeReclamation({
        ...selectedRec,
        status: nextStatus,
        adminReply:
          isAdmin && replyText.trim()
            ? replyText.trim()
            : selectedRec.adminReply,
        repliedAt: isAdmin && replyText.trim() ? nowIso : selectedRec.repliedAt,
        repliedBy: isAdmin
          ? currentUser?.fullName || "Admin"
          : selectedRec.repliedBy,
        replies: updatedReplies,
        updatedDate: nowIso,
      });

      const nextList = reclamations.map((r) =>
        r.id === selectedRec.id ? updatedRec : r
      );
      persistReclamations(nextList);
      setSelectedRec(updatedRec);
      setReplyText("");
      Swal.fire({
        position: "top-end",
        icon: "success",
        title: isAdmin
          ? "Réponse envoyée à la boutique !"
          : "Message ajouté à la réclamation !",
        showConfirmButton: false,
        timer: 1600,
      });
    };

    APi.createAPIEndpoint(`${APi.ENDPOINTS.Reclamation}/reply`)
      .customPost(replyPayload)
      .then((res) => finalizeReplyUpdate(res.data))
      .catch(() => finalizeReplyUpdate());
  };

  // Delete Reclamation
  const handleDelete = (rec, e) => {
    if (e) e.stopPropagation();
    Swal.fire({
      title: "Supprimer cette réclamation ?",
      text: `Objet : "${rec.subject}"`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    }).then((res) => {
      if (res.isConfirmed) {
        APi.createAPIEndpoint(APi.ENDPOINTS.Reclamation)
          .delete(rec.id)
          .then(() => {
            persistReclamations(reclamations.filter((r) => r.id !== rec.id));
            if (selectedRec?.id === rec.id) setSelectedRec(null);
            Swal.fire("Supprimée", "La réclamation a été supprimée.", "success");
          })
          .catch(() => {
            persistReclamations(reclamations.filter((r) => r.id !== rec.id));
            if (selectedRec?.id === rec.id) setSelectedRec(null);
            Swal.fire("Supprimée", "La réclamation a été retirée.", "success");
          });
      }
    });
  };

  // Filter Reclamations for current role
  const roleScopedReclamations = reclamations.filter((r) => {
    if (isB2B && activeStoreId) {
      return Number(r.storeId || r.eStoreId) === Number(activeStoreId);
    }
    if (isAdmin && storeFilter) {
      return Number(r.storeId || r.eStoreId) === Number(storeFilter);
    }
    return true;
  });

  const filteredReclamations = roleScopedReclamations.filter((r) => {
    if (statusFilter && Number(r.status) !== Number(statusFilter)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const subj = (r.subject || "").toLowerCase();
    const msg = (r.message || "").toLowerCase();
    const code = (r.deliveryCode || "").toLowerCase();
    const sName = (r.storeName || "").toLowerCase();
    const cat = (r.category || "").toLowerCase();
    return (
      subj.includes(q) ||
      msg.includes(q) ||
      code.includes(q) ||
      sName.includes(q) ||
      cat.includes(q)
    );
  });

  // KPIs
  const totalCount = roleScopedReclamations.length;
  const pendingCount = roleScopedReclamations.filter((r) => Number(r.status) === 1).length;
  const inProgressCount = roleScopedReclamations.filter((r) => Number(r.status) === 2).length;
  const resolvedCount = roleScopedReclamations.filter(
    (r) => Number(r.status) === 3 || Number(r.status) === 4
  ).length;

  return (
    <div style={{ padding: "16px", maxWidth: "1450px", margin: "0 auto" }}>
      {/* Top Header Banner */}
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
              background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
            }}
          >
            <FaCommentDots />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                {isB2B
                  ? "Mes Réclamations & Support Boutique"
                  : "Gestion des Réclamations Boutiques"}
              </h2>
              <span
                style={{
                  background: isB2B ? "#2563eb" : "#7c3aed",
                  color: "#fff",
                  fontSize: "0.74rem",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontWeight: 700,
                }}
              >
                {isB2B ? "Espace Boutique Partenaire" : "Support & Réponses Admin"}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              {isB2B
                ? "Soumettez vos réclamations concernant vos colis ou encaissements et consultez les réponses de l'administration"
                : "Consultez les réclamations envoyées par les boutiques partenaires et répondez directement à chaque demande"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button
            onClick={() => history.push("/contacts")}
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.25)",
              fontWeight: 700,
              borderRadius: "10px",
              padding: "10px 16px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaAddressBook />
            {isAdmin ? "Gérer les Contacts Globaux" : "Contacts Utiles Support"}
          </Button>

          <Button
            appearance="primary"
            onClick={() => {
              setFormError("");
              setCreateModalOpen(true);
            }}
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
            <FaPlus /> Nouvelle Réclamation
          </Button>
        </div>
      </div>

      {/* Global Contacts Quick Bar for Stores */}
      {globalContacts.length > 0 && (
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "14px",
            padding: "14px 18px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "10px",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 800, fontSize: "0.86rem", color: "#0f172a" }}>
              <FaAddressBook style={{ color: "#2563eb" }} />
              <span>Contacts Directs Support & Administration :</span>
            </div>
            <button
              onClick={() => history.push("/contacts")}
              style={{
                background: "transparent",
                border: "none",
                color: "#2563eb",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              {isAdmin ? "Modifier les contacts →" : "Voir tous les contacts →"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {globalContacts.slice(0, 4).map((c, idx) => (
              <div
                key={c.id || idx}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "0.8rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, color: "#0f172a" }}>{c.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{c.department}</div>
                </div>
                <div style={{ display: "inline-flex", gap: "6px" }}>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone}`}
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaPhoneAlt size={10} /> {c.phone}
                    </a>
                  )}
                  {(c.whatsapp || c.phone) && (
                    <a
                      href={`https://wa.me/${(c.whatsapp || c.phone || "").replace(/[^0-9+]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#f0fdf4",
                        color: "#15803d",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaWhatsapp size={12} />
                    </a>
                  )}
                  {c.email && (
                    <a
                      href={`mailto:${c.email}`}
                      style={{
                        background: "#f5f3ff",
                        color: "#5b21b6",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <FaEnvelope size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
              TOTAL RÉCLAMATIONS
            </span>
            <FaCommentDots style={{ color: "#4f46e5" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#0f172a", marginTop: "6px" }}>
            {totalCount}
          </div>
          <small style={{ color: "#64748b", fontSize: "0.74rem" }}>
            Tickets enregistrés
          </small>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #fde68a",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#b45309" }}>
              EN ATTENTE DE RÉPONSE
            </span>
            <FaClock style={{ color: "#d97706" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#b45309", marginTop: "6px" }}>
            {pendingCount}
          </div>
          <small style={{ color: "#b45309", fontSize: "0.74rem", fontWeight: 600 }}>
            À traiter en priorité
          </small>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #c7d2fe",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3730a3" }}>
              EN COURS DE TRAITEMENT
            </span>
            <FaExclamationCircle style={{ color: "#4f46e5" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#3730a3", marginTop: "6px" }}>
            {inProgressCount}
          </div>
          <small style={{ color: "#4338ca", fontSize: "0.74rem" }}>
            Pris en charge par le support
          </small>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #bbf7d0",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#15803d" }}>
              RÉPONDUES & RÉSOLUES
            </span>
            <FaCheckCircle style={{ color: "#16a34a" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#15803d", marginTop: "6px" }}>
            {resolvedCount}
          </div>
          <small style={{ color: "#15803d", fontSize: "0.74rem", fontWeight: 600 }}>
            Réponse transmise à la boutique
          </small>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "14px 18px",
          marginBottom: "18px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", flex: 1 }}>
          <div style={{ position: "relative", minWidth: "200px", flex: "1 1 220px" }}>
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
              placeholder="Rechercher par sujet, code colis, catégorie, boutique..."
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              style={{ paddingLeft: "34px", borderRadius: "8px" }}
            />
          </div>

          {isAdmin && (
            <SelectPicker
              data={[{ label: "Toutes les Boutiques", value: 0 }].concat(
                storesList.map((s) => ({
                  label: s.name_fr || s.name || `Boutique #${s.id}`,
                  value: s.id,
                }))
              )}
              value={storeFilter}
              onChange={(val) => setStoreFilter(val || 0)}
              cleanable={false}
              style={{ width: "220px", maxWidth: "100%", flex: "1 1 180px" }}
            />
          )}

          <SelectPicker
            data={[
              { label: "Tous les statuts", value: 0 },
              ...RECLAMATION_STATUSES.map((st) => ({
                label: st.label,
                value: st.value,
              })),
            ]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val || 0)}
            cleanable={false}
            searchable={false}
            style={{ width: "200px", maxWidth: "100%", flex: "1 1 160px" }}
          />
        </div>
      </div>

      {/* Reclamations Table / List */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        {loading ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <Loader size="md" content="Chargement des réclamations..." />
          </div>
        ) : filteredReclamations.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "#64748b" }}>
            <FaCommentDots size={38} style={{ color: "#cbd5e1", marginBottom: "10px" }} />
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#334155" }}>
              Aucune réclamation trouvée
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem" }}>
              {isB2B
                ? "Cliquez sur « Nouvelle Réclamation » pour contacter l'administration."
                : "Aucune réclamation boutique ne correspond aux critères sélectionnés."}
            </p>
          </div>
        ) : (
          <div id="custom-table-container" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
            <table
              className="tawsil-data-table"
              style={{
                width: "max-content",
                minWidth: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "175px" }}>
                    DATE & BOUTIQUE
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "165px" }}>
                    CATÉGORIE & COLIS LIÉ
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "240px" }}>
                    SUJET & MESSAGE
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "220px" }}>
                    RÉPONSE ADMIN
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "155px" }}>
                    STATUT
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.78rem", fontWeight: 800, color: "#475569", textAlign: "right", whiteSpace: "nowrap", minWidth: "150px" }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReclamations.map((rec, idx) => {
                  const st =
                    RECLAMATION_STATUSES.find((s) => s.value === Number(rec.status)) ||
                    RECLAMATION_STATUSES[0];
                  const hasReply = Boolean(rec.adminReply?.trim());

                  return (
                    <tr
                      key={rec.id || idx}
                      onClick={() => openReclamationModal(rec)}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                      }}
                    >
                      {/* Date & Store */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, color: "#0f172a", fontSize: "0.86rem" }}>
                          <FaStore style={{ color: "#2563eb" }} size={12} />
                          <span>{rec.storeName || `Boutique #${rec.storeId || 1}`}</span>
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                          {rec.createdDate
                            ? moment(rec.createdDate).format("DD/MM/YYYY à HH:mm")
                            : "Aujourd'hui"}
                        </div>
                      </td>

                      {/* Category & Linked Delivery */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              width: "fit-content",
                            }}
                          >
                            {rec.category || "Réclamation"}
                          </span>
                          {rec.deliveryCode && (
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#334155",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <FaBoxOpen size={11} style={{ color: "#4f46e5" }} />
                              Colis: {rec.deliveryCode}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Subject & Message */}
                      <td style={{ padding: "14px 16px", maxWidth: "320px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.88rem" }}>
                            {rec.subject}
                          </span>
                          {rec.priority === "Urgente" && (
                            <span
                              style={{
                                background: "#fee2e2",
                                color: "#dc2626",
                                fontSize: "0.66rem",
                                fontWeight: 800,
                                padding: "1px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              URGENT
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "0.78rem",
                            color: "#475569",
                            marginTop: "3px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {rec.message}
                        </div>
                      </td>

                      {/* Admin Reply Preview */}
                      <td style={{ padding: "14px 16px", maxWidth: "280px" }}>
                        {hasReply ? (
                          <div
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: "8px",
                              padding: "6px 10px",
                              fontSize: "0.78rem",
                              color: "#166534",
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: "0.7rem", marginBottom: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FaUserShield size={10} /> Réponse Admin :
                            </div>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rec.adminReply}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.76rem", color: "#94a3b8", fontStyle: "italic" }}>
                            En attente de réponse...
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            background: st.bg,
                            color: st.color,
                            border: `1px solid ${st.border}`,
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            display: "inline-block",
                          }}
                        >
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div
                          style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openReclamationModal(rec)}
                            style={{
                              background: isAdmin ? "#4f46e5" : "#eff6ff",
                              color: isAdmin ? "#ffffff" : "#1d4ed8",
                              border: isAdmin ? "none" : "1px solid #bfdbfe",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            <FaReply size={11} />
                            {isAdmin ? "Répondre" : "Consulter"}
                          </button>

                          <button
                            onClick={(e) => handleDelete(rec, e)}
                            style={{
                              background: "#fef2f2",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              borderRadius: "8px",
                              padding: "6px 8px",
                              cursor: "pointer",
                            }}
                            title="Supprimer"
                          >
                            <FaTrash size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: CREATE NEW RECLAMATION */}
      <Modal
        size="md"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      >
        <Modal.Header>
          <Modal.Title style={{ fontWeight: 800 }}>
            Nouvelle Réclamation Boutique
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {isAdmin && (
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Boutique Concernée * :
                </label>
                <SelectPicker
                  data={storesList.map((s) => ({
                    label: s.name_fr || s.name || `Boutique #${s.id}`,
                    value: s.id,
                  }))}
                  block
                  value={newRec.storeId}
                  onChange={(val) => setNewRec((prev) => ({ ...prev, storeId: val }))}
                />
              </div>
            )}

            <div className="responsive-grid-2">
              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Catégorie de Réclamation * :
                </label>
                <SelectPicker
                  data={RECLAMATION_CATEGORIES}
                  block
                  cleanable={false}
                  searchable={false}
                  value={newRec.category}
                  onChange={(val) => setNewRec((prev) => ({ ...prev, category: val }))}
                />
              </div>

              <div>
                <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                  Priorité :
                </label>
                <SelectPicker
                  data={RECLAMATION_PRIORITIES}
                  block
                  cleanable={false}
                  searchable={false}
                  value={newRec.priority}
                  onChange={(val) => setNewRec((prev) => ({ ...prev, priority: val }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                Colis / Livraison Concerné(e) (Optionnel) :
              </label>
              <SelectPicker
                data={[{ label: "— Réclamation générale (Aucun colis spécifique) —", value: null }].concat(
                  deliveries.map((d) => ({
                    label: `#${d.qrCodeContent || d.id} — ${d.customer?.fullName || "Client"} (${d.customer?.phoneNumber || "—"})`,
                    value: d.id,
                  }))
                )}
                block
                searchable={true}
                placeholder="Sélectionner un colis..."
                value={newRec.deliveryId}
                onChange={(val) => setNewRec((prev) => ({ ...prev, deliveryId: val }))}
              />
            </div>

            <div>
              <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                Objet / Sujet de la Réclamation * :
              </label>
              <Input
                placeholder="Ex: Retard de livraison sur le colis #1045, Changement de numéro client..."
                value={newRec.subject}
                onChange={(val) => setNewRec((prev) => ({ ...prev, subject: val }))}
              />
            </div>

            <div>
              <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "block" }}>
                Description Détaillée * :
              </label>
              <Input
                as="textarea"
                rows={4}
                placeholder="Décrivez précisément votre demande ou le problème rencontré..."
                value={newRec.message}
                onChange={(val) => setNewRec((prev) => ({ ...prev, message: val }))}
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
          <Button onClick={() => setCreateModalOpen(false)} appearance="subtle">
            Annuler
          </Button>
          <Button
            onClick={handleCreateReclamation}
            appearance="primary"
            style={{ background: "#4f46e5", fontWeight: 700 }}
          >
            <FaPaperPlane style={{ marginRight: 6 }} /> Envoyer la Réclamation
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL 2: VIEW & REPLY TO RECLAMATION */}
      <Modal
        size="md"
        open={Boolean(selectedRec)}
        onClose={() => setSelectedRec(null)}
      >
        <Modal.Header>
          <Modal.Title style={{ fontWeight: 800 }}>
            Détails & Suivi de la Réclamation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRec && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Header Info Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", flexWrap: "wrap" }}>
                  <div>
                    <span
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      {selectedRec.category}
                    </span>
                    <h4 style={{ margin: "6px 0 4px", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                      {selectedRec.subject}
                    </h4>
                    <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      Boutique : <strong style={{ color: "#1e293b" }}>{selectedRec.storeName}</strong> ·{" "}
                      {selectedRec.createdDate
                        ? moment(selectedRec.createdDate).format("DD/MM/YYYY HH:mm")
                        : ""}
                    </div>
                  </div>

                  {selectedRec.deliveryCode && (
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <div style={{ fontWeight: 800, color: "#4f46e5", fontFamily: "monospace" }}>
                        Colis {selectedRec.deliveryCode}
                      </div>
                      {selectedRec.customerName && (
                        <div style={{ fontSize: "0.72rem", color: "#475569" }}>
                          {selectedRec.customerName} {selectedRec.customerPhone ? `(${selectedRec.customerPhone})` : ""}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Conversation Thread */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "280px",
                  overflowY: "auto",
                  padding: "4px",
                }}
              >
                {[
                  {
                    id: "initial-msg",
                    senderRole: "store",
                    senderName:
                      selectedRec.store?.name_fr ||
                      selectedRec.storeName ||
                      "Boutique",
                    text: selectedRec.message,
                    date: selectedRec.createdDate,
                  },
                  ...(Array.isArray(selectedRec.replies)
                    ? selectedRec.replies
                        .filter((r) => (r.message || r.text) !== selectedRec.message)
                        .map((r, rIdx) => {
                          const isReplyFromStore =
                            r.senderRole === "store" ||
                            (r.user?.position &&
                              r.user.position.toLowerCase().includes("b2b"));
                          return {
                            id: r.id || rIdx + 1,
                            senderRole: isReplyFromStore ? "store" : "admin",
                            senderName:
                              r.senderName ||
                              r.user?.fullName ||
                              r.user?.userName ||
                              (isReplyFromStore ? "Boutique" : "Administration"),
                            text: r.message || r.text || "",
                            date: r.date || r.createdDate,
                          };
                        })
                    : []),
                ].map((msg, mIdx) => {
                  const fromAdmin = msg.senderRole === "admin";
                  return (
                    <div
                      key={msg.id || mIdx}
                      style={{
                        alignSelf: fromAdmin ? "flex-end" : "flex-start",
                        maxWidth: "88%",
                        background: fromAdmin ? "#f0fdf4" : "#eff6ff",
                        border: fromAdmin ? "1px solid #bbf7d0" : "1px solid #bfdbfe",
                        borderRadius: "12px",
                        padding: "10px 14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          marginBottom: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          color: fromAdmin ? "#166534" : "#1e40af",
                        }}
                      >
                        <span>
                          {fromAdmin ? `🛡️ ${msg.senderName || "Administration"}` : `🏪 ${msg.senderName || "Boutique"}`}
                        </span>
                        <span style={{ fontWeight: 500, opacity: 0.75 }}>
                          {msg.date ? moment(msg.date).format("DD/MM HH:mm") : ""}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#0f172a", whiteSpace: "pre-wrap" }}>
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Input Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {isAdmin && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155" }}>
                      Mettre à jour le statut :
                    </label>
                    <SelectPicker
                      data={RECLAMATION_STATUSES.map((st) => ({
                        label: st.label,
                        value: st.value,
                      }))}
                      cleanable={false}
                      searchable={false}
                      value={replyStatus}
                      onChange={(val) => setReplyStatus(val)}
                      style={{ width: "220px", maxWidth: "100%", flex: "1 1 180px" }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 800, color: "#334155", marginBottom: "4px", display: "block" }}>
                    {isAdmin
                      ? "Réponse de l'Administration à la Boutique :"
                      : "Ajouter un message / précision :"}
                  </label>
                  <Input
                    as="textarea"
                    rows={3}
                    placeholder={
                      isAdmin
                        ? "Saisissez votre réponse pour la boutique partenaire..."
                        : "Ajouter un complément d'information..."
                    }
                    value={replyText}
                    onChange={(val) => setReplyText(val)}
                  />
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setSelectedRec(null)} appearance="subtle">
            Fermer
          </Button>
          <Button
            onClick={handleSendReply}
            loading={submittingReply}
            appearance="primary"
            style={{ background: "#059669", fontWeight: 700 }}
          >
            <FaReply style={{ marginRight: 6 }} />
            {isAdmin ? "Envoyer la Réponse" : "Envoyer le Message"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
