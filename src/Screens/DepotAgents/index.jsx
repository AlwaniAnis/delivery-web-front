import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { Button, Input, Modal, SelectPicker } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import {
  FaPhoneAlt,
  FaWarehouse,
  FaIdCard,
  FaMapMarkerAlt,
  FaEnvelope,
  FaUserPlus,
  FaExternalLinkAlt,
} from "react-icons/fa";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import { DepotAgentsList, DEFAULT_DEPOT_AGENTS } from "../../Atoms/depotAgents.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { currentDepotIdState } from "../../Atoms/auth.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import AddEdit from "./AddEdit.component";
import ResetPassword from "../Auth/ResetPassword";

export default function DepotAgents() {
  const history = useHistory();
  const [agents, setAgents] = useRecoilState(DepotAgentsList);
  const depots = useRecoilValue(preparationPlacesState);
  const setCurrentDepotId = useSetRecoilState(currentDepotIdState);

  const [filterModel, setFilterModel] = useState({
    q: "",
    depotId: 0,
    page: 1,
    take: 20,
  });
  const [error, setError] = useState("");
  const [model, setModel] = useState({
    cin: "",
    phone1: "",
    phone2: "",
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    preparationPlaceId: 1,
    depotId: 1,
    isActive: true,
  });

  const [userModel, setUserModel] = useState({
    email: "",
    firstName: "",
    lastName: "",
    userName: "",
    username: "",
    password: "",
    role: "DepotAgent",
    position: "DepotAgent",
    depotAgentId: null,
    preparationPlaceId: 1,
  });

  const [state, setState] = useRecoilState(exportAddAtom);
  const [showUserModal, setShowUserModal] = useState(0);

  const persistAgents = (nextList) => {
    setAgents(nextList);
    try {
      localStorage.setItem("tawsil_depot_agents", JSON.stringify(nextList));
    } catch (e) {}
  };

  const reset = () => {
    setModel({
      cin: "",
      phone1: "",
      phone2: "",
      email: "",
      firstName: "",
      lastName: "",
      address: "",
      preparationPlaceId: 1,
      depotId: 1,
      isActive: true,
    });
    setError("");
  };

  const fetch = () => {
    setState((prev) => ({ ...prev, loading: true }));
    APi.createAPIEndpoint(APi.ENDPOINTS.DepotAgent + "/getAll")
      .customGet()
      .then((res) => {
        const list = res.data?.data || res.data;
        if (Array.isArray(list)) {
          persistAgents(list);
        }
        setState((prev) => ({ ...prev, loading: false }));
      })
      .catch(() => {
        APi.createAPIEndpoint(APi.ENDPOINTS.DepotAgent, filterModel)
          .fetchAll()
          .then((res) => {
            const list = res.data?.data || res.data;
            if (Array.isArray(list)) {
              persistAgents(list);
            }
          })
          .finally(() => {
            setState((prev) => ({ ...prev, loading: false }));
          });
      });
  };

  useEffect(() => {
    fetch();
  }, []);

  const save = () => {
    if (!model.firstName && !model.lastName) {
      setError("Veuillez renseigner le nom et prénom de l'agent de dépôt.");
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    const payload = {
      ...model,
      preparationPlaceId: Number(model.preparationPlaceId || model.depotId || 1),
      depotId: Number(model.preparationPlaceId || model.depotId || 1),
    };

    if (model.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.DepotAgent)
        .update(model.id, payload)
        .then(() => {
          const next = agents.map((a) => (a.id === model.id ? { ...a, ...payload } : a));
          persistAgents(next);
          setState((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Agent de dépôt modifié !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch(() => {
          const next = agents.map((a) => (a.id === model.id ? { ...a, ...payload } : a));
          persistAgents(next);
          setState((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Agent de dépôt modifié !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    } else {
      APi.createAPIEndpoint(APi.ENDPOINTS.DepotAgent)
        .create(payload)
        .then((res) => {
          const created = res.data?.id ? res.data : { ...payload, id: Date.now() };
          persistAgents([created, ...agents]);
          reset();
          setState((prev) => ({ ...prev, open: false, loading: false }));
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Agent de dépôt ajouté !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch(() => {
          const created = { ...payload, id: Date.now() };
          persistAgents([created, ...agents]);
          reset();
          setState((prev) => ({ ...prev, open: false, loading: false }));
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Agent de dépôt ajouté !",
            showConfirmButton: false,
            timer: 1500,
          });
        });
    }
  };

  const deleteAction = (id) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.DepotAgent)
      .delete(id)
      .then(() => {
        persistAgents(agents.filter((el) => el.id !== id));
        Swal.fire("Supprimé !", "L'agent de dépôt a été retiré.", "success");
      })
      .catch(() => {
        persistAgents(agents.filter((el) => el.id !== id));
        Swal.fire("Supprimé !", "L'agent de dépôt a été retiré.", "success");
      });
  };

  const getById = (id) => {
    setError("");
    const found = agents.find((el) => el.id === id);
    if (found) setModel({ ...found });
  };

  // Filtered rows
  const filteredAgents = (agents || []).filter((a) => {
    const placeId = Number(a.preparationPlaceId || a.depotId || 1);
    if (filterModel.depotId && Number(filterModel.depotId) !== 0 && placeId !== Number(filterModel.depotId)) {
      return false;
    }
    if (!filterModel.q.trim()) return true;
    const q = filterModel.q.toLowerCase().trim();
    const fullName = `${a.firstName || ""} ${a.lastName || ""}`.toLowerCase();
    const cin = (a.cin || "").toLowerCase();
    const phone = `${a.phone1 || ""} ${a.phone2 || ""}`.toLowerCase();
    const email = (a.email || "").toLowerCase();
    const depot = depots.find((d) => d.id === placeId);
    const depotName = (depot?.name || "").toLowerCase();
    return (
      fullName.includes(q) ||
      cin.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      depotName.includes(q)
    );
  });

  const columns = [
    {
      value: "firstName",
      value2: "lastName",
      value3: "cin",
      name: "Agent de Dépôt",
      render: (v, v2, v3) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "#fffbeb",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.85rem",
              border: "1px solid #fde68a",
              flexShrink: 0,
            }}
          >
            {`${(v?.[0] || "").toUpperCase()}${(v2?.[0] || "").toUpperCase()}`}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
              {`${v || ""} ${v2 || ""}`}
            </div>
            {v3 && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.72rem",
                  color: "#64748b",
                  background: "#f1f5f9",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  marginTop: "2px",
                }}
              >
                <FaIdCard size={10} /> CIN: {v3}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      value: "preparationPlaceId",
      value2: "depotId",
      name: "Dépôt Assigné",
      render: (pId, dId) => {
        const placeId = Number(pId || dId || 1);
        const depot = depots.find((d) => d.id === placeId);
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#fffbeb",
              color: "#b45309",
              border: "1px solid #fde68a",
              padding: "4px 10px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 700,
            }}
          >
            <FaWarehouse size={12} />
            {depot ? depot.name : `Dépôt #${placeId}`}
          </span>
        );
      },
    },
    {
      value: "phone1",
      value2: "phone2",
      name: "Téléphones",
      render: (p1, p2) => (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {p1 ? (
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
              href={`tel:${p1}`}
            >
              <FaPhoneAlt size={10} /> {p1}
            </a>
          ) : (
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
          )}
          {p2 && (
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
              href={`tel:${p2}`}
            >
              <FaPhoneAlt size={9} /> {p2}
            </a>
          )}
        </div>
      ),
    },
    {
      value: "email",
      name: "Email",
      render: (v) => (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#475569", fontSize: "0.82rem" }}>
          {v ? (
            <>
              <FaEnvelope size={11} style={{ color: "#94a3b8" }} />
              <span>{v}</span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>
      ),
    },
    {
      value: "address",
      name: "Adresse / Zone",
      render: (v) => (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#64748b", fontSize: "0.82rem" }}>
          {v ? (
            <>
              <FaMapMarkerAlt size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span>{v}</span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Filter search={() => fetch()}>
        <div className="p-10" style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: "240px", flex: 1 }}>
            <Input
              placeholder="Rechercher par nom, CIN, téléphone, dépôt..."
              value={filterModel.q}
              onChange={(q) => {
                setFilterModel((prev) => ({ ...prev, q }));
              }}
            />
          </div>
          <div style={{ minWidth: "240px" }}>
            <SelectPicker
              data={[{ label: "Tous les dépôts", value: 0 }].concat(
                depots.map((d) => ({ label: d.name, value: d.id }))
              )}
              block
              searchable={false}
              value={filterModel.depotId}
              onChange={(depotId) => {
                setFilterModel((prev) => ({ ...prev, depotId: depotId || 0 }));
              }}
            />
          </div>
        </div>
      </Filter>

      <ExportAdd
        size="md"
        title="Ajouter un Agent de Dépôt"
        noExport
        save={save}
        AddComponent={
          <AddEdit error={error} model={model} _setmodel={setModel} />
        }
      />

      <Grid
        editAction={(id) => {
          getById(id);
          setState((prev) => ({ ...prev, open: true }));
        }}
        deleteAction={deleteAction}
        actionKey="id"
        actions={[
          {
            label: "Créer Compte",
            action: (dataKey) => {
              const m = agents.find((el) => el.id === dataKey);
              if (!m) return;
              const _m = {
                ...m,
                userName: m.userName || m.email || `agent_${m.firstName?.toLowerCase() || dataKey}`,
                username: m.userName || m.email || `agent_${m.firstName?.toLowerCase() || dataKey}`,
                phoneNumber: m.phone1 || "",
                role: "DepotAgent",
                position: "DepotAgent",
                depotAgentId: dataKey,
                preparationPlaceId: m.preparationPlaceId || m.depotId || 1,
              };
              delete _m.id;
              setUserModel(_m);
              setShowUserModal(dataKey);
            },
            render: (v) => (
              <button
                style={{
                  color: "rgba(67,55,160,1)",
                  padding: "6px 10px",
                  fontSize: "12px",
                  background: "rgba(67,55,160,0.1)",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <FaUserPlus size={11} /> {v}
              </button>
            ),
          },
        ]}
        columns={columns}
        rows={filteredAgents}
      />

      <div style={{ padding: 20, background: "#fff" }}>
        <Pagination
          prev
          next
          first
          last
          ellipsis
          boundaryLinks
          maxButtons={5}
          size="md"
          layout={["total", "-", "limit", "|", "pager", "skip"]}
          total={filteredAgents.length}
          limitOptions={[10, 20, 50, 100]}
          limit={filterModel.take}
          activePage={filterModel.page}
          onChangePage={(page) => {
            window.scrollTo(0, 0);
            setFilterModel((prev) => ({ ...prev, page }));
          }}
          onChangeLimit={(take) => {
            setFilterModel((prev) => ({ ...prev, take }));
          }}
        />
      </div>

      {showUserModal ? (
        <Modal
          size="md"
          overflow={false}
          style={{ maxHeight: "calc(100vh - 50px)", overflow: "auto" }}
          open={showUserModal > 0}
          onClose={() => {
            setShowUserModal(0);
          }}
        >
          <Modal.Header>
            <Modal.Title>
              Créer un Compte Utilisateur pour {userModel.firstName} {userModel.lastName}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div style={{ maxHeight: "calc(100vh - 240px)", overflow: "auto" }}>
              <div style={{ marginBottom: "12px" }}>
                <label>Identifiant / Nom d'utilisateur :</label>
                <Input
                  value={userModel.userName || ""}
                  onChange={(userName) =>
                    setUserModel((prev) => ({ ...prev, userName, username: userName }))
                  }
                />
              </div>
              <ResetPassword model={userModel} setmodel={setUserModel} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => {
                setShowUserModal(0);
              }}
              appearance="subtle"
            >
              Fermer
            </Button>
          </Modal.Footer>
        </Modal>
      ) : null}
    </div>
  );
}
