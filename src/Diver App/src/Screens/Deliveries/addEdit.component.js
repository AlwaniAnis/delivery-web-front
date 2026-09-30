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
import DeliveryModel from "../../Models/deliveryModel";
import Responsive from "../../Components/Responsive";
import { cities } from "../../Data/cities";
import { useState } from "react";
import { Edit } from "@rsuite/icons";
import TrashIcon from "@rsuite/icons/Trash";
import { DriversList } from "../../Atoms/drivers.atom";
import { useRecoilState } from "recoil";
import { APi } from "../../Api";
import { BiFileBlank } from "react-icons/bi";
import Grid from "../../Components/Grid";
import ImageIcon from "@rsuite/icons/Image";
import zip_codes from "../../Data/zip_codes.json";
import { DeliveryStatus } from "../../Constants/types";
function AddEdit({ _setmodel, error, model = new DeliveryModel() }) {
  const [drivers, setDriversList] = useRecoilState(DriversList);
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
  return (
    <>
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
          value={model.qrCodeContent}
        />
        {model.qrCodeContent && (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <QRCode value={model.qrCodeContent} size={100} />
          </div>
        )}
        <label>Livreur </label>
        <SelectPicker
          data={[{ label: "Sélectionner", value: 0 }].concat(
            drivers.map((c) => {
              return { label: c.firstName + " " + c.lastName, value: c.id };
            })
          )}
          block
          noSearch
          value={model.driverId}
          onSelect={(driverId) => {
            _setmodel((prev) => {
              return { ...prev, driverId };
            });
          }}
        />
        <label>Designation:</label>
        <Input
          onChange={(designation) => {
            _setmodel((prev) => {
              return { ...prev, designation };
            });
          }}
          value={model.designation}
        />
        <label>Date Debut De Procédure:</label>
        <Input
          onChange={(beginProcessDate) => {
            _setmodel((prev) => {
              return { ...prev, beginProcessDate };
            });
          }}
          type="date"
          value={model.beginProcessDate}
        />
        <label>Remarque:</label>
        <Input
          onChange={(remark) => {
            _setmodel((prev) => {
              return { ...prev, remark };
            });
          }}
          as="textarea"
          value={model.remark}
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
            value={item.designation}
          />
          <Responsive s={4} m={4} l={4} xl={4} className="p-5">
            <label>Quantité:</label>

            <Input
              type="number"
              onChange={(qty) => {
                setitem((prev) => {
                  return { ...prev, qty: parseInt(qty) };
                });
              }}
              value={item.qty}
            />
          </Responsive>
          <Responsive s={4} m={4} l={4} xl={4} className="p-5">
            <label>Prix:</label>
            <Input
              step="0.1"
              type="number"
              onChange={(unitPrice) => {
                setitem((prev) => {
                  return { ...prev, unitPrice: parseFloat(unitPrice) };
                });
              }}
              value={item.unitPrice}
            />
          </Responsive>
          <Responsive s={4} m={4} l={4} xl={4} className="p-5">
            <label>Poids :</label>
            <Input
              step="0.1"
              type="number"
              onChange={(weight) => {
                setitem((prev) => {
                  return { ...prev, weight: parseFloat(weight) };
                });
              }}
              value={item.weight}
            />
          </Responsive>
          <label>
            <Checkbox
              style={{
                border: "1px solid #aaa",
                borderRadius: "5px",
                width: "36px",
                height: "36px",
                padding: 0,
                backgroundColor: "#fff",
                marginRight: "10px",
              }}
              onChange={(brittle) => {
                setitem((prev) => {
                  return { ...prev, brittle: !prev.brittle };
                });
              }}
              value={item.brittle}
              checked={item.brittle}
              defaultValue={true}
            />
            Fragile
          </label>
          <br></br>{" "}
          <div style={{ textAlign: "right", margin: "5px" }}>
            <Button
              color="green"
              onClick={() => {
                _setmodel((prev) => ({
                  ...prev,
                  coliItems: item.index
                    ? [
                        ...prev.coliItems.map((el) => {
                          if (el.index != item.index) return el;
                          else return item;
                        }),
                      ]
                    : [
                        ...prev.coliItems,
                        {
                          ...item,
                          index: prev.coliItems.length
                            ? prev.coliItems[prev.coliItems.length - 1].index +
                              1
                            : 1,
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
              <td>Désignation</td> <td>Qté</td> <td>Prix</td> <td>Actions</td>
            </tr>
          </thead>
          <tbody>
            {model.coliItems.map((el) => (
              <tr style={{ color: "#454599" }}>
                <td>{el.designation}</td> <td>{el.qty}</td>{" "}
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
                          (el1) => el1.index != el.index
                        ),
                      }))
                    }
                    icon={<TrashIcon />}
                    circle
                  />{" "}
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
              defaultValue={model.customerId}
            />{" "}
            <Button appearance="ghost" color="#fff">
              <BiFileBlank /> Historique
            </Button>
          </div>
        </div>
        <label>Nom Complet :</label>
        <Input
          onChange={(fullName) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, fullName } };
            });
          }}
          value={model.customer.fullName}
        />
        <label>Email:</label>
        <Input
          onChange={(email) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, email } };
            });
          }}
          value={model.customer.email}
          type="email"
        />
        <label>Téléphone 1:</label>
        <Input
          value={model.customer.phoneNumber}
          onChange={(phoneNumber) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, phoneNumber } };
            });
          }}
          type="tel"
        />
        <label>Téléphone 2:</label>
        <Input
          value={model.customer.phoneNumber2}
          onChange={(phoneNumber2) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, phoneNumber2 } };
            });
          }}
          type="tel"
        />
        <label>Gouvernerat</label> <br></br>
        <select
          onChange={(v) =>
            _setmodel((prev) => ({
              ...prev,
              customer: { ...prev.customer, city: v.target.value },
            }))
          }
          value={model.customer.city}
        >
          <option value="">Selectionner une gouvernerat</option>
          {cities.map((c) => (
            <option value={c}>{c}</option>
          ))}
        </select>
        <br></br>
        <label>Zip Code :</label>
        <Input
          type="number"
          onChange={(zipCode) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, zipCode } };
            });
          }}
          value={model.customer.zipCode}
        />
        <label>Addresse :</label>
        <Input
          onChange={(address) => {
            _setmodel((prev) => {
              return { ...prev, customer: { ...prev.customer, address } };
            });
          }}
          as="textarea"
          value={model.customer.address}
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
