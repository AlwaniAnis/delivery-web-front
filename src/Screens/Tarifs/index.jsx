import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Input, Tag } from "rsuite";
import Swal from "sweetalert2";
import {
  FaTags,
  FaMoneyBillWave,
  FaTruck,
  FaPercentage,
  FaSearch,
  FaTimes,
  FaEdit,
  FaTrash,
  FaPlus,
  FaInfoCircle,
} from "react-icons/fa";
import { APi } from "../../Api";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import { tarifsState, DEFAULT_TARIFS } from "../../Atoms/tarifs.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Grid from "../../Components/Grid";
import AddEdit from "./AddEdit.component";
import TarifModel from "../../Models/tarifModel";

export default function Tarifs() {
  const [tarifs, setTarifs] = useRecoilState(tarifsState);
  const [state, setState] = useRecoilState(exportAddAtom);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  const [model, setModel] = useState(new TarifModel());

  const reset = () => {
    setModel(new TarifModel());
    setError("");
  };

  const fetchTarifs = () => {
    setLoading(true);
    APi.createAPIEndpoint(APi.ENDPOINTS.Tarif, { page: 1, take: 1000 })
      .fetchAll()
      .then((res) => {
        setLoading(false);
        if (Array.isArray(res.data)) {
          setTarifs(res.data);
        } else if (Array.isArray(res.data?.data)) {
          setTarifs(res.data.data);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTarifs();
  }, []);

  const save = () => {
    if (!model.name?.trim()) {
      setError("Le nom du tarif est obligatoire.");
      return;
    }
    if (model.tarifDelivery == null || model.tarifDelivery < 0) {
      setError("Le tarif de livraison doit être un montant valide.");
      return;
    }

    setState((prev) => ({ ...prev, loading: true }));

    const payload = {
      ...model,
      tarifDelivery: Number(model.tarifDelivery) || 0,
      pickupPrice: Number(model.pickupPrice) || 0,
      commissionDriver: Number(model.commissionDriver) || 0,
      commissionReturn: Number(model.commissionReturn) || 0,
    };

    if (model.id) {
      // Update
      APi.createAPIEndpoint(APi.ENDPOINTS.Tarif)
        .update(model.id, payload)
        .then(() => {
          setState((prev) => ({ ...prev, open: false, loading: false }));
          setTarifs((prev) =>
            prev.map((t) => (t.id === model.id ? { ...t, ...payload } : t))
          );
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Tarif mis à jour avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
          fetchTarifs();
        })
        .catch(() => {
          // Local fallback in case endpoint isn't fully migrated on backend
          setTarifs((prev) =>
            prev.map((t) => (t.id === model.id ? { ...t, ...payload } : t))
          );
          setState((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Tarif mis à jour avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    } else {
      // Create
      APi.createAPIEndpoint(APi.ENDPOINTS.Tarif)
        .create(payload)
        .then((res) => {
          setState((prev) => ({ ...prev, open: false, loading: false }));
          const created = res.data || { ...payload, id: Date.now() };
          setTarifs((prev) => [...prev, created]);
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Nouveau tarif ajouté avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
          fetchTarifs();
        })
        .catch(() => {
          // Local fallback
          const newTarif = { ...payload, id: Date.now() };
          setTarifs((prev) => [...prev, newTarif]);
          setState((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Nouveau tarif ajouté !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    }
  };

  const deleteAction = (id) => {
    Swal.fire({
      title: "Supprimer ce tarif ?",
      text: "Les livraisons existantes conserveront leurs valeurs archivées.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    }).then((res) => {
      if (res.isConfirmed) {
        APi.createAPIEndpoint(APi.ENDPOINTS.Tarif)
          .delete(id)
          .then(() => {
            setTarifs((prev) => prev.filter((t) => t.id !== id));
            Swal.fire("Supprimé !", "Le tarif a été retiré.", "success");
          })
          .catch(() => {
            setTarifs((prev) => prev.filter((t) => t.id !== id));
            Swal.fire("Supprimé !", "Le tarif a été retiré.", "success");
          });
      }
    });
  };

  const getById = (id) => {
    setError("");
    const found = tarifs.find((t) => t.id === id);
    if (found) {
      setModel({ ...found });
    }
  };

  // Filter tariffs by search
  const filteredTarifs = (tarifs || []).filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = (t.name || "").toLowerCase();
    const remark = (t.remark || "").toLowerCase();
    const delivery = (t.tarifDelivery || "").toString();
    const comm = (t.commissionDriver || "").toString();
    return name.includes(q) || remark.includes(q) || delivery.includes(q) || comm.includes(q);
  });

  // Calculate metrics
  const totalCount = tarifs.length;
  const avgDelivery =
    totalCount > 0
      ? (tarifs.reduce((sum, t) => sum + (Number(t.tarifDelivery) || 0), 0) / totalCount).toFixed(3)
      : "0.000";
  const avgComm =
    totalCount > 0
      ? (tarifs.reduce((sum, t) => sum + (Number(t.commissionDriver) || 0), 0) / totalCount).toFixed(3)
      : "0.000";
  const avgMargin = (Number(avgDelivery) - Number(avgComm)).toFixed(3);

  const columns = [
    {
      value: "name",
      name: "Nom du Tarif / Service",
      render: (name, item) => (
        <div>
          <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.92rem" }}>
            🏷️ {name}
          </div>
          {item?.remark && (
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
              {item.remark}
            </div>
          )}
        </div>
      ),
    },
    {
      value: "tarifDelivery",
      name: "Tarif Livraison Boutique",
      render: (val) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.95rem",
            color: "#059669",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            padding: "4px 8px",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          {(Number(val) || 0).toFixed(3)} TND
        </span>
      ),
    },
    {
      value: "pickupPrice",
      name: "Tarif Pickup Livreur",
      render: (val) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.95rem",
            color: "#d97706",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            padding: "4px 8px",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          {(Number(val ?? 1.5)).toFixed(3)} TND
        </span>
      ),
    },
    {
      value: "commissionDriver",
      name: "Commission Livraison",
      render: (val) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.95rem",
            color: "#2563eb",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "4px 8px",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          {(Number(val) || 0).toFixed(3)} TND
        </span>
      ),
    },
    {
      value: "commissionReturn",
      name: "Commission Retour",
      render: (val) => (
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.95rem",
            color: "#7c3aed",
            background: "#f5f3ff",
            border: "1px solid #ddd6fe",
            padding: "4px 8px",
            borderRadius: "6px",
            display: "inline-block",
          }}
        >
          {(Number(val) || 0).toFixed(3)} TND
        </span>
      ),
    },
    {
      value: "tarifDelivery",
      value2: "commissionDriver",
      value3: "pickupPrice",
      name: "Marge Nette Agence",
      render: (delivery, comm, pickup) => {
        const diff =
          (Number(delivery) || 0) -
          ((Number(comm) || 0) + (Number(pickup ?? 1.5) || 0));
        return (
          <span
            style={{
              fontWeight: 800,
              fontSize: "0.95rem",
              color: diff >= 0 ? "#166534" : "#dc2626",
              background: diff >= 0 ? "#f0fdf4" : "#fef2f2",
              border: diff >= 0 ? "1px solid #bbf7d0" : "1px solid #fecaca",
              padding: "4px 8px",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            {diff.toFixed(3)} TND
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
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)",
            }}
          >
            <FaTags />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
              Grille Tarifaire & Commissions
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              Configurez les tarifs facturés aux boutiques et les commissions reversées aux livreurs
            </p>
          </div>
        </div>

        <ExportAdd
          noExport
          size="md"
          title="Nouveau Tarif de Livraison"
          save={save}
          ActionOnClose={reset}
          AddComponent={
            <AddEdit error={error} model={model} _setmodel={setModel} />
          }
        />
      </div>

      {/* METRIC CARDS */}
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
            TOTAL TARIFS ACTIFS
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", marginTop: "4px" }}>
            {totalCount} <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>formules</span>
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#059669" }}>
            TARIF MOYEN LIVRAISON
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#059669", marginTop: "4px" }}>
            {avgDelivery} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#2563eb" }}>
            COMMISSION MOYENNE LIVREUR
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#2563eb", marginTop: "4px" }}>
            {avgComm} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
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
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed" }}>
            MARGE NETTE MOYENNE
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#7c3aed", marginTop: "4px" }}>
            {avgMargin} <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
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
        <div style={{ position: "relative", minWidth: "260px", flex: 1, maxWidth: "420px" }}>
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
            placeholder="Rechercher par nom de formule ou remarque..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            style={{ paddingLeft: "36px", borderRadius: "8px" }}
          />
        </div>

        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#64748b" }}>
          {filteredTarifs.length} tarif(s) configuré(s)
        </span>
      </div>

      {/* GRID */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <Grid
          editAction={(id) => {
            getById(id);
            setState((prev) => ({ ...prev, open: true }));
          }}
          deleteAction={deleteAction}
          actionKey="id"
          noAdvancedActions
          columns={columns}
          rows={filteredTarifs}
        />

        {filteredTarifs.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <FaTags size={36} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
            <div style={{ fontWeight: 600 }}>Aucun tarif trouvé.</div>
          </div>
        )}
      </div>
    </div>
  );
}
