import GearIcon from "@rsuite/icons/Gear";
import PageNextIcon from "@rsuite/icons/PageNext";
import PagePreviousIcon from "@rsuite/icons/PagePrevious";
import React, { useEffect, useState } from "react";
import { BiCamera, BiTrip } from "react-icons/bi";
import { BsMenuButton } from "react-icons/bs";
import { Link, Route, Switch, useLocation } from "react-router-dom";
import { useRecoilState, useSetRecoilState } from "recoil";
import "mapbox-gl/dist/mapbox-gl.css";
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

import { DriversList } from "./Atoms/drivers.atom";
import Deliveries from "./Screens/Deliveries";
import MyMap from "./Screens/Map";
import QRScanner from "./Screens/qrcode";
import { MyStore } from "./Atoms/store.atom";
import Delivred from "./Screens/Delivred";
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
  const setstore = useSetRecoilState(MyStore);
  const [storesList, setstoresList] = useRecoilState(StoresList);

  const [pageTitle, setpageTitle] = useState("Mes Livraisons");
  const location = useLocation();

  useEffect(() => {
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
      // setpageTitle(routes[location.pathname]);
    }, 1000);
  }, [logged]);
  useEffect(() => {
    setExpand(false);
  }, [pageTitle]);

  const AuthGard = (Screen) => (logged ? Screen : <Login />);
  useEffect(() => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Store + "/getDefault")
      .customGet()
      .then((res) => setstore(res.data));
  }, []);
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
                      setactive("deliveries");
                      setpageTitle("Mes Livraisons");
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
                      Mes Livraisons
                    </Link>
                  </Nav.Item>
                  <Nav.Item
                    onClick={() => {
                      setactive("delivred");
                      setpageTitle("Livraisons Non Payées");
                    }}
                    active={active == "delivred"}
                    eventKey="delivred"
                    icon={
                      <span className="side-span">
                        <BiTrip></BiTrip>
                      </span>
                    }
                  >
                    <Link className={"side_link "} to="/delivred">
                      Livraisons Non Payées
                    </Link>
                  </Nav.Item>
                  <Nav.Item
                    onClick={() => {
                      setactive("scan_qrcode");
                      setpageTitle("QrCode Scan");
                    }}
                    active={active == "scan_qrcode"}
                    eventKey="scan_qrcode"
                    icon={
                      <span className="side-span">
                        <BiCamera></BiCamera>
                      </span>
                    }
                  >
                    <Link className={"side_link "} to="/scan_qrcode">
                      QrCode Scan
                    </Link>
                  </Nav.Item>
                  <Nav.Item
                    onClick={() => {
                      setactive("maps");
                      setpageTitle("Trajet");
                    }}
                    active={active == "maps"}
                    eventKey="maps"
                    icon={
                      <span className="side-span">
                        <BiTrip></BiTrip>
                      </span>
                    }
                  >
                    <Link className={"side_link "} to="/maps">
                      Trajet
                    </Link>
                  </Nav.Item>
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
            <Switch>
              <Route
                path="/deliveries"
                render={(props) => AuthGard(<Deliveries {...props} />)}
              />
              <Route
                path="/delivred"
                render={(props) => AuthGard(<Delivred {...props} />)}
              />
              <Route
                path="/scan_qrcode"
                render={(props) => AuthGard(<QRScanner {...props} />)}
              />
              <Route
                path="/maps"
                render={(props) => AuthGard(<MyMap {...props} />)}
              />
              <Route
                path="/*"
                render={(props) => AuthGard(<Deliveries {...props} />)}
              />
            </Switch>
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
