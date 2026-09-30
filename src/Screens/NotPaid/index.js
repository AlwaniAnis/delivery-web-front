import ImageIcon from "@rsuite/icons/Image";
import React, { useEffect, useState } from "react";
import { FaPhoneAlt } from "react-icons/fa";
import { useRecoilState, useRecoilValue } from "recoil";
import { Checkbox, DateRangePicker, Input, SelectPicker, Tag } from "rsuite";
import Pagination from "rsuite/Pagination";

import { APi } from "../../Api";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";

import moment from "moment";
import { BiMoney } from "react-icons/bi";
import { ENDPOINTS } from "../../Api/enpoints";
import { DriversList } from "../../Atoms/drivers.atom";
import Responsive from "../../Components/Responsive";
import ResumeCard from "../../Components/ResumeCard";
import { dateTypes } from "../../Constants/types";
import { MyStore } from "../../Atoms/store.atom";
import { StoresList } from "../../Atoms/stores.atom";
import useB2B from "../../hooks/useB2B";
export default function NotPaidDeliveries(props) {
  // STATE
  const [data, setdata] = useState([]);
  const store = useRecoilValue(MyStore);

  const [totalCount, settotalCount] = useState(0);
  const [totalOrdered, settotalOrdered] = useState(0);
  const [totalPaid, settotalPaid] = useState(0);
  const [totalDelivred, settotalDelivred] = useState(0);
  const storesList = useRecoilValue(StoresList);

  const [filterModel, setfilterModel] = useState({
    q: "",
    page: 1,
    take: 20,
    status: 5,
    isPaid: false,
    storeId: 0,
  });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [drivers, setDriversList] = useRecoilState(DriversList);
  const [checkeds, setcheckeds] = useState([]);
  const { isB2B } = useB2B();

  // ATOMS
  // HELPERS

  const fetch = () => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, {
      ...filterModel,
      storeId: !store.isDefault ? store.id : filterModel.storeId,
    })
      .fetchAll()
      .then((res) => {
        setdata(res.data.data);
        settotalCount(res.data.totalCount);
        settotalOrdered(res.data.totalOrdered);
        settotalPaid(res.data.totalPaid);
        settotalDelivred(res.data.totalDelivred);
      })
      .catch((e) => setError(e.Message));
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

  useEffect(() => {
    if (store.id) {
      fetch();
    }
  }, [store.id, filterModel.page, filterModel.take]);
  return (
    <div>
      <Filter search={() => fetch()}>
        <Responsive l={3} xl={3} m={4} className="p-5">
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
        <Responsive l={3} xl={3} m={4} className="p-5">
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
      <div className="p-10">
        <ResumeCard
          text="Total Livré Non Payé"
          color={
            //"245,195,35"
            "70,103,209"
            // "102,51,153",
            // "70,103,209",
            // "84,159,10",
            // "169,14,67",
            // "246,137,51",
          }
          amount={totalDelivred - totalPaid}
        />
      </div>
      {!isB2B && (
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            onClick={(e) =>
              setcheckeds((prev) =>
                prev.length ? [] : data.map((el) => el.id)
              )
            }
            style={{
              display: "inline-block",
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            <Checkbox checked={checkeds.length > 0}></Checkbox> Sélectionner
            Tout
          </div>

          <button
            onClick={() => {
              console.log(checkeds);
              APi.createAPIEndpoint(ENDPOINTS.Delivery + "/renderPaid")
                .create({
                  driverId: 0, // not  mandatory
                  deliveries: checkeds,
                })
                .then((res) => {
                  fetch();
                  alert("success");
                });
            }}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "6px",
              background: "rgb(242,190,0)",
              width: "120px",
              justifyContent: "space-between",
              color: "#fff",
              borderRadius: "4px",
              fontWeight: "bold",
              cursor: "pointer",
              margin: "4px",
            }}
          >
            rendre payés <BiMoney />
          </button>
        </div>
      )}

      <Grid columns={columns} rows={data} />
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
    </div>
  );
}
