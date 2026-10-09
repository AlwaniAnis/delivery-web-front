import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Checkbox, Input, Modal, SelectPicker } from "rsuite";
import Swal from "sweetalert2";
import {
  FaWarehouse,
  FaTruck,
  FaMoneyBillWave,
  FaCheckCircle,
  FaBoxOpen,
  FaPhoneAlt,
  FaStore,
  FaSyncAlt,
  FaUndoAlt,
  FaArrowRight,
  FaMapMarkerAlt,
} from "react-icons/fa";
import { APi } from "../../Api";
import { ENDPOINTS } from "../../Api/enpoints";
import { DriversList } from "../../Atoms/drivers.atom";
import { StoresList } from "../../Atoms/stores.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { DepotAgentsList } from "../../Atoms/depotAgents.atom";
import { tarifsState } from "../../Atoms/tarifs.atom";
import { currentDepotIdState, currentUserState } from "../../Atoms/auth.atom";
import {
  DeliveryStatus,
  DeliveryResultOptions,
  RefundCauseOptions,
  getOperationalStatus,
  getDeliveryResult,
  getPickupDriver,
  getPickupDriverId,
  getDeliveryDriver,
  getDeliveryDriverId,
  getActiveDeliveryDriverId,
  getDeliveryTotalPrice,
} from "../../Constants/types";

