import { useRecoilState } from "recoil";
import { Input, Message, SelectPicker, TagInput } from "rsuite";
import { CustomerState } from "../../Atoms/customer.atom";

function AddEdit({ error }) {
  const [model, setmodel] = useRecoilState(CustomerState);

  return (
    <>
      <label>Nom Complet :</label>
      <Input
        onChange={(fullName) => {
          setmodel((prev) => {
            return { ...prev, fullName };
          });
        }}
        value={model.fullName}
      />
      <label>Email :</label>
      <Input
        type="email"
        value={model.email}
        onChange={(email) => {
          setmodel((prev) => {
            return { ...prev, email };
          });
        }}
      />
      <label>Télephone :</label>
      <Input
        value={model.phoneNumber}
        onChange={(phoneNumber) => {
          setmodel((prev) => {
            return { ...prev, phoneNumber };
          });
        }}
      />
      <label>Adresse :</label>
      <Input
        value={model.address}
        onChange={(address) => {
          setmodel((prev) => {
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
// AddEdit.defaultProps = {
//   model: new ClientModel(),
// };
export default AddEdit;
