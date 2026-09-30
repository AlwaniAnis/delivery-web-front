import { Input, Message, SelectPicker, TagInput } from "rsuite";

function AddEdit({ _setmodel, error, model, drivers, fetchDrivers }) {
  return (
    <>
      <label>Livreur : </label>
      <SelectPicker
        onSearch={(q) => fetchDrivers(q)}
        data={[{ label: "Tout", value: 0 }].concat(
          drivers.map((c) => {
            return { label: c.name, value: c.id };
          })
        )}
        block
        noSearch
        value={model.driverId}
        onSelect={(driverId) => {
          _setmodel((prev) => {
            return {
              ...prev,
              driverId,
              ...drivers.find((el) => el.id == driverId),
            };
          });
        }}
      />

      <label>Mot de passe</label>
      <Input
        type="password"
        value={model.password}
        onChange={(password) => {
          _setmodel((prev) => {
            return { ...prev, password };
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
// AddEdit.defaultProps = {
//   model: new ClientModel(),
// };
export default AddEdit;
