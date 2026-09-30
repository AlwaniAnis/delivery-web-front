import axios from "axios";
export const BASE_URL = "https://deliveryapi.a2dev.org/";
//export const BASE_URL = "https://localhost:44340/";

//export const BASE_URL = "https://localhost:5001/";
export const AXIOS = axios.create({ baseURL: BASE_URL + "api/" });
