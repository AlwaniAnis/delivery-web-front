import { Input, Message, SelectPicker, TagPicker } from "rsuite";
import { useRecoilValue } from "recoil";
import { FaWarehouse } from "react-icons/fa";
import { cities } from "../../Data/cities";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDepotIdState, normalizeRole } from "../../Atoms/auth.atom";

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
    carNumber: "",
    cities: "",
    solde: 0,
    preparationPlaceId: 1,
  },
}) {
  const depotsList = useRecoilValue(preparationPlacesState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDepotId = useRecoilValue(currentDepotIdState);
  const isDepotAgent = normalizeRole(activeRole) === "depotAgent";

  const currentPlaceId = Number(
    model.preparationPlaceId ||
      model.preparationPlace?.id ||
      (isDepotAgent ? currentDepotId : depotsList?.[0]?.id) ||
      1
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          background: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
          borderRadius: "10px",
          padding: "12px 14px",
        }}
      >
        <label
          style={{
            fontWeight: 800,
            color: "#065f46",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
            fontSize: "0.85rem",
          }}
        >
          <FaWarehouse style={{ color: "#059669" }} /> Dépôt d'Affectation (PreparationPlace) * :
        </label>
        {isDepotAgent ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "8px 12px",
              fontWeight: 700,
              color: "#0f172a",
              fontSize: "0.85rem",
            }}
          >
            🏢{" "}
            {depotsList.find((d) => Number(d.id) === Number(currentDepotId))?.name ||
              `Dépôt #${currentDepotId}`}
          </div>
        ) : (
          <SelectPicker
            data={(depotsList || []).map((d) => ({
              label: `🏢 ${d.name} (${d.code || `DEP-${d.id}`})`,
              value: Number(d.id),
            }))}
            block
            cleanable={false}
            searchable={true}
            placeholder="Choisir le dépôt (PreparationPlace)..."
            value={currentPlaceId}
            onSelect={(val) => {
              _setmodel((prev) => ({
                ...prev,
                preparationPlaceId: Number(val),
              }));
            }}
          />
        )}
        <small style={{ display: "block", color: "#047857", marginTop: "4px", fontSize: "0.75rem" }}>
          Chaque livreur appartient directement à un dépôt (PreparationPlace).
        </small>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Nom :</label>
          <Input
            onChange={(lastName) => {
              _setmodel((prev) => ({ ...prev, lastName }));
            }}
            value={model.lastName || ""}
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Prénom :</label>
          <Input
            onChange={(firstName) => {
              _setmodel((prev) => ({ ...prev, firstName }));
            }}
            value={model.firstName || ""}
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Secteur :</label>
        <TagPicker
          data={cities.map((el) => ({ value: el, label: el }))}
          block
          onSelect={(s) => {
            _setmodel((prev) => ({ ...prev, cities: s.join() }));
          }}
          onChange={(s) => {
            _setmodel((prev) => ({ ...prev, cities: (s || []).join() }));
          }}
          value={model.cities ? model.cities.split(",") : []}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>CIN :</label>
          <Input
            value={model.cin || ""}
            onChange={(cin) => {
              _setmodel((prev) => ({ ...prev, cin }));
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
            Matricule Voiture :
          </label>
          <Input
            value={model.carNumber || ""}
            onChange={(carNumber) => {
              _setmodel((prev) => ({ ...prev, carNumber }));
            }}
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Email :</label>
        <Input
          value={model.email || ""}
          onChange={(email) => {
            _setmodel((prev) => ({ ...prev, email }));
          }}
          type="email"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
            Téléphone 1 :
          </label>
          <Input
            value={model.phone1 || ""}
            onChange={(phone1) => {
              _setmodel((prev) => ({ ...prev, phone1 }));
            }}
            type="tel"
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
            Téléphone 2 :
          </label>
          <Input
            value={model.phone2 || ""}
            onChange={(phone2) => {
              _setmodel((prev) => ({ ...prev, phone2 }));
            }}
            type="tel"
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Adresse :</label>
        <Input
          value={model.address || ""}
          onChange={(address) => {
            _setmodel((prev) => ({ ...prev, address }));
          }}
        />
      </div>

      <div>
        <label style={{ fontWeight: 700, color: "#166534", display: "block", fontSize: "0.82rem" }}>
          💰 Solde Portefeuille Livreur (TND) :
        </label>
        <Input
          type="number"
          step="0.100"
          placeholder="0.000"
          value={model.solde ?? model.Solde ?? 0}
          onChange={(val) => {
            const num = parseFloat(val) || 0;
            _setmodel((prev) => ({ ...prev, solde: num, Solde: num }));
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
