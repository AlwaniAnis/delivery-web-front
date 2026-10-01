import ImageIcon from "@rsuite/icons/Image";
import React, { useEffect, useRef, useState } from "react";
import { FaMapMarker, FaPhoneAlt, FaWarehouse } from "react-icons/fa";
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
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDriverIdState } from "../../Atoms/auth.atom";
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
  const activeRole = useRecoilValue(activeRoleState);
  const currentDriverId = useRecoilValue(currentDriverIdState);
  const depotsList = useRecoilValue(preparationPlacesState);

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
    const isDriver = activeRole === "driver";
    const driverIdParam = currentDriverId || (localStorage.getItem("auth") ? JSON.parse(localStorage.getItem("auth"))?.driverId : 1003);
    const endpoint = isDriver ? APi.ENDPOINTS.Delivery + "/getForDriver" : APi.ENDPOINTS.Delivery;
    const fetchParams = {
      ...filterModel,
      storeId: !store.isDefault ? store.id : filterModel.storeId,
    };
    if (isDriver) {
      fetchParams.driverId = driverIdParam;
    }
    APi.createAPIEndpoint(endpoint, fetchParams)
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
        <Checkbox
          onChange={(v) => {
            if (checkeds.find((el) => el == id))
              setcheckeds((prev) => prev.filter((l) => l != id));
            else setcheckeds((prev) => [...prev, id]);
          }}
          checked={checkeds.find((el) => el == id) != null}
        />
      ),
    },
    {
      value: "customer",
      value2: "exchangeable",
      value3: "qrCodeContent",
      name: "Client & Colis",
      render: (v, v2, v3) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
            {v?.fullName || "Client sans nom"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.74rem",
                color: "#475569",
                background: "#f1f5f9",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: 600,
                border: "1px solid #e2e8f0",
              }}
            >
              {v3 || "—"}
            </span>
            {v2 && (
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  color: "#92400e",
                  background: "#fef3c7",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #fde68a",
                }}
              >
                Échange
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "customer",
      name: "Contacts",
      render: (v) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {v?.phoneNumber ? (
            <a
              style={{
                textDecoration: "none",
                color: "#2563eb",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                width: "fit-content",
              }}
              href={`tel:${v.phoneNumber}`}
              onClick={(e) => e.stopPropagation()}
            >
              <FaPhoneAlt size={10} /> {v.phoneNumber}
            </a>
          ) : (
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
          )}

          {v?.phoneNumber2 && (
            <a
              style={{
                textDecoration: "none",
                color: "#475569",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: "2px 6px",
                borderRadius: "5px",
                fontSize: "0.75rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                width: "fit-content",
              }}
              href={`tel:${v.phoneNumber2}`}
              onClick={(e) => e.stopPropagation()}
            >
              <FaPhoneAlt size={9} /> {v.phoneNumber2}
            </a>
          )}
        </div>
      ),
    },
    {
      value: "customer",
      name: "Destination",
      render: (v) => (
        <div style={{ maxWidth: "220px", minWidth: "150px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              color: "#1e293b",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            <FaMapMarker style={{ color: "#ef4444", fontSize: "11px", flexShrink: 0 }} />
            <span>
              {v?.city || ""}{v?.deleg ? ` - ${v.deleg}` : ""}{v?.ville ? ` - ${v.ville}` : ""}{v?.zipCode ? ` (${v.zipCode})` : ""}
            </span>
          </div>
          {v?.address && (
            <div
              style={{
                color: "#64748b",
                fontSize: "0.75rem",
                marginTop: "3px",
                lineHeight: "1.3",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {v.address}
            </div>
          )}
        </div>
      ),
    },
    {
      value: "status",
      name: "Statut",
      render: (v) => {
        const found = DeliveryStatus.find((el) => el.value == v);
        const label = found ? found.label : (v ? `État #${v}` : "Inconnu");
        let bg = "#f1f5f9";
        let color = "#475569";
        let dot = "#94a3b8";

        if (v == 5) {
          bg = "#dcfce7";
          color = "#15803d";
          dot = "#22c55e";
        } else if (v == 4) {
          bg = "#e0e7ff";
          color = "#4338ca";
          dot = "#6366f1";
        } else if (v == 1 || v == 2 || v == 3) {
          bg = "#e0f2fe";
          color = "#0369a1";
          dot = "#0ea5e9";
        } else if (v == 6 || v == 7) {
          bg = "#fee2e2";
          color = "#b91c1c";
          dot = "#ef4444";
        }

        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 10px",
              borderRadius: "6px",
              fontSize: "0.78rem",
              fontWeight: 700,
              background: bg,
              color: color,
              border: `1px solid ${dot}33`,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: dot,
              }}
            />
            {label}
          </span>
        );
      },
    },
    {
      value: "coliItems",
      name: "Articles",
      render: (coliItems) => {
        const items = coliItems || [];
        return (
          <div style={{ maxWidth: "200px", minWidth: "120px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
              <span
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "4px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {items.length} {items.length > 1 ? "articles" : "article"}
              </span>
            </div>
            <div style={{ fontSize: "0.78rem", color: "#475569", lineHeight: "1.3" }}>
              {items.slice(0, 2).map((it, idx) => (
                <div key={idx} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  • {it.qty}x {it.designation}
                </div>
              ))}
              {items.length > 2 && (
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                  +{items.length - 2} de plus...
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      value: "isPaid",
      name: "Paiement",
      render: (isPaid) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "0.76rem",
            fontWeight: 700,
            background: isPaid ? "#dcfce7" : "#fee2e2",
            color: isPaid ? "#15803d" : "#b91c1c",
            border: isPaid ? "1px solid #bbf7d0" : "1px solid #fecaca",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: isPaid ? "#22c55e" : "#ef4444",
            }}
          />
          {isPaid ? "Payé" : "Non payé"}
        </span>
      ),
    },
    {
      value: "coliItems",
      name: "Montant",
      render: (coliItems) => {
        const total = (coliItems || []).reduce(
          (a, b) => a + (Number(b.qty) || 1) * (Number(b.unitPrice) || 0),
          0
        );
        return (
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
              {total.toFixed(3)}
            </span>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>
              TND
            </span>
          </div>
        );
      },
    },
    {
      value: "driver",
      name: "Livreur",
      render: (v) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              textAlign: "center",
              lineHeight: "32px",
              background: v ? "#eff6ff" : "#f1f5f9",
              color: v ? "#2563eb" : "#94a3b8",
              border: v ? "1px solid #bfdbfe" : "1px solid #e2e8f0",
              flexShrink: 0,
            }}
          >
            {v ? `${(v.firstName?.[0] || "").toUpperCase()}${(v.lastName?.[0] || "").toUpperCase()}` : "—"}
          </div>

          <div>
            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.82rem" }}>
              {v ? `${v.firstName || ""} ${v.lastName || ""}` : "Non assigné"}
            </div>
            {v?.carNumber && (
              <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{v.carNumber}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "preparationPlaceId",
      name: "Dépôt / Stock",
      render: (val, row) => {
        const placeId = val || row?.preparationPlaceId || row?.preparationPlace?.id;
        const depot = depotsList.find((d) => d.id === placeId);
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: depot ? "#f0fdf4" : "#f8fafc",
                color: depot ? "#166534" : "#64748b",
                border: depot ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              <FaWarehouse size={11} style={{ color: depot ? "#16a34a" : "#94a3b8" }} />
              {depot ? depot.name : "Dépôt Central Tunis"}
            </span>
          </div>
        );
      },
    },
    {
      value: "id",
      name: "Bordereau",
      render: (id) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            let m = data.find((el) => el.id == id);
            if (m) {
              setcode(m.qrCodeContent);
              handlePrint(id);
            }
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "#4f46e5",
            color: "#ffffff",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "0.78rem",
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 1px 3px rgba(79, 70, 229, 0.25)",
          }}
          title="Imprimer bordereau de livraison"
        >
          <ImPrinter size={12} />
          <span>Imprimer</span>
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
    fetch();
  }, [store.id, activeRole, currentDriverId, filterModel.page, filterModel.take]);
  return (
    <div>
      {" "}
      <div style={{ overflow: "hidden", height: 0 }}>
        <iframe ref={frameRef} title="printFrame" width="100%"></iframe>
        <div id="custom-codes">
          {code ? <Barcode height={70} value={code} /> : null}
          <br />
          {code ? <QRCode value={code} size={80} /> : null}
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
                {el.qrCodeContent ? <Barcode height={70} value={el.qrCodeContent} /> : null}
                <br />
                {el.qrCodeContent ? <QRCode value={el.qrCodeContent} size={80} /> : null}
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
            searchable={false}
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
            searchable={false}
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
            searchable={false}
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
            data={DeliveryStatus}
            block
            searchable={false}
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
              searchable={false}
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
              searchable={false}
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
