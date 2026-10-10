import React from "react";
import { Input, Message } from "rsuite";
import { FaTag, FaMoneyBillWave, FaTruck, FaPercentage, FaInfoCircle, FaWarehouse } from "react-icons/fa";

function AddEdit({ _setmodel, error, model = {} }) {
  const deliveryFee = Number(model.tarifDelivery) || 0;
  const pickupFee = Number(model.pickupPrice) || 0;
  const driverComm = Number(model.commissionDriver) || 0;
  const netMargin = deliveryFee - (pickupFee + driverComm);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaTag style={{ color: "#4f46e5" }} /> Nom du Tarif / Catégorie de Livraison * :
        </label>
        <Input
          placeholder="Ex: Tarif Standard (Grand Tunis), Tarif Express 4H..."
          value={model.name || ""}
          onChange={(name) => _setmodel((prev) => ({ ...prev, name }))}
        />
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaMoneyBillWave style={{ color: "#059669" }} /> Tarif Facturé Boutique (TND) * :
        </label>
        <Input
          type="number"
          step="0.100"
          min={0}
          placeholder="Ex: 7.000"
          value={model.tarifDelivery ?? ""}
          onChange={(val) =>
            _setmodel((prev) => ({
              ...prev,
              tarifDelivery: parseFloat(val) || 0,
            }))
          }
        />
        <small style={{ color: "#64748b", fontSize: "0.74rem", marginTop: "3px", display: "block" }}>
          Montant facturé à la boutique pour la livraison (seul montant visible par la boutique).
        </small>
      </div>

      <div className="responsive-grid-3">
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaWarehouse style={{ color: "#d97706" }} /> Tarif Pickup Livreur (TND) * :
          </label>
          <Input
            type="number"
            step="0.100"
            min={0}
            placeholder="Ex: 1.500"
            value={model.pickupPrice ?? ""}
            onChange={(val) =>
              _setmodel((prev) => ({
                ...prev,
                pickupPrice: parseFloat(val) || 0,
              }))
            }
          />
          <small style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "3px", display: "block" }}>
            Crédité au livreur lorsqu'il dépose le colis au dépôt.
          </small>
        </div>

        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaTruck style={{ color: "#2563eb" }} /> Commission Livraison (TND) * :
          </label>
          <Input
            type="number"
            step="0.100"
            min={0}
            placeholder="Ex: 2.500"
            value={model.commissionDriver ?? ""}
            onChange={(val) =>
              _setmodel((prev) => ({
                ...prev,
                commissionDriver: parseFloat(val) || 0,
              }))
            }
          />
          <small style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "3px", display: "block" }}>
            Crédité au livreur lorsque le client reçoit le colis.
          </small>
        </div>

        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaTruck style={{ color: "#7c3aed" }} /> Commission Retour (TND) :
          </label>
          <Input
            type="number"
            step="0.100"
            min={0}
            placeholder="Ex: 1.000"
            value={model.commissionReturn ?? 0}
            onChange={(val) =>
              _setmodel((prev) => ({
                ...prev,
                commissionReturn: parseFloat(val) || 0,
              }))
            }
          />
          <small style={{ color: "#64748b", fontSize: "0.72rem", marginTop: "3px", display: "block" }}>
            Frais / commission de retour (commissionReturn).
          </small>
        </div>
      </div>

      {/* Real-time Profit Margin Calculation Box */}
      <div
        style={{
          background: netMargin >= 0 ? "#f0fdf4" : "#fef2f2",
          border: netMargin >= 0 ? "1px solid #bbf7d0" : "1px solid #fecaca",
          borderRadius: "10px",
          padding: "12px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FaPercentage style={{ color: netMargin >= 0 ? "#166534" : "#991b1b" }} />
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: netMargin >= 0 ? "#166534" : "#991b1b" }}>
              Marge Nette Plateforme (Squad Delivery)
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Tarif Boutique - (Pickup Livreur + Livraison Livreur)
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <span
            style={{
              fontSize: "1.1rem",
              fontWeight: 900,
              color: netMargin >= 0 ? "#15803d" : "#dc2626",
            }}
          >
            {netMargin.toFixed(3)}{" "}
            <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>TND</span>
          </span>
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaInfoCircle style={{ color: "#6366f1" }} /> Remarques & Conditions :
        </label>
        <Input
          as="textarea"
          rows={3}
          placeholder="Ex: Délai garanti 24H, poids maximum 5kg, zone géographique..."
          value={model.remark || ""}
          onChange={(remark) => _setmodel((prev) => ({ ...prev, remark }))}
        />
      </div>

      {error && (
        <Message showIcon type="error">
          {error}
        </Message>
      )}
    </div>
  );
}

export default AddEdit;
