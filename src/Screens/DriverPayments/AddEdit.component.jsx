import React from "react";
import { Input, Message, SelectPicker } from "rsuite";
import { FaUserTie, FaMoneyBillWave, FaCalendarAlt, FaCommentAlt, FaBoxOpen } from "react-icons/fa";

function AddEdit({ _setmodel, error, model = {}, drivers = [], deliveries = [] }) {
  const driverIdVal = Number(model.driverId ?? model.DriverId) || 0;
  const amountVal = Number(model.amount ?? model.Amount) || 0;
  const deliveryIdVal = model.deliveryId ?? model.DeliveryId ?? null;

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
            {amountVal > 0 ? `${amountVal.toFixed(3)} TND à verser` : "Saisir le montant"}
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

      {/* Optional Delivery Link */}
      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaBoxOpen style={{ color: "#f59e0b" }} /> Colis / Livraison Associé(e) (Optionnel) :
        </label>
        <SelectPicker
          data={[{ label: "— Aucun (Paiement général / Solde tournées) —", value: 0 }].concat(
            deliveries.map((del) => ({
              label: `Colis #${del.qrCodeContent || del.id} (${del.customer?.fullName || "Client"} - ${(Number(del.cost) || 0).toFixed(3)} TND)`,
              value: del.id,
            }))
          )}
          block
          searchable={true}
          placeholder="Rechercher par code colis ou client..."
          value={deliveryIdVal || 0}
          onSelect={(val) => {
            _setmodel((prev) => ({
              ...prev,
              deliveryId: val === 0 ? null : val,
              DeliveryId: val === 0 ? null : val,
            }));
          }}
        />
        <small style={{ color: "#64748b", fontSize: "0.74rem", marginTop: "3px", display: "block" }}>
          Si ce versement est lié au règlement spécifique d'un colis ou d'une course unitaire.
        </small>
      </div>

      {/* Comment / Motif */}
      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FaCommentAlt style={{ color: "#6366f1" }} /> Motif / Commentaire / Référence Transaction :
        </label>
        <Input
          as="textarea"
          rows={3}
          placeholder="Ex: Virement bancaire n° 98234, Paiement espèces commissions semaine 42, Avance sur frais de carburant..."
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
