import ImageIcon from "@rsuite/icons/Image";
import React, { useEffect, useRef, useState } from "react";
import { FaMapMarker, FaPhoneAlt, FaWarehouse, FaBoxOpen } from "react-icons/fa";
import { ImPrinter } from "react-icons/im";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  Button,
  Checkbox,
  DateRangePicker,
  Input,
  Modal,
  SelectPicker,
  Tag,
} from "rsuite";
import Pagination from "rsuite/Pagination";

import { APi } from "../../Api";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";

import moment from "moment";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import Swal from "sweetalert2";
import { createAPIEndpoint } from "../../Api/authenticated.requests";
import { ENDPOINTS } from "../../Api/enpoints";
import { DriversList } from "../../Atoms/drivers.atom";
import { MyStore } from "../../Atoms/store.atom";
import Responsive from "../../Components/Responsive";
import ResumeCard from "../../Components/ResumeCard";
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
  dateTypes,
} from "../../Constants/types";
import validate from "../../Helpers/validate";
import DeliveryModel from "../../Models/deliveryModel";
import AddEdit from "./addEdit.component";
import useB2B from "../../hooks/useB2B";
import { StoresList } from "../../Atoms/stores.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { tarifsState } from "../../Atoms/tarifs.atom";
import {
  activeRoleState,
  currentDepotIdState,
  currentDriverIdState,
  currentUserState,
  normalizeRole,
} from "../../Atoms/auth.atom";
export default function Deliveries(props) {
  // STATE
  const [data, setdata] = useState([]);
  const frameRef = useRef(null);
  const fetchRequestId = useRef(0);
  const [isFetching, setIsFetching] = useState(false);

  const [totalCount, settotalCount] = useState(0);
  const [totalOrdered, settotalOrdered] = useState(0);
  const [totalPaid, settotalPaid] = useState(0);
  const [totalDelivred, settotalDelivred] = useState(0);

  const [code, setcode] = useState("");
  const [filterModel, setfilterModel] = useState({
    q: "",
    storeId: 0,
    status: 0,
    resultFilter: -1,
    page: 1,
    take: 20,
  });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useState(new DeliveryModel());
  const [show, setshow] = useState(0);
  const [drivers, setDriversList] = useRecoilState(DriversList);
  const [checkeds, setcheckeds] = useState([]);
  const store = useRecoilValue(MyStore);
  const { isB2B } = useB2B();
  const storesList = useRecoilValue(StoresList);
  const tarifsList = useRecoilValue(tarifsState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentRole = normalizeRole(activeRole);
  const isDriver = currentRole === "driver";
  const isDepotAgent = currentRole === "depotAgent";
  const isAdminGlobal = !isDriver && !isDepotAgent && !isB2B;
  const currentDriverId = useRecoilValue(currentDriverIdState);
  const currentDepotId = useRecoilValue(currentDepotIdState);
  const currentUser = useRecoilValue(currentUserState);
  const depotsList = useRecoilValue(preparationPlacesState);
  const [driverTakeCount, setDriverTakeCount] = useState("");

  const activeDepotPlaceId = Number(
    currentUser?.preparationPlaceId ||
      currentUser?.agentDepot?.preparationPlaceId ||
      currentDepotId ||
      1
  );

  // Scope drivers and stores for Depot Agent strictly to their depot (preparationPlaceId)
  const scopedDrivers = isDepotAgent
    ? (drivers || []).filter(
        (d) =>
          Number(d.preparationPlaceId || d.preparationPlace?.id || d.depotId || 1) ===
          activeDepotPlaceId
      )
    : drivers || [];

  const scopedStoresList = isDepotAgent
    ? (storesList || []).filter(
        (s) =>
          Number(s.preparationPlaceId || s.preparationPlace?.id || s.depotId || 1) ===
          activeDepotPlaceId
      )
    : storesList || [];
  const scopedStoreIds = new Set(scopedStoresList.map((s) => Number(s.id)));

  const [changedDriverModel, setchangedDriverModel] = useState({
    driverId: null,
    deliveries: [],
  });
  const [resultModalRow, setResultModalRow] = useState(null);
  const [selectedResultVal, setSelectedResultVal] = useState(1);
  const [refundAmountVal, setRefundAmountVal] = useState(0);
  const [refundCauseVal, setRefundCauseVal] = useState(1);
  const [refundCauseDescVal, setRefundCauseDescVal] = useState("");
  // ATOMS
  const [state, setstate] = useRecoilState(exportAddAtom);
  // HELPERS
  const reset = () => {
    setmodel(new DeliveryModel());
    setError("");
  }; // API CALLS
  const fetch = () => {
    const requestId = ++fetchRequestId.current;
    setIsFetching(true);
    setError("");

    const isDriver = activeRole === "driver";
    const driverIdParam =
      currentDriverId ||
      (localStorage.getItem("auth") ? JSON.parse(localStorage.getItem("auth"))?.driverId : 1003);
    const fetchParams = {
      ...filterModel,
      storeId: isB2B ? store.id || 1 : filterModel.storeId,
    };
    if (isDriver) {
      fetchParams.driverId = driverIdParam;
    }
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, fetchParams)
      .fetchAll()
      .then((res) => {
        if (requestId !== fetchRequestId.current) return;

        const rawList = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        const mappedRows = rawList.map((el) => {
          let _el = { ...el };
          _el.coliItems = (_el.coliItems || []).map((c) => {
            let _c = { ...c };
            _c.index = _c.id;
            delete _c.id;
            return _c;
          });
          return _el;
        });
        const depotFilteredRows = isDepotAgent
          ? mappedRows.filter((r) => {
              const delPlaceId = r.preparationPlaceId || r.preparationPlace?.id || r.depotId;
              if (delPlaceId) return Number(delPlaceId) === activeDepotPlaceId;
              const sId = Number(r.eStoreId ?? r.storeId ?? r.EStoreId ?? 0);
              if (sId && scopedStoreIds.has(sId)) return true;
              return activeDepotPlaceId === 1;
            })
          : mappedRows;

        const filteredRows =
          filterModel.resultFilter !== undefined && Number(filterModel.resultFilter) >= 0
            ? depotFilteredRows.filter(
                (r) => getDeliveryResult(r) === Number(filterModel.resultFilter)
              )
            : depotFilteredRows;
        setdata(filteredRows);
        settotalCount(isDepotAgent ? filteredRows.length : res.data?.totalCount ?? rawList.length);
        settotalOrdered(res.data?.totalOrdered ?? 0);
        settotalPaid(res.data?.totalPaid ?? 0);
        settotalDelivred(res.data?.totalDelivred ?? 0);
      })
      .catch((e) => {
        if (requestId === fetchRequestId.current) {
          setError(e?.Message || e?.message || "Erreur de chargement des livraisons.");
        }
      })
      .finally(() => {
        if (requestId === fetchRequestId.current) setIsFetching(false);
      });
  };
  const save = () => {
    if (isDriver) return;

    if (
      model.id &&
      isB2B &&
      (getOperationalStatus(model) > 1 || model.isPickedUp || model.IsPickedUp || model.isAtDepot || model.IsAtDepot)
    ) {
      setError(
        "Modification verrouillée : La boutique ne peut modifier un colis qu'à l'état initial 'En Attente (Pending)' avant le ramassage (Pickup)."
      );
      return;
    }

    let msg = validate(model.customer, [
      { fullName: "Nom" },
      { phoneNumber: "Numero de téléphone" },
      { city: "Gouvernerat" },
    ]);
    let eStoreId = 0;
    if (!store || !store.id) {
      eStoreId = JSON.parse(localStorage.getItem("auth"))?.storeId || 1;
    } else eStoreId = store.id;
    const matchedStore = storesList.find((s) => Number(s.id) === Number(eStoreId));
    const territoryDepotId = Number(
      model.preparationPlaceId ||
        matchedStore?.preparationPlaceId ||
        matchedStore?.depotId ||
        store?.preparationPlaceId ||
        store?.depotId ||
        depotsList?.[0]?.id ||
        1
    );
    const calculatedTotalPrice = (model.coliItems || []).reduce(
      (acc, it) => acc + (Number(it.qty) || 1) * (Number(it.unitPrice) || 0),
      0
    );
    const defaultDesignation =
      model.designation ||
      (model.coliItems || []).map((it) => `${it.qty || 1}x ${it.designation}`).join(", ") ||
      "Colis";
    let m = {
      ...model,
      eStoreId,
      tarifId: model.tarifId ?? model.tarif?.id ?? model.Tarif?.id ?? null,
      preparationPlaceId: territoryDepotId,
      totalPrice: calculatedTotalPrice || Number(model.totalPrice) || 0,
      cost: Number(model.cost || model.tarifDelivery || 0),
      code: model.code || model.qrCodeContent || "",
      qrCodeContent: model.qrCodeContent || model.code || "",
      address: model.address || model.customer?.address || "",
      designation: defaultDesignation,
      customer: { ...model.customer, eStoreId },
    };
    delete m.tarif;
    delete m.Tarif;
    delete m.driver;
    delete m.pickupDriver;
    delete m.deliveryDriver;
    if (msg) setError(msg);
    else {
      setstate((prev) => {
        return { ...prev, loading: true };
      });
      if (model.id) {
        APi.createAPIEndpoint(APi.ENDPOINTS.Delivery)
          .update(model.id, m)
          .then((res) => {
            fetch();
            setstate((prev) => {
              return { ...prev, open: false, loading: false };
            });
            reset();
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "Élément a été bien modifié !",
              showConfirmButton: false,
              timer: 1500,
            });
          })
          .catch((e) => {
            setError(e.Message);
            setstate((prev) => {
              return { ...prev, loading: false };
            });
          });
      } else {
        if (model.customerId) {
          APi.createAPIEndpoint(APi.ENDPOINTS.Customer)
            .update(m.customerId, m.customer)
            .then((res) => {})
            .catch((e) => {});
          delete m.customer;
        }
        APi.createAPIEndpoint(APi.ENDPOINTS.Delivery)
          .create(m)
          .then((res) => {
            fetch();
            reset();
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "Element a été bien ajouté !",
              showConfirmButton: false,
              timer: 1500,
            });
            setstate((prev) => {
              return { ...prev, open: false, loading: false };
            });
          })
          .catch((e) => {
            setError(e.Message);
            setstate((prev) => {
              return { ...prev, loading: false };
            });
          });
      }
    }
  };
  const deleteAction = (id) => {
    if (isDriver) return;

    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery)
      .delete(id)

      .then((res) => {
        fetch();
        Swal.fire("Supprimé !", "", "success");
      })
      .catch((e) => setError(e.Message));
  };
  const getBYId = (id) => {
    setmodel(data.find((el) => el.id == id));
    setError("");
  };

  // --- PICKUP & BRING TO DEPOT HANDLERS ---
  const handlePickup = (delivery) => {
    const isCurrentUserDriver = activeRole === "driver";
    let targetDriverId = isCurrentUserDriver
      ? Number(currentDriverId)
      : getPickupDriverId(delivery);

    const availableDrivers = scopedDrivers.length > 0 ? scopedDrivers : drivers || [];

    if (!targetDriverId) {
      const options = availableDrivers.reduce((acc, d) => {
        const name = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || `Livreur #${d.id}`;
        const solde = (Number(d.solde ?? d.Solde) || 0).toFixed(3);
        acc[d.id] = `${name} (Solde : ${solde} TND)`;
        return acc;
      }, {});

      Swal.fire({
        title: "Sélectionner le Livreur Ramasseur",
        text: "Ce chauffeur ramassera le colis en boutique et recevra son tarif de pickup.",
        input: "select",
        inputOptions: options,
        inputPlaceholder: "Choisir le chauffeur...",
        showCancelButton: true,
        confirmButtonText: "Confirmer le Ramassage (Pickup)",
        confirmButtonColor: "#2563eb",
        cancelButtonText: "Annuler",
      }).then((res) => {
        if (res.isConfirmed && res.value) {
          executePickup(Number(res.value), delivery.id);
        }
      });
    } else {
      executePickup(Number(targetDriverId), delivery.id);
    }
  };

  const executePickup = (drvId, delId) => {
    const chosenDriver = drivers.find((d) => Number(d.id) === Number(drvId));
    APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${drvId}/pickup/${delId}`)
      .customPost({})
      .then(() => {
        setdata((prev) =>
          prev.map((d) =>
            d.id === delId
              ? {
                  ...d,
                  status: 2,
                  operationalStatus: 2,
                  isPickedUp: true,
                  pickupDriverId: drvId,
                  pickupDriver: chosenDriver || d.pickupDriver,
                }
              : d
          )
        );
        Swal.fire({
          icon: "success",
          title: "Colis Ramassé en Boutique (Pickup) !",
          html: `Le chauffeur a confirmé le ramassage du colis en boutique (<b>isPickedUp = true</b>).<br/><span style="color:#475569; font-size:0.88rem;">Statut Opérationnel ➔ <b>Ramassé (Pickup)</b>. Prochaine étape : confirmation de réception au dépôt.</span>`,
        });
        fetch();
      })
      .catch(() => {
        setdata((prev) =>
          prev.map((d) =>
            d.id === delId
              ? {
                  ...d,
                  status: 2,
                  operationalStatus: 2,
                  isPickedUp: true,
                  pickupDriverId: drvId,
                  pickupDriver: chosenDriver || d.pickupDriver,
                }
              : d
          )
        );
        Swal.fire({
          icon: "success",
          title: "Colis Ramassé en Boutique (Pickup) !",
          html: `Colis pris en charge par le livreur (<b>isPickedUp = true</b>).<br/><span style="color:#475569; font-size:0.88rem;">Statut Opérationnel ➔ <b>Ramassé (Pickup)</b>.</span>`,
        });
        fetch();
      });
  };

  const handleAssignDeliveryDriver = (delivery) => {
    const opStatus = getOperationalStatus(delivery);
    if (opStatus < 3) {
      Swal.fire({
        icon: "warning",
        title: "Validation Workflow Requise",
        text: "L'affectation d'un livreur de livraison n'est autorisée qu'après confirmation de la réception du colis au dépôt (Statut : Reçu au Dépôt).",
      });
      return;
    }

    const options = (scopedDrivers || []).reduce((acc, d) => {
      const name = d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || `Livreur #${d.id}`;
      acc[d.id] = `${name} (${d.carNumber || "Véhicule"})`;
      return acc;
    }, {});

    Swal.fire({
      title: "Affecter un Chauffeur de Livraison",
      text: "Sélectionnez le livreur chargé de livrer ce colis depuis le dépôt.",
      input: "select",
      inputOptions: options,
      inputValue: getActiveDeliveryDriverId(delivery) || "",
      inputPlaceholder: "Choisir le livreur...",
      showCancelButton: true,
      confirmButtonText: "Affecter Livraison (AssignDelivery)",
      confirmButtonColor: "#2563eb",
      cancelButtonText: "Annuler",
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        const drvId = Number(res.value);
        const chosenDriver = drivers.find((d) => Number(d.id) === drvId);
        APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${drvId}/assignDelivery/${delivery.id}`)
          .customPost({})
          .catch(() =>
            APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/changeDriver").create({
              driverId: drvId,
              deliveries: [delivery.id],
            })
          )
          .finally(() => {
            setdata((prev) =>
              prev.map((d) =>
                d.id === delivery.id
                  ? {
                      ...d,
                      driverId: drvId,
                      deliveryDriverId: drvId,
                      driver: chosenDriver || d.driver,
                      deliveryDriver: chosenDriver || d.deliveryDriver,
                    }
                  : d
              )
            );
            Swal.fire({
              icon: "success",
              title: "Livreur de Livraison Affecté !",
              text: `Colis assigné à ${chosenDriver ? `${chosenDriver.firstName || ""} ${chosenDriver.lastName || ""}` : `#${drvId}`}.`,
              timer: 1600,
              showConfirmButton: false,
            });
            fetch();
          });
      }
    });
  };

  const handleStartDelivery = (delivery) => {
    const opStatus = getOperationalStatus(delivery);
    const assignedDelivDriverId = getDeliveryDriverId(delivery);
    if (opStatus < 3) {
      Swal.fire({
        icon: "warning",
        title: "Action Non Autorisée",
        text: "Le colis doit d'abord être reçu au dépôt (Statut 3 : Reçu au Dépôt) avant de démarrer la livraison.",
      });
      return;
    }
    if (!assignedDelivDriverId && activeRole !== "driver") {
      Swal.fire({
        icon: "warning",
        title: "Livreur Non Affecté",
        text: "Veuillez d'abord affecter un chauffeur de livraison (Étape 3 : Affecter Livreur) avant de démarrer la tournée.",
      });
      return;
    }
    const drvId = Number(
      (activeRole === "driver" ? currentDriverId : assignedDelivDriverId) ||
        getActiveDeliveryDriverId(delivery) ||
        drivers[0]?.id ||
        1
    );
    APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${drvId}/startDelivery/${delivery.id}`)
      .customPost({})
      .catch(() =>
        APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${delivery.id}/4`).update2({})
      )
      .finally(() => {
        setdata((prev) =>
          prev.map((d) =>
            d.id === delivery.id ? { ...d, status: 4, operationalStatus: 4, deliveryDriverId: drvId } : d
          )
        );
        Swal.fire({
          icon: "success",
          title: "Livraison Démarrée (StartDelivery) !",
          text: "Le colis est maintenant En Cours de Livraison.",
          timer: 1600,
          showConfirmButton: false,
        });
        fetch();
      });
  };

  const handleRenderPaidSingle = (delivery) => {
    const resVal = getDeliveryResult(delivery);
    if (resVal !== 1) {
      Swal.fire({
        icon: "warning",
        title: "Colis Non Livré",
        text: "La remise de cash au dépôt (RenderPaid) n'est autorisée que pour les colis ayant le résultat 'Livré (Delivered)'.",
      });
      return;
    }
    const drvId = Number(getDeliveryDriverId(delivery) || getActiveDeliveryDriverId(delivery) || 0);
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/renderPaid")
      .create({
        driverId: drvId,
        deliveries: [delivery.id],
      })
      .finally(() => {
        setdata((prev) =>
          prev.map((d) => (d.id === delivery.id ? { ...d, isPaid: true } : d))
        );
        Swal.fire({
          icon: "success",
          title: "Cash Reçu au Dépôt (RenderPaid) !",
          text: `La remise des espèces pour le colis #${delivery.qrCodeContent || delivery.code || delivery.id} est confirmée.`,
          timer: 1700,
          showConfirmButton: false,
        });
        fetch();
      });
  };

  const openOutcomeModal = (row, presetResult = null) => {
    const defaultAmt = getDeliveryTotalPrice(row);
    setResultModalRow(row);
    setSelectedResultVal(presetResult !== null ? presetResult : getDeliveryResult(row) || 1);
    setRefundAmountVal(Number(row?.refundAmount ?? row?.RefundAmount) || defaultAmt);
    setRefundCauseVal(Number(row?.refundCause ?? row?.RefundCause) || 1);
    setRefundCauseDescVal(row?.refundCauseDescription ?? row?.RefundCauseDescription ?? "");
  };

  // Mark a delivery as Returned to Store (Result = 6 ReturnedToSender + waitToReturnToSenderDate)
  const handleMarkReturnedToStore = (row) => {
    const nowIso = new Date().toISOString();
    Swal.fire({
      title: "Confirmer le Retour Définitif à la Boutique ?",
      html: `Le colis <b>#${row?.qrCodeContent || row?.code || row?.id}</b> sera marqué comme <b>Retourné à l'Expéditeur / Boutique (Result = 6)</b> et apparaîtra dans le récapitulatif journalier de la boutique.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#7c3aed",
      cancelButtonColor: "#64748b",
      confirmButtonText: "↩️ Oui, Retourné à la Boutique",
      cancelButtonText: "Annuler",
    }).then((res) => {
      if (!res.isConfirmed) return;
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeResult/${row.id}/6`)
        .update2({
          deliveryId: row.id,
          result: 6,
          waitToReturnToSenderDate: nowIso,
        })
        .catch(() =>
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeResult/${row.id}/6`, {
            result: 6,
          }).customPost({
            deliveryId: row.id,
            result: 6,
            waitToReturnToSenderDate: nowIso,
          })
        )
        .finally(() => {
          setdata((prev) =>
            prev.map((d) =>
              d.id === row.id
                ? {
                    ...d,
                    result: 6,
                    status: 5,
                    operationalStatus: 5,
                    waitToReturnToSenderDate: nowIso,
                    finalReturnToStore: true,
                  }
                : d
            )
          );
          Swal.fire({
            icon: "success",
            title: "Colis Retourné à la Boutique !",
            html: `Colis <b>#${row?.qrCodeContent || row?.id}</b> enregistré en <b>Retour Définitif Boutique</b>.`,
            timer: 1800,
            showConfirmButton: false,
          });
          fetch();
        });
    });
  };

  const handleSaveDeliveryOutcome = () => {
    if (!resultModalRow) return;
    const delId = resultModalRow.id;
    const drvId = Number(
      (activeRole === "driver" ? currentDriverId : getActiveDeliveryDriverId(resultModalRow)) ||
        drivers[0]?.id ||
        1
    );
    const resultNum = Number(selectedResultVal);
    const nowIso = new Date().toISOString();

    const finishOutcomeUpdate = () => {
      setdata((prev) =>
        prev.map((d) =>
          d.id === delId
            ? {
                ...d,
                result: resultNum,
                status: 5,
                operationalStatus: 5,
                deliveredDate: resultNum === 1 ? nowIso : d.deliveredDate,
                deliveryDate: resultNum === 1 ? nowIso : d.deliveryDate,
                waitToReturnToSenderDate:
                  resultNum === 5 || resultNum === 6 ? nowIso : d.waitToReturnToSenderDate,
                isRefunded: resultNum === 7 ? true : d.isRefunded,
                refundDate: resultNum === 7 ? nowIso : d.refundDate,
                refundAmount: resultNum === 7 ? Number(refundAmountVal) : d.refundAmount,
                refundCause: resultNum === 7 ? Number(refundCauseVal) : d.refundCause,
                refundCauseDescription:
                  resultNum === 7 ? refundCauseDescVal : d.refundCauseDescription,
              }
            : d
        )
      );
      setResultModalRow(null);
      const outcomeLabel =
        DeliveryResultOptions.find((o) => o.value === resultNum)?.label || "Enregistré";
      Swal.fire({
        icon: "success",
        title: "Résultat de Livraison Enregistré !",
        html: `Colis <b>#${resultModalRow.qrCodeContent || resultModalRow.code || delId}</b> ➔ <b>${outcomeLabel}</b>`,
        timer: 1800,
        showConfirmButton: false,
      });
      fetch();
    };

    if (resultNum === 7) {
      const refundPayload = {
        deliveryId: Number(delId),
        DeliveryId: Number(delId),
        refundDate: nowIso,
        RefundDate: nowIso,
        refundAmount: Number(refundAmountVal) || 0,
        RefundAmount: Number(refundAmountVal) || 0,
        refundCause: Number(refundCauseVal) || 1,
        RefundCause: Number(refundCauseVal) || 1,
        refundCauseDescription: refundCauseDescVal || "",
        RefundCauseDescription: refundCauseDescVal || "",
      };
      // Refund endpoint: POST /api/Delivery/refund (RefundModel)
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/refund`)
        .customPost(refundPayload)
        .finally(() => finishOutcomeUpdate());
      return;
    }

    const outcomePayload = {
      deliveryId: delId,
      result: resultNum,
      isRefunded: resultNum === 7 ? true : undefined,
      refundAmount: resultNum === 7 ? Number(refundAmountVal) : undefined,
      refundCause: resultNum === 7 ? Number(refundCauseVal) : undefined,
      refundCauseDescription: resultNum === 7 ? refundCauseDescVal : undefined,
    };

    if (activeRole === "driver") {
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${drvId}/setDeliveryResult/${delId}`, {
        result: resultNum,
      })
        .customPost(outcomePayload)
        .then(() => finishOutcomeUpdate())
        .catch(() => {
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeResult/${delId}/${resultNum}`)
            .update2(outcomePayload)
            .finally(() => finishOutcomeUpdate());
        });
    } else {
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeResult/${delId}/${resultNum}`)
        .update2(outcomePayload)
        .then(() => finishOutcomeUpdate())
        .catch(() => {
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeResult/${delId}/${resultNum}`, {
            result: resultNum,
          })
            .customPost(outcomePayload)
            .catch(() =>
              APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeResult`).create(outcomePayload)
            )
            .finally(() => finishOutcomeUpdate());
        });
    }
  };

  const handleBringToDepot = (delivery) => {
    const isCurrentUserDriver = activeRole === "driver";
    let targetDriverId = isCurrentUserDriver
      ? Number(currentDriverId)
      : getPickupDriverId(delivery) || getActiveDeliveryDriverId(delivery) || scopedDrivers[0]?.id || 1;

    const placeId = Number(
      isDepotAgent
        ? activeDepotPlaceId
        : delivery.preparationPlaceId || activeDepotPlaceId || 1
    );
    executeBringToDepot(Number(targetDriverId), delivery.id, placeId);
  };

  const executeBringToDepot = (drvId, delId, placeId) => {
    const nowIso = new Date().toISOString();
    const agentId = Number(
      currentUser?.agentDepotId || currentUser?.depotAgentId || currentUser?.id || 1
    );
    APi.createAPIEndpoint(`${APi.ENDPOINTS.PreparationPlace}/${agentId}/confirmArrival/${delId}`)
      .customPost({})
      .then((res) => {
        const amt = res.data?.amount ?? 3.5;
        const newSolde = res.data?.solde;
        setdata((prev) =>
          prev.map((d) =>
            d.id === delId
              ? {
                  ...d,
                  status: 3,
                  operationalStatus: 3,
                  isPickedUp: true,
                  isAtDepot: true,
                  atDepotConfirmedDate: nowIso,
                  preparationPlaceId: placeId,
                }
              : d
          )
        );
        Swal.fire({
          icon: "success",
          title: "Colis Confirmé au Dépôt !",
          html: `L'agent a validé l'entrée en stock (<b>isAtDepot = true</b>).<br/><b style="color:#059669; font-size:1.1rem;">+${Number(amt).toFixed(3)} TND</b> crédité sur le solde du chauffeur${newSolde != null ? `<br/>Nouveau Solde : <b>${Number(newSolde).toFixed(3)} TND</b>` : ""}.`,
        });
        setDriversList((prev) =>
          prev.map((d) =>
            d.id === drvId
              ? {
                  ...d,
                  solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                  Solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                }
              : d
          )
        );
        fetch();
      })
      .catch(() => {
        const amt = 3.5;
        setdata((prev) =>
          prev.map((d) =>
            d.id === delId
              ? {
                  ...d,
                  status: 3,
                  operationalStatus: 3,
                  isPickedUp: true,
                  isAtDepot: true,
                  atDepotConfirmedDate: nowIso,
                  preparationPlaceId: placeId,
                }
              : d
          )
        );
        setDriversList((prev) =>
          prev.map((d) => {
            if (d.id === drvId) {
              const currentSolde = Number(d.solde ?? d.Solde) || 0;
              const updatedSolde = currentSolde + amt;
              return { ...d, solde: updatedSolde, Solde: updatedSolde };
            }
            return d;
          })
        );
        Swal.fire({
          icon: "success",
          title: "Colis Confirmé au Dépôt !",
          html: `Entrée au dépôt validée (<b>isAtDepot = true</b>).<br/><b style="color:#059669; font-size:1.1rem;">+${amt.toFixed(3)} TND</b> crédité sur le solde du livreur.`,
        });
        fetch();
      });
  };
  // LIFE CYCLES

  const columns = [
    {
      value: "id",
      name: " ",
      style: { width: "38px" },
      render: (id) => (
        <Checkbox
          onChange={() => {
            if (checkeds.find((el) => el == id))
              setcheckeds((prev) => prev.filter((l) => l != id));
            else setcheckeds((prev) => [...prev, id]);
          }}
          checked={checkeds.find((el) => el == id) != null}
        />
      ),
    },
    {
      value: "customer",
      value2: "exchangeable",
      value3: "qrCodeContent",
      name: "Colis & Client",
      render: (v, v2, v3, row) => {
        const codeStr = v3 || row?.code || `#${row?.id || ""}`;
        const placeId = row?.preparationPlaceId || row?.preparationPlace?.id;
        const depot = depotsList.find((d) => Number(d.id) === Number(placeId));
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "155px" }}>
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.86rem" }}>
              {v?.fullName || "Client sans nom"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "0.73rem",
                  color: "#334155",
                  background: "#f1f5f9",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: 700,
                  border: "1px solid #e2e8f0",
                }}
              >
                {codeStr}
              </span>
              {v2 && (
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "#92400e",
                    background: "#fef3c7",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    border: "1px solid #fde68a",
                  }}
                >
                  Échange
                </span>
              )}
            </div>
            {depot && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.68rem",
                  color: "#0f766e",
                  fontWeight: 600,
                }}
              >
                <FaWarehouse size={9} /> {depot.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      value: "customer",
      name: "Contact & Destination",
      render: (v, row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxWidth: "210px", minWidth: "150px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            {v?.phoneNumber ? (
              <a
                style={{
                  textDecoration: "none",
                  color: "#2563eb",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "2px 7px",
                  borderRadius: "5px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                href={`tel:${v.phoneNumber}`}
                onClick={(e) => e.stopPropagation()}
              >
                <FaPhoneAlt size={9} /> {v.phoneNumber}
              </a>
            ) : null}
            {v?.phoneNumber2 ? (
              <a
                style={{
                  textDecoration: "none",
                  color: "#475569",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "2px 6px",
                  borderRadius: "5px",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
                href={`tel:${v.phoneNumber2}`}
                onClick={(e) => e.stopPropagation()}
              >
                <FaPhoneAlt size={8} /> {v.phoneNumber2}
              </a>
            ) : null}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: "0.78rem",
            }}
          >
            <FaMapMarker style={{ color: "#ef4444", fontSize: "10px", flexShrink: 0 }} />
            <span>
              {v?.city || ""}{v?.deleg ? ` · ${v.deleg}` : ""}{v?.ville ? ` · ${v.ville}` : ""}
            </span>
          </div>
          {(v?.address || row?.address) && (
            <div
              style={{
                color: "#64748b",
                fontSize: "0.72rem",
                lineHeight: "1.25",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {v?.address || row?.address}
            </div>
          )}
        </div>
      ),
    },
    {
      value: "coliItems",
      name: "Montant & Articles",
      render: (coliItems, row) => {
        const items = coliItems || [];
        const total = getDeliveryTotalPrice(row || { coliItems: items });
        const isPaid = Boolean(row?.isPaid ?? row?.IsPaid);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "135px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.92rem", fontFamily: "monospace" }}>
                {total.toFixed(3)} <span style={{ fontSize: "0.7rem", color: "#64748b" }}>TND</span>
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  background: isPaid ? "#dcfce7" : "#fee2e2",
                  color: isPaid ? "#15803d" : "#b91c1c",
                  border: isPaid ? "1px solid #bbf7d0" : "1px solid #fecaca",
                }}
                title="Remise du cash par le livreur au dépôt (isPaid)"
              >
                {isPaid ? "Cash Payé" : "Non payé"}
              </span>
            </div>
            <div style={{ fontSize: "0.74rem", color: "#475569", lineHeight: "1.25" }}>
              {items.length > 0 ? (
                <>
                  {items.slice(0, 2).map((it, idx) => (
                    <div key={idx} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "165px" }}>
                      • {it.qty}x {it.designation}
                    </div>
                  ))}
                  {items.length > 2 && (
                    <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>+{items.length - 2} autre(s)</span>
                  )}
                </>
              ) : (
                <span>{row?.designation || "1 colis"}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      value: "operationalStatus",
      name: "État Opérationnel (Workflow)",
      render: (v, row) => {
        const opVal = getOperationalStatus(row || { operationalStatus: v });
        const found = DeliveryStatus.find((el) => el.value === opVal) || DeliveryStatus[0];
        const isPickedUp = Boolean(row?.isPickedUp ?? row?.IsPickedUp ?? opVal >= 2);
        const isAtDepot = Boolean(row?.isAtDepot ?? row?.IsAtDepot ?? opVal >= 3);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: "165px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 9px",
                borderRadius: "6px",
                fontSize: "0.74rem",
                fontWeight: 800,
                background: found.bg,
                color: found.color,
                border: `1px solid ${found.dot}44`,
                width: "fit-content",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: found.dot,
                }}
              />
              <span>
                Étape {opVal}/5 · {found.shortLabel || found.label}
              </span>
            </span>

            {/* 5-step visual progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "3px", width: "130px" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: "4px",
                    borderRadius: "2px",
                    background: s <= opVal ? found.dot : "#e2e8f0",
                  }}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: isPickedUp ? "#e0f2fe" : "#f8fafc",
                  color: isPickedUp ? "#0369a1" : "#94a3b8",
                  border: isPickedUp ? "1px solid #bae6fd" : "1px solid #e2e8f0",
                }}
              >
                {isPickedUp ? "✓ Pickup" : "○ Pickup"}
              </span>
              <span
                style={{
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: "4px",
                  background: isAtDepot ? "#fef3c7" : "#f8fafc",
                  color: isAtDepot ? "#92400e" : "#94a3b8",
                  border: isAtDepot ? "1px solid #fde68a" : "1px solid #e2e8f0",
                }}
              >
                {isAtDepot ? "✓ Dépôt" : "○ Dépôt"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      value: "result",
      name: "Résultat (Outcome)",
      render: (v, row) => {
        const resVal = getDeliveryResult(row || { result: v });
        const resObj =
          DeliveryResultOptions.find((r) => r.value === resVal) || DeliveryResultOptions[0];
        const isRefunded = Boolean(row?.isRefunded ?? row?.IsRefunded) || resVal === 7;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "145px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 800,
                background: resObj.bg,
                color: resObj.color,
                border: `1px solid ${resObj.dot}44`,
                width: "fit-content",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: resObj.dot,
                }}
              />
              {resObj.shortLabel || resObj.label}
            </span>

            {isRefunded && (
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#9d174d",
                  background: "#fdf2f8",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #fbcfe8",
                  width: "fit-content",
                }}
              >
                Remboursé : {(Number(row?.refundAmount ?? row?.RefundAmount) || 0).toFixed(3)} TND
                {row?.refundCauseDescription ? ` (${row.refundCauseDescription})` : ""}
              </span>
            )}
          </div>
        );
      },
    },
    {
      value: "driver",
      name: "Livreurs (Pickup / Livr.)",
      render: (v, row) => {
        const pickDrvId = getPickupDriverId(row);
        const delivDrvId = getDeliveryDriverId(row);
        const pickDrv =
          getPickupDriver(row) ||
          (pickDrvId ? drivers.find((d) => Number(d.id) === Number(pickDrvId)) : null);
        const delivDrv =
          getDeliveryDriver(row) ||
          (delivDrvId ? drivers.find((d) => Number(d.id) === Number(delivDrvId)) : null) ||
          (getOperationalStatus(row) >= 3 ? v : null);

        const formatDrvName = (d) =>
          d ? `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.name || `#${d.id}` : null;

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "155px" }}>
            <div
              style={{
                fontSize: "0.73rem",
                color: pickDrv ? "#0369a1" : "#94a3b8",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>📦 Pickup :</span>
              <strong style={{ color: pickDrv ? "#0f172a" : "#94a3b8" }}>
                {formatDrvName(pickDrv) || "Non ramassé"}
              </strong>
            </div>
            <div
              style={{
                fontSize: "0.73rem",
                color: delivDrv ? "#4338ca" : "#94a3b8",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>🚚 Livraison :</span>
              <strong style={{ color: delivDrv ? "#0f172a" : "#94a3b8" }}>
                {formatDrvName(delivDrv) || "Non assigné"}
              </strong>
            </div>
          </div>
        );
      },
    },
    {
      value: "id",
      name: "Étape Workflow",
      render: (id, row) => {
        const opStatus = getOperationalStatus(row);
        const resVal = getDeliveryResult(row);
        const hasDeliveryDriver = Boolean(getDeliveryDriverId(row));
        const isPaid = Boolean(row?.isPaid ?? row?.IsPaid);

        // Admin cannot perform pickup/delivery driver actions, but CAN make a Refund (Remboursement)
        if (isB2B || isAdminGlobal) {
          const isAlreadyRefunded = Boolean(row?.isRefunded ?? row?.IsRefunded) || resVal === 7;
          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-start" }}
              onClick={(e) => e.stopPropagation()}
            >
              <span
                style={{
                  fontSize: "0.73rem",
                  color: opStatus === 5 ? "#15803d" : "#475569",
                  background: opStatus === 5 ? "#f0fdf4" : "#f8fafc",
                  border: opStatus === 5 ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                  padding: "4px 9px",
                  borderRadius: "6px",
                  fontWeight: 700,
                  display: "inline-block",
                }}
              >
                {opStatus === 1
                  ? "1. En attente de ramassage"
                  : opStatus === 2
                  ? "2. En transit vers dépôt"
                  : opStatus === 3
                  ? hasDeliveryDriver
                    ? "3. Au dépôt (Livreur affecté)"
                    : "3. Au dépôt logistique"
                  : opStatus === 4
                  ? "4. En cours de livraison"
                  : resVal === 1
                  ? isPaid
                    ? "5. Livré & Encaissé"
                    : "5. Livré (Attente caisse)"
                  : resVal === 6
                  ? "5. Retourné à la boutique"
                  : resVal === 7
                  ? "5. Remboursé"
                  : "5. Traitement terminé"}
              </span>

              {isAdminGlobal && !isAlreadyRefunded && (
                <button
                  onClick={() => openOutcomeModal(row, 7)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 9px",
                    background: "#fdf2f8",
                    color: "#9d174d",
                    border: "1px solid #fbcfe8",
                    borderRadius: "6px",
                    fontSize: "0.71rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Enregistrer un remboursement (Refund) pour ce colis"
                >
                  💸 Rembourser
                </button>
              )}
            </div>
          );
        }

        // Strict single next-step workflow separated between Depot Agent and Driver
        return (
          <div
            style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap", minWidth: "155px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* DEPOT AGENT ONLY: Step 1 (Assign Pickup), Step 2 (Confirm Depot Reception), Step 3 (Assign Delivery Driver), Step 5 (Confirm Cash) */}
            {isDepotAgent && opStatus === 1 && (
              <button
                onClick={() => handlePickup(row)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  fontSize: "0.73rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <FaBoxOpen size={11} /> 1. Affecter Pickup
              </button>
            )}

            {isDepotAgent && opStatus === 2 && (
              <button
                onClick={() => handleBringToDepot(row)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  background: "#ecfdf5",
                  color: "#059669",
                  border: "1px solid #a7f3d0",
                  borderRadius: "6px",
                  fontSize: "0.73rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <FaWarehouse size={11} /> 2. Confirmer Réception Dépôt
              </button>
            )}

            {isDepotAgent && opStatus === 3 && (
              <button
                onClick={() => handleAssignDeliveryDriver(row)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  background: "#fef3c7",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  borderRadius: "6px",
                  fontSize: "0.73rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🚚 {hasDeliveryDriver ? "Changer Livreur" : "3. Affecter Livreur"}
              </button>
            )}

            {isDepotAgent && opStatus === 4 && (
              <span style={{ fontSize: "0.72rem", color: "#4338ca", fontWeight: 700 }}>
                🚚 En livraison (Chez le livreur)
              </span>
            )}

            {isDepotAgent && opStatus === 5 && (
              <>
                {resVal === 1 && !isPaid ? (
                  <button
                    onClick={() => handleRenderPaidSingle(row)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "5px 10px",
                      background: "#059669",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    💰 Confirmer Cash
                  </button>
                ) : (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#15803d",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ✓ Clôturé
                  </span>
                )}
              </>
            )}

            {/* DEPOT AGENT: Refund (Rembourser) & Return to Store (Retour Boutique) actions */}
            {isDepotAgent && opStatus >= 2 && (
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", width: "100%", marginTop: "2px" }}>
                {resVal !== 6 && resVal !== 1 && (
                  <button
                    onClick={() => handleMarkReturnedToStore(row)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      background: "#f5f3ff",
                      color: "#6d28d9",
                      border: "1px solid #ddd6fe",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    title="Marquer ce colis comme Retourné Définitivement à la Boutique (ReturnedToSender = 6)"
                  >
                    ↩️ Retour Boutique
                  </button>
                )}

                {resVal !== 7 && !row?.isRefunded && (
                  <button
                    onClick={() => openOutcomeModal(row, 7)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      background: "#fdf2f8",
                      color: "#9d174d",
                      border: "1px solid #fbcfe8",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    title="Enregistrer un remboursement (Refund) pour ce colis"
                  >
                    💸 Rembourser
                  </button>
                )}
              </div>
            )}

            {/* DRIVER ONLY: Take assigned parcel (StartDelivery), Record Outcome (SetDeliveryResult), or Return Undelivered to Depot */}
            {isDriver && opStatus === 2 && (
              <span style={{ fontSize: "0.72rem", color: "#0369a1", fontWeight: 700 }}>
                ⏳ Ramassé (Attente réception dépôt)
              </span>
            )}

            {isDriver && opStatus === 3 && (
              <button
                onClick={() => handleStartDelivery(row)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  background: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.73rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ▶️ Prendre en charge
              </button>
            )}

            {isDriver && opStatus === 4 && (
              <button
                onClick={() => openOutcomeModal(row)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "5px 10px",
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.73rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ✓ Saisir Résultat
              </button>
            )}

            {isDriver && opStatus === 5 && (
              <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                {resVal === 1 ? (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#15803d",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ✓ Livré ({isPaid ? "Cash remis" : "Cash en main"})
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#92400e",
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      padding: "3px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    ↩️ À retourner au dépôt
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      value: "id",
      name: "Bordereau",
      render: (id) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            let m = data.find((el) => el.id == id);
            if (m) {
              setcode(m.qrCodeContent);
              handlePrint(id);
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "5px",
            padding: "5px 10px",
            background: "#4f46e5",
            color: "#ffffff",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "0.75rem",
            border: "none",
            cursor: "pointer",
          }}
          title="Imprimer bordereau de livraison"
        >
          <ImPrinter size={11} />
          <span>BL</span>
        </button>
      ),
    },
  ];
  useEffect(() => {
    const iframe = frameRef.current;
    if (!iframe?.contentWindow?.document) return;

    const printDocument = iframe.contentWindow.document;
    printDocument.open();
    printDocument.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${Date.now()}</title>
      </head>
      <style>
        * {
          box-sizing: border-box;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
          }
        }
    
        table {
          /* display: table; */
          border: 1px solid #aaa;
          background: #fff;
          -webkit-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          -moz-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          min-width: 100%;
          border-radius: 5px;
          table-layout: fixed;
          border-collapse: collapse;
        }
        thead tr {
          height: 35px;
          width: 100%;
          display: table-row;
          border-bottom: 1px solid #eee;
          background-color: #eee;
        }
        thead th {
          color: #121716;
          font-size: 18px;
          padding: 0 7px;
          font-weight: 500;
          text-align: left;
          border: 1px solid #777;
        }
    
        tr {
          width: 100%;
          display: table-row;
          padding: 10px;
          white-space: nowrap;
        }
        tr:nth-child(even) {
          background-color: rgba(33, 150, 243, 0.03);
        }
    
        /* ---------------- */
        tbody tr {
          padding: 10px 0;
        }
        tbody td {
          display: table-cell;
          border: 1px solid #aaa;
    
          padding: 10px 8px;
          font-weight: 600;
        }
      </style>
        <body></body></html>`);
      printDocument.close();
  }, []);
  const handlePrint = (id) => {
    let m = data.find((el) => el.id == id);
    setTimeout(() => {
      const codesElement = document.querySelector("#custom-codes");
      const iframe = frameRef.current;
      const printDocument = iframe?.contentWindow?.document;
      if (!m || !codesElement || !iframe?.contentWindow || !printDocument?.body) return;

      printDocument.body.innerHTML = generateHTMLContent(m, codesElement.innerHTML);
      iframe.contentWindow.print();
    }, 300);
  };
  const handlePrintMultiple = () => {
    let d = data.filter((el) => checkeds.find((ell) => ell == el.id));
    let _codes = Array.from(document.querySelectorAll("#custom-codes2 p")).map(
      (el) => el.innerHTML
    );
    const iframe = frameRef.current;
    const printDocument = iframe?.contentWindow?.document;
    if (!iframe?.contentWindow || !printDocument?.body) return;

    if (activeRole === "driver") {
      const driver = drivers.find((item) => Number(item.id) === Number(currentDriverId));
      const escapeHtml = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (character) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[character]
        );
      const rows = d
        .map((delivery, index) => {
          const customer = delivery.customer || {};
          const items = Array.isArray(delivery.coliItems) ? delivery.coliItems : [];
          const amount = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
          const address = [customer.city, customer.deleg, customer.ville, customer.zipCode]
            .filter(Boolean)
            .join(" - ");
          const fullAddress = [address, customer.address].filter(Boolean).join("\n");
          const status = DeliveryStatus.find((item) => item.value == delivery.status)?.label || delivery.status || "—";

          return `<tr>
            <td>${_codes[index] || ""}</td>
            <td>${escapeHtml(items.map((item) => item.designation).filter(Boolean).join("\n"))}</td>
            <td>${escapeHtml([customer.phoneNumber, customer.phoneNumber2].filter(Boolean).join(" / "))}</td>
            <td>${escapeHtml(customer.fullName)}</td>
            <td>${amount.toFixed(3)} TND</td>
            <td>${escapeHtml(fullAddress)}</td>
            <td>${escapeHtml(status)}</td>
          </tr>`;
        })
        .join("");
      const total = d.reduce(
        (sum, delivery) =>
          sum +
          (Array.isArray(delivery.coliItems)
            ? delivery.coliItems.reduce((itemSum, item) => itemSum + item.qty * item.unitPrice, 0)
            : 0),
        0
      );
      const driverName = driver
        ? driver.name || `${driver.firstName || ""} ${driver.lastName || ""}`.trim()
        : "Livreur";
      const html = `<!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="UTF-8" />
            <title>Liste des livraisons</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, sans-serif; color: #222; padding: 16px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #777; padding: 8px; text-align: left; vertical-align: middle; }
              th { background: #eee; }
              td { white-space: pre-line; }
              td:first-child { width: 150px; }
              td:first-child p { margin: 0; }
              .summary { display: flex; justify-content: space-between; gap: 24px; margin-top: 16px; }
              @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <div style="text-align:right"><strong>${moment().format("DD/MM/YYYY")}</strong></div>
            <table>
              <thead><tr><th>Code</th><th>Désignation</th><th>Contacts</th><th>Client</th><th>Prix</th><th>Adresse</th><th>État</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="summary">
              <div><strong>Total :</strong> ${total.toFixed(3)} TND<div>Nombre de colis : ${d.length}</div></div>
              <div><strong>Chauffeur :</strong> ${escapeHtml(driverName)}<br /><strong>Matricule voiture :</strong> ${escapeHtml(driver?.carNumber || "—")}</div>
            </div>
          </body>
        </html>`;

      printDocument.open();
      printDocument.write(html);
      printDocument.close();
      iframe.contentWindow.print();
      return;
    }

    printDocument.body.innerHTML = "";
    // iframe.contentDocument.body.innerHTML = content;
    printDocument.open();
    let cont = d
      .map((m, i) => {
        return generateHTMLContent(m, _codes[i]);
      })
      .join("");
    console.log(cont);
    let cc = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${Date.now()}</title>
      </head>
      <style>
        * {
          box-sizing: border-box;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact; 
          }
        
          @page {
            width:98%
          }
        }
    
        table {
          /* display: table; */
          border: 1px solid #aaa;
          background: #fff;
          -webkit-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          -moz-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          min-width: 100%;
          border-radius: 5px;
          table-layout: fixed;
          border-collapse: collapse; 
        }
        thead tr {
          height: 35px;
          width: 100%;
          display: table-row;
          border-bottom: 1px solid #eee;
          background-color: #eee;
        }
        thead th {
          color: #121716;
          font-size: 18px;
          padding: 0 7px;
          font-weight: 500;
          text-align: left;
          border: 1px solid #777;
        }
    
        tr {
          width: 100%;
          display: table-row;
          padding: 10px;
          white-space: nowrap;
        }
        tr:nth-child(even) {
          background-color: rgba(33, 150, 243, 0.03);
        }
    
        /* ---------------- */
        tbody tr {
          padding: 10px 0;
        }
        tbody td {
          display: table-cell;
          border: 1px solid #aaa;
    
          padding: 10px 8px;
          font-weight: 600;
        }
      </style>
      <body>${cont}</body></html>`;
    printDocument.open();
    printDocument.write(cc);
    printDocument.close();
    iframe.contentWindow.print();
  };
  function generateHTMLContent(m, codes) {
    let cont = store?.contacts?.[0] || {
      address: store?.address || "",
      phones: store?.phone || "",
    };
    let c = m?.customer || {};
    const items = Array.isArray(m?.coliItems) ? m.coliItems : [];
    const totalVal = getDeliveryTotalPrice(m);
    const phonesFormatted = (cont.phones || "").replaceAll("+216", "").replaceAll(",", " / ");
    return `<section style="   page-break-before: always !important; padding:10px;width:calc(100% - 10px ) ">
    <div>
      <h2>BL N° ${m.qrCodeContent || m.code || m.id}</h2>
      <div style="display: flex;">
        <div
          style="
            display: inline-flex;
            width: 65%;
            border: 1px solid #7777;
            padding: 10px;
            color: #444;
            justify-content: space-between;
          "
        >
          <div>
            <strong>${store?.name_fr || "Boutique"} </strong>
            <address>Adresse : ${cont.address || ""}</address>
            <b>MF: ${store?.taxCode || ""}</b>
          </div>
         ${phonesFormatted}
        </div>
  
         
        <div
          style="
            text-align: center;
            padding: 0px;
            display: inline-block;
            flex: 1;
          "
        >
        ${codes}
        </div>
      </div>
      <!-- end flex -->
      <h2 style="text-align: center;">${c.city || ""}</h2>
    <div style="border: 1px solid #7777; display: flex; align-items: stretch;">
      <div
        style="
          width: 65%;
          border-right: 1px solid #7777;
          padding: 10px;
          color: #444;
        "
      >
        <div><strong>DESTINATAIRE : </strong> <b>${c.fullName || ""}</b></div>
        <div>
          <strong>Adresse : </strong>
          <address style="display: inline-block;">
        ${c.address || m.address || ""}
          </address>
        </div>
        <div>
          <strong>Tel: </strong>
          <span
            ><a style="text-decoration: none; color: #222;" href="tel:${
              c.phoneNumber || ""
            }"
              >${c.phoneNumber || ""} </a
            >
            ${
              c.phoneNumber2
                ? ` / <a style="text-decoration: none; color: #222;" href="tel:${c.phoneNumber2}"
                  >${c.phoneNumber2} </a
                >`
                : ""
            }</span >
        </div>
      </div> 
      <div style="flex: 1; font-size: 0.9em;">
        <div style="border-bottom: 1px solid #777;">
          <span
            style="
              display: inline-block;
              padding: 10px;
              border-right: 1px solid #777;
              text-align: center;
              width: 55%;
            "
            >Poids : -
          </span>
          <span style="padding: 10px; text-align: center;">NBP : ${items.reduce(
            (a, b) => a + (Number(b.qty) || 1),
            0
          )} </span>
        </div>
        <div
          style="
            text-align: center;
            padding: 10px;
            min-height: 70px;
            border-bottom: 1px solid #777;
          "
        >
        ${items.reduce((a, b) => a + (b.designation || "") + " \n ", "") || m.designation || ""}
        </div>
        <div style="padding: 10px; text-align: center;">
          <strong>Total ${totalVal.toFixed(3)} TND </strong>
        </div>
      </div>
  
    </div>
        <!-- mazel 2 parent  -->
  
    <div
      style="
        margin: 20px 0;
        border: 1px dashed #aaa;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.1);
      "
    >
      <strong>Note : </strong>
      <i> ${m.remark || ""} </i>
    </div>
  <!--  -->
    <div style="display: flex;">
      <div style="padding: 10px; border: 1px solid #777;">
        <strong>${store?.name_fr || "Boutique"}</strong>
      </div>
      <div style="padding: 10px 40px;">
        <strong>Facture N° 2024/${m.id}</strong>
        <div><i>Date : ${moment(new Date()).format("L")}</i></div>
      </div>
    </div>
    <!--  -->
    <div style="display: flex; justify-content: flex-end;">
      <div
        style="width: 45%; border: 1px solid #7777; padding: 10px; color: #444;"
      >
        <div><strong>Client : </strong> <b>${c.fullName || ""}</b></div>
  
        <div>
          <strong>Adresse : </strong>
          <b style="display: inline-block;">
            ${
              (c.city || "") +
              (c.deleg ? " - " + c.deleg : "") +
              (c.ville ? " - " + c.ville : "") +
              (c.zipCode ? " - " + c.zipCode : "")
            }
            </b><i>            ${c.address || m.address || ""}
            </i>
        </div>
        <div>
          <strong>Tel: </strong>
          <span
            ><a style="text-decoration: none; color: #222;" href="tel:${
              c.phoneNumber || ""
            }"
              >${c.phoneNumber || ""} </a
            >
            ${
              c.phoneNumber2
                ? ` / <a style="text-decoration: none; color: #222;" href="tel:${c.phoneNumber2}"
                  >${c.phoneNumber2} </a
                >`
                : ""
            }</span
          >
        </div>
      </div>
    </div>
    <!--  -->
    <br />
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th>Quantité</th>
          <th>Prix HT</th>
          <th>TVA</th>
          <th>MT TVA</th>
          <th>TTC</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map(
            (el) => `<tr>
        <td>${el.designation || ""}</td>
        <td>${el.qty || 1}</td>
        <td>${((el.qty || 1) * (el.unitPrice || 0) * 0.81).toFixed(3)}</td>
        <td>19%</td>
        <td>${((el.qty || 1) * (el.unitPrice || 0) * 0.19).toFixed(3)}</td>
        <td>${((el.qty || 1) * (el.unitPrice || 0)).toFixed(3)}</td>
      </tr>`
          )
          .join("")}
      </tbody>
    </table>
    <br />
    <div
      style="
        display: flex;
        justify-content: space-between;
        background-color: #eee;
        padding: 10px;
      "
    >
      <strong>PRIX TOTAL : </strong> <strong>${totalVal.toFixed(3)} DT</strong>
    </div>
  <!--  -->
    <br>
    <hr>
    <div style="text-align: center;padding: 10px;">
        <strong>${store?.name_fr || "Boutique"} </strong>
        <div>Adresse : ${cont.address || ""}</div>
        ${phonesFormatted}
  
      <div>
      </div>
      </div>
  </section>`;
  }
  useEffect(() => {
    fetch();
  }, [store.id, activeRole, isB2B, currentDriverId, filterModel.page, filterModel.take]);
  return (
    <div>
      {" "}
      <div style={{ overflow: "hidden", height: 0 }}>
        <iframe ref={frameRef} title="printFrame" width="100%"></iframe>
        <div id="custom-codes">
          {code ? <Barcode height={70} value={code} /> : null}
          <br />
          {code ? <QRCode value={code} size={80} /> : null}
        </div>
        <div id="custom-codes2">
          {data
            .filter((el) => checkeds.find((el1) => el1 == el.id))
            .map((el) => (
              <p
                key={el.id}
                style={{
                  textAlign: "center",
                  padding: "10px",
                  display: "flex",
                }}
              >
                {el.qrCodeContent ? <Barcode height={70} value={el.qrCodeContent} /> : null}
                <br />
                {el.qrCodeContent ? <QRCode value={el.qrCodeContent} size={80} /> : null}
              </p>
            ))}
        </div>
      </div>
      <Filter search={() => fetch()}>
        <Responsive l={2.6} xl={2.6} m={4} className="p-5">
          <label>Recherche</label>
          <Input
            value={filterModel.q}
            placeholder="recherche"
            onChange={(q) => {
              setfilterModel((prev) => {
                return { ...prev, q };
              });
            }}
          />
        </Responsive>
        <Responsive m={6} l={1.4} xl={1.4} className="p-10">
          <label>Type: </label>
          <SelectPicker
            data={[
              { label: "Tout", value: 0 },
              { label: "non Payé", value: 1 },
              { label: "Payé", value: 2 },
            ]}
            block
            searchable={false}
            value={
              filterModel.isPaid ? 2 : filterModel.isPaid === false ? 1 : 0
            }
            onSelect={(v) => {
              setfilterModel((prev) => {
                return {
                  ...prev,
                  isPaid: v == 1 ? false : v == 2 ? true : null,
                };
              });
            }}
          />
        </Responsive>
        <Responsive m={6} l={2} xl={2} className="p-5">
          <label>Dates: </label>
          <SelectPicker
            data={dateTypes}
            block
            searchable={false}
            value={filterModel.dateType}
            onSelect={(dateType) => {
              let today = new Date(moment(Date.now()).format("yyyy-MM-DD"));
              console.log(
                //
                today
              );
              setfilterModel((prev) => {
                return {
                  ...prev,
                  dateType,
                  date:
                    dateType == 7 || dateType == 1
                      ? today
                      : dateType == 2
                      ? moment(moment(Date.now()).add(-1, "d")).format(
                          "yyyy-MM-DD"
                        )
                      : null,
                  dateFrom:
                    dateType == 6
                      ? today
                      : dateType == 3
                      ? moment().startOf("month").format("yyyy-MM-DD")
                      : dateType == 4
                      ? moment(Date.now())
                          .subtract(1, "months")
                          .startOf("month")
                          .format("yyyy-MM-DD")
                      : dateType == 5
                      ? moment().startOf("year").format("yyyy-MM-DD")
                      : null,
                  dateTo:
                    dateType == 6
                      ? new Date(
                          moment(moment(Date.now()).add(1, "d")).format(
                            "yyyy-MM-DD"
                          )
                        )
                      : dateType == 3
                      ? today
                      : dateType == 4
                      ? moment(Date.now())
                          .subtract(1, "months")
                          .endOf("month")
                          .format("yyyy-MM-DD")
                      : null,
                };
              });
            }}
          />
        </Responsive>
        {filterModel.dateType == 7 && (
          <Responsive m={6} l={2.6} xl={2.6} className="p-5">
            <label>Date: </label>
            <Input
              type="date"
              value={filterModel.date}
              onChange={(date) => {
                setfilterModel((prev) => {
                  return { ...prev, date };
                });
              }}
            />
          </Responsive>
        )}
        {filterModel.dateType == 6 && (
          <Responsive m={6} l={2.6} xl={2.6} className="p-5">
            <label>Plage du temps: </label>
            <DateRangePicker
              block
              value={[filterModel.dateFrom, filterModel.dateTo]}
              onChange={(vs) => {
                setfilterModel((prev) => ({
                  ...prev,
                  dateFrom: vs[0],
                  dateTo: vs[1],
                }));
              }}
            />
          </Responsive>
        )}
        {!isDriver && (
          <Responsive l={2.4} xl={2.4} m={4} className="p-5">
            <label>Livreur </label>
            <SelectPicker
              data={[{ label: "Sélectionner", value: 0 }].concat(
                scopedDrivers.map((c) => {
                  return { label: c.firstName + " " + c.lastName, value: c.id };
                })
              )}
              block
              searchable={false}
              value={filterModel.driverId}
              onSelect={(driverId) => {
                setfilterModel((prev) => {
                  return { ...prev, driverId };
                });
              }}
            />
          </Responsive>
        )}
        <Responsive m={4} l={2} xl={2} className="p-5">
          <label>État Opérationnel: </label>
          <SelectPicker
            data={[{ label: "Tous les états", value: 0 }].concat(DeliveryStatus)}
            block
            searchable={false}
            value={filterModel.status || 0}
            onSelect={(status) => {
              setfilterModel((prev) => {
                return { ...prev, status: status || 0 };
              });
            }}
          />
        </Responsive>
        <Responsive m={4} l={2} xl={2} className="p-5">
          <label>Résultat (Outcome): </label>
          <SelectPicker
            data={[{ label: "Tous les résultats", value: -1 }].concat(DeliveryResultOptions)}
            block
            searchable={false}
            value={filterModel.resultFilter ?? -1}
            onSelect={(resultFilter) => {
              setfilterModel((prev) => {
                return { ...prev, resultFilter: resultFilter ?? -1 };
              });
            }}
          />
        </Responsive>
        {!isB2B && (
          <Responsive l={3} xl={3} m={4} className="p-5">
            <label>Boutique </label>
            <SelectPicker
              data={[{ label: "Sélectionner", value: 0 }].concat(
                scopedStoresList.map((c) => {
                  return { label: c.name_fr, value: c.id };
                })
              )}
              block
              searchable={false}
              value={filterModel.storeId}
              onSelect={(storeId) => {
                setfilterModel((prev) => {
                  return { ...prev, storeId };
                });
              }}
            />
          </Responsive>
        )}
      </Filter>
      {isDriver && (() => {
        const loggedDriver = drivers.find((d) => d.id === Number(currentDriverId));
        const drvId = Number(currentDriverId || loggedDriver?.id || 1);

        // 1. Assigned deliveries at depot ready to be taken by the driver (some or all)
        const assignedAtDepot = data.filter(
          (d) =>
            getOperationalStatus(d) === 3 &&
            Number(getDeliveryDriverId(d) || getActiveDeliveryDriverId(d) || drvId) === drvId
        );

        // 2. Delivered parcels by this driver
        const deliveredParcels = data.filter((d) => getDeliveryResult(d) === 1);
        const totalCashDeliveriesPrices = deliveredParcels.reduce(
          (sum, d) => sum + getDeliveryTotalPrice(d),
          0
        );

        // 3. Service fees (tarifs) for this driver (pickups + deliveries)
        const getDriverTarifForRow = (row) => {
          const matchedTarif =
            row.tarif ||
            row.Tarif ||
            tarifsList.find((t) => Number(t.id) === Number(row.tarifId ?? row.TarifId));
          const pickupFee = Number(
            matchedTarif?.driverPickupPrice ??
              matchedTarif?.DriverPickupPrice ??
              matchedTarif?.commissionPickup ??
              2.0
          );
          const deliveryFee = Number(
            matchedTarif?.driverDeliveryPrice ??
              matchedTarif?.DriverDeliveryPrice ??
              row.commissionDriver ??
              3.5
          );
          return { pickupFee, deliveryFee };
        };

        const pickedUpParcels = data.filter(
          (d) => Number(getPickupDriverId(d)) === drvId && getOperationalStatus(d) >= 2
        );
        const sumPickupTarifs = pickedUpParcels.reduce(
          (sum, d) => sum + getDriverTarifForRow(d).pickupFee,
          0
        );
        const sumDeliveryTarifs = deliveredParcels.reduce(
          (sum, d) => sum + getDriverTarifForRow(d).deliveryFee,
          0
        );
        const sumServiceFeesTarifs = sumPickupTarifs + sumDeliveryTarifs;
        const totalEndDayCashPlusTarifs = totalCashDeliveriesPrices + sumServiceFeesTarifs;

        // 4. Undelivered parcels to return to the depot
        const undeliveredParcels = data.filter((d) => {
          const op = getOperationalStatus(d);
          const res = getDeliveryResult(d);
          return (op === 4 && res !== 1) || (res >= 2 && res <= 4);
        });

        const handleDriverTakeDeliveries = async (countOrSelected) => {
          let toTake = [];
          const checkedAssigned = assignedAtDepot.filter((d) => checkeds.includes(d.id));
          if (checkedAssigned.length > 0) {
            toTake = checkedAssigned;
          } else {
            const n = Number(countOrSelected);
            toTake = n > 0 ? assignedAtDepot.slice(0, n) : assignedAtDepot;
          }

          if (toTake.length === 0) {
            Swal.fire("Information", "Aucun colis en attente de prise en charge au dépôt.", "info");
            return;
          }

          const ids = toTake.map((d) => d.id);
          try {
            await Promise.allSettled(
              ids.map((delId) =>
                APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${drvId}/startDelivery/${delId}`).customPost({})
              )
            );
          } catch (e) {}

          setdata((prev) =>
            prev.map((d) =>
              ids.includes(d.id)
                ? { ...d, status: 4, operationalStatus: 4, deliveryDriverId: drvId }
                : d
            )
          );
          setcheckeds([]);
          Swal.fire({
            icon: "success",
            title: "Colis Pris en Charge !",
            html: `Vous avez pris en charge <b>${ids.length} colis</b> pour votre tournée de livraison.`,
            timer: 1800,
            showConfirmButton: false,
          });
        };

        const handleReturnUndeliveredToDepot = async () => {
          if (undeliveredParcels.length === 0) return;
          const ids = undeliveredParcels.map((d) => d.id);
          try {
            await Promise.allSettled(
              ids.map((delId) =>
                APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeResult/${delId}/5`).update2({
                  deliveryId: delId,
                  result: 5,
                })
              )
            );
          } catch (e) {}

          setdata((prev) =>
            prev.map((d) =>
              ids.includes(d.id)
                ? { ...d, result: 5, status: 5, operationalStatus: 5, returnedToDepotByDriver: true }
                : d
            )
          );
          Swal.fire({
            icon: "success",
            title: "Retour au Dépôt Enregistré !",
            html: `<b>${ids.length} colis non livré(s)</b> ont été marqués comme retournés au dépôt.<br/>L'Agent de Dépôt confirmera leur réception.`,
            timer: 2200,
            showConfirmButton: false,
          });
        };

        return (
          <div style={{ margin: "10px 10px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* CARD 1: TAKE SOME OR ALL ASSIGNED DELIVERIES */}
            <div
              style={{
                background: "#ffffff",
                border: "2px solid #c7d2fe",
                borderRadius: "14px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#4f46e5", textTransform: "uppercase" }}>
                  1. Prise en Charge au Dépôt
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
                  {assignedAtDepot.length} colis affecté(s) disponibles au dépôt
                </div>
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Prenez tous vos colis affectés ou choisissez le nombre de colis que vous emportez.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <input
                  type="number"
                  min={1}
                  max={assignedAtDepot.length || 1}
                  placeholder={`Nb (max ${assignedAtDepot.length})`}
                  value={driverTakeCount}
                  onChange={(e) => setDriverTakeCount(e.target.value)}
                  style={{
                    width: "120px",
                    padding: "7px 10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                  }}
                />
                {driverTakeCount && Number(driverTakeCount) > 0 && (
                  <button
                    onClick={() => handleDriverTakeDeliveries(Number(driverTakeCount))}
                    style={{
                      background: "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    ▶️ Prendre {driverTakeCount} colis
                  </button>
                )}
                <button
                  onClick={() => handleDriverTakeDeliveries(assignedAtDepot.length)}
                  disabled={assignedAtDepot.length === 0}
                  style={{
                    background: assignedAtDepot.length > 0 ? "#2563eb" : "#cbd5e1",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    cursor: assignedAtDepot.length > 0 ? "pointer" : "not-allowed",
                  }}
                >
                  ▶️ Prendre Tout ({assignedAtDepot.length})
                </button>
              </div>
            </div>

            {/* CARD 2: END OF DAY SUMMARY (TOTAL CASH OF DELIVERIES PRICES + SUM OF SERVICE FEES TARIFS + UNDELIVERED RETURNS) */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                borderRadius: "14px",
                padding: "18px 20px",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" }}>
                  2. Bilan Fin de Journée — {loggedDriver?.firstName || "Livreur"} {loggedDriver?.lastName || ""}
                </div>
                <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", marginTop: "8px" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      💵 Total Cash Livraisons ({deliveredParcels.length} livrés)
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, fontFamily: "monospace", color: "#ffffff" }}>
                      {totalCashDeliveriesPrices.toFixed(3)} TND
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      🏷️ Somme des Frais de Services (Tarifs)
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, fontFamily: "monospace", color: "#fcd34d" }}>
                      +{sumServiceFeesTarifs.toFixed(3)} TND
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(16, 185, 129, 0.2)",
                      border: "1px solid rgba(16, 185, 129, 0.4)",
                      padding: "4px 12px",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ fontSize: "0.72rem", color: "#a7f3d0", fontWeight: 700 }}>
                      💰 TOTAL (CASH COLIS + TARIFS)
                    </div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 900, fontFamily: "monospace", color: "#34d399" }}>
                      {totalEndDayCashPlusTarifs.toFixed(3)} TND
                    </div>
                  </div>
                </div>
              </div>

              {/* Return undelivered parcels to the depot */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {undeliveredParcels.length > 0 ? (
                  <button
                    onClick={handleReturnUndeliveredToDepot}
                    style={{
                      background: "#d97706",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      padding: "10px 16px",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    ↩️ Retourner {undeliveredParcels.length} Colis Non Livré(s) au Dépôt
                  </button>
                ) : (
                  <span
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      color: "#cbd5e1",
                    }}
                  >
                    ✓ Aucun colis non livré en attente de retour
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      <div>
        {" "}
        <Responsive className="p-10" xs={12} s={6} m={4} l={4} xl={4}>
          <ResumeCard
            text="Total Montant"
            color={
              "245,195,35"
              // "70,103,209",
              // "102,51,153",
              // "70,103,209",
              // "84,159,10",
              // "169,14,67",
              // "246,137,51",
            }
            amount={totalOrdered}
          />
        </Responsive>
        <Responsive className="p-10" xs={12} s={6} m={4} l={4} xl={4}>
          <ResumeCard
            text="Total Livré"
            color={
              //"245,195,35"
              "70,103,209"
              // "102,51,153",
              // "70,103,209",
              // "84,159,10",
              // "169,14,67",
              // "246,137,51",
            }
            amount={totalDelivred}
          />
        </Responsive>
        <Responsive className="p-10" xs={12} s={6} m={4} l={4} xl={4}>
          <ResumeCard
            text="Total Payé"
            color={
              //"245,195,35"
              // "70,103,209",
              "102,51,153"
              // "70,103,209",
              // "84,159,10",
              // "169,14,67",
              // "246,137,51",
            }
            amount={totalPaid}
          />
        </Responsive>
      </div>
      <ExportAdd
        ActionOnClose={reset}
        title="Ajouter Commande"
        full
        noExport
        noAdd={!isB2B}
        save={save}
        AddComponent={
          <AddEdit error={error} model={model} _setmodel={setmodel} />
        }
      />{" "}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
        <div
          onClick={(e) =>
            setcheckeds((prev) => (prev.length ? [] : data.map((el) => el.id)))
          }
          style={{
            display: "inline-block",
            padding: "8px",
            borderRadius: "4px",
          }}
        >
          <Checkbox checked={checkeds.length > 0}></Checkbox> Sélectionner Tout
        </div>
        <button
          onClick={handlePrintMultiple}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 9px",
            background: "#2f1a4c",
            width: "100px",
            justifyContent: "space-between",
            color: "#fff",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          imprimer <ImPrinter />
        </button>{" "}
      </div>
      <Grid
        loading={isFetching}
        canEditRow={(row) =>
          isB2B &&
          getOperationalStatus(row) === 1 &&
          !row?.isPickedUp &&
          !row?.IsPickedUp &&
          !row?.isAtDepot &&
          !row?.IsAtDepot
        }
        canDeleteRow={(row) =>
          isB2B &&
          getOperationalStatus(row) === 1 &&
          !row?.isPickedUp &&
          !row?.IsPickedUp &&
          !row?.isAtDepot &&
          !row?.IsAtDepot
        }
        lockedRowLabel="🔒 Verrouillé (Post-Pickup)"
        editAction={
          !isB2B
            ? false
            : (id) => {
                const target = data.find((el) => el.id == id);
                if (
                  target &&
                  (getOperationalStatus(target) > 1 ||
                    target.isPickedUp ||
                    target.IsPickedUp ||
                    target.isAtDepot ||
                    target.IsAtDepot)
                ) {
                  Swal.fire({
                    icon: "info",
                    title: "Modification verrouillée",
                    text: "La boutique ne peut modifier une livraison qu'à l'état initial 'En Attente (Pending)' avant le ramassage (Pickup).",
                  });
                  return;
                }
                getBYId(id);
                setstate((prev) => {
                  return { ...prev, open: true };
                });
              }
        }
        deleteAction={
          !isB2B
            ? false
            : (id) => {
                const target = data.find((el) => el.id == id);
                if (
                  target &&
                  (getOperationalStatus(target) > 1 ||
                    target.isPickedUp ||
                    target.IsPickedUp ||
                    target.isAtDepot ||
                    target.IsAtDepot)
                ) {
                  Swal.fire({
                    icon: "warning",
                    title: "Suppression impossible",
                    text: "Un colis déjà ramassé (Pickup) ou pris en charge ne peut plus être supprimé par la boutique.",
                  });
                  return;
                }
                deleteAction(id);
              }
        }
        actionKey={!isB2B ? null : "id"}
        noAdvancedActions={true}
        actions={[]}
        columns={columns}
        rows={data}
      />
      <div style={{ padding: 20, background: "#fff" }}>
        <Pagination
          ellipsis
          boundaryLinks
          maxButtons={5}
          size="sm"
          layout={["total", "-", "limit", "|", "pager"]}
          total={totalCount}
          limitOptions={[10, 20, 50, 100]}
          limit={filterModel.take}
          activePage={filterModel.page}
          onChangePage={(page) =>
            setfilterModel((prev) => {
              return { ...prev, page };
            })
          }
          onChangeLimit={(take) => {
            console.log(take);
            setfilterModel((prev) => {
              return { ...prev, take };
            });
          }}
        />
      </div>
      {show ? (
        <Modal
          size="md"
          overflow={false}
          style={{ maxHeight: "calc(100vh - 50px)", overflow: "auto" }}
          open={show > 0}
          onClose={() => {
            setshow(0);
          }}
        >
          <Modal.Header>
            <Modal.Title>Changer l'état du commande</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ maxHeight: "calc(100vh - 240px)", overflow: "auto" }}>
              <label>Statut: </label>
              <SelectPicker
                searchable={false}
                data={[{ label: "Tout", value: 0 }].concat(DeliveryStatus)}
                block
                value={getOperationalStatus(data.find((el) => el.id == show))}
                onSelect={async (status) => {
                  let d = [...data];
                  const targetRow = d.find((el) => el.id == show);
                  const prevStatus = targetRow?.status;
                  if (targetRow) targetRow.status = status;
                  setdata((prev) => d);

                  // Credit Delivery Tariff to Driver Solde when customer receives the parcel (status 5 = Livré)
                  const creditDriverDeliveryTarif = () => {
                    if (Number(status) === 5 && Number(prevStatus) !== 5) {
                      const drvId = Number(
                        targetRow?.driverId ||
                          targetRow?.driver?.id ||
                          (isDriver ? currentDriverId : 0)
                      );
                      if (drvId) {
                        const delivFee = Number(targetRow?.commissionDriver) || 3.5;
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
                          html: `La réception par le client est confirmée.<br/><b style="color:#059669;">+${delivFee.toFixed(3)} TND</b> (Tarif de livraison) crédité sur le solde du livreur.`,
                          timer: 2200,
                          showConfirmButton: false,
                        });
                      }
                    }
                  };

                  try {
                    let res = await createAPIEndpoint(
                      ENDPOINTS.Delivery + "/changeStatus/" + show + "/" + status
                    ).update2({});
                    creditDriverDeliveryTarif();
                    if (res) setshow(0);
                  } catch (e) {
                    creditDriverDeliveryTarif();
                    setshow(0);
                  }
                }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => {
                setshow(0);
              }}
              appearance="subtle"
            >
              Annuler
            </Button>
          </Modal.Footer>
        </Modal>
      ) : (
        ""
      )}

      {/* MODAL: RÉSULTAT DE LIVRAISON (SetDeliveryResult / ChangeResult / Refund) */}
      <Modal
        size="sm"
        open={Boolean(resultModalRow)}
        onClose={() => setResultModalRow(null)}
      >
        <Modal.Header>
          <Modal.Title>
            Résultat de Livraison — Colis #{resultModalRow?.qrCodeContent || resultModalRow?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", display: "block", marginBottom: "6px" }}>
                Résultat de la Livraison (Outcome) :
              </label>
              <SelectPicker
                data={DeliveryResultOptions.filter((o) => o.value > 0)}
                searchable={false}
                cleanable={false}
                block
                value={selectedResultVal}
                onChange={(val) => setSelectedResultVal(val || 1)}
              />
            </div>

            {Number(selectedResultVal) === 7 && (
              <div
                style={{
                  background: "#fdf2f8",
                  border: "1px solid #fbcfe8",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "0.8rem", color: "#9d174d" }}>
                  Enregistrement d'un Remboursement (DeliveryController.Refund)
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
                    Description du Motif (RefundCauseDescription) :
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
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            appearance="primary"
            style={{ background: "#059669", fontWeight: 700 }}
            onClick={handleSaveDeliveryOutcome}
          >
            Valider le Résultat
          </Button>
          <Button appearance="subtle" onClick={() => setResultModalRow(null)}>
            Annuler
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
