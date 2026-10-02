import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Button, Input, Modal } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import { FaPhoneAlt, FaTruck, FaIdCard, FaMapMarkerAlt, FaEnvelope, FaWallet } from "react-icons/fa";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import validate from "../../Helpers/validate";
import AddEdit from "./AddEdit.component";
import ResetPassword from "../Auth/ResetPassword";
export default function Drivers(props) {
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
    solde: 0,
    Solde: 0,
    isPicker: false,
    tarifId: null,
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
      solde: 0,
      Solde: 0,
      isPicker: false,
      tarifId: null,
    });
    setError("");
  };
  // API CALLS
  const fetch = () => {
    setstate((prev) => {
      return { ...prev, loading: true };
    });
    APi.createAPIEndpoint(APi.ENDPOINTS.Driver, filterModel)
      .fetchAll()
      .then((res) => {
        setdata(res.data.data);
        setstate((prev) => {
          return { ...prev, loading: false };
        });
        settotalCount(res.data.totalCount);
      })
      .catch((e) => {
        setError(e.Message);
        setstate((prev) => {
          return { ...prev, loading: false };
        });
      });
  };
  const save = () => {
    setstate((prev) => {
      return { ...prev, loading: true };
    });
    if (model.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Driver)
        .update(model.id, model)
        .then((res) => {
          fetch();
          setstate((prev) => {
            return { ...prev, open: false, loading: false };
          });
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Élément a été bien modifié !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch((e) => {
          setError(e.Message);
          setstate((prev) => {
            return { ...prev, loading: false };
          });
        });
    } else {
      APi.createAPIEndpoint(APi.ENDPOINTS.Driver)
        .create(model)
        .then((res) => {
          fetch();
          reset();
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Element a été bien ajouté !",
            showConfirmButton: false,
            timer: 1500,
          });
          setstate((prev) => {
            return { ...prev, open: false, loading: false };
          });
        })
        .catch((e) => {
          setError(e.Message);
          setstate((prev) => {
            return { ...prev, loading: false };
          });
        });
    }
  };
  const deleteAction = (id) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Driver)
      .delete(id)

      .then((res) => {
        fetch();
        Swal.fire("Supprimé !", "", "success");
      })
      .catch((e) => setError(e.Message));
  };
  const getBYId = (id) => {
    setError("");

    setmodel(data.find((el) => el.id == id));
  };
  // LIFE CYCLES
  useEffect(() => fetch(), []);
  return (
    <div>
      <Filter search={() => fetch()}>
        {" "}
        <div className="p-10">
          {" "}
          <Input
            placeholder="recherche"
            onChange={(q) => {
              setfilterModel((prev) => {
                return { ...prev, q };
              });
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
      />{" "}
      <Grid
        editAction={(id) => {
          getBYId(id);

          setstate((prev) => {
            return { ...prev, open: true };
          });
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
        columns={columns}
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
            setfilterModel((prev) => {
              return { ...prev, page };
            });
          }}
          onChangeLimit={(take) => {
            console.log(take);
            setfilterModel((prev) => {
              return { ...prev, take };
            });
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
      ) : (
        ""
      )}
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
    value: "isPicker",
    value2: "IsPicker",
    value3: "tarifId",
    name: "Rôle Ramassage",
    render: (isPicker, IsPicker, tarifId) => {
      const picker = Boolean(isPicker ?? IsPicker);
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {picker ? (
            <span
              style={{
                background: "#eff6ff",
                color: "#1d4ed8",
                border: "1px solid #bfdbfe",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                width: "fit-content",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              📦 Ramasseur (Picker)
            </span>
          ) : (
            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Livreur standard</span>
          )}
          {tarifId ? (
            <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
              Tarif #{tarifId}
            </span>
          ) : null}
        </div>
      );
    },
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
