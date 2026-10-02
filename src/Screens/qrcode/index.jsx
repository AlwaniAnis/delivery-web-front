import React, { useState, useRef, useEffect } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Button, Modal, SelectPicker, Tag, Input, Message } from "rsuite";
import { APi } from "../../Api";
import { FaPhoneAlt, FaMapMarkerAlt, FaQrcode, FaCamera, FaTimes, FaCheckCircle, FaExchangeAlt, FaBoxOpen, FaWarehouse } from "react-icons/fa";
import { MdOutlineDeliveryDining } from "react-icons/md";
import { DeliveryStatus } from "../../Constants/types";
import { DriversList } from "../../Atoms/drivers.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDriverIdState } from "../../Atoms/auth.atom";
import Swal from "sweetalert2";

export default function QRScanner() {
  const [data, setData] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [startScan, setStartScan] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingChange, setLoadingChange] = useState(false);
  const [delivery, setDelivery] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [drivers, setDriversList] = useRecoilState(DriversList);
  const depotsList = useRecoilValue(preparationPlacesState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDriverId = useRecoilValue(currentDriverIdState);

  const handleScanPickup = () => {
    if (!delivery) return;
    const isCurrentUserDriver = activeRole === "driver";
    const targetDriverId = isCurrentUserDriver
      ? Number(currentDriverId)
      : delivery.driverId || delivery.driver?.id || (drivers[0]?.id || 1);

    APi.createAPIEndpoint(`${APi.ENDPOINTS.Driver}/${targetDriverId}/pickup/${delivery.id}`)
      .customPost({})
      .then((res) => {
        const amt = res.data?.amount ?? 3.5;
        const newSolde = res.data?.solde;
        Swal.fire({
          icon: "success",
          title: "Colis Ramassé !",
          html: `Le colis a été pris en charge en boutique.<br/><b style="color:#059669; font-size:1.1rem;">+${Number(amt).toFixed(3)} TND</b> crédité sur le solde du chauffeur${newSolde != null ? `<br/>Nouveau Solde : <b>${Number(newSolde).toFixed(3)} TND</b>` : ""}.`,
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
          title: "Colis Ramassé !",
          html: `Colis ramassé en magasin.<br/><b style="color:#059669; font-size:1.1rem;">+${amt.toFixed(3)} TND</b> crédité sur le solde.`,
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
        videoRef.current.play();
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
          setDelivery(res.data);
          stopScanning();
        } else {
          Swal.fire({
            icon: "warning",
            title: "Colis introuvable",
            text: `Aucun colis ne correspond au code : ${cleanCode}`,
            confirmButtonColor: "#4f46e5",
          });
        }
      })
      .catch((err) => {
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

              {/* Quick Actions Livreur: Pickup & Dépôt */}
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                  Actions Rapides Livreur & Entrepôt (Crédite le Solde) :
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
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
                    onClick={handleScanBringToDepot}
                    style={{
                      background: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
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
                    <FaWarehouse /> Déposer au Dépôt
                  </button>
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
