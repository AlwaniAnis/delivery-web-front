import React from "react";
import { Input, Message, SelectPicker } from "rsuite";
import { FaUserTie, FaMoneyBillWave, FaCalendarAlt, FaCommentAlt, FaWallet } from "react-icons/fa";

function AddEdit({ _setmodel, error, model = {}, drivers = [] }) {
  const driverIdVal = Number(model.driverId ?? model.DriverId) || 0;
  const amountVal = Number(model.amount ?? model.Amount) || 0;
  const selectedDriver = drivers.find((d) => Number(d.id) === driverIdVal);
  const currentSolde = Number(selectedDriver?.solde ?? selectedDriver?.Solde) || 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Driver Picker */}
      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaUserTie style={{ color: "#4f46e5" }} /> Chauffeur Livreur Bénéficiaire * :
        </label>
        <SelectPicker
          data={[{ label: "— Sélectionner le chauffeur —", value: 0 }].concat(
            drivers.map((d) => ({
              label: `${d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim() || `Livreur #${d.id}`} (${d.carNumber || "Auto"}) · Solde: ${(Number(d.solde ?? d.Solde) || 0).toFixed(3)} TND`,
              value: d.id,
            }))
          )}
          block
          searchable={true}
          placeholder="Choisir le livreur..."
          value={driverIdVal}
          onSelect={(val) => {
            _setmodel((prev) => ({
              ...prev,
              driverId: val === 0 ? null : val,
              DriverId: val === 0 ? null : val,
            }));
          }}
        />
      </div>

      {/* Selected Driver Solde Banner (No need to track exact colis) */}
      {selectedDriver && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1.5px solid #bbf7d0",
            borderRadius: "10px",
            padding: "12px 14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#166534", display: "flex", alignItems: "center", gap: "5px" }}>
              <FaWallet /> SOLDE ACTUEL DU LIVREUR
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#15803d", fontFamily: "monospace" }}>
              {currentSolde.toFixed(3)} TND
            </div>
            <span style={{ fontSize: "0.72rem", color: "#475569" }}>
              Cumul des tarifs de ramassage (dépôt) et de livraison (reçu par client)
            </span>
          </div>
          {currentSolde > 0 && (
            <button
              type="button"
              onClick={() =>
                _setmodel((prev) => ({
                  ...prev,
                  amount: Number(currentSolde.toFixed(3)),
                  Amount: Number(currentSolde.toFixed(3)),
                }))
              }
              style={{
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Verser tout le solde ({currentSolde.toFixed(3)} TND)
            </button>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Amount */}
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaMoneyBillWave style={{ color: "#059669" }} /> Montant du Règlement (TND) * :
          </label>
          <Input
            type="number"
            step="0.100"
            min={0}
            placeholder="0.000"
            value={amountVal || ""}
            onChange={(val) => {
              const num = parseFloat(val) || 0;
              _setmodel((prev) => ({
                ...prev,
                amount: num,
                Amount: num,
              }));
            }}
          />
          <small style={{ color: "#059669", fontSize: "0.75rem", marginTop: "3px", fontWeight: 700, display: "block" }}>
            {amountVal > 0 ? `${amountVal.toFixed(3)} TND à verser au livreur` : "Saisir le montant à payer"}
          </small>
        </div>

        {/* Date */}
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
            <FaCalendarAlt style={{ color: "#2563eb" }} /> Date du Versement * :
          </label>
          <Input
            type="date"
            value={
              model.date || model.Date
                ? typeof (model.date || model.Date) === "string"
                  ? (model.date || model.Date).split("T")[0]
                  : new Date(model.date || model.Date).toISOString().split("T")[0]
                : new Date().toISOString().split("T")[0]
            }
            onChange={(val) => {
              _setmodel((prev) => ({
                ...prev,
                date: val,
                Date: val,
              }));
            }}
          />
        </div>
      </div>

      {/* Comment / Motif */}
      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaCommentAlt style={{ color: "#6366f1" }} /> Motif / Commentaire / Référence Transaction :
        </label>
        <Input
          as="textarea"
          rows={3}
          placeholder="Ex: Paiement du solde en espèces au dépôt, Virement bancaire..."
          value={model.comment || model.Comment || ""}
          onChange={(comment) => {
            _setmodel((prev) => ({
              ...prev,
              comment,
              Comment: comment,
            }));
          }}
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
