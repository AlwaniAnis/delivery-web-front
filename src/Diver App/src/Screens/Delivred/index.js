import React, { useEffect, useRef, useState } from "react";
import { FaMapMarker } from "react-icons/fa";
import { DateRangePicker, Input, SelectPicker, Tag } from "rsuite";

import moment from "moment";
import Pagination from "rsuite/Pagination";
import { APi } from "../../Api";
import { ENDPOINTS } from "../../Api/enpoints";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import Responsive from "../../Components/Responsive";
import ResumeCard from "../../Components/ResumeCard";
import { dateTypes } from "../../Constants/types";
export default function Delivred(props) {
  const frameRef = useRef(null);

  // STATE
  const [data, setdata] = useState([]);
  const [totalCount, settotalCount] = useState(0);
  const [filterModel, setfilterModel] = useState({
    q: "",
    page: 1,
    take: 100,
    // date: moment(new Date()).format("yyyy-MM-DD"),
    // dateType: 7,
  });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [driverId, setdriverId] = useState(0);

  // ATOMS
  // ATOMS
  // HELPERS

  const fetch = () => {
    if (driverId) {
      APi.createAPIEndpoint(
        APi.ENDPOINTS.Delivery + "/getForDriverForPayment",
        {
          ...filterModel,
          driverId,
        }
      )
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
    }
  }, []);

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

      name: "Addresse",
      render: (v) => (
        <div style={{ maxWidth: "150px" }}>
          <b
            st
            style={{
              textDecoration: "none",
              color: "#2f1a4c",
              wordWrap: "break-word",
              margin: "0 2px",
              borderRadius: "5px",
            }}
          >
            <FaMapMarker />{" "}
            {v.city +
              (v.deleg ? " - " + v.deleg : "") +
              (v.ville ? " - " + v.ville : "") +
              (v.zipCode ? " - " + v.zipCode : "")}
          </b>
          <address>{v.address}</address>
        </div>
      ),
    },

    {
      value: "coliItems",
      name: "Désignation",
      render: (coliItems) => (
        <div>{coliItems.reduce((a, b) => a + b.designation + " \n ", "")}</div>
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
  ];
  useEffect(() => fetch(), [driverId]);

  return (
    <div>
      <Filter search={() => fetch()}>
        <Responsive l={4} xl={4} m={4} className="p-5">
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
        <Responsive m={6} l={4} xl={4} className="p-5">
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
          <Responsive m={6} l={4} xl={4} className="p-5">
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
          <Responsive m={6} l={4} xl={4} className="p-5">
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
      </Filter>
      <br></br>
      <ResumeCard
        amount={
          data && data.length
            ? data.reduce(
                (a, b) =>
                  a +
                  b.coliItems.reduce((a1, b1) => a1 + b1.qty * b1.unitPrice, 0),
                0
              )
            : 0
        }
        text="Montant Total"
        // increase={0.18}
      />
      <br></br>

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
    </div>
  );
}
