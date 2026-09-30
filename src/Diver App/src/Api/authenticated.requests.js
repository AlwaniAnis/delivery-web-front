import { AXIOS, BASE_URL } from "../Config/api.config";

export const createAPIEndpoint = (endpoint, params = {}, custom_url = "") => {
  let url = endpoint + custom_url + "/";
  let url2=endpoint 
  const headers = {
    Authorization:
      "Bearer " +
      (localStorage.getItem("auth")
        ? JSON.parse(localStorage.getItem("auth")).token
        : ""),
  };
  let options = { headers, params };
  return {
    fetchAll: () => AXIOS.get(url, options),
    fetch: () => AXIOS.get(url2, options),
    customGet: () => AXIOS.get(url, options),
    customPost: (newRecord) => AXIOS.get(url, newRecord, options),
    fetchById: (id) => AXIOS.get(url + id, { headers }),
    create: (newRecord) => AXIOS.post(url, newRecord, { headers }),
    update: (id, updatedRecord) =>
      AXIOS.put(url + id, updatedRecord, { headers }),
    update2: (updatedRecord) => AXIOS.put(url, updatedRecord, { headers }),
    delete: (id) => AXIOS.delete(url + id, { headers }),
    upload: (file) => {
      let formData = new FormData();
      formData.append(
        "files",
        file
        //  new File([blob], "filename")
      );

      return AXIOS.post(url, formData, { headers });
    },
    upload1: (file) => {
      let formData = new FormData();
      formData.append(
        "File",
        file
        //  new File([blob], "filename")
      );

      return AXIOS.post(url, formData, { headers });
    },
  };
};
