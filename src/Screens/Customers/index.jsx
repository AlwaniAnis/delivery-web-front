import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Input, SelectPicker, Tag } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import { FaPhoneAlt, FaMapMarkerAlt, FaEnvelope, FaUser } from "react-icons/fa";
import { APi } from "../../Api/";
import { CustomerState } from "../../Atoms/customer.atom";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import Responsive from "../../Components/Responsive";
import AddEdit from "./AddEdit.component";
export default function Customers(props) {
  // STATE
  const [data, setdata] = useState([]);
  const [totalCount, settotalCount] = useState(0);
  const [filterModel, setfilterModel] = useState({
    q: "",
    page: 1,
    take: 20,
  });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useRecoilState(CustomerState);

  // ATOMS
  const [state, setstate] = useRecoilState(exportAddAtom);
  // HELPERS
  const reset = () => {
    setmodel({});
    setError("");
  };
  // API CALLS
  const fetch = () => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Customer, filterModel)
      .fetchAll()
      .then((res) => {
        setdata(res.data.data);
        settotalCount(res.data.totalCount);
      })
      .catch((e) => setError(e.Message));
  };
  const save = () => {
    setstate((prev) => {
      return { ...prev, loading: true };
    });
    if (model.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Customer)
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
      APi.createAPIEndpoint(APi.ENDPOINTS.Customer)
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
    APi.createAPIEndpoint(APi.ENDPOINTS.Customer)
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
        <Responsive className="p-10">
          <label>Nom: </label>

          <Input
            placeholder="recherche"
            onChange={(q) => {
              setfilterModel((prev) => {
                return { ...prev, q };
              });
            }}
          />
        </Responsive>
        {/* <Responsive m={6} l={6} xl={6} className="p-10">
          <label>Type de customer :</label>
          <SelectPicker
            searchable={false}
            data={[{ label: "Tout", value: 0 }].concat(customerTypes)}
            block
            value={filterModel.customerType}
            onSelect={(customerType) => {
              setfilterModel((prev) => {
                return { ...prev, customerType };
              });
            }}
          />
        </Responsive> */}
      </Filter>
      <ExportAdd
        noExport
        size="md"
        save={save}
        AddComponent={<AddEdit error={error} />}
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
        noAdvancedActions // for custom advanced actions
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
          onChangePage={(page) =>
            setfilterModel((prev) => {
              return { ...prev, page };
            })
          }
          onChangeLimit={(take) => {
            console.log(take);
            setfilterModel((prev) => {
              return { ...prev, take };
            });
          }}
        />
      </div>
    </div>
  );
}

const columns = [
  {
    value: "fullName",
    name: "Client",
    render: (v) => (
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "0.82rem",
            border: "1px solid #bfdbfe",
            flexShrink: 0,
          }}
        >
          <FaUser size={13} />
        </div>
        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
          {v || "Client sans nom"}
        </span>
      </div>
    ),
  },
  {
    value: "phoneNumber",
    value2: "phoneNumber2",
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
    value: "city",
    value2: "deleg",
    value3: "ville",
    value4: "zipCode",
    name: "Gouvernorat / Ville",
    render: (city, deleg, ville, zipCode) => (
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <FaMapMarkerAlt size={12} style={{ color: "#ef4444", flexShrink: 0 }} />
        <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.82rem" }}>
          {city || ""}{deleg ? ` - ${deleg}` : ""}{ville ? ` - ${ville}` : ""}{zipCode ? ` (${zipCode})` : ""}
        </span>
      </div>
    ),
  },
  {
    value: "address",
    name: "Adresse",
    render: (v) => (
      <span style={{ color: "#64748b", fontSize: "0.82rem" }}>
        {v || "—"}
      </span>
    ),
  },
  {
    value: "email",
    name: "Email",
    render: (v) => (
      <div>
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
];
