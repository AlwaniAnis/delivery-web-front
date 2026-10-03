import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Input } from "rsuite";
import Swal from "sweetalert2";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import { DriversList } from "../../Atoms/drivers.atom";
import { StoresList } from "../../Atoms/stores.atom";
import { DepotAgentsList } from "../../Atoms/depotAgents.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Grid from "../../Components/Grid";
import AddEdit from "./AddEdit.component";
import {
  FaUserShield,
  FaTruck,
  FaStore,
  FaWarehouse,
  FaSearch,
  FaTimes,
  FaUsers,
  FaFilter,
} from "react-icons/fa";

export default function Users() {
  const [data, setData] = useState([]);
  const [state, setState] = useRecoilState(exportAddAtom);
  const drivers = useRecoilValue(DriversList);
  const stores = useRecoilValue(StoresList);
  const depotAgents = useRecoilValue(DepotAgentsList);
  const depots = useRecoilValue(preparationPlacesState);

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all"); // 'all' | 'admin' | 'driver' | 'B2Bclient'

  const [error, setError] = useState("");
  const [model, setModel] = useState({
    role: "driver",
    position: "Driver",
    userName: "",
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
  });

  const reset = () => {
    setModel({
      role: "driver",
      position: "Driver",
      userName: "",
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
    });
    setError("");
  };

  const fetchUsers = () => {
    setState((prev) => ({ ...prev, loading: true }));
    APi.createAPIEndpoint(APi.ENDPOINTS.Accounts, { page: 1, take: 1000 })
      .fetchAll()
      .then((res) => {
        setState((prev) => ({ ...prev, loading: false }));
        setData(res.data || []);
      })
      .catch((e) => {
        setState((prev) => ({ ...prev, loading: false }));
        setError(e.Message || "Erreur de chargement");
      });
  };

  const save = () => {
    if (!model.userName) {
      setError("Le nom d'utilisateur est obligatoire.");
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    if (model.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Accounts)
        .update(model.id, model)
        .then(() => {
          fetchUsers();
          setState((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Compte modifié avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch((e) => {
          setState((prev) => ({ ...prev, loading: false }));
          setError(e.Message);
        });
    } else {
      APi.createAPIEndpoint(APi.ENDPOINTS.Accounts)
        .create(model)
        .then(() => {
          fetchUsers();
          reset();
          setState((prev) => ({ ...prev, open: false, loading: false }));
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Compte utilisateur créé avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch((e) => {
          setState((prev) => ({ ...prev, loading: false }));
          setError(e.Message);
        });
    }
  };

  const deleteAction = (id) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Accounts)
      .delete(id)
      .then(() => {
        fetchUsers();
        Swal.fire("Supprimé !", "L'utilisateur a été retiré.", "success");
      })
      .catch((e) => setError(e.Message));
  };

  const getById = (id) => {
    setError("");
    const found = data.find((el) => el.id === id);
    if (found) setModel({ ...found });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter accounts by search query and role
  const filteredUsers = data.filter((u) => {
    const userRolePos = String(u.position || u.role || "").trim().toLowerCase();
    if (roleFilter !== "all" && userRolePos !== roleFilter.toLowerCase()) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const userName = (u.userName || "").toLowerCase();
    const firstName = (u.firstName || "").toLowerCase();
    const lastName = (u.lastName || "").toLowerCase();
    const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
    const email = (u.email || "").toLowerCase();
    const phone = (u.phoneNumber || "").toLowerCase();
    const role = String(u.role || u.position || "").toLowerCase();

    let driverName = "";
    if (u.driverId) {
      const d = drivers.find((el) => el.id === Number(u.driverId));
      if (d) driverName = `${d.firstName || ""} ${d.lastName || ""} ${d.name || ""}`.toLowerCase();
    }

    let storeName = "";
    if (u.storeId) {
      const s = stores.find((el) => el.id === Number(u.storeId));
      if (s) storeName = (s.name_fr || "").toLowerCase();
    }

    let depotAgentName = "";
    if (u.depotAgentId || u.preparationPlaceId) {
      const a = depotAgents.find((el) => el.id === Number(u.depotAgentId));
      const dp = depots.find((el) => el.id === Number(u.preparationPlaceId || a?.preparationPlaceId));
      depotAgentName = `${a?.firstName || ""} ${a?.lastName || ""} ${dp?.name || ""}`.toLowerCase();
    }

    return (
      userName.includes(q) ||
      fullName.includes(q) ||
      email.includes(q) ||
      phone.includes(q) ||
      role.includes(q) ||
      driverName.includes(q) ||
      storeName.includes(q) ||
      depotAgentName.includes(q)
    );
  });

  const columns = [
    {
      value: "userName",
      value2: "firstName",
      value3: "lastName",
      name: "Utilisateur",
      render: (userName, firstName, lastName) => (
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a" }}>
            {firstName || lastName ? `${firstName || ""} ${lastName || ""}` : userName}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontFamily: "monospace" }}>
            @{userName}
          </div>
        </div>
      ),
    },
    {
      value: "position",
      value2: "role",
      name: "Rôle & Accès",
      render: (position, roleVal) => {
        const r = String(position || roleVal || "").toLowerCase();
        if (r === "admin") {
          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "6px",
                background: "#ede9fe",
                color: "#6d28d9",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <FaUserShield size={12} /> Administrateur
            </span>
          );
        }
        if (r === "depotagent" || r.includes("depot")) {
          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "6px",
                background: "#fef3c7",
                color: "#b45309",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <FaWarehouse size={12} /> Agent de Dépôt
            </span>
          );
        }
        if (r === "driver") {
          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "6px",
                background: "#dcfce7",
                color: "#15803d",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              <FaTruck size={12} /> Livreur (Driver)
            </span>
          );
        }
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 10px",
              borderRadius: "6px",
              background: "#dbeafe",
              color: "#1d4ed8",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            <FaStore size={12} /> B2B
          </span>
        );
      },
    },
    {
      value: "position",
      value2: "driverId",
      value3: "storeId",
      value4: "role",
      name: "Affectation Profil",
      render: (position, driverId, storeId, roleVal, row) => {
        const r = String(position || roleVal || "").toLowerCase();
        if (r === "depotagent" || r.includes("depot")) {
          const agent = depotAgents.find((el) => el.id === Number(row?.depotAgentId));
          const placeId = Number(row?.preparationPlaceId || row?.depotId || agent?.preparationPlaceId || 1);
          const dep = depots.find((el) => el.id === placeId);
          return (
            <span style={{ fontSize: "0.85rem", color: "#334155", fontWeight: 600 }}>
              {agent ? `${agent.firstName || ""} ${agent.lastName || ""} · ` : ""}
              <span style={{ color: "#b45309" }}>{dep ? dep.name : `Dépôt #${placeId}`}</span>
            </span>
          );
        }
        if (r === "driver") {
          const d = drivers.find((el) => el.id === Number(driverId));
          return (
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>
              {d ? `${d.name || `${d.firstName || ""} ${d.lastName || ""}`.trim()} (${d.carNumber || "Auto"})` : `Livreur #${driverId || "Non assigné"}`}
            </span>
          );
        }
        if (r === "b2bclient" || r === "b2b") {
          const s = stores.find((el) => el.id === Number(storeId));
          return (
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>
              {s ? s.name_fr : `Boutique #${storeId || "1"}`}
            </span>
          );
        }
        return <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Direction Centrale</span>;
      },
    },
    {
      value: "email",
      name: "Email",
      render: (v) => <span style={{ fontSize: "0.85rem", color: "#475569" }}>{v || "—"}</span>,
    },
    {
      value: "phoneNumber",
      name: "Téléphone",
      render: (v) => <strong style={{ fontSize: "0.85rem", color: "#10b981" }}>{v || "—"}</strong>,
    },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Top Bar with ExportAdd Button */}
      <div style={{ marginBottom: "16px" }}>
        <ExportAdd
          noExport
          size="md"
          title="Ajouter un Compte Utilisateur"
          save={save}
          AddComponent={
            <AddEdit
              drivers={drivers}
              stores={stores}
              depotAgents={depotAgents}
              error={error}
              model={model}
              _setmodel={setModel}
            />
          }
        />
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "14px 18px",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        {/* Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px", maxWidth: "520px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <FaSearch
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                fontSize: "14px",
                zIndex: 2,
              }}
            />
            <input
              type="text"
              placeholder="Filtrer par nom, identifiant, email, téléphone, profil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 36px 9px 34px",
                borderRadius: "8px",
                border: "1.5px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
                background: "#f8fafc",
                transition: "border-color 0.15s ease",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "4px",
                }}
              >
                <FaTimes size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Role Filters Chips */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <FaFilter size={11} /> Filtrer par rôle :
          </span>

          <div style={{ display: "flex", gap: "4px", background: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
            {[
              { id: "all", label: "Tous" },
              { id: "Admin", label: "Admins" },
              { id: "DepotAgent", label: "Agents Dépôt" },
              { id: "Driver", label: "Livreurs" },
              { id: "B2Bclient", label: "Boutiques B2B" },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setRoleFilter(btn.id)}
                style={{
                  background: roleFilter === btn.id ? "#ffffff" : "transparent",
                  color: roleFilter === btn.id ? "#0f172a" : "#64748b",
                  fontWeight: roleFilter === btn.id ? 800 : 500,
                  border: "none",
                  borderRadius: "6px",
                  padding: "5px 10px",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: roleFilter === btn.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "20px",
              background: "#e2e8f0",
              color: "#334155",
            }}
          >
            {filteredUsers.length} / {data.length} compte(s)
          </span>
        </div>
      </div>

      {/* Grid of Users */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <Grid
          editAction={(id) => {
            getById(id);
            setState((prev) => ({ ...prev, open: true }));
          }}
          deleteAction={deleteAction}
          actionKey="id"
          noAdvancedActions
          columns={columns}
          rows={filteredUsers}
        />

        {filteredUsers.length === 0 && (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
            <FaUsers size={36} style={{ color: "#cbd5e1", marginBottom: "8px" }} />
            <div style={{ fontWeight: 600 }}>Aucun compte utilisateur ne correspond à votre recherche.</div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("all");
                }}
                style={{
                  marginTop: "8px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#2563eb",
                  padding: "6px 14px",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Réinitialiser la recherche
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
