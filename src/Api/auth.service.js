import { AXIOS, BASE_URL } from "../Config/api.config";

export const AuthService = () => {
  const headers = {
    Authorization:
      "Bearer " +
      (localStorage.getItem("auth")
        ? JSON.parse(localStorage.getItem("auth")).token
        : ""),
  };
  return {
    login: (data) => AXIOS.post("Auth/Login", data),
    register_admin: (data) => AXIOS.post("Auth/", data),

    update_profile: (data) =>
      AXIOS.post("Auth/update-profile", data, { headers }),
    reset_password: (pass) =>
      AXIOS.post("Auth/resetPassword", pass, { headers }),
  };
};
