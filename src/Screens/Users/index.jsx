import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Tag } from "rsuite";
import Swal from "sweetalert2";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import { DriversList } from "../../Atoms/drivers.atom";
import { StoresList } from "../../Atoms/stores.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Grid from "../../Components/Grid";
import AddEdit from "./AddEdit.component";
import { FaUserShield, FaTruck, FaStore } from "react-icons/fa";

export default function Users() {
  const [data, setData] = useState([]);
  const [state, setState] = useRecoilState(exportAddAtom);
  const drivers = useRecoilValue(DriversList);
  const stores = useRecoilValue(StoresList);

  const [error, setError] = useState("");
  const [model, setModel] = useState({
    role: "driver",
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
      value: "role",
      name: "Rôle & Accès",
      render: (role) => {
        if (role === "admin") {
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
        if (role === "driver") {
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
            <FaStore size={12} /> Client B2B
          </span>
        );
      },
    },
    {
      value: "role",
      value2: "driverId",
      value3: "storeId",
      name: "Affectation Profil",
      render: (role, driverId, storeId) => {
        if (role === "driver") {
          const d = drivers.find((el) => el.id === Number(driverId));
          return (
            <span style={{ fontSize: "0.85rem", color: "#334155" }}>
              {d ? `${d.name || `${d.firstName} ${d.lastName}`} (${d.carNumber || "Auto"})` : `Livreur #${driverId || "Non assigné"}`}
            </span>
          );
        }
        if (role === "B2Bclient") {
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
      <div style={{ marginBottom: "16px" }}>
        <ExportAdd
          noExport
          size="md"
          save={save}
          AddComponent={
            <AddEdit
              drivers={drivers}
              stores={stores}
              error={error}
              model={model}
              _setmodel={setModel}
            />
          }
        />
      </div>

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
          rows={data}
        />
      </div>
    </div>
  );
}
