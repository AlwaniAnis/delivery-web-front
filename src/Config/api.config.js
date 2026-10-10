import axios from "axios";
export const BASE_URL = "https://api.squaddelivery.online/";
//export const BASE_URL = "https://localhost:44340/";

//export const BASE_URL = "https://localhost:5001/";
export const AXIOS = axios.create({ baseURL: BASE_URL + "api/" });
