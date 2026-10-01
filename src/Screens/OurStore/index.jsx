import { useEffect, useState } from "react";
import { Button, Input, SelectPicker, TagInput } from "rsuite";
import { createAPIEndpoint } from "../../Api/authenticated.requests";
import { ENDPOINTS } from "../../Api/enpoints";
import { FileD } from "../../Components/media_library";
import Responsive from "../../Components/Responsive";
import { BASE_URL } from "../../Config/api.config";
import { useRecoilValue } from "recoil";
import { MyStore } from "../../Atoms/store.atom";

export default function OurStore() {
  const [model, setmodel] = useState({
    contacts: [],
  });
  const store = useRecoilValue(MyStore);

  useEffect(() => {
    setmodel(store);
  }, [store.id]);

  const [contact, setcontact] = useState({
    address: "",
    phones: "",
    emails: "",
    maplink: "",
  });

  return (
    <div style={{ padding: "10px", background: "#fff" }}>
      <h1>Notre Boutique</h1>
      <hr></hr>
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
      {/* <label>Emails:</label>
      <TagInput
        block
        size="md"
        // placeholder="numéros des télephones"
        value={model.contact.emails ? model.contact.emails.split(",") : []}
        onChange={(emails) => {
          let m = { ...model };
          m.contact.emails = emails.join(",");
          setmodel(m);
        }}
      />
      <label>Télephones</label>
      <TagInput
        block
        size="md"
        // placeholder="numéros des télephones"
        value={model.contact.phones ? model.contact.phones.split(",") : []}
        onChange={(phones) => {
          let m = { ...model };
          m.contact.phones = phones.join(",");
          setmodel(m);
        }}
      /> */}
      {/* <label>Adresse :</label>
      <Input
        as="textarea"
        value={model.contact.address}
        onChange={(address) => {
          setmodel((prev) => {
            return { ...prev, contact: { ...prev.contact, address } };
          });
        }}
      /> */}
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
          <label>Emails:</label>
          <TagInput
            block
            size="md"
            // placeholder="numéros des télephones"
            value={contact.emails ? contact.emails.split(",") : []}
            onChange={(emails) => {
              let m = { ...contact };
              m.emails = emails.join(",");
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
      {/* ------------------------------------- */}
      {/* -------------------------------------- */}
      <br></br>
      <div style={{ textAlign: "right" }}>
        <button
          style={{
            background: "rgb(0,169,141)",
            color: "#fff",
            fontSize: "20px",
            borderRadius: "4px",
          }}
          onClick={() => {
            let m = { ...model };

            m.contacts = m.contacts.map((el) => {
              delete el.id;
              return el;
            });

            createAPIEndpoint(ENDPOINTS.Store)
              .update(model.id, m)
              .then((res) => {
                alert("success");
                createAPIEndpoint(ENDPOINTS.Store + "/getDefault")
                  .customGet()
                  .then((res) => setmodel(res.data));
              });
          }}
        >
          Enregistrer
        </button>
      </div>
    </div>
  );
}
