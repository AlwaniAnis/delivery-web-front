import React, { useEffect, useState } from "react";
import { FaMapMarkerAlt, FaPhoneAlt, FaMoneyBillWave, FaCalendarAlt, FaSearch } from "react-icons/fa";
import { DateRangePicker, Input, SelectPicker, Tag, Pagination } from "rsuite";
import moment from "moment";
import { APi } from "../../Api";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import Responsive from "../../Components/Responsive";
import { dateTypes } from "../../Constants/types";

export default function Delivred() {
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [driverId, setDriverId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("auth") || "{}")?.driverId || null;
    } catch (e) {
      return null;
    }
  });
  const [filterModel, setFilterModel] = useState({
    q: "",
    page: 1,
    take: 50,
  });

  useEffect(() => {
    const rawAuth = localStorage.getItem("auth");
    if (rawAuth) {
      try {
        const parsed = JSON.parse(rawAuth);
        if (parsed.driverId) {
          setDriverId(parsed.driverId);
        }
      } catch (e) {}
    }
  }, []);

  const fetchData = () => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery + "/getForDriverForPayment", {
      ...filterModel,
      driverId,
    })
      .fetchAll()
      .then((res) => {
        setData(res.data.data || []);
        setTotalCount(res.data.totalCount || res.data.data?.length || 0);
      })
      .catch((err) => {
        console.warn("Error fetching delivered:", err);
      });
  };

  useEffect(() => {
    fetchData();
  }, [driverId, filterModel.page, filterModel.take]);

  const totalAmount = data.reduce((sum, item) => {
    const itemsTotal = item.coliItems?.reduce((s, c) => s + c.qty * c.unitPrice, 0) || item.totalPrice || 0;
    return sum + itemsTotal;
  }, 0);

  const columns = [
    {
      value: "customer",
      value2: "exchangeable",
      value3: "qrCodeContent",
      name: "Client & Bordereau",
      render: (customer, exchangeable, qrCode) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
            {customer?.fullName || "Client"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
            <span style={{ fontFamily: "monospace", color: "#4f46e5", fontSize: "0.8rem", fontWeight: 600 }}>
              {qrCode}
            </span>
            {exchangeable && (
              <Tag size="sm" color="orange">
                Échange
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "customer",
      name: "Contact & Destination",
      render: (customer) => (
        <div style={{ maxWidth: "240px" }}>
          {customer?.phoneNumber && (
            <a
              href={`tel:${customer.phoneNumber}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: "#10b981",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                marginBottom: "3px",
              }}
            >
              <FaPhoneAlt size={11} /> {customer.phoneNumber}
            </a>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "4px", color: "#64748b", fontSize: "0.8rem" }}>
            <FaMapMarkerAlt style={{ color: "#ef4444", marginTop: "3px", flexShrink: 0 }} size={12} />
            <span>
              {customer?.city} {customer?.deleg ? `· ${customer.deleg}` : ""} {customer?.address ? `· ${customer.address}` : ""}
            </span>
          </div>
        </div>
      ),
    },
    {
      value: "coliItems",
      name: "Articles du Colis",
      render: (items) => (
        <div style={{ fontSize: "0.85rem", color: "#334155" }}>
          {items?.map((it, idx) => (
            <div key={idx}>
              {it.qty}x {it.designation}
            </div>
          ))}
        </div>
      ),
    },
    {
      value: "coliItems",
      value2: "totalPrice",
      name: "Montant Encaissé",
      render: (items, totalPrice) => {
        const amt = items?.reduce((s, it) => s + it.qty * it.unitPrice, 0) || totalPrice || 0;
        return (
          <div style={{ textAlign: "right", paddingRight: "10px" }}>
            <span style={{ fontWeight: 800, color: "#0f172a", fontFamily: "monospace", fontSize: "1rem" }}>
              {amt.toFixed(3)}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "4px" }}>TND</span>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Banner / Summary Card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #065f46 0%, #047857 100%)",
            color: "#fff",
            borderRadius: "16px",
            padding: "20px",
            boxShadow: "0 4px 15px rgba(4, 120, 87, 0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#a7f3d0", fontWeight: 600 }}>
                Total Cash En Main à Reverser
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "6px", fontFamily: "monospace" }}>
                {totalAmount.toFixed(3)} <span style={{ fontSize: "1rem", fontWeight: 500 }}>TND</span>
              </div>
            </div>
            <div
              style={{
                width: "48px",
                height: "48px",
                background: "rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              <FaMoneyBillWave />
            </div>
          </div>
          <div style={{ fontSize: "0.8rem", color: "#d1fae5", marginTop: "10px" }}>
            Montant total collecté auprès des clients pour les colis livrés
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "#64748b", fontWeight: 600 }}>
              Colis Livrés Non Clôturés
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "6px", color: "#0f172a", fontFamily: "monospace" }}>
              {data.length} <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 500 }}>colis</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "6px", fontWeight: 600 }}>
              ✓ Prêts pour le versement en caisse
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "16px",
          border: "1px solid #e2e8f0",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px" }}>
          <Input
            placeholder="Rechercher client, téléphone ou code..."
            value={filterModel.q}
            onChange={(q) => setFilterModel((prev) => ({ ...prev, q }))}
            onPressEnter={fetchData}
          />
        </div>
        <button
          onClick={fetchData}
          style={{
            background: "#4f46e5",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "8px 18px",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaSearch size={12} /> Filtrer
        </button>
      </div>

      {/* Grid */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <Grid columns={columns} rows={data} />
      </div>

      {/* Pagination */}
      <div style={{ padding: "16px", background: "#fff", marginTop: "12px", borderRadius: "8px" }}>
        <Pagination
          ellipsis
          boundaryLinks
          maxButtons={5}
          size="sm"
          total={totalCount}
          limit={filterModel.take}
          activePage={filterModel.page}
          onChangePage={(page) => setFilterModel((prev) => ({ ...prev, page }))}
        />
      </div>
    </div>
  );
}
