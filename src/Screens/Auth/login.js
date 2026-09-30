import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import { Button, Input, Message } from "rsuite";
import { AuthService } from "../../Api/auth.service";
import { isLogged } from "../../Atoms/auth.atom";

export default function Login(props) {
  const setLogged = useSetRecoilState(isLogged);
  const [model, setmodel] = useState({ username: "", password: "" });
  const [error, seterror] = useState("");
  function authenticate() {
    if (model.username && model.password)
      AuthService()
        .login(model)
        .then((res) => {
          if (res.data.success) {
            localStorage.setItem("auth", JSON.stringify(res.data));
            window.location.reload();

            setLogged(true);
            seterror("");
          } else seterror(res.data.message);
        })
        .catch((er) => seterror(er.Message));
  }
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        width: "90%",
        maxWidth: "600px",
        margin: "20px auto",
        padding: "10px",
      }}
    >
      {" "}
      <h1
        style={{
          color: "rgb(61,117,224)",
          textAlign: "center",
          marginBottom: "20px",
        }}
      >
        TAWSIL
      </h1>
      <h3>Connexion</h3>
      <label>Nom d'utilisateur ou email:</label>
      <Input
        name="username"
        onChange={(username) => {
          setmodel((prev) => {
            return { ...prev, username };
          });
        }}
      />
      <br></br>
      <label>Mot de passe :</label>
      <Input
        name="password"
        type="password"
        onChange={(password) => {
          setmodel((prev) => {
            return { ...prev, password };
          });
        }}
        autoComplete="off"
      />
      {error && (
        <Message showIcon type="error">
          {error}
        </Message>
      )}
      <br></br>
      <Button appearance="primary" onClick={authenticate}>
        Connexion
      </Button>
      <Button appearance="link">Mot de pass oublié?</Button>
    </div>
  );
}