export default function DepotAgentWorkspace() {
  const [depots] = useRecoilState(preparationPlacesState);
  const [drivers, setDriversList] = useRecoilState(DriversList);
  const storesList = useRecoilValue(StoresList);
  const depotAgents = useRecoilValue(DepotAgentsList);
  const tarifsList = useRecoilValue(tarifsState);
  const currentUser = useRecoilValue(currentUserState);
  const [currentDepotId, setCurrentDepotId] = useRecoilState(currentDepotIdState);

  // 5 Simple Workflow Steps for the Depot Agent:
  // 1. "store_pickups"   -> Cartes des Boutiques (Assigner un livreur pour tout ou N colis à ramasser)
  // 2. "depot_reception" -> Confirmer la réception au dépôt (Colis ramassés + Retours non livrés)
  // 3. "assign_delivery" -> Affecter un livreur de livraison aux colis reçus au dépôt
  // 4. "end_of_day"      -> Clôture Fin de Journée Livreurs (Cash + Tarifs + Réception Retours)
  // 5. "stores_recap"    -> Récap Fin de Journée des Boutiques du Dépôt (Montant net à remettre + Colis retournés définitifs)
  const [activeStep, setActiveStep] = useState("store_pickups");

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Per-store pickup assignment state: { [storeId]: { driverId: number, count: number, selectedIds: number[] } }
  const [storePickupConfig, setStorePickupConfig] = useState({});
  const [expandedStoreId, setExpandedStoreId] = useState(null);

  // Step 2: Reception selection
  const [selectedReceptionIds, setSelectedReceptionIds] = useState([]);

  // Step 3: Delivery driver assignment state
  const [selectedAtDepotIds, setSelectedAtDepotIds] = useState([]);
  const [assignDeliveryDriverId, setAssignDeliveryDriverId] = useState(0);
  const [assignCountInput, setAssignCountInput] = useState("");

  // Step 5: Store Recap Filter state (0 = Toutes les boutiques du dépôt, or specific storeId)
  const [recapSelectedStoreId, setRecapSelectedStoreId] = useState(0);
  const [recapStoreSearch, setRecapStoreSearch] = useState("");

  // Refund modal state for Depot Agent
  const [refundModalDelivery, setRefundModalDelivery] = useState(null);
  const [refundAmountVal, setRefundAmountVal] = useState(0);
  const [refundCauseVal, setRefundCauseVal] = useState(1);
  const [refundCauseDescVal, setRefundCauseDescVal] = useState("");

  const openRefundModal = (del) => {
    const defaultAmt = Number(del?.refundAmount ?? del?.RefundAmount ?? del?.cost) || getDeliveryTotalPrice(del);
    setRefundModalDelivery(del);
    setRefundAmountVal(defaultAmt);
    setRefundCauseVal(Number(del?.refundCause ?? del?.RefundCause) || 1);
    setRefundCauseDescVal(del?.refundCauseDescription ?? del?.RefundCauseDescription ?? "");
  };

  const handleSaveDepotRefund = () => {
    if (!refundModalDelivery) return;
    const delId = Number(refundModalDelivery.id);
    const nowIso = new Date().toISOString();
    const refundPayload = {
      deliveryId: delId,
      DeliveryId: delId,
      refundDate: nowIso,
      RefundDate: nowIso,
      refundAmount: Number(refundAmountVal) || 0,
      RefundAmount: Number(refundAmountVal) || 0,
      refundCause: Number(refundCauseVal) || 1,
      RefundCause: Number(refundCauseVal) || 1,
      refundCauseDescription: refundCauseDescVal || "",
      RefundCauseDescription: refundCauseDescVal || "",
    };

    APi.createAPIEndpoint(`${ENDPOINTS.Delivery}/refund`)
      .customPost(refundPayload)
      .finally(() => {
        setDeliveries((prev) =>
          prev.map((d) =>
            d.id === delId
              ? {
                  ...d,
                  result: 7,
                  status: 5,
                  operationalStatus: 5,
                  isRefunded: true,
                  refundDate: nowIso,
                  refundAmount: Number(refundAmountVal) || 0,
                  refundCause: Number(refundCauseVal) || 1,
                  refundCauseDescription: refundCauseDescVal || "",
                }
              : d
          )
        );
        setRefundModalDelivery(null);
        Swal.fire({
          icon: "success",
          title: "Remboursement Enregistré !",
          html: `Colis <b>#${refundModalDelivery.qrCodeContent || delId}</b> remboursé à hauteur de <b>${Number(refundAmountVal).toFixed(3)} TND</b>.`,
          timer: 2000,
          showConfirmButton: false,
        });
      });
  };

  // Local tracking for confirmed depot receptions & return receptions
  const [verifiedPickupIds, setVerifiedPickupIds] = useState(() => {
    try {
      const raw = localStorage.getItem("tawsil_verified_pickups");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const [confirmedReturnIds, setConfirmedReturnIds] = useState(() => {
    try {
      const raw = localStorage.getItem("tawsil_confirmed_depot_returns");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const resolvedDepotId = Number(
    currentUser?.preparationPlaceId ||
      currentUser?.agentDepot?.preparationPlaceId ||
      currentUser?.depotId ||
      currentDepotId ||
      depots[0]?.id ||
      1
  );

  const activeDepot =
    depots.find((d) => Number(d.id) === resolvedDepotId) ||
    depots[0] || { id: 1, name: "Dépôt Central Tunis", code: "DEP-TUN-01" };

  const activeAgent =
    depotAgents.find(
      (a) =>
        Number(a.id) === Number(currentUser?.agentDepotId || currentUser?.depotAgentId) ||
        Number(a.preparationPlaceId || a.depotId) === Number(activeDepot.id)
    ) || depotAgents[0];

  const [depotApiStores, setDepotApiStores] = useState([]);
  const [depotApiDrivers, setDepotApiDrivers] = useState([]);

  // Strictly scope Stores, Drivers, and Deliveries to this Depot Agent's PreparationPlace
  const belongsToActiveDepot = (placeIdVal) =>
    Number(placeIdVal || 1) === Number(activeDepot.id);

  const depotStores =
    depotApiStores.length > 0
      ? depotApiStores
      : storesList.filter((s) =>
          belongsToActiveDepot(s.preparationPlaceId || s.preparationPlace?.id || s.depotId || 1)
        );
  const depotStoreIds = new Set(depotStores.map((s) => Number(s.id)));

  const depotDrivers =
    depotApiDrivers.length > 0
      ? depotApiDrivers
      : drivers.filter((d) =>
          belongsToActiveDepot(d.preparationPlaceId || d.preparationPlace?.id || d.depotId || 1)
        );

  const depotDeliveries = deliveries.filter((d) => {
    const delPlaceId = d.preparationPlaceId || d.preparationPlace?.id || d.depotId;
    if (delPlaceId) {
      return Number(delPlaceId) === Number(activeDepot.id);
    }
    const sId = Number(d.eStoreId ?? d.storeId ?? d.EStoreId ?? 0);
    if (sId && depotStoreIds.has(sId)) {
      return true;
    }
    return Number(activeDepot.id) === 1;
  });

  const fetchDeliveries = () => {
    setLoading(true);
    const placeId = Number(activeDepot.id || 1);

    // Fetch stores for this depot using GET /api/Store?placeId={placeId}
    APi.createAPIEndpoint(ENDPOINTS.Store, {
      page: 1,
      take: 500,
      placeId,
    })
      .fetchAll()
      .then((res) => {
        const rows = res.data?.data || res.data?.Data || res.data || [];
        if (Array.isArray(rows) && rows.length > 0) {
          setDepotApiStores(rows);
        }
      })
      .catch(() => {});

    // Fetch drivers for this depot using GET /api/Driver?placeId={placeId}
    APi.createAPIEndpoint(ENDPOINTS.Driver, {
      page: 1,
      take: 500,
      placeId,
    })
      .fetchAll()
      .then((res) => {
        const rows = res.data?.data || res.data?.Data || res.data || [];
        if (Array.isArray(rows) && rows.length > 0) {
          setDepotApiDrivers(rows);
        }
      })
      .catch(() => {});

    APi.createAPIEndpoint(ENDPOINTS.Delivery, {
      page: 1,
      take: 500,
      placeId,
    })
      .fetchAll()
      .then((res) => {
        const rows = (res.data?.data || res.data || []).map((el) => ({
          ...el,
          cost: getDeliveryTotalPrice(el),
        }));
        setDeliveries(rows);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDeliveries();
  }, [activeDepot.id]);

  const markPickupVerified = (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const next = Array.from(new Set([...verifiedPickupIds, ...idList]));
    setVerifiedPickupIds(next);
    try {
      localStorage.setItem("tawsil_verified_pickups", JSON.stringify(next));
    } catch (e) {}
  };

  const markReturnConfirmed = (ids) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const next = Array.from(new Set([...confirmedReturnIds, ...idList]));
    setConfirmedReturnIds(next);
    try {
      localStorage.setItem("tawsil_confirmed_depot_returns", JSON.stringify(next));
    } catch (e) {}
  };

  // Helper to resolve driver tariff fees (pickup fee & delivery fee)
  const getParcelDriverFees = (del) => {
    const matchedTarif =
      del.tarif ||
      del.Tarif ||
      tarifsList.find((t) => Number(t.id) === Number(del.tarifId ?? del.TarifId));
    const pickupFee = Number(
      matchedTarif?.driverPickupPrice ??
        matchedTarif?.DriverPickupPrice ??
        matchedTarif?.commissionPickup ??
        2.0
    );
    const deliveryFee = Number(
      matchedTarif?.driverDeliveryPrice ??
        matchedTarif?.DriverDeliveryPrice ??
        del.commissionDriver ??
        3.5
    );
    return { pickupFee, deliveryFee };
  };

  // Categorize deliveries for the 4 steps (strictly scoped to this depot)
  // 1. Pending pickups (OperationalStatus === 1 and not yet picked up)
  const pendingPickupDeliveries = depotDeliveries.filter(
    (d) => getOperationalStatus(d) === 1 && !d.isPickedUp && !d.IsPickedUp
  );

  // 2A. Picked up from store, waiting for Depot Agent reception confirmation (OperationalStatus === 2)
  const pickedUpWaitingDepot = depotDeliveries.filter(
    (d) =>
      (getOperationalStatus(d) === 2 || ((d.isPickedUp || d.IsPickedUp) && getOperationalStatus(d) < 3)) &&
      !d.isAtDepot &&
      !d.IsAtDepot &&
      !verifiedPickupIds.includes(d.id)
  );

  // 2B. Undelivered parcels from driver tours that need Depot Agent return reception confirmation
  const undeliveredReturnsWaitingDepot = depotDeliveries.filter((d) => {
    const op = getOperationalStatus(d);
    const res = getDeliveryResult(d);
    const isUndeliveredOutcome = res >= 2 && res <= 6; // NoAnswer, Refused, Canceled, ReturnedToDepot, ReturnedToSender
    const isReturnedByDriverFlag = Boolean(d.returnedToDepotByDriver || d.pendingDepotReturn);
    return (
      (isUndeliveredOutcome || (op === 4 && isReturnedByDriverFlag)) &&
      !confirmedReturnIds.includes(d.id)
    );
  });

  // 3. At Depot waiting for Delivery Driver assignment (or ready at depot)
  const atDepotDeliveries = depotDeliveries.filter((d) => {
    const op = getOperationalStatus(d);
    return op === 3 || (verifiedPickupIds.includes(d.id) && op < 4);
  });
  const unassignedAtDepotDeliveries = atDepotDeliveries.filter((d) => !getDeliveryDriverId(d));

  // Build Store Cards with pending pickup counts (only stores belonging to this depot)
  const storeCardsData = depotStores
    .map((store) => {
      const storePending = pendingPickupDeliveries.filter(
        (d) => Number(d.eStoreId ?? d.storeId ?? d.EStoreId) === Number(store.id)
      );
      const storePickedUp = pickedUpWaitingDepot.filter(
        (d) => Number(d.eStoreId ?? d.storeId ?? d.EStoreId) === Number(store.id)
      );
      return {
        store,
        pendingDeliveries: storePending,
        pendingCount: storePending.length,
        inTransitCount: storePickedUp.length,
      };
    })
    .sort((a, b) => b.pendingCount - a.pendingCount);

  // Also include a fallback card if some pending deliveries of this depot don't match a store in depotStores
  const unmatchedPending = pendingPickupDeliveries.filter(
    (d) => !depotStores.some((s) => Number(s.id) === Number(d.eStoreId ?? d.storeId ?? d.EStoreId))
  );
  if (unmatchedPending.length > 0) {
    storeCardsData.unshift({
      store: {
        id: 0,
        name_fr: "Boutiques Partenaires (Divers)",
        contacts: [{ address: activeDepot.name, phones: "" }],
      },
      pendingDeliveries: unmatchedPending,
      pendingCount: unmatchedPending.length,
      inTransitCount: 0,
    });
  }

  // --- STEP 1 ACTION: Assign a Pickup Driver for ALL or N deliveries of a Store ---
  const handleAssignStorePickup = async (storeCard) => {
    const storeId = storeCard.store.id;
    const cfg = storePickupConfig[storeId] || {};
    const driverId = Number(cfg.driverId || 0);

    if (!driverId) {
      Swal.fire("Chauffeur requis", "Veuillez choisir un livreur pour le ramassage.", "warning");
      return;
    }

    const available = storeCard.pendingDeliveries;
    if (available.length === 0) {
      Swal.fire("Information", "Aucun colis en attente de ramassage pour cette boutique.", "info");
      return;
    }

    // Determine which deliveries to assign: either manually checked IDs, or the requested count (default: all)
    let targetDeliveries = [];
    if (Array.isArray(cfg.selectedIds) && cfg.selectedIds.length > 0) {
      targetDeliveries = available.filter((d) => cfg.selectedIds.includes(d.id));
    } else {
      const requestedCount =
        cfg.count !== undefined && cfg.count !== ""
          ? Math.max(1, Math.min(available.length, Number(cfg.count)))
          : available.length;
      targetDeliveries = available.slice(0, requestedCount);
    }

    if (targetDeliveries.length === 0) return;

    const chosenDriver = depotDrivers.find((d) => Number(d.id) === driverId) || drivers.find((d) => Number(d.id) === driverId);
    const targetIds = targetDeliveries.map((d) => d.id);

    // Call DriverController.Pickup for each selected delivery
    try {
      await Promise.allSettled(
        targetIds.map((delId) =>
          APi.createAPIEndpoint(`${ENDPOINTS.Driver}/${driverId}/pickup/${delId}`).customPost({})
        )
      );
    } catch (e) {}

    setDeliveries((prev) =>
      prev.map((d) =>
        targetIds.includes(d.id)
          ? {
              ...d,
              isPickedUp: true,
              pickupDriverId: driverId,
              pickupDriver: chosenDriver || d.pickupDriver,
              status: 2,
              operationalStatus: 2,
            }
          : d
      )
    );

    // Reset selection for this store
    setStorePickupConfig((prev) => ({
      ...prev,
      [storeId]: {
        driverId,
        count: Math.max(0, available.length - targetIds.length),
        selectedIds: [],
      },
    }));

    Swal.fire({
      icon: "success",
      title: "Ramassage Affecté !",
      html: `<b>${targetIds.length} colis</b> de <b>${
        storeCard.store.name_fr || storeCard.store.name
      }</b> ont été assignés au livreur <b>${
        chosenDriver ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}` : `#${driverId}`
      }</b>.<br/><span style="font-size:0.85rem;color:#475569;">Prochaine étape : Confirmer leur réception à l'arrivée au dépôt.</span>`,
      timer: 2200,
      showConfirmButton: false,
    });
  };

  // --- STEP 2A ACTION: Confirm Reception at Depot of Picked-up Deliveries ---
  const handleConfirmReceptionAtDepot = async (deliveryList) => {
    if (!deliveryList || deliveryList.length === 0) {
      Swal.fire("Attention", "Veuillez sélectionner au moins un colis à réceptionner.", "warning");
      return;
    }

    const placeId = Number(activeDepot.id || 1);
    const nowIso = new Date().toISOString();
    const agentId = Number(
      activeAgent?.id || currentUser?.agentDepotId || currentUser?.depotAgentId || currentUser?.id || 1
    );
    const ids = deliveryList.map((d) => d.id);

    try {
      await Promise.allSettled(
        deliveryList.map((del) =>
          APi.createAPIEndpoint(
            `${ENDPOINTS.PreparationPlace}/${agentId}/confirmArrival/${del.id}`
          ).customPost({})
        )
      );
    } catch (e) {}

    markPickupVerified(ids);

    setDeliveries((prev) =>
      prev.map((d) =>
        ids.includes(d.id)
          ? {
              ...d,
              preparationPlaceId: placeId,
              status: 3,
              operationalStatus: 3,
              isPickedUp: true,
              isAtDepot: true,
              atDepotConfirmedBy: agentId,
              atDepotConfirmedDate: nowIso,
            }
          : d
      )
    );

    setSelectedReceptionIds((prev) => prev.filter((id) => !ids.includes(id)));

    Swal.fire({
      icon: "success",
      title: "Réception au Dépôt Confirmée !",
      html: `<b>${ids.length} colis</b> réceptionné(s) dans <b>${activeDepot.name}</b>.<br/>Vous pouvez maintenant leur affecter un livreur de livraison (Étape 3).`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // --- STEP 2B ACTION: Confirm Reception at Depot of Undelivered Returned Parcels ---
  const handleConfirmUndeliveredReturn = async (del, actionType = "reschedule") => {
    // actionType: "reschedule" (keep at depot for another delivery iteration) | "final_return" (final return to store)
    const nowIso = new Date().toISOString();
    const nextResult = actionType === "final_return" ? 6 : 5; // 6 = ReturnedToSender, 5 = ReturnedToDepot
    const nextOpStatus = actionType === "final_return" ? 5 : 3; // 3 = AtDepot (ready for next iteration), 5 = Completed

    try {
      await APi.createAPIEndpoint(`${ENDPOINTS.Delivery}/changeResult/${del.id}/${nextResult}`).update2({
        deliveryId: del.id,
        result: nextResult,
      });
    } catch (e) {}

    markReturnConfirmed([del.id]);

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === del.id
          ? {
              ...d,
              status: nextOpStatus,
              operationalStatus: nextOpStatus,
              result: actionType === "reschedule" ? 0 : 6,
              isAtDepot: true,
              deliveryDriverId: actionType === "reschedule" ? null : d.deliveryDriverId,
              deliveryDriver: actionType === "reschedule" ? null : d.deliveryDriver,
              waitToReturnToSenderDate: nowIso,
            }
          : d
      )
    );

    Swal.fire({
      icon: "success",
      title:
        actionType === "final_return"
          ? "Retour Définitif Boutique Confirmé"
          : "Retour au Dépôt Confirmé (Nouvelle Tentative)",
      html:
        actionType === "final_return"
          ? `Le colis <b>#${del.qrCodeContent || del.id}</b> est enregistré en <b>Retour Définitif à la Boutique</b> (visible dans le récap de la boutique).`
          : `Le colis <b>#${del.qrCodeContent || del.id}</b> est réceptionné au dépôt pour une <b>prochaine itération de livraison</b>.`,
      timer: 2200,
      showConfirmButton: false,
    });
  };

  // --- STEP 3 ACTION: Assign Delivery Driver to At-Depot Deliveries ---
  const handleAssignDeliveryDriverBulk = async (deliveryIds, targetDriverId) => {
    if (!targetDriverId) {
      Swal.fire("Chauffeur requis", "Veuillez sélectionner un livreur de livraison.", "warning");
      return;
    }
    if (!deliveryIds || deliveryIds.length === 0) {
      Swal.fire("Sélection requise", "Veuillez sélectionner au moins un colis au dépôt.", "warning");
      return;
    }

    const chosenDriver = drivers.find((d) => Number(d.id) === Number(targetDriverId));

    try {
      if (deliveryIds.length === 1) {
        await APi.createAPIEndpoint(
          `${ENDPOINTS.Driver}/${targetDriverId}/assignDelivery/${deliveryIds[0]}`
        ).customPost({});
      } else {
        await APi.createAPIEndpoint(ENDPOINTS.Delivery + "/changeDriver").create({
          driverId: Number(targetDriverId),
          deliveries: deliveryIds,
        });
      }
    } catch (e) {}

    setDeliveries((prev) =>
      prev.map((d) =>
        deliveryIds.includes(d.id)
          ? {
              ...d,
              driverId: Number(targetDriverId),
              deliveryDriverId: Number(targetDriverId),
              driver: chosenDriver || d.driver,
              deliveryDriver: chosenDriver || d.deliveryDriver,
              preparationPlaceId: activeDepot.id,
            }
          : d
      )
    );

    setSelectedAtDepotIds([]);
    Swal.fire({
      icon: "success",
      title: "Livreur de Livraison Affecté !",
      html: `<b>${deliveryIds.length} colis</b> ont été affectés à <b>${
        chosenDriver ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}` : `#${targetDriverId}`
      }</b>.<br/>Le livreur peut maintenant les prendre en charge dans son application.`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // --- STEP 4 ACTION: Confirm Driver Cash Handover at End of Day ---
  const handleRenderPaid = (deliveryIds, driverIdOption = 0) => {
    if (!deliveryIds || deliveryIds.length === 0) return;

    APi.createAPIEndpoint(ENDPOINTS.Delivery + "/renderPaid")
      .create({
        driverId: Number(driverIdOption) || 0,
        deliveries: deliveryIds,
      })
      .finally(() => {
        setDeliveries((prev) =>
          prev.map((d) => (deliveryIds.includes(d.id) ? { ...d, isPaid: true } : d))
        );
        Swal.fire({
          icon: "success",
          title: "Encaissement Cash Confirmé !",
          text: `La remise de caisse pour ${deliveryIds.length} colis livré(s) est validée.`,
          timer: 1800,
          showConfirmButton: false,
        });
      });
  };

  return (
    <div style={{ maxWidth: "1380px", margin: "0 auto", padding: "8px 4px" }}>
      {/* HEADER BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          borderRadius: "14px",
          padding: "18px 22px",
          marginBottom: "18px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "#d97706",
              width: "46px",
              height: "46px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              flexShrink: 0,
            }}
          >
            <FaWarehouse />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#fff" }}>
              Espace Agent de Dépôt — {activeDepot.name}
            </h2>
            <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#cbd5e1" }}>
              Flux simple en 4 étapes : 1. Ramassage Boutiques ➔ 2. Réception Dépôt ➔ 3. Affectation Livreur ➔ 4. Clôture Journée
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              background: "rgba(16, 185, 129, 0.18)",
              border: "1px solid rgba(52, 211, 153, 0.4)",
              color: "#6ee7b7",
              padding: "8px 14px",
              borderRadius: "8px",
              fontWeight: 800,
              fontSize: "0.82rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🏢 {activeDepot.name} ({activeDepot.code || `DEP-${activeDepot.id}`})
          </div>
          <button
            onClick={fetchDeliveries}
            style={{
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "0.8rem",
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

      {/* 4 SIMPLE STEPPER TABS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {[
          {
            id: "store_pickups",
            step: "ÉTAPE 1",
            title: "Ramassage Boutiques",
            subtitle: "Cartes boutiques & affectation pickup",
            count: pendingPickupDeliveries.length,
            color: "#2563eb",
            bg: "#eff6ff",
          },
          {
            id: "depot_reception",
            step: "ÉTAPE 2",
            title: "Réception au Dépôt",
            subtitle: "Confirmer entrée des pickups & retours",
            count: pickedUpWaitingDepot.length + undeliveredReturnsWaitingDepot.length,
            color: "#d97706",
            bg: "#fffbeb",
          },
          {
            id: "assign_delivery",
            step: "ÉTAPE 3",
            title: "Affecter à la Livraison",
            subtitle: "Assigner un livreur aux colis du dépôt",
            count: unassignedAtDepotDeliveries.length,
            color: "#4f46e5",
            bg: "#eef2ff",
          },
          {
            id: "end_of_day",
            step: "ÉTAPE 4",
            title: "Clôture Livreurs",
            subtitle: "Caisse livreurs (Cash + Tarifs) & Retours",
            count: depotDrivers.length,
            color: "#059669",
            bg: "#ecfdf5",
          },
          {
            id: "stores_recap",
            step: "ÉTAPE 5",
            title: "Récap Boutiques du Dépôt",
            subtitle: "Montant à remettre & retours définitifs",
            count: depotStores.length,
            color: "#7c3aed",
            bg: "#f5f3ff",
          },
        ].map((item) => {
          const active = activeStep === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setActiveStep(item.id)}
              style={{
                background: active ? item.bg : "#ffffff",
                border: active ? `2px solid ${item.color}` : "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: active ? `0 4px 12px ${item.color}22` : "0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    color: item.color,
                    letterSpacing: "0.5px",
                  }}
                >
                  {item.step}
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                  {item.subtitle}
                </div>
              </div>
              <div
                style={{
                  background: active ? item.color : "#f1f5f9",
                  color: active ? "#ffffff" : "#0f172a",
                  minWidth: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.95rem",
                  padding: "0 8px",
                }}
              >
                {item.count}
              </div>
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          STEP 1: LIST OF STORE CARDS (HOW MANY DELIVERIES NEED PICKUP + ASSIGN DRIVER FOR ALL OR N)
      ===================================================================== */}
      {activeStep === "store_pickups" && (
        <div>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                1. Cartes des Boutiques — Demandes de Ramassage (Pickup)
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Consultez le nombre de colis à ramasser par boutique et affectez un chauffeur pour la totalité ou un nombre précis de colis.
              </p>
            </div>
            <div style={{ minWidth: "240px" }}>
              <Input
                placeholder="Rechercher une boutique..."
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
              gap: "16px",
            }}
          >
            {storeCardsData
              .filter((sc) => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                const name = (sc.store.name_fr || sc.store.name || "").toLowerCase();
                return name.includes(q);
              })
              .map((sc) => {
                const storeId = sc.store.id;
                const cfg = storePickupConfig[storeId] || {};
                const selectedDriverId = cfg.driverId || 0;
                const countToAssign =
                  cfg.count !== undefined && cfg.count !== ""
                    ? cfg.count
                    : sc.pendingCount;
                const address =
                  sc.store.contacts?.[0]?.address || sc.store.address || "Adresse boutique";
                const phone = sc.store.contacts?.[0]?.phones || sc.store.phone || "";
                const isExpanded = expandedStoreId === storeId;

                return (
                  <div
                    key={storeId}
                    style={{
                      background: "#ffffff",
                      borderRadius: "14px",
                      border: sc.pendingCount > 0 ? "2px solid #bfdbfe" : "1px solid #e2e8f0",
                      padding: "18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "14px",
                      boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                    }}
                  >
                    {/* Store Header & Count Badge */}
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "10px",
                              background: sc.pendingCount > 0 ? "#eff6ff" : "#f1f5f9",
                              color: sc.pendingCount > 0 ? "#2563eb" : "#64748b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "18px",
                              flexShrink: 0,
                            }}
                          >
                            <FaStore />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
                              {sc.store.name_fr || sc.store.name || `Boutique #${storeId}`}
                            </div>
                            <div
                              style={{
                                fontSize: "0.76rem",
                                color: "#64748b",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                marginTop: "2px",
                              }}
                            >
                              <FaMapMarkerAlt size={10} style={{ color: "#ef4444" }} />
                              <span>{address}</span>
                            </div>
                            {phone && (
                              <div style={{ fontSize: "0.74rem", color: "#2563eb", marginTop: "2px", fontWeight: 600 }}>
                                <FaPhoneAlt size={9} /> {phone}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Number of deliveries to pickup badge */}
                        <div
                          style={{
                            background: sc.pendingCount > 0 ? "#2563eb" : "#f1f5f9",
                            color: sc.pendingCount > 0 ? "#ffffff" : "#64748b",
                            padding: "6px 12px",
                            borderRadius: "10px",
                            textAlign: "center",
                            minWidth: "85px",
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ fontSize: "1.25rem", fontWeight: 900, lineHeight: 1.1 }}>
                            {sc.pendingCount}
                          </div>
                          <div style={{ fontSize: "0.66rem", fontWeight: 700, textTransform: "uppercase" }}>
                            À ramasser
                          </div>
                        </div>
                      </div>

                      {sc.inTransitCount > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            color: "#92400e",
                            padding: "6px 10px",
                            borderRadius: "8px",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span>🚚 {sc.inTransitCount} colis déjà en cours de ramassage</span>
                          <button
                            onClick={() => setActiveStep("depot_reception")}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#b45309",
                              textDecoration: "underline",
                              fontWeight: 800,
                              cursor: "pointer",
                              fontSize: "0.74rem",
                            }}
                          >
                            Réceptionner ➔
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Assignment Controls (Driver + All or Number of deliveries) */}
                    {sc.pendingCount > 0 ? (
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <label
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#334155",
                              display: "block",
                              marginBottom: "4px",
                            }}
                          >
                            Chauffeur Ramasseur (Pickup) :
                          </label>
                          <SelectPicker
                            data={depotDrivers.map((d) => ({
                              label: `🚚 ${d.firstName || ""} ${d.lastName || ""}`.trim() || d.name || `Livreur #${d.id}`,
                              value: d.id,
                            }))}
                            placeholder="Choisir un livreur du dépôt..."
                            block
                            size="sm"
                            value={selectedDriverId}
                            onChange={(val) =>
                              setStorePickupConfig((prev) => ({
                                ...prev,
                                [storeId]: {
                                  ...prev[storeId],
                                  driverId: val,
                                  count: prev[storeId]?.count ?? sc.pendingCount,
                                },
                              }))
                            }
                          />
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "space-between" }}>
                          <div style={{ flex: 1 }}>
                            <label
                              style={{
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                color: "#334155",
                                display: "block",
                                marginBottom: "4px",
                              }}
                            >
                              Nombre de colis (sur {sc.pendingCount}) :
                            </label>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <input
                                type="number"
                                min={1}
                                max={sc.pendingCount}
                                value={countToAssign}
                                onChange={(e) => {
                                  const val = Math.max(
                                    1,
                                    Math.min(sc.pendingCount, Number(e.target.value) || 1)
                                  );
                                  setStorePickupConfig((prev) => ({
                                    ...prev,
                                    [storeId]: {
                                      ...prev[storeId],
                                      count: val,
                                      selectedIds: [],
                                    },
                                  }));
                                }}
                                style={{
                                  width: "75px",
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  fontWeight: 800,
                                  fontSize: "0.85rem",
                                  textAlign: "center",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setStorePickupConfig((prev) => ({
                                    ...prev,
                                    [storeId]: {
                                      ...prev[storeId],
                                      count: sc.pendingCount,
                                      selectedIds: [],
                                    },
                                  }))
                                }
                                style={{
                                  background:
                                    Number(countToAssign) === sc.pendingCount ? "#dbeafe" : "#ffffff",
                                  color:
                                    Number(countToAssign) === sc.pendingCount ? "#1d4ed8" : "#475569",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  padding: "5px 10px",
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Tout ({sc.pendingCount})
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedStoreId(isExpanded ? null : storeId)
                                }
                                style={{
                                  background: "#ffffff",
                                  color: "#475569",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  padding: "5px 8px",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {isExpanded ? "Masquer" : "Choisir colis"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Optional expandable list of store parcels */}
                        {isExpanded && (
                          <div
                            style={{
                              maxHeight: "150px",
                              overflowY: "auto",
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "6px",
                            }}
                          >
                            {sc.pendingDeliveries.map((del) => {
                              const selIds = cfg.selectedIds || [];
                              const checked = selIds.includes(del.id);
                              return (
                                <div
                                  key={del.id}
                                  onClick={() => {
                                    const nextIds = checked
                                      ? selIds.filter((id) => id !== del.id)
                                      : [...selIds, del.id];
                                    setStorePickupConfig((prev) => ({
                                      ...prev,
                                      [storeId]: {
                                        ...prev[storeId],
                                        selectedIds: nextIds,
                                        count: nextIds.length || sc.pendingCount,
                                      },
                                    }));
                                  }}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "4px 6px",
                                    fontSize: "0.75rem",
                                    borderBottom: "1px solid #f1f5f9",
                                    cursor: "pointer",
                                  }}
                                >
                                  <span>
                                    <Checkbox checked={checked} /> #{del.qrCodeContent || del.id} ·{" "}
                                    {del.customer?.fullName || "Client"}
                                  </span>
                                  <strong style={{ fontFamily: "monospace" }}>
                                    {(Number(del.cost) || 0).toFixed(3)} TND
                                  </strong>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <button
                          onClick={() => handleAssignStorePickup(sc)}
                          style={{
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            padding: "9px 14px",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                          }}
                        >
                          <FaTruck size={13} /> Affecter Chauffeur Pickup (
                          {cfg.selectedIds?.length > 0 ? cfg.selectedIds.length : countToAssign} colis)
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "8px",
                          padding: "10px",
                          textAlign: "center",
                          fontSize: "0.78rem",
                          color: "#64748b",
                          fontWeight: 600,
                        }}
                      >
                        ✓ Aucun colis en attente de ramassage
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 2: CONFIRM RECEPTION AT DEPOT (PICKED UP DELIVERIES + DRIVER RETURNS)
      ===================================================================== */}
      {activeStep === "depot_reception" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* SECTION 2A: Picked up from stores -> Confirm Reception at Depot */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                  2A. Confirmation de Réception des Colis Ramassés ({pickedUpWaitingDepot.length})
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Confirmez l'arrivée au dépôt des colis ramassés auprès des boutiques par les chauffeurs pickup.
                </p>
              </div>

              {pickedUpWaitingDepot.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={() =>
                      handleConfirmReceptionAtDepot(
                        selectedReceptionIds.length > 0
                          ? pickedUpWaitingDepot.filter((d) => selectedReceptionIds.includes(d.id))
                          : pickedUpWaitingDepot
                      )
                    }
                    style={{
                      background: "#059669",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "9px 16px",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <FaCheckCircle />{" "}
                    {selectedReceptionIds.length > 0
                      ? `Confirmer la sélection (${selectedReceptionIds.length})`
                      : `Confirmer la Réception de Tout (${pickedUpWaitingDepot.length})`}
                  </button>
                </div>
              )}
            </div>

            {pickedUpWaitingDepot.length === 0 ? (
              <div
                style={{
                  padding: "28px",
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                ✓ Tous les colis ramassés ont été réceptionnés au dépôt.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  className="tawsil-data-table"
                  style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 12px", width: "40px" }}>
                        <Checkbox
                          checked={
                            pickedUpWaitingDepot.length > 0 &&
                            selectedReceptionIds.length === pickedUpWaitingDepot.length
                          }
                          onChange={() => {
                            if (selectedReceptionIds.length === pickedUpWaitingDepot.length) {
                              setSelectedReceptionIds([]);
                            } else {
                              setSelectedReceptionIds(pickedUpWaitingDepot.map((d) => d.id));
                            }
                          }}
                        />
                      </th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>COLIS & CLIENT</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>BOUTIQUE</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>LIVREUR PICKUP</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>MONTANT</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569", textAlign: "right" }}>
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickedUpWaitingDepot.map((del) => {
                      const storeObj = storesList.find(
                        (s) => Number(s.id) === Number(del.eStoreId ?? del.storeId)
                      );
                      const pDrvId = getPickupDriverId(del);
                      const pDrv =
                        getPickupDriver(del) ||
                        drivers.find((d) => Number(d.id) === Number(pDrvId));
                      const checked = selectedReceptionIds.includes(del.id);

                      return (
                        <tr key={del.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <Checkbox
                              checked={checked}
                              onChange={() =>
                                setSelectedReceptionIds((prev) =>
                                  checked ? prev.filter((id) => id !== del.id) : [...prev, del.id]
                                )
                              }
                            />
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              #{del.qrCodeContent || del.code || del.id} — {del.customer?.fullName || "Client"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {del.customer?.city} · {del.customer?.phoneNumber}
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#4f46e5", fontSize: "0.82rem" }}>
                            {storeObj ? storeObj.name_fr || storeObj.name : "Boutique"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 600 }}>
                            {pDrv
                              ? `${pDrv.firstName || ""} ${pDrv.lastName || ""}`.trim() || pDrv.name
                              : "Chauffeur Pickup"}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 800 }}>
                            {(Number(del.cost) || 0).toFixed(3)} TND
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <button
                              onClick={() => handleConfirmReceptionAtDepot([del])}
                              style={{
                                background: "#059669",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <FaCheckCircle size={11} /> Confirmer Réception
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2B: Undelivered Parcels Returned by Drivers -> Confirm Reception at Depot */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #fde68a",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ marginBottom: "14px" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#92400e" }}>
                2B. Réception des Colis Non Livrés Retournés par les Livreurs ({undeliveredReturnsWaitingDepot.length})
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#b45309" }}>
                Lorsqu'un livreur ramène des colis non livrés en fin de journée, confirmez leur réception au dépôt (soit pour une nouvelle tentative, soit en retour définitif à la boutique).
              </p>
            </div>

            {undeliveredReturnsWaitingDepot.length === 0 ? (
              <div
                style={{
                  padding: "22px",
                  textAlign: "center",
                  background: "#fffbeb",
                  borderRadius: "10px",
                  color: "#92400e",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                }}
              >
                Aucun colis non livré en attente de confirmation de retour au dépôt.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  className="tawsil-data-table"
                  style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
                >
                  <thead>
                    <tr style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a" }}>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e" }}>COLIS & CLIENT</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e" }}>BOUTIQUE</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e" }}>LIVREUR</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e" }}>MOTIF / RÉSULTAT</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e", textAlign: "right" }}>
                        CONFIRMER RÉCEPTION RETOUR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {undeliveredReturnsWaitingDepot.map((del) => {
                      const storeObj = storesList.find(
                        (s) => Number(s.id) === Number(del.eStoreId ?? del.storeId)
                      );
                      const dDrvId = getDeliveryDriverId(del) || getActiveDeliveryDriverId(del);
                      const dDrv =
                        getDeliveryDriver(del) ||
                        drivers.find((d) => Number(d.id) === Number(dDrvId));
                      const resVal = getDeliveryResult(del);
                      const resObj =
                        DeliveryResultOptions.find((r) => r.value === resVal) ||
                        DeliveryResultOptions[0];

                      return (
                        <tr key={del.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              #{del.qrCodeContent || del.code || del.id} — {del.customer?.fullName || "Client"}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                              {del.customer?.city} · {(Number(del.cost) || 0).toFixed(3)} TND
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#4f46e5", fontSize: "0.82rem" }}>
                            {storeObj ? storeObj.name_fr || storeObj.name : "Boutique"}
                          </td>
                          <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 600 }}>
                            {dDrv
                              ? `${dDrv.firstName || ""} ${dDrv.lastName || ""}`.trim() || dDrv.name
                              : "Livreur"}
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span
                              style={{
                                background: resObj.bg,
                                color: resObj.color,
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                              }}
                            >
                              {resObj.shortLabel || resObj.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => handleConfirmUndeliveredReturn(del, "reschedule")}
                                style={{
                                  background: "#2563eb",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 10px",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                }}
                                title="Stocker au dépôt pour une autre itération de livraison (ne sera pas compté comme retour définitif boutique)"
                              >
                                🏢 Stocker au Dépôt (Autre tentative)
                              </button>
                              <button
                                onClick={() => handleConfirmUndeliveredReturn(del, "final_return")}
                                style={{
                                  background: "#7c3aed",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  padding: "6px 10px",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                }}
                                title="Confirmer comme retour définitif à la boutique (apparaîtra dans le récap fin de journée de la boutique)"
                              >
                                ↩️ Retour Définitif Boutique
                              </button>
                              <button
                                onClick={() => openRefundModal(del)}
                                style={{
                                  background: "#fdf2f8",
                                  color: "#9d174d",
                                  border: "1px solid #fbcfe8",
                                  borderRadius: "6px",
                                  padding: "6px 10px",
                                  fontWeight: 700,
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                }}
                                title="Enregistrer un remboursement (Refund) pour ce colis"
                              >
                                💸 Rembourser
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
        </div>
      )}

      {/* =====================================================================
          STEP 3: ASSIGN A DELIVERY DRIVER TO PARCELS AT DEPOT
      ===================================================================== */}
      {activeStep === "assign_delivery" && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              3. Affectation des Colis du Dépôt aux Livreurs de Livraison ({atDepotDeliveries.length} au dépôt)
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Sélectionnez un livreur et affectez-lui tout ou un nombre précis de colis réceptionnés au dépôt. Le livreur prendra ensuite en charge ses colis dans son espace.
            </p>
          </div>

          {/* Simple Assignment Bar */}
          <div
            style={{
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              borderRadius: "12px",
              padding: "14px 16px",
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
                  atDepotDeliveries.length > 0 &&
                  selectedAtDepotIds.length === atDepotDeliveries.length
                }
                onChange={() => {
                  if (selectedAtDepotIds.length === atDepotDeliveries.length) {
                    setSelectedAtDepotIds([]);
                  } else {
                    setSelectedAtDepotIds(atDepotDeliveries.map((d) => d.id));
                  }
                }}
              >
                <strong style={{ color: "#312e81", fontSize: "0.84rem" }}>
                  Tout sélectionner ({selectedAtDepotIds.length} sélectionné(s))
                </strong>
              </Checkbox>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.78rem", color: "#4338ca", fontWeight: 700 }}>
                  Ou nombre de colis :
                </span>
                <input
                  type="number"
                  min={1}
                  max={atDepotDeliveries.length || 1}
                  placeholder="Ex: 5"
                  value={assignCountInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssignCountInput(val);
                    const n = Number(val);
                    if (n > 0) {
                      setSelectedAtDepotIds(
                        unassignedAtDepotDeliveries
                          .concat(atDepotDeliveries.filter((d) => getDeliveryDriverId(d)))
                          .slice(0, n)
                          .map((d) => d.id)
                      );
                    }
                  }}
                  style={{
                    width: "70px",
                    padding: "5px 8px",
                    borderRadius: "6px",
                    border: "1px solid #a5b4fc",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ minWidth: "240px" }}>
                <SelectPicker
                  data={depotDrivers.map((d) => ({
                    label: `🚚 ${d.firstName || ""} ${d.lastName || ""}`.trim() || d.name || `Livreur #${d.id}`,
                    value: d.id,
                  }))}
                  placeholder="Choisir le livreur de livraison..."
                  block
                  value={assignDeliveryDriverId}
                  onChange={(val) => setAssignDeliveryDriverId(val)}
                />
              </div>
              <button
                onClick={() =>
                  handleAssignDeliveryDriverBulk(
                    selectedAtDepotIds.length > 0
                      ? selectedAtDepotIds
                      : unassignedAtDepotDeliveries.map((d) => d.id),
                    assignDeliveryDriverId
                  )
                }
                style={{
                  background: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 16px",
                  fontWeight: 800,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaTruck /> Affecter au Livreur (
                {selectedAtDepotIds.length > 0
                  ? selectedAtDepotIds.length
                  : unassignedAtDepotDeliveries.length}{" "}
                colis)
              </button>
            </div>
          </div>

          {atDepotDeliveries.length === 0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                background: "#f8fafc",
                borderRadius: "10px",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              Aucun colis en stock au dépôt pour le moment. Réceptionnez d'abord les colis à l'Étape 2.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                className="tawsil-data-table"
                style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 12px", width: "40px" }}></th>
                    <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>COLIS & CLIENT</th>
                    <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>DESTINATION</th>
                    <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>BOUTIQUE</th>
                    <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>MONTANT</th>
                    <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>LIVREUR AFFECTÉ</th>
                    <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569", textAlign: "right" }}>RETOUR / REMB.</th>
                  </tr>
                </thead>
                <tbody>
                  {atDepotDeliveries.map((del) => {
                    const checked = selectedAtDepotIds.includes(del.id);
                    const storeObj = storesList.find(
                      (s) => Number(s.id) === Number(del.eStoreId ?? del.storeId)
                    );
                    const delivDrvId = getDeliveryDriverId(del);

                    return (
                      <tr
                        key={del.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: checked ? "#eef2ff" : "#ffffff",
                        }}
                      >
                        <td style={{ padding: "10px 12px" }}>
                          <Checkbox
                            checked={checked}
                            onChange={() =>
                              setSelectedAtDepotIds((prev) =>
                                checked ? prev.filter((id) => id !== del.id) : [...prev, del.id]
                              )
                            }
                          />
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>
                            #{del.qrCodeContent || del.code || del.id} — {del.customer?.fullName || "Client"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#2563eb" }}>
                            {del.customer?.phoneNumber}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                          {del.customer?.city} {del.customer?.deleg ? `· ${del.customer.deleg}` : ""}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#4f46e5", fontWeight: 700 }}>
                          {storeObj ? storeObj.name_fr || storeObj.name : "Boutique"}
                        </td>
                        <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 800 }}>
                          {(Number(del.cost) || 0).toFixed(3)} TND
                        </td>
                        <td style={{ padding: "10px 12px", minWidth: "210px" }}>
                          <SelectPicker
                            data={depotDrivers.map((d) => ({
                              label: `🚚 ${d.firstName || ""} ${d.lastName || ""}`.trim() || d.name || `Livreur #${d.id}`,
                              value: d.id,
                            }))}
                            placeholder="Affecter un livreur..."
                            size="sm"
                            block
                            value={Number(delivDrvId || 0)}
                            onChange={(targetId) => {
                              if (targetId) handleAssignDeliveryDriverBulk([del.id], targetId);
                            }}
                          />
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "5px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleConfirmUndeliveredReturn(del, "final_return")}
                              style={{
                                background: "#f5f3ff",
                                color: "#6d28d9",
                                border: "1px solid #ddd6fe",
                                borderRadius: "6px",
                                padding: "5px 8px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              title="Marquer ce colis comme Retourné Définitivement à la Boutique (ReturnedToSender = 6)"
                            >
                              ↩️ Retour Boutique
                            </button>
                            <button
                              onClick={() => openRefundModal(del)}
                              style={{
                                background: "#fdf2f8",
                                color: "#9d174d",
                                border: "1px solid #fbcfe8",
                                borderRadius: "6px",
                                padding: "5px 8px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                              title="Enregistrer un remboursement (Refund) pour ce colis"
                            >
                              💸 Rembourser
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
      )}

      {/* =====================================================================
          STEP 4: END OF DAY DRIVER SETTLEMENT (TOTAL CASH OF DELIVERIES + SUM OF TARIFS + UNDELIVERED RETURNS)
      ===================================================================== */}
      {activeStep === "end_of_day" && (
        <div>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "16px",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              4. Bilan Fin de Journée des Livreurs (Cash Colis + Frais de Services / Tarifs & Retours)
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              À la fin de la journée, vérifiez pour chaque livreur le total du cash des colis livrés + la somme des frais de service (tarifs), et confirmez la réception au dépôt des colis non livrés.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "16px",
            }}
          >
            {depotDrivers.map((drv) => {
              const drvId = Number(drv.id);
              // Pickups performed by this driver
              const driverPickups = depotDeliveries.filter(
                (d) => Number(getPickupDriverId(d)) === drvId && getOperationalStatus(d) >= 2
              );
              // Deliveries assigned to this driver
              const driverDeliveries = depotDeliveries.filter(
                (d) =>
                  Number(getDeliveryDriverId(d) || getActiveDeliveryDriverId(d)) === drvId &&
                  getOperationalStatus(d) >= 3
              );
              // Delivered parcels by this driver
              const deliveredParcels = driverDeliveries.filter((d) => getDeliveryResult(d) === 1);
              const unpaidDeliveredParcels = deliveredParcels.filter((d) => !d.isPaid);

              // Undelivered parcels held by this driver needing return to depot
              const undeliveredParcels = driverDeliveries.filter((d) => {
                const res = getDeliveryResult(d);
                const op = getOperationalStatus(d);
                return (
                  ((op === 4 && res !== 1) || (res >= 2 && res <= 6)) &&
                  !confirmedReturnIds.includes(d.id)
                );
              });

              // 1. Total Cash of Delivered Parcels (Prices of deliveries)
              const totalDeliveredCashPrices = deliveredParcels.reduce(
                (sum, d) => sum + (Number(d.cost) || 0),
                0
              );
              const unpaidCashPrices = unpaidDeliveredParcels.reduce(
                (sum, d) => sum + (Number(d.cost) || 0),
                0
              );

              // 2. Sum of Service Fees (Tarifs: Pickup fees + Delivery fees)
              const totalPickupTarifs = driverPickups.reduce(
                (sum, d) => sum + getParcelDriverFees(d).pickupFee,
                0
              );
              const totalDeliveryTarifs = deliveredParcels.reduce(
                (sum, d) => sum + getParcelDriverFees(d).deliveryFee,
                0
              );
              const sumOfServiceTarifs = totalPickupTarifs + totalDeliveryTarifs;

              // 3. Total Cash of Deliveries Prices + Sum of Service Fees (Tarifs)
              const totalCombinedEndDay = totalDeliveredCashPrices + sumOfServiceTarifs;

              return (
                <div
                  key={drv.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div>
                    {/* Driver Identity */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background: "#ecfdf5",
                            color: "#059669",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                          }}
                        >
                          <FaTruck />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.96rem", color: "#0f172a" }}>
                            {`${drv.firstName || ""} ${drv.lastName || ""}`.trim() || drv.name}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {drv.carNumber || "Véhicule"} · {drv.phone1 || ""}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "0.74rem",
                          fontWeight: 800,
                        }}
                      >
                        {deliveredParcels.length} livré(s) / {driverDeliveries.length}
                      </span>
                    </div>

                    {/* Financial Breakdown Box: Cash Prices + Service Fees (Tarifs) */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <span style={{ color: "#475569", fontWeight: 600 }}>
                          💵 Total Prix des Colis Livrés ({deliveredParcels.length}) :
                        </span>
                        <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>
                          {totalDeliveredCashPrices.toFixed(3)} TND
                        </strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <span style={{ color: "#475569", fontWeight: 600 }}>
                          🏷️ Somme des Frais de Services (Tarifs) :
                        </span>
                        <strong style={{ fontFamily: "monospace", color: "#2563eb" }}>
                          +{sumOfServiceTarifs.toFixed(3)} TND
                        </strong>
                      </div>

                      <div
                        style={{
                          borderTop: "1px dashed #cbd5e1",
                          paddingTop: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
                          💰 Total (Cash Colis + Tarifs) :
                        </span>
                        <span
                          style={{
                            fontSize: "1rem",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            color: "#059669",
                          }}
                        >
                          {totalCombinedEndDay.toFixed(3)} TND
                        </span>
                      </div>
                    </div>

                    {/* Undelivered Parcels to Return to Depot */}
                    {undeliveredParcels.length > 0 && (
                      <div
                        style={{
                          marginTop: "10px",
                          background: "#fffbeb",
                          border: "1px solid #fde68a",
                          borderRadius: "10px",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 800,
                            color: "#92400e",
                            marginBottom: "6px",
                          }}
                        >
                          ↩️ {undeliveredParcels.length} Colis Non Livré(s) à retourner au dépôt :
                        </div>
                        {undeliveredParcels.map((ud) => (
                          <div
                            key={ud.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: "0.75rem",
                              padding: "4px 0",
                              borderTop: "1px solid #fef3c7",
                            }}
                          >
                            <span>
                              #{ud.qrCodeContent || ud.id} ({ud.customer?.fullName})
                            </span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                onClick={() => handleConfirmUndeliveredReturn(ud, "reschedule")}
                                style={{
                                  background: "#d97706",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "5px",
                                  padding: "3px 7px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Stocker au dépôt pour une autre tentative"
                              >
                                Autre tentative
                              </button>
                              <button
                                onClick={() => handleConfirmUndeliveredReturn(ud, "final_return")}
                                style={{
                                  background: "#7c3aed",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "5px",
                                  padding: "3px 7px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Retour définitif à la boutique (ReturnedToSender = 6)"
                              >
                                ↩️ Retour Boutique
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action button: Confirm Cash Handover */}
                  <div>
                    {unpaidDeliveredParcels.length > 0 ? (
                      <button
                        onClick={() =>
                          handleRenderPaid(
                            unpaidDeliveredParcels.map((d) => d.id),
                            drv.id
                          )
                        }
                        style={{
                          width: "100%",
                          background: "#059669",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "9px 12px",
                          fontWeight: 800,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                        }}
                      >
                        ✓ Confirmer Réception Cash ({unpaidCashPrices.toFixed(3)} TND)
                      </button>
                    ) : (
                      <div
                        style={{
                          background: "#f0fdf4",
                          color: "#15803d",
                          border: "1px solid #bbf7d0",
                          borderRadius: "8px",
                          padding: "8px",
                          textAlign: "center",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                        }}
                      >
                        ✓ Caisse du jour clôturée
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 5: END OF DAY RECAP OF STORES IN THIS DEPOT (AMOUNT TO GET + FINAL RETURNED COLIS)
      ===================================================================== */}
      {activeStep === "stores_recap" && (
        <div>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                5. Récap Fin de Journée des Boutiques du Dépôt ({depotStores.length} boutiques)
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Montant net à remettre à chaque boutique de votre dépôt et liste des colis retournés définitivement (hors colis reportés pour une autre tentative).
              </p>
            </div>

            {/* Filter by Store Bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: "250px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
                  Filtrer par Boutique :
                </span>
                <SelectPicker
                  data={[
                    {
                      label: `Toutes les Boutiques du Dépôt (${depotStores.length})`,
                      value: 0,
                    },
                  ].concat(
                    depotStores.map((s) => ({
                      label: `🏪 ${s.name_fr || s.name || `Boutique #${s.id}`}`,
                      value: s.id,
                    }))
                  )}
                  searchable={true}
                  cleanable={false}
                  style={{ width: "260px" }}
                  value={recapSelectedStoreId}
                  onSelect={(val) => setRecapSelectedStoreId(val ?? 0)}
                />
              </div>

              <div style={{ minWidth: "200px" }}>
                <Input
                  placeholder="Rechercher une boutique..."
                  value={recapStoreSearch}
                  onChange={(val) => setRecapStoreSearch(val)}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "16px",
            }}
          >
            {depotStores
              .filter((store) => {
                if (recapSelectedStoreId && Number(recapSelectedStoreId) > 0) {
                  if (Number(store.id) !== Number(recapSelectedStoreId)) return false;
                }
                if (recapStoreSearch.trim()) {
                  const q = recapStoreSearch.toLowerCase().trim();
                  const name = (store.name_fr || store.name || "").toLowerCase();
                  const addr = (store.contacts?.[0]?.address || store.address || "").toLowerCase();
                  return name.includes(q) || addr.includes(q);
                }
                return true;
              })
              .map((store) => {
              const storeId = Number(store.id);
              const storeDeliveries = depotDeliveries.filter(
                (d) => Number(d.eStoreId ?? d.storeId ?? d.EStoreId) === storeId
              );

              // Delivered parcels for this store
              const deliveredStoreColis = storeDeliveries.filter(
                (d) => getDeliveryResult(d) === 1 || d.isPaid || d.status === 5
              );

              // Final returned parcels to store (Result === 6 ReturnedToSender or finalReturnToStore === true)
              // Explicitly excludes delayed/rescheduled parcels kept at depot for another iteration
              const finalReturnedColis = storeDeliveries.filter(
                (d) =>
                  (getDeliveryResult(d) === 6 || d.finalReturnToStore === true) &&
                  !d.rescheduledForDelivery
              );

              // Delayed / rescheduled parcels kept at depot for next iteration
              const delayedColis = storeDeliveries.filter(
                (d) =>
                  d.rescheduledForDelivery === true ||
                  (getDeliveryResult(d) >= 2 &&
                    getDeliveryResult(d) <= 5 &&
                    !d.finalReturnToStore)
              );

              let grossDeliveredTotal = 0;
              let storeDeliveryTarifs = 0;
              let storeReturnTarifs = 0;

              deliveredStoreColis.forEach((del) => {
                grossDeliveredTotal += Number(del.cost) || 0;
                const matchedTarif =
                  del.tarif ||
                  del.Tarif ||
                  tarifsList.find((t) => Number(t.id) === Number(del.tarifId ?? del.TarifId));
                storeDeliveryTarifs += Number(
                  matchedTarif?.tarifDelivery ?? del.tarifDelivery ?? 7
                );
              });

              finalReturnedColis.forEach((del) => {
                const matchedTarif =
                  del.tarif ||
                  del.Tarif ||
                  tarifsList.find((t) => Number(t.id) === Number(del.tarifId ?? del.TarifId));
                storeReturnTarifs += Number(
                  matchedTarif?.commissionReturn ?? del.commissionReturn ?? 3
                );
              });

              const netAmountToGet = Math.max(
                0,
                grossDeliveredTotal - storeDeliveryTarifs - storeReturnTarifs
              );

              const phone = store.contacts?.[0]?.phones || store.phone || "";
              const address = store.contacts?.[0]?.address || store.address || "";

              return (
                <div
                  key={store.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "14px",
                    border: "1px solid #e2e8f0",
                    padding: "18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <div>
                    {/* Store Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "10px",
                            background: "#f5f3ff",
                            color: "#7c3aed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                          }}
                        >
                          <FaStore />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.96rem", color: "#0f172a" }}>
                            {store.name_fr || store.name || `Boutique #${store.id}`}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                            {address} {phone ? `· ${phone}` : ""}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          background: "#f1f5f9",
                          color: "#334155",
                          padding: "4px 8px",
                          borderRadius: "8px",
                          fontSize: "0.74rem",
                          fontWeight: 800,
                        }}
                      >
                        {storeDeliveries.length} colis
                      </span>
                    </div>

                    {/* Financial Recap Breakdown */}
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "7px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                        <span style={{ color: "#475569", fontWeight: 600 }}>
                          ✓ Colis Livrés ({deliveredStoreColis.length}) :
                        </span>
                        <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>
                          {grossDeliveredTotal.toFixed(3)} TND
                        </strong>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                        <span style={{ color: "#64748b" }}>
                          − Frais Livraison ({storeDeliveryTarifs.toFixed(1)}) & Retours ({storeReturnTarifs.toFixed(1)}) :
                        </span>
                        <strong style={{ fontFamily: "monospace", color: "#dc2626" }}>
                          -{(storeDeliveryTarifs + storeReturnTarifs).toFixed(3)} TND
                        </strong>
                      </div>

                      <div
                        style={{
                          borderTop: "1px dashed #cbd5e1",
                          paddingTop: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>
                          💰 Montant Net à Recevoir :
                        </span>
                        <span
                          style={{
                            fontSize: "1.02rem",
                            fontWeight: 900,
                            fontFamily: "monospace",
                            color: "#059669",
                          }}
                        >
                          {netAmountToGet.toFixed(3)} TND
                        </span>
                      </div>
                    </div>

                    {/* Final Returned Parcels vs Delayed Parcels */}
                    <div
                      style={{
                        marginTop: "10px",
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          background: finalReturnedColis.length > 0 ? "#f5f3ff" : "#f8fafc",
                          border:
                            finalReturnedColis.length > 0
                              ? "1px solid #ddd6fe"
                              : "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "8px 10px",
                        }}
                      >
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#6d28d9" }}>
                          ↩️ Retours Définitifs Boutique
                        </div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#4c1d95", marginTop: "2px" }}>
                          {finalReturnedColis.length} colis
                        </div>
                      </div>

                      <div
                        style={{
                          flex: 1,
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "8px",
                          padding: "8px 10px",
                        }}
                      >
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#1d4ed8" }}>
                          ⏳ Reportés (Autre tentative)
                        </div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#1e3a8a", marginTop: "2px" }}>
                          {delayedColis.length} colis
                        </div>
                      </div>
                    </div>

                    {finalReturnedColis.length > 0 && (
                      <div
                        style={{
                          marginTop: "8px",
                          background: "#faf5ff",
                          border: "1px solid #e9d5ff",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          fontSize: "0.74rem",
                          color: "#581c87",
                        }}
                      >
                        <strong>Colis à rendre définitivement à la boutique :</strong>
                        {finalReturnedColis.map((rc) => (
                          <div key={rc.id} style={{ marginTop: "3px" }}>
                            • #{rc.qrCodeContent || rc.id} — {rc.customer?.fullName || "Client"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ENREGISTRER UN REMBOURSEMENT (REFUND) */}
      <Modal
        size="sm"
        open={Boolean(refundModalDelivery)}
        onClose={() => setRefundModalDelivery(null)}
      >
        <Modal.Header>
          <Modal.Title>
            💸 Rembourser le Colis #{refundModalDelivery?.qrCodeContent || refundModalDelivery?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Montant Remboursé (TND) :
              </label>
              <Input
                type="number"
                value={refundAmountVal}
                onChange={(v) => setRefundAmountVal(v)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Motif du Remboursement (RefundCause) :
              </label>
              <SelectPicker
                data={RefundCauseOptions}
                searchable={false}
                cleanable={false}
                block
                value={refundCauseVal}
                onChange={(v) => setRefundCauseVal(v ?? 1)}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", display: "block", marginBottom: "4px" }}>
                Description / Commentaire :
              </label>
              <Input
                as="textarea"
                rows={2}
                placeholder="Précisez la cause du remboursement..."
                value={refundCauseDescVal}
                onChange={(v) => setRefundCauseDescVal(v)}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            onClick={handleSaveDepotRefund}
            style={{
              background: "#be185d",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "8px 16px",
              fontWeight: 800,
              fontSize: "0.82rem",
              cursor: "pointer",
              marginRight: "8px",
            }}
          >
            ✓ Confirmer le Remboursement
          </button>
          <button
            onClick={() => setRefundModalDelivery(null)}
            style={{
              background: "#f1f5f9",
              color: "#475569",
              border: "none",
              borderRadius: "8px",
              padding: "8px 14px",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
