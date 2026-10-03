import React, { useEffect, useState } from "react";
import { Edit } from "@rsuite/icons";
import ImageIcon from "@rsuite/icons/Image";
import TrashIcon from "@rsuite/icons/Trash";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  Button,
  Checkbox,
  IconButton,
  Input,
  Message,
  SelectPicker,
  Tag,
} from "rsuite";
import {
  FaBoxOpen,
  FaUser,
  FaTruck,
  FaWarehouse,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaCalendarAlt,
  FaHistory,
  FaPlus,
  FaCheck,
  FaBarcode,
  FaExchangeAlt,
  FaTags,
} from "react-icons/fa";
import { APi } from "../../Api";
import { DriversList } from "../../Atoms/drivers.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { MyStore } from "../../Atoms/store.atom";
import { tarifsState } from "../../Atoms/tarifs.atom";
import { DeliveryStatus } from "../../Constants/types";
import zip_codes from "../../Data/zip_codes.json";
import DeliveryModel from "../../Models/deliveryModel";
import useB2B from "../../hooks/useB2B";

function AddEdit({ _setmodel, error, model = new DeliveryModel() }) {
  const { isB2B } = useB2B();
  const store = useRecoilValue(MyStore);

  const [drivers] = useRecoilState(DriversList);
  const [depotsList] = useRecoilState(preparationPlacesState);
  const [tarifsList, setTarifsList] = useRecoilState(tarifsState);
  const [data, setdata] = useState([]);
  const [customers, setcustomers] = useState([]);
  const [showBarcode, setShowBarcode] = useState(false);

  useEffect(() => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Tarif, { page: 1, take: 100 })
      .fetchAll()
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setTarifsList(res.data);
        } else if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setTarifsList(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const [item, setitem] = useState({
    designation: "",
    qty: 1,
    unitPrice: 0,
    brittle: false,
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
        setdata(res.data?.data || []);
      })
      .catch((e) => console.log(e.Message));
  };

  const resetItem = () => {
    setitem({
      designation: "",
      qty: 1,
      unitPrice: 0,
      brittle: false,
      weight: 0,
    });
  };

  const fetchCustomers = (q) => {
    APi.createAPIEndpoint(APi.ENDPOINTS.Customer, { page: 1, take: 100, q })
      .fetchAll()
      .then((res) => {
        setcustomers(res.data?.data || []);
      })
      .catch((e) => console.log(e.Message));
  };

  useEffect(() => {
    const defaultDepotId = Number(
      store?.preparationPlaceId || store?.depotId || depotsList?.[0]?.id || 1
    );
    _setmodel((prev) => ({
      ...prev,
      qrCodeContent: !prev.id && !prev.qrCodeContent ? Date.now().toString() : prev.qrCodeContent,
      preparationPlaceId: Number(prev.preparationPlaceId) || defaultDepotId,
    }));
  }, [model.id, store?.preparationPlaceId, store?.depotId]);

  // Total price of items
  const totalPrice = (model.coliItems || []).reduce(
    (acc, it) => acc + (Number(it.qty) || 1) * (Number(it.unitPrice) || 0),
    0
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px" }}>
      {error && (
        <Message showIcon type="error" style={{ borderRadius: "10px" }}>
          {error}
        </Message>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "18px",
          alignItems: "start",
        }}
      >
        {/* CARD 1: PACKAGE & EXPEDITION */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "18px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  background: "#e0e7ff",
                  color: "#4338ca",
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                <FaBoxOpen />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                  Informations Colis & Expédition
                </h4>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Code barre, affectation livreur et articles
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBarcode((prev) => !prev)}
              style={{
                background: showBarcode ? "#ede9fe" : "#f1f5f9",
                color: showBarcode ? "#6d28d9" : "#475569",
                border: "1px solid #cbd5e1",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <FaBarcode size={12} /> {showBarcode ? "Masquer Codes" : "Voir Codes"}
            </button>
          </div>

          {/* QR & Barcode Preview (Expandable) */}
          {showBarcode && model.qrCodeContent && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                borderRadius: "10px",
                padding: "12px",
                textAlign: "center",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
              }}
            >
              <div style={{ background: "#fff", padding: "6px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <QRCode value={model.qrCodeContent} size={76} />
              </div>
              <div style={{ background: "#fff", padding: "6px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <Barcode value={model.qrCodeContent} height={40} width={1.4} fontSize={12} />
              </div>
            </div>
          )}

          {/* Code Colis Input */}
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
              Code Unique du Colis :
            </label>
            <Input
              placeholder="Ex: 169875412..."
              onChange={(qrCodeContent) => {
                _setmodel((prev) => ({ ...prev, qrCodeContent }));
              }}
              value={model.qrCodeContent || ""}
            />
          </div>

          {/* TARIF SELECTION (For Store / B2B and Admin) */}
          <div
            style={{
              background: "#f8fafc",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <label
                style={{
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  color: "#1e293b",
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaTags style={{ color: "#4f46e5" }} /> Type de Tarif & Formule de Livraison :
              </label>
              {model.tarifDelivery ? (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#059669",
                    background: "#d1fae5",
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  Frais: {Number(model.tarifDelivery).toFixed(3)} TND
                </span>
              ) : null}
            </div>

            <SelectPicker
              data={[{ label: "— Sélectionner la formule de tarif —", value: 0 }].concat(
                (tarifsList || [])
                  .filter((t) => !t.isPickup && !/ramassage|pickup/i.test(t.name || ""))
                  .map((t) => ({
                    label: isB2B
                      ? `${t.name} (Frais: ${(Number(t.tarifDelivery) || 0).toFixed(3)} TND)`
                      : `${t.name} (Frais: ${(Number(t.tarifDelivery) || 0).toFixed(3)} TND · Pickup: ${(Number(t.pickupPrice ?? 1.5)).toFixed(3)} TND · Livr: ${(Number(t.commissionDriver) || 0).toFixed(3)} TND)`,
                    value: t.id,
                  }))
              )}
              block
              searchable={true}
              placeholder="Choisir le tarif de livraison..."
              value={model.tarifId || 0}
              onSelect={(val) => {
                const selected = (tarifsList || []).find((t) => t.id === val);
                _setmodel((prev) => ({
                  ...prev,
                  tarifId: val === 0 ? null : val,
                  tarifDelivery: selected ? Number(selected.tarifDelivery) : 0,
                  pickupPrice: selected ? Number(selected.pickupPrice ?? 1.5) : 0,
                  commissionDriver: selected ? Number(selected.commissionDriver) : 0,
                  cost: selected ? Number(selected.tarifDelivery) : prev.cost,
                }));
              }}
            />

            {model.tarifId && (() => {
              const selectedTarif = (tarifsList || []).find((t) => t.id === model.tarifId);
              if (!selectedTarif) return null;
              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "6px",
                    fontSize: "0.75rem",
                    color: "#475569",
                  }}
                >
                  <span>{selectedTarif.remark || "Tarif actif"}</span>
                  {!isB2B && (
                    <span style={{ fontWeight: 700, color: "#4f46e5" }}>
                      Pickup Livreur : {(Number(selectedTarif.pickupPrice ?? 1.5)).toFixed(3)} TND · Livraison Livreur : {(Number(selectedTarif.commissionDriver) || 0).toFixed(3)} TND
                    </span>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Depot (Mandatory, inherited from Store Territory) & Driver */}
          <div style={{ display: "grid", gridTemplateColumns: isB2B ? "1fr" : "1fr 1fr", gap: "10px" }}>
            {!isB2B && (
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                  <FaTruck style={{ color: "#4f46e5" }} /> Livreur Assigné :
                </label>
                <SelectPicker
                  data={[{ label: "— Non Assigné —", value: 0 }].concat(
                    drivers.map((c) => ({
                      label: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.name || `Livreur #${c.id}`,
                      value: c.id,
                    }))
                  )}
                  block
                  searchable={true}
                  placeholder="Sélectionner..."
                  value={model.driverId || 0}
                  onSelect={(driverId) => {
                    _setmodel((prev) => ({ ...prev, driverId: driverId === 0 ? null : driverId }));
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#065f46", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                <FaWarehouse style={{ color: "#059669" }} /> Dépôt du Territoire (Obligatoire) * :
              </label>
              <SelectPicker
                data={depotsList.map((d) => ({
                  label: `${d.name} (${d.code || "DEP"})`,
                  value: d.id,
                }))}
                block
                cleanable={false}
                disabled={isB2B}
                searchable={true}
                placeholder="Dépôt de rattachement..."
                value={Number(model.preparationPlaceId || store?.preparationPlaceId || store?.depotId || depotsList?.[0]?.id || 1)}
                onSelect={(val) => {
                  _setmodel((prev) => ({
                    ...prev,
                    preparationPlaceId: Number(val) || 1,
                  }));
                }}
              />
              <small style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px", display: "block" }}>
                Rattaché automatiquement au dépôt du territoire de la boutique.
              </small>
            </div>
          </div>

          {/* Date & Exchangeable */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignItems: "center" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                <FaCalendarAlt style={{ color: "#64748b" }} /> Date Début Procédure :
              </label>
              <Input
                type="date"
                onChange={(beginProcessDate) => {
                  _setmodel((prev) => ({ ...prev, beginProcessDate }));
                }}
                value={
                  model.beginProcessDate
                    ? typeof model.beginProcessDate === "string"
                      ? model.beginProcessDate.split("T")[0]
                      : new Date(model.beginProcessDate).toISOString().split("T")[0]
                    : ""
                }
              />
            </div>

            <div style={{ paddingTop: "20px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  background: model.exchangeable ? "#fef3c7" : "#f8fafc",
                  border: model.exchangeable ? "1px solid #fde68a" : "1px solid #e2e8f0",
                  padding: "7px 10px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  color: model.exchangeable ? "#92400e" : "#475569",
                }}
              >
                <Checkbox
                  inline
                  checked={Boolean(model.exchangeable)}
                  onChange={(val, checked) => {
                    _setmodel((prev) => ({ ...prev, exchangeable: checked }));
                  }}
                />
                <FaExchangeAlt /> Colis Échangeable
              </label>
            </div>
          </div>

          {/* Remarque */}
          <div>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
              Remarques / Instructions Spéciales :
            </label>
            <Input
              as="textarea"
              rows={2}
              placeholder="Ex: Appeler avant livraison, sonner à l'interphone..."
              onChange={(remark) => {
                _setmodel((prev) => ({ ...prev, remark }));
              }}
              value={model.remark || ""}
            />
          </div>

          {/* Section Articles & Produits */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "14px",
              marginTop: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📦</span> Articles Inclus ({model.coliItems?.length || 0})
              </span>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#4f46e5" }}>
                Total: {totalPrice.toFixed(3)} TND
              </span>
            </div>

            {/* Item Input Box */}
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "12px",
                marginBottom: "12px",
              }}
            >
              <div style={{ marginBottom: "8px" }}>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "3px", display: "block" }}>
                  Désignation de l'article :
                </label>
                <Input
                  placeholder="Ex: T-Shirt Coton Noir, Écouteurs Bluetooth..."
                  value={item.designation || ""}
                  onChange={(designation) => {
                    setitem((prev) => ({ ...prev, designation }));
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "2px", display: "block" }}>
                    Quantité :
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={item.qty ?? 1}
                    onChange={(qty) => {
                      setitem((prev) => ({ ...prev, qty: parseInt(qty) || 1 }));
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "2px", display: "block" }}>
                    Prix Unitaire (TND) :
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    value={item.unitPrice ?? 0}
                    onChange={(unitPrice) => {
                      setitem((prev) => ({ ...prev, unitPrice: parseFloat(unitPrice) || 0 }));
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "2px", display: "block" }}>
                    Poids (kg) :
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    value={item.weight ?? 0}
                    onChange={(weight) => {
                      setitem((prev) => ({ ...prev, weight: parseFloat(weight) || 0 }));
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "6px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#475569", cursor: "pointer" }}>
                  <Checkbox
                    inline
                    checked={Boolean(item.brittle)}
                    onChange={(val, checked) => {
                      setitem((prev) => ({ ...prev, brittle: checked }));
                    }}
                  />
                  <span>⚠️ Article Fragile</span>
                </label>

                <div style={{ display: "flex", gap: "6px" }}>
                  {item.index && (
                    <Button size="xs" onClick={resetItem} appearance="subtle">
                      Annuler
                    </Button>
                  )}
                  <Button
                    size="sm"
                    appearance="primary"
                    style={{ background: "#4f46e5", fontWeight: 700 }}
                    onClick={() => {
                      if (!item.designation?.trim()) return;
                      _setmodel((prev) => ({
                        ...prev,
                        coliItems: item.index
                          ? prev.coliItems.map((el) => (el.index === item.index ? item : el))
                          : [
                              ...(prev.coliItems || []),
                              {
                                ...item,
                                index: Date.now(),
                              },
                            ],
                      }));
                      resetItem();
                    }}
                  >
                    {item.index ? "Modifier Article" : "+ Ajouter au Colis"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Articles Table */}
            {(model.coliItems || []).length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.82rem",
                    background: "#ffffff",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f1f5f9", color: "#334155", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px" }}>Désignation</th>
                      <th style={{ padding: "8px 6px", textAlign: "center" }}>Qté</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Prix (TND)</th>
                      <th style={{ padding: "8px 6px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(model.coliItems || []).map((el, idx) => (
                      <tr
                        key={el.index || idx}
                        style={{
                          borderTop: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                        }}
                      >
                        <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>
                          {el.designation}
                          {el.brittle && (
                            <span style={{ fontSize: "0.7rem", color: "#d97706", marginLeft: "6px" }}>
                              [Fragile]
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 6px", textAlign: "center", color: "#475569" }}>
                          {el.qty}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                          {(Number(el.qty || 1) * Number(el.unitPrice || 0)).toFixed(3)}
                        </td>
                        <td style={{ padding: "6px", textAlign: "center" }}>
                          <IconButton
                            size="xs"
                            appearance="subtle"
                            onClick={() => setitem(el)}
                            icon={<Edit />}
                            title="Modifier"
                          />
                          <IconButton
                            size="xs"
                            appearance="subtle"
                            style={{ color: "#dc2626" }}
                            onClick={() =>
                              _setmodel((prev) => ({
                                ...prev,
                                coliItems: (prev.coliItems || []).filter(
                                  (el1) => el1.index !== el.index
                                ),
                              }))
                            }
                            icon={<TrashIcon />}
                            title="Supprimer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontSize: "0.82rem" }}>
                Aucun article ajouté. Veuillez saisir au moins un article ci-dessus.
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: CUSTOMER / DESTINATAIRE */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            padding: "18px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Card Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: "12px",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  background: "#dcfce7",
                  color: "#15803d",
                  width: "34px",
                  height: "34px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                <FaUser />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                  Destinataire & Coordonnées Client
                </h4>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Sélection rapide ou nouveau client
                </span>
              </div>
            </div>
          </div>

          {/* Quick Existing Customer Lookup */}
          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              padding: "12px",
            }}
          >
            <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "#1e40af", marginBottom: "4px", display: "block" }}>
              🔍 Sélectionner un Client Existant (Recherche par nom / téléphone) :
            </label>
            <SelectPicker
              data={[{ label: "— Saisir un nouveau client —", value: 0 }].concat(
                customers.map((c) => ({
                  label: `${c.fullName || "Client"} (${c.phoneNumber || ""}${c.phoneNumber2 ? ` / ${c.phoneNumber2}` : ""})`,
                  value: c.id,
                }))
              )}
              block
              searchable={true}
              placeholder="Tapez pour rechercher un client..."
              onSearch={(q) => fetchCustomers(q)}
              value={model.customerId || 0}
              onSelect={(customerId) => {
                if (customerId === 0) {
                  _setmodel((prev) => ({
                    ...prev,
                    customerId: null,
                  }));
                  return;
                }
                fetchHistoric(customerId);
                const found = customers.find((c) => c.id == customerId);
                if (found) {
                  _setmodel((prev) => ({
                    ...prev,
                    customerId,
                    customer: { ...found },
                  }));
                }
              }}
            />
          </div>

          {/* Customer Name & Email */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
                Nom Complet du Client *
              </label>
              <Input
                placeholder="Ex: Mohamed Ben Ali"
                value={model.customer?.fullName || ""}
                onChange={(fullName) => {
                  _setmodel((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, fullName },
                  }));
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "block" }}>
                Adresse Email :
              </label>
              <Input
                type="email"
                placeholder="client@domaine.tn"
                value={model.customer?.email || ""}
                onChange={(email) => {
                  _setmodel((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, email },
                  }));
                }}
              />
            </div>
          </div>

          {/* Phone numbers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                <FaPhoneAlt style={{ color: "#10b981", fontSize: "11px" }} /> Téléphone Principal *
              </label>
              <Input
                type="tel"
                placeholder="Ex: 98123456"
                value={model.customer?.phoneNumber || ""}
                onChange={(phoneNumber) => {
                  _setmodel((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, phoneNumber },
                  }));
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px" }}>
                <FaPhoneAlt style={{ color: "#64748b", fontSize: "11px" }} /> Téléphone Secondaire :
              </label>
              <Input
                type="tel"
                placeholder="Ex: 22345678"
                value={model.customer?.phoneNumber2 || ""}
                onChange={(phoneNumber2) => {
                  _setmodel((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, phoneNumber2 },
                  }));
                }}
              />
            </div>
          </div>

          {/* Location Cascade (Gouvernorat, Délégation, Ville, Zip) */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              <FaMapMarkerAlt style={{ color: "#ef4444" }} /> Localisation & Zone Géographique
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "3px", display: "block" }}>
                  Gouvernorat *
                </label>
                <SelectPicker
                  data={[{ label: "Sélectionner...", value: "" }].concat(
                    zip_codes.map((c) => ({
                      label: c.name.toUpperCase(),
                      value: c.name.toUpperCase(),
                    }))
                  )}
                  block
                  searchable={true}
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
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "3px", display: "block" }}>
                  Délégation :
                </label>
                <SelectPicker
                  disabled={!model.customer?.city}
                  data={[{ label: "Sélectionner...", value: "" }].concat(
                    zip_codes.find(
                      (el) => el.name.toUpperCase() === (model.customer?.city || "").toUpperCase()
                    )
                      ? zip_codes
                          .find((el) => el.name.toUpperCase() === (model.customer?.city || "").toUpperCase())
                          .delegs.map((c) => ({
                            label: Object.keys(c)[0],
                            value: Object.keys(c)[0],
                          }))
                      : []
                  )}
                  block
                  searchable={true}
                  value={model.customer?.deleg || ""}
                  onSelect={(deleg) => {
                    _setmodel((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, deleg, ville: "", zipCode: "" },
                    }));
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "3px", display: "block" }}>
                  Cité / Ville :
                </label>
                <SelectPicker
                  disabled={!model.customer?.deleg}
                  data={[{ label: "Sélectionner...", value: "" }].concat(
                    (() => {
                      const cityObj = zip_codes.find(
                        (el) => el.name.toUpperCase() === (model.customer?.city || "").toUpperCase()
                      );
                      if (!cityObj) return [];
                      const delegObj = cityObj.delegs.find(
                        (d) => Object.keys(d)[0] === model.customer?.deleg
                      );
                      if (!delegObj || !delegObj[model.customer.deleg]) return [];
                      return delegObj[model.customer.deleg].map((c) => ({
                        label: c.Cite,
                        value: c.Cite,
                      }));
                    })()
                  )}
                  block
                  searchable={true}
                  value={model.customer?.ville || ""}
                  onSelect={(ville) => {
                    let calculatedZip = "";
                    const cityObj = zip_codes.find(
                      (el) => el.name.toUpperCase() === (model.customer?.city || "").toUpperCase()
                    );
                    if (cityObj) {
                      const delegObj = cityObj.delegs.find(
                        (d) => Object.keys(d)[0] === model.customer?.deleg
                      );
                      if (delegObj && delegObj[model.customer.deleg]) {
                        const foundCite = delegObj[model.customer.deleg].find(
                          (el) => el.Cite === ville
                        );
                        if (foundCite) calculatedZip = foundCite.zip;
                      }
                    }

                    _setmodel((prev) => ({
                      ...prev,
                      customer: {
                        ...prev.customer,
                        ville,
                        zipCode: calculatedZip || prev.customer?.zipCode,
                      },
                    }));
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "3px", display: "block" }}>
                  Code Postal :
                </label>
                <Input
                  type="text"
                  placeholder="Ex: 2035"
                  value={model.customer?.zipCode || ""}
                  onChange={(zipCode) => {
                    _setmodel((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, zipCode },
                    }));
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "3px", display: "block" }}>
                Adresse Détaillée (Rue, Résidence, Appartement) :
              </label>
              <Input
                as="textarea"
                rows={2}
                placeholder="Ex: 14 Rue du Lac Victoria, Résidence Les Fleurs..."
                value={model.customer?.address || ""}
                onChange={(address) => {
                  _setmodel((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, address },
                  }));
                }}
              />
            </div>
          </div>

          {/* Customer History Accordion */}
          {data.length > 0 && (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <FaHistory style={{ color: "#64748b" }} />
                <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#334155" }}>
                  Historique des Commandes Antérieures ({data.length})
                </span>
              </div>

              <div style={{ maxHeight: "160px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px" }}>
                {data.slice(0, 10).map((hist, i) => {
                  const st = DeliveryStatus.find((s) => s.value == hist.status);
                  return (
                    <div
                      key={hist.id || i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "6px 8px",
                        background: "#fff",
                        borderRadius: "6px",
                        border: "1px solid #e2e8f0",
                        fontSize: "0.78rem",
                      }}
                    >
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f172a" }}>
                        #{hist.qrCodeContent || hist.id}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: hist.status == 5 ? "#d1fae5" : "#fef3c7",
                          color: hist.status == 5 ? "#065f46" : "#92400e",
                        }}
                      >
                        {st?.label || "En cours"}
                      </span>
                      <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                        {hist.driver ? `${hist.driver.firstName || ""} ${hist.driver.lastName || ""}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddEdit;
