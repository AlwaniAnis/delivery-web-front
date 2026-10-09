import React, { useEffect, useState } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { Button, Input, Modal } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import { FaStore, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaFileInvoice, FaWarehouse, FaCompass, FaExternalLinkAlt } from "react-icons/fa";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDepotIdState, normalizeRole } from "../../Atoms/auth.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import validate from "../../Helpers/validate";
import AddEdit from "./AddEdit.component";
import ResetPassword from "../Auth/ResetPassword";
export default function Stores(props) {
  // STATE
  const depotsList = useRecoilValue(preparationPlacesState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDepotId = useRecoilValue(currentDepotIdState);
  const isDepotAgent = normalizeRole(activeRole) === "depotAgent";
  const [data, setdata] = useState([]);
  const [totalCount, settotalCount] = useState(0);
  const [filterModel, setfilterModel] = useState({ q: "", page: 1, take: 20 });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useState({
    contacts: [],
    preparationPlaceId: isDepotAgent ? Number(currentDepotId || 1) : 1,
    latitude: 36.8065,
    longitude: 10.1815,
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
      contacts: [],
      preparationPlaceId: isDepotAgent ? Number(currentDepotId || 1) : depotsList?.[0]?.id || 1,
      latitude: depotsList?.[0]?.latitude || 36.8065,
      longitude: depotsList?.[0]?.longitude || 10.1815,
    });
    setError("");
  };
  // API CALLS
  const fetch = () => {
    setstate((prev) => {
      return { ...prev, loading: true };
    });
    const queryParams = isDepotAgent
      ? { ...filterModel, placeId: Number(currentDepotId || 1) }
      : filterModel;
    APi.createAPIEndpoint(APi.ENDPOINTS.Store, queryParams)
      .fetchAll()
      .then((res) => {
        const raw = res.data?.data || res.data || [];
        const scoped = isDepotAgent
          ? raw.filter(
              (s) =>
                !s.preparationPlaceId ||
                Number(s.preparationPlaceId || s.preparationPlace?.id || s.depotId || 1) ===
                  Number(currentDepotId || 1)
            )
          : raw;
        setdata(scoped);
        setstate((prev) => {
          return { ...prev, loading: false };
        });
        settotalCount(res.data?.totalCount ?? scoped.length);
      })
      .catch((e) => {
        setError(e.Message);
        setstate((prev) => {
          return { ...prev, loading: false };
        });
      });
  };
  const save = () => {
    const placeId = Number(
      isDepotAgent
        ? currentDepotId || 1
        : model.preparationPlaceId || model.depotId || depotsList?.[0]?.id || 1
    );
    if (!placeId) {
      setError("Veuillez sélectionner le Dépôt du Territoire de la boutique.");
      return;
    }
    setstate((prev) => {
      return { ...prev, loading: true };
    });
    const latVal =
      model.latitude !== undefined && model.latitude !== null && model.latitude !== ""
        ? Number(model.latitude)
        : model.Latitude !== undefined && model.Latitude !== null
        ? Number(model.Latitude)
        : 36.8065;
    const lngVal =
      model.longitude !== undefined && model.longitude !== null && model.longitude !== ""
        ? Number(model.longitude)
        : model.Longitude !== undefined && model.Longitude !== null
        ? Number(model.Longitude)
        : 10.1815;

    let m = {
      ...model,
      preparationPlaceId: placeId,
      depotId: placeId,
      latitude: latVal,
      longitude: lngVal,
    };

    m.contacts = (m.contacts || []).map((el) => {
      const copy = { ...el };
      delete copy.id;
      return copy;
    });
    m.isDefault = false;
    if (m.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Store)
        .update(m.id, m)
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
      APi.createAPIEndpoint(APi.ENDPOINTS.Store)
        .create(m)
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
    APi.createAPIEndpoint(APi.ENDPOINTS.Store)
      .delete(id)

      .then((res) => {
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
        latitude: found.latitude ?? found.Latitude ?? 36.8065,
        longitude: found.longitude ?? found.Longitude ?? 10.1815,
      });
    }
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
        title={model?.id ? `Modifier la Boutique : ${model.name_fr || ""}` : "Ajouter une Boutique Partenaire"}
        ActionOnClose={reset}
        save={save}
        AddComponent={
          <AddEdit error={error} model={model} setmodel={setmodel} />
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
              let _m = {
                username: m.contacts[0] ? m.contacts[0].emails : "",
                storeId: dataKey,
                email: m.contacts[0] ? m.contacts[0].emails : "",
              };
              setuserModel(_m);
              if (m.contacts[0]) setshow(dataKey);
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
        columns={columns.map((col) =>
          col.value === "preparationPlaceId"
            ? {
                ...col,
                render: (val, row) => {
                  const placeId = Number(val || row?.preparationPlaceId || row?.depotId || 1);
                  const depot = depotsList.find((d) => Number(d.id) === placeId) || depotsList[0];
                  return (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        background: "#ecfdf5",
                        color: "#065f46",
                        border: "1px solid #a7f3d0",
                        padding: "3px 9px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                      }}
                    >
                      <FaWarehouse size={11} style={{ color: "#059669" }} />
                      {depot?.name || "Dépôt Central Tunis"}
                    </span>
                  );
                },
              }
            : col
        )}
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
    value: "name_fr",
    value2: "name_ar",
    value3: "logo",
    name: "Boutique Partenaire",
    render: (fr, ar, logo) => (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "#f1f5f9",
            color: "#4f46e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
            border: "1px solid #e2e8f0",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {logo ? (
            <img src={logo} alt={fr} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <FaStore size={15} />
          )}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
            {fr || "Boutique sans nom"}
          </div>
          {ar && (
            <div style={{ fontSize: "0.75rem", color: "#64748b", direction: "rtl" }}>
              {ar}
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    value: "preparationPlaceId",
    name: "Dépôt du Territoire",
  },
  {
    value: "taxCode",
    name: "Matricule Fiscal",
    render: (v) => (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
        {v ? (
          <span
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              padding: "2px 8px",
              borderRadius: "6px",
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "0.78rem",
              color: "#334155",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaFileInvoice size={11} style={{ color: "#6366f1" }} /> {v}
          </span>
        ) : (
          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
        )}
      </div>
    ),
  },
  {
    value: "contacts",
    name: "Téléphones",
    render: (contacts) => {
      const phones = contacts?.[0]?.phones || "";
      const phoneList = phones ? phones.split(",").map((p) => p.trim()) : [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {phoneList.length > 0 ? (
            phoneList.map((p, idx) => (
              <a
                key={idx}
                href={`tel:${p}`}
                style={{
                  textDecoration: "none",
                  color: "#2563eb",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  padding: "2px 7px",
                  borderRadius: "5px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  width: "fit-content",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <FaPhoneAlt size={9} /> {p}
              </a>
            ))
          ) : (
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
          )}
        </div>
      );
    },
  },
  {
    value: "contacts",
    name: "Adresse",
    render: (contacts) => {
      const addr = contacts?.[0]?.address || "";
      return (
        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#64748b", fontSize: "0.82rem", maxWidth: "240px" }}>
          {addr ? (
            <>
              <FaMapMarkerAlt size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{addr}</span>
            </>
          ) : (
            <span>—</span>
          )}
        </div>
      );
    },
  },
  {
    value: "latitude",
    value2: "longitude",
    name: "Position GPS",
    render: (lat, lng, _, row) => {
      const resolvedLat = lat ?? row?.latitude ?? row?.Latitude;
      const resolvedLng = lng ?? row?.longitude ?? row?.Longitude;
      const hasCoords =
        resolvedLat !== undefined &&
        resolvedLat !== null &&
        resolvedLat !== "" &&
        resolvedLng !== undefined &&
        resolvedLng !== null &&
        resolvedLng !== "" &&
        (Number(resolvedLat) !== 0 || Number(resolvedLng) !== 0);

      if (!hasCoords) {
        return <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>Non défini</span>;
      }

      const numLat = Number(resolvedLat).toFixed(4);
      const numLng = Number(resolvedLng).toFixed(4);
      const mapUrl = `https://www.google.com/maps?q=${Number(resolvedLat)},${Number(resolvedLng)}`;

      return (
        <a
          href={mapUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            background: "#eef2ff",
            color: "#4338ca",
            border: "1px solid #c7d2fe",
            padding: "3px 8px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            fontWeight: 700,
            textDecoration: "none",
          }}
          title="Ouvrir la position GPS sur Google Maps"
        >
          <FaCompass size={11} style={{ color: "#4f46e5" }} />
          <span>{numLat}, {numLng}</span>
          <FaExternalLinkAlt size={9} />
        </a>
      );
    },
  },
  {
    value: "contacts",
    name: "Email",
    render: (contacts) => {
      const emails = contacts?.[0]?.emails || "";
      return (
        <div>
          {emails ? (
            <a
              href={`mailto:${emails}`}
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
              <span>{emails}</span>
            </a>
          ) : (
            <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
          )}
        </div>
      );
    },
  },
];
