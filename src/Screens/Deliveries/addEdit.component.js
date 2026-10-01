import { Edit } from "@rsuite/icons";
import ImageIcon from "@rsuite/icons/Image";
import TrashIcon from "@rsuite/icons/Trash";
import { useEffect, useState } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { useRecoilState } from "recoil";
import {
  Button,
  Checkbox,
  Divider,
  IconButton,
  Input,
  Message,
  SelectPicker,
  Tag,
} from "rsuite";
import { APi } from "../../Api";
import { DriversList } from "../../Atoms/drivers.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import Grid from "../../Components/Grid";
import Responsive from "../../Components/Responsive";
import { DeliveryStatus } from "../../Constants/types";
import zip_codes from "../../Data/zip_codes.json";
import DeliveryModel from "../../Models/deliveryModel";
import useB2B from "../../hooks/useB2B";
function AddEdit({ _setmodel, error, model = new DeliveryModel() }) {
  const { isB2B } = useB2B();

  const [drivers, setDriversList] = useRecoilState(DriversList);
  const [depotsList, setDepotsList] = useRecoilState(preparationPlacesState);
  const [data, setdata] = useState([]);

  const [customers, setcustomers] = useState([]);

  const [item, setitem] = useState({
    designation: "",
    qty: 1,
    unitPrice: 0,
    brittle: true,
    weight: 0,
  });
  const fetchHistoric = (customerId) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Delivery, {
      page: 1,
      take: 1000,
      customerId,
    })
      .fetchAll()
      .then((res) => {
        setdata(res.data.data);
      })
      .catch((e) => console.log(e.Message));
  };
  const reset = () => {
    setitem({
      designation: "",
      qty: 1,
      unitPrice: 0,
      brittle: true,
      weight: 0,
    });
  };
  const fetchCustomers = (q) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Customer, { page: 1, take: 100, q })
      .fetchAll()
      .then((res) => {
        setcustomers(res.data.data);
      })
      .catch((e) => console.log(e.Message));
  };
  useEffect(() => {
    if (!model.id)
      _setmodel((prev) => ({ ...prev, qrCodeContent: Date.now().toString() }));
  }, [model.id]);
  return (
    <>
      {" "}
      {error && (
        <Message showIcon type="error">
          {error}
        </Message>
      )}
      <Responsive
        m={5.8}
        xl={5.85}
        l={5.8}
        className="p-10"
        style={{ background: "#f1f1f2" }}
        margin="5px"
      >
        <h6>Informations Produits </h6>

        <label>Code:</label>
        <Input
          onChange={(qrCodeContent) => {
            _setmodel((prev) => {
              return { ...prev, qrCodeContent };
            });
          }}
          value={model.qrCodeContent || ""}
        />
        {model.qrCodeContent ? (
          <div
            style={{ textAlign: "center", padding: "20px", display: "flex", alignItems: "center" }}
          >
            <QRCode value={model.qrCodeContent} size={100} />
            <span style={{ margin: "8px" }}> </span>
            <Barcode value={model.qrCodeContent} />
          </div>
        ) : null}
        {!isB2B && (
          <>
            <label>Livreur </label>
            <SelectPicker
              data={[{ label: "Sélectionner", value: 0 }].concat(
                drivers.map((c) => {
                  return { label: c.firstName + " " + c.lastName, value: c.id };
                })
              )}
              block
              searchable={false}
              value={model.driverId}
              onSelect={(driverId) => {
                _setmodel((prev) => {
                  return { ...prev, driverId };
                });
              }}
            />

            <div style={{ marginTop: "12px", marginBottom: "8px" }}>
              <label style={{ fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                🏬 Dépôt & Lieu de Stockage Actuel :
              </label>
              <SelectPicker
                data={[{ label: "— Aucun (En transit / Non affecté) —", value: 0 }].concat(
                  depotsList.map((d) => ({
                    label: `${d.name} (${d.code || "DEP"})`,
                    value: d.id,
                  }))
                )}
                block
                searchable={true}
                placeholder="Choisir le dépôt (ex: Dépôt Tunis, Sousse...)"
                value={model.preparationPlaceId || 0}
                onSelect={(val) => {
                  _setmodel((prev) => ({
                    ...prev,
                    preparationPlaceId: val === 0 ? null : val,
                  }));
                }}
              />
              <small style={{ color: "#64748b", fontSize: "0.75rem", marginTop: "2px", display: "block" }}>
                Permet de savoir dans quel dépôt le colis est actuellement stocké ou préparé.
              </small>
            </div>
          </>
        )}
        <label style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
          <Checkbox
            style={{ marginRight: "10px" }}
            onChange={(val, checked) => {
              _setmodel((prev) => ({
                ...prev,
                exchangeable: checked,
              }));
            }}
            checked={Boolean(model.exchangeable)}
          />
          Échangeable
        </label>
        <br />
        <label>Date Debut De Procédure:</label>
        <Input
          onChange={(beginProcessDate) => {
            _setmodel((prev) => {
              return { ...prev, beginProcessDate };
            });
          }}
          type="date"
          value={
            model.beginProcessDate
              ? typeof model.beginProcessDate === "string"
                ? model.beginProcessDate.split("T")[0]
                : new Date(model.beginProcessDate).toISOString().split("T")[0]
              : ""
          }
        />
        <label>Remarque:</label>
        <Input
          onChange={(remark) => {
            _setmodel((prev) => {
              return { ...prev, remark };
            });
          }}
          as="textarea"
          value={model.remark || ""}
        />
        <label>Liste Des Produits / Services :</label>
        <div style={{ background: "rgb(0,169,141,0.2)", padding: "5px" }}>
          <label>Désignation:</label>
          <Input
            as="textarea"
            onChange={(designation) => {
              setitem((prev) => {
                return { ...prev, designation };
              });
            }}
            value={item.designation || ""}
          />
          <Responsive s={4} m={4} l={4} xl={4} className="p-5">
            <label>Quantité:</label>

            <Input
              type="number"
              onChange={(qty) => {
                setitem((prev) => {
                  return { ...prev, qty: parseInt(qty) || 0 };
                });
              }}
              value={item.qty ?? 1}
            />
          </Responsive>
          <Responsive s={4} m={4} l={4} xl={4} className="p-5">
            <label>Prix:</label>
            <Input
              step="0.1"
              type="number"
              onChange={(unitPrice) => {
                setitem((prev) => {
                  return { ...prev, unitPrice: parseFloat(unitPrice) || 0 };
                });
              }}
              value={item.unitPrice ?? 0}
            />
          </Responsive>
          <Responsive s={4} m={4} l={4} xl={4} className="p-5">
            <label>Poids :</label>
            <Input
              step="0.1"
              type="number"
              onChange={(weight) => {
                setitem((prev) => {
                  return { ...prev, weight: parseFloat(weight) || 0 };
                });
              }}
              value={item.weight ?? 0}
            />
          </Responsive>
          <label style={{ display: "flex", alignItems: "center", marginTop: "5px" }}>
            <Checkbox
              style={{ marginRight: "10px" }}
              onChange={(val, checked) => {
                setitem((prev) => ({
                  ...prev,
                  brittle: checked,
                }));
              }}
              checked={Boolean(item.brittle)}
            />
            Fragile
          </label>
          <br />
          <div style={{ textAlign: "right", margin: "5px" }}>
            <Button
              color="green"
              onClick={() => {
                _setmodel((prev) => ({
                  ...prev,
                  coliItems: item.index
                    ? [
                        ...prev.coliItems.map((el) => {
                          if (el.index !== item.index) return el;
                          else return item;
                        }),
                      ]
                    : [
                        ...prev.coliItems,
                        {
                          ...item,
                          index: Date.now(),
                        },
                      ],
                }));
                reset();
              }}
            >
              {item.index ? "modifier" : "ajouter"}
            </Button>
          </div>
        </div>
        <table>
          <thead>
            <tr style={{ background: "#454599", color: "#fff" }}>
              <th>Désignation</th>
              <th>Qté</th>
              <th>Prix</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(model.coliItems || []).map((el, idx) => (
              <tr key={el.index || idx} style={{ color: "#454599" }}>
                <td>{el.designation}</td>
                <td>{el.qty}</td>
                <td>{el.unitPrice}</td>
                <td>
                  <IconButton
                    appearance="subtle"
                    onClick={() => setitem(el)}
                    icon={<Edit />}
                    circle
                  />
                  <Divider vertical />
                  <IconButton
                    appearance="subtle"
                    onClick={() =>
                      _setmodel((prev) => ({
                        ...prev,
                        coliItems: prev.coliItems.filter(
                          (el1) => el1.index !== el.index
                        ),
                      }))
                    }
                    icon={<TrashIcon />}
                    circle
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Responsive>
      <Responsive
        m={5.8}
        xl={5.85}
        l={5.8}
        margin="5px"
        className="p-10"
        style={{ background: "#f1f1f2" }}
      >
        <h6>Informations Client</h6>
        <div
          style={{ padding: "8px", background: "#4667d1", borderRadius: "5px" }}
        >
          <label style={{ color: "#fff" }}>
            Trouver un client correspendant:
          </label>
          <div style={{ display: "flex" }}>
            <SelectPicker
              style={{ flex: 1 }}
              data={[{ label: "Sélectionner", value: 0 }].concat(
                customers.map((c) => {
                  return {
                    label:
                      c.fullName +
                      " ( " +
                      c.phoneNumber +
                      "/" +
                      c.phoneNumber2 +
                      ")",

                    value: c.id,
                  };
                })
              )}
              block
              onSearch={(q) => fetchCustomers(q)}
              value={model.customerId}
              onSelect={(customerId) => {
                fetchHistoric(customerId);
                _setmodel((prev) => {
                  return {
                    ...prev,
                    customerId,
                    customer: { ...customers.find((c) => c.id == customerId) },
                  };
                });
              }}
            />
          </div>
        </div>
        <label className="required">Nom Complet :</label>
        <Input
          onChange={(fullName) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, fullName } };
            });
          }}
          value={model.customer?.fullName || ""}
        />
        <label>Email:</label>
        <Input
          onChange={(email) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, email } };
            });
          }}
          value={model.customer?.email || ""}
          type="email"
        />
        <label className="required">Téléphone 1:</label>
        <Input
          value={model.customer?.phoneNumber || ""}
          onChange={(phoneNumber) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, phoneNumber } };
            });
          }}
          type="tel"
        />
        <label>Téléphone 2:</label>
        <Input
          value={model.customer?.phoneNumber2 || ""}
          onChange={(phoneNumber2) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, phoneNumber2 } };
            });
          }}
          type="tel"
        />
        <Responsive m={6} l={6} xl={6} className="p-5">
          <label className="required">Gouvernerat </label>
          <SelectPicker
            data={[{ label: "Sélectionner", value: 0 }].concat(
              zip_codes.map((c) => {
                return {
                  label: c.name.toUpperCase(),
                  value: c.name.toUpperCase(),
                };
              })
            )}
            block
            searchable={false}
            value={(model.customer?.city || "").toUpperCase()}
            onSelect={(city) => {
              _setmodel((prev) => ({
                ...prev,
                customer: {
                  ...prev.customer,
                  city,
                  deleg: "",
                  ville: "",
                  zipCode: "",
                },
              }));
            }}
          />
        </Responsive>

        {model.customer?.city ? (
          <Responsive m={6} l={6} xl={6} className="p-5">
            <label>Délégation </label>
            <SelectPicker
              data={[{ label: "Sélectionner", value: 0 }].concat(
                zip_codes.find(
                  (el) =>
                    el.name.toUpperCase() == (model.customer?.city || "").toUpperCase()
                )
                  ? zip_codes
                      .find(
                        (el) =>
                          el.name.toUpperCase() ==
                          (model.customer?.city || "").toUpperCase()
                      )
                      .delegs.map((c) => {
                        return {
                          label: Object.keys(c)[0],
                          value: Object.keys(c)[0],
                        };
                      })
                  : []
              )}
              block
              searchable={false}
              value={model.customer?.deleg || ""}
              onSelect={(deleg) => {
                _setmodel((prev) => ({
                  ...prev,
                  customer: { ...prev.customer, deleg, ville: "", zipCode: "" },
                }));
              }}
            />
          </Responsive>
        ) : (
          ""
        )}
        {model.customer?.deleg && model.customer?.city ? (
          <Responsive m={6} l={6} xl={6} className="p-5">
            <label>Ville </label>
            <SelectPicker
              data={[{ label: "Sélectionner", value: 0 }].concat(
                zip_codes.find(
                  (el) =>
                    el.name.toUpperCase() == (model.customer?.city || "").toUpperCase()
                )
                  ? zip_codes
                      .find(
                        (el) =>
                          el.name.toUpperCase() ==
                          (model.customer?.city || "").toUpperCase()
                      )
                      .delegs.find(
                        (d) => Object.keys(d)[0] == model.customer.deleg
                      )
                    ? zip_codes
                        .find(
                          (el) =>
                            el.name.toUpperCase() ==
                            (model.customer?.city || "").toUpperCase()
                        )
                        .delegs.find(
                          (d) => Object.keys(d)[0] == model.customer.deleg
                        )
                        [model.customer.deleg].map((c) => {
                          return {
                            label: c.Cite,
                            value: c.Cite,
                          };
                        })
                    : []
                  : []
              )}
              block
              searchable={false}
              value={model.customer?.ville || ""}
              onSelect={(ville) => {
                _setmodel((prev) => ({
                  ...prev,
                  customer: {
                    ...prev.customer,
                    ville,
                    zipCode:
                      zip_codes.find((el) => el.name == model.customer.city) &&
                      zip_codes.find((el) => el.name == model.customer.city)
                        .delegs &&
                      zip_codes
                        .find((el) => el.name == model.customer.city)
                        .delegs.find(
                          (d) => Object.keys(d)[0] == model.customer.deleg
                        ) &&
                      zip_codes
                        .find((el) => el.name == model.customer.city)
                        .delegs.find(
                          (d) => Object.keys(d)[0] == model.customer.deleg
                        )[model.customer.deleg] &&
                      zip_codes
                        .find((el) => el.name == model.customer.city)
                        .delegs.find(
                          (d) => Object.keys(d)[0] == model.customer.deleg
                        )
                        [model.customer.deleg].find((el) => el.Cite == ville)
                        ? zip_codes
                            .find((el) => el.name == model.customer.city)
                            .delegs.find(
                              (d) => Object.keys(d)[0] == model.customer.deleg
                            )
                            [model.customer.deleg].find(
                              (el) => el.Cite == ville
                            ).zip
                        : "",
                  },
                }));
              }}
            />
          </Responsive>
        ) : (
          ""
        )}
        <Responsive m={6} l={6} xl={6} className="p-5">
          <label>Zip Code :</label>
          <Input
            width={100}
            type="number"
            onChange={(zipCode) => {
              _setmodel((prev) => {
                return { ...prev, customer: { ...prev.customer, zipCode } };
              });
            }}
            value={model.customer?.zipCode || ""}
          />
        </Responsive>
        <br></br>
        <label>Addresse :</label>
        <Input
          onChange={(address) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, address } };
            });
          }}
          as="textarea"
          value={model.customer?.address || ""}
        />
        <h5>Historique de client </h5>
        <Grid columns={columns} rows={data} />
      </Responsive>
      <br></br>
      {error && (
        <Message showIcon type="error">
          {error}
        </Message>
      )}
    </>
  );
}

export default AddEdit;
const columns = [
  {
    value: "qrCodeContent",

    name: "Code",
    render: (v) => (
      <b style={{ display: "flex", alignItems: "center" }}>
        <div style={{ padding: "0 5px", color: "#00a98d" }}>{v}</div>
      </b>
    ),
  },
  {
    value: "status",
    name: "Statut",
    render: (v) => (
      <>
        <Tag
          color={
            v == 1
              ? "yellow"
              : v == 2
              ? "green"
              : v == 3
              ? "violet"
              : v == 4
              ? "orange"
              : v == 5
              ? "red"
              : "blue"
          }
        >
          {v && DeliveryStatus.find((el) => el.value == v).label}
        </Tag>
      </>
    ),
  },
  {
    value: "driver",

    name: "Livreur",
    render: (v) => (
      <b style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            fontSize: "15px",
            border: "1px dashed #888",
            borderRadius: "50%",
            width: "43px",
            height: "43px",
            textAlign: "center",
            lineHeight: "42px",
          }}
        >
          <ImageIcon color="#3598ff"></ImageIcon>
        </div>

        <div style={{ padding: "0 5px" }}>
          {v && v.firstName + "  " + v.lastName}
        </div>
      </b>
    ),
  },
];
