import { Dashboard } from "@rsuite/icons";
import CreditCardPlusIcon from "@rsuite/icons/CreditCardPlus";
import GearIcon from "@rsuite/icons/Gear";
import PageNextIcon from "@rsuite/icons/PageNext";
import PagePreviousIcon from "@rsuite/icons/PagePrevious";
import PeopleBranchIcon from "@rsuite/icons/PeopleBranch";
import React, { useEffect, useState } from "react";
import { BiTrip } from "react-icons/bi";
import { BsMenuButton } from "react-icons/bs";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import { useRecoilState, useSetRecoilState } from "recoil";
import {
  Container,
  Content,
  Dropdown,
  Header,
  Nav,
  Navbar,
  Sidebar,
  Sidenav,
} from "rsuite";
import { APi } from "./Api";
import "./App.scss";
import { isLogged } from "./Atoms/auth.atom";
import Login from "./Screens/Auth/login";

import Users from "./Screens/Users";
import Home from "./Screens/Dashboard";
import Deliveries from "./Screens/Deliveries";
import Drivers from "./Screens/Drivers";
import Customers from "./Screens/Customers";
import { DriversList } from "./Atoms/drivers.atom";
import OurStore from "./Screens/OurStore";
import { MyStore } from "./Atoms/store.atom";
import NotPaidDeliveries from "./Screens/NotPaid";
import useB2B from "./hooks/useB2B";
import Stores from "./Screens/stores";
import { StoresList } from "./Atoms/stores.atom";
const iconStyles = {
  width: 56,
  height: 56,
  padding: 18,
  lineHeight: "56px",
  textAlign: "center",
};

