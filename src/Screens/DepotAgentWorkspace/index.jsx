import React, { useEffect, useRef, useState } from "react";
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
  FaQrcode,
  FaBarcode,
  FaCamera,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import { APi } from "../../Api";
import { ENDPOINTS } from "../../Api/enpoints";
import { pushDriverNotification } from "../../Notifications/signalR";
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
  getActiveDeliveryDriver,
  getActiveDeliveryDriverId,
  getDeliveryTotalPrice,
  getDeliveryAttempts,
  isDeliveryDelivered,
  canRefundDelivery,
  canReturnToStore,
  canResendDelivery,
  buildResentDeliveryState,
  saveDeliveryLifecycleOverride,
  applyDeliveryLifecycleOverride,
  setStoredDeliveryAttempts,
  parseDeliveryLogs,
  appendDeliveryLog,
  getStoredMaxDeliveryAttempts,
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
  // 2. "depot_reception" -> Confirmer la réception au dépôt PAR SCANNER UNIQUEMENT (Colis ramassés + Retours non livrés)
  // 3. "assign_delivery" -> Affecter un livreur de livraison aux colis reçus au dépôt
  // 4. "end_of_day"      -> Clôture Fin de Journée Livreurs (Cash + Tarifs + Réception Retours)
  // 5. "stores_recap"    -> Récap Fin de Journée des Boutiques du Dépôt (Montant net à remettre + Colis retournés définitifs)
  const [activeStep, setActiveStep] = useState("store_pickups");

  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [maxDeliveryAttempts, setMaxDeliveryAttempts] = useState(() =>
    getStoredMaxDeliveryAttempts()
  );

  // Step 2: Scanner-only reception state
  const [depotScanCode, setDepotScanCode] = useState("");
  const scanInputCode = depotScanCode;
  const setScanInputCode = setDepotScanCode;
  const [lastScannedReception, setLastScannedReception] = useState(null);
  const [depotCameraActive, setDepotCameraActive] = useState(false);
  const [depotCameraError, setDepotCameraError] = useState("");
  const depotVideoRef = useRef(null);
  const depotStreamRef = useRef(null);
  const depotScanTimerRef = useRef(null);
  const depotScanInputRef = useRef(null);
  const scanInputRef = depotScanInputRef;
  const depotAutoValidateTimeoutRef = useRef(null);
  const depotGlobalBufferRef = useRef("");
  const depotLastKeystrokeRef = useRef(0);

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
    if (!canRefundDelivery(del)) {
      Swal.fire({
        icon: "warning",
        title: "Remboursement Non Autorisé",
        html: isDeliveryDelivered(del)
          ? "Impossible de rembourser une livraison déjà <b>livrée</b>.<br/>Le remboursement s'applique uniquement aux <b>colis perdus ou endommagés</b>."
          : "Ce colis ne peut pas être remboursé (non ramassé, déjà retourné à la boutique ou déjà remboursé).",
      });
      return;
    }
    const defaultAmt = Number(del?.refundAmount ?? del?.RefundAmount ?? del?.cost) || getDeliveryTotalPrice(del);
    setRefundModalDelivery(del);
    setRefundAmountVal(defaultAmt);
    setRefundCauseVal(Number(del?.refundCause ?? del?.RefundCause) || 1);
    setRefundCauseDescVal(
      del?.refundCauseDescription ?? del?.RefundCauseDescription ?? "Colis perdu / endommagé"
    );
  };

  const handleSaveDepotRefund = () => {
    if (!refundModalDelivery) return;
    if (!canRefundDelivery(refundModalDelivery)) {
      Swal.fire({
        icon: "error",
        title: "Remboursement Interdit",
        html: "Impossible de rembourser un colis déjà livré.<br/>Nous remboursons uniquement les <b>colis perdus ou endommagés</b>.",
      });
      return;
    }
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

    APi.createAPIEndpoint(ENDPOINTS.GeneralConfig)
      .customGet()
      .then((res) => {
        if (res?.data) {
          const maxAtt = Number(res.data.maxDeliveryAttempts ?? res.data.MaxDeliveryAttempts);
          if (maxAtt >= 1) setMaxDeliveryAttempts(maxAtt);
          try {
            localStorage.setItem("tawsil_general_config", JSON.stringify(res.data));
          } catch (e) {}
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
        const rows = (res.data?.data || res.data || []).map((el) => {
          const withOverride = applyDeliveryLifecycleOverride(el);
          return {
            ...withOverride,
            cost: getDeliveryTotalPrice(withOverride),
          };
        });
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

  const stopDepotCamera = () => {
    if (depotScanTimerRef.current) {
      clearInterval(depotScanTimerRef.current);
      depotScanTimerRef.current = null;
    }
    if (depotStreamRef.current) {
      depotStreamRef.current.getTracks().forEach((t) => t.stop());
      depotStreamRef.current = null;
    }
    setDepotCameraActive(false);
  };

  useEffect(() => {
    return () => stopDepotCamera();
  }, []);

  const startDepotCamera = async () => {
    setDepotCameraError("");
    setDepotCameraActive(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setDepotCameraError("Caméra non supportée dans ce navigateur. Utilisez la douchette ou le champ de scan.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      depotStreamRef.current = stream;
      if (depotVideoRef.current) {
        depotVideoRef.current.srcObject = stream;
        await depotVideoRef.current.play();
        if ("BarcodeDetector" in window) {
          try {
            const detector = new window.BarcodeDetector({
              formats: ["qr_code", "code_128", "ean_13", "code_39"],
            });
            depotScanTimerRef.current = setInterval(async () => {
              if (!depotVideoRef.current || depotVideoRef.current.readyState < 2) return;
              try {
                const barcodes = await detector.detect(depotVideoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  const rawCode = barcodes[0].rawValue;
                  stopDepotCamera();
                  setDepotScanCode(rawCode);
                  handleScanDepotReception(rawCode);
                }
              } catch (e) {}
            }, 450);
          } catch (e) {}
        }
      }
    } catch (err) {
      setDepotCameraError("Accès caméra refusé. Utilisez votre lecteur code-barres USB ou saisissez le code scanné.");
    }
  };

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
  // Note: Assigning a driver notifies the driver via SignalR (Delivery/changeDriver),
  // while the actual Pickup (isPickedUp = true, status = 2) is done ONLY by the Driver via Scanner at the store!
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

    const chosenDriver =
      depotDrivers.find((d) => Number(d.id) === driverId) ||
      drivers.find((d) => Number(d.id) === driverId);
    const targetIds = targetDeliveries.map((d) => d.id);
    const driverFullName = chosenDriver
      ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}`.trim()
      : `Livreur #${driverId}`;
    const storeName = storeCard.store.name_fr || storeCard.store.name || `Boutique #${storeId}`;

    // Call Delivery/changeDriver so backend assigns driver AND sends SignalR "ReceiveNotification" to Driver_{driverId}
    try {
      await APi.createAPIEndpoint(ENDPOINTS.Delivery + "/changeDriver").create({
        driverId: Number(driverId),
        deliveries: targetIds,
      });
    } catch (e) {}

    // Push notification to driver notification feed as well
    pushDriverNotification({
      driverId,
      title: `📦 Ramassage Boutique : ${storeName}`,
      message: `${driverFullName} : ${targetIds.length} livraisons ont été assignées pour ramassage chez ${storeName}. Scannez les colis en boutique (vous pouvez aussi scanner les colis supplémentaires préparés tardivement).`,
      type: "pickup_assignment",
      storeName,
      count: targetIds.length,
    });

    setDeliveries((prev) =>
      prev.map((d) =>
        targetIds.includes(d.id)
          ? {
              ...d,
              driverId,
              pickupDriverId: driverId,
              pickupDriver: chosenDriver || d.pickupDriver,
            }
          : d
      )
    );

    // Reset selection for this store
    setStorePickupConfig((prev) => ({
      ...prev,
      [storeId]: {
        driverId,
        count: scCountFallback(available.length, targetIds.length),
        selectedIds: [],
      },
    }));

    Swal.fire({
      icon: "success",
      title: "Chauffeur Notifié pour Ramassage !",
      html: `<b>${targetIds.length} colis</b> de <b>${storeName}</b> ont été assignés à <b>${driverFullName}</b>.<br/><span style="font-size:0.84rem;color:#1e40af;display:block;margin-top:6px;">🔔 Notification envoyée au livreur.<br/>📷 Le livreur validera le ramassage (ainsi que tout colis supplémentaire prêt en boutique) par <b>Scanner QR</b>.</span>`,
      timer: 2800,
      showConfirmButton: false,
    });
  };

  const scCountFallback = (availLen, assignedLen) => Math.max(1, availLen - assignedLen);

  // --- STEP 2 SCANNER-ONLY HANDLER: Scan a parcel QR/Barcode at the Depot ---
  const handleScanDepotReception = async (rawCodeOrEvent) => {
    if (rawCodeOrEvent && typeof rawCodeOrEvent.preventDefault === "function") {
      rawCodeOrEvent.preventDefault();
    }
    const rawCodeInput =
      typeof rawCodeOrEvent === "string" ? rawCodeOrEvent : depotScanCode;
    const clean = String(rawCodeInput ?? "").replace(/^#/, "").trim();
    if (!clean) {
      Swal.fire("Code requis", "Veuillez scanner un code-barres / QR code de colis.", "warning");
      return;
    }

    // 1. Search in local depot deliveries first
    let found = depotDeliveries.find(
      (d) =>
        String(d.qrCodeContent || "").trim() === clean ||
        String(d.code || "").trim() === clean ||
        String(d.id) === clean
    );

    // 2. If not in local state yet, query backend getByCode
    if (!found) {
      try {
        const res = await APi.createAPIEndpoint(
          `${ENDPOINTS.Delivery}/getByCode/${encodeURIComponent(clean)}`
        ).customGet();
        if (res?.data) {
          found = { ...res.data, cost: getDeliveryTotalPrice(res.data) };
        }
      } catch (e) {}
    }

    if (!found) {
      Swal.fire({
        icon: "error",
        title: "Colis Introuvable",
        text: `Aucun colis ne correspond au code scanné : ${clean}`,
      });
      return;
    }

    setDepotScanCode("");
    const op = getOperationalStatus(found);
    const resVal = getDeliveryResult(found);
    const attempts = getDeliveryAttempts(found);
    const isUndeliveredReturn =
      (resVal >= 2 && resVal <= 5) ||
      Boolean(found.returnedToDepotByDriver || found.pendingDepotReturn);

    // Case A: Undelivered parcel returning from a driver tour
    if (isUndeliveredReturn) {
      const reachedMax = attempts >= maxDeliveryAttempts;
      if (!reachedMax) {
        // Iterations < maxDeliveryAttempts: Return to Store is NOT allowed; automatically receive at depot for next attempt
        handleConfirmUndeliveredReturn(found, "reschedule");
        return;
      }
      Swal.fire({
        title: `📷 Retour Scanné — Colis #${found.qrCodeContent || found.id}`,
        html: `
          <div style="text-align:left;font-size:0.9rem;line-height:1.5;">
            <div><b>Client :</b> ${found.customer?.fullName || "Client"} (${found.customer?.city || ""})</div>
            <div><b>Tentatives effectuées :</b> <span style="font-weight:800;color:#dc2626;">${attempts} / ${maxDeliveryAttempts}</span></div>
            <div style="margin-top:8px;padding:8px 10px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-weight:700;">
              ⚠️ Nombre maximum de tentatives atteint (${attempts}/${maxDeliveryAttempts}) !<br/>
              Ce colis est au dépôt avec le nombre maximal d'itérations : vous pouvez confirmer le <b>Retour Définitif à la Boutique</b>.
            </div>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#7c3aed",
        confirmButtonText: `↩️ Retour Définitif Boutique (${attempts}/${maxDeliveryAttempts})`,
        cancelButtonText: "Annuler",
      }).then((choice) => {
        if (choice.isConfirmed) {
          handleConfirmUndeliveredReturn(found, "final_return");
        }
      });
      return;
    }

    // Case B: Parcel picked up from store (or arriving at depot) -> Confirm Arrival at Depot & credit Pickup Tariff to Driver
    if (op >= 3 && (found.isAtDepot || verifiedPickupIds.includes(found.id))) {
      Swal.fire({
        icon: "info",
        title: "Déjà Réceptionné au Dépôt",
        text: `Le colis #${found.qrCodeContent || found.id} est déjà confirmé en stock au dépôt (Étape 3).`,
      });
      return;
    }

    await handleConfirmReceptionAtDepot([found]);
  };

  // --- AUTO-VALIDATION FOR BLUETOOTH / USB DOUCHETTE & TYPED MATCH ---
  const handleDepotScanInputChange = (val) => {
    setDepotScanCode(val);
    if (depotAutoValidateTimeoutRef.current) {
      clearTimeout(depotAutoValidateTimeoutRef.current);
    }
    const clean = String(val || "").replace(/^#/, "").trim();
    if (!clean || clean.length < 3) return;

    // Immediate auto-validation if exact match with a known parcel QR/code in the depot pool
    const exactMatch = depotDeliveries.find(
      (d) =>
        String(d.qrCodeContent || "").trim().toLowerCase() === clean.toLowerCase() ||
        String(d.code || "").trim().toLowerCase() === clean.toLowerCase()
    );
    if (exactMatch) {
      depotAutoValidateTimeoutRef.current = setTimeout(() => {
        handleScanDepotReception(clean);
      }, 120);
      return;
    }

    // Fallback auto-validation after short pause (350ms) when a Bluetooth/USB scanner finishes bursting characters without Enter
    if (clean.length >= 6) {
      depotAutoValidateTimeoutRef.current = setTimeout(() => {
        handleScanDepotReception(clean);
      }, 380);
    }
  };

  // Global HID Keyboard-Wedge listener so Bluetooth/USB Douchette works hands-free even if the input isn't focused
  useEffect(() => {
    if (activeStep !== "depot_reception") return;
    const onGlobalKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const now = Date.now();
      if (now - depotLastKeystrokeRef.current > 150) {
        depotGlobalBufferRef.current = "";
      }
      depotLastKeystrokeRef.current = now;

      if (e.key === "Enter" || e.key === "Tab") {
        if (depotGlobalBufferRef.current.trim().length >= 2) {
          e.preventDefault();
          const scanned = depotGlobalBufferRef.current.trim();
          depotGlobalBufferRef.current = "";
          setDepotScanCode(scanned);
          handleScanDepotReception(scanned);
        }
        return;
      }

      if (e.key && e.key.length === 1) {
        depotGlobalBufferRef.current += e.key;
        const currentBuf = depotGlobalBufferRef.current;
        setDepotScanCode(currentBuf);
        if (depotAutoValidateTimeoutRef.current) {
          clearTimeout(depotAutoValidateTimeoutRef.current);
        }
        depotAutoValidateTimeoutRef.current = setTimeout(() => {
          if (depotGlobalBufferRef.current.trim().length >= 3) {
            const finalCode = depotGlobalBufferRef.current.trim();
            depotGlobalBufferRef.current = "";
            handleScanDepotReception(finalCode);
          }
        }, 220);
      }
    };
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [activeStep, depotDeliveries]);

  // --- STEP 2A ACTION: Confirm Reception at Depot of Scanned Picked-up Deliveries ---
  const handleConfirmReceptionAtDepot = async (deliveryList) => {
    if (!deliveryList || deliveryList.length === 0) return;

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

    // Credit pickup tariff to the pickup driver's solde upon confirmed arrival at depot
    deliveryList.forEach((del) => {
      const pDrvId = Number(getPickupDriverId(del) || del.driverId || 0);
      if (pDrvId) {
        const { pickupFee } = getParcelDriverFees(del);
        setDriversList((prev) =>
          prev.map((drv) =>
            Number(drv.id) === pDrvId
              ? {
                  ...drv,
                  solde: (Number(drv.solde ?? drv.Solde) || 0) + pickupFee,
                  Solde: (Number(drv.solde ?? drv.Solde) || 0) + pickupFee,
                }
              : drv
          )
        );
      }
    });

    markPickupVerified(ids);

    setDeliveries((prev) =>
      prev.map((d) => {
        if (!ids.includes(d.id)) return d;
        const nextLogs = appendDeliveryLog(
          d,
          `Réception au Dépôt (Scan QR) | Dépôt: ${activeDepot.name} | Statut ➔ 3 (Au Dépôt, isAtDepot = true)`
        );
        return {
          ...d,
          preparationPlaceId: placeId,
          status: 3,
          operationalStatus: 3,
          isPickedUp: true,
          isAtDepot: true,
          atDepotConfirmedBy: agentId,
          atDepotConfirmedDate: nowIso,
          logs: nextLogs,
        };
      })
    );

    setSelectedReceptionIds((prev) => prev.filter((id) => !ids.includes(id)));

    const firstDel = deliveryList[0];
    setLastScannedReception({
      code: firstDel.qrCodeContent || firstDel.code || firstDel.id,
      customer: firstDel.customer?.fullName || "Client",
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      type: "pickup_reception",
    });
    const { pickupFee } = getParcelDriverFees(firstDel);
    Swal.fire({
      icon: "success",
      title: "📷 Scan Validé : Réception au Dépôt Confirmée !",
      html: `Colis <b>#${firstDel.qrCodeContent || firstDel.id}</b> réceptionné dans <b>${activeDepot.name}</b>.<br/><span style="color:#059669;font-weight:700;">+${pickupFee.toFixed(3)} TND (Tarif Pickup) crédité au solde du livreur ramasseur.</span><br/>Statut ➔ <b>Étape 3 : Au Dépôt</b>.`,
      timer: 2400,
      showConfirmButton: false,
    });
  };

  // --- STEP 2B ACTION: Confirm Reception at Depot of Undelivered Returned Parcels ---
  const handleConfirmUndeliveredReturn = async (del, actionType = "reschedule") => {
    // actionType: "reschedule" (keep at depot for another delivery iteration) | "final_return" (final return to store)
    const attempts = getDeliveryAttempts(del);
    if (actionType === "final_return" && attempts < maxDeliveryAttempts) {
      Swal.fire({
        icon: "warning",
        title: "Retour Boutique Non Autorisé",
        html: `Le retour à la boutique s'applique uniquement lorsque le colis est au dépôt et que le nombre d'itérations atteint le maximum configuré (<b>${attempts} / ${maxDeliveryAttempts} tentative(s)</b>).<br/>Veuillez stocker ce colis au dépôt pour la prochaine tentative.`,
      });
      return;
    }
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

    if (actionType === "reschedule") {
      // Reset old lifecycle fields, keep ONLY logs text for old lifecycle, and increment deliveryAttemptCount
      const resentDel = buildResentDeliveryState(del, null, null, maxDeliveryAttempts);
      setLastScannedReception({
        code: del.qrCodeContent || del.code || del.id,
        customer: del.customer?.fullName || "Client",
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        type: "return_reschedule",
      });

      setDeliveries((prev) =>
        prev.map((d) => (d.id === del.id ? resentDel : d))
      );

      Swal.fire({
        icon: "success",
        title: `Retour au Dépôt Confirmé — Tentative ${resentDel.deliveryAttemptCount}/${maxDeliveryAttempts}`,
        html: `Le colis <b>#${del.qrCodeContent || del.id}</b> est remis en stock au dépôt (<b>Étape 3</b>) pour un nouveau cycle.<br/><span style="color:#475569;font-size:0.84rem;">Ancien cycle archivé dans <code>logs</code>, état réinitialisé et compteur incrémenté (<b>${resentDel.deliveryAttemptCount}/${maxDeliveryAttempts}</b>). Affectez maintenant un nouveau livreur à l'Étape 3.</span>`,
        timer: 2600,
        showConfirmButton: false,
      });
      return;
    }

    const nextLogs = appendDeliveryLog(
      del,
      `Retour Définitif Boutique (Scan Dépôt) | Tentatives: ${getDeliveryAttempts(
        del
      )}/${maxDeliveryAttempts} | Result ➔ 6 (ReturnedToSender)`
    );

    const finalReturnPatch = {
      status: 5,
      operationalStatus: 5,
      OperationalStatus: 5,
      result: 6,
      Result: 6,
      isAtDepot: true,
      finalReturnToStore: true,
      rescheduledForDelivery: false,
      attemptIncrementedForCycle: false,
      waitToReturnToSenderDate: nowIso,
      logs: nextLogs,
      Logs: nextLogs,
    };
    saveDeliveryLifecycleOverride(del.id, finalReturnPatch);

    setLastScannedReception({
      code: del.qrCodeContent || del.code || del.id,
      customer: del.customer?.fullName || "Client",
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      type: "final_return",
    });

    setDeliveries((prev) =>
      prev.map((d) =>
        d.id === del.id
          ? {
              ...d,
              ...finalReturnPatch,
            }
          : d
      )
    );

    Swal.fire({
      icon: "success",
      title: "Retour Définitif Boutique Confirmé",
      html: `Le colis <b>#${del.qrCodeContent || del.id}</b> est enregistré en <b>Retour Définitif à la Boutique (Result = 6)</b>.<br/><span style="color:#dc2626;font-weight:700;">Le tarif de retour est appliqué sur le récap de la boutique.</span>`,
      timer: 2400,
      showConfirmButton: false,
    });
  };

  // --- Direct Resend with New Driver after Completed Cycle ---
  const handleResendDeliveryWithNewDriver = (del) => {
    const currentAttempts = getDeliveryAttempts(del);
    if (currentAttempts >= maxDeliveryAttempts) {
      Swal.fire({
        icon: "warning",
        title: "Nombre Maximum de Tentatives Atteint",
        html: `Ce colis a déjà atteint <b>${currentAttempts}/${maxDeliveryAttempts} tentative(s)</b>.<br/>Veuillez procéder au <b>Retour Boutique</b>.`,
      });
      return;
    }

    const options = (depotDrivers.length > 0 ? depotDrivers : drivers).reduce((acc, d) => {
      const name = `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.name || `Livreur #${d.id}`;
      acc[d.id] = `${name} (${d.carNumber || "Véhicule"})`;
      return acc;
    }, {});

    const oldDriver = getActiveDeliveryDriver(del);
    const oldDriverName = oldDriver
      ? `${oldDriver.firstName || ""} ${oldDriver.lastName || ""}`.trim() || oldDriver.name
      : "Non spécifié";
    const oldResVal = getDeliveryResult(del);
    const oldResLabel =
      DeliveryResultOptions.find((o) => o.value === oldResVal)?.shortLabel ||
      DeliveryResultOptions.find((o) => o.value === oldResVal)?.label ||
      "Cycle terminé";
    const nextAttempts = currentAttempts + 1;

    Swal.fire({
      title: `🔄 Renvoyer le Colis #${del.qrCodeContent || del.code || del.id}`,
      html: `
        <div style="text-align:left; font-size:0.84rem; color:#334155; line-height:1.5;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; margin-bottom:10px;">
            <div><strong>Ancien cycle :</strong> ${oldResLabel} (Livreur : ${oldDriverName})</div>
            <div><strong>Nouvelle tentative :</strong> <span style="color:#4f46e5; font-weight:800;">${currentAttempts} ➔ ${nextAttempts} / ${maxDeliveryAttempts}</span> (<code>deliveryAttemptCount = ${nextAttempts}</code>)</div>
            <div style="font-size:0.76rem; color:#64748b; margin-top:4px;">
              ℹ️ Seul le texte du journal (<code>logs</code>) de l'ancien cycle est conservé. L'état du colis est réinitialisé au dépôt avec le nouveau livreur.
            </div>
          </div>
          <label style="font-weight:700; color:#0f172a;">Sélectionnez le nouveau livreur de livraison :</label>
        </div>
      `,
      input: "select",
      inputOptions: options,
      inputValue: "",
      inputPlaceholder: "Choisir le nouveau livreur...",
      showCancelButton: true,
      confirmButtonText: `🔄 Affecter & Renvoyer (Tentative ${nextAttempts}/${maxDeliveryAttempts})`,
      confirmButtonColor: "#4f46e5",
      cancelButtonText: "Annuler",
      inputValidator: (val) => {
        if (!val) return "Veuillez sélectionner un nouveau livreur.";
        return null;
      },
    }).then((res) => {
      if (!res.isConfirmed || !res.value) return;
      const drvId = Number(res.value);
      const chosenDriver =
        depotDrivers.find((d) => Number(d.id) === drvId) ||
        drivers.find((d) => Number(d.id) === drvId);
      const drvFullName = chosenDriver
        ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}`.trim() || chosenDriver.name
        : `Livreur #${drvId}`;

      markReturnConfirmed([del.id]);
      const resentRow = buildResentDeliveryState(del, drvId, chosenDriver, maxDeliveryAttempts);

      pushDriverNotification({
        driverId: drvId,
        title: `🚚 Renvoi Livraison (${activeDepot.name})`,
        message: `${drvFullName} : Colis #${del.qrCodeContent || del.id} réaffecté pour une nouvelle tentative (${nextAttempts}/${maxDeliveryAttempts}).`,
        type: "delivery_assignment",
        count: 1,
      });

      Promise.allSettled([
        APi.createAPIEndpoint(ENDPOINTS.Delivery + "/changeDriver").create({
          driverId: drvId,
          deliveries: [del.id],
        }),
        APi.createAPIEndpoint(`${ENDPOINTS.Driver}/${drvId}/assignDelivery/${del.id}`).customPost({
          deliveryAttemptCount: nextAttempts,
          logs: resentRow.logs,
        }),
        APi.createAPIEndpoint(`${ENDPOINTS.Delivery}/changeResult/${del.id}/0`).update2({
          deliveryId: del.id,
          result: 0,
          deliveryAttemptCount: nextAttempts,
          logs: resentRow.logs,
        }),
        APi.createAPIEndpoint(`${ENDPOINTS.Delivery}/changeStatus/${del.id}/3`).update2({
          deliveryAttemptCount: nextAttempts,
          logs: resentRow.logs,
        }),
      ]).finally(() => {
        setDeliveries((prev) =>
          prev.map((d) => (d.id === del.id ? resentRow : d))
        );
        Swal.fire({
          icon: "success",
          title: `Colis Renvoyé — Tentative ${nextAttempts}/${maxDeliveryAttempts} !`,
          html: `Nouveau livreur affecté : <b>${drvFullName}</b>.<br/>Seul le texte <code>logs</code> de l'ancien cycle a été conservé.`,
          timer: 2300,
          showConfirmButton: false,
        });
      });
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

    const chosenDriver =
      depotDrivers.find((d) => Number(d.id) === Number(targetDriverId)) ||
      drivers.find((d) => Number(d.id) === Number(targetDriverId));
    const driverFullName = chosenDriver
      ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}`.trim()
      : `Livreur #${targetDriverId}`;

    try {
      // Call Delivery/changeDriver so backend assigns driver AND triggers SignalR "ReceiveNotification"
      await APi.createAPIEndpoint(ENDPOINTS.Delivery + "/changeDriver").create({
        driverId: Number(targetDriverId),
        deliveries: deliveryIds,
      });
      if (deliveryIds.length === 1) {
        await APi.createAPIEndpoint(
          `${ENDPOINTS.Driver}/${targetDriverId}/assignDelivery/${deliveryIds[0]}`
        )
          .customPost({})
          .catch(() => {});
      }
    } catch (e) {}

    pushDriverNotification({
      driverId: Number(targetDriverId),
      title: `🚚 Affectation Livraison (${activeDepot.name})`,
      message: `${driverFullName} : ${deliveryIds.length} livraisons ont été assignées au dépôt. Scannez les colis pour démarrer votre tournée.`,
      type: "delivery_assignment",
      count: deliveryIds.length,
    });

    setDeliveries((prev) =>
      prev.map((d) => {
        if (!deliveryIds.includes(d.id)) return d;
        const updatedLogs = appendDeliveryLog(
          d,
          `Affectation Livreur au Dépôt (${activeDepot.name}) | Livreur: ${driverFullName} | Tentative N°${Math.max(
            1,
            getDeliveryAttempts(d)
          )}/${maxDeliveryAttempts}`
        );
        const patch = {
          driverId: Number(targetDriverId),
          deliveryDriverId: Number(targetDriverId),
          DeliveryDriverId: Number(targetDriverId),
          driver: chosenDriver || d.driver,
          deliveryDriver: chosenDriver || d.deliveryDriver,
          DeliveryDriver: chosenDriver || d.deliveryDriver,
          preparationPlaceId: activeDepot.id,
          status: 3,
          operationalStatus: 3,
          result: 0,
          logs: updatedLogs,
          Logs: updatedLogs,
        };
        saveDeliveryLifecycleOverride(d.id, patch);
        return {
          ...d,
          ...patch,
        };
      })
    );

    setSelectedAtDepotIds([]);
    Swal.fire({
      icon: "success",
      title: "Livreur de Livraison Affecté & Notifié !",
      html: `<b>${deliveryIds.length} colis</b> ont été affectés à <b>${driverFullName}</b>.<br/><span style="font-size:0.84rem;color:#1e40af;">🔔 Notification envoyée au livreur.<br/>📷 Le livreur scannera ses colis au départ du dépôt (+1 tentative comptabilisée).</span>`,
      timer: 2400,
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
          STEP 2: CONFIRM RECEPTION AT DEPOT (SCANNER-ONLY RECEPTION FOR PICKED UP + DRIVER RETURNS)
      ===================================================================== */}
      {activeStep === "depot_reception" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* SCANNER-ONLY DEPOT RECEPTION TERMINAL */}
          <div
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #047857 100%)",
              border: "2px solid #10b981",
              borderRadius: "14px",
              padding: "20px",
              color: "#ffffff",
              boxShadow: "0 8px 24px rgba(5, 150, 105, 0.18)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      background: "#ecfdf5",
                      color: "#065f46",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    🔒 Réception Dépôt par Scanner Uniquement
                  </span>
                  <span
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      color: "#d1fae5",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                    }}
                  >
                    Max Tentatives Configuré : {maxDeliveryAttempts}
                  </span>
                </div>
                <h3 style={{ margin: "8px 0 2px", fontSize: "1.15rem", fontWeight: 900, color: "#ffffff" }}>
                  Scan Réception au Dépôt — Douchette Bluetooth / USB ou Caméra (Validation Automatique)
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#a7f3d0" }}>
                  Utilisez votre <strong>douchette Bluetooth / USB</strong> (sans clic requis) ou la <strong>caméra</strong> : dès que le code est lu, le colis est <strong>validé automatiquement</strong>.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleScanDepotReception}
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1, minWidth: "240px", position: "relative" }}>
                <FaBarcode
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#059669",
                    fontSize: "1.15rem",
                  }}
                />
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInputCode}
                  onChange={(e) => handleDepotScanInputChange(e.target.value)}
                  placeholder="Douchette Bluetooth / USB prête : scannez et validation 100% automatique..."
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    borderRadius: "10px",
                    border: "2px solid #a7f3d0",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "0.95rem",
                    fontWeight: 800,
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  border: "2px solid #ffffff",
                  borderRadius: "10px",
                  padding: "11px 18px",
                  fontWeight: 900,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <FaQrcode /> Valider Code
              </button>
              <button
                type="button"
                onClick={() => (depotCameraActive ? stopDepotCamera() : startDepotCamera())}
                style={{
                  background: depotCameraActive ? "#ef4444" : "#0f172a",
                  color: "#ffffff",
                  border: "2px solid #a7f3d0",
                  borderRadius: "10px",
                  padding: "11px 18px",
                  fontWeight: 900,
                  fontSize: "0.86rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {depotCameraActive ? (
                  <>
                    <FaTimes /> Fermer Caméra
                  </>
                ) : (
                  <>
                    <FaCamera /> Scanner avec Caméra
                  </>
                )}
              </button>
            </form>

            {depotCameraActive && (
              <div
                style={{
                  marginTop: "12px",
                  background: "#0f172a",
                  border: "2px solid #34d399",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "420px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "2px solid #10b981",
                    background: "#000",
                  }}
                >
                  <video
                    ref={depotVideoRef}
                    muted
                    playsInline
                    style={{ width: "100%", height: "230px", objectFit: "cover", display: "block" }}
                  />
                </div>
                <div style={{ fontSize: "0.78rem", color: "#a7f3d0", fontWeight: 700, textAlign: "center" }}>
                  📷 Présentez le QR Code ou Code-Barres du colis devant la caméra pour réceptionner automatiquement.
                </div>
                {depotCameraError && (
                  <div
                    style={{
                      background: "#fef2f2",
                      color: "#991b1b",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {depotCameraError}
                  </div>
                )}
              </div>
            )}

            {lastScannedReception && (
              <div
                style={{
                  marginTop: "12px",
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.28)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                  fontSize: "0.82rem",
                }}
              >
                <div>
                  <strong>✅ Dernier colis scanné ({lastScannedReception.time}) :</strong> #
                  {lastScannedReception.code} — {lastScannedReception.customer}
                </div>
                <span
                  style={{
                    background: "#ffffff",
                    color: "#065f46",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    fontWeight: 900,
                    fontSize: "0.75rem",
                  }}
                >
                  {lastScannedReception.type === "pickup_reception"
                    ? "Réception Ramassage Confirmée"
                    : lastScannedReception.type === "return_reschedule"
                    ? "Retour Stocké au Dépôt (Nouvelle Tentative)"
                    : "Prêt Retour Définitif Boutique"}
                </span>
              </div>
            )}
          </div>

          {/* SECTION 2A: Picked up from stores -> Confirm Reception at Depot by Scanner */}
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
                  2A. Colis Ramassés en Attente de Scan au Dépôt ({pickedUpWaitingDepot.length})
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Ces colis ont été scannés par le chauffeur chez la boutique (y compris les colis supplémentaires préparés en retard). Scannez chaque colis ci-dessus pour confirmer sa réception physique au dépôt.
                </p>
              </div>
              <span
                style={{
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "0.76rem",
                  fontWeight: 800,
                }}
              >
                📷 Scan Individuel Obligatoire
              </span>
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
                ✓ Tous les colis ramassés ont été scannés et réceptionnés au dépôt.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table
                  className="tawsil-data-table"
                  style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>CODE QR & CLIENT</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>BOUTIQUE</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>LIVREUR PICKUP</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569" }}>MONTANT</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#475569", textAlign: "right" }}>
                        RÉCEPTION PAR SCANNER
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
                      const qrCode = del.qrCodeContent || del.code || String(del.id);

                      return (
                        <tr key={del.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace" }}>
                              #{qrCode} — <span style={{ fontFamily: "inherit" }}>{del.customer?.fullName || "Client"}</span>
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
                              onClick={() => {
                                setScanInputCode(String(qrCode));
                                scanInputRef.current?.focus();
                                Swal.fire({
                                  title: `Scanner le colis #${qrCode}`,
                                  html: `
                                    <div style="text-align:left;font-size:0.88rem;line-height:1.5;">
                                      <p>La réception au dépôt se fait <strong>exclusivement par scan</strong> pour éviter les erreurs.</p>
                                      <p>Le code <strong>#${qrCode}</strong> a été placé dans le lecteur en haut. Appuyez sur <strong>Confirmer le Scan</strong> pour valider la présence physique du colis.</p>
                                    </div>
                                  `,
                                  icon: "info",
                                  showCancelButton: true,
                                  confirmButtonColor: "#059669",
                                  confirmButtonText: "📷 Confirmer le Scan Physique",
                                  cancelButtonText: "Annuler",
                                }).then((r) => {
                                  if (r.isConfirmed) {
                                    handleConfirmReceptionAtDepot([del], { viaScanner: true });
                                    setScanInputCode("");
                                  }
                                });
                              }}
                              style={{
                                background: "#ecfdf5",
                                color: "#047857",
                                border: "1px solid #6ee7b7",
                                borderRadius: "6px",
                                padding: "6px 12px",
                                fontWeight: 800,
                                fontSize: "0.76rem",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <FaQrcode size={12} /> Scanner #{qrCode}
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

          {/* SECTION 2B: Undelivered Parcels Returned by Drivers -> Confirm Reception at Depot by Scanner */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #fde68a",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            <div style={{ marginBottom: "14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#92400e" }}>
                  2B. Réception par Scanner des Colis Non Livrés Retournés par les Livreurs ({undeliveredReturnsWaitingDepot.length})
                </h3>
                <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#b45309" }}>
                  Chaque sortie du livreur compte pour <strong>+1 tentative</strong>. Lorsque le nombre de tentatives atteint la limite configurée (<strong>{maxDeliveryAttempts} tentatives</strong>), le colis passe automatiquement en <strong>Prêt pour Retour Définitif à la Boutique</strong>.
                </p>
              </div>
              <span
                style={{
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  padding: "5px 10px",
                  borderRadius: "8px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                }}
              >
                Seuil Retour Auto : {maxDeliveryAttempts} tentative(s)
              </span>
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
                Aucun colis non livré en attente de scan de retour au dépôt.
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
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e" }}>TENTATIVES</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e" }}>MOTIF / RÉSULTAT</th>
                      <th style={{ padding: "10px 12px", fontSize: "0.75rem", color: "#92400e", textAlign: "right" }}>
                        SCANNER RÉCEPTION RETOUR
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
                      const attempts = Math.max(1, getDeliveryAttempts(del));
                      const reachedMax = attempts >= maxDeliveryAttempts;
                      const qrCode = del.qrCodeContent || del.code || String(del.id);

                      return (
                        <tr
                          key={del.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: reachedMax ? "#fef2f2" : "#ffffff",
                          }}
                        >
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>
                              #{qrCode} — {del.customer?.fullName || "Client"}
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
                                background: reachedMax ? "#fee2e2" : "#e0f2fe",
                                color: reachedMax ? "#991b1b" : "#075985",
                                border: `1px solid ${reachedMax ? "#fca5a5" : "#bae6fd"}`,
                                padding: "3px 9px",
                                borderRadius: "999px",
                                fontSize: "0.74rem",
                                fontWeight: 900,
                                display: "inline-block",
                              }}
                            >
                              {attempts} / {maxDeliveryAttempts} tentatives
                              {reachedMax ? " · Max atteint !" : ""}
                            </span>
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
                                onClick={() => {
                                  setScanInputCode(String(qrCode));
                                  scanInputRef.current?.focus();
                                }}
                                style={{
                                  background: "#ecfdf5",
                                  color: "#047857",
                                  border: "1px solid #6ee7b7",
                                  borderRadius: "6px",
                                  padding: "6px 10px",
                                  fontWeight: 800,
                                  fontSize: "0.74rem",
                                  cursor: "pointer",
                                }}
                                title="Pré-remplir le scanner de réception ci-dessus avec ce code colis"
                              >
                                📷 Scanner #{qrCode}
                              </button>
                              {!reachedMax ? (
                                <>
                                  <button
                                    onClick={() => handleResendDeliveryWithNewDriver(del)}
                                    style={{
                                      background: "#4f46e5",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "6px",
                                      padding: "6px 10px",
                                      fontWeight: 800,
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                    }}
                                    title="Renvoyer ce colis : affecter un nouveau livreur, conserver uniquement les logs de l'ancien cycle et incrémenter les tentatives"
                                  >
                                    🔄 Renvoyer & Affecter Livreur ({attempts}/{maxDeliveryAttempts})
                                  </button>
                                  <button
                                    onClick={() => handleConfirmUndeliveredReturn(del, "reschedule")}
                                    style={{
                                      background: "#2563eb",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "6px",
                                      padding: "6px 10px",
                                      fontWeight: 700,
                                      fontSize: "0.74rem",
                                      cursor: "pointer",
                                    }}
                                    title="Stocker au dépôt pour une autre tentative de livraison"
                                  >
                                    🏢 Stocker ({attempts}/{maxDeliveryAttempts})
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleConfirmUndeliveredReturn(del, "final_return")}
                                  style={{
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    fontWeight: 800,
                                    fontSize: "0.74rem",
                                    cursor: "pointer",
                                  }}
                                  title={`Confirmer comme retour définitif à la boutique (${attempts}/${maxDeliveryAttempts} tentatives atteintes)`}
                                >
                                  ↩️ Retour Boutique ({attempts}/{maxDeliveryAttempts})
                                </button>
                              )}
                              {canRefundDelivery(del) && (
                                <button
                                  onClick={() => openRefundModal(del)}
                                  style={{
                                    background: "#fdf2f8",
                                    color: "#9d174d",
                                    border: "1px solid #fbcfe8",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    fontWeight: 700,
                                    fontSize: "0.74rem",
                                    cursor: "pointer",
                                  }}
                                  title="Rembourser ce colis (uniquement si colis perdu ou endommagé)"
                                >
                                  💸 Rembourser
                                </button>
                              )}
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
                            {canReturnToStore(del, maxDeliveryAttempts) && (
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
                                title={`Marquer ce colis au dépôt comme Retourné Définitivement à la Boutique (${getDeliveryAttempts(del)}/${maxDeliveryAttempts} tentatives atteintes)`}
                              >
                                ↩️ Retour Boutique ({getDeliveryAttempts(del)}/{maxDeliveryAttempts})
                              </button>
                            )}
                            {canRefundDelivery(del) && (
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
                                title="Rembourser ce colis (uniquement si colis perdu ou endommagé)"
                              >
                                💸 Rembourser
                              </button>
                            )}
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
                              {getDeliveryAttempts(ud) < maxDeliveryAttempts ? (
                                <>
                                  <button
                                    onClick={() => handleResendDeliveryWithNewDriver(ud)}
                                    style={{
                                      background: "#4f46e5",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "5px",
                                      padding: "3px 7px",
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                    title="Renvoyer ce colis : affecter un nouveau livreur, garder uniquement les logs de l'ancien cycle et incrémenter les tentatives"
                                  >
                                    🔄 Renvoyer ({getDeliveryAttempts(ud)}/{maxDeliveryAttempts})
                                  </button>
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
                                    🏢 Stocker ({getDeliveryAttempts(ud)}/{maxDeliveryAttempts})
                                  </button>
                                </>
                              ) : (
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
                                  title={`Retour définitif à la boutique (${getDeliveryAttempts(ud)}/${maxDeliveryAttempts} tentatives atteintes)`}
                                >
                                  ↩️ Retour Boutique ({getDeliveryAttempts(ud)}/{maxDeliveryAttempts})
                                </button>
                              )}
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

              // Delivered parcels for this store (strictly delivered, never returned or refunded)
              const deliveredStoreColis = storeDeliveries.filter((d) => isDeliveryDelivered(d));

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
            <div
              style={{
                fontSize: "0.75rem",
                color: "#831843",
                background: "#fce7f3",
                border: "1px solid #fbcfe8",
                padding: "8px 10px",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              ℹ️ Les livraisons déjà livrées ne peuvent pas être remboursées. Le remboursement s'applique uniquement aux <strong>colis perdus ou endommagés</strong>.
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setRefundCauseVal(1);
                  setRefundCauseDescVal("Colis perdu dans le circuit logistique");
                }}
                style={{
                  background: Number(refundCauseVal) === 1 ? "#be185d" : "#ffffff",
                  color: Number(refundCauseVal) === 1 ? "#ffffff" : "#9d174d",
                  border: "1px solid #f472b6",
                  borderRadius: "6px",
                  padding: "4px 9px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                📦 Colis Perdu
              </button>
              <button
                type="button"
                onClick={() => {
                  setRefundCauseVal(2);
                  setRefundCauseDescVal("Colis endommagé / cassé pendant le transport");
                }}
                style={{
                  background: Number(refundCauseVal) === 2 ? "#be185d" : "#ffffff",
                  color: Number(refundCauseVal) === 2 ? "#ffffff" : "#9d174d",
                  border: "1px solid #f472b6",
                  borderRadius: "6px",
                  padding: "4px 9px",
                  fontSize: "0.74rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                💔 Colis Endommagé
              </button>
            </div>
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
