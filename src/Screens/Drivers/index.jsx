import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Button, Input, Modal } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import {
  FaPhoneAlt,
  FaTruck,
  FaIdCard,
  FaMapMarkerAlt,
  FaEnvelope,
  FaWallet,
  FaWarehouse,
} from "react-icons/fa";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDepotIdState, normalizeRole } from "../../Atoms/auth.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import AddEdit from "./AddEdit.component";
import ResetPassword from "../Auth/ResetPassword";

export default function Drivers() {
  const depotsList = useRecoilValue(preparationPlacesState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDepotId = useRecoilValue(currentDepotIdState);
  const isDepotAgent = normalizeRole(activeRole) === "depotAgent";

  // STATE
  const [data, setdata] = useState([]);
  const [totalCount, settotalCount] = useState(0);
  const [filterModel, setfilterModel] = useState({ q: "", page: 1, take: 20 });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useState({
    cin: "",
    phone1: "",
    phone2: "",
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    carNumber: "",
    cities: "",
    solde: 0,
    preparationPlaceId: isDepotAgent ? Number(currentDepotId || 1) : depotsList?.[0]?.id || 1,
  });
  const [userModel, setuserModel] = useState({
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    password: "",
  });

  // ATOMS
  const [state, setstate] = useRecoilState(exportAddAtom);
  const [show, setshow] = useState(0);

  // HELPERS
  const reset = () => {
    setmodel({
      cin: "",
      phone1: "",
      phone2: "",
      email: "",
      firstName: "",
      lastName: "",
      address: "",
      carNumber: "",
      cities: "",
      solde: 0,
      preparationPlaceId: isDepotAgent ? Number(currentDepotId || 1) : depotsList?.[0]?.id || 1,
    });
    setError("");
  };

  // API CALLS
  const fetch = () => {
    setstate((prev) => ({ ...prev, loading: true }));
    const queryParams = isDepotAgent
      ? { ...filterModel, placeId: Number(currentDepotId || 1) }
      : filterModel;
    APi.createAPIEndpoint(APi.ENDPOINTS.Driver, queryParams)
      .fetchAll()
      .then((res) => {
        const raw = res.data?.data || res.data || [];
        const scopedRows = isDepotAgent
          ? raw.filter(
              (d) =>
                !d.preparationPlaceId ||
                Number(d.preparationPlaceId || d.preparationPlace?.id || d.depotId || 1) ===
                  Number(currentDepotId || 1)
            )
          : raw;
        setdata(scopedRows);
        setstate((prev) => ({ ...prev, loading: false }));
        settotalCount(res.data?.totalCount ?? scopedRows.length);
      })
      .catch((e) => {
        setError(e.Message);
        setstate((prev) => ({ ...prev, loading: false }));
      });
  };

  const save = () => {
    const placeId = Number(
      isDepotAgent
        ? currentDepotId || 1
        : model.preparationPlaceId || model.preparationPlace?.id || depotsList?.[0]?.id || 1
    );
    const payload = {
      ...model,
      preparationPlaceId: placeId,
    };
    delete payload.preparationPlace;
    delete payload.tarifId;
    delete payload.TarifId;
    delete payload.tarif;
    delete payload.isPicker;
    delete payload.IsPicker;

    setstate((prev) => ({ ...prev, loading: true }));
    if (model.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Driver)
        .update(model.id, payload)
        .then(() => {
          fetch();
          setstate((prev) => ({ ...prev, open: false, loading: false }));
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Livreur modifié avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch((e) => {
          setError(e.Message);
          setstate((prev) => ({ ...prev, loading: false }));
        });
    } else {
      APi.createAPIEndpoint(APi.ENDPOINTS.Driver)
        .create(payload)
        .then(() => {
          fetch();
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Livreur ajouté avec succès !",
            showConfirmButton: false,
            timer: 1500,
          });
          setstate((prev) => ({ ...prev, open: false, loading: false }));
        })
        .catch((e) => {
          setError(e.Message);
          setstate((prev) => ({ ...prev, loading: false }));
        });
    }
  };

  const deleteAction = (id) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Driver)
      .delete(id)
      .then(() => {
        fetch();
        Swal.fire("Supprimé !", "", "success");
      })
      .catch((e) => setError(e.Message));
  };

  const getBYId = (id) => {
    setError("");
    const found = data.find((el) => el.id == id);
    if (found) {
      setmodel({
        ...found,
        preparationPlaceId: Number(
          found.preparationPlaceId || found.preparationPlace?.id || depotsList?.[0]?.id || 1
        ),
      });
    }
  };

  useEffect(() => {
    fetch();
  }, [currentDepotId, isDepotAgent]);

  const columnsWithDepot = columns.map((col) => {
    if (col.value === "preparationPlaceId") {
      return {
        ...col,
        render: (placeId, preparationPlace) => {
          const resolvedId = Number(placeId || preparationPlace?.id || 1);
          const depotObj =
            preparationPlace ||
            depotsList.find((d) => Number(d.id) === resolvedId) ||
            depotsList[0];
          return (
            <span
              style={{
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                width: "fit-content",
              }}
            >
              <FaWarehouse size={11} style={{ color: "#059669" }} />
              {depotObj?.name || `Dépôt #${resolvedId}`}
            </span>
          );
        },
      };
    }
    return col;
  });

  return (
    <div>
      <Filter search={() => fetch()}>
        <div className="p-10">
          <Input
            placeholder="Recherche livreur..."
            onChange={(q) => {
              setfilterModel((prev) => ({ ...prev, q }));
            }}
          />
        </div>
      </Filter>
      <ExportAdd
        size="md"
        noExport
        save={save}
        AddComponent={
          <AddEdit error={error} model={model} _setmodel={setmodel} />
        }
      />
      <Grid
        editAction={(id) => {
          getBYId(id);
          setstate((prev) => ({ ...prev, open: true }));
        }}
        deleteAction={deleteAction}
        actionKey="id"
        actions={[
          {
            label: "Créer Compte",
            action: (dataKey) => {
              let m = data.find((el) => el.id == dataKey);
              let _m = { ...m, username: m.email, driverId: dataKey };
              delete _m.id;
              setuserModel(_m);
              setshow(dataKey);
            },
            render: (v) => (
              <button
                style={{
                  color: "rgba(67,55,160,1)",
                  padding: "6px 10px",
                  fontSize: "12px",
                  background: "rgba(67,55,160,0.1)",
                  borderRadius: "4px",
                }}
              >
                {v}
              </button>
            ),
          },
        ]}
        columns={columnsWithDepot}
        rows={data}
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
          total={totalCount}
          limitOptions={[10, 20, 50, 100]}
          limit={filterModel.take}
          activePage={filterModel.page}
          onChangePage={(page) => {
            window.scrollTo(0, 0);
            setfilterModel((prev) => ({ ...prev, page }));
          }}
          onChangeLimit={(take) => {
            setfilterModel((prev) => ({ ...prev, take }));
          }}
        />
      </div>
      {show ? (
        <Modal
          size="md"
          overflow={false}
          style={{ maxHeight: "calc(100vh - 50px)", overflow: "auto" }}
          open={show > 0}
          onClose={() => {
            setshow(0);
          }}
        >
          <Modal.Header></Modal.Header>
          <Modal.Body>
            <div style={{ maxHeight: "calc(100vh - 240px)", overflow: "auto" }}>
              <ResetPassword model={userModel} setmodel={setuserModel} />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={() => {
                setshow(0);
              }}
              appearance="subtle"
            >
              Annuler
            </Button>
          </Modal.Footer>
        </Modal>
      ) : null}
    </div>
  );
}

