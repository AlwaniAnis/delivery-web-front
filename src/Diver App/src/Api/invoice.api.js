import { AXIOS_INVOICE } from "../Config/api.invoice";
export const InvoiceService = () => {
  const headers = {
    //   Authorization:
    //     "Bearer " +
    //     (localStorage.getItem("auth")
    //       ? JSON.parse(localStorage.getItem("auth")).token
    //       : ""),

    "Content-Type": "multipart/form-data",
  };

  return {
    generate_invoice: (data) => AXIOS_INVOICE.post("invoice/", data),
    update_agency: (data) =>
      AXIOS_INVOICE.put(
        "agency/" +
          (localStorage.getItem("auth")
            ? JSON.parse(localStorage.getItem("auth")).userName
            : ""),
        data,
        { headers }
      ),
    create_agency: (data) => {
      data.append(
        "userName",
        localStorage.getItem("auth")
          ? JSON.parse(localStorage.getItem("auth")).userName
          : ""
      );
      return AXIOS_INVOICE.post("agency", data, { headers });
    },
    get_agency: () =>
      AXIOS_INVOICE.get(
        "agency/" +
          (localStorage.getItem("auth")
            ? JSON.parse(localStorage.getItem("auth")).userName
            : "")
      ),
  };
};
