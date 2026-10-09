import { AXIOS } from "../Config/api.config";

export const createAPIEndpoint = (endpoint, params = {}, custom_url = "") => {
  const rawUrl = endpoint + custom_url;
  const url = rawUrl.includes("?")
    ? rawUrl
    : rawUrl.endsWith("/")
    ? rawUrl
    : rawUrl + "/";
  const url2 = endpoint;
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

  const getOptions = () => ({
    headers: getHeaders(),
    params,
  });

  return {
    fetchAll: () => AXIOS.get(url, getOptions()),
    fetch: () => AXIOS.get(url2, getOptions()),
    customGet: () => AXIOS.get(url, getOptions()),
    customPost: (newRecord) => AXIOS.post(url, newRecord, getOptions()),
    customPut: (updatedRecord) => AXIOS.put(url, updatedRecord, getOptions()),
    fetchById: (id) => AXIOS.get(url + id, { headers: getHeaders() }),
    create: (newRecord) => AXIOS.post(url, newRecord, getOptions()),
    update: (id, updatedRecord) =>
      AXIOS.put(url + id, updatedRecord, { headers: getHeaders() }),
    update2: (updatedRecord) =>
      AXIOS.put(url, updatedRecord, getOptions()),
    delete: (id) => AXIOS.delete(url + id, { headers: getHeaders() }),
    upload: (file) => {
      let formData = new FormData();
      formData.append("files", file);
      return AXIOS.post(url, formData, { headers: getHeaders() });
    },
    upload1: (file) => {
      let formData = new FormData();
      formData.append("File", file);
      return AXIOS.post(url, formData, { headers: getHeaders() });
    },
  };
};
