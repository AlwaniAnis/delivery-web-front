import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import {
  Button,
  ButtonToolbar,
  Content,
  FlexboxGrid,
  Form,
  Input,
  Message,
  Panel,
} from "rsuite";
import { AuthService } from "../../Api/auth.service";
import { isLogged } from "../../Atoms/auth.atom";
import Swal from "sweetalert2";
import { APi } from "../../Api";

export default function ResetPassword({ model, setmodel }) {
  const setLogged = useSetRecoilState(isLogged);

  const [error, seterror] = useState("");
  const save = () => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Accounts)
      .create(model)
      .then((res) => {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Element a été bien ajouté !",
          showConfirmButton: false,
          timer: 1500,
        });
      })
      .catch((e) => {});
  };
  return (
    <div>
      <label>Nouveau Mot de passe :</label>
      <Input
        name="password"
        onChange={(password) => {
          setmodel((prev) => {
            return { ...prev, password };
          });
        }}
        autoComplete="off"
      />

      <div style={{ fontSize: "13px", color: "#aaa" }}>
        <li>
          Votre mot de passe doit comporter au moins 8 caractères, dont des
          lettres majuscules et minuscules, des chiffres et des symboles (ex: *
          , $ , @)
        </li>
      </div>
      {error && (
        <Message showIcon type="error">
          {error}
        </Message>
      )}
      <br></br>

      <Button appearance="primary" onClick={save}>
        Changer
      </Button>
    </div>
  );
}
