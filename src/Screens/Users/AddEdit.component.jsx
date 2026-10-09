import React from "react";
import { Input, Message, SelectPicker } from "rsuite";
import { useRecoilValue } from "recoil";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { DepotAgentsList } from "../../Atoms/depotAgents.atom";

const roleOptions = [
  { label: "Administrateur (Direction & Dispatch)", value: "admin" },
  { label: "Agent de Dépôt (Stock, Pickups & Affectation)", value: "depotAgent" }, //DepotAgent
  { label: "Livreur (Driver App)", value: "driver" },
  { label: "Client Boutique (Espace B2B)", value: "B2Bclient" },
];

function AddEdit({ _setmodel, error, model, drivers = [], stores = [], depotAgents = [] }) {
  const depots = useRecoilValue(preparationPlacesState);
  const recoilDepotAgents = useRecoilValue(DepotAgentsList);
  const agentsList = depotAgents && depotAgents.length > 0 ? depotAgents : recoilDepotAgents;
  const roleValue = String(model.role || model.position || "driver").trim().toLowerCase();
  const selectedRole =
    roleValue === "b2bclient" || roleValue === "b2b"
      ? "B2Bclient"
      : roleValue === "depotagent" || roleValue === "agentdepot" || roleValue.includes("depot")
        ? "depotAgent"
        : roleValue === "admin"
          ? "admin"
          : "driver";

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
          value={selectedRole}
          cleanable={false}
          onChange={(role) => {
            const position =
              role === "driver"
                ? "Driver"
                : role === "B2Bclient"
                  ? "B2Bclient"
                  : role === "depotAgent"
                    ? "DepotAgent"
                    : "Admin";
            _setmodel((prev) => ({
              ...prev,
              role,
              position,
              ...(role === "driver"
                ? { storeId: undefined, preparationPlaceId: undefined }
                : role === "B2Bclient"
                  ? { driverId: undefined, preparationPlaceId: undefined }
                  : role === "depotAgent"
                    ? { driverId: undefined, storeId: undefined, preparationPlaceId: prev.preparationPlaceId || 1 }
                    : { driverId: undefined, storeId: undefined, preparationPlaceId: undefined }),
            }));
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

      <div className="responsive-grid-2">
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

      {selectedRole === "depotAgent" && (
        <>
          <div>
            <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#b45309" }}>
              Associer au Profil Agent de Dépôt :
            </label>
            <SelectPicker
              data={(agentsList || []).map((a) => {
                const placeId = Number(a.preparationPlaceId || a.depotId || 1);
                const dep = (depots || []).find((d) => d.id === placeId);
                return {
                  label: `${a.firstName || ""} ${a.lastName || ""} (${dep ? dep.name : `Dépôt #${placeId}`})`,
                  value: a.id,
                };
              })}
              block
              placeholder="Sélectionner l'agent de dépôt..."
              value={model.AgentDepotId ?? model.depotAgentId}
              onChange={(depotAgentId) => {
                const matched = (agentsList || []).find((el) => el.id === depotAgentId);
                const placeId = matched ? Number(matched.preparationPlaceId || matched.depotId || 1) : 1;
                _setmodel((prev) => ({
                  ...prev,
                  AgentDepotId: depotAgentId,
                  preparationPlaceId: placeId,
                  depotId: placeId,
                  firstName: prev.firstName || matched?.firstName,
                  lastName: prev.lastName || matched?.lastName,
                  phoneNumber: prev.phoneNumber || matched?.phone1,
                  email: prev.email || matched?.email,
                  userName: prev.userName || matched?.userName || matched?.email,
                }));
              }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#b45309" }}>
              Dépôt / Entrepôt d'Affectation :
            </label>
            <SelectPicker
              data={(depots || []).map((d) => ({
                label: `${d.name} (${d.code || `DEP-${d.id}`})`,
                value: d.id,
              }))}
              block
              value={model.preparationPlaceId || model.depotId || 1}
              onChange={(preparationPlaceId) => {
                _setmodel((prev) => ({
                  ...prev,
                  preparationPlaceId,
                  depotId: preparationPlaceId,
                }));
              }}
            />
          </div>
        </>
      )}

      {selectedRole === "driver" && (
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
            onChange={(driverId) => {
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

      {selectedRole === "B2Bclient" && (
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
            onChange={(storeId) => {
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
