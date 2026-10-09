import React, { useState } from "react";
import { useSetRecoilState } from "recoil";
import { Button, Input, Message } from "rsuite";
import { AuthService } from "../../Api/auth.service";
import { BASE_URL } from "../../Config/api.config";
import {
  isLogged,
  currentUserState,
  activeRoleState,
  currentDriverIdState,
  currentDepotIdState,
  normalizeRole,
} from "../../Atoms/auth.atom";
import {
  FaBox,
  FaServer,
  FaLock,
  FaUser,
  FaUserShield,
  FaTruck,
  FaStore,
  FaWarehouse,
  FaCheckCircle,
} from "react-icons/fa";

export default function Login() {
  const setLogged = useSetRecoilState(isLogged);
  const setCurrentUser = useSetRecoilState(currentUserState);
  const setActiveRole = useSetRecoilState(activeRoleState);
  const setCurrentDriverId = useSetRecoilState(currentDriverIdState);
  const setCurrentDepotId = useSetRecoilState(currentDepotIdState);

  // Selected Profile: 'admin' | 'driver' | 'B2Bclient' | 'depotAgent'
  const [selectedRole, setSelectedRole] = useState("admin");

  const [model, setModel] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setError("");
  };

  const handleLoginSuccess = (userData) => {
    const rawRole = userData?.role || userData?.position || userData?.user?.role || selectedRole;
    const userRole = selectedRole === "depotAgent" ? "depotAgent" : normalizeRole(rawRole);
    const finalizedUser = {
      ...userData,
      role: userRole,
      userName: userData?.userName || userData?.username || model.username,
      fullName: userData?.fullName || userData?.name || userData?.userName || model.username,
      driverId: userData?.driverId || (userRole === "driver" ? userData?.id : null) || null,
      storeId: userData?.storeId || null,
      agentDepotId:
        userData?.agentDepotId ||
        userData?.agentDepot?.id ||
        (userRole === "depotAgent" ? userData?.id : null) ||
        1,
      preparationPlaceId:
        userData?.preparationPlaceId ||
        userData?.agentDepot?.preparationPlaceId ||
        userData?.agentDepot?.depotId ||
        userData?.depotId ||
        1,
      token: userData?.token || (typeof userData === "string" ? userData : null),
      isMainStore: userRole === "admin",
    };

    localStorage.setItem("auth", JSON.stringify(finalizedUser));
    setCurrentUser(finalizedUser);
    setActiveRole(userRole);

    if (userRole === "driver") {
      setCurrentDriverId(finalizedUser.driverId);
    } else {
      setCurrentDriverId(null);
    }

    if (userRole === "depotAgent") {
      setCurrentDepotId(finalizedUser.preparationPlaceId || 1);
    }

    setLogged(true);
    setError("");
  };

  const authenticate = () => {
    if (!model.username || !model.password) {
      setError("Veuillez renseigner le nom d'utilisateur et le mot de passe.");
      return;
    }
    setLoading(true);
    setError("");

    const payload = {
      username: model.username.trim(),
      password: model.password,
    };

    // Route to the corresponding real API endpoint
    let authPromise;
    let endpointName = "Auth/Login";
    if (selectedRole === "driver") {
      endpointName = "Auth/LoginDriver";
      authPromise = AuthService().loginDriver(payload);
    } else if (selectedRole === "B2Bclient") {
      endpointName = "Auth/LoginB2B";
      authPromise = AuthService().loginB2B(payload);
    } else if (selectedRole === "depotAgent") {
      endpointName = "Auth/LoginAgentDepot";
      authPromise = AuthService().loginAgentDepot(payload);
    } else {
      endpointName = "Auth/Login";
      authPromise = AuthService().login(payload);
    }

    authPromise
      .then((res) => {
        setLoading(false);
        const data = res.data;
        if (data?.token || data?.success || typeof data === "string") {
          handleLoginSuccess(data);
        } else if (data?.message) {
          setError(data.message);
        } else {
          handleLoginSuccess(data);
        }
      })
      .catch((err) => {
        setLoading(false);
        const serverError =
          err.response?.data?.message ||
          (typeof err.response?.data === "string" ? err.response?.data : null) ||
          err.message ||
          `Erreur de connexion à l'API (${endpointName}).`;
        setError(serverError);
      });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "36px 32px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.45)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "26px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
              borderRadius: "16px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "26px",
              boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.45)",
              marginBottom: "12px",
            }}
          >
            <FaBox />
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.85rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#0f172a",
            }}
          >
            TAWSIL LOGISTICS
          </h2>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "0.88rem",
              color: "#64748b",
            }}
          >
            Plateforme Unifiée de Livraison Express
          </p>
        </div>

        {/* STEP 1: Select Profile Type */}
        <div style={{ marginBottom: "22px" }}>
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: 700,
              color: "#334155",
              marginBottom: "10px",
              display: "block",
            }}
          >
            Sélectionnez votre type d'accès :
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "8px",
            }}
          >
            {/* Admin Option */}
            <div
              onClick={() => handleSelectRole("admin")}
              style={{
                borderRadius: "14px",
                border:
                  selectedRole === "admin"
                    ? "2px solid #4f46e5"
                    : "1.5px solid #e2e8f0",
                background:
                  selectedRole === "admin" ? "#f5f3ff" : "#f8fafc",
                padding: "12px 6px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {selectedRole === "admin" && (
                <FaCheckCircle
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    color: "#4f46e5",
                    fontSize: "13px",
                  }}
                />
              )}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: selectedRole === "admin" ? "#4f46e5" : "#e2e8f0",
                  color: selectedRole === "admin" ? "#fff" : "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  marginBottom: "6px",
                }}
              >
                <FaUserShield />
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: selectedRole === "admin" ? "#312e81" : "#1e293b",
                }}
              >
                Admin
              </div>
              <div
                style={{
                  fontSize: "0.66rem",
                  color: selectedRole === "admin" ? "#6366f1" : "#64748b",
                  marginTop: "2px",
                  fontWeight: 600,
                }}
              >
                + Boutique
              </div>
            </div>

            {/* Depot Agent Option */}
            <div
              onClick={() => handleSelectRole("depotAgent")}
              style={{
                borderRadius: "14px",
                border:
                  selectedRole === "depotAgent"
                    ? "2px solid #d97706"
                    : "1.5px solid #e2e8f0",
                background:
                  selectedRole === "depotAgent" ? "#fffbeb" : "#f8fafc",
                padding: "12px 6px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {selectedRole === "depotAgent" && (
                <FaCheckCircle
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    color: "#d97706",
                    fontSize: "13px",
                  }}
                />
              )}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: selectedRole === "depotAgent" ? "#d97706" : "#e2e8f0",
                  color: selectedRole === "depotAgent" ? "#fff" : "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  marginBottom: "6px",
                }}
              >
                <FaWarehouse />
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: selectedRole === "depotAgent" ? "#92400e" : "#1e293b",
                }}
              >
                Agent Dépôt
              </div>
              <div
                style={{
                  fontSize: "0.66rem",
                  color: selectedRole === "depotAgent" ? "#d97706" : "#64748b",
                  marginTop: "2px",
                  fontWeight: 600,
                }}
              >
                Stock & Dispatch
              </div>
            </div>

            {/* Driver Option */}
            <div
              onClick={() => handleSelectRole("driver")}
              style={{
                borderRadius: "14px",
                border:
                  selectedRole === "driver"
                    ? "2px solid #10b981"
                    : "1.5px solid #e2e8f0",
                background:
                  selectedRole === "driver" ? "#ecfdf5" : "#f8fafc",
                padding: "12px 6px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {selectedRole === "driver" && (
                <FaCheckCircle
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    color: "#10b981",
                    fontSize: "13px",
                  }}
                />
              )}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: selectedRole === "driver" ? "#10b981" : "#e2e8f0",
                  color: selectedRole === "driver" ? "#fff" : "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  marginBottom: "6px",
                }}
              >
                <FaTruck />
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: selectedRole === "driver" ? "#065f46" : "#1e293b",
                }}
              >
                Livreur
              </div>
              <div
                style={{
                  fontSize: "0.66rem",
                  color: selectedRole === "driver" ? "#059669" : "#64748b",
                  marginTop: "2px",
                  fontWeight: 600,
                }}
              >
                Tournées & GPS
              </div>
            </div>

            {/* Store Option */}
            <div
              onClick={() => handleSelectRole("B2Bclient")}
              style={{
                borderRadius: "14px",
                border:
                  selectedRole === "B2Bclient"
                    ? "2px solid #3b82f6"
                    : "1.5px solid #e2e8f0",
                background:
                  selectedRole === "B2Bclient" ? "#eff6ff" : "#f8fafc",
                padding: "12px 6px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
                position: "relative",
              }}
            >
              {selectedRole === "B2Bclient" && (
                <FaCheckCircle
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    color: "#3b82f6",
                    fontSize: "13px",
                  }}
                />
              )}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: selectedRole === "B2Bclient" ? "#3b82f6" : "#e2e8f0",
                  color: selectedRole === "B2Bclient" ? "#fff" : "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  marginBottom: "6px",
                }}
              >
                <FaStore />
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  color: selectedRole === "B2Bclient" ? "#1e3a8a" : "#1e293b",
                }}
              >
                Boutique
              </div>
              <div
                style={{
                  fontSize: "0.66rem",
                  color: selectedRole === "B2Bclient" ? "#2563eb" : "#64748b",
                  marginTop: "2px",
                  fontWeight: 600,
                }}
              >
                Partenaire B2B
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2: Credentials Form (Clean input fields, no presets, no fake data) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            authenticate();
          }}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaUser style={{ color: "#64748b" }} /> Identifiant / Nom d'utilisateur
            </label>
            <Input
              name="username"
              placeholder="Nom d'utilisateur"
              value={model.username}
              onChange={(username) => setModel((prev) => ({ ...prev, username }))}
              autoComplete="username"
              style={{ borderRadius: "10px", padding: "10px 14px", height: "42px" }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#334155",
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <FaLock style={{ color: "#64748b" }} /> Mot de passe
            </label>
            <Input
              name="password"
              type="password"
              placeholder="Mot de passe"
              value={model.password}
              onChange={(password) => setModel((prev) => ({ ...prev, password }))}
              autoComplete="current-password"
              style={{ borderRadius: "10px", padding: "10px 14px", height: "42px" }}
            />
          </div>

          {error && (
            <Message showIcon type="error" style={{ borderRadius: "8px" }}>
              {error}
            </Message>
          )}

          <Button
            appearance="primary"
            type="submit"
            loading={loading}
            style={{
              background:
                selectedRole === "admin"
                  ? "#4f46e5"
                  : selectedRole === "depotAgent"
                  ? "#d97706"
                  : selectedRole === "driver"
                  ? "#10b981"
                  : "#2563eb",
              color: "#fff",
              borderRadius: "10px",
              padding: "12px",
              fontWeight: 800,
              fontSize: "0.95rem",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
              marginTop: "4px",
              transition: "background 0.2s ease",
            }}
          >
            Se Connecter en tant que{" "}
            {selectedRole === "admin"
              ? "Administrateur"
              : selectedRole === "depotAgent"
              ? "Agent de Dépôt"
              : selectedRole === "driver"
              ? "Livreur"
              : "Boutique"}
          </Button>
        </form>

        <div
          style={{
            marginTop: "20px",
            paddingTop: "14px",
            borderTop: "1px solid #f1f5f9",
            textAlign: "center",
            fontSize: "0.76rem",
            color: "#64748b",
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
        </div>
      </div>
    </div>
  );
}
