import { useState } from "react";
import { Button, Input, Message, TagInput } from "rsuite";
import Responsive from "../../Components/Responsive";

function AddEdit({
  setmodel,
  error,

  model = {
    contacts: [],
  },
}) {
  const [contact, setcontact] = useState({
    address: "",
    phones: "",
    emails: "",
    maplink: "",
  });
  return (
    <>
      <label>Nom :</label>
      <Input
        onChange={(name_fr) => {
          setmodel((prev) => {
            return { ...prev, name_fr };
          });
        }}
        value={model.name_fr}
      />
      <label>Matricule Fiscale :</label>
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
