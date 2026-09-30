import { Input, Message, SelectPicker, TagPicker } from "rsuite";
import { cities } from "../../Data/cities";

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
  },
}) {
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
