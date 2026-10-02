import { Input, Message, SelectPicker, TagPicker } from "rsuite";
import { useRecoilValue } from "recoil";
import { cities } from "../../Data/cities";
import { tarifsState } from "../../Atoms/tarifs.atom";

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
    cities: "",
    isPicker: false,
    tarifId: null,
  },
}) {
  const tarifs = useRecoilValue(tarifsState);
  return (
    <>
      <label>Nom:</label>
      <Input
        onChange={(lastName) => {
          _setmodel((prev) => {
            return { ...prev, lastName };
          });
        }}
        value={model.lastName}
      />
      <label>Prénom:</label>
      <Input
        onChange={(firstName) => {
          _setmodel((prev) => {
            return { ...prev, firstName };
          });
        }}
        value={model.firstName}
      />
      <label>Secteur :</label>
      <TagPicker
        data={cities.map((el) => ({ value: el, label: el }))}
        block
        onSelect={(s) => {
          console.log(s);
          _setmodel((prev) => {
            return { ...prev, cities: s.join() };
          });
        }}
        onChange={(s) => {
          console.log(s);
          _setmodel((prev) => {
            return { ...prev, cities: s.join() };
          });
        }}
        value={model.cities ? model.cities.split(",") : null}
      />

      <label>CIN:</label>
      <Input
        value={model.cin}
        onChange={(cin) => {
          _setmodel((prev) => {
            return { ...prev, cin };
          });
        }}
      />
      <hr></hr>

      <label>Email:</label>
      <Input
        value={model.email}
        onChange={(email) => {
          _setmodel((prev) => {
            return { ...prev, email };
          });
        }}
        type="email"
      />
      <label>Matricule Voiture</label>
      <Input
        value={model.carNumber}
        onChange={(carNumber) => {
          _setmodel((prev) => {
            return { ...prev, carNumber };
          });
        }}
      />
      <hr></hr>
      <label>Téléphone 1:</label>
      <Input
        value={model.phone1}
        onChange={(phone1) => {
          _setmodel((prev) => {
            return { ...prev, phone1 };
          });
        }}
        type="tel"
      />
      <label>Téléphone 2:</label>
      <Input
        value={model.phone2}
        onChange={(phone2) => {
          _setmodel((prev) => {
            return { ...prev, phone2 };
          });
        }}
        type="tel"
      />
      <label>Adresse :</label>
      <Input
        value={model.address}
        onChange={(address) => {
          _setmodel((prev) => {
            return { ...prev, address };
          });
        }}
      />

      {/* Rôle Ramasseur (isPicker) */}
      <div style={{ marginTop: "14px", background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1.5px solid #cbd5e1" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 700, color: "#1e293b", margin: 0 }}>
          <input
            type="checkbox"
            checked={Boolean(model.isPicker ?? model.IsPicker)}
            onChange={(e) => {
              const checked = e.target.checked;
              _setmodel((prev) => ({ ...prev, isPicker: checked, IsPicker: checked }));
            }}
            style={{ width: "18px", height: "18px", cursor: "pointer" }}
          />
          <span>📦 Livreur Ramasseur Agréé (Pickup depuis Magasins / Boutiques)</span>
        </label>
        <small style={{ display: "block", color: "#64748b", marginTop: "4px", fontSize: "0.75rem" }}>
          Ce livreur est autorisé à ramasser les colis en boutique et à être crédité automatiquement de son tarif de pickup lors de l'enregistrement au dépôt.
        </small>
      </div>

      {/* Tarif assigné au livreur */}
      <label style={{ fontWeight: 700, color: "#2563eb", marginTop: "12px", display: "block" }}>
        🏷️ Tarif / Commission Assigné(e) :
      </label>
      <SelectPicker
        data={[{ label: "— Aucun tarif particulier —", value: 0 }].concat(
          tarifs.map((t) => ({
            label: `${t.name} (${Number(t.tarifDelivery).toFixed(3)} TND)`,
            value: t.id,
          }))
        )}
        block
        searchable={true}
        placeholder="Choisir le tarif de livraison/ramassage..."
        value={model.tarifId ?? model.TarifId ?? 0}
        onSelect={(val) => {
          _setmodel((prev) => ({
            ...prev,
            tarifId: val === 0 ? null : val,
            TarifId: val === 0 ? null : val,
          }));
        }}
      />

      <label style={{ fontWeight: 700, color: "#166534", marginTop: "12px", display: "block" }}>
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
      <br></br>
      {error && (
        <Message showIcon type="error">
          {error}
        </Message>
      )}
    </>
  );
}

export default AddEdit;
