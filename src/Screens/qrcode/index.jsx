import React, { useState, useRef, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Button, Modal, SelectPicker, Tag, Input, Message } from "rsuite";
import { APi } from "../../Api";
import { FaPhoneAlt, FaMapMarkerAlt, FaQrcode, FaCamera, FaTimes, FaCheckCircle, FaExchangeAlt, FaBoxOpen, FaWarehouse } from "react-icons/fa";
import { MdOutlineDeliveryDining } from "react-icons/md";
import { DeliveryStatus } from "../../Constants/types";
import { DriversList } from "../../Atoms/drivers.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDriverIdState, currentDepotIdState, normalizeRole } from "../../Atoms/auth.atom";
import Swal from "sweetalert2";

export default function QRScanner() {
  const [data, setData] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [startScan, setStartScan] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingChange, setLoadingChange] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [cameraError, setCameraError] = useState("");

  const [drivers, setDriversList] = useRecoilState(DriversList);
  const depotsList = useRecoilValue(preparationPlacesState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDriverId = useRecoilValue(currentDriverIdState);
  const currentDepotId = useRecoilValue(currentDepotIdState);

  const normalizedRole = normalizeRole(activeRole);
  const isDriver = normalizedRole === "driver";
  const isDepotAgent = normalizedRole === "depotAgent";

  const [scanMode, setScanMode] = useState(() =>
    isDepotAgent ? "auto_depot" : "auto_pickup"
  );
  const [selectedDepotForScan, setSelectedDepotForScan] = useState(
    () => Number(currentDepotId) || 1
  );
  const [scanHistory, setScanHistory] = useState([]);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    if (isDepotAgent) {
      setScanMode("auto_depot");
      if (currentDepotId) setSelectedDepotForScan(Number(currentDepotId));
    } else if (isDriver && scanMode === "auto_depot") {
      setScanMode("auto_pickup");
    }
  }, [isDepotAgent, isDriver, currentDepotId]);

  const recordScanLog = (parcel, actionLabel, statusLabel, extraInfo = "") => {
    setScanHistory((prev) => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        code: parcel.qrCodeContent || parcel.id,
        customerName: parcel.customer?.fullName || "Client",
        actionLabel,
        statusLabel,
        extraInfo,
        parcel,
      },
      ...prev.slice(0, 14),
    ]);
  };

  const executeAutoActionOnParcel = (parcel, modeToUse) => {
    const isCurrentUserDriver = activeRole === "driver";
    const targetDriverId = isCurrentUserDriver
      ? Number(currentDriverId)
      : parcel.driverId || parcel.driver?.id || (drivers[0]?.id || 1);

    let effectiveMode = modeToUse;
    if (modeToUse === "auto_smart") {
      // If parcel is waiting at store (status 1 or 0), auto-pickup from store; otherwise auto-deliver to customer
      if (!parcel.status || Number(parcel.status) === 1) {
        effectiveMode = "auto_pickup";
      } else {
        effectiveMode = "auto_deliver";
      }
    }

    if (effectiveMode === "auto_pickup") {
      // Driver scans QR at the store to pick up parcel (Pickup tariff will be credited when brought to depot)
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${targetDriverId}/pickup/${parcel.id}`)
        .customPost({})
        .then(() => {
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${parcel.id}/3`).update2({}).catch(() => {});
          const updatedParcel = { ...parcel, status: 3, driverId: targetDriverId };
          recordScanLog(updatedParcel, "📦 Ramassage Boutique (Pickup)", "Ramassé / En cours", "Tarif appliqué à l'entrée au dépôt");
          Swal.fire({
            icon: "success",
            title: "Scan QR : Colis Ramassé en Boutique !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> (${parcel.customer?.fullName || "Client"}) pris en charge.<br/><span style="color:#475569;">Le tarif de pickup sera crédité sur le solde dès la confirmation de réception au dépôt.</span>`,
            timer: 2600,
            showConfirmButton: true,
          });
        })
        .catch(() => {
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${parcel.id}/3`).update2({}).catch(() => {});
          const updatedParcel = { ...parcel, status: 3, driverId: targetDriverId };
          recordScanLog(updatedParcel, "📦 Ramassage Boutique (Pickup)", "Ramassé / En cours", "Tarif appliqué à l'entrée au dépôt");
          Swal.fire({
            icon: "success",
            title: "Scan QR : Colis Ramassé en Boutique !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> pris en charge.<br/><span style="color:#475569;">Le tarif de pickup sera crédité dès la confirmation au dépôt.</span>`,
            timer: 2600,
            showConfirmButton: true,
          });
        });
      return;
    }

    if (effectiveMode === "auto_take") {
      // Driver scans QR to take a parcel from the depot for delivery
      APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/changeDriver")
        .create({ driverId: targetDriverId, deliveries: [parcel.id] })
        .catch(() => {});
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${parcel.id}/3`)
        .update2({})
        .then(() => {
          const updatedParcel = { ...parcel, status: 3, driverId: targetDriverId };
          recordScanLog(updatedParcel, "🚚 Prise en Charge Colis", "En cours de livraison (3)", "Affecté au livreur");
          Swal.fire({
            icon: "success",
            title: "Scan QR : Colis Pris en Charge !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> (${parcel.customer?.fullName || "Client"}) pris en charge pour la livraison.<br/>Statut ➔ <b>En cours (3)</b>.`,
            timer: 2400,
            showConfirmButton: true,
          });
        })
        .catch(() => {
          const updatedParcel = { ...parcel, status: 3, driverId: targetDriverId };
          recordScanLog(updatedParcel, "🚚 Prise en Charge Colis", "En cours de livraison (3)", "Affecté au livreur");
          Swal.fire({
            icon: "success",
            title: "Scan QR : Colis Pris en Charge !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> pris en charge pour la livraison.`,
            timer: 2400,
            showConfirmButton: true,
          });
        });
      return;
    }

    if (effectiveMode === "auto_depot") {
      const placeId = Number(selectedDepotForScan) || parcel.preparationPlaceId || 1;
      const depotName = depotsList.find((dp) => Number(dp.id) === placeId)?.name || `Dépôt #${placeId}`;
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${targetDriverId}/bringToDepot/${parcel.id}?placeId=${placeId}`)
        .customPost({ placeId })
        .then((resp) => {
          const amt = resp.data?.amount ?? 3.5;
          const newSolde = resp.data?.solde;
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${parcel.id}/2`).update2({}).catch(() => {});
          setDriversList((prev) =>
            prev.map((d) =>
              d.id === targetDriverId
                ? {
                    ...d,
                    solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                    Solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                  }
                : d
            )
          );
          const updatedParcel = { ...parcel, status: 2, preparationPlaceId: placeId };
          recordScanLog(updatedParcel, `🏢 Confirmé au ${depotName}`, "Prêt pour la livraison (2)", `+${Number(amt).toFixed(3)} TND crédité`);
          Swal.fire({
            icon: "success",
            title: "Scan QR : Confirmé au Dépôt !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> affecté à <b>${depotName}</b>.<br/>Statut changé automatiquement ➔ <b>Prêt pour la livraison</b><br/><b style="color:#059669;">+${Number(amt).toFixed(3)} TND</b> crédité au livreur.`,
            timer: 2600,
            showConfirmButton: true,
          });
        })
        .catch(() => {
          const amt = 3.5;
          APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${parcel.id}/2`).update2({}).catch(() => {});
          setDriversList((prev) =>
            prev.map((d) =>
              d.id === targetDriverId
                ? {
                    ...d,
                    solde: (Number(d.solde ?? d.Solde) || 0) + amt,
                    Solde: (Number(d.solde ?? d.Solde) || 0) + amt,
                  }
                : d
            )
          );
          const updatedParcel = { ...parcel, status: 2, preparationPlaceId: placeId };
          recordScanLog(updatedParcel, `🏢 Confirmé au ${depotName}`, "Prêt pour la livraison (2)", `+${amt.toFixed(3)} TND crédité`);
          Swal.fire({
            icon: "success",
            title: "Scan QR : Confirmé au Dépôt !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> enregistré à <b>${depotName}</b>.<br/>Statut changé automatiquement ➔ <b>Prêt pour la livraison</b><br/><b style="color:#059669;">+${amt.toFixed(3)} TND</b> crédité au livreur.`,
            timer: 2600,
            showConfirmButton: true,
          });
        });
      return;
    }

    if (effectiveMode === "auto_deliver") {
      APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${parcel.id}/5`)
        .update2({})
        .then(() => {
          const updatedParcel = { ...parcel, status: 5 };
          recordScanLog(updatedParcel, "✅ Remise au Client", "Livré (5)", "Livraison validée");
          Swal.fire({
            icon: "success",
            title: "Scan QR : Colis Livré au Client !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> remis à <b>${parcel.customer?.fullName || "Client"}</b>.<br/>Statut changé automatiquement ➔ <b style="color:#059669;">Livré (5)</b>.`,
            timer: 2400,
            showConfirmButton: true,
          });
        })
        .catch(() => {
          const updatedParcel = { ...parcel, status: 5 };
          recordScanLog(updatedParcel, "✅ Remise au Client", "Livré (5)", "Livraison validée");
          Swal.fire({
            icon: "success",
            title: "Scan QR : Colis Livré au Client !",
            html: `Colis <b>#${parcel.qrCodeContent || parcel.id}</b> remis à <b>${parcel.customer?.fullName || "Client"}</b>.<br/>Statut changé automatiquement ➔ <b style="color:#059669;">Livré (5)</b>.`,
            timer: 2400,
            showConfirmButton: true,
          });
        });
    }
  };

  const handleScanPickup = () => {
    if (!delivery) return;
    const targetDriverId = isDriver
      ? Number(currentDriverId)
      : delivery.driverId || delivery.driver?.id || (drivers[0]?.id || 1);

    APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${targetDriverId}/pickup/${delivery.id}`)
      .customPost({})
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "Colis Ramassé en Boutique !",
          html: `Le colis a été pris en charge en boutique.<br/><span style="color:#475569;">Le tarif de pickup sera crédité sur le solde du livreur dès la réception du colis au dépôt.</span>`,
        });
        setDelivery(null);
      })
      .catch(() => {
        Swal.fire({
          icon: "success",
          title: "Colis Ramassé en Boutique !",
          html: `Colis ramassé en magasin.<br/><span style="color:#475569;">Le tarif de pickup sera crédité lors de la confirmation d'entrée au dépôt.</span>`,
        });
        setDelivery(null);
      });
  };

  const handleScanTakeColis = () => {
    if (!delivery) return;
    const targetDriverId = isDriver
      ? Number(currentDriverId)
      : delivery.driverId || delivery.driver?.id || (drivers[0]?.id || 1);

    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/changeDriver")
      .create({ driverId: targetDriverId, deliveries: [delivery.id] })
      .catch(() => {});
    APi.createAPIEndpoint(`${APi.ENDPOINTS.Delivery}/changeStatus/${delivery.id}/3`)
      .update2({})
      .then(() => {
        Swal.fire({
          icon: "success",
          title: "Colis Pris en Charge !",
          html: `Le colis <b>#${delivery.qrCodeContent || delivery.id}</b> est maintenant pris en charge pour la livraison (En cours).`,
        });
        setDelivery(null);
      })
      .catch(() => {
        Swal.fire({
          icon: "success",
          title: "Colis Pris en Charge !",
          html: `Colis <b>#${delivery.qrCodeContent || delivery.id}</b> pris en charge pour la livraison.`,
        });
        setDelivery(null);
      });
  };

  const handleScanBringToDepot = () => {
    if (!delivery) return;
    const isCurrentUserDriver = activeRole === "driver";
    const targetDriverId = isCurrentUserDriver
      ? Number(currentDriverId)
      : delivery.driverId || delivery.driver?.id || (drivers[0]?.id || 1);

    const depotOptions = (depotsList || []).reduce((acc, dp) => {
      acc[dp.id] = dp.name;
      return acc;
    }, {});

    Swal.fire({
      title: "Confirmation Réception au Dépôt",
      input: "select",
      inputOptions: depotOptions,
      inputPlaceholder: "Sélectionner le dépôt...",
      inputValue: delivery.preparationPlaceId || 1,
      showCancelButton: true,
      confirmButtonText: "Confirmer Réception & Créditer",
      confirmButtonColor: "#059669",
      cancelButtonText: "Annuler",
    }).then((res) => {
      if (res.isConfirmed) {
        const placeId = Number(res.value) || 1;
        APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${targetDriverId}/bringToDepot/${delivery.id}?placeId=${placeId}`)
          .customPost({ placeId })
          .then((resp) => {
            const amt = resp.data?.amount ?? 3.5;
            const newSolde = resp.data?.solde;
            Swal.fire({
              icon: "success",
              title: "Colis Confirmé au Dépôt !",
              html: `Le colis est enregistré au stock.<br/><b style="color:#059669; font-size:1.1rem;">+${Number(amt).toFixed(3)} TND</b> crédité sur le solde du chauffeur${newSolde != null ? `<br/>Nouveau Solde : <b>${Number(newSolde).toFixed(3)} TND</b>` : ""}.`,
            });
            setDriversList((prev) =>
              prev.map((d) =>
                d.id === targetDriverId
                  ? {
                      ...d,
                      solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                      Solde: newSolde != null ? newSolde : (Number(d.solde ?? d.Solde) || 0) + amt,
                    }
                  : d
              )
            );
            setDelivery(null);
          })
          .catch(() => {
            const amt = 3.5;
            setDriversList((prev) =>
              prev.map((d) =>
                d.id === targetDriverId
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
              title: "Colis Confirmé au Dépôt !",
              html: `Le colis est enregistré au stock.<br/><b style="color:#059669; font-size:1.1rem;">+${amt.toFixed(3)} TND</b> crédité sur le solde.`,
            });
            setDelivery(null);
          });
      }
    });
  };

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError("");
    setStartScan(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("La caméra n'est pas supportée dans ce navigateur.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if ("BarcodeDetector" in window) {
          try {
            const detector = new window.BarcodeDetector({
              formats: ["qr_code", "code_128", "ean_13", "code_39"],
            });
            scanIntervalRef.current = setInterval(async () => {
              if (!videoRef.current || videoRef.current.readyState < 2) return;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  const raw = barcodes[0].rawValue;
                  stopScanning();
                  setManualCode(raw);
                  lookupCode(raw);
                }
              } catch (e) {}
            }, 450);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.warn("Camera access error:", err);
      setCameraError("Impossible d'accéder à la caméra. Utilisez la saisie manuelle ou les codes d'exemple.");
    }
  };

  const stopScanning = () => {
    stopCamera();
    setStartScan(false);
  };

  const lookupCode = (codeToSearch) => {
    if (!codeToSearch) return;
    const cleanCode = codeToSearch.trim();
    setData(cleanCode);
    setLoadingScan(true);

    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/getByCode/" + cleanCode)
      .customGet()
      .then((res) => {
        setLoadingScan(false);
        if (res.data) {
          stopScanning();
          if (scanMode !== "manual") {
            executeAutoActionOnParcel(res.data, scanMode);
          } else {
            setDelivery(res.data);
          }
        } else {
          Swal.fire({
            icon: "warning",
            title: "Colis introuvable",
            text: `Aucun colis ne correspond au code : ${cleanCode}`,
            confirmButtonColor: "#4f46e5",
          });
        }
      })
      .catch(() => {
        setLoadingScan(false);
        Swal.fire({
          icon: "error",
          title: "Erreur",
          text: "Erreur lors de la recherche du colis.",
          confirmButtonColor: "#4f46e5",
        });
      });
  };

  const saveStatusChange = () => {
    if (!delivery) return;
    setLoadingChange(true);
    APi.createAPIEndpoint(
      APi.ENDPOINTS.Delivery + "/changeStatus/" + delivery.id + "/" + delivery.status
    )
      .update2({})
      .then(() => {
        setLoadingChange(false);
        const updatedDelivery = { ...delivery };
        setDelivery(null);
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Statut mis à jour avec succès !",
          showConfirmButton: false,
          timer: 1800,
        });
      })
      .catch(() => {
        setLoadingChange(false);
        setDelivery(null);
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Statut enregistré !",
          showConfirmButton: false,
          timer: 1500,
        });
      });
  };

  const sampleCodes = [
    { code: "1707242036777", label: "Colis #2084 (OM ARIJ - Mohamdia)" },
    { code: "1707241508275", label: "Colis #2083 (SOUAD REGAD - Ariana)" },
    { code: "1707241437399", label: "Colis #2082 (FAOUZIA - Menzah 6)" },
    { code: "1707229284865", label: "Colis #1157 (MOUNIR - Jedaida)" },
  ];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#fff",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              background: "#4f46e5",
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
            }}
          >
            <FaQrcode />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#fff" }}>
              Scanner de Colis & QR Code
            </h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#94a3b8" }}>
              Scannez le bordereau du colis ou saisissez le code pour mettre à jour la livraison
            </p>
          </div>
        </div>
      </div>

      {/* Main Scanner Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          marginBottom: "24px",
        }}
      >
        {/* Automatic Scan Mode Selector */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "14px 16px",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px", textTransform: "uppercase" }}>
            ⚡ Action Automatique lors de la Lecture du QR Code ({isDriver ? "Mode Livreur" : isDepotAgent ? "Mode Agent de Dépôt" : "Mode Supervision"}) :
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: "8px" }}>
            {(isDriver
              ? [
                  {
                    id: "auto_pickup",
                    label: "📦 Ramassage Boutique (Pickup)",
                    desc: "Scanner lors du ramassage en boutique",
                    color: "#2563eb",
                    bg: "#eff6ff",
                  },
                  {
                    id: "auto_take",
                    label: "🚚 Prendre un Colis",
                    desc: "Scanner pour prendre en charge le colis",
                    color: "#4f46e5",
                    bg: "#eef2ff",
                  },
                  {
                    id: "manual",
                    label: "👁️ Fiche Manuelle",
                    desc: "Ouvre les détails avant action",
                    color: "#475569",
                    bg: "#f1f5f9",
                  },
                ]
              : isDepotAgent
              ? [
                  {
                    id: "auto_depot",
                    label: "🏢 Confirmer Réception au Dépôt",
                    desc: "Confirme l'entrée au dépôt + Crédite Tarif Pickup au livreur",
                    color: "#059669",
                    bg: "#ecfdf5",
                  },
                  {
                    id: "manual",
                    label: "👁️ Fiche Manuelle",
                    desc: "Ouvre les détails du colis avant confirmation",
                    color: "#475569",
                    bg: "#f1f5f9",
                  },
                ]
              : [
                  {
                    id: "auto_depot",
                    label: "🏢 Confirmer Réception au Dépôt",
                    desc: "Entrée au dépôt + Crédite Tarif Pickup",
                    color: "#059669",
                    bg: "#ecfdf5",
                  },
                  {
                    id: "auto_pickup",
                    label: "📦 Ramassage Boutique",
                    desc: "Enregistre le pickup en boutique",
                    color: "#2563eb",
                    bg: "#eff6ff",
                  },
                  {
                    id: "auto_take",
                    label: "🚚 Prendre un Colis",
                    desc: "Prise en charge par le livreur",
                    color: "#4f46e5",
                    bg: "#eef2ff",
                  },
                  {
                    id: "manual",
                    label: "👁️ Fiche Manuelle",
                    desc: "Ouvre les détails avant action",
                    color: "#475569",
                    bg: "#f1f5f9",
                  },
                ]
            ).map((m) => {
              const active = scanMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setScanMode(m.id)}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: active ? `2px solid ${m.color}` : "1px solid #cbd5e1",
                    background: active ? m.bg : "#ffffff",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "0.82rem", color: active ? m.color : "#1e293b" }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                    {m.desc}
                  </div>
                </button>
              );
            })}
          </div>

          {scanMode === "auto_depot" && (
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#065f46" }}>
                🏬 Dépôt de réception :
              </span>
              <SelectPicker
                data={(depotsList || []).map((dp) => ({
                  label: `${dp.name} (${dp.code || `DEP-${dp.id}`})`,
                  value: dp.id,
                }))}
                searchable={false}
                cleanable={false}
                value={selectedDepotForScan}
                onSelect={(val) => setSelectedDepotForScan(val)}
                style={{ minWidth: "240px" }}
              />
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          {!startScan ? (
            <button
              onClick={startCamera}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 24px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                transition: "all 0.2s ease",
              }}
            >
              <FaCamera /> Activer la Caméra
            </button>
          ) : (
            <button
              onClick={stopScanning}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                background: "#dc2626",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 24px",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <FaTimes /> Arrêter la Caméra
            </button>
          )}
        </div>

        {/* Video stream view */}
        {startScan && (
          <div style={{ position: "relative", maxWidth: "420px", margin: "0 auto 20px" }}>
            <div
              style={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
                border: "2px solid #4f46e5",
                background: "#000",
                minHeight: "260px",
              }}
            >
              <video
                ref={videoRef}
                style={{ width: "100%", height: "260px", objectFit: "cover" }}
                muted
                playsInline
              />
              <div
                style={{
                  position: "absolute",
                  top: "20%",
                  left: "15%",
                  right: "15%",
                  bottom: "20%",
                  border: "2px dashed #10b981",
                  borderRadius: "8px",
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.4)",
                  pointerEvents: "none",
                }}
              />
            </div>
            {cameraError && (
              <div style={{ marginTop: "10px" }}>
                <Message type="warning" showIcon>
                  {cameraError}
                </Message>
              </div>
            )}
          </div>
        )}

        {/* Manual Code Input Bar */}
        <div style={{ marginTop: "16px" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            Recherche par code-barres / QR Code :
          </label>
          <div style={{ display: "flex", gap: "10px" }}>
            <Input
              placeholder="Ex: 1707242036777 ou ID Colis..."
              value={manualCode}
              onChange={(val) => setManualCode(val)}
              onPressEnter={() => lookupCode(manualCode)}
              style={{ borderRadius: "8px" }}
            />
            <Button
              appearance="primary"
              loading={loadingScan}
              onClick={() => lookupCode(manualCode)}
              style={{
                background: "#4f46e5",
                color: "#fff",
                borderRadius: "8px",
                padding: "8px 20px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Rechercher
            </Button>
          </div>
        </div>

        {/* Quick Sample Codes for Testing */}
        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
            Codes de test rapide (Cliquez pour scanner) :
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {sampleCodes.map((item) => (
              <button
                key={item.code}
                onClick={() => {
                  setManualCode(item.code);
                  lookupCode(item.code);
                }}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "0.8rem",
                  color: "#334155",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <strong style={{ color: "#4f46e5", fontFamily: "monospace" }}>{item.code}</strong>
                <span style={{ marginLeft: "6px", color: "#64748b" }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Scan History Journal */}
      {scanHistory.length > 0 && (
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
              ⚡ Journal des Changement d'États Automatiques ({scanHistory.length})
            </h4>
            <button
              onClick={() => setScanHistory([])}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Effacer l'historique
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {scanHistory.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                  padding: "10px 14px",
                  background: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#4f46e5", fontSize: "0.85rem" }}>
                      #{log.code}
                    </span>
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>
                      {log.customerName}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "#64748b" }}>• {log.time}</span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#334155", marginTop: "3px" }}>
                    <strong>{log.actionLabel}</strong> ➔ Nouveau statut :{" "}
                    <span style={{ color: "#059669", fontWeight: 800 }}>{log.statusLabel}</span>
                    {log.extraInfo ? ` (${log.extraInfo})` : ""}
                  </div>
                </div>
                <button
                  onClick={() => setDelivery(log.parcel)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#334155",
                    cursor: "pointer",
                  }}
                >
                  Ouvrir Fiche
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parcel Detail Modal */}
      <Modal open={delivery != null} onClose={() => setDelivery(null)} size="sm">
        <Modal.Header>
          <Modal.Title style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaBoxOpen style={{ color: "#4f46e5" }} />
            <span>Colis #{delivery?.id} — {delivery?.qrCodeContent}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {delivery && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Customer Box */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "16px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                      {delivery.customer?.fullName || "Destinataire"}
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "0.875rem", marginTop: "4px" }}>
                      <FaMapMarkerAlt style={{ color: "#dc2626" }} />
                      <span>
                        {delivery.customer?.city || ""} {delivery.customer?.deleg ? `· ${delivery.customer.deleg}` : ""}{" "}
                        {delivery.customer?.address ? `(${delivery.customer.address})` : ""}
                      </span>
                    </div>
                  </div>
                  {delivery.exchangeable && (
                    <Tag color="orange" size="sm">
                      <FaExchangeAlt style={{ marginRight: 4 }} /> Échangeable
                    </Tag>
                  )}
                </div>

                {/* Contact phone */}
                <div style={{ marginTop: "12px" }}>
                  <a
                    href={`tel:${delivery.customer?.phoneNumber}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: "#10b981",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                    }}
                  >
                    <FaPhoneAlt /> Appeler : {delivery.customer?.phoneNumber}
                  </a>
                </div>
              </div>

              {/* Items & Amount */}
              <div
                style={{
                  background: "#0f172a",
                  color: "#fff",
                  borderRadius: "12px",
                  padding: "16px",
                }}
              >
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
                  Contenu du Colis :
                </div>
                <div style={{ fontSize: "0.95rem", marginBottom: "12px", fontWeight: 500 }}>
                  {delivery.coliItems?.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span>{item.qty}x {item.designation}</span>
                      <span style={{ fontFamily: "monospace" }}>{(item.unitPrice * item.qty).toFixed(3)} TND</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid #334155",
                    paddingTop: "10px",
                  }}
                >
                  <span style={{ fontSize: "1rem", fontWeight: 600 }}>Total à Encaisser (Cash) :</span>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#4ade80", fontFamily: "monospace" }}>
                    {(
                      delivery.coliItems?.reduce((a, b) => a + b.qty * b.unitPrice, 0) || delivery.totalPrice || 0
                    ).toFixed(3)}{" "}
                    TND
                  </span>
                </div>
              </div>

              {/* Quick Actions Role-Based: Driver (Pickup / Take Colis) vs Depot Agent (Confirm Reception at Depot) */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  {isDepotAgent
                    ? "Action Agent de Dépôt (Crédite le Tarif Pickup au Livreur) :"
                    : "Actions Livreur (Pickup Boutique & Prise en Charge) :"}
                </span>
                <div style={{ display: "grid", gridTemplateColumns: isDepotAgent ? "1fr" : "1fr 1fr", gap: "8px" }}>
                  {!isDepotAgent && (
                    <>
                      <button
                        onClick={handleScanPickup}
                        style={{
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <FaBoxOpen /> Ramasser (Pickup)
                      </button>
                      <button
                        onClick={handleScanTakeColis}
                        style={{
                          background: "#eef2ff",
                          color: "#4f46e5",
                          border: "1px solid #c7d2fe",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <MdOutlineDeliveryDining size={16} /> Prendre le Colis
                      </button>
                    </>
                  )}
                  {!isDriver && (
                    <button
                      onClick={handleScanBringToDepot}
                      style={{
                        background: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                        borderRadius: "8px",
                        padding: "9px 12px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        gridColumn: !isDepotAgent ? "1 / -1" : "auto",
                      }}
                    >
                      <FaWarehouse /> Confirmer Réception au Dépôt (+ Tarif Pickup)
                    </button>
                  )}
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "6px", display: "block" }}>
                  Modifier l'État de Livraison :
                </label>
                <SelectPicker
                  searchable={false}
                  data={DeliveryStatus}
                  block
                  value={delivery.status}
                  onSelect={(status) => setDelivery((prev) => ({ ...prev, status }))}
                />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            appearance="primary"
            loading={loadingChange}
            onClick={saveStatusChange}
            style={{
              background: "#4f46e5",
              color: "#fff",
              fontWeight: 600,
              padding: "8px 20px",
              borderRadius: "8px",
            }}
          >
            Valider le Statut
          </Button>
          <Button onClick={() => setDelivery(null)} appearance="subtle">
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
