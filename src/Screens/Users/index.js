import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Input, SelectPicker, Tag } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Grid from "../../Components/Grid";
import UserModel from "../../Models/UserModel";
import AddEdit from "./AddEdit.component";
export default function Users(props) {
  // STATE
  const [data, setdata] = useState([]);
  const [totalCount, settotalCount] = useState(0);
  const [state, setstate] = useRecoilState(exportAddAtom);
  const [drivers, setdrivers] = useState([]);

  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useState(new UserModel());

  // ATOMS
  // HELPERS
  const reset = () => {
    setmodel(new UserModel());
    setError("");
  };
  // API CALLS
  const fetch = () => {
    setstate((prev) => {
      return { ...prev, loading: true };
    });
    APi.createAPIEndpoint(APi.ENDPOINTS.Accounts, { page: 1, take: 1000 })
      .fetchAll()
      .then((res) => {
        setdata(res.data.filter((u) => u.userName != "admin"));
      })
      .catch((e) => setError(e.Message));
  };
  const save = () => {
    if (model.id) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Accounts)
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
        });
    } else {
      APi.createAPIEndpoint(APi.ENDPOINTS.Accounts)
        .create(model)
        .then((res) => {
          fetch();
          reset();
          setstate((prev) => {
            return { ...prev, open: false, loading: false };
          });
          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "Element a été bien ajouté !",
            showConfirmButton: false,
            timer: 1500,
          });
        })
        .catch((e) => {
          setError(e.Message);
        });
    }
  };
  const deleteAction = (id) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Accounts)
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
  const fetchDrivers = (q, forFilter = true) => {
    if (typeof q == "undefined" || q.length > 2) {
      APi.createAPIEndpoint(APi.ENDPOINTS.Client, { q }, "/autocomplete")
        .customGet()
        .then((res) => setdrivers(res.data));
    }
  };
  // LIFE CYCLES
  useEffect(() => {
    fetch();
    fetchDrivers();
  }, []);
  return (
    <div>
      <ExportAdd
        noExport
        size="md"
        save={save}
        AddComponent={
          <AddEdit
            drivers={drivers}
            fetchDrivers={(q) => fetchDrivers(q)}
            error={error}
            model={model}
            _setmodel={setmodel}
          />
        }
      />
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
    </div>
  );
}

const columns = [
  {
    value: "firstName",
    value2: "lastName",
    name: "Nom",
    render: (v, v1) => <a>{v + " " + v1}</a>,
  },

  {
    value: "email",
    name: "Email",
    render: (v) => <b>{v}</b>,
  },

  {
    value: "phoneNumber",
    name: "Tél",
    render: (v) => <b style={{ color: "green" }}>{v}</b>,
  },
];
