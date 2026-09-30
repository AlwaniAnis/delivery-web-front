import React, { useEffect, useRef, useState } from "react";
import { FaMapMarker, FaPhoneAlt } from "react-icons/fa";
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
import { ImPrinter } from "react-icons/im";

import Pagination from "rsuite/Pagination";
import { APi } from "../../Api";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import Barcode from "react-barcode";

import moment from "moment";
import { createAPIEndpoint } from "../../Api/authenticated.requests";
import { ENDPOINTS } from "../../Api/enpoints";
import Responsive from "../../Components/Responsive";
import { DeliveryStatus, dateTypes } from "../../Constants/types";
import DeliveryModel from "../../Models/deliveryModel";
import QRCode from "react-qr-code";
import { MyStore } from "../../Atoms/store.atom";
import { StoresList } from "../../Atoms/stores.atom";
export default function Deliveries(props) {
  const frameRef = useRef(null);

  // STATE
  const [data, setdata] = useState([]);
  const [totalCount, settotalCount] = useState(0);
  const [checkeds, setcheckeds] = useState([]);

  const [filterModel, setfilterModel] = useState({
    q: "",
    page: 1,
    take: 50,
    storeId: 0,

    // date: moment(new Date()).format("yyyy-MM-DD"),
    // dateType: 7,
  });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useState(new DeliveryModel());
  const [show, setshow] = useState(0);
  const [driver, setdriver] = useState(null);
  const [driverId, setdriverId] = useState(0);
  const store = useRecoilValue(MyStore);
  const storesList = useRecoilValue(StoresList);

  // ATOMS
  // ATOMS
  const [state, setstate] = useRecoilState(exportAddAtom);
  // HELPERS

  const fetch = () => {
    if (driverId) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/getForDriver", {
        ...filterModel,
        driverId,
      })
        .fetchAll()
        .then((res) => {
          setdata(res.data.data);
          settotalCount(res.data.totalCount);
        })
        .catch((e) => setError(e.Message));
    }
  };
  useEffect(() => {
    if (
      localStorage.getItem("auth") &&
      JSON.parse(localStorage.getItem("auth")).driverId
    ) {
      setdriverId(JSON.parse(localStorage.getItem("auth")).driverId);
      APi.createAPIEndpoint(ENDPOINTS.Driver, {})
        .fetchById(JSON.parse(localStorage.getItem("auth")).driverId)
        .then((res) => setdriver(res.data));
    }
  }, []);
  useEffect(() => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Store + "/getAll", {})
      .fetchAll()
      .then((res) => {
        setstoresList(res.data);
      });
  });
  const getBYId = (id) => {
    setmodel(data.find((el) => el.id == id));
    setError("");
  };
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
          <div style={{ padding: "0 5px", color: "#232S" }}>
            {v && v.fullName}
          </div>
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
            {v && DeliveryStatus.find((el) => el.value == v).label}
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
          {coliItems.reduce((a, b) => a + b.designation + " \n ", "")}
        </div>
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
      value: "id",

      name: "Changer l'état",
      render: (v) => (
        <button
          onClick={() => setshow(v)}
          style={{
            color: "rgba(67,55,160,1)",
            padding: "6px 10px",
            fontSize: "12px",
            background: "rgba(67,55,160,0.1)",
            borderRadius: "4px",
          }}
        >
          Changer état
        </button>
      ),
    },
  ];
  useEffect(() => {
    const iframe = frameRef.current;
    iframe.contentDocument.write(`  <!DOCTYPE html>
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
  // LIFE CYCLES
  useEffect(() => fetch(), [driverId]);
  useEffect(() => {
    fetch();
  }, [filterModel.page, filterModel.take]);
  const handlePrint = () => {
    // setTimeout(() => {
    const codes = Array.from(document.querySelectorAll("#custom-codes p")).map(
      (el) => el.innerHTML
    );
    const iframe = frameRef.current;

    // Trigger the print operation
    iframe.contentDocument.body.innerHTML = "";
    const content = generateHTMLContent(codes);
    // iframe.contentDocument.body.innerHTML = content;
    iframe.contentDocument.open();
    iframe.contentDocument.write(content);
    iframe.contentDocument.close();
    iframe.contentWindow.print();

    // }, 500);
  };

  function generateHTMLContent(codes) {
    let cont = store.contacts[0];

    return `
    <!DOCTYPE html>
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
      <body>
      <div style="text-align:right ; "><b>${moment(new Date()).format(
        "DD/MM/YYYY"
      )}</b></div>
        <div>
        
        
            <div
              style="
                width: 100%;
                border: 1px solid #7777;
                padding: 10px;
                color: #444;
                justify-content: space-between;
              "
            >
            
            <div>
            <strong>${store.name_fr} </strong>
            <div>Adresse : ${cont.address}</div>
            <div>MF: ${store.taxCode}</div>
          </div>
         ${cont.phones
           .replaceAll("+216", "")
           .replaceAll(",", " / ")}              
             
             
           
           
            </div>
           
        
       
 
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Désignation</th>
              <th>Contacts</th>
              <th>Client</th>
              <th>Prix</th>
              <th>Adresse</th>
              <th style="text-transform:capitalize">état</th>
            </tr>
          </thead>
          <tbody>
            ${data
              .filter((el) => checkeds.find((el1) => el1 == el.id))
              .map(
                (el, i) => `<tr>
            <td>${codes[i]}</td>
            <td style="white-space: pre-line; font-size:0.9em">${el.coliItems.reduce(
              (a, b) => a + b.designation + " \n ",
              ""
            )}</td>
            <td style="white-space: pre-line; font-size:0.9em">${
              el.customer.phoneNumber +
              (el.customer.phoneNumber2 ? " / " + el.customer.phoneNumber2 : "")
            }</td>

            <td style="white-space: pre-line; font-size:0.9em">${
              el.customer.fullName
            }</td>
            <td>${el.coliItems
              .reduce((a, b) => a + b.qty * b.unitPrice, 0)
              .toFixed(3)}</td>
            <td style="white-space: pre-line; font-size:0.8em" >${
              el.customer.city +
              (el.customer.deleg ? " - " + el.customer.deleg : "") +
              (el.customer.ville ? " - " + el.customer.ville : "") +
              (el.customer.zipCode ? " - " + el.customer.zipCode : "")
            }
            <i >${el.customer.address}</i>
            </td>
            <td>${
              DeliveryStatus.find((el1) => el1.value == el.status).label
            }</td>
          </tr>`
              )
              .join("")}
          </tbody>
        </table>
       <div style="padding:10px; display:flex; justify-content:space-between; align-item:center ">
       <div><strong>Total : </strong> <b style="color:#008f96">${data
         .filter((el) => checkeds.find((el1) => el1 == el.id))

         .reduce(
           (a, b) =>
             a + b.coliItems.reduce((a1, b1) => a1 + b1.qty * b1.unitPrice, 0),
           0
         )
         .toFixed(3)}</b> TND
         <div>Nombre Colis: ${
           data.filter((el) => checkeds.find((el1) => el1 == el.id)).length
         }</div>
         </div>
         <div><h6>Chaffeur: ${driver.firstName + " " + driver.lastName} </h6>
         <h6>Matricule Voiture : ${driver.carNumber} </h6></div>
        </div>
        </body></html>
    
    `;
  }
  return (
    <div>
      <div style={{ overflow: "hidden", height: 0 }}>
        <iframe ref={frameRef} title="printFrame" width="100%"></iframe>
        <div id="custom-codes">
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
                <QRCode size={60} value={el.qrCodeContent} />
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
      </Filter>
      <br></br>
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
          onClick={() => {
            handlePrint();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 9px",
            background: "#a90e43",
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
      </div>
      <Grid columns={columns} rows={data} />
      <div style={{ padding: 20, background: "#fff" }}>
        <Pagination
          ellipsis
          boundaryLinks
          maxButtons={5}
          size="md"
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
