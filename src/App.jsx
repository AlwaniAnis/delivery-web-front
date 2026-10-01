import React, { useEffect, useState } from "react";
import { Link, Route, Switch, useLocation, useHistory } from "react-router-dom";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { Container, Content, Header, Sidebar, Dropdown } from "rsuite";

// Icons
import {
  FaBox,
  FaTruck,
  FaUsers,
  FaStore,
  FaChartPie,
  FaMoneyBillWave,
  FaQrcode,
  FaRoute,
  FaUserShield,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaExchangeAlt,
  FaCheckCircle,
  FaWarehouse,
} from "react-icons/fa";
import { BiTrip } from "react-icons/bi";
import { MdOutlineDeliveryDining } from "react-icons/md";

// Atoms & Services
import { APi } from "./Api";
import "./App.scss";
import {
  isLogged,
  currentUserState,
  activeRoleState,
  currentDriverIdState,
  normalizeRole,
} from "./Atoms/auth.atom";
import { DriversList } from "./Atoms/drivers.atom";
import { StoresList } from "./Atoms/stores.atom";
import { MyStore } from "./Atoms/store.atom";
import useB2B from "./hooks/useB2B";

// Screens
import Login from "./Screens/Auth/login";
import Home from "./Screens/Dashboard";
import Deliveries from "./Screens/Deliveries";
import NotPaidDeliveries from "./Screens/NotPaid";
import Drivers from "./Screens/Drivers";
import Customers from "./Screens/Customers";
import Stores from "./Screens/stores";
import OurStore from "./Screens/OurStore";
import Users from "./Screens/Users";
import QRScanner from "./Screens/qrcode";
import Delivred from "./Screens/Delivred";
import MyMap from "./Screens/Map";
import PreparationPlaces from "./Screens/PreparationPlaces";

