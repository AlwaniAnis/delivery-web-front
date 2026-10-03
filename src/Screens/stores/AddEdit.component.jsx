import { useState } from "react";
import { useRecoilValue } from "recoil";
import { Button, Input, Message, SelectPicker, TagInput } from "rsuite";
import { FaWarehouse } from "react-icons/fa";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import Responsive from "../../Components/Responsive";

function AddEdit({
  setmodel,
  error,

  model = {
    contacts: [],
    preparationPlaceId: 1,
  },
}) {
  const depotsList = useRecoilValue(preparationPlacesState);
  const [contact, setcontact] = useState({
    address: "",
    phones: "",
    emails: "",
    maplink: "",
  });
  return (
    <>
      <label style={{ fontWeight: 700, display: "block", marginBottom: "4px" }}>Nom de la Boutique * :</label>
      <Input
        onChange={(name_fr) => {
          setmodel((prev) => {
            return { ...prev, name_fr };
          });
        }}
        value={model.name_fr}
      />

      <div style={{ marginTop: "12px", marginBottom: "12px" }}>
        <label style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", color: "#065f46" }}>
          <FaWarehouse style={{ color: "#059669" }} /> Dépôt du Territoire (Obligatoire) * :
        </label>
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
            setmodel((prev) => ({
              ...prev,
              preparationPlaceId: val,
              depotId: val,
            }));
          }}
        />
        <small style={{ color: "#64748b", fontSize: "0.75rem", display: "block", marginTop: "3px" }}>
          La boutique appartient au territoire de ce dépôt : toutes ses livraisons y sont automatiquement rattachées.
        </small>
      </div>

      <label style={{ fontWeight: 700, display: "block", marginBottom: "4px" }}>Matricule Fiscale :</label>
      <Input
        onChange={(taxCode) => {
          setmodel((prev) => {
            return { ...prev, taxCode };
          });
        }}
        value={model.taxCode}
      />
      <label>Description :</label>
      <Input
        as="textarea"
        value={model.description_fr}
        onChange={(description_fr) => {
          setmodel((prev) => {
            return { ...prev, description_fr };
          });
        }}
      />
      <h2>Contacts:</h2>
      <div
        style={{
          border: "1px solid #eee",
          padding: "10px",
          borderRadius: "5px",
          background: "#eee",
        }}
      >
        <Responsive xl={6} l={6} className="p-10">
          <label>Email:</label>
          <Input
            block
            size="md"
            // placeholder="numéros des télephones"
            value={contact.emails}
            onChange={(emails) => {
              let m = { ...contact, emails };

              setcontact(m);
            }}
          />
        </Responsive>
        <Responsive xl={6} l={6} className="p-10">
          <label>Télephones</label>
          <TagInput
            block
            size="md"
            // placeholder="numéros des télephones"
            value={contact.phones ? contact.phones.split(",") : []}
            onChange={(phones) => {
              let m = { ...contact };
              m.phones = phones.join(",");
              setcontact(m);
            }}
          />
        </Responsive>
        <Responsive xl={6} l={6} className="p-10">
          <label>Lien Map :</label>
          <Input
            value={contact.maplink}
            onChange={(maplink) => {
              setcontact((prev) => {
                return { ...prev, maplink };
              });
            }}
          />
        </Responsive>
        <Responsive xl={6} l={6} className="p-10">
          <label>Adresse :</label>
          <Input
            value={contact.address}
            onChange={(address) => {
              setcontact((prev) => {
                return { ...prev, address };
              });
            }}
          />
        </Responsive>
        <Button
          style={{ background: "#4545cc", color: "#fff" }}
          onClick={() => {
            let contacts = [...model.contacts];
            if (!contact.id) {
              contacts.push({
                ...contact,
                id: new Date().getUTCMilliseconds(),
                eStoreId: model.id,
              });
            } else {
              let _indx = contacts.findIndex((el) => el.id == contact.id);
              console.log(_indx);
              contacts[_indx] = contact;
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
          enregistrer +
        </Button>
      </div>
      <div style={{ maxWidth: "600px", padding: "20px 0" }}>
        {model.contacts &&
          model.contacts.map((el) => (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#eee",
                margin: "3px 0",
                padding: "3px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <strong>{el.address}</strong>
              </div>
              <a href={el.maplink} target="_blank">
                lien map
              </a>
              <button
                style={{ background: "#88cc88", color: "#fff" }}
                onClick={() => setcontact(el)}
              >
                editer
              </button>
              <button
                style={{ background: "#cc4545", color: "#fff" }}
                onClick={() =>
                  setmodel((prev) => ({
                    ...prev,
                    contacts: prev.contacts.filter((item) => item.id != el.id),
                  }))
                }
              >
                suprimer
              </button>
            </div>
          ))}
      </div>{" "}
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
