import React from "react";
import { Input, Message, SelectPicker } from "rsuite";

const roleOptions = [
  { label: "Administrateur (Direction & Dispatch)", value: "admin" },
  { label: "Livreur (Driver App)", value: "driver" },
  { label: "Client Boutique (Espace B2B)", value: "B2Bclient" },
];

function AddEdit({ _setmodel, error, model, drivers = [], stores = [] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
          Rôle & Droits d'Accès :
        </label>
        <SelectPicker
          data={roleOptions}
          searchable={false}
          block
          value={model.role || "driver"}
          onSelect={(role) => {
            _setmodel((prev) => ({ ...prev, role }));
          }}
        />
      </div>

      <div>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
          Identifiant / Nom d'utilisateur :
        </label>
        <Input
          value={model.userName || ""}
          placeholder="ex: mohamed_driver, admin_dispatch"
          onChange={(userName) => {
            _setmodel((prev) => ({ ...prev, userName }));
          }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
            Prénom :
          </label>
          <Input
            value={model.firstName || ""}
            placeholder="Prénom"
            onChange={(firstName) => {
              _setmodel((prev) => ({ ...prev, firstName }));
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
            Nom :
          </label>
          <Input
            value={model.lastName || ""}
            placeholder="Nom"
            onChange={(lastName) => {
              _setmodel((prev) => ({ ...prev, lastName }));
            }}
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
          Email professionnel :
        </label>
        <Input
          type="email"
          value={model.email || ""}
          placeholder="contact@tawsil.tn"
          onChange={(email) => {
            _setmodel((prev) => ({ ...prev, email }));
          }}
        />
      </div>

      <div>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
          Numéro de Téléphone :
        </label>
        <Input
          value={model.phoneNumber || ""}
          placeholder="ex: 52255558"
          onChange={(phoneNumber) => {
            _setmodel((prev) => ({ ...prev, phoneNumber }));
          }}
        />
      </div>

      {model.role === "driver" && (
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#166534" }}>
            Associer au Profil Livreur / Véhicule :
          </label>
          <SelectPicker
            data={drivers.map((c) => ({
              label: `${c.name || `${c.firstName} ${c.lastName}`} (${c.carNumber || "Sans véhicule"})`,
              value: c.id,
            }))}
            block
            value={model.driverId}
            onSelect={(driverId) => {
              const matched = drivers.find((el) => el.id === driverId);
              _setmodel((prev) => ({
                ...prev,
                driverId,
                firstName: prev.firstName || matched?.firstName,
                lastName: prev.lastName || matched?.lastName,
                phoneNumber: prev.phoneNumber || matched?.phone1,
              }));
            }}
          />
        </div>
      )}

      {model.role === "B2Bclient" && (
        <div>
          <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1e40af" }}>
            Associer à la Boutique B2B :
          </label>
          <SelectPicker
            data={stores.map((s) => ({
              label: s.name_fr || s.name || `Boutique #${s.id}`,
              value: s.id,
            }))}
            block
            value={model.storeId}
            onSelect={(storeId) => {
              _setmodel((prev) => ({ ...prev, storeId }));
            }}
          />
        </div>
      )}

      <div>
        <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#334155" }}>
          Mot de passe :
        </label>
        <Input
          type="password"
          placeholder="••••••••"
          value={model.password || ""}
          onChange={(password) => {
            _setmodel((prev) => ({ ...prev, password }));
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