const App = () => {
  const [expand, setExpand] = useState(false);
  const [logged, setLogged] = useRecoilState(isLogged);
  const [currentUser, setCurrentUser] = useRecoilState(currentUserState);
  const [activeRole, setActiveRole] = useRecoilState(activeRoleState);
  const [currentDriverId, setCurrentDriverId] = useRecoilState(currentDriverIdState);
  const [driversList, setDriversList] = useRecoilState(DriversList);
  const [storesList, setStoresList] = useRecoilState(StoresList);
  const setStore = useSetRecoilState(MyStore);
  useB2B();

  const location = useLocation();
  const history = useHistory();

  // Load initial stores and drivers
  useEffect(() => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Driver, { page: 1, take: 1000 })
      .fetchAll()
      .then((res) => {
        if (res.data?.data) setDriversList(res.data.data);
      })
      .catch(() => {});

    APi.createAPIEndpoint(APi.ENDPOINTS.Store + "/getAll", {})
      .fetchAll()
      .then((res) => {
        if (res.data) setStoresList(res.data);
      })
      .catch(() => {});
  }, []);

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
  const isB2B = currentRole === "B2Bclient";
  const isAdmin = !isDriver && !isB2B;

  const currentDriver = driversList.find((d) => d.id === Number(currentDriverId)) || {
    name: currentUser?.fullName || currentUser?.userName || "Livreur",
    carNumber: currentUser?.carNumber || "Véhicule de service",
  };

  // Auth Guard
  if (!logged) {
    return <Login />;
  }

  // Titles mapping
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") return "Tableau de Bord";
    if (path === "/deliveries") return activeRole === "driver" ? "Mes Livraisons" : "Toutes les Livraisons";
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
    return "Tawsil Logistics";
  };

  return (
    <div className="tawsil-app">
      <Container style={{ minHeight: "100vh" }}>
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
              {isDriver ? <FaTruck /> : isB2B ? <FaStore /> : <FaUserShield />}
            </div>
            <div className="role-details">
              <span className="role-name">{currentUser.fullName || currentUser.userName || "Utilisateur"}</span>
              <span className="role-badge-text">
                {isDriver ? "Profil Livreur" : isB2B ? "Espace Boutique B2B" : "Direction / Admin"}
              </span>
            </div>
          </div>

          <div className="sidebar-nav-scroll">
            {/* DRIVER ROLE NAV */}
            {isDriver && (
              <div className="nav-group">
                <div className="nav-group-title">ESPACE LIVREUR</div>
                <Link
                  to="/deliveries"
                  className={`nav-link-item ${location.pathname === "/deliveries" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><BiTrip /></span>
                  <span className="nav-label">Mes Livraisons</span>
                </Link>
                <Link
                  to="/delivred"
                  className={`nav-link-item ${location.pathname === "/delivred" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaMoneyBillWave /></span>
                  <span className="nav-label">Recouvrement Cash</span>
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
                  <span className="nav-label">Trajet & Carte</span>
                </Link>
              </div>
            )}

            {/* B2B CLIENT ROLE NAV */}
            {isB2B && (
              <div className="nav-group">
                <div className="nav-group-title">ESPACE BOUTIQUE B2B</div>
                <Link
                  to="/"
                  className={`nav-link-item ${location.pathname === "/" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaChartPie /></span>
                  <span className="nav-label">Dashboard Boutique</span>
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
                  to="/deliveries"
                  className={`nav-link-item ${location.pathname === "/deliveries" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><BiTrip /></span>
                  <span className="nav-label">Nos Livraisons</span>
                </Link>
                <Link
                  to="/deliveries_not_paid"
                  className={`nav-link-item ${location.pathname === "/deliveries_not_paid" ? "active" : ""}`}
                  onClick={() => setExpand(false)}
                >
                  <span className="nav-icon"><FaMoneyBillWave /></span>
                  <span className="nav-label">Livraisons Non Payées</span>
                </Link>
              </div>
            )}

            {/* ADMIN ROLE NAV */}
            {isAdmin && (
              <>
                <div className="nav-group">
                  <div className="nav-group-title">SUPERVISION & BOUTIQUE PRINCIPALE</div>
                  <Link
                    to="/"
                    className={`nav-link-item ${location.pathname === "/" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaChartPie /></span>
                    <span className="nav-label">Tableau de Bord</span>
                  </Link>
                  <Link
                    to="/deliveries"
                    className={`nav-link-item ${location.pathname === "/deliveries" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><BiTrip /></span>
                    <span className="nav-label">Livraisons</span>
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
                    to="/our_store"
                    className={`nav-link-item ${location.pathname === "/our_store" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaStore /></span>
                    <span className="nav-label">Notre Boutique (Principale)</span>
                  </Link>
                </div>

                <div className="nav-group">
                  <div className="nav-group-title">OUTILS LIVREUR (ACCÈS DIRECT)</div>
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
                    <span className="nav-label">Trajet & Carte</span>
                  </Link>
                  <Link
                    to="/delivred"
                    className={`nav-link-item ${location.pathname === "/delivred" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaMoneyBillWave /></span>
                    <span className="nav-label">Recouvrement Livreur</span>
                  </Link>
                </div>

                <div className="nav-group">
                  <div className="nav-group-title">RÉSEAU & UTILISATEURS</div>
                  <Link
                    to="/drivers"
                    className={`nav-link-item ${location.pathname === "/drivers" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaTruck /></span>
                    <span className="nav-label">Livreurs</span>
                  </Link>
                  <Link
                    to="/customers"
                    className={`nav-link-item ${location.pathname === "/customers" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaUsers /></span>
                    <span className="nav-label">Clients B2C</span>
                  </Link>
                  <Link
                    to="/stores"
                    className={`nav-link-item ${location.pathname === "/stores" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaStore /></span>
                    <span className="nav-label">Boutiques</span>
                  </Link>
                  <Link
                    to="/depots"
                    className={`nav-link-item ${location.pathname === "/depots" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaWarehouse /></span>
                    <span className="nav-label">Dépôts & Stockage</span>
                  </Link>
                  <Link
                    to="/users"
                    className={`nav-link-item ${location.pathname === "/users" ? "active" : ""}`}
                    onClick={() => setExpand(false)}
                  >
                    <span className="nav-icon"><FaUserShield /></span>
                    <span className="nav-label">Comptes & Droits</span>
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
              <div>
                <h1 className="header-page-title">{getPageTitle()}</h1>
                <div className="header-breadcrumb">
                  <span>Tawsil</span>
                  <span className="separator">/</span>
                  <span className="current">{getPageTitle()}</span>
                </div>
              </div>
            </div>

            <div className="header-right-zone">
              {/* Authenticated Role Status Badge */}
              {isAdmin && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "#f5f3ff",
                    border: "1px solid #ddd6fe",
                    color: "#5b21b6",
                    padding: "6px 14px",
                    borderRadius: "10px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                  }}
                >
                  <FaUserShield style={{ color: "#7c3aed" }} />
                  <span>Administrateur · Boutique Principale</span>
                </div>
              )}

              {isDriver && (
                <div
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
                  <span>
                    Livreur : <strong>{currentDriver.name || "Actif"}</strong>
                  </span>
                </div>
              )}

              {isB2B && (
                <div
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
                  <span>Espace Boutique Partenaire B2B</span>
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
                          : isDriver
                          ? "#059669"
                          : "#2563eb",
                    }}
                  >
                    {isAdmin
                      ? "Compte Administrateur / Boutique"
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
              <Route exact path="/" component={isDriver ? Deliveries : Home} />
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
              <Route path="/*" component={isDriver ? Deliveries : Home} />
            </Switch>
          </Content>
        </Container>
      </Container>
    </div>
  );
};

export default App;
