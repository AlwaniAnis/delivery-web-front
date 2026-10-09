import { useEffect, useState } from "react";
import { Link, Route, Switch, useHistory, useLocation } from "react-router-dom";
import { useRecoilState, useSetRecoilState } from "recoil";
import { Container, Content, Dropdown, Header, Sidebar } from "rsuite";
import {
  startDriverNotifications,
  stopDriverNotifications,
} from "./Notifications/signalR";
// Icons
import { BiTrip } from "react-icons/bi";
import {
  FaAddressBook,
  FaBars,
  FaBox,
  FaCalendarDay,
  FaChartPie,
  FaCommentDots,
  FaMoneyBillWave,
  FaMoneyCheckAlt,
  FaQrcode,
  FaRoute,
  FaSignOutAlt,
  FaStore,
  FaTags,
  FaTimes,
  FaTruck,
  FaUsers,
  FaUserShield,
  FaWallet,
  FaWarehouse
} from "react-icons/fa";

// Atoms & Services
import { APi } from "./Api";
import "./App.scss";
import {
  activeRoleState,
  adminModuleState,
  currentDepotIdState,
  currentDriverIdState,
  currentUserState,
  isLogged,
  normalizeRole,
} from "./Atoms/auth.atom";
import { DepotAgentsList } from "./Atoms/depotAgents.atom";
import { DriversList } from "./Atoms/drivers.atom";
import { globalContactsState } from "./Atoms/globalContacts.atom";
import { preparationPlacesState } from "./Atoms/preparationPlaces.atom";
import { reclamationsState } from "./Atoms/reclamations.atom";
import { MyStore } from "./Atoms/store.atom";
import { StoresList } from "./Atoms/stores.atom";
import { tarifsState } from "./Atoms/tarifs.atom";
import useB2B from "./hooks/useB2B";

// Screens
import Login from "./Screens/Auth/login";
import Customers from "./Screens/Customers";
import Home from "./Screens/Dashboard";
import Deliveries from "./Screens/Deliveries";
import Delivred from "./Screens/Delivred";
import DepotAgents from "./Screens/DepotAgents";
import DepotAgentWorkspace from "./Screens/DepotAgentWorkspace";
import DriverPayments from "./Screens/DriverPayments";
import Drivers from "./Screens/Drivers";
import GeneralConfigPage from "./Screens/GeneralConfig";
import GlobalContacts from "./Screens/GlobalContacts";
import MyMap from "./Screens/Map";
import NotPaidDeliveries from "./Screens/NotPaid";
import OurStore from "./Screens/OurStore";
import PreparationPlaces from "./Screens/PreparationPlaces";
import QRScanner from "./Screens/qrcode";
import Reclamations from "./Screens/Reclamations";
import StoreDailyRecap from "./Screens/StoreDailyRecap";
import Stores from "./Screens/stores";
import Tarifs from "./Screens/Tarifs";
import Users from "./Screens/Users";

