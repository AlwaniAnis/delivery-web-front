import { useState } from "react";
import { useRecoilValue } from "recoil";
import { Button, Input, Message, SelectPicker, TagInput } from "rsuite";
import {
  FaWarehouse,
  FaMapMarkerAlt,
  FaExternalLinkAlt,
  FaEdit,
  FaTrash,
  FaPlus,
} from "react-icons/fa";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDepotIdState, normalizeRole } from "../../Atoms/auth.atom";
import Responsive from "../../Components/Responsive";
import StoreMapPicker from "../../Components/Common/StoreMapPicker";

function AddEdit({
  setmodel,
  error,
  model = {
    contacts: [],
    preparationPlaceId: 1,
    latitude: 36.8065,
    longitude: 10.1815,
  },
}) {
  const depotsList = useRecoilValue(preparationPlacesState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDepotId = useRecoilValue(currentDepotIdState);
  const isDepotAgent = normalizeRole(activeRole) === "depotAgent";
  const [contact, setcontact] = useState({
    address: "",
    phones: "",
    emails: "",
    maplink: "",
  });

  const currentLat =
    model.latitude ?? model.Latitude ?? 36.8065;
  const currentLng =
    model.longitude ?? model.Longitude ?? 10.1815;

  return (
    <div style={{ padding: "4px" }}>
      <div className="responsive-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: "4px", color: "#1e293b", fontSize: "0.85rem" }}>
            Nom de la Boutique (FR) * :
          </label>
          <Input
            placeholder="Ex: Squad Store Tunis"
            onChange={(name_fr) => {
              setmodel((prev) => ({ ...prev, name_fr }));
            }}
            value={model.name_fr || ""}
          />
        </div>

        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: "4px", color: "#1e293b", fontSize: "0.85rem" }}>
            Matricule Fiscal :
          </label>
          <Input
            placeholder="Ex: 1234567/A/M/000"
            onChange={(taxCode) => {
              setmodel((prev) => ({ ...prev, taxCode }));
            }}
            value={model.taxCode || ""}
          />
        </div>
      </div>

      <div style={{ marginTop: "12px", marginBottom: "12px" }}>
        <label style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", color: "#065f46", fontSize: "0.85rem" }}>
          <FaWarehouse style={{ color: "#059669" }} /> Dépôt du Territoire (PreparationPlace) * :
        </label>
        {isDepotAgent ? (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "8px 12px",
              fontWeight: 700,
              color: "#065f46",
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
              label: `${d.name} (${d.code || `DEP-${d.id}`})`,
              value: d.id,
            }))}
            block
            cleanable={false}
            searchable={true}
            placeholder="Sélectionner le dépôt de rattachement..."
            value={Number(model.preparationPlaceId || model.depotId || depotsList?.[0]?.id || 1)}
            onSelect={(val) => {
              const selectedDepot = (depotsList || []).find((d) => Number(d.id) === Number(val));
              setmodel((prev) => ({
                ...prev,
                preparationPlaceId: val,
                depotId: val,
                latitude:
                  prev.latitude != null && prev.latitude !== ""
                    ? prev.latitude
                    : selectedDepot?.latitude || 36.8065,
                longitude:
                  prev.longitude != null && prev.longitude !== ""
                    ? prev.longitude
                    : selectedDepot?.longitude || 10.1815,
              }));
            }}
          />
        )}
        <small style={{ color: "#64748b", fontSize: "0.75rem", display: "block", marginTop: "3px" }}>
          La boutique appartient au territoire de ce dépôt : toutes ses livraisons y sont automatiquement rattachées.
        </small>
      </div>

      {/* INTERACTIVE MAP PICKER FOR STORE LATITUDE & LONGITUDE */}
      <StoreMapPicker
        latitude={currentLat}
        longitude={currentLng}
        height="240px"
        title="Localisation GPS de la Boutique (Latitude & Longitude)"
        onChange={(lat, lng) => {
          setmodel((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
          setcontact((prev) => ({
            ...prev,
            maplink: prev.maplink || `https://www.google.com/maps?q=${lat},${lng}`,
          }));
        }}
      />

      <div style={{ marginTop: "10px", marginBottom: "14px" }}>
        <label style={{ fontWeight: 700, display: "block", marginBottom: "4px", color: "#1e293b", fontSize: "0.85rem" }}>
          Description :
        </label>
        <Input
          as="textarea"
          rows={2}
          placeholder="Description de l'activité de la boutique..."
          value={model.description_fr || ""}
          onChange={(description_fr) => {
            setmodel((prev) => ({ ...prev, description_fr }));
          }}
        />
      </div>

      <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
        <FaMapMarkerAlt style={{ color: "#ef4444" }} /> Contacts & Adresses de la Boutique :
      </h4>
      <div
        style={{
          border: "1px solid #e2e8f0",
          padding: "12px",
          borderRadius: "10px",
          background: "#f8fafc",
        }}
      >
        <Responsive xl={6} l={6} className="p-10">
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Email :</label>
          <Input
            block
            size="md"
            placeholder="contact@boutique.tn"
            value={contact.emails}
            onChange={(emails) => {
              setcontact((prev) => ({ ...prev, emails }));
            }}
          />
        </Responsive>
        <Responsive xl={6} l={6} className="p-10">
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Téléphones (Entrée pour ajouter) :</label>
          <TagInput
            block
            size="md"
            placeholder="+216 ..."
            value={contact.phones ? contact.phones.split(",") : []}
            onChange={(phones) => {
              setcontact((prev) => ({ ...prev, phones: phones.join(",") }));
            }}
          />
        </Responsive>
        <Responsive xl={6} l={6} className="p-10">
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Lien Map :</label>
          <Input
            placeholder="https://www.google.com/maps?q=..."
            value={contact.maplink}
            onChange={(maplink) => {
              setcontact((prev) => ({ ...prev, maplink }));
            }}
          />
        </Responsive>
        <Responsive xl={6} l={6} className="p-10">
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Adresse :</label>
          <Input
            placeholder="Adresse complète de la boutique..."
            value={contact.address}
            onChange={(address) => {
              setcontact((prev) => ({ ...prev, address }));
            }}
          />
        </Responsive>
        <div style={{ padding: "6px 10px", display: "flex", justifyContent: "flex-end" }}>
          <Button
            style={{ background: "#4f46e5", color: "#fff", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={() => {
              let contacts = [...(model.contacts || [])];
              const maplinkValue =
                contact.maplink ||
                (currentLat && currentLng
                  ? `https://www.google.com/maps?q=${currentLat},${currentLng}`
                  : "");
              if (!contact.id) {
                contacts.push({
                  ...contact,
                  maplink: maplinkValue,
                  id: new Date().getUTCMilliseconds() + Math.floor(Math.random() * 1000),
                  eStoreId: model.id,
                });
              } else {
                let _indx = contacts.findIndex((el) => el.id == contact.id);
                if (_indx !== -1) {
                  contacts[_indx] = { ...contact, maplink: maplinkValue };
                } else {
                  contacts.push({ ...contact, maplink: maplinkValue });
                }
              }

              setmodel((prev) => ({
                ...prev,
                contacts,
              }));
              setcontact({
                address: "",
                phones: "",
                emails: "",
                maplink: "",
                eStoreId: model.id,
              });
            }}
          >
            <FaPlus size={11} /> {contact.id ? "Mettre à jour le contact" : "Enregistrer le contact +"}
          </Button>
        </div>
      </div>

      <div style={{ padding: "12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>
        {model.contacts &&
          model.contacts.map((el, idx) => (
            <div
              key={el.id || idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <strong style={{ color: "#0f172a", fontSize: "0.85rem" }}>
                  📍 {el.address || "Adresse non spécifiée"}
                </strong>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  {el.phones ? `📞 ${el.phones}` : ""} {el.emails ? ` • ✉️ ${el.emails}` : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {el.maplink && (
                  <a
                    href={el.maplink}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#2563eb",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FaExternalLinkAlt size={10} /> Lien Map
                  </a>
                )}
                <button
                  type="button"
                  style={{
                    background: "#ecfdf5",
                    color: "#059669",
                    border: "1px solid #a7f3d0",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onClick={() => setcontact(el)}
                >
                  <FaEdit size={11} /> Éditer
                </button>
                <button
                  type="button"
                  style={{
                    background: "#fef2f2",
                    color: "#dc2626",
                    border: "1px solid #fecaca",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onClick={() =>
                    setmodel((prev) => ({
                      ...prev,
                      contacts: prev.contacts.filter((item) => item.id != el.id),
                    }))
                  }
                >
                  <FaTrash size={11} /> Supprimer
                </button>
              </div>
            </div>
          ))}
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