const columns = [
  {
    value: "firstName",
    value2: "lastName",
    value3: "cin",
    name: "Livreur",
    render: (v, v2, v3) => (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
            border: "1px solid #bfdbfe",
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
    value2: "preparationPlace",
    name: "Dépôt (PreparationPlace)",
  },
  {
    value: "phone1",
    value2: "phone2",
    name: "Téléphones",
    render: (p1, p2) => (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {p1 ? (
          <a
            href={`tel:${p1}`}
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
            onClick={(e) => e.stopPropagation()}
          >
            <FaPhoneAlt size={10} /> {p1}
          </a>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
        )}
        {p2 && (
          <a
            href={`tel:${p2}`}
            style={{
              textDecoration: "none",
              color: "#64748b",
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
            onClick={(e) => e.stopPropagation()}
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
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {v ? (
          <a
            href={`mailto:${v}`}
            style={{
              color: "#475569",
              textDecoration: "none",
              fontSize: "0.82rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <FaEnvelope size={11} style={{ color: "#94a3b8" }} />
            <span>{v}</span>
          </a>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
        )}
      </div>
    ),
  },
  {
    value: "carNumber",
    name: "Véhicule / Matricule",
    render: (v) => (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        {v ? (
          <span
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              padding: "3px 8px",
              borderRadius: "6px",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "0.8rem",
              color: "#1e293b",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <FaTruck size={12} style={{ color: "#6366f1" }} />
            {v}
          </span>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Non renseigné</span>
        )}
      </div>
    ),
  },
  {
    value: "address",
    name: "Adresse / Secteur",
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
  {
    value: "solde",
    value2: "Solde",
    value3: "id",
    name: "Solde (TND)",
    render: (solde, Solde, id) => {
      const amount = Number(solde ?? Solde) || 0;
      const isPositive = amount > 0;
      const isNegative = amount < 0;
      return (
        <a
          href={`/driver_payments?driverId=${id}`}
          title="Voir l'historique des règlements de ce chauffeur"
          style={{
            fontWeight: 800,
            fontSize: "0.88rem",
            color: isPositive ? "#059669" : isNegative ? "#dc2626" : "#475569",
            background: isPositive ? "#ecfdf5" : isNegative ? "#fef2f2" : "#f1f5f9",
            border: isPositive ? "1px solid #a7f3d0" : isNegative ? "1px solid #fecaca" : "1px solid #cbd5e1",
            padding: "4px 10px",
            borderRadius: "6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            textDecoration: "none",
          }}
        >
          <FaWallet size={11} /> {amount.toFixed(3)} TND
        </a>
      );
    },
  },
];
