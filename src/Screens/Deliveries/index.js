import ImageIcon from "@rsuite/icons/Image";
import React, { useEffect, useRef, useState } from "react";
import { FaMapMarker, FaPhoneAlt } from "react-icons/fa";
import { ImPrinter } from "react-icons/im";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  Button,
  Checkbox,
  DateRangePicker,
  Input,
  Modal,
  SelectPicker,
  Tag,
} from "rsuite";
import Pagination from "rsuite/Pagination";

import { APi } from "../../Api";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";

import moment from "moment";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import Swal from "sweetalert2";
import { createAPIEndpoint } from "../../Api/authenticated.requests";
import { ENDPOINTS } from "../../Api/enpoints";
import { DriversList } from "../../Atoms/drivers.atom";
import { MyStore } from "../../Atoms/store.atom";
import Responsive from "../../Components/Responsive";
import ResumeCard from "../../Components/ResumeCard";
import { DeliveryStatus, dateTypes } from "../../Constants/types";
import validate from "../../Helpers/validate";
import DeliveryModel from "../../Models/deliveryModel";
import AddEdit from "./addEdit.component";
import useB2B from "../../hooks/useB2B";
import { StoresList } from "../../Atoms/stores.atom";
export default function Deliveries(props) {
  // STATE
  const [data, setdata] = useState([]);
  const frameRef = useRef(null);

  const [totalCount, settotalCount] = useState(0);
  const [totalOrdered, settotalOrdered] = useState(0);
  const [totalPaid, settotalPaid] = useState(0);
  const [totalDelivred, settotalDelivred] = useState(0);

  const [code, setcode] = useState("");
  const [filterModel, setfilterModel] = useState({
    q: "",
    storeId: 0,
    page: 1,
    take: 20,
  });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useState(new DeliveryModel());
  const [show, setshow] = useState(0);
  const [drivers, setDriversList] = useRecoilState(DriversList);
  const [checkeds, setcheckeds] = useState([]);
  const store = useRecoilValue(MyStore);
  const { isB2B } = useB2B();
  const storesList = useRecoilValue(StoresList);

  const [changedDriverModel, setchangedDriverModel] = useState({
    driverId: null,
    deliveries: [],
  });
  // ATOMS
  const [state, setstate] = useRecoilState(exportAddAtom);
  // HELPERS
  const reset = () => {
    setmodel(new DeliveryModel());
    setError("");
  }; // API CALLS
  const fetch = () => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, {
      ...filterModel,
      storeId: !store.isDefault ? store.id : filterModel.storeId,
    })
      .fetchAll()
      .then((res) => {
        setdata(
          res.data.data.map((el) => {
            let _el = { ...el };
            _el.coliItems = _el.coliItems.map((c) => {
              let _c = { ...c };
              _c.index = _c.id;
              delete _c.id;
              return _c;
            });
            return _el;
          })
        );
        settotalCount(res.data.totalCount);
        settotalOrdered(res.data.totalOrdered);
        settotalPaid(res.data.totalPaid);
        settotalDelivred(res.data.totalDelivred);
      })
      .catch((e) => setError(e.Message));
  };
  const save = () => {
    let msg = validate(model.customer, [
      { fullName: "Nom" },
      { phoneNumber: "Numero de téléphone" },
      { city: "Gouvernerat" },
    ]);
    let eStoreId = 0;
    if (!store || !store.id) {
      eStoreId = JSON.parse(localStorage.getItem("auth")).storeId;
    } else eStoreId = store.id;
    let m = {
      ...model,
      eStoreId,
      customer: { ...model.customer, eStoreId },
    };
    if (msg) setError(msg);
    else {
      setstate((prev) => {
        return { ...prev, loading: true };
      });
      if (model.id) {
        delete m.driver;
        APi.createAPIEndpoint(APi.ENDPOINTS.Delivery)
          .update(model.id, m)
          .then((res) => {
            fetch();
            setstate((prev) => {
              return { ...prev, open: false, loading: false };
            });
            reset();
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "Élément a été bien modifié !",
              showConfirmButton: false,
              timer: 1500,
            });
          })
          .catch((e) => {
            setError(e.Message);
            setstate((prev) => {
              return { ...prev, loading: false };
            });
          });
      } else {
        if (model.customerId) {
          APi.createAPIEndpoint(APi.ENDPOINTS.Customer)
            .update(m.customerId, m.customer)
            .then((res) => {})
            .catch((e) => {});
          delete m.customer;
        }
        APi.createAPIEndpoint(APi.ENDPOINTS.Delivery)
          .create(m)
          .then((res) => {
            fetch();
            reset();
            Swal.fire({
              position: "top-end",
              icon: "success",
              title: "Element a été bien ajouté !",
              showConfirmButton: false,
              timer: 1500,
            });
            setstate((prev) => {
              return { ...prev, open: false, loading: false };
            });
          })
          .catch((e) => {
            setError(e.Message);
            setstate((prev) => {
              return { ...prev, loading: false };
            });
          });
      }
    }
  };
  const deleteAction = (id) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery)
      .delete(id)

      .then((res) => {
        fetch();
        Swal.fire("Supprimé !", "", "success");
      })
      .catch((e) => setError(e.Message));
  };
  const getBYId = (id) => {
    setmodel(data.find((el) => el.id == id));
    setError("");
  };
  // LIFE CYCLES

  const columns = [
    {
      value: "id",
      name: " ",
      render: (id) => (
        <b style={{ color: "green", display: "flex", alignItems: "center" }}>
          <Checkbox
            onChange={(v) => {
              if (checkeds.find((el) => el == id))
                setcheckeds((prev) => prev.filter((l) => l != id));
              else setcheckeds((prev) => [...prev, id]);
            }}
            checked={checkeds.find((el) => el == id) != null}
          ></Checkbox>
        </b>
      ),
    },
    {
      value: "customer",
      value2: "exchangeable",
      value3: "qrCodeContent",
      name: "Client",
      render: (v, v2, v3) => (
        <b style={{ display: "", alignItems: "center" }}>
          <div style={{ padding: "0 5px" }}>{v && v.fullName}</div>
          <div>
            <b style={{ padding: "0 5px", color: "#00a98d" }}>{v3}</b>
            {v2 && (
              <Tag size="sm" color="yellow">
                <b style={{ color: "#222", fontWeight: "400" }}> echangeable</b>
              </Tag>
            )}
          </div>
        </b>
      ),
    },
    {
      value: "customer",

      name: "Contacts",
      render: (v) => (
        <b style={{ display: "flex", alignItems: "center" }}>
          <div style={{ padding: "0 5px" }}>
            {v && (
              <div>
                <a
                  style={{
                    textDecoration: "none",
                    color: "#2f1a4c",
                    border: "1px solid #ddd",
                    padding: "5px 5px",
                    margin: "0 2px",
                    borderRadius: "5px",
                  }}
                  href={`tel:${v.phoneNumber}`}
                >
                  <FaPhoneAlt /> {v.phoneNumber}{" "}
                </a>

                {v.phoneNumber2 ? (
                  <a
                    st
                    style={{
                      textDecoration: "none",
                      color: "#2f1a4c",
                      border: "1px solid #ddd",
                      padding: "5px 5px",
                      margin: "0 2px",
                      borderRadius: "5px",
                    }}
                    href={`tel:${v.phoneNumber2}`}
                  >
                    <FaPhoneAlt /> {v.phoneNumber2}{" "}
                  </a>
                ) : (
                  ""
                )}
              </div>
            )}
          </div>
        </b>
      ),
    },
    {
      value: "customer",

      name: "Addresse",
      render: (v) => (
        <div style={{ maxWidth: "220px", minWidth: "150px" }}>
          <b
            st
            style={{
              color: "#2f1a4c",
              wordWrap: "break-word",
              whiteSpace: "pre-line",
              margin: "0 2px",
              borderRadius: "5px",
            }}
          >
            <FaMapMarker />{" "}
            {v.city +
              (v.deleg ? " - " + v.deleg : "") +
              (v.ville ? " - " + v.ville : "") +
              (v.zipCode ? " - " + v.zipCode : "")}
            <br></br>
            <i>{v.address}</i>
          </b>
        </div>
      ),
    },
    {
      value: "status",
      name: "Statut",
      render: (v) => (
        <>
          <Tag
            color={
              v == 1
                ? "yellow"
                : v == 2
                ? "blue"
                : v == 3
                ? "violet"
                : v == 4
                ? "blue"
                : v == 5
                ? "green"
                : v == 6
                ? "red"
                : "orange"
            }
          >
            {v && DeliveryStatus.find((el) => el.value == v)
              ? DeliveryStatus.find((el) => el.value == v).label
              : ""}
          </Tag>
        </>
      ),
    },
    {
      value: "coliItems",
      name: "Désignation",
      render: (coliItems) => (
        <div
          style={{
            maxWidth: "200px",
            minWidth: "150px",
            whiteSpace: "pre-line",
          }}
        >
          {coliItems.reduce((a, b) => a + b.designation + "\n", "")}
        </div>
      ),
    },
    {
      value: "isPaid",
      name: "Payé",
      render: (isPaid) => (
        <Tag color={isPaid ? "green" : "red"}>
          {isPaid ? "payé" : "non payé"}
        </Tag>
      ),
    },
    {
      value: "coliItems",
      name: "Montant",
      render: (coliItems) => (
        <b>
          {coliItems.reduce((a, b) => a + b.qty * b.unitPrice, 0).toFixed(3)}{" "}
          TND
        </b>
      ),
    },

    {
      value: "driver",

      name: "Livreur",
      render: (v) => (
        <b style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              fontSize: "15px",
              border: "1px dashed #888",
              borderRadius: "50%",
              width: "43px",
              height: "43px",
              textAlign: "center",
              lineHeight: "42px",
            }}
          >
            <ImageIcon color="#3598ff"></ImageIcon>
          </div>

          <div style={{ padding: "0 5px" }}>
            {v && v.firstName + "  " + v.lastName}
          </div>
        </b>
      ),
    },
    {
      value: "id",

      name: "_",
      render: (id) => (
        <button
          onClick={() => {
            let m = data.find((el) => el.id == id);
            setcode(m.qrCodeContent);
            handlePrint(id);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 9px",
            background: "#2f1a4c",
            width: "100px",
            justifyContent: "space-between",
            color: "#fff",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          imprimer <ImPrinter />
        </button>
      ),
    },
  ];
  useEffect(() => {
    const iframe = frameRef.current;
    iframe.contentDocument.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${Date.now()}</title>
      </head>
      <style>
        * {
          box-sizing: border-box;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
          }
        }
    
        table {
          /* display: table; */
          border: 1px solid #aaa;
          background: #fff;
          -webkit-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          -moz-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          min-width: 100%;
          border-radius: 5px;
          table-layout: fixed;
          border-collapse: collapse;
        }
        thead tr {
          height: 35px;
          width: 100%;
          display: table-row;
          border-bottom: 1px solid #eee;
          background-color: #eee;
        }
        thead th {
          color: #121716;
          font-size: 18px;
          padding: 0 7px;
          font-weight: 500;
          text-align: left;
          border: 1px solid #777;
        }
    
        tr {
          width: 100%;
          display: table-row;
          padding: 10px;
          white-space: nowrap;
        }
        tr:nth-child(even) {
          background-color: rgba(33, 150, 243, 0.03);
        }
    
        /* ---------------- */
        tbody tr {
          padding: 10px 0;
        }
        tbody td {
          display: table-cell;
          border: 1px solid #aaa;
    
          padding: 10px 8px;
          font-weight: 600;
        }
      </style>
      <body></body></html>`);
  }, []);
  const handlePrint = (id) => {
    let m = data.find((el) => el.id == id);
    setTimeout(() => {
      const codes = document.querySelector("#custom-codes").innerHTML;
      const iframe = frameRef.current;
      iframe.contentDocument.body.innerHTML = "";
      const content = generateHTMLContent(m, codes);
      iframe.contentDocument.body.innerHTML = content;

      iframe.contentWindow.print();
    }, 300);
  };
  const handlePrintMultiple = () => {
    let d = data.filter((el) => checkeds.find((ell) => ell == el.id));
    let _codes = Array.from(document.querySelectorAll("#custom-codes2 p")).map(
      (el) => el.innerHTML
    );
    // debugger;
    const iframe = frameRef.current;
    iframe.contentDocument.body.innerHTML = "";
    // iframe.contentDocument.body.innerHTML = content;
    iframe.contentDocument.open();
    let cont = d
      .map((m, i) => {
        return generateHTMLContent(m, _codes[i]);
      })
      .join("");
    console.log(cont);
    let cc = `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${Date.now()}</title>
      </head>
      <style>
        * {
          box-sizing: border-box;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact; 
          }
        
          @page {
            width:98%
          }
        }
    
        table {
          /* display: table; */
          border: 1px solid #aaa;
          background: #fff;
          -webkit-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          -moz-box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          box-shadow: 0px 0px 11px -2px rgba(219, 219, 219, 1);
          min-width: 100%;
          border-radius: 5px;
          table-layout: fixed;
          border-collapse: collapse; 
        }
        thead tr {
          height: 35px;
          width: 100%;
          display: table-row;
          border-bottom: 1px solid #eee;
          background-color: #eee;
        }
        thead th {
          color: #121716;
          font-size: 18px;
          padding: 0 7px;
          font-weight: 500;
          text-align: left;
          border: 1px solid #777;
        }
    
        tr {
          width: 100%;
          display: table-row;
          padding: 10px;
          white-space: nowrap;
        }
        tr:nth-child(even) {
          background-color: rgba(33, 150, 243, 0.03);
        }
    
        /* ---------------- */
        tbody tr {
          padding: 10px 0;
        }
        tbody td {
          display: table-cell;
          border: 1px solid #aaa;
    
          padding: 10px 8px;
          font-weight: 600;
        }
      </style>
      <body>${cont}</body></html>`;
    iframe.contentDocument.write(cc);
    iframe.contentDocument.close();
    iframe.contentWindow.print();
  };
  function generateHTMLContent(m, codes) {
    let cont = store.contacts[0];
    let c = m.customer;
    return `<section style="   page-break-before: always !important; padding:10px;width:calc(100% - 10px ) ">
    <div>
      <h2>BL N° ${m.qrCodeContent}</h2>
      <div style="display: flex;">
        <div
          style="
            display: inline-flex;
            width: 65%;
            border: 1px solid #7777;
            padding: 10px;
            color: #444;
            justify-content: space-between;
          "
        >
          <div>
            <strong>${store.name_fr} </strong>
            <address>Adresse : ${cont.address}</address>
            <b>MF: ${store.taxCode}</b>
          </div>
         ${cont.phones.replaceAll("+216", "").replaceAll(",", " / ")}
        </div>
  
         
        <div
          style="
            text-align: center;
            padding: 0px;
            display: inline-block;
            flex: 1;
          "
        >
        ${codes}
        </div>
      </div>
      <!-- end flex -->
      <h2 style="text-align: center;">${c.city}</h2>
    <div style="border: 1px solid #7777; display: flex; align-items: stretch;">
      <div
        style="
          width: 65%;
          border-right: 1px solid #7777;
          padding: 10px;
          color: #444;
        "
      >
        <div><strong>DESTINATAIRE : </strong> <b>${c.fullName}</b></div>
        <div>
          <strong>Adresse : </strong>
          <address style="display: inline-block;">
        ${c.address}
          </address>
        </div>
        <div>
          <strong>Tel: </strong>
          <span
            ><a style="text-decoration: none; color: #222;" href="tel:${
              c.phoneNumber
            }"
              >${c.phoneNumber} </a
            >
            ${
              c.phoneNumber2
                ? ` / <a style="text-decoration: none; color: #222;" href="tel:${c.phoneNumber2}"
                  >${c.phoneNumber2} </a
                >`
                : ""
            }</span >
        </div>
      </div> 
      <div style="flex: 1; font-size: 0.9em;">
        <div style="border-bottom: 1px solid #777;">
          <span
            style="
              display: inline-block;
              padding: 10px;
              border-right: 1px solid #777;
              text-align: center;
              width: 55%;
            "
            >Poids : -
          </span>
          <span style="padding: 10px; text-align: center;">NBP : ${m.coliItems.reduce(
            (a, b) => a + b.qty,
            0
          )} </span>
        </div>
        <div
          style="
            text-align: center;
            padding: 10px;
            min-height: 70px;
            border-bottom: 1px solid #777;
          "
        >
        ${m.coliItems.reduce((a, b) => a + b.designation + " \n ", "")}
        </div>
        <div style="padding: 10px; text-align: center;">
          <strong>Total ${m.coliItems
            .reduce((a, b) => a + b.qty * b.unitPrice, 0)
            .toFixed(3)} TND </strong>
        </div>
      </div>
  
    </div>
        <!-- mazel 2 parent  -->
  
    <div
      style="
        margin: 20px 0;
        border: 1px dashed #aaa;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.1);
      "
    >
      <strong>Note : </strong>
      <i> ${m.remark} </i>
    </div>
  <!--  -->
    <div style="display: flex;">
      <div style="padding: 10px; border: 1px solid #777;">
        <strong>${store.name_fr}</strong>
      </div>
      <div style="padding: 10px 40px;">
        <strong>Facture N° 2024/${m.id}</strong>
        <div><i>Date : ${moment(new Date()).format("L")}</i></div>
      </div>
    </div>
    <!--  -->
    <div style="display: flex; justify-content: flex-end;">
      <div
        style="width: 45%; border: 1px solid #7777; padding: 10px; color: #444;"
      >
        <div><strong>Client : </strong> <b>${c.fullName}</b></div>
  
        <div>
          <strong>Adresse : </strong>
          <b style="display: inline-block;">
            ${
              c.city +
              (c.deleg ? " - " + c.deleg : "") +
              (c.ville ? " - " + c.ville : "") +
              (c.zipCode ? " - " + c.zipCode : "")
            }
            </b><i>            ${c.address}
            </i>
        </div>
        <div>
          <strong>Tel: </strong>
          <span
            ><a style="text-decoration: none; color: #222;" href="tel:${
              c.phoneNumber
            }"
              >${c.phoneNumber} </a
            >
            ${
              c.phoneNumber2
                ? ` / <a style="text-decoration: none; color: #222;" href="tel:${c.phoneNumber2}"
                  >${c.phoneNumber2} </a
                >`
                : ""
            }</span
          >
        </div>
      </div>
    </div>
    <!--  -->
    <br />
    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th>Quantité</th>
          <th>Prix HT</th>
          <th>TVA</th>
          <th>MT TVA</th>
          <th>TTC</th>
        </tr>
      </thead>
      <tbody>
        ${m.coliItems
          .map(
            (el) => `<tr>
        <td>${el.designation}</td>
        <td>${el.qty}</td>
        <td>${(el.qty * el.unitPrice * 0.81).toFixed(3)}</td>
        <td>19%</td>
        <td>${(el.qty * el.unitPrice * 0.19).toFixed(3)}</td>
        <td>${(el.qty * el.unitPrice).toFixed(3)}</td>
      </tr>`
          )
          .join("")}
      </tbody>
    </table>
    <br />
    <div
      style="
        display: flex;
        justify-content: space-between;
        background-color: #eee;
        padding: 10px;
      "
    >
      <strong>PRIX TOTAL : </strong> <strong>${m.coliItems
        .reduce((a, b) => a + b.qty * b.unitPrice, 0)
        .toFixed(3)} DT</strong>
    </div>
  <!--  -->
    <br>
    <hr>
    <div style="text-align: center;padding: 10px;">
        <strong>${store.name_fr} </strong>
        <div>Adresse : ${cont.address}</div>
        ${cont.phones.replaceAll("+216", "").replaceAll(",", " / ")}
  
      <div>
      </div>
      </div>
  </section>`;
  }
  useEffect(() => {
    if (store.id) {
      fetch();
    }
  }, [store.id, filterModel.page, filterModel.take]);
  return (
    <div>
      {" "}
      <div style={{ overflow: "hidden", height: 0 }}>
        <iframe ref={frameRef} title="printFrame" width="100%"></iframe>
        <div id="custom-codes">
          <Barcode height={70} value={code} />
          <br></br>
          <QRCode value={code} size={80} />{" "}
        </div>
        <div id="custom-codes2">
          {data
            .filter((el) => checkeds.find((el1) => el1 == el.id))
            .map((el) => (
              <p
                key={el.id}
                style={{
                  textAlign: "center",
                  padding: "10px",
                  display: "flex",
                }}
              >
                <Barcode height={70} value={el.qrCodeContent} />
                <br></br>
                <QRCode value={el.qrCodeContent} size={80} />{" "}
              </p>
            ))}
        </div>
      </div>
      <Filter search={() => fetch()}>
        <Responsive l={2.6} xl={2.6} m={4} className="p-5">
          <label>Recherche</label>
          <Input
            value={filterModel.q}
            placeholder="recherche"
            onChange={(q) => {
              setfilterModel((prev) => {
                return { ...prev, q };
              });
            }}
          />
        </Responsive>
        <Responsive m={6} l={1.4} xl={1.4} className="p-10">
          <label>Type: </label>
          <SelectPicker
            data={[
              { label: "Tout", value: 0 },
              { label: "non Payé", value: 1 },
              { label: "Payé", value: 2 },
            ]}
            block
            noSearch
            value={
              filterModel.isPaid ? 2 : filterModel.isPaid === false ? 1 : 0
            }
            onSelect={(v) => {
              setfilterModel((prev) => {
                return {
                  ...prev,
                  isPaid: v == 1 ? false : v == 2 ? true : null,
                };
              });
            }}
          />
        </Responsive>
        <Responsive m={6} l={2} xl={2} className="p-5">
          <label>Dates: </label>
          <SelectPicker
            data={dateTypes}
            block
            noSearch
            value={filterModel.dateType}
            onSelect={(dateType) => {
              let today = new Date(moment(Date.now()).format("yyyy-MM-DD"));
              console.log(
                //
                today
              );
              setfilterModel((prev) => {
                return {
                  ...prev,
                  dateType,
                  date:
                    dateType == 7 || dateType == 1
                      ? today
                      : dateType == 2
                      ? moment(moment(Date.now()).add(-1, "d")).format(
                          "yyyy-MM-DD"
                        )
                      : null,
                  dateFrom:
                    dateType == 6
                      ? today
                      : dateType == 3
                      ? moment().startOf("month").format("yyyy-MM-DD")
                      : dateType == 4
                      ? moment(Date.now())
                          .subtract(1, "months")
                          .startOf("month")
                          .format("yyyy-MM-DD")
                      : dateType == 5
                      ? moment().startOf("year").format("yyyy-MM-DD")
                      : null,
                  dateTo:
                    dateType == 6
                      ? new Date(
                          moment(moment(Date.now()).add(1, "d")).format(
                            "yyyy-MM-DD"
                          )
                        )
                      : dateType == 3
                      ? today
                      : dateType == 4
                      ? moment(Date.now())
                          .subtract(1, "months")
                          .endOf("month")
                          .format("yyyy-MM-DD")
                      : null,
                };
              });
            }}
          />
        </Responsive>
        {filterModel.dateType == 7 && (
          <Responsive m={6} l={2.6} xl={2.6} className="p-5">
            <label>Date: </label>
            <Input
              type="date"
              value={filterModel.date}
              onChange={(date) => {
                setfilterModel((prev) => {
                  return { ...prev, date };
                });
              }}
            />
          </Responsive>
        )}
        {filterModel.dateType == 6 && (
          <Responsive m={6} l={2.6} xl={2.6} className="p-5">
            <label>Plage du temps: </label>
            <DateRangePicker
              block
              value={[filterModel.dateFrom, filterModel.dateTo]}
              onChange={(vs) => {
                setfilterModel((prev) => ({
                  ...prev,
                  dateFrom: vs[0],
                  dateTo: vs[1],
                }));
              }}
            />
          </Responsive>
        )}
        <Responsive l={2.4} xl={2.4} m={4} className="p-5">
          <label>Livreur </label>
          <SelectPicker
            data={[{ label: "Sélectionner", value: 0 }].concat(
              drivers.map((c) => {
                return { label: c.firstName + " " + c.lastName, value: c.id };
              })
            )}
            block
            noSearch
            value={filterModel.driverId}
            onSelect={(driverId) => {
              setfilterModel((prev) => {
                return { ...prev, driverId };
              });
            }}
          />
        </Responsive>
        <Responsive m={4} l={2} xl={2} className="p-5">
          <label>Status: </label>
          <SelectPicker
            searchable={false}
            data={DeliveryStatus}
            block
            noSearch
            value={filterModel.status}
            onSelect={(status) => {
              setfilterModel((prev) => {
                return { ...prev, status };
              });
            }}
          />
        </Responsive>
        {!isB2B && (
          <Responsive l={3} xl={3} m={4} className="p-5">
            <label>Boutique </label>
            <SelectPicker
              data={[{ label: "Sélectionner", value: 0 }].concat(
                storesList.map((c) => {
                  return { label: c.name_fr, value: c.id };
                })
              )}
              block
              noSearch
              value={filterModel.storeId}
              onSelect={(storeId) => {
                setfilterModel((prev) => {
                  return { ...prev, storeId };
                });
              }}
            />
          </Responsive>
        )}
      </Filter>
      <div>
        {" "}
        <Responsive className="p-10" s={4} m={4} l={4} xl={4}>
          <ResumeCard
            text="Total Montant"
            color={
              "245,195,35"
              // "70,103,209",
              // "102,51,153",
              // "70,103,209",
              // "84,159,10",
              // "169,14,67",
              // "246,137,51",
            }
            amount={totalOrdered}
          />
        </Responsive>
        <Responsive className="p-10" s={4} m={4} l={4} xl={4}>
          <ResumeCard
            text="Total Livré"
            color={
              //"245,195,35"
              "70,103,209"
              // "102,51,153",
              // "70,103,209",
              // "84,159,10",
              // "169,14,67",
              // "246,137,51",
            }
            amount={totalDelivred}
          />
        </Responsive>
        <Responsive className="p-10" s={4} m={4} l={4} xl={4}>
          <ResumeCard
            text="Total Payé"
            color={
              //"245,195,35"
              // "70,103,209",
              "102,51,153"
              // "70,103,209",
              // "84,159,10",
              // "169,14,67",
              // "246,137,51",
            }
            amount={totalPaid}
          />
        </Responsive>
      </div>
      <ExportAdd
        ActionOnClose={reset}
        title="Ajouter Commande"
        full
        noExport
        save={save}
        AddComponent={
          <AddEdit error={error} model={model} _setmodel={setmodel} />
        }
      />{" "}
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          onClick={(e) =>
            setcheckeds((prev) => (prev.length ? [] : data.map((el) => el.id)))
          }
          style={{
            display: "inline-block",
            padding: "8px",
            borderRadius: "4px",
          }}
        >
          <Checkbox checked={checkeds.length > 0}></Checkbox> Sélectionner Tout
        </div>
        <button
          onClick={handlePrintMultiple}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 9px",
            background: "#2f1a4c",
            width: "100px",
            justifyContent: "space-between",
            color: "#fff",
            borderRadius: "4px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          imprimer <ImPrinter />
        </button>{" "}
      </div>
      {!isB2B && (
        <div className="p-10">
          <Responsive s={6} m={6} l={4} xl={3}>
            <SelectPicker
              data={[{ label: "Selectionner", value: 0 }].concat(
                drivers.map((c) => {
                  return {
                    label: (
                      <b
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "3px",

                          borderRadius: "5px",
                        }}
                      >
                        <b> {c.firstName + " " + c.lastName}</b>
                      </b>
                    ),
                    value: c.id,
                  };
                })
              )}
              block
              noSearch
              value={changedDriverModel.driverId}
              onSelect={(driverId) => {
                setchangedDriverModel((prev) => {
                  return { ...prev, driverId };
                });
              }}
            />
          </Responsive>{" "}
          <Button
            appearance="primary"
            color="blue"
            onClick={() => {
              console.log(checkeds);
              APi.createAPIEndpoint(ENDPOINTS.Delivery + "/changeDriver")
                .create({ ...changedDriverModel, deliveries: checkeds })
                .then((res) => {
                  fetch();
                  alert("success");
                });
            }}
          >
            changer
          </Button>
        </div>
      )}
      <Grid
        editAction={(id) => {
          getBYId(id);

          setstate((prev) => {
            return { ...prev, open: true };
          });
        }}
        deleteAction={isB2B ? false : deleteAction}
        actionKey={"id"}
        noAdvancedActions={isB2B}
        actions={[
          {
            label: "Changer état",
            action: (dataKey) => {
              setshow(dataKey);
            },
            render: (v) => (
              <button
                style={{
                  color: "rgba(67,55,160,1)",
                  padding: "6px 10px",
                  fontSize: "12px",
                  background: "rgba(67,55,160,0.1)",
                  borderRadius: "4px",
                }}
              >
                {v}
              </button>
            ),
          },
        ]}
        columns={columns}
        rows={data}
      />
      <div style={{ padding: 20, background: "#fff" }}>
        <Pagination
          ellipsis
          boundaryLinks
          maxButtons={5}
          size="sm"
          layout={["total", "-", "limit", "|", "pager"]}
          total={totalCount}
          limitOptions={[10, 20, 50, 100]}
          limit={filterModel.take}
          activePage={filterModel.page}
          onChangePage={(page) =>
            setfilterModel((prev) => {
              return { ...prev, page };
            })
          }
          onChangeLimit={(take) => {
            console.log(take);
            setfilterModel((prev) => {
              return { ...prev, take };
            });
          }}
        />
      </div>
      {show ? (
        <Modal
          size="md"
          overflow={false}
          style={{ maxHeight: "calc(100vh - 50px)", overflow: "auto" }}
          open={show > 0}
          onClose={() => {
            setshow(0);
          }}
        >
          <Modal.Header>
            <Modal.Title>Changer l'état du commande</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ maxHeight: "calc(100vh - 240px)", overflow: "auto" }}>
              <label>Statut: </label>
              <SelectPicker
                searchable={false}
                data={[{ label: "Tout", value: 0 }].concat(DeliveryStatus)}
                block
                noSearch
                value={data.find((el) => el.id == show).status}
                onSelect={async (status) => {
                  let d = [...data];
                  d.find((el) => el.id == show).status = status;
                  setdata((prev) => d);
                  let res = await createAPIEndpoint(
                    ENDPOINTS.Delivery + "/changeStatus/" + show + "/" + status
                  ).update2({});
                  if (res) setshow(0);
                }}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => {
                setshow(0);
              }}
              appearance="subtle"
            >
              Annuler
            </Button>
          </Modal.Footer>
        </Modal>
      ) : (
        ""
      )}
    </div>
  );
}
