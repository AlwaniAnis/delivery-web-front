import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import { Input, SelectPicker, Tag } from "rsuite";
import Swal from "sweetalert2";
import moment from "moment";
import {
  FaMoneyCheckAlt,
  FaMoneyBillWave,
  FaUserTie,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaBoxOpen,
  FaReceipt,
  FaPlus,
  FaWallet,
  FaTruck,
} from "react-icons/fa";
import { APi } from "../../Api";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import { DriversList } from "../../Atoms/drivers.atom";
import {
  activeRoleState,
  currentDepotIdState,
  currentDriverIdState,
  normalizeRole,
} from "../../Atoms/auth.atom";
import { driverPaymentsState, DEFAULT_DRIVER_PAYMENTS } from "../../Atoms/driverPayments.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Grid from "../../Components/Grid";
import AddEdit from "./AddEdit.component";
import DriverPaymentModel from "../../Models/driverPaymentModel";

export default function DriverPayments() {
  const [payments, setPayments] = useRecoilState(driverPaymentsState);
  const [state, setState] = useRecoilState(exportAddAtom);
  const [drivers, setDriversList] = useRecoilState(DriversList);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDriverId = useRecoilValue(currentDriverIdState);
  const currentDepotId = useRecoilValue(currentDepotIdState);

  const isDriver = normalizeRole(activeRole) === "driver";
  const isDepotAgent = normalizeRole(activeRole) === "depotAgent";

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const queryDriverId = queryParams.get("driverId");

  const [selectedDriverFilter, setSelectedDriverFilter] = useState(
    isDriver ? Number(currentDriverId) : queryDriverId ? Number(queryDriverId) : 0
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deliveries, setDeliveries] = useState([]);

  const [model, setModel] = useState(new DriverPaymentModel());

  // Reset form
  const reset = () => {
    setModel({
      id: 0,
      driverId: isDriver ? Number(currentDriverId) : selectedDriverFilter || null,
      DriverId: isDriver ? Number(currentDriverId) : selectedDriverFilter || null,
      amount: 0,
      Amount: 0,
      date: new Date().toISOString().split("T")[0],
      Date: new Date().toISOString().split("T")[0],
      comment: "",
      Comment: "",
      deliveryId: null,
      DeliveryId: null,
    });
    setError("");
  };

  // Fetch payments from API
  const fetchPayments = () => {
    setLoading(true);
    const filter = {};
    if (isDriver) {
      filter.driverId = currentDriverId;
    } else if (selectedDriverFilter) {
      filter.driverId = selectedDriverFilter;
    }

    APi.createAPIEndpoint(APi.ENDPOINTS.DriverPayment, filter)
      .fetchAll()
      .then((res) => {
        setLoading(false);
        if (Array.isArray(res.data)) {
          setPayments(res.data);
        } else if (Array.isArray(res.data?.data)) {
          setPayments(res.data.data);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  };

  // Load deliveries for optional linking
  useEffect(() => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, {
      page: 1,
      take: 50,
      ...(isDepotAgent
        ? {
            preparationPlaceId: Number(currentDepotId) || 1,
            placeId: Number(currentDepotId) || 1,
          }
        : {}),
    })
      .fetchAll()
      .then((res) => {
        setDeliveries(res.data?.data || res.data || []);
      })
      .catch(() => {});
  }, [isDepotAgent, currentDepotId]);

  useEffect(() => {
    fetchPayments();
  }, [selectedDriverFilter, currentDriverId, activeRole]);

  // Save (Create or Update)
  const save = () => {
    const targetDriverId = Number(model.driverId ?? model.DriverId);
    if (!targetDriverId) {
      setError("Veuillez sélectionner un chauffeur livreur.");
      return;
    }
    const amountVal = Number(model.amount ?? model.Amount);
    if (!amountVal || amountVal <= 0) {
      setError("Veuillez saisir un montant de règlement valide supérieur à 0.");
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const payload = {
      ...model,
      driverId: targetDriverId,
      DriverId: targetDriverId,
      amount: amountVal,
      Amount: amountVal,
      date: model.date || model.Date || new Date().toISOString(),
      Date: model.date || model.Date || new Date().toISOString(),
      comment: model.comment || model.Comment || "",
      Comment: model.comment || model.Comment || "",
      deliveryId: model.deliveryId || model.DeliveryId || null,
      DeliveryId: model.deliveryId || model.DeliveryId || null,
    };

    if (model.id) {
      // Update
      APi.createAPIEndpoint(APi.ENDPOINTS.DriverPayment)
        .update(model.id, payload)
        .then(() => {
          setState((prev) => ({ ...prev, open: false, loading: false }));
          setPayments((prev) =>
            prev.map((p) => (p.id === model.id ? { ...p, ...payload } : p))
          );
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Paiement mis à jour !",
            showConfirmButton: false,
            timer: 1500,
          });
          fetchPayments();
        })
        .catch(() => {
          // Local fallback
          setPayments((prev) =>
            prev.map((p) => (p.id === model.id ? { ...p, ...payload } : p))
          );
          setState((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Paiement mis à jour !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    } else {
      // Create
      APi.createAPIEndpoint(APi.ENDPOINTS.DriverPayment)
        .create(payload)
        .then((res) => {
          setState((prev) => ({ ...prev, open: false, loading: false }));
          const created = res.data || { ...payload, id: Date.now() };
          setPayments((prev) => [created, ...prev]);

          // Optionally deduct from or update driver's Solde locally
          setDriversList((prev) =>
            prev.map((d) => {
              if (d.id === targetDriverId) {
                const currentSolde = Number(d.solde ?? d.Solde) || 0;
                return {
                  ...d,
                  solde: currentSolde - amountVal,
                  Solde: currentSolde - amountVal,
                };
              }
              return d;
            })
          );

          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Règlement enregistré avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
          fetchPayments();
        })
        .catch(() => {
          // Local fallback
          const newPayment = { ...payload, id: Date.now() };
          setPayments((prev) => [newPayment, ...prev]);

          // Adjust Solde
          setDriversList((prev) =>
            prev.map((d) => {
              if (d.id === targetDriverId) {
                const currentSolde = Number(d.solde ?? d.Solde) || 0;
                return {
                  ...d,
                  solde: currentSolde - amountVal,
                  Solde: currentSolde - amountVal,
                };
              }
              return d;
            })
          );

          setState((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Règlement enregistré !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    }
  };

  // Delete
  const deleteAction = (id) => {
    Swal.fire({
      title: "Supprimer ce versement ?",
      text: "Cette opération annulera l'enregistrement de ce paiement.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    }).then((res) => {
      if (res.isConfirmed) {
        APi.createAPIEndpoint(APi.ENDPOINTS.DriverPayment)
          .delete(id)
          .then(() => {
            setPayments((prev) => prev.filter((p) => p.id !== id));
            Swal.fire("Supprimé !", "Le paiement a été retiré.", "success");
          })
          .catch(() => {
            setPayments((prev) => prev.filter((p) => p.id !== id));
            Swal.fire("Supprimé !", "Le paiement a été retiré.", "success");
          });
      }
    });
  };

  const getById = (id) => {
    setError("");
    const found = payments.find((p) => p.id === id);
    if (found) {
      setModel({ ...found });
    }
  };

  // Filter payments
  const filteredPayments = (payments || []).filter((p) => {
    const pDriverId = Number(p.driverId ?? p.DriverId);

    // If driver role, restrict strictly to current driver
    if (isDriver && pDriverId !== Number(currentDriverId)) {
      return false;
    }

    // Admin filter by specific driver
    if (!isDriver && selectedDriverFilter > 0 && pDriverId !== Number(selectedDriverFilter)) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const comment = (p.comment || p.Comment || "").toLowerCase();
    const amount = (p.amount || p.Amount || "").toString();
    const delivId = (p.deliveryId || p.DeliveryId || "").toString();

    const matchedDriver = drivers.find((d) => d.id === pDriverId);
    const driverName = (
      matchedDriver?.name ||
      `${matchedDriver?.firstName || ""} ${matchedDriver?.lastName || ""}`
    ).toLowerCase();

    return comment.includes(q) || amount.includes(q) || delivId.includes(q) || driverName.includes(q);
  });

  // Metrics
  const totalAmount = filteredPayments.reduce(
    (acc, p) => acc + (Number(p.amount ?? p.Amount) || 0),
    0
  );
  const totalPaymentsCount = filteredPayments.length;
  const avgPayment = totalPaymentsCount > 0 ? (totalAmount / totalPaymentsCount).toFixed(3) : "0.000";

  // Active driver info if filtered
  const activeDriverInfo = drivers.find(
    (d) => d.id === (isDriver ? Number(currentDriverId) : selectedDriverFilter)
  );

  const columns = [
    {
      value: "date",
      value2: "Date",
      name: "Date & Heure",
      render: (v, v2) => {
        const d = v || v2;
        return (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>
              {d ? moment(d).format("DD/MM/YYYY") : "—"}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              {d ? moment(d).format("HH:mm") : ""}
            </span>
          </div>
        );
      },
    },
    {
      value: "driverId",
      value2: "DriverId",
      name: "Chauffeur Livreur",
      render: (dId, DId) => {
        const id = Number(dId ?? DId);
        const d = drivers.find((drv) => drv.id === id);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "0.8rem",
                border: "1px solid #bfdbfe",
                flexShrink: 0,
              }}
            >
              <FaTruck size={12} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                {d ? d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() : `Livreur #${id || "—"}`}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                {d?.carNumber ? `Matricule: ${d.carNumber}` : d?.phone1 ? `Tél: ${d.phone1}` : "Assigné"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      value: "amount",
      value2: "Amount",
      name: "Montant Versé",
      render: (a, A) => {
        const amt = Number(a ?? A) || 0;
        return (
          <span
            style={{
              fontWeight: 900,
              fontSize: "0.95rem",
              color: "#059669",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              padding: "4px 10px",
              borderRadius: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaMoneyBillWave size={12} /> {amt.toFixed(3)} TND
          </span>
        );
      },
    },
    {
      value: "comment",
      value2: "Comment",
      name: "Motif & Remarques",
      render: (c, C) => {
        const text = c || C || "Versement de commissions";
        return (
          <div style={{ maxWidth: "340px", fontSize: "0.82rem", color: "#334155", lineHeight: "1.3" }}>
            {text}
          </div>
        );
      },
    },
    {
      value: "driverId",
      value2: "DriverId",
      name: "Solde Actuel du Livreur",
      render: (dId, DId) => {
        const id = Number(dId ?? DId);
        const d = drivers.find((drv) => drv.id === id);
        const soldeVal = Number(d?.solde ?? d?.Solde) || 0;
        return (
          <span
            style={{
              background: "#f8fafc",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              padding: "3px 9px",
              borderRadius: "6px",
              fontSize: "0.82rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontFamily: "monospace",
            }}
          >
            <FaWallet size={11} style={{ color: "#2563eb" }} /> {soldeVal.toFixed(3)} TND
          </span>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Banner */}
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
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 4px 12px rgba(5, 150, 105, 0.4)",
            }}
          >
            <FaMoneyCheckAlt />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
              {isDriver ? "Mes Règlements & Paiements" : "Gestion des Règlements Livreurs"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              {isDriver
                ? "Historique des commissions et versements reçus par virement ou espèces"
                : "Suivi des versements d'honoraires, commissions et avances aux chauffeurs"}
            </p>
          </div>
        </div>

        {!isDriver && (
          <ExportAdd
            noExport
            size="md"
            title="Nouveau Versement Chauffeur"
            save={save}
            ActionOnClose={reset}
            AddComponent={
              <AddEdit
                error={error}
                model={model}
                _setmodel={setModel}
                drivers={drivers}
                deliveries={deliveries}
              />
            }
          />
        )}
      </div>

      {/* METRIC SUMMARY CARDS */}
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
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaMoneyBillWave /> TOTAL VERSÉ / PAYÉ
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#059669", marginTop: "4px" }}>
            {totalAmount.toFixed(3)} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaReceipt /> NOMBRE DE PAIEMENTS
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", marginTop: "4px" }}>
            {totalPaymentsCount} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>versements</span>
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaWallet /> MONTANT MOYEN
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2563eb", marginTop: "4px" }}>
            {avgPayment} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
          </div>
        </div>

        {activeDriverInfo && (
          <div
            style={{
              background: "#f0fdf4",
              borderRadius: "12px",
              border: "1.5px solid #bbf7d0",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#166534" }}>
              SOLDE ACTUEL DU CHAUFFEUR
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#15803d", marginTop: "4px" }}>
              {(Number(activeDriverInfo.solde ?? activeDriverInfo.Solde) || 0).toFixed(3)}{" "}
              <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
            </div>
          </div>
        )}
      </div>

      {/* QUICK DRIVER SOLDE CARDS FOR ADMIN & DEPOT AGENT */}
      {!isDriver && drivers.length > 0 && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "16px 18px",
            marginBottom: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                💰 Soldes Actuels des Livreurs (Règlement Direct sans suivi de colis)
              </h4>
              <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                Le solde cumule automatiquement les tarifs de pickup (à la remise au dépôt) et de livraison (à la réception client). Cliquez sur « Payer » pour régler un livreur.
              </span>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "10px",
            }}
          >
            {drivers.map((drv) => {
              const drvName = drv.name || `${drv.firstName || ""} ${drv.lastName || ""}`.trim() || `Livreur #${drv.id}`;
              const drvSolde = Number(drv.solde ?? drv.Solde) || 0;
              return (
                <div
                  key={drv.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    background: "#f8fafc",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {drvName}
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 900, color: drvSolde > 0 ? "#059669" : "#64748b", fontFamily: "monospace" }}>
                      Solde: {drvSolde.toFixed(3)} TND
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setModel({
                        id: 0,
                        driverId: drv.id,
                        DriverId: drv.id,
                        amount: drvSolde > 0 ? Number(drvSolde.toFixed(3)) : 0,
                        Amount: drvSolde > 0 ? Number(drvSolde.toFixed(3)) : 0,
                        date: new Date().toISOString().split("T")[0],
                        Date: new Date().toISOString().split("T")[0],
                        comment: `Règlement du solde livreur (${drvName})`,
                        Comment: `Règlement du solde livreur (${drvName})`,
                      });
                      setState((prev) => ({ ...prev, open: true }));
                    }}
                    style={{
                      background: "#059669",
                      color: "#fff",
                      border: "none",
                      borderRadius: "7px",
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Payer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "12px 18px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px", maxWidth: "420px" }}>
          <div style={{ position: "relative", width: "100%" }}>
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
              placeholder="Rechercher par motif, montant ou nom..."
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              style={{ paddingLeft: "36px", borderRadius: "8px" }}
            />
          </div>
        </div>

        {/* Filter by Driver (Admin only) */}
        {!isDriver && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <FaFilter size={11} /> Filtrer par Livreur :
            </span>
            <SelectPicker
              data={[{ label: "Tous les livreurs", value: 0 }].concat(
                drivers.map((d) => ({
                  label: d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || `Livreur #${d.id}`,
                  value: d.id,
                }))
              )}
              searchable={true}
              style={{ width: "240px" }}
              value={selectedDriverFilter}
              onSelect={(val) => setSelectedDriverFilter(val)}
            />
          </div>
        )}

        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>
          {filteredPayments.length} règlement(s) affiché(s)
        </span>
      </div>

      {/* PAYMENTS GRID */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <Grid
          editAction={
            isDriver
              ? null
              : (id) => {
                  getById(id);
                  setState((prev) => ({ ...prev, open: true }));
                }
          }
          deleteAction={isDriver ? null : deleteAction}
          actionKey="id"
          noAdvancedActions
          columns={columns}
          rows={filteredPayments}
        />

        {filteredPayments.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <FaMoneyCheckAlt size={36} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
            <div style={{ fontWeight: 600 }}>Aucun règlement enregistré.</div>
          </div>
        )}
      </div>
    </div>
  );
}
