import { AXIOS } from "../Config/api.config";

export const AuthService = () => {
  const getHeaders = () => {
    let token = "";
    try {
      const auth = localStorage.getItem("auth");
      if (auth) {
        token = JSON.parse(auth).token || "";
      }
    } catch (e) {
      token = "";
    }
    return {
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  return {
    login: (data) => AXIOS.post("Auth/login", data),
    loginDriver: (data) => AXIOS.post("Auth/loginDriver", data),
    loginB2B: (data) => AXIOS.post("Auth/loginB2B", data),
    register_admin: (data) => AXIOS.post("Auth/", data),
    update_profile: (data) =>
      AXIOS.post("Auth/update-profile", data, { headers: getHeaders() }),
    reset_password: (pass) =>
      AXIOS.post("Auth/resetPassword", pass, { headers: getHeaders() }),
  };
};