const App = () => {
  const [expand, setExpand] = useState(false);
  const [logged, setLogged] = useRecoilState(isLogged);
  const [currentUser, setCurrentUser] = useRecoilState(currentUserState);
  const [activeRole, setActiveRole] = useRecoilState(activeRoleState);
  const [adminModule, setAdminModule] = useRecoilState(adminModuleState);
  const [currentDriverId, setCurrentDriverId] = useRecoilState(currentDriverIdState);
  const [currentDepotId, setCurrentDepotId] = useRecoilState(currentDepotIdState);
  const [driversList, setDriversList] = useRecoilState(DriversList);
  const [storesList, setStoresList] = useRecoilState(StoresList);
  const [depotsList, setDepotsList] = useRecoilState(preparationPlacesState);
  const [reclamationsList, setReclamationsList] = useRecoilState(reclamationsState);
  const setGlobalContactsList = useSetRecoilState(globalContactsState);
  const setDepotAgentsList = useSetRecoilState(DepotAgentsList);
  const setTarifsList = useSetRecoilState(tarifsState);
  const setStore = useSetRecoilState(MyStore);
  useB2B();

  const location = useLocation();
  const history = useHistory();
  const isDepotAgent = normalizeRole(activeRole) === "depotAgent";
  const depotFilter = isDepotAgent
    ? {
        preparationPlaceId: Number(currentDepotId) || 1,
        placeId: Number(currentDepotId) || 1,
      }
    : {};

  // Load initial stores, drivers, depots, depot agents, global contacts, and tariffs from API
  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");

    if (auth.role !== "driver" || !auth.driverId) return;

    const handleNotification = (message) => {
      console.log("New driver notification:", message);
    };

    startDriverNotifications(handleNotification).catch(console.error);

    return () => {
      stopDriverNotifications(handleNotification).catch(console.error);
    };
  }, []);
  useEffect(() => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Driver, {
      page: 1,
      take: 1000,
      ...depotFilter,
    })
      .fetchAll()
      .then((res) => {
        if (Array.isArray(res.data)) setDriversList(res.data);
        else if (Array.isArray(res.data?.data)) setDriversList(res.data.data);
      })
      .catch(() => {
        APi.createAPIEndpoint(APi.ENDPOINTS.Driver, { page: 1, take: 1000 })
          .fetchAll()
          .then((res) => {
            if (res.data?.data) setDriversList(res.data.data);
            else if (Array.isArray(res.data)) setDriversList(res.data);
          })
          .catch(() => {});
      });

    APi.createAPIEndpoint(APi.ENDPOINTS.DepotAgent + "/getAll", {})
      .customGet()
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : null;
        if (list) setDepotAgentsList(list);
      })
      .catch(() => {});

    APi.createAPIEndpoint(APi.ENDPOINTS.GlobalContact + "/getAll", {})
      .customGet()
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : null;
        if (list) setGlobalContactsList(list);
      })
      .catch(() => {});

    APi.createAPIEndpoint(APi.ENDPOINTS.Store + "/getAll", depotFilter)
      .fetchAll()
      .then(async (res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
        if (list.length > 0) {
          setStoresList(list);
          try {
            const recResults = await Promise.allSettled(
              list.map((st) =>
                APi.createAPIEndpoint(`${APi.ENDPOINTS.Reclamation}/store/${st.id}`).customGet()
              )
            );
            const merged = [];
            recResults.forEach((r) => {
              if (r.status === "fulfilled") {
                const arr = r.value?.data?.data || r.value?.data;
                if (Array.isArray(arr)) merged.push(...arr);
              }
            });
            if (merged.length > 0) setReclamationsList(merged);
          } catch (e) {}
        }
      })
      .catch(() => {});

    APi.createAPIEndpoint(APi.ENDPOINTS.PreparationPlace + "/getAll", {})
      .fetchAll()
      .then((res) => {
        if (Array.isArray(res.data)) setDepotsList(res.data);
        else if (Array.isArray(res.data?.data)) setDepotsList(res.data.data);
      })
      .catch(() => {});

    APi.createAPIEndpoint(APi.ENDPOINTS.Tarif + "/getAll", {})
      .fetchAll()
      .then((res) => {
        if (Array.isArray(res.data)) setTarifsList(res.data);
        else if (Array.isArray(res.data?.data)) setTarifsList(res.data.data);
      })
      .catch(() => {});

    const reclamationEndpoint = isDepotAgent
      ? `${APi.ENDPOINTS.Reclamation}/depot/${depotFilter.preparationPlaceId}`
      : APi.ENDPOINTS.Reclamation;
    const reclamationRequest = APi.createAPIEndpoint(reclamationEndpoint);
    (isDepotAgent ? reclamationRequest.customGet() : reclamationRequest.fetchAll())
      .then((res) => {
        if (Array.isArray(res.data)) setReclamationsList(res.data);
        else if (Array.isArray(res.data?.data)) setReclamationsList(res.data.data);
      })
      .catch(() => {});

    APi.createAPIEndpoint(APi.ENDPOINTS.GlobalContact+"/getAll", {})
      .fetchAll()
      .then((res) => {
        if (Array.isArray(res.data)) setGlobalContactsList(res.data);
        else if (Array.isArray(res.data?.data)) setGlobalContactsList(res.data.data);
      })
      .catch(() => {});
  }, [isDepotAgent, currentDepotId]);

  // Sync auth on mount
  useEffect(() => {
    const rawAuth = localStorage.getItem("auth");
    if (!rawAuth) {
      setLogged(false);
    } else {
      try {
        const parsed = JSON.parse(rawAuth);
        setCurrentUser(parsed);
        if (parsed.role) {
          setActiveRole(normalizeRole(parsed.role));
        } else {
          setActiveRole("admin");
        }
        if (parsed.driverId) {
          setCurrentDriverId(parsed.driverId);
        }
        if (parsed.preparationPlaceId || parsed.depotId) {
          setCurrentDepotId(parsed.preparationPlaceId || parsed.depotId);
        }
        setLogged(true);
      } catch (e) {
        setLogged(false);
      }
    }
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("auth");
    setLogged(false);
    history.push("/");
  };

  const currentRole = normalizeRole(activeRole);
  const isDriver = currentRole === "driver";
  const isB2BClient = currentRole === "B2Bclient";
  const isAdmin = !isDriver && !isB2BClient && !isDepotAgent;
  const isAdminStoreModule = isAdmin && adminModule === "store";
  const isB2B = isB2BClient || isAdminStoreModule;

  const switchAdminModule = (nextModule) => {
    setAdminModule(nextModule);
    try {
      localStorage.setItem("tawsil_admin_module", nextModule);
    } catch (e) {}
    if (
      nextModule === "store" &&
      [
        "/users",
        "/tarifs",
        "/stores",
        "/drivers",
        "/depots",
        "/depot_agents",
        "/driver_payments",
        "/customers",
      ].includes(location.pathname)
    ) {
      history.push("/");
    } else if (nextModule === "administration" && location.pathname === "/our_store") {
      history.push("/");
    }
  };

  const currentDriver = driversList.find((d) => d.id === Number(currentDriverId)) || {
    name: currentUser?.fullName || currentUser?.userName || "Livreur",
    carNumber: currentUser?.carNumber || "Véhicule de service",
  };

  const currentDepot = depotsList.find((d) => Number(d.id) === Number(currentDepotId)) || depotsList[0];

  // Auth Guard
  if (!logged) {
    return <Login />;
  }

  // Titles mapping
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") {
      if (isDepotAgent) return "Console Agent de Dépôt";
      if (isB2B) return isAdminStoreModule ? "Dashboard Notre Boutique" : "Dashboard Boutique";
      return "Dashboard Global (Toutes Boutiques)";
    }
    if (path === "/depot_agent") return "Console Agent de Dépôt";
    if (path === "/depot_agents") return "Gestion des Agents de Dépôt";
    if (path === "/deliveries") {
      if (activeRole === "driver") return "Mes Livraisons";
      if (isB2B) return isAdminStoreModule ? "Nos Livraisons (Notre Boutique)" : "Nos Livraisons";
      return "Toutes les Livraisons (Global)";
    }
    if (path === "/deliveries_not_paid") return "Livraisons Non Payées";
    if (path === "/delivred") return "Recouvrement & Colis Livrés";
    if (path === "/scan_qrcode") return "Scanner QR Code";
    if (path === "/maps") return "Itinéraire & Trajet Livreur";
    if (path === "/drivers") return "Gestion des Livreurs";
    if (path === "/customers") return "Clients B2C";
    if (path === "/stores") return "Gestion des Boutiques";
    if (path === "/our_store") return "Notre Boutique";
    if (path === "/users") return "Comptes Utilisateurs & Accès";
    if (path === "/depots") return "Dépôts & Stockage Colis";
    if (path === "/tarifs") return "Grille Tarifaire & Commissions";
    if (path === "/driver_payments") return "Règlements & Paiements Livreurs";
    if (path === "/store_recap") {
      return isB2B
        ? "Récap Journalier Boutique"
        : "Tous les Récaps Journaliers (Boutiques)";
    }
    if (path === "/reclamations") {
      if (isDepotAgent) return "Réclamations des Boutiques du Dépôt";
      return isB2B ? "Mes Réclamations & Support" : "Réclamations Boutiques (Support Admin)";
    }
    if (path === "/contacts") {
      return !isB2B && isAdmin ? "Gestion des Contacts Globaux" : "Contacts Utiles & Support";
    }
    return "Tawsil Logistics";
  };

  return (
    <div className="tawsil-app">
      <Container style={{ minHeight: "100vh" }}>
        {/* Mobile Sidebar Backdrop */}
        {expand && (
          <div
            className="sidebar-mobile-backdrop"
            onClick={() => setExpand(false)}
          />
        )}

        {/* Modern Sidebar */}
        <Sidebar className={`tawsil-sidebar ${expand ? "mobile-show" : ""}`}>
          <div className="sidebar-brand-zone">
            <div className="brand-logo-icon">
              <FaBox />
            </div>
            <div className="brand-text-block">
              <span className="brand-title">TAWSIL</span>
              <span className="brand-badge">Express Logistics</span>
            </div>
            <button className="mobile-close-btn" onClick={() => setExpand(false)}>
              <FaTimes />
            </button>
          </div>

          {/* Active Profile Pill in Sidebar */}
          <div className="sidebar-role-indicator">
            <div className="role-avatar">
              {isDriver ? (
                <FaTruck />
              ) : isB2BClient || isAdminStoreModule ? (
                <FaStore />
              ) : isDepotAgent ? (
                <FaWarehouse />
              ) : (
                <FaUserShield />
              )}
            </div>
            <div className="role-details">
              <span className="role-name">{currentUser.fullName || currentUser.userName || "Utilisateur"}</span>
              <span className="role-badge-text">
                {isDriver
                  ? "Profil Livreur"
                  : isB2BClient
                  ? "Espace Boutique B2B"
                  : isDepotAgent
                  ? `Agent Dépôt · ${currentDepot?.name || "Tunis"}`
                  : isAdminStoreModule
                  ? "Module 2 · Notre Boutique"
                  : "Module 1 · Administration"}
              </span>
            </div>
          </div>

          {/* ADMIN 2-MODULE SWITCHER IN SIDEBAR */}
          {isAdmin && (
            <div
              style={{
                margin: "0 12px 14px",
                background: "rgba(15, 23, 42, 0.55)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "12px",
                padding: "6px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px",
              }}
            >
              <button
                onClick={() => switchAdminModule("administration")}
                style={{
                  background:
                    adminModule === "administration"
                      ? "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
                      : "transparent",
                  color: adminModule === "administration" ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 6px",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                  boxShadow:
                    adminModule === "administration"
                      ? "0 3px 10px rgba(79, 70, 229, 0.35)"
                      : "none",
                }}
              >
                <FaUserShield size={13} />
                <span>Administration</span>
              </button>

              <button
                onClick={() => switchAdminModule("store")}
                style={{
                  background:
                    adminModule === "store"
                      ? "linear-gradient(135deg, #2563eb 0%, #0284c7 100%)"
                      : "transparent",
                  color: adminModule === "store" ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 6px",
                  fontSize: "0.74rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                  boxShadow:
                    adminModule === "store"
                      ? "0 3px 10px rgba(37, 99, 235, 0.35)"
                      : "none",
                }}
              >
                <FaStore size={13} />
                <span>Notre Boutique</span>
              </button>
            </div>
          )}

          {/* Driver Solde Wallet Card */}
          {isDriver && (
            <div
              style={{
                margin: "0 12px 14px",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                borderRadius: "12px",
                padding: "12px 14px",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", opacity: 0.9 }}>
                  💰 Solde Livreur
                </span>
                <span style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.2)", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                  Actuel
                </span>
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 900, fontFamily: "monospace", letterSpacing: "0.5px" }}>
                {(Number(currentDriver?.solde ?? currentDriver?.Solde) || 0).toFixed(3)}{" "}
                <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>TND</span>
              </div>
            </div>
          )}

          <div className="sidebar-nav-scroll">
            {/* DRIVER ROLE NAV */}
            {isDriver && (
              <div className="nav-group">
                <div className="nav-group-title">ESPACE LIVREUR</div>
                <Link
                  to="/deliveries"
                  className={`nav-link-item ${location.pathname === "/" || location.pathname === "/deliveries" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><BiTrip /></span>
                  <span className="nav-label">Mes Livraisons</span>
                </Link>
                <Link
                  to="/scan_qrcode"
                  className={`nav-link-item ${location.pathname === "/scan_qrcode" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaQrcode /></span>
                  <span className="nav-label">Scanner QR Code</span>
                </Link>
                <Link
                  to="/maps"
                  className={`nav-link-item ${location.pathname === "/maps" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaRoute /></span>
                  <span className="nav-label">Trajet & Carte GPS</span>
                </Link>
                <Link
                  to="/driver_payments"
                  className={`nav-link-item ${location.pathname === "/driver_payments" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaMoneyCheckAlt /></span>
                  <span className="nav-label">Mes Règlements & Solde</span>
                </Link>
              </div>
            )}

            {/* B2B CLIENT ROLE NAV OR ADMIN MODULE 2 (NOTRE BOUTIQUE) */}
            {isB2B && (
              <div className="nav-group">
                <div className="nav-group-title">
                  {isAdminStoreModule ? "MODULE 2 · NOTRE BOUTIQUE" : "ESPACE BOUTIQUE B2B"}
                </div>
                <Link
                  to="/"
                  className={`nav-link-item ${location.pathname === "/" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaChartPie /></span>
                  <span className="nav-label">Dashboard Boutique</span>
                </Link>
                <Link
                  to="/deliveries"
                  className={`nav-link-item ${location.pathname === "/deliveries" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><BiTrip /></span>
                  <span className="nav-label">Nos Livraisons</span>
                </Link>
                <Link
                  to="/store_recap"
                  className={`nav-link-item ${location.pathname === "/store_recap" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaCalendarDay /></span>
                  <span className="nav-label">Récap Journalier Boutique</span>
                </Link>
                <Link
                  to="/reclamations"
                  className={`nav-link-item ${location.pathname === "/reclamations" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaCommentDots /></span>
                  <span className="nav-label">Nos Réclamations</span>
                </Link>
                <Link
                  to="/our_store"
                  className={`nav-link-item ${location.pathname === "/our_store" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaStore /></span>
                  <span className="nav-label">Informations Boutique</span>
                </Link>
                <Link
                  to="/contacts"
                  className={`nav-link-item ${location.pathname === "/contacts" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaAddressBook /></span>
                  <span className="nav-label">Contacts & Support</span>
                </Link>
              </div>
            )}

            {/* DEPOT AGENT ROLE NAV */}
            {isDepotAgent && (
              <div className="nav-group">
                <div className="nav-group-title">ESPACE AGENT DÉPÔT</div>
                <Link
                  to="/depot_agent"
                  className={`nav-link-item ${location.pathname === "/" || location.pathname === "/depot_agent" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaWarehouse /></span>
                  <span className="nav-label">Console Agent Dépôt</span>
                </Link>
                <Link
                  to="/deliveries"
                  className={`nav-link-item ${location.pathname === "/deliveries" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><BiTrip /></span>
                  <span className="nav-label">Livraisons du Dépôt</span>
                </Link>
                <Link
                  to="/stores"
                  className={`nav-link-item ${location.pathname === "/stores" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaStore /></span>
                  <span className="nav-label">Boutiques du Dépôt</span>
                </Link>
                <Link
                  to="/store_recap"
                  className={`nav-link-item ${location.pathname === "/store_recap" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaCalendarDay /></span>
                  <span className="nav-label">Récaps Boutiques du Dépôt</span>
                </Link>
                <Link
                  to="/drivers"
                  className={`nav-link-item ${location.pathname === "/drivers" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaTruck /></span>
                  <span className="nav-label">Livreurs du Dépôt</span>
                </Link>
                <Link
                  to="/reclamations"
                  className={`nav-link-item ${location.pathname === "/reclamations" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaCommentDots /></span>
                  <span className="nav-label">Réclamations du Dépôt</span>
                </Link>
                <Link
                  to="/scan_qrcode"
                  className={`nav-link-item ${location.pathname === "/scan_qrcode" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaQrcode /></span>
                  <span className="nav-label">Scanner Réception Dépôt</span>
                </Link>
                <Link
                  to="/deliveries_not_paid"
                  className={`nav-link-item ${location.pathname === "/deliveries_not_paid" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaMoneyBillWave /></span>
                  <span className="nav-label">Livraisons Non Payées</span>
                </Link>
                <Link
                  to="/driver_payments"
                  className={`nav-link-item ${location.pathname === "/driver_payments" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaMoneyCheckAlt /></span>
                  <span className="nav-label">Recouvrement Livreur (Solde)</span>
                </Link>
                <Link
                  to="/reclamations"
                  className={`nav-link-item ${location.pathname === "/reclamations" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaCommentDots /></span>
                  <span className="nav-label">Réclamations des Boutiques</span>
                </Link>
              </div>
            )}

            {/* ADMIN MODULE 1: GLOBAL ADMINISTRATION */}
            {isAdmin && !isAdminStoreModule && (
              <>
                <div className="nav-group">
                  <div className="nav-group-title">MODULE 1 · ADMINISTRATION GLOBALE</div>
                  <Link
                    to="/"
                    className={`nav-link-item ${location.pathname === "/" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaChartPie /></span>
                    <span className="nav-label">Dashboard Global</span>
                  </Link>
                  <Link
                    to="/deliveries"
                    className={`nav-link-item ${location.pathname === "/deliveries" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><BiTrip /></span>
                    <span className="nav-label">Toutes les Livraisons</span>
                  </Link>
                  <Link
                    to="/store_recap"
                    className={`nav-link-item ${location.pathname === "/store_recap" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaCalendarDay /></span>
                    <span className="nav-label">Tous les Récaps Boutiques</span>
                  </Link>
                  <Link
                    to="/tarifs"
                    className={`nav-link-item ${location.pathname === "/tarifs" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaTags /></span>
                    <span className="nav-label">Grille Tarifaire</span>
                  </Link>
                     <Link
                    to="/general_config"
                    className={`nav-link-item ${location.pathname === "/general_config" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaTags /></span>
                    <span className="nav-label"> Config General</span>
                  </Link>
                  <Link
                    to="/reclamations"
                    className={`nav-link-item ${location.pathname === "/reclamations" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "10px" }}>
                      <span className="nav-icon"><FaCommentDots /></span>
                      <span className="nav-label">Réclamations Boutiques</span>
                    </span>
                    {reclamationsList.filter((r) => Number(r.status) === 1).length > 0 && (
                      <span
                        style={{
                          background: "#ef4444",
                          color: "#ffffff",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          padding: "1px 7px",
                          borderRadius: "10px",
                        }}
                      >
                        {reclamationsList.filter((r) => Number(r.status) === 1).length}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/contacts"
                    className={`nav-link-item ${location.pathname === "/contacts" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaAddressBook /></span>
                    <span className="nav-label">Contacts Globaux (Boutiques)</span>
                  </Link>
                </div>

                <div className="nav-group">
                  <div className="nav-group-title">COMPTES, RÉSEAU & DÉPÔTS</div>
                  <Link
                    to="/users"
                    className={`nav-link-item ${location.pathname === "/users" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaUserShield /></span>
                    <span className="nav-label">Comptes & Droits</span>
                  </Link>
                  <Link
                    to="/stores"
                    className={`nav-link-item ${location.pathname === "/stores" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaStore /></span>
                    <span className="nav-label">Boutiques Partenaires</span>
                  </Link>
                  <Link
                    to="/depots"
                    className={`nav-link-item ${location.pathname === "/depots" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaWarehouse /></span>
                    <span className="nav-label">Dépôts & Territoires</span>
                  </Link>
                  <Link
                    to="/depot_agents"
                    className={`nav-link-item ${location.pathname === "/depot_agents" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaWarehouse /></span>
                    <span className="nav-label">Agents de Dépôt</span>
                  </Link>
                  <Link
                    to="/drivers"
                    className={`nav-link-item ${location.pathname === "/drivers" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaTruck /></span>
                    <span className="nav-label">Livreurs</span>
                  </Link>
                  <Link
                    to="/driver_payments"
                    className={`nav-link-item ${location.pathname === "/driver_payments" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaMoneyCheckAlt /></span>
                    <span className="nav-label">Recouvrement Livreur (Solde)</span>
                  </Link>
                  <Link
                    to="/customers"
                    className={`nav-link-item ${location.pathname === "/customers" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaUsers /></span>
                    <span className="nav-label">Clients B2C</span>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Sidebar Footer with Sign Out */}
          <div className="sidebar-bottom-bar">
            <button className="signout-button" onClick={handleSignOut}>
              <FaSignOutAlt />
              <span>Déconnexion</span>
            </button>
          </div>
        </Sidebar>

        {/* Main Content Area */}
        <Container className="tawsil-main-container">
          {/* Top Bar Header */}
          <Header className="tawsil-header">
            <div className="header-left-zone">
              <button className="mobile-toggle-btn" onClick={() => setExpand((prev) => !prev)}>
                <FaBars />
              </button>
              <div className="header-title-block">
                <h1 className="header-page-title">{getPageTitle()}</h1>
                <div className="header-breadcrumb">
                  <span>Tawsil</span>
                  <span className="separator">/</span>
                  <span className="current">{getPageTitle()}</span>
                </div>
              </div>
            </div>

            <div className="header-right-zone">
              {/* Authenticated Role Status Badge / Admin Module Toggle */}
              {isAdmin && (
                <div
                  className="admin-header-module-switcher"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    background: "#f1f5f9",
                    padding: "4px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    gap: "4px",
                  }}
                >
                  <button
                    onClick={() => switchAdminModule("administration")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: adminModule === "administration" ? "#4f46e5" : "transparent",
                      color: adminModule === "administration" ? "#ffffff" : "#475569",
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <FaUserShield size={12} />
                    <span>Module Administration</span>
                  </button>
                  <button
                    onClick={() => switchAdminModule("store")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: adminModule === "store" ? "#2563eb" : "transparent",
                      color: adminModule === "store" ? "#ffffff" : "#475569",
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: "8px",
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <FaStore size={12} />
                    <span>Module Notre Boutique</span>
                  </button>
                </div>
              )}

              {isDepotAgent && (
                <div
                  className="header-role-badge"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                  }}
                >
                  <FaWarehouse style={{ color: "#d97706" }} />
                  <span className="header-role-label">
                    Agent Dépôt · <strong>{currentDepot?.name || "Tunis"}</strong>
                  </span>
                </div>
              )}

              {isDriver && (
                <div
                  className="header-role-badge"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                  }}
                >
                  <FaTruck style={{ color: "#10b981" }} />
                  <span className="header-role-label">
                    Livreur : <strong>{currentDriver.name || "Actif"}</strong>
                  </span>
                </div>
              )}

              {isB2BClient && (
                <div
                  className="header-role-badge"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1e40af",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                  }}
                >
                  <FaStore style={{ color: "#2563eb" }} />
                  <span className="header-role-label">Espace Boutique Partenaire B2B</span>
                </div>
              )}

              {/* Driver Solde Pill in Top Header */}
              {isDriver && (
                <div
                  className="driver-solde-header-pill"
                  style={{
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                  }}
                  title="Solde actuel du compte livreur"
                >
                  <FaWallet size={14} />
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, opacity: 0.9 }}>Solde:</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 900, fontFamily: "monospace" }}>
                    {(Number(currentDriver?.solde ?? currentDriver?.Solde) || 0).toFixed(3)} TND
                  </span>
                </div>
              )}

              {/* User Dropdown */}
              <Dropdown
                placement="bottomEnd"
                renderToggle={(props, ref) => (
                  <button {...props} ref={ref} className="user-profile-button">
                    <div className="user-avatar-circle">
                      {currentUser.userName ? currentUser.userName.substring(0, 2).toUpperCase() : "TW"}
                    </div>
                  </button>
                )}
              >
                <div className="dropdown-user-header">
                  <strong>{currentUser.fullName || currentUser.userName}</strong>
                  <span>{currentUser.email || (currentUser.userName ? `${currentUser.userName}@tawsil.tn` : "tawsil.tn")}</span>
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color:
                        isAdmin
                          ? "#7c3aed"
                          : isDepotAgent
                          ? "#d97706"
                          : isDriver
                          ? "#059669"
                          : "#2563eb",
                    }}
                  >
                    {isAdmin
                      ? "Compte Administrateur / Boutique"
                      : isDepotAgent
                      ? "Agent de Dépôt Assigné"
                      : isDriver
                      ? "Chauffeur - Livreur Assigné"
                      : "Boutique Partenaire B2B"}
                  </div>
                </div>
                <Dropdown.Separator />
                <Dropdown.Item onClick={handleSignOut} style={{ color: "#dc2626" }}>
                  <FaSignOutAlt style={{ marginRight: 8 }} /> Déconnexion
                </Dropdown.Item>
              </Dropdown>
            </div>
          </Header>

          {/* App Body Content */}
          <Content className="tawsil-body-content">
            <Switch>
              <Route
                exact
                path="/"
                component={
                  isDriver ? Deliveries : isDepotAgent ? DepotAgentWorkspace : Home
                }
              />
              <Route path="/depot_agent" component={DepotAgentWorkspace} />
              <Route path="/depot_agents" component={DepotAgents} />
              <Route path="/deliveries" component={Deliveries} />
              <Route path="/deliveries_not_paid" component={NotPaidDeliveries} />
              <Route path="/delivred" component={Delivred} />
              <Route path="/scan_qrcode" component={QRScanner} />
              <Route path="/maps" component={MyMap} />
              <Route path="/drivers" component={Drivers} />
              <Route path="/customers" component={Customers} />
              <Route path="/stores" component={Stores} />
              <Route path="/depots" component={PreparationPlaces} />
              <Route path="/our_store" component={OurStore} />
              <Route path="/users" component={Users} />
              <Route path="/tarifs" component={isAdmin ? Tarifs : Deliveries} />
              <Route path="/general_config" component={isAdmin ? GeneralConfigPage : Deliveries} />
              <Route path="/driver_payments" component={DriverPayments} />
              <Route path="/store_recap" component={StoreDailyRecap} />
              <Route path="/reclamations" component={Reclamations} />
              <Route path="/contacts" component={GlobalContacts} />
              <Route
                path="/*"
                component={
                  isDriver ? Deliveries : isDepotAgent ? DepotAgentWorkspace : Home
                }
              />
            </Switch>
          </Content>

          {/* Small Footer */}
          <footer
            style={{
              padding: "10px 20px",
              textAlign: "center",
              fontSize: "0.78rem",
              color: "#64748b",
              borderTop: "1px solid #e2e8f0",
              background: "#ffffff",
            }}
          >
            Developed by{" "}
            <a
              href="https://a2dev.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#2563eb",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              A2 Development (https://a2dev.org)
            </a>
          </footer>
        </Container>
      </Container>
    </div>
  );
};

export default App;
