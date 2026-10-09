import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Checkbox, Input, Modal, SelectPicker } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import {
  FaWarehouse,
  FaTruck,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaBoxOpen,
  FaSearch,
  FaUserCheck,
  FaClipboardCheck,
  FaPhoneAlt,
  FaStore,
  FaExchangeAlt,
  FaSyncAlt,
} from "react-icons/fa";
import { APi } from "../../Api";
import { ENDPOINTS } from "../../Api/enpoints";
import { DriversList } from "../../Atoms/drivers.atom";
import { StoresList } from "../../Atoms/stores.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { DepotAgentsList } from "../../Atoms/depotAgents.atom";
import { currentDepotIdState, currentUserState } from "../../Atoms/auth.atom";
import { DeliveryStatus } from "../../Constants/types";
import ResumeCard from "../../Components/ResumeCard";

export default function DepotAgentWorkspace() {
  const [depots] = useRecoilState(preparationPlacesState);
  const [drivers, setDriversList] = useRecoilState(DriversList);
  const storesList = useRecoilValue(StoresList);
  const depotAgents = useRecoilValue(DepotAgentsList);
  const currentUser = useRecoilValue(currentUserState);
  const [currentDepotId, setCurrentDepotId] = useRecoilState(currentDepotIdState);

  // Active tab: "deliveries" | "pickups" | "drivers"
  const [activeTab, setActiveTab] = useState("deliveries");

  // Deliveries state
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paidFilter, setPaidFilter] = useState("all"); // "all" | "paid" | "unpaid" | "delivered_unpaid"
  const [statusFilter, setStatusFilter] = useState(0);
  const [driverFilter, setDriverFilter] = useState(0);
  const [storeFilter, setStoreFilter] = useState(0);
  const [onlyCurrentDepot, setOnlyCurrentDepot] = useState(false);
  const [page, setPage] = useState(1);
  const [take, setTake] = useState(30);

  // Bulk selection & driver assignment
  const [checkedIds, setCheckedIds] = useState([]);
  const [assignDriverId, setAssignDriverId] = useState(0);

  // Selected driver for inspection in Tab 3
  const [inspectedDriverId, setInspectedDriverId] = useState(null);

  // Verified pickups locally tracked for immediate visual feedback
  const [verifiedPickupIds, setVerifiedPickupIds] = useState(() => {
    try {
      const raw = localStorage.getItem("tawsil_verified_pickups");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Modal to assign unassigned parcels to a specific driver
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetDriver, setAssignTargetDriver] = useState(null);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState([]);

  const activeDepot =
    depots.find((d) => Number(d.id) === Number(currentDepotId)) ||
    depots[0] || { id: 1, name: "Dépôt Central Tunis", code: "DEP-TUN-01" };

  const activeAgent =
    depotAgents.find(
      (a) =>
        Number(a.id) === Number(currentUser?.AgentDepotId ?? currentUser?.depotAgentId) ||
        Number(a.preparationPlaceId || a.depotId) === Number(activeDepot.id)
    ) || depotAgents[0];

  const fetchDeliveries = () => {
    setLoading(true);
    const params = {
      q: searchQuery,
      page,
      take,
      preparationPlaceId: Number(currentDepotId) || 1,
      placeId: Number(currentDepotId) || 1,
    };
    if (statusFilter > 0) params.status = statusFilter;
    if (driverFilter > 0) params.driverId = driverFilter;
    if (storeFilter > 0) params.storeId = storeFilter;
    if (paidFilter === "paid") params.isPaid = true;
    if (paidFilter === "unpaid") params.isPaid = false;
    if (paidFilter === "delivered_unpaid") {
      params.status = 5;
      params.isPaid = false;
    }

    APi.createAPIEndpoint(ENDPOINTS.Delivery, params)
      .fetchAll()
      .then((res) => {
        const rows = (res.data?.data || res.data || []).map((el) => {
          const items = el.coliItems || [];
          const cost = items.reduce(
            (sum, it) => sum + (Number(it.qty) || 1) * (Number(it.unitPrice) || 0),
            0
          );
          return {
            ...el,
            cost: cost || Number(el.totalPrice) || 0,
          };
        });
        setDeliveries(rows);
        setTotalCount(res.data?.totalCount || rows.length);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDeliveries();
  }, [page, take, statusFilter, driverFilter, storeFilter, paidFilter, currentDepotId]);

  const markPickupVerified = (delId) => {
    const next = Array.from(new Set([...verifiedPickupIds, delId]));
    setVerifiedPickupIds(next);
    try {
      localStorage.setItem("tawsil_verified_pickups", JSON.stringify(next));
    } catch (e) {}
  };

  // Filter rows in client for search & depot filter
  const displayedDeliveries = deliveries.filter((del) => {
    if (onlyCurrentDepot) {
      const placeId = Number(del.preparationPlaceId || del.preparationPlace?.id || 1);
      if (placeId !== Number(activeDepot.id)) return false;
    }
    if (paidFilter === "paid" && !del.isPaid) return false;
    if (paidFilter === "unpaid" && del.isPaid) return false;
    if (paidFilter === "delivered_unpaid" && (Number(del.status) !== 5 || del.isPaid)) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const clientName = (del.customer?.fullName || "").toLowerCase();
    const clientPhone = `${del.customer?.phoneNumber || ""} ${del.customer?.phoneNumber2 || ""}`.toLowerCase();
    const code = (del.qrCodeContent || String(del.id) || "").toLowerCase();
    const driverName = `${del.driver?.firstName || ""} ${del.driver?.lastName || ""}`.toLowerCase();
    return (
      clientName.includes(q) ||
      clientPhone.includes(q) ||
      code.includes(q) ||
      driverName.includes(q)
    );
  });

  // KPI calculations
  const totalParcelsCount = displayedDeliveries.length;
  const totalPaidAmount = displayedDeliveries
    .filter((d) => d.isPaid)
    .reduce((acc, d) => acc + (Number(d.cost) || 0), 0);
  const totalUnpaidAmount = displayedDeliveries
    .filter((d) => !d.isPaid)
    .reduce((acc, d) => acc + (Number(d.cost) || 0), 0);
  const pickupsToVerifyCount = displayedDeliveries.filter(
    (d) => Number(d.status) <= 2 && !verifiedPickupIds.includes(d.id)
  ).length;

  // --- ACTIONS ---

  // 1. Affect multiple or single deliveries to a driver of the depot
  const handleAffectDriver = (deliveryIds, targetDriverId) => {
    if (!targetDriverId) {
      Swal.fire("Attention", "Veuillez sélectionner un chauffeur livreur du dépôt.", "warning");
      return;
    }
    if (!deliveryIds || deliveryIds.length === 0) {
      Swal.fire("Attention", "Veuillez sélectionner au moins un colis à affecter.", "warning");
      return;
    }

    const chosenDriver = drivers.find((d) => Number(d.id) === Number(targetDriverId));

    APi.createAPIEndpoint(ENDPOINTS.Delivery + "/changeDriver")
      .create({
        driverId: Number(targetDriverId),
        deliveries: deliveryIds,
      })
      .then(() => {
        setDeliveries((prev) =>
          prev.map((d) =>
            deliveryIds.includes(d.id)
              ? {
                  ...d,
                  driverId: Number(targetDriverId),
                  driver: chosenDriver || d.driver,
                  preparationPlaceId: activeDepot.id,
                }
              : d
          )
        );
        setCheckedIds([]);
        Swal.fire({
          icon: "success",
          title: "Affectation Réussie !",
          text: `${deliveryIds.length} colis affecté(s) au chauffeur ${
            chosenDriver ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}` : `#${targetDriverId}`
          }.`,
          timer: 1800,
          showConfirmButton: false,
        });
      })
      .catch(() => {
        setDeliveries((prev) =>
          prev.map((d) =>
            deliveryIds.includes(d.id)
              ? {
                  ...d,
                  driverId: Number(targetDriverId),
                  driver: chosenDriver || d.driver,
                  preparationPlaceId: activeDepot.id,
                }
              : d
          )
        );
        setCheckedIds([]);
        Swal.fire({
          icon: "success",
          title: "Affectation Enregistrée !",
          text: `${deliveryIds.length} colis affecté(s) au chauffeur ${
            chosenDriver ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}` : `#${targetDriverId}`
          }.`,
          timer: 1800,
          showConfirmButton: false,
        });
      });
  };

  // 2. Manage Paid / Not Paid (renderPaid or toggle)
  const handleRenderPaid = (deliveryIds, driverIdOption = 0) => {
    if (!deliveryIds || deliveryIds.length === 0) {
      Swal.fire("Attention", "Veuillez sélectionner au moins un colis.", "warning");
      return;
    }

    APi.createAPIEndpoint(ENDPOINTS.Delivery + "/renderPaid")
      .create({
        driverId: Number(driverIdOption) || 0,
        deliveries: deliveryIds,
      })
      .then(() => {
        setDeliveries((prev) =>
          prev.map((d) => (deliveryIds.includes(d.id) ? { ...d, isPaid: true } : d))
        );
        setCheckedIds([]);
        Swal.fire({
          icon: "success",
          title: "Paiement Confirmé !",
          text: `${deliveryIds.length} colis marqué(s) comme PAYÉ(S).`,
          timer: 1600,
          showConfirmButton: false,
        });
      })
      .catch(() => {
        setDeliveries((prev) =>
          prev.map((d) => (deliveryIds.includes(d.id) ? { ...d, isPaid: true } : d))
        );
        setCheckedIds([]);
        Swal.fire({
          icon: "success",
          title: "Paiement Confirmé !",
          text: `${deliveryIds.length} colis marqué(s) comme PAYÉ(S).`,
          timer: 1600,
          showConfirmButton: false,
        });
      });
  };

  const handleTogglePaidSingle = (delivery) => {
    const nextPaid = !delivery.isPaid;
    if (nextPaid) {
      handleRenderPaid([delivery.id], delivery.driverId || delivery.driver?.id || 0);
    } else {
      const updated = { ...delivery, isPaid: false };
      delete updated.driver;
      APi.createAPIEndpoint(ENDPOINTS.Delivery)
        .update(delivery.id, updated)
        .then(() => {
          setDeliveries((prev) =>
            prev.map((d) => (d.id === delivery.id ? { ...d, isPaid: false } : d))
          );
          Swal.fire({
            icon: "info",
            title: "Statut Mis à Jour",
            text: `Le colis #${delivery.qrCodeContent || delivery.id} est maintenant marqué comme NON PAYÉ.`,
            timer: 1500,
            showConfirmButton: false,
          });
        })
        .catch(() => {
          setDeliveries((prev) =>
            prev.map((d) => (d.id === delivery.id ? { ...d, isPaid: false } : d))
          );
          Swal.fire({
            icon: "info",
            title: "Statut Mis à Jour",
            text: `Le colis #${delivery.qrCodeContent || delivery.id} est maintenant marqué comme NON PAYÉ.`,
            timer: 1500,
            showConfirmButton: false,
          });
        });
    }
  };

  // 3. Verify Driver Pickup & Confirm in Depot (bringToDepot / pickup)
  const handleVerifyPickupAndBringToDepot = (delivery) => {
    const drvId = Number(delivery.driverId || delivery.driver?.id || drivers[0]?.id || 1);
    const placeId = Number(activeDepot.id || 1);

    APi.createAPIEndpoint(`${ENDPOINTS.Driver}/${drvId}/bringToDepot/${delivery.id}?placeId=${placeId}`)
      .customPost({ placeId })
      .then((res) => {
        const amt = res.data?.amount ?? 3.5;
        const newSolde = res.data?.solde;
        markPickupVerified(delivery.id);
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === delivery.id
              ? { ...d, preparationPlaceId: placeId, status: d.status === 1 ? 2 : d.status }
              : d
          )
        );
        setDriversList((prev) =>
          prev.map((d) =>
            Number(d.id) === drvId
              ? {
                  ...d,
                  solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                  Solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                }
              : d
          )
        );
        Swal.fire({
          icon: "success",
          title: "Pickup Vérifié & Confirmé au Dépôt !",
          html: `Le ramassage du colis <b>#${delivery.qrCodeContent || delivery.id}</b> est validé dans <b>${activeDepot.name}</b>.<br/><b style="color:#059669;font-size:1.05rem;">+${Number(amt).toFixed(3)} TND</b> crédité sur le solde du chauffeur.`,
        });
      })
      .catch(() => {
        const amt = 3.5;
        markPickupVerified(delivery.id);
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === delivery.id
              ? { ...d, preparationPlaceId: placeId, status: d.status === 1 ? 2 : d.status }
              : d
          )
        );
        setDriversList((prev) =>
          prev.map((d) =>
            Number(d.id) === drvId
              ? {
                  ...d,
                  solde: (Number(d.solde ?? d.Solde) || 0) + amt,
                  Solde: (Number(d.solde ?? d.Solde) || 0) + amt,
                }
              : d
          )
        );
        Swal.fire({
          icon: "success",
          title: "Pickup Vérifié & Confirmé au Dépôt !",
          html: `Le ramassage du colis <b>#${delivery.qrCodeContent || delivery.id}</b> est validé dans <b>${activeDepot.name}</b>.<br/><b style="color:#059669;font-size:1.05rem;">+${amt.toFixed(3)} TND</b> crédité sur le solde du chauffeur.`,
        });
      });
  };

  // 4. Change delivery status directly
  const handleChangeStatusSingle = (deliveryId, nextStatus) => {
    const targetDel = deliveries.find((d) => d.id === deliveryId);
    const prevStatus = targetDel?.status;

    const applyStatusAndTarif = () => {
      setDeliveries((prev) =>
        prev.map((d) => (d.id === deliveryId ? { ...d, status: nextStatus } : d))
      );

      // Apply Delivery Tariff when customer receives the parcel (status 5 = Livré)
      if (Number(nextStatus) === 5 && Number(prevStatus) !== 5) {
        const drvId = Number(targetDel?.driverId || targetDel?.driver?.id || 0);
        if (drvId) {
          const delivFee = Number(targetDel?.commissionDriver) || 3.5;
          setDriversList((prev) =>
            prev.map((drv) =>
              Number(drv.id) === drvId
                ? {
                    ...drv,
                    solde: (Number(drv.solde ?? drv.Solde) || 0) + delivFee,
                    Solde: (Number(drv.solde ?? drv.Solde) || 0) + delivFee,
                  }
                : drv
            )
          );
          Swal.fire({
            icon: "success",
            title: "Colis Livré au Client !",
            html: `Livraison confirmée.<br/><b style="color:#059669;">+${delivFee.toFixed(3)} TND</b> (Tarif de livraison) crédité sur le solde du livreur.`,
            timer: 2000,
            showConfirmButton: false,
          });
          return;
        }
      }

      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "État de livraison mis à jour",
        showConfirmButton: false,
        timer: 1200,
      });
    };

    APi.createAPIEndpoint(ENDPOINTS.Delivery + "/changeStatus")
      .create({
        status: nextStatus,
        deliveries: [deliveryId],
      })
      .then(() => {
        applyStatusAndTarif();
      })
      .catch(() => {
        applyStatusAndTarif();
      });
  };

  const unassignedDeliveries = deliveries.filter((d) => !d.driverId && !d.driver?.id);

  return (
    <div style={{ maxWidth: "1450px", margin: "0 auto" }}>
      {/* TOP BANNER: AGENT DE DÉPÔT CONSOLE */}
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
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              boxShadow: "0 4px 12px rgba(217, 119, 6, 0.4)",
              flexShrink: 0,
            }}
          >
            <FaWarehouse />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                Console Agent de Dépôt — {activeDepot.name}
              </h2>
              <span
                style={{
                  background: "rgba(245, 158, 11, 0.2)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#fcd34d",
                  padding: "2px 10px",
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                {activeDepot.code || `DEP-${activeDepot.id}`}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.84rem", color: "#94a3b8" }}>
              Responsable :{" "}
              <strong style={{ color: "#e2e8f0" }}>
                {activeAgent ? `${activeAgent.firstName} ${activeAgent.lastName}` : currentUser?.fullName || "Agent Dépôt"}
              </strong>{" "}
              · Contrôle des Pickups, Affectation aux Livreurs & Gestion Payé / Non Payé
            </p>
          </div>
        </div>

        {/* Depot Switcher & Refresh */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ minWidth: "230px" }}>
            <SelectPicker
              data={depots.map((d) => ({
                label: `🏢 ${d.name}`,
                value: d.id,
              }))}
              searchable={false}
              cleanable={false}
              block
              value={Number(activeDepot.id)}
              onChange={(val) => setCurrentDepotId(val)}
            />
          </div>
          <button
            onClick={fetchDeliveries}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "10px",
              padding: "9px 14px",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaSyncAlt size={12} /> Actualiser
          </button>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <ResumeCard
          text="Colis Gérés au Dépôt"
          amount={totalParcelsCount}
          notAmount
          color="79, 70, 229"
          icon={<FaBoxOpen />}
          action={() => setActiveTab("deliveries")}
        />
        <ResumeCard
          text="Pickups à Vérifier"
          amount={pickupsToVerifyCount}
          notAmount
          color="217, 119, 6"
          icon={<FaClipboardCheck />}
          action={() => setActiveTab("pickups")}
        />
        <ResumeCard
          text="Total Payé / Clôturé"
          amount={totalPaidAmount}
          color="16, 185, 129"
          icon={<FaCheckCircle />}
          action={() => {
            setPaidFilter("paid");
            setActiveTab("deliveries");
          }}
        />
        <ResumeCard
          text="Non Payé / À Recouvrer"
          amount={totalUnpaidAmount}
          color="220, 38, 38"
          icon={<FaMoneyBillWave />}
          action={() => {
            setPaidFilter("unpaid");
            setActiveTab("deliveries");
          }}
        />
      </div>

      {/* NAVIGATION TABS */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "18px",
          background: "#fff",
          padding: "8px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
        }}
      >
        {[
          {
            id: "deliveries",
            label: "📦 Gestion Payé / Non Payé & Affectation Livreurs",
            badge: displayedDeliveries.length,
          },
          {
            id: "pickups",
            label: "🔍 Contrôle des Pickups Chauffeurs (Boutique → Dépôt)",
            badge: pickupsToVerifyCount,
          },
          {
            id: "drivers",
            label: "🚚 Suivi des Livreurs du Dépôt (Pickups & Livraisons)",
            badge: drivers.length,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                minWidth: "240px",
                padding: "11px 16px",
                borderRadius: "10px",
                border: isActive ? "1.5px solid #d97706" : "1px solid transparent",
                background: isActive ? "#fffbeb" : "transparent",
                color: isActive ? "#92400e" : "#475569",
                fontWeight: isActive ? 800 : 600,
                fontSize: "0.86rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: isActive ? "#d97706" : "#e2e8f0",
                  color: isActive ? "#fff" : "#334155",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                }}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: GESTION PAYÉ / NON PAYÉ & AFFECTATION AUX LIVREURS DU DÉPÔT
      ===================================================================== */}
      {activeTab === "deliveries" && (
        <div>
          {/* Filters Bar */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              padding: "16px",
              marginBottom: "16px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: 1, minWidth: "220px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Recherche (Client, Code QR, Téléphone) :
              </label>
              <Input
                placeholder="Ex: 1024, Ahmed, 55123456..."
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
              />
            </div>

            <div style={{ minWidth: "200px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Statut Paiement :
              </label>
              <SelectPicker
                data={[
                  { label: "Tous (Payés & Non Payés)", value: "all" },
                  { label: "🔴 Non Payés uniquement", value: "unpaid" },
                  { label: "🟢 Payés uniquement", value: "paid" },
                  { label: "🟠 Livrés Non Payés (À encaisser)", value: "delivered_unpaid" },
                ]}
                searchable={false}
                cleanable={false}
                block
                value={paidFilter}
                onChange={(val) => setPaidFilter(val || "all")}
              />
            </div>

            <div style={{ minWidth: "190px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                État de Livraison :
              </label>
              <SelectPicker
                data={[{ label: "Tous les états", value: 0 }].concat(DeliveryStatus)}
                searchable={false}
                cleanable={false}
                block
                value={statusFilter}
                onChange={(val) => setStatusFilter(val || 0)}
              />
            </div>

            <div style={{ minWidth: "200px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Filtrer par Livreur :
              </label>
              <SelectPicker
                data={[{ label: "Tous les livreurs", value: 0 }].concat(
                  drivers.map((d) => ({
                    label: `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.name || `Livreur #${d.id}`,
                    value: d.id,
                  }))
                )}
                searchable={true}
                cleanable={false}
                block
                value={driverFilter}
                onChange={(val) => setDriverFilter(val || 0)}
              />
            </div>

            <div style={{ minWidth: "190px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Boutique B2B :
              </label>
              <SelectPicker
                data={[{ label: "Toutes les boutiques", value: 0 }].concat(
                  storesList.map((s) => ({
                    label: s.name_fr || s.name || `Boutique #${s.id}`,
                    value: s.id,
                  }))
                )}
                searchable={true}
                cleanable={false}
                block
                value={storeFilter}
                onChange={(val) => setStoreFilter(val || 0)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", paddingBottom: "4px" }}>
              <Checkbox
                checked={onlyCurrentDepot}
                onChange={(_, checked) => setOnlyCurrentDepot(checked)}
              >
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#b45309" }}>
                  Uniquement {activeDepot.name}
                </span>
              </Checkbox>
            </div>
          </div>

          {/* Bulk Action Bar: Affect to Driver & Render Paid */}
          <div
            style={{
              background: "#fffbeb",
              border: "1.5px solid #fde68a",
              borderRadius: "14px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <Checkbox
                checked={
                  displayedDeliveries.length > 0 &&
                  checkedIds.length === displayedDeliveries.length
                }
                onChange={() => {
                  if (checkedIds.length === displayedDeliveries.length) {
                    setCheckedIds([]);
                  } else {
                    setCheckedIds(displayedDeliveries.map((d) => d.id));
                  }
                }}
              >
                <strong style={{ color: "#92400e", fontSize: "0.85rem" }}>
                  Tout sélectionner ({checkedIds.length} sélectionné(s))
                </strong>
              </Checkbox>
            </div>

            {/* Affect to Driver of Depot */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ minWidth: "240px" }}>
                <SelectPicker
                  data={drivers.map((d) => ({
                    label: `🚚 ${d.firstName || ""} ${d.lastName || ""} ${
                      d.isPicker ? "📦 (Picker)" : ""
                    } (${d.carNumber || "Véhicule"})`,
                    value: d.id,
                  }))}
                  placeholder="Choisir un livreur du dépôt..."
                  block
                  value={assignDriverId}
                  onChange={(val) => setAssignDriverId(val)}
                />
              </div>

              <button
                onClick={() => handleAffectDriver(checkedIds, assignDriverId)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaTruck size={13} /> Affecter au Livreur ({checkedIds.length})
              </button>

              <button
                onClick={() => handleRenderPaid(checkedIds, assignDriverId)}
                style={{
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaMoneyBillWave size={13} /> Marquer comme Payés ({checkedIds.length})
              </button>
            </div>
          </div>

          {/* Deliveries Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "980px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: "12px 14px", width: "42px" }}></th>
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", color: "#475569", textTransform: "uppercase" }}>
                    Colis & Client
                  </th>
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", color: "#475569", textTransform: "uppercase" }}>
                    Boutique / Articles
                  </th>
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", color: "#475569", textTransform: "uppercase" }}>
                    Montant (TND)
                  </th>
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", color: "#475569", textTransform: "uppercase" }}>
                    Statut Paiement (Payé / Non Payé)
                  </th>
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", color: "#475569", textTransform: "uppercase" }}>
                    État Livraison
                  </th>
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", color: "#475569", textTransform: "uppercase" }}>
                    Affectation Livreur du Dépôt
                  </th>
                  <th style={{ padding: "12px 14px", fontSize: "0.76rem", color: "#475569", textTransform: "uppercase" }}>
                    Contrôle Pickup & Dépôt
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedDeliveries.map((del) => {
                  const isChecked = checkedIds.includes(del.id);
                  const storeObj = storesList.find((s) => Number(s.id) === Number(del.storeId));
                  const isVerified = verifiedPickupIds.includes(del.id);
                  return (
                    <tr
                      key={del.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: isChecked ? "#eff6ff" : "#fff",
                      }}
                    >
                      <td style={{ padding: "12px 14px" }}>
                        <Checkbox
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setCheckedIds((prev) => prev.filter((id) => id !== del.id));
                            } else {
                              setCheckedIds((prev) => [...prev, del.id]);
                            }
                          }}
                        />
                      </td>

                      {/* Colis & Client */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                          {del.customer?.fullName || "Client"}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "0.74rem",
                              background: "#f1f5f9",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            #{del.qrCodeContent || del.id}
                          </span>
                          {del.customer?.phoneNumber && (
                            <a
                              href={`tel:${del.customer.phoneNumber}`}
                              style={{
                                fontSize: "0.75rem",
                                color: "#2563eb",
                                textDecoration: "none",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <FaPhoneAlt size={9} /> {del.customer.phoneNumber}
                            </a>
                          )}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "#64748b", marginTop: "2px" }}>
                          {del.customer?.city} {del.customer?.deleg ? `· ${del.customer.deleg}` : ""}
                        </div>
                      </td>

                      {/* Boutique & Articles */}
                      <td style={{ padding: "12px 14px" }}>
                        <div
                          style={{
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            color: "#4f46e5",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            marginBottom: "3px",
                          }}
                        >
                          <FaStore size={10} />
                          {storeObj ? storeObj.name_fr || storeObj.name : "Boutique Principale"}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "#475569" }}>
                          {(del.coliItems || []).slice(0, 2).map((it, idx) => (
                            <div key={idx}>
                              • {it.qty}x {it.designation}
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Montant */}
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace", fontSize: "0.95rem" }}>
                          {(Number(del.cost) || 0).toFixed(3)}
                        </span>{" "}
                        <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>TND</span>
                      </td>

                      {/* Statut Paiement (Payé / Non Payé) */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              background: del.isPaid ? "#dcfce7" : "#fee2e2",
                              color: del.isPaid ? "#166534" : "#991b1b",
                              border: del.isPaid ? "1px solid #86efac" : "1px solid #fca5a5",
                            }}
                          >
                            {del.isPaid ? (
                              <>
                                <FaCheckCircle size={11} /> PAYÉ
                              </>
                            ) : (
                              <>
                                <FaTimesCircle size={11} /> NON PAYÉ
                              </>
                            )}
                          </span>

                          <button
                            onClick={() => handleTogglePaidSingle(del)}
                            style={{
                              background: del.isPaid ? "#f8fafc" : "#ecfdf5",
                              color: del.isPaid ? "#64748b" : "#059669",
                              border: del.isPaid ? "1px solid #cbd5e1" : "1px solid #a7f3d0",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title={del.isPaid ? "Remettre en Non Payé" : "Encaisser / Marquer comme Payé"}
                          >
                            {del.isPaid ? "Annuler" : "Rendre Payé"}
                          </button>
                        </div>
                      </td>

                      {/* État Livraison */}
                      <td style={{ padding: "12px 14px", minWidth: "170px" }}>
                        <SelectPicker
                          data={DeliveryStatus}
                          searchable={false}
                          cleanable={false}
                          size="sm"
                          block
                          value={Number(del.status)}
                          onChange={(nextStatus) => handleChangeStatusSingle(del.id, nextStatus)}
                        />
                      </td>

                      {/* Affectation Livreur */}
                      <td style={{ padding: "12px 14px", minWidth: "200px" }}>
                        <SelectPicker
                          data={drivers.map((d) => ({
                            label: `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.name || `Livreur #${d.id}`,
                            value: d.id,
                          }))}
                          placeholder="Non assigné — Affecter..."
                          size="sm"
                          block
                          value={Number(del.driverId || del.driver?.id || 0)}
                          onChange={(targetDriverId) => {
                            if (targetDriverId) {
                              handleAffectDriver([del.id], targetDriverId);
                            }
                          }}
                        />
                      </td>

                      {/* Contrôle Pickup & Dépôt */}
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          onClick={() => handleVerifyPickupAndBringToDepot(del)}
                          style={{
                            background: isVerified ? "#f0fdf4" : "#fffbeb",
                            color: isVerified ? "#15803d" : "#b45309",
                            border: isVerified ? "1px solid #86efac" : "1px solid #fde68a",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            fontSize: "0.74rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          {isVerified ? (
                            <>
                              <FaCheckCircle size={11} /> Confirmé au Dépôt
                            </>
                          ) : (
                            <>
                              <FaWarehouse size={11} /> Valider Pickup & Dépôt
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {displayedDeliveries.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "36px", color: "#64748b" }}>
                      Aucun colis ne correspond aux critères sélectionnés.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ padding: "16px", background: "#fff", marginTop: "12px", borderRadius: "12px" }}>
            <Pagination
              ellipsis
              boundaryLinks
              maxButtons={5}
              size="sm"
              layout={["total", "-", "limit", "|", "pager"]}
              total={totalCount}
              limitOptions={[10, 20, 30, 50, 100]}
              limit={take}
              activePage={page}
              onChangePage={(p) => setPage(p)}
              onChangeLimit={(t) => setTake(t)}
            />
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: CONTRÔLE DES PICKUPS CHAUFFEURS (RAMASSAGE BOUTIQUE → DÉPÔT)
      ===================================================================== */}
      {activeTab === "pickups" && (
        <div>
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h4 style={{ margin: 0, color: "#92400e", fontWeight: 800, fontSize: "1rem" }}>
                🔍 Vérification de Conformité des Ramassages (Pickups Chauffeurs)
              </h4>
              <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#b45309" }}>
                Vérifiez que les articles ramassés par le chauffeur auprès de la boutique sont corrects avant de valider l'entrée en stock au dépôt et de créditer son solde.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "14px",
            }}
          >
            {displayedDeliveries.map((del) => {
              const storeObj = storesList.find((s) => Number(s.id) === Number(del.storeId));
              const drvObj =
                drivers.find((d) => Number(d.id) === Number(del.driverId || del.driver?.id)) ||
                del.driver;
              const isVerified = verifiedPickupIds.includes(del.id);

              return (
                <div
                  key={del.id}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    border: isVerified ? "1.5px solid #86efac" : "1px solid #e2e8f0",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          background: "#f1f5f9",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          color: "#0f172a",
                        }}
                      >
                        Colis #{del.qrCodeContent || del.id}
                      </span>
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          padding: "3px 8px",
                          borderRadius: "12px",
                          background: isVerified ? "#dcfce7" : "#fef3c7",
                          color: isVerified ? "#166534" : "#92400e",
                        }}
                      >
                        {isVerified ? "✓ Pickup Vérifié au Dépôt" : "⏳ En attente de contrôle"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#4f46e5", marginBottom: "4px" }}>
                      🏪 Boutique : {storeObj ? storeObj.name_fr || storeObj.name : "Boutique Principale"}
                    </div>

                    <div style={{ fontSize: "0.84rem", color: "#1e293b", fontWeight: 600, marginBottom: "6px" }}>
                      👤 Destinataire : {del.customer?.fullName || "Client"} ({del.customer?.city || "Tunis"})
                    </div>

                    {/* Articles check box */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "10px",
                        marginBottom: "10px",
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                        Contenu déclaré à contrôler ({(del.coliItems || []).length} article(s)) :
                      </div>
                      {(del.coliItems || []).map((it, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.8rem",
                            color: "#0f172a",
                            fontWeight: 600,
                          }}
                        >
                          <span>
                            {it.qty}x {it.designation}
                          </span>
                          <span>{(Number(it.qty) * Number(it.unitPrice)).toFixed(3)} TND</span>
                        </div>
                      ))}
                      <div
                        style={{
                          borderTop: "1px dashed #cbd5e1",
                          marginTop: "6px",
                          paddingTop: "6px",
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                          color: "#059669",
                        }}
                      >
                        <span>Total Contre-Remboursement :</span>
                        <span>{(Number(del.cost) || 0).toFixed(3)} TND</span>
                      </div>
                    </div>

                    {/* Driver info */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem", color: "#334155" }}>
                      <span>
                        🚚 Ramasseur :{" "}
                        <strong>
                          {drvObj
                            ? `${drvObj.firstName || ""} ${drvObj.lastName || ""}`.trim() || drvObj.name
                            : "Non assigné"}
                        </strong>
                      </span>
                      {drvObj?.isPicker && (
                        <span
                          style={{
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                          }}
                        >
                          📦 Picker Agréé
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                    <button
                      onClick={() => handleVerifyPickupAndBringToDepot(del)}
                      style={{
                        flex: 1,
                        background: "#059669",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FaCheckCircle /> Pickup Correct & Stocker au Dépôt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: SUIVI DES LIVREURS DU DÉPÔT (PICKUPS, LIVRAISONS & SOLDE)
      ===================================================================== */}
      {activeTab === "drivers" && (
        <div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            {drivers.map((drv) => {
              const drvDeliveries = deliveries.filter(
                (d) => Number(d.driverId || d.driver?.id) === Number(drv.id)
              );
              const deliveredList = drvDeliveries.filter((d) => Number(d.status) === 5);
              const unpaidDelivered = deliveredList.filter((d) => !d.isPaid);
              const cashInHand = unpaidDelivered.reduce((s, d) => s + (Number(d.cost) || 0), 0);
              const isSelected = Number(inspectedDriverId) === Number(drv.id);

              return (
                <div
                  key={drv.id}
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    padding: "16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "50%",
                          background: "#eff6ff",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                        }}
                      >
                        <FaTruck />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                          {`${drv.firstName || ""} ${drv.lastName || ""}`.trim() || drv.name || `Livreur #${drv.id}`}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {drv.carNumber || "Véhicule de service"} · {drv.phone1 || "—"}
                        </div>
                      </div>
                    </div>

                    {Boolean(drv.isPicker ?? drv.IsPicker) && (
                      <span
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        📦 Picker
                      </span>
                    )}
                  </div>

                  {/* Driver stats grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "8px",
                      background: "#f8fafc",
                      padding: "10px",
                      borderRadius: "10px",
                      marginBottom: "12px",
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>COLIS ASSIGNÉS</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                        {drvDeliveries.length}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>LIVRÉS</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>
                        {deliveredList.length}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>SOLDE TARIF</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#2563eb", fontFamily: "monospace" }}>
                        {(Number(drv.solde ?? drv.Solde) || 0).toFixed(3)}
                      </div>
                    </div>
                  </div>

                  {/* Cash to recover from driver */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: cashInHand > 0 ? "#fef2f2" : "#f0fdf4",
                      border: cashInHand > 0 ? "1px solid #fecaca" : "1px solid #bbf7d0",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      marginBottom: "12px",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: cashInHand > 0 ? "#991b1b" : "#166534" }}>
                      Cash Livré Non Payé ({unpaidDelivered.length}) :
                    </span>
                    <strong style={{ fontFamily: "monospace", color: cashInHand > 0 ? "#dc2626" : "#059669" }}>
                      {cashInHand.toFixed(3)} TND
                    </strong>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      onClick={() =>
                        setInspectedDriverId(isSelected ? null : drv.id)
                      }
                      style={{
                        flex: 1,
                        background: isSelected ? "#1e293b" : "#eff6ff",
                        color: isSelected ? "#fff" : "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "8px",
                        padding: "7px 10px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {isSelected ? "Masquer ses Colis" : "Voir Pickups & Livraisons"}
                    </button>

                    <button
                      onClick={() => {
                        setAssignTargetDriver(drv);
                        setSelectedUnassignedIds([]);
                        setAssignModalOpen(true);
                      }}
                      style={{
                        background: "#fffbeb",
                        color: "#b45309",
                        border: "1px solid #fde68a",
                        borderRadius: "8px",
                        padding: "7px 10px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Affecter Colis
                    </button>

                    {unpaidDelivered.length > 0 && (
                      <button
                        onClick={() =>
                          handleRenderPaid(
                            unpaidDelivered.map((d) => d.id),
                            drv.id
                          )
                        }
                        style={{
                          width: "100%",
                          background: "#059669",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "8px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        💰 Encaisser & Marquer ses {unpaidDelivered.length} Colis Livrés comme PAYÉS
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspected Driver Deliveries & Pickups Detail Table */}
          {inspectedDriverId && (
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                border: "2px solid #2563eb",
                padding: "18px",
                marginTop: "12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h4 style={{ margin: 0, fontWeight: 800, color: "#1e293b" }}>
                  📋 Détail des Pickups & Livraisons du Chauffeur sélectionné
                </h4>
                <button
                  onClick={() => setInspectedDriverId(null)}
                  style={{
                    background: "#f1f5f9",
                    border: "none",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Fermer
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                      <th style={{ padding: "10px", fontSize: "0.75rem" }}>Code Colis</th>
                      <th style={{ padding: "10px", fontSize: "0.75rem" }}>Client & Ville</th>
                      <th style={{ padding: "10px", fontSize: "0.75rem" }}>Montant</th>
                      <th style={{ padding: "10px", fontSize: "0.75rem" }}>État Livraison</th>
                      <th style={{ padding: "10px", fontSize: "0.75rem" }}>Paiement</th>
                      <th style={{ padding: "10px", fontSize: "0.75rem" }}>Validation Pickup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries
                      .filter((d) => Number(d.driverId || d.driver?.id) === Number(inspectedDriverId))
                      .map((del) => (
                        <tr key={del.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px", fontFamily: "monospace", fontWeight: 700 }}>
                            #{del.qrCodeContent || del.id}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <strong>{del.customer?.fullName}</strong> ({del.customer?.city})
                          </td>
                          <td style={{ padding: "10px", fontWeight: 800 }}>
                            {(Number(del.cost) || 0).toFixed(3)} TND
                          </td>
                          <td style={{ padding: "10px" }}>
                            {DeliveryStatus.find((s) => s.value === Number(del.status))?.label || del.status}
                          </td>
                          <td style={{ padding: "10px" }}>
                            <button
                              onClick={() => handleTogglePaidSingle(del)}
                              style={{
                                background: del.isPaid ? "#dcfce7" : "#fee2e2",
                                color: del.isPaid ? "#166534" : "#991b1b",
                                border: "none",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              {del.isPaid ? "✓ PAYÉ (Cliquer pour changer)" : "NON PAYÉ (Cliquer pour encaisser)"}
                            </button>
                          </td>
                          <td style={{ padding: "10px" }}>
                            <button
                              onClick={() => handleVerifyPickupAndBringToDepot(del)}
                              style={{
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                border: "1px solid #bfdbfe",
                                borderRadius: "6px",
                                padding: "4px 10px",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Valider Pickup & Créditer
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: AFFECTER DES COLIS AU CHAUFFEUR DU DÉPÔT */}
      <Modal open={assignModalOpen} onClose={() => setAssignModalOpen(false)} size="md">
        <Modal.Header>
          <Modal.Title>
            Affecter des Colis du Dépôt à{" "}
            {assignTargetDriver
              ? `${assignTargetDriver.firstName || ""} ${assignTargetDriver.lastName || ""}`
              : "ce Chauffeur"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ fontSize: "0.85rem", color: "#475569", marginBottom: "12px" }}>
            Sélectionnez les colis disponibles au dépôt à affecter à la tournée de ce livreur :
          </p>
          <div style={{ maxHeight: "340px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px" }}>
            {(unassignedDeliveries.length > 0 ? unassignedDeliveries : deliveries).map((del) => {
              const checked = selectedUnassignedIds.includes(del.id);
              return (
                <div
                  key={del.id}
                  onClick={() => {
                    if (checked) {
                      setSelectedUnassignedIds((prev) => prev.filter((id) => id !== del.id));
                    } else {
                      setSelectedUnassignedIds((prev) => [...prev, del.id]);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderBottom: "1px solid #f1f5f9",
                    cursor: "pointer",
                    background: checked ? "#eff6ff" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Checkbox checked={checked} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                        #{del.qrCodeContent || del.id} — {del.customer?.fullName}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {del.customer?.city} · {(Number(del.cost) || 0).toFixed(3)} TND
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#475569" }}>
                    {del.driver ? `Actuel: ${del.driver.firstName || ""}` : "Non assigné"}
                  </span>
                </div>
              );
            })}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={() => setAssignModalOpen(false)}
            style={{
              background: "transparent",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "8px 14px",
              marginRight: "8px",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
          <button
            onClick={() => {
              if (assignTargetDriver) {
                handleAffectDriver(selectedUnassignedIds, assignTargetDriver.id);
                setAssignModalOpen(false);
              }
            }}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 18px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Confirmer l'Affectation ({selectedUnassignedIds.length})
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
