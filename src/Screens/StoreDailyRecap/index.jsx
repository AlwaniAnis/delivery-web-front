import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import {
  DateRangePicker,
  SelectPicker,
  Button,
  Modal,
  Tag,
  Loader,
  Input,
} from "rsuite";
import moment from "moment";
import "moment/locale/fr";
import {
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaCheckCircle,
  FaClock,
  FaStore,
  FaEye,
  FaPrint,
  FaBoxOpen,
  FaTruck,
  FaUser,
  FaPhoneAlt,
  FaSearch,
  FaExchangeAlt,
  FaArrowRight,
  FaTimes,
} from "react-icons/fa";
import { APi } from "../../Api";
import { MyStore } from "../../Atoms/store.atom";
import { StoresList } from "../../Atoms/stores.atom";
import { activeRoleState, currentUserState, normalizeRole } from "../../Atoms/auth.atom";
import useB2B from "../../hooks/useB2B";
import Swal from "sweetalert2";

moment.locale("fr");

export default function StoreDailyRecap() {
  const { isB2B } = useB2B();
  const currentStore = useRecoilValue(MyStore);
  const storesList = useRecoilValue(StoresList);
  const activeRole = useRecoilValue(activeRoleState);
  const currentUser = useRecoilValue(currentUserState);

  const isAdmin = !isB2B && normalizeRole(activeRole) === "admin";

  // Selected Store ID (0 = Toutes les boutiques in Administration module, or own storeId in Store module)
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    return isB2B ? currentStore?.id || currentUser?.storeId || 1 : 0;
  });

  // Date range (defaults to last 14 days up to today)
  const [dateRange, setDateRange] = useState([
    moment().subtract(13, "days").startOf("day").toDate(),
    moment().endOf("day").toDate(),
  ]);

  const [loading, setLoading] = useState(false);
  const [recapDays, setRecapDays] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Day details modal state
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDeliveries, setDayDeliveries] = useState([]);
  const [loadingDayDetails, setLoadingDayDetails] = useState(false);
  const [dayDetailsSearch, setDayDetailsSearch] = useState("");

  // Track which days have been marked as "Reçu" (amount picked up by the store from the depot)
  const [receivedDaysMap, setReceivedDaysMap] = useState(() => {
    try {
      const saved = localStorage.getItem("tawsil_store_recap_received");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const isDayReceived = (item) => {
    if (item?.isReceived || item?.IsReceived || item?.state === "received" || item?.status === 2) {
      return true;
    }
    const dayKey = `${selectedStoreId}_${moment(item?.day || item?.Day).format("YYYY-MM-DD")}`;
    return Boolean(receivedDaysMap[dayKey]);
  };

  const handleMarkDayReceived = (item, e) => {
    if (e) e.stopPropagation();
    const dayDate = item?.day || item?.Day;
    const dayStr = moment(dayDate).format("YYYY-MM-DD");
    const formattedDate = moment(dayDate).format("DD/MM/YYYY");
    const dayKey = `${selectedStoreId}_${dayStr}`;
    const amountVal = Number(item?.totalPaid ?? item?.TotalPaid ?? item?.totalAmount ?? item?.TotalAmount) || 0;

    APi.createAPIEndpoint(`${APi.ENDPOINTS.Store}/receiveRecapDay`)
      .customPost({
        storeId: selectedStoreId,
        date: dayStr,
        isReceived: true,
      })
      .catch(() => {});

    const nextMap = { ...receivedDaysMap, [dayKey]: new Date().toISOString() };
    setReceivedDaysMap(nextMap);
    try {
      localStorage.setItem("tawsil_store_recap_received", JSON.stringify(nextMap));
    } catch (err) {}

    setRecapDays((prev) =>
      prev.map((d) =>
        moment(d.day || d.Day).format("YYYY-MM-DD") === dayStr
          ? { ...d, isReceived: true, state: "received" }
          : d
      )
    );

    if (selectedDay && moment(selectedDay.day || selectedDay.Day).format("YYYY-MM-DD") === dayStr) {
      setSelectedDay((prev) => (prev ? { ...prev, isReceived: true, state: "received" } : prev));
    }

    Swal.fire({
      icon: "success",
      title: "Montant du Jour Reçu !",
      html: `La boutique a confirmé la réception du montant du <b>${formattedDate}</b> (<b>${amountVal.toFixed(3)} TND</b>) auprès du dépôt.`,
      timer: 2000,
      showConfirmButton: false,
    });
  };

  // Sync selectedStoreId when module or currentStore changes
  useEffect(() => {
    if (isB2B) {
      setSelectedStoreId(currentStore?.id || currentUser?.storeId || 1);
    } else {
      setSelectedStoreId(0);
    }
  }, [isB2B, currentStore?.id, currentUser?.storeId]);

  // Fetch recapByDay
  const fetchRecapByDay = () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;
    setLoading(true);

    const fromStr = moment(dateRange[0]).format("YYYY-MM-DD");
    const toStr = moment(dateRange[1]).format("YYYY-MM-DD");

    APi.createAPIEndpoint(`${APi.ENDPOINTS.Store}/recapByDay`, {
      storeId: selectedStoreId,
      dateFrom: fromStr,
      dateTo: toStr,
      date_from: fromStr,
      date_to: toStr,
    })
      .customGet()
      .then((res) => {
        setLoading(false);
        const rawData = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (rawData.length > 0) {
          const normalized = rawData.map((item) => {
            const total = Number(item.totalAmount ?? item.TotalAmount ?? 0);
            const paid =
              item.totalPaid !== undefined || item.TotalPaid !== undefined
                ? Number(item.totalPaid ?? item.TotalPaid ?? 0)
                : total;
            const due =
              item.totalDue !== undefined || item.TotalDue !== undefined
                ? Number(item.totalDue ?? item.TotalDue ?? 0)
                : Math.max(0, total - paid);
            const count = Number(
              item.deliveriesCount ??
                item.DeliveriesCount ??
                item.count ??
                item.Count ??
                item.totalDeliveries ??
                item.TotalDeliveries ??
                0
            );
            return {
              ...item,
              day: item.day || item.Day || item.date || item.Date,
              Day: item.Day || item.day || item.Date || item.date,
              totalAmount: total,
              TotalAmount: total,
              totalPaid: paid,
              TotalPaid: paid,
              totalDue: due,
              TotalDue: due,
              deliveriesCount: count,
              DeliveriesCount: count,
            };
          });
          setRecapDays(normalized);
        } else {
          // If empty, generate fallback days in the range
          computeFallbackRecap(fromStr, toStr, selectedStoreId);
        }
      })
      .catch(() => {
        // Fallback calculation using store deliveries matching the C# controller logic
        computeFallbackRecap(fromStr, toStr, selectedStoreId);
      });
  };

  // Fallback calculation directly applying the user's C# algorithm
  const computeFallbackRecap = (fromStr, toStr, storeId) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, {
      page: 1,
      take: 1000,
      storeId,
    })
      .fetchAll()
      .then((res) => {
        setLoading(false);
        const deliveries = (res.data?.data || res.data || []).filter((d) => {
          const sId = d.eStoreId ?? d.storeId ?? d.EStoreId;
          return !storeId || Number(sId) === Number(storeId);
        });

        const from = moment(fromStr).startOf("day");
        const to = moment(toStr).endOf("day");
        const days = [];

        for (let m = moment(to); m.isSameOrAfter(from, "day"); m.subtract(1, "days")) {
          const currentDayStr = m.format("YYYY-MM-DD");
          const dayDeliveries = deliveries.filter((d) => {
            const refDate =
              d.deliveryDate ||
              d.DeliveryDate ||
              d.deliveredDate ||
              d.DeliveredDate ||
              d.createdDate ||
              d.beginProcessDate ||
              d.CreatedDate;
            return refDate && moment(refDate).format("YYYY-MM-DD") === currentDayStr;
          });

          let totalAmount = 0;
          let totalPaid = 0;
          let deliveryFees = 0;
          let returnFees = 0;
          let refundAmount = 0;

          dayDeliveries.forEach((del) => {
            const items = del.coliItems || del.ColiItems || [];
            let delAmount = 0;
            if (items.length > 0) {
              delAmount = items.reduce(
                (sum, ci) => sum + (Number(ci.qty) || 1) * (Number(ci.unitPrice) || 0),
                0
              );
            } else {
              delAmount = Number(del.totalPrice) || Number(del.cost) || 0;
            }
            totalAmount += delAmount;
            const resCode = Number(del.result ?? del.Result ?? 0);
            const delivFeeVal = Number(
              del.tarif?.tarifDelivery ?? del.tarifDelivery ?? del.cost ?? 7
            );
            const returnFeeVal = Number(
              del.tarif?.commissionReturn ?? del.commissionReturn ?? del.returnFee ?? 3
            );
            if (del.isPaid || del.status === 5 || resCode === 1) {
              totalPaid += delAmount;
              deliveryFees += delivFeeVal;
            } else if (resCode === 5 || resCode === 6) {
              returnFees += returnFeeVal;
            } else if (resCode === 7 || del.isRefunded || Number(del.refundAmount) > 0) {
              refundAmount += Number(del.refundAmount ?? del.RefundAmount) || 0;
            }
          });

          const netStoreAmount = Math.max(0, totalPaid - deliveryFees - returnFees - refundAmount);

          days.push({
            day: m.toDate(),
            Day: m.toDate(),
            totalAmount,
            TotalAmount: totalAmount,
            totalPaid,
            TotalPaid: totalPaid,
            deliveryFees,
            DeliveryFees: deliveryFees,
            returnFees,
            ReturnFees: returnFees,
            refundAmount,
            RefundAmount: refundAmount,
            netStoreAmount,
            NetStoreAmount: netStoreAmount,
            totalDue: totalAmount - totalPaid,
            TotalDue: totalAmount - totalPaid,
            deliveriesCount: dayDeliveries.length,
            DeliveriesCount: dayDeliveries.length,
          });
        }

        setRecapDays(days);
      })
      .catch(() => {
        setLoading(false);
        // Generate blank days
        const from = moment(fromStr).startOf("day");
        const to = moment(toStr).endOf("day");
        const days = [];
        for (let m = moment(to); m.isSameOrAfter(from, "day"); m.subtract(1, "days")) {
          days.push({
            day: m.toDate(),
            totalAmount: 0,
            totalPaid: 0,
            totalDue: 0,
            deliveriesCount: 0,
          });
        }
        setRecapDays(days);
      });
  };

  useEffect(() => {
    fetchRecapByDay();
  }, [selectedStoreId, dateRange]);

  // Open Day Details and call deliveriesByDate
  const openDayDetails = (recapItem) => {
    setSelectedDay(recapItem);
    setLoadingDayDetails(true);
    setDayDeliveries([]);
    const dayStr = moment(recapItem.day || recapItem.Day).format("YYYY-MM-DD");

    APi.createAPIEndpoint(`${APi.ENDPOINTS.Store}/deliveriesByDate`, {
      storeId: selectedStoreId,
      date: dayStr,
      day: dayStr,
      dateFrom: dayStr,
      dateTo: dayStr,
      date_from: dayStr,
      date_to: dayStr,
    })
      .customGet()
      .then((res) => {
        setLoadingDayDetails(false);
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setDayDeliveries(data);
      })
      .catch(() => {
        // Fallback: fetch deliveries and filter by date
        APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, { page: 1, take: 500, storeId: selectedStoreId })
          .fetchAll()
          .then((res) => {
            setLoadingDayDetails(false);
            const all = res.data?.data || res.data || [];
            const filtered = all.filter((d) => {
              const refDate =
                d.deliveryDate ||
                d.DeliveryDate ||
                d.deliveredDate ||
                d.DeliveredDate ||
                d.createdDate ||
                d.beginProcessDate ||
                d.CreatedDate;
              return refDate && moment(refDate).format("YYYY-MM-DD") === dayStr;
            });
            setDayDeliveries(filtered);
          })
          .catch(() => {
            setLoadingDayDetails(false);
            setDayDeliveries([]);
          });
      });
  };

  // Quick preset ranges
  const setPreset = (daysCount) => {
    setDateRange([
      moment().subtract(daysCount - 1, "days").startOf("day").toDate(),
      moment().endOf("day").toDate(),
    ]);
  };

  const setThisMonth = () => {
    setDateRange([
      moment().startOf("month").toDate(),
      moment().endOf("month").toDate(),
    ]);
  };

  // Period Metrics Aggregation
  const totalPeriodAmount = recapDays.reduce(
    (sum, d) => sum + (Number(d.totalAmount ?? d.TotalAmount) || 0),
    0
  );
  const totalPeriodPaid = recapDays.reduce(
    (sum, d) => sum + (Number(d.totalPaid ?? d.TotalPaid) || 0),
    0
  );
  const totalPeriodDue = recapDays.reduce(
    (sum, d) => sum + (Number(d.totalDue ?? d.TotalDue) || 0),
    0
  );
  const totalPeriodDeliveries = recapDays.reduce(
    (sum, d) => sum + (Number(d.deliveriesCount ?? d.DeliveriesCount) || 0),
    0
  );
  const recoveryRate =
    totalPeriodAmount > 0
      ? Math.round((totalPeriodPaid / totalPeriodAmount) * 100)
      : 0;

  // Search in recap
  const filteredRecap = recapDays.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const dayStr = moment(d.day || d.Day).format("DD/MM/YYYY dddd").toLowerCase();
    const amountStr = ((d.totalAmount ?? d.TotalAmount) ?? "").toString();
    const countStr = ((d.deliveriesCount ?? d.DeliveriesCount) ?? "").toString();
    return dayStr.includes(q) || amountStr.includes(q) || countStr.includes(q);
  });

  // Filter inside day details
  const filteredDayDeliveries = dayDeliveries.filter((del) => {
    if (!dayDetailsSearch.trim()) return true;
    const q = dayDetailsSearch.toLowerCase().trim();
    const code = (del.qrCodeContent || del.id || "").toString().toLowerCase();
    const cust = (del.customer?.fullName || del.customer?.name || "").toLowerCase();
    const phone = (del.customer?.phoneNumber || del.phoneNumber || "").toLowerCase();
    const city = (del.address || del.customer?.address || "").toLowerCase();
    return code.includes(q) || cust.includes(q) || phone.includes(q) || city.includes(q);
  });

  const activeStoreName =
    Number(selectedStoreId) === 0
      ? "Toutes les Boutiques (Global)"
      : storesList.find((s) => s.id === Number(selectedStoreId))?.name_fr ||
        storesList.find((s) => s.id === Number(selectedStoreId))?.name ||
        currentStore?.name_fr ||
        currentStore?.name ||
        `Boutique #${selectedStoreId}`;

  return (
    <div style={{ padding: "16px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#fff",
          borderRadius: "16px",
          padding: "22px 24px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
              width: "50px",
              height: "50px",
              borderRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "24px",
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
            }}
          >
            <FaFileInvoiceDollar />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
                Récapitulatif Journalier des Ventes & Livraisons
              </h2>
              <span
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  fontSize: "0.75rem",
                  padding: "3px 10px",
                  borderRadius: "20px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FaStore size={10} /> {activeStoreName}
              </span>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              Suivi journalier du chiffre d'affaires, des encaissements reçus et des reliquats à recouvrer
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Button
            appearance="ghost"
            style={{ color: "#fff", borderColor: "#475569" }}
            onClick={() => window.print()}
          >
            <FaPrint style={{ marginRight: 6 }} /> Imprimer le Rapport
          </Button>
        </div>
      </div>

      {/* FILTER & DATE CONTROLS BAR */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", flex: "1 1 280px" }}>
          {/* Admin store selector */}
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", flex: "1 1 220px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                Boutique :
              </span>
              <SelectPicker
                data={[{ label: "Toutes les Boutiques (Tous les Récaps)", value: 0 }].concat(
                  storesList.map((s) => ({
                    label: s.name_fr || s.name || `Boutique #${s.id}`,
                    value: s.id,
                  }))
                )}
                searchable={true}
                cleanable={false}
                style={{ width: "260px", maxWidth: "100%", flex: 1 }}
                value={selectedStoreId}
                onSelect={(val) => setSelectedStoreId(val ?? 0)}
              />
            </div>
          )}

          {/* Date Range Picker */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", flex: "1 1 220px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
              <FaCalendarAlt style={{ color: "#2563eb" }} /> Période :
            </span>
            <DateRangePicker
              value={dateRange}
              onChange={(val) => {
                if (val && val[0] && val[1]) setDateRange(val);
              }}
              format="dd/MM/yyyy"
              style={{ width: "260px", maxWidth: "100%", flex: 1 }}
              cleanable={false}
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>Raccourcis :</span>
          <button
            onClick={() => setPreset(7)}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              color: "#334155",
            }}
          >
            7 jours
          </button>
          <button
            onClick={() => setPreset(14)}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              color: "#334155",
            }}
          >
            14 jours
          </button>
          <button
            onClick={() => setPreset(30)}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              color: "#334155",
            }}
          >
            30 jours
          </button>
          <button
            onClick={setThisMonth}
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
              color: "#1d4ed8",
            }}
          >
            Ce Mois
          </button>
        </div>
      </div>

      {/* METRIC KPI SUMMARY CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b" }}>
              CHIFFRE D'AFFAIRES TOTAL
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaMoneyBillWave size={14} />
            </div>
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", marginTop: "6px" }}>
            {totalPeriodAmount.toFixed(3)}{" "}
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
          </div>
          <small style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px", display: "block" }}>
            Montant total des colis expédiés
          </small>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #bbf7d0",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#059669" }}>
              TOTAL ENCAISSÉ / RECOUVRÉ
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaCheckCircle size={14} />
            </div>
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "#059669", marginTop: "6px" }}>
            {totalPeriodPaid.toFixed(3)}{" "}
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
          </div>
          <small style={{ color: "#059669", fontSize: "0.75rem", marginTop: "2px", fontWeight: 600, display: "block" }}>
            Taux d'encaissement : {recoveryRate}%
          </small>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #fecaca",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#dc2626" }}>
              RELIQUAT RESTANT DÛ
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaClock size={14} />
            </div>
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "#dc2626", marginTop: "6px" }}>
            {totalPeriodDue.toFixed(3)}{" "}
            <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>TND</span>
          </div>
          <small style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "2px", fontWeight: 600, display: "block" }}>
            Montant en attente de recouvrement
          </small>
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b" }}>
              NOMBRE DE LIVRAISONS
            </span>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#f8fafc",
                color: "#475569",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaBoxOpen size={14} />
            </div>
          </div>
          <div style={{ fontSize: "1.55rem", fontWeight: 900, color: "#0f172a", marginTop: "6px" }}>
            {totalPeriodDeliveries}{" "}
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#64748b" }}>colis</span>
          </div>
          <small style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px", display: "block" }}>
            Sur l'ensemble de la période
          </small>
        </div>
      </div>

      {/* DAILY RECAP TABLE CARD */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              Détail Journalier (StoreRecapDay)
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              Cliquez sur un jour pour ouvrir et consulter la liste détaillée des colis et articles
            </span>
          </div>

          <div style={{ position: "relative", minWidth: "200px", flex: "1 1 200px", maxWidth: "320px" }}>
            <FaSearch
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <Input
              size="sm"
              placeholder="Filtrer par date..."
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              style={{ paddingLeft: "32px", borderRadius: "8px" }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <Loader size="md" content="Calcul du récapitulatif journalier..." />
          </div>
        ) : (
          <div id="custom-table-container" style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
            <table
              className="tawsil-data-table"
              style={{
                width: "max-content",
                minWidth: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "195px" }}>
                    JOUR / DATE
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "115px" }}>
                    NOMBRE COLIS
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "130px" }}>
                    MONTANT TOTAL
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "135px" }}>
                    ENCAISSÉ (PAYÉ)
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "190px" }}>
                    FRAIS & RETOURS / REMB.
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "130px" }}>
                    RESTANT DÛ
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "145px" }}>
                    TAUX RECOUVREMENT
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", whiteSpace: "nowrap", minWidth: "165px" }}>
                    ÉTAT RETRAIT DÉPÔT
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: "0.76rem", fontWeight: 800, color: "#475569", textAlign: "right", whiteSpace: "nowrap", minWidth: "210px" }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRecap.map((item, idx) => {
                  const dayDate = item.day || item.Day;
                  const formattedDay = moment(dayDate).format("dddd DD MMMM YYYY");
                  const isToday = moment(dayDate).isSame(moment(), "day");
                  const total = Number(item.totalAmount ?? item.TotalAmount) || 0;
                  const paid = Number(item.totalPaid ?? item.TotalPaid) || 0;
                  const due = Number(item.totalDue ?? item.TotalDue) || 0;
                  const count = Number(item.deliveriesCount ?? item.DeliveriesCount) || 0;
                  const rate = total > 0 ? Math.round((paid / total) * 100) : 0;
                  const received = isDayReceived(item);

                  return (
                    <tr
                      key={idx}
                      onClick={() => openDayDetails(item)}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer",
                        background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#fbfcfe")
                      }
                    >
                      {/* Date */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
                          <span style={{ fontWeight: 800, color: "#0f172a", textTransform: "capitalize", fontSize: "0.88rem", whiteSpace: "nowrap" }}>
                            {formattedDay}
                          </span>
                          {isToday && (
                            <span
                              style={{
                                background: "#2563eb",
                                color: "#fff",
                                fontSize: "0.68rem",
                                padding: "2px 7px",
                                borderRadius: "10px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                              }}
                            >
                              Aujourd'hui
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: "0.74rem", color: "#64748b", display: "block", marginTop: "2px" }}>
                          {moment(dayDate).format("DD/MM/YYYY")}
                        </span>
                      </td>

                      {/* Deliveries Count */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <span
                          style={{
                            background: count > 0 ? "#f1f5f9" : "#fafafa",
                            color: count > 0 ? "#1e293b" : "#94a3b8",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <FaBoxOpen size={12} style={{ color: count > 0 ? "#2563eb" : "#cbd5e1", flexShrink: 0 }} />
                          {count} colis
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9rem", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                          {total.toFixed(3)} TND
                        </span>
                      </td>

                      {/* Total Paid */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: "#059669",
                            background: paid > 0 ? "#ecfdf5" : "transparent",
                            border: paid > 0 ? "1px solid #a7f3d0" : "none",
                            padding: paid > 0 ? "3px 8px" : "0",
                            borderRadius: "6px",
                            fontSize: "0.88rem",
                            fontFamily: "monospace",
                            display: "inline-block",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {paid.toFixed(3)} TND
                        </span>
                      </td>

                      {/* Fees, Return Fees & Refunds */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        {(() => {
                          const delivFee = Number(item.deliveryFees ?? item.DeliveryFees ?? item.totalFees ?? 0);
                          const retFee = Number(item.returnFees ?? item.ReturnFees ?? 0);
                          const refAmt = Number(item.refundAmount ?? item.RefundAmount ?? item.totalRefunds ?? 0);
                          const totalDeductions = delivFee + retFee + refAmt;
                          return (
                            <div style={{ fontSize: "0.78rem", color: "#475569", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 700, color: "#334155", whiteSpace: "nowrap" }}>
                                -{totalDeductions.toFixed(3)} TND
                              </div>
                              <div style={{ fontSize: "0.68rem", color: "#64748b", whiteSpace: "nowrap" }}>
                                Livr: {delivFee.toFixed(1)} | Ret: {retFee.toFixed(1)} | Remb: {refAmt.toFixed(1)}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Total Due */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: due > 0 ? "#dc2626" : "#64748b",
                            background: due > 0 ? "#fef2f2" : "transparent",
                            border: due > 0 ? "1px solid #fecaca" : "none",
                            padding: due > 0 ? "3px 8px" : "0",
                            borderRadius: "6px",
                            fontSize: "0.88rem",
                            fontFamily: "monospace",
                            display: "inline-block",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {due.toFixed(3)} TND
                        </span>
                      </td>

                      {/* Recovery Rate */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              width: "68px",
                              flexShrink: 0,
                              height: "6px",
                              background: "#e2e8f0",
                              borderRadius: "4px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${rate}%`,
                                height: "100%",
                                background: rate === 100 ? "#059669" : rate > 50 ? "#2563eb" : "#f59e0b",
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
                            {rate}%
                          </span>
                        </div>
                      </td>

                      {/* State: Reçu du Dépôt vs En attente */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        {received ? (
                          <span
                            style={{
                              background: "#dcfce7",
                              color: "#166534",
                              border: "1px solid #bbf7d0",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "0.76rem",
                              fontWeight: 800,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <FaCheckCircle size={11} style={{ flexShrink: 0 }} /> Reçu du Dépôt
                          </span>
                        ) : (
                          <span
                            style={{
                              background: "#fef3c7",
                              color: "#92400e",
                              border: "1px solid #fde68a",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <FaClock size={11} style={{ flexShrink: 0 }} /> En attente au Dépôt
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          {!received && (
                            <button
                              onClick={(e) => handleMarkDayReceived(item, e)}
                              style={{
                                background: "#059669",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "8px",
                                padding: "6px 12px",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                              }}
                              title="Confirmer que la boutique a récupéré le montant de ce jour auprès du dépôt"
                            >
                              <FaCheckCircle size={12} style={{ flexShrink: 0 }} /> Reçu
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDayDetails(item);
                            }}
                            style={{
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              border: "1px solid #bfdbfe",
                              borderRadius: "8px",
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                            }}
                          >
                            <FaEye size={12} style={{ flexShrink: 0 }} /> Détails des Colis
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRecap.length === 0 && (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <FaCalendarAlt size={36} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
                <div style={{ fontWeight: 600 }}>Aucune donnée trouvée pour cette période.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DAY DELIVERIES DETAILS MODAL (`deliveriesByDate`) */}
      <Modal
        size="lg"
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
      >
        <Modal.Header>
          <Modal.Title>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <FaBoxOpen style={{ color: "#2563eb" }} />
              <span>
                Colis du {selectedDay ? moment(selectedDay.day || selectedDay.Day).format("dddd DD MMMM YYYY") : ""}
              </span>
            </div>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {selectedDay && (
            <div>
              {/* Day Quick Summary Banner */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  marginBottom: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b" }}>
                    BOUTIQUE PARTENAIRE
                  </span>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                    {activeStoreName}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>TOTAL JOUR</span>
                    <strong style={{ color: "#0f172a", fontSize: "1rem" }}>
                      {(Number(selectedDay.totalAmount ?? selectedDay.TotalAmount) || 0).toFixed(3)} TND
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "#059669", display: "block" }}>ENCAISSÉ</span>
                    <strong style={{ color: "#059669", fontSize: "1rem" }}>
                      {(Number(selectedDay.totalPaid ?? selectedDay.TotalPaid) || 0).toFixed(3)} TND
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "#dc2626", display: "block" }}>RESTANT DÛ</span>
                    <strong style={{ color: "#dc2626", fontSize: "1rem" }}>
                      {(Number(selectedDay.totalDue ?? selectedDay.TotalDue) || 0).toFixed(3)} TND
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.72rem", color: "#2563eb", display: "block" }}>COLIS</span>
                    <strong style={{ color: "#2563eb", fontSize: "1rem" }}>
                      {Number(selectedDay.deliveriesCount ?? selectedDay.DeliveriesCount) || 0}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Search Inside Day Deliveries */}
              <div style={{ marginBottom: "14px" }}>
                <Input
                  placeholder="Rechercher par code colis, nom du client ou ville..."
                  value={dayDetailsSearch}
                  onChange={(val) => setDayDetailsSearch(val)}
                  style={{ borderRadius: "8px" }}
                />
              </div>

              {loadingDayDetails ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  <Loader content="Chargement des colis du jour (deliveriesByDate)..." />
                </div>
              ) : filteredDayDeliveries.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>
                  <FaBoxOpen size={30} style={{ color: "#cbd5e1", marginBottom: "6px" }} />
                  <div>Aucun colis enregistré pour cette journée.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {filteredDayDeliveries.map((del, dIdx) => {
                    const items = del.coliItems || del.ColiItems || [];
                    const itemsTotal =
                      items.length > 0
                        ? items.reduce(
                            (s, ci) => s + (Number(ci.qty) || 1) * (Number(ci.unitPrice) || 0),
                            0
                          )
                        : Number(del.totalPrice) || Number(del.cost) || 0;

                    const isPaid = del.isPaid || del.status === 2;

                    return (
                      <div
                        key={dIdx}
                        style={{
                          background: "#fff",
                          border: isPaid ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "12px 16px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        {/* Delivery Identity & Customer */}
                        <div style={{ minWidth: "220px", flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 800,
                                color: "#1e293b",
                                background: "#f1f5f9",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "0.85rem",
                              }}
                            >
                              #{del.qrCodeContent || del.id}
                            </span>
                            <span
                              style={{
                                background: isPaid ? "#dcfce7" : "#fee2e2",
                                color: isPaid ? "#166534" : "#991b1b",
                                fontSize: "0.72rem",
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: "12px",
                              }}
                            >
                              {isPaid ? "✓ Payé / Encaissé" : "⏳ Non Payé"}
                            </span>
                          </div>

                          <div style={{ fontWeight: 700, color: "#0f172a", marginTop: "4px", fontSize: "0.88rem" }}>
                            <FaUser size={10} style={{ color: "#64748b", marginRight: "4px" }} />
                            {del.customer?.fullName || del.customer?.name || "Client destinataire"}
                          </div>

                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                            {del.customer?.phoneNumber || del.phoneNumber ? (
                              <span style={{ marginRight: "10px" }}>
                                <FaPhoneAlt size={9} style={{ marginRight: "3px" }} />
                                {del.customer?.phoneNumber || del.phoneNumber}
                              </span>
                            ) : null}
                            <span>{del.address || del.customer?.address || "Adresse de livraison"}</span>
                          </div>
                        </div>

                        {/* Articles & Items */}
                        <div style={{ minWidth: "160px", maxWidth: "260px" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b" }}>
                            ARTICLES / COLIS :
                          </span>
                          {items.length > 0 ? (
                            <div style={{ fontSize: "0.76rem", color: "#334155", marginTop: "2px" }}>
                              {items.map((it, itIdx) => (
                                <div key={itIdx}>
                                  • {it.qty}x {it.designation || "Article"} ({(Number(it.unitPrice) || 0).toFixed(3)} TND)
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                              {del.designation || "Colis standard"}
                            </div>
                          )}
                        </div>

                        {/* Amount */}
                        <div style={{ textAlign: "right", minWidth: "100px" }}>
                          <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>
                            MONTANT COLIS
                          </span>
                          <span
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: 900,
                              fontFamily: "monospace",
                              color: isPaid ? "#059669" : "#0f172a",
                            }}
                          >
                            {itemsTotal.toFixed(3)} TND
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer>
          {selectedDay && !isDayReceived(selectedDay) && (
            <Button
              onClick={(e) => handleMarkDayReceived(selectedDay, e)}
              appearance="primary"
              style={{ background: "#059669", fontWeight: 700, marginRight: "8px" }}
            >
              <FaCheckCircle style={{ marginRight: 6 }} /> Marquer Reçu du Dépôt
            </Button>
          )}
          <Button onClick={() => window.print()} appearance="primary">
            <FaPrint style={{ marginRight: 6 }} /> Imprimer le Récapitulatif du Jour
          </Button>
          <Button onClick={() => setSelectedDay(null)} appearance="subtle">
            Fermer
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
