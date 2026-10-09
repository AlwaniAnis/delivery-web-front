import React from "react";
import { Input, Message, SelectPicker } from "rsuite";
import { useRecoilValue } from "recoil";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";

function AddEdit({
  _setmodel,
  error,
  model = {
    cin: "",
    phone1: "",
    phone2: "",
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    preparationPlaceId: 1,
    depotId: 1,
    isActive: true,
  },
}) {
  const depots = useRecoilValue(preparationPlacesState);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div className="responsive-grid-2">
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Nom :</label>
          <Input
            onChange={(lastName) => {
              _setmodel((prev) => ({ ...prev, lastName }));
            }}
            value={model.lastName || ""}
            placeholder="Nom de l'agent"
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Prénom :</label>
          <Input
            onChange={(firstName) => {
              _setmodel((prev) => ({ ...prev, firstName }));
            }}
            value={model.firstName || ""}
            placeholder="Prénom de l'agent"
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "#b45309" }}>
          🏢 Dépôt / Entrepôt d'Affectation :
        </label>
        <SelectPicker
          data={(depots || []).map((d) => ({
            label: `${d.name} (${d.code || `DEP-${d.id}`})`,
            value: d.id,
          }))}
          block
          searchable={true}
          cleanable={false}
          placeholder="Choisir le dépôt de rattachement..."
          value={Number(model.preparationPlaceId || model.depotId || 1)}
          onChange={(val) => {
            _setmodel((prev) => ({
              ...prev,
              preparationPlaceId: val,
              depotId: val,
            }));
          }}
        />
      </div>

      <div className="responsive-grid-2">
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>CIN :</label>
          <Input
            value={model.cin || ""}
            placeholder="Numéro CIN"
            onChange={(cin) => {
              _setmodel((prev) => ({ ...prev, cin }));
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Email :</label>
          <Input
            value={model.email || ""}
            placeholder="agent.depot@tawsil.tn"
            onChange={(email) => {
              _setmodel((prev) => ({ ...prev, email }));
            }}
            type="email"
          />
        </div>
      </div>

      <div className="responsive-grid-2">
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Téléphone 1 :</label>
          <Input
            value={model.phone1 || ""}
            placeholder="ex: 55 123 456"
            onChange={(phone1) => {
              _setmodel((prev) => ({ ...prev, phone1 }));
            }}
            type="tel"
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Téléphone 2 :</label>
          <Input
            value={model.phone2 || ""}
            placeholder="ex: 71 800 100"
            onChange={(phone2) => {
              _setmodel((prev) => ({ ...prev, phone2 }));
            }}
            type="tel"
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>Adresse :</label>
        <Input
          value={model.address || ""}
          placeholder="Adresse ou zone d'intervention"
          onChange={(address) => {
            _setmodel((prev) => ({ ...prev, address }));
          }}
        />
      </div>

      <div
        style={{
          marginTop: "6px",
          background: "#fffbeb",
          padding: "12px 14px",
          borderRadius: "8px",
          border: "1.5px solid #fde68a",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            cursor: "pointer",
            fontWeight: 700,
            color: "#92400e",
            margin: 0,
          }}
        >
          <input
            type="checkbox"
            checked={model.isActive !== false}
            onChange={(e) => {
              const checked = e.target.checked;
              _setmodel((prev) => ({ ...prev, isActive: checked }));
            }}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <span>✅ Agent de Dépôt Actif (Autorisé à gérer le stock, les pickups et les paiements)</span>
        </label>
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
