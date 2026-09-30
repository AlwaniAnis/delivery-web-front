import React, { useEffect, useState } from "react";
import { GoPackageDependents } from "react-icons/go";
import {
  LuPackage,
  LuPackageCheck,
  LuPackageMinus,
  LuPackageOpen,
  LuPackageX,
} from "react-icons/lu";
import ImageIcon from "@rsuite/icons/Image";

import { MdOutlinePhonelinkErase, MdOutlineRecycling } from "react-icons/md";
import { APi } from "../../Api";
import { ENDPOINTS } from "../../Api/enpoints";
import Responsive from "../../Components/Responsive";
import ResumeCard from "../../Components/ResumeCard";
import { DeliveryStatus } from "../../Constants/types";
import format_number from "../../Helpers/number_formatter";
import Stats, { Stats2, Stats3 } from "./components";

import { FaMapMarker, FaPhoneAlt, FaPhoneSlash } from "react-icons/fa";
import { useRecoilValue } from "recoil";
import { MyStore } from "../../Atoms/store.atom";
import { StoresList } from "../../Atoms/stores.atom";
import { Button, Modal, SelectPicker, Tag } from "rsuite";
import useB2B from "../../hooks/useB2B";
import Grid from "../../Components/Grid";

function Home() {
  const storesList = useRecoilValue(StoresList);
  const { isB2B } = useB2B();

  const [filterModel, setfilterModel] = useState({
    storeId: 0,
    page: 1,
  });
  const [stats, setstats] = useState({});
  const [data, setdata] = useState([]);
  const [show, setshow] = useState(false);

  const store = useRecoilValue(MyStore);
  const fetchStats = () => {
    APi.createAPIEndpoint(ENDPOINTS.Statistics, {
      storeId: store.isDefault ? filterModel.storeId : store.id,
    })
      .fetchAll()
      .then((res) => setstats(res.data));
  };
  useEffect(() => {
    if (store.id) fetchStats();
  }, [store.id]);
  useEffect(() => {
    if (store.id) fetchStats();
  }, [filterModel.storeId]);
  const columns = [
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
  ];
  const fetch = (status) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, {
      ...filterModel,
      storeId: !store.isDefault ? store.id : filterModel.storeId,
      page: 1,
      take: 10000,
      status,
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
      })
      .catch((e) => console.log(e.Message));
  };
  return (
    <div>
      {show && data ? (
        <Modal
          size="lg"
          overflow={false}
          style={{ maxHeight: "calc(100vh - 50px)", overflow: "auto" }}
          open={show}
          onClose={() => {
            setshow(false);
          }}
        >
          <Modal.Header>
            <Modal.Title>Liste des livraisons:</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Grid rows={data} columns={columns}></Grid>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => {
                setshow(false);
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
      {!isB2B && (
        <div>
          {" "}
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
        </div>
      )}
      <Responsive l={6} xl={6} className="p-10">
        <Stats
          amount={format_number(stats.totalAmount)}
          title="Montant Total"
          // increase={0.18}
        />
      </Responsive>
      <Responsive l={6} xl={6} className="p-10">
        {stats.status && (
          <Stats2
            amount1={stats.status.reduce((a, b) => a + b.count, 0)}
            amount2={
              stats.status.find((a) => a.key == 5)
                ? stats.status.find((a) => a.key == 5).count
                : 0
            }
            ration={(
              (stats.status.find((a) => a.key == 5)
                ? 100 * stats.status.find((a) => a.key == 5).count
                : 0) / stats.status.reduce((a, b) => a + b.count, 0)
            ).toFixed(2)}
            title="Rapport Livré-Total"
            color="rgb(84,177,7)"
          />
        )}
      </Responsive>
      <div>
        {" "}
        {stats.status
          ? stats.status.map((el) => {
              return (
                <Responsive className="p-10" xs={6} s={4} m={4} l={4} xl={4}>
                  <ResumeCard
                    action={() => {
                      fetch(el.key);
                      setshow(true);
                    }}
                    icon={
                      [
                        <LuPackageOpen />,
                        <LuPackage />,
                        <GoPackageDependents />,

                        <LuPackageMinus />,
                        <LuPackageCheck />,
                        <FaPhoneSlash />,
                        <LuPackageX />,
                        <MdOutlinePhonelinkErase />,
                        <MdOutlineRecycling />,
                      ][el.key - 1]
                    }
                    notAmount
                    text={
                      DeliveryStatus.find((el1) => el1.value == el.key)
                        ? DeliveryStatus.find((el1) => el1.value == el.key)
                            .label
                        : ""
                    }
                    color={
                      [
                        "245,195,35",
                        "70,103,209",
                        "102,51,153",
                        "70,103,209",
                        "84,159,10",
                        "169,14,67",
                        "246,137,51",
                      ][el.key - 1]
                    }
                    amount={el.count}
                  />
                </Responsive>
              );
            })
          : ""}
      </div>

      {/* <Responsive l={5} xl={5} className="p-10">
        <Stats3
          colors={
            stats.status
              ? stats.status.map(
                  (el) =>
                    [
                      "rgb(245,195,35)",
                      "rgb(70,103,209)",
                      "rgb(102,51,153)",
                      "rgb(70,103,209)",
                      "rgb(84,159,10)",
                      "rgb(169,14,67)",
                      "rgb(246,137,51)",
                    ][el.key - 1]
                )
              : []
          }
          labels={
            stats.status
              ? stats.status.map(
                  (el) =>
                    DeliveryStatus.find((el1) => el1.value == el.key).label
                )
              : []
          }
          data={
            stats.status
              ? stats.status.map((el) => ({
                  angle:
                    (360 * el.count) /
                    stats.status.reduce((a, b) => a + b.count, 0),
                }))
              : []
          }
        />
      </Responsive> */}
      <Responsive className="p-10" style={{ background: "#fff" }}>
        {stats.city
          ? stats.city
              .sort((a, b) => b.count - a.count)
              .map((el) => (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px",
                    border: "1px solid #eee",
                  }}
                >
                  <strong
                    style={{
                      width: "120px",
                      display: "inline-block",
                    }}
                  >
                    {el.label}
                  </strong>{" "}
                  <strong>{el.count}</strong>{" "}
                  <strong>
                    {(
                      (el.count / stats.city.reduce((a, b) => a + b.count, 0)) *
                      100
                    ).toFixed(1)}
                    %
                  </strong>
                </div>
              ))
          : ""}
      </Responsive>
    </div>
  );
}

export default Home;
