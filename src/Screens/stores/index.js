import React, { useEffect, useState } from "react";
import { useRecoilState } from "recoil";
import { Button, Input, Modal } from "rsuite";
import Pagination from "rsuite/Pagination";
import Swal from "sweetalert2";
import { APi } from "../../Api/";
import { exportAddAtom } from "../../Atoms/exportAdd.atom";
import ExportAdd from "../../Components/Common/ExportAdd";
import Filter from "../../Components/Common/Filter";
import Grid from "../../Components/Grid";
import validate from "../../Helpers/validate";
import AddEdit from "./AddEdit.component";
import ResetPassword from "../Auth/ResetPassword";
export default function Stores(props) {
  // STATE
  const [data, setdata] = useState([]);
  const [totalCount, settotalCount] = useState(0);
  const [filterModel, setfilterModel] = useState({ q: "", page: 1, take: 20 });
  // --- add edit model ---
  const [error, setError] = useState("");
  const [model, setmodel] = useState({
    contacts: [],
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
    });
    setError("");
  };
  // API CALLS
  const fetch = () => {
    setstate((prev) => {
      return { ...prev, loading: true };
    });
    APi.createAPIEndpoint(APi.ENDPOINTS.Store, filterModel)
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
    let m = { ...model };

    m.contacts = m.contacts.map((el) => {
      delete el.id;
      return el;
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
    value: "name_fr",
    name: "Nom",
    render: (v) => <a>{v}</a>,
  },
];
