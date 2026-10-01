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
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
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
      value: "coliItems",
      name: "Montant à Recouvrer",
      render: (coliItems) => {
        const total = (coliItems || []).reduce(
          (a, b) => a + (Number(b.qty) || 1) * (Number(b.unitPrice) || 0),
          0
        );
        return (
          <div style={{ display: "inline-flex", alignItems: "baseline", gap: "4px" }}>
            <span style={{ fontWeight: 800, color: "#b91c1c", fontSize: "0.95rem" }}>
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
      name: "Livreur Assigné",
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
        <Responsive l={3} xl={3} m={4} className="p-5">
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