const App = (props) => {
  const [expand, setExpand] = useState(false);
  const [loaded, setloaded] = useState(false);
  const [active, setactive] = useState(1);
  const [logged, setlogged] = useRecoilState(isLogged);
  const [driversList, setDriversList] = useRecoilState(DriversList);
  const [storesList, setstoresList] = useRecoilState(StoresList);
  const { isB2B } = useB2B();
  const setstore = useSetRecoilState(MyStore);
  const [pageTitle, setpageTitle] = useState("Livraisons");
  const location = useLocation();
  useEffect(() => {
    if (!isB2B) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Store + "/getAll", {})
        .fetchAll()
        .then((res) => {
          setstoresList(res.data);
        });
    }
  }, [isB2B]);
  useEffect(() => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Driver, { page: 1, take: 1000 })
      .fetchAll()
      .then((res) => {
        setDriversList(res.data.data);
      })
      .catch((e) => {});
    let log = true;
    if (
      !localStorage.getItem("auth") ||
      !JSON.parse(localStorage.getItem("auth")).token
    ) {
      log = false;
    } else {
    }
    setlogged(log);
    setTimeout(() => {
      setloaded(true);
      setpageTitle(routes[location.pathname]);
    }, 1000);
  }, [logged]);
  useEffect(() => {
    setExpand(false);
  }, [pageTitle]);

  const AuthGard = (Screen) => (logged ? Screen : <Login />);

  return (
    <div className="app">
      <Container>
        {logged && (
          <Sidebar className={"app-sidebar " + (expand ? "show" : "")}>
            <Sidenav.Header>
              <div className="app-sidebar-header">
                <div>
                  <b style={{ marginLeft: 12, fontSize: "large" }}>Tawsil</b>
                </div>
                <button
                  className="close_menu_btn"
                  onClick={(e) => setExpand((prev) => !prev)}
                >
                  x
                </button>
              </div>
            </Sidenav.Header>
            <Sidenav defaultOpenKeys={["1"]} appearance="subtle">
              <Sidenav.Body>
                <Nav>
                  <Nav.Item
                    onClick={() => {
                      // setExpand(false);
                      setactive("277727");
                      setpageTitle("Notre Boutique");
                    }}
                    active={active == "27777"}
                    eventKey="277727"
                    icon={
                      <span className="side-span">
                        <Dashboard size="3em" />
                      </span>
                    }
                  >
                    <Link className={"side_link "} to="/our_store">
                      Notre Boutique
                    </Link>
                  </Nav.Item>
                  <Nav.Item
                    eventKey="1"
                    onClick={() => {
                      setactive("1");
                      setpageTitle("Dashboard");
                    }}
                    active={active == "1"}
                    icon={
                      <span className="side-span">
                        <Dashboard />
                      </span>
                    }
                  >
                    <Link className={"side_link "} to="/">
                      Dashboard
                    </Link>
                  </Nav.Item>
                  <hr></hr>
                  <Nav.Item
                    onClick={() => {
                      setactive("deliveries");
                      setpageTitle("Livraisons");
                    }}
                    active={active == "deliveries"}
                    eventKey="deliveries"
                    icon={
                      <span className="side-span">
                        <BiTrip></BiTrip>
                      </span>
                    }
                  >
                    <Link className={"side_link "} to="/deliveries">
                      Livraisons
                    </Link>
                  </Nav.Item>

                  <Nav.Item
                    onClick={() => {
                      setactive("deliveries_not_paid");
                      setpageTitle("Livraisons Non Payées");
                    }}
                    active={active == "deliveries_not_paid"}
                    eventKey="deliveries_not_paid"
                    icon={
                      <span className="side-span">
                        <BiTrip></BiTrip>
                      </span>
                    }
                  >
                    <Link className={"side_link "} to="/deliveries_not_paid">
                      Livraisons Non Payées
                    </Link>
                  </Nav.Item>
                  {!isB2B && (
                    <Nav.Item
                      onClick={() => {
                        setactive("drivers");
                        setpageTitle("Livreurs");
                      }}
                      active={active == "drivers"}
                      eventKey="drivers"
                      icon={
                        <span className="side-span">
                          <CreditCardPlusIcon />
                        </span>
                      }
                    >
                      <Link className={"side_link "} to="/drivers">
                        Livreurs
                      </Link>
                    </Nav.Item>
                  )}
                  {!isB2B && (
                    <Nav.Item
                      onClick={() => {
                        setactive("customers");
                        setpageTitle("Clients B2C");
                      }}
                      active={active == "customers"}
                      eventKey="customers"
                      icon={
                        <span className="side-span">
                          <CreditCardPlusIcon />
                        </span>
                      }
                    >
                      <Link className={"side_link "} to="/customers">
                        Clients B2C
                      </Link>
                    </Nav.Item>
                  )}
                  {!isB2B && (
                    <Nav.Item
                      onClick={() => {
                        setactive("stores");
                        setpageTitle("Boutiques");
                      }}
                      active={active == "stores"}
                      eventKey="stores"
                      icon={
                        <span className="side-span">
                          <CreditCardPlusIcon />
                        </span>
                      }
                    >
                      <Link className={"side_link "} to="/stores">
                        Boutiques
                      </Link>
                    </Nav.Item>
                  )}
                </Nav>
              </Sidenav.Body>
            </Sidenav>
            {/* <NavToggle expand={expand} onChange={() => setExpand(!expand)} /> */}
          </Sidebar>
        )}

        <Container className={"hole-container"}>
          {logged && (
            <Header className="page-header">
              <h4>{pageTitle}</h4>

              <div
                style={{
                  display: "inline-flex",
                }}
              >
                <button
                  className="menu_btn"
                  onClick={(e) => setExpand((prev) => !prev)}
                >
                  <BsMenuButton />
                </button>
                <Nav>
                  <Dropdown
                    placement="bottomEnd"
                    trigger="click"
                    icon={<GearIcon size="3em" />}
                    renderTitle={(children) => {
                      return <GearIcon style={iconStyles} />;
                    }}
                  >
                    {/* <Dropdown.Item>Help</Dropdown.Item>
                    <Dropdown.Item>Settings</Dropdown.Item> */}
                    <Dropdown.Item
                      onClick={() => {
                        localStorage.removeItem("auth");
                        setlogged(false);
                      }}
                    >
                      Sign out
                    </Dropdown.Item>
                  </Dropdown>
                </Nav>
              </div>
            </Header>
          )}

          <Content className={"app-content " + (!logged ? "" : "logged")}>
            {isB2B ? (
              <Switch>
                <Route
                  path="/deliveries"
                  render={(props) => AuthGard(<Deliveries {...props} />)}
                />
                <Route
                  path="/deliveries_not_paid"
                  render={(props) => AuthGard(<NotPaidDeliveries {...props} />)}
                />
                <Route
                  path="/our_store"
                  render={(props) => AuthGard(<OurStore {...props} />)}
                />
                <Route
                  path="/*"
                  render={(props) => AuthGard(<Home {...props} />)}
                />
              </Switch>
            ) : (
              <Switch>
                <Route
                  path="/customers"
                  render={(props) => AuthGard(<Customers {...props} />)}
                />
                <Route
                  path="/drivers"
                  render={(props) => AuthGard(<Drivers {...props} />)}
                />
                <Route
                  path="/stores"
                  render={(props) => AuthGard(<Stores {...props} />)}
                />

                <Route
                  path="/deliveries"
                  render={(props) => AuthGard(<Deliveries {...props} />)}
                />
                <Route
                  path="/deliveries_not_paid"
                  render={(props) => AuthGard(<NotPaidDeliveries {...props} />)}
                />
                <Route
                  path="/our_store"
                  render={(props) => AuthGard(<OurStore {...props} />)}
                />
                <Route
                  path="/*"
                  render={(props) => AuthGard(<Home {...props} />)}
                />
              </Switch>
            )}
          </Content>
        </Container>
      </Container>
    </div>
  );
};
const NavToggle = ({ expand, onChange }) => {
  return (
    <Navbar appearance="subtle" className="nav-toggle">
      <Nav pullRight>
        <Nav.Item onClick={onChange} style={{ width: 56, textAlign: "center" }}>
          {expand ? <PagePreviousIcon /> : <PageNextIcon />}
        </Nav.Item>
      </Nav>
    </Navbar>
  );
};
export default App;

const routes = {};
