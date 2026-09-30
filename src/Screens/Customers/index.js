import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Input, SelectPicker, Tag } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
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
            noSearch
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
    name: "Nom Complet",
    render: (v) => (
      <a>
        <b>{v}</b>
      </a>
    ),
  },

  {
    value: "email",
    name: "Email",
    render: (v) => (
      <a href={"mailto:" + v}>
        <b>{v}</b>
      </a>
    ),
  },

  {
    value: "phoneNumber",
    name: "Tél",
    render: (v) => (
      <a href={"tel:" + v}>
        <b style={{ color: "green" }}>{v}</b>
      </a>
    ),
  },
  {
    value: "address",
    name: "Adresse",
    render: (v) => <i style={{ color: "#232323" }}>{v}</i>,
  },
];
