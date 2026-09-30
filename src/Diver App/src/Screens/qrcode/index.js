// versi "react-qr-reader" 1.0.0. component API harus disesuaikan dengan yg baru

import "./styles.css";
import { useState } from "react";
import QrReader from "react-qr-reader";
import { Button, Modal, SelectPicker } from "rsuite";
import { APi } from "../../Api";
import { FaMapMarker, FaPhoneAlt } from "react-icons/fa";
import { DeliveryStatus } from "../../Constants/types";
import Swal from "sweetalert2";

const QRScanner = () => {
  const [selected, setSelected] = useState("environment");
  const [startScan, setStartScan] = useState(false);
  const [loadingScan, setLoadingScan] = useState(false);
  const [error, seterror] = useState("");
  const [loadingChange, setloadingChange] = useState(false);
  const [data, setData] = useState("");
  const [delivery, setDelivery] = useState(null);

  const handleScan = async (scanData) => {
    setLoadingScan(true);
    console.log(`loaded data data`, scanData);
    if (scanData && scanData !== "") {
      console.log(`loaded >>>`, scanData);

      setData(scanData);
      function isNumber(value) {
        return /^\d+\.\d+$/.test(value);
      }

      if (scanData) {
        APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/getByCode/" + scanData)
          .customGet()
          .then((res) => {
            setDelivery(res.data);
            setStartScan(false);
            setLoadingScan(false);
          })
          .catch((error) => {
            console.log(error);
          });
      }
      // setPrecScan(scanData);
    }
  };
  const handleError = (err) => {
    alert(err);
    // setDelivery(null);
  };
  return (
    <>
      <div style={{ textAlign: "center", padding: "10%" }}>
        <h1>Scanner QrCode</h1>

        <Button
          appearance="primary"
          onClick={() => {
            setStartScan(!startScan);
          }}
          color={startScan ? "orange" : "green"}
        >
          {startScan ? "Stop" : "Commencer"}
        </Button>
        {startScan && (
          <div
            style={{
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            {/* <select onChange={(e) => setSelected(e.target.value)}>
            <option value={"environment"}>Back Camera</option>
            <option value={"user"}>Front Camera</option>
          </select> */}
            <QrReader
              showViewFinder={true}
              facingMode={selected}
              delay={250}
              onError={handleError}
              onScan={handleScan}
              // chooseDeviceId={()=>selected}
              style={{ width: "300px" }}
            />
          </div>
        )}
        {loadingScan && (
          <p
            style={{
              textAlign: "center",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <img alt="...Loading" src="/svg-loaders/oval.svg" />
          </p>
        )}
        {data !== "" && <p>{data}</p>}
      </div>
      <Modal open={delivery != null} onClose={() => setDelivery(null)}>
        <Modal.Header></Modal.Header>
        <Modal.Body>
          <h6>code : {data}</h6>
          {delivery && (
            <div
              style={{
                padding: "8px",
                margin: "8px",
                borderRadius: "10px",

                border: "1px solid #2f1a4c",
              }}
            >
              <b style={{ display: "block", alignItems: "center" }}>
                <div style={{ padding: "10px 5px" }}>
                  {delivery.customer && delivery.customer.fullName}
                </div>
                <div>
                  {delivery.exchangeable && (
                    <Tag size="sm" color="yellow">
                      <b style={{ color: "#222", fontWeight: "400" }}>
                        {" "}
                        echangeable
                      </b>
                    </Tag>
                  )}
                </div>
              </b>
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
                  href={`tel:${delivery.customer.phoneNumber}`}
                >
                  <FaPhoneAlt /> {delivery.customer.phoneNumber}{" "}
                </a>

                {delivery.customer.phoneNumber2 ? (
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
                    href={`tel:${delivery.customer.phoneNumber2}`}
                  >
                    <FaPhoneAlt /> {delivery.customer.phoneNumber2}{" "}
                  </a>
                ) : (
                  ""
                )}
              </div>
              <b
                style={{
                  textDecoration: "none",
                  color: "#2f1a4c",
                  margin: "13px 0px",
                  borderRadius: "5px",
                }}
              >
                <FaMapMarker />{" "}
                {delivery.customer.city +
                  (delivery.customer.deleg
                    ? " - " + delivery.customer.deleg
                    : "") +
                  (delivery.customer.ville
                    ? " - " + delivery.customer.ville
                    : "") +
                  (delivery.customer.zipCode
                    ? " - " + delivery.customer.zipCode
                    : "")}
              </b>
              <address>{delivery.customer.address}</address>
              <div
                style={{
                  background: "#2f1a4c",
                  padding: "5px",
                  color: "#fff",
                  borderRadius: "8px",
                }}
              >
                <div>
                  {delivery.coliItems.reduce(
                    (a, b) => a + b.designation + " \n ",
                    ""
                  )}
                </div>
                <strong>
                  Montant :{" "}
                  {delivery.coliItems
                    .reduce((a, b) => a + b.qty * b.unitPrice, 0)
                    .toFixed(3)}{" "}
                  TND
                </strong>
              </div>
              <label>Changer l'état: </label>
              <SelectPicker
                searchable={false}
                data={[{ label: "Tout", value: 0 }].concat(DeliveryStatus)}
                block
                noSearch
                value={delivery.status}
                onSelect={(status) =>
                  setDelivery((prev) => ({ ...prev, status }))
                }
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            loading={loadingChange}
            color="blue"
            appearance="primary"
            onClick={() => {
              setloadingChange(true);
              APi.createAPIEndpoint(
                APi.ENDPOINTS.Delivery +
                  "/changeStatus/" +
                  delivery.id +
                  "/" +
                  delivery.status
              )
                .update2({})
                .then((res) => {
                  setloadingChange(false);
                  setDelivery(null);
                  Swal.fire({
                    position: "top-end",
                    icon: "success",
                    title: "Élément a été bien modifié !",
                    showConfirmButton: false,
                    timer: 1500,
                  });
                  seterror("");
                })
                .catch((error) => {
                  seterror("error");
                  setloadingChange(false);
                });
            }}
          >
            enregistrer
          </Button>{" "}
          <Button
            onClick={() => {
              setDelivery(null);
              seterror("");
            }}
          >
            fermer
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default QRScanner;
