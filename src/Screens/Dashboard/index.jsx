import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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

import {
  FaMapMarker,
  FaPhoneAlt,
  FaPhoneSlash,
  FaRoute,
  FaTruck,
  FaBox,
  FaStore,
  FaWarehouse,
  FaUsers,
  FaUserShield,
  FaMoneyBillWave,
} from "react-icons/fa";
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
      storeId: isB2B ? store.id || 1 : filterModel.storeId,
    })
      .fetchAll()
      .then((res) => setstats(res.data))
      .catch(() => {});
  };
  useEffect(() => {
    fetchStats();
  }, [store.id, isB2B, filterModel.storeId]);
  const columns = [
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
  ];
  const fetch = (status) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, {
      ...filterModel,
      storeId: isB2B ? store.id || 1 : filterModel.storeId,
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
        <div style={{ maxWidth: "320px", marginBottom: "16px" }}>
          <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", marginBottom: "4px", display: "block" }}>
            Boutique
          </label>
          <SelectPicker
            data={[{ label: "Toutes les boutiques (Global)", value: 0 }].concat(
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
      <div style={{ marginTop: "20px", padding: "0 10px" }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "20px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "16px",
            }}
          >
            Répartition Géographique par Gouvernorat / Ville
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
            {stats.city
              ? stats.city
                  .sort((a, b) => b.count - a.count)
                  .map((el, idx) => {
                    const totalCities = stats.city.reduce((a, b) => a + b.count, 0) || 1;
                    const pct = ((el.count / totalCities) * 100).toFixed(1);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          padding: "12px 14px",
                          border: "1px solid #f1f5f9",
                          borderRadius: "10px",
                          background: "#f8fafc",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>{el.label || "Autre"}</strong>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "monospace", color: "#4f46e5" }}>
                            {el.count} colis ({pct}%)
                          </span>
                        </div>
                        <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden" }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "#4f46e5", borderRadius: "999px" }} />
                        </div>
                      </div>
                    );
                  })
              : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
