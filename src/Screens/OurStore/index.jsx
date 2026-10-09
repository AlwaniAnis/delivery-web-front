import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Input, SelectPicker, TagInput } from "rsuite";
import { useRecoilValue } from "recoil";
import {
  FaStore,
  FaFileInvoice,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
  FaExternalLinkAlt,
  FaSave,
  FaPlus,
  FaEdit,
  FaTrash,
  FaCheckCircle,
  FaCalendarDay,
  FaWarehouse,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { createAPIEndpoint } from "../../Api/authenticated.requests";
import { ENDPOINTS } from "../../Api/enpoints";
import { MyStore } from "../../Atoms/store.atom";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import StoreMapPicker from "../../Components/Common/StoreMapPicker";

export default function OurStore() {
  const store = useRecoilValue(MyStore);
  const depotsList = useRecoilValue(preparationPlacesState);
  const [model, setmodel] = useState({
    contacts: [],
    preparationPlaceId: 1,
    latitude: 36.8065,
    longitude: 10.1815,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (store && store.id) {
      setmodel({
        ...store,
        latitude: store.latitude ?? store.Latitude ?? 36.8065,
        longitude: store.longitude ?? store.Longitude ?? 10.1815,
      });
    }
  }, [store.id]);

  const [contact, setcontact] = useState({
    address: "",
    phones: "",
    emails: "",
    maplink: "",
  });

  const resetContactForm = () => {
    setcontact({
      address: "",
      phones: "",
      emails: "",
      maplink: "",
      eStoreId: model.id,
    });
  };

  const handleSaveContact = () => {
    if (!contact.address?.trim() && !contact.phones && !contact.emails) {
      Swal.fire({
        icon: "warning",
        title: "Champs requis",
        text: "Veuillez renseigner au moins l'adresse ou un numéro de téléphone pour ce point de contact.",
      });
      return;
    }

    let contacts = [...(model.contacts || [])];
    if (!contact.id) {
      contacts.push({
        ...contact,
        id: Date.now(),
        eStoreId: model.id,
      });
    } else {
      let _indx = contacts.findIndex((el) => el.id == contact.id);
      if (_indx !== -1) {
        contacts[_indx] = contact;
      } else {
        contacts.push(contact);
      }
    }

    setmodel((prev) => ({
      ...prev,
      contacts,
    }));
    resetContactForm();
  };

  const handleSaveStore = () => {
    setSaving(true);
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
      latitude: latVal,
      longitude: lngVal,
    };

    if (m.contacts && Array.isArray(m.contacts)) {
      m.contacts = m.contacts.map((el) => {
        const copy = { ...el };
        delete copy.id;
        return copy;
      });
    }

    createAPIEndpoint(ENDPOINTS.Store)
      .update(model.id, m)
      .then(() => {
        setSaving(false);
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Boutique enregistrée avec succès !",
          showConfirmButton: false,
          timer: 1800,
        });
        createAPIEndpoint(ENDPOINTS.Store + "/getDefault")
          .customGet()
          .then((res) => {
            if (res && res.data) {
              setmodel({
                ...res.data,
                latitude: res.data.latitude ?? res.data.Latitude ?? latVal,
                longitude: res.data.longitude ?? res.data.Longitude ?? lngVal,
              });
            }
          });
      })
      .catch((err) => {
        setSaving(false);
        Swal.fire({
          icon: "error",
          title: "Erreur",
          text: err.message || "Impossible de mettre à jour la boutique.",
        });
      });
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "22px",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)",
            }}
          >
            <FaStore />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff" }}>
              Configuration de la Boutique
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>
              Gérez les informations légales, fiscales et les agences / points de contact de votre enseigne
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/store_recap"
            style={{
              background: "#2563eb",
              color: "#ffffff",
              borderRadius: "10px",
              padding: "10px 18px",
              fontSize: "0.88rem",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
            }}
          >
            <FaCalendarDay /> Récap Journalier
          </Link>
          <button
            onClick={handleSaveStore}
            disabled={saving}
            style={{
              background: "#10b981",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "10px 20px",
              fontSize: "0.9rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
            }}
          >
            <FaSave /> {saving ? "Enregistrement..." : "Enregistrer la Boutique"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "20px" }}>
        {/* CARD 1: GENERAL INFORMATION */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "22px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <FaFileInvoice style={{ color: "#4f46e5", fontSize: "18px" }} />
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
              Identité & Données Légales
            </h3>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
              Nom de la Boutique / Raison Sociale :
            </label>
            <Input
              placeholder="Ex: Tawsil Store Tunis"
              value={model.name_fr || ""}
              onChange={(name_fr) => setmodel((prev) => ({ ...prev, name_fr }))}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#065f46", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <FaWarehouse style={{ color: "#059669" }} /> Dépôt du Territoire (Obligatoire) * :
            </label>
            <SelectPicker
              data={(depotsList || []).map((d) => ({
                label: `${d.name} (${d.code || `DEP-${d.id}`})`,
                value: d.id,
              }))}
              block
              cleanable={false}
              searchable={true}
              value={Number(model.preparationPlaceId || model.depotId || depotsList?.[0]?.id || 1)}
              onSelect={(val) =>
                setmodel((prev) => ({
                  ...prev,
                  preparationPlaceId: val,
                  depotId: val,
                }))
              }
            />
            <small style={{ color: "#64748b", fontSize: "0.75rem", display: "block", marginTop: "4px" }}>
              Toutes les livraisons créées par cette boutique sont automatiquement rattachées à ce dépôt.
            </small>
          </div>

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
              Matricule Fiscale :
            </label>
            <Input
              placeholder="Ex: 1234567/A/M/000"
              value={model.taxCode || ""}
              onChange={(taxCode) => setmodel((prev) => ({ ...prev, taxCode }))}
            />
          </div>

          <StoreMapPicker
            latitude={model.latitude ?? model.Latitude ?? 36.8065}
            longitude={model.longitude ?? model.Longitude ?? 10.1815}
            height="240px"
            title="Position GPS de la Boutique (Latitude & Longitude)"
            onChange={(lat, lng) => {
              setmodel((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
              }));
              setcontact((prev) => ({
                ...prev,
                maplink: prev.maplink || `https://www.google.com/maps?q=${lat},${lng}`,
              }));
            }}
          />

          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", marginBottom: "6px", display: "block" }}>
              Description de l'activité & Engagements :
            </label>
            <Input
              as="textarea"
              rows={4}
              placeholder="Description affichée sur les factures, bordereaux et espace client..."
              value={model.description_fr || ""}
              onChange={(description_fr) => setmodel((prev) => ({ ...prev, description_fr }))}
            />
          </div>
        </div>

        {/* CARD 2: CONTACTS & AGENCES */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "22px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingBottom: "12px", borderBottom: "1px solid #f1f5f9" }}>
            <FaMapMarkerAlt style={{ color: "#ef4444", fontSize: "18px" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                Points de Contact & Agences
              </h3>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Ajoutez les adresses, téléphones et liens maps de vos boutiques
              </span>
            </div>
          </div>

          {/* Contact Input Form */}
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: "6px" }}>
              <FaPlus style={{ color: "#4f46e5" }} /> {contact.id ? "Modifier le Point de Contact" : "Ajouter un Point de Contact"}
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px", display: "block" }}>
                Adresse physique :
              </label>
              <Input
                placeholder="Ex: 10 Avenue Habib Bourguiba, Tunis"
                value={contact.address || ""}
                onChange={(address) => setcontact((prev) => ({ ...prev, address }))}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FaPhoneAlt size={10} style={{ color: "#10b981" }} /> Téléphones (Entrée pour ajouter) :
                </label>
                <TagInput
                  block
                  placeholder="+216 ..."
                  value={contact.phones ? contact.phones.split(",") : []}
                  onChange={(phones) => setcontact((prev) => ({ ...prev, phones: phones.join(",") }))}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FaEnvelope size={10} style={{ color: "#3b82f6" }} /> Emails :
                </label>
                <TagInput
                  block
                  placeholder="contact@..."
                  value={contact.emails ? contact.emails.split(",") : []}
                  onChange={(emails) => setcontact((prev) => ({ ...prev, emails: emails.join(",") }))}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                <FaExternalLinkAlt size={10} style={{ color: "#64748b" }} /> Lien Google Maps :
              </label>
              <Input
                placeholder="https://maps.google.com/?q=..."
                value={contact.maplink || ""}
                onChange={(maplink) => setcontact((prev) => ({ ...prev, maplink }))}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
              {contact.id && (
                <Button size="sm" appearance="subtle" onClick={resetContactForm}>
                  Annuler
                </Button>
              )}
              <Button
                size="sm"
                appearance="primary"
                style={{ background: "#4f46e5", fontWeight: 700 }}
                onClick={handleSaveContact}
              >
                {contact.id ? "Mettre à jour le contact" : "+ Ajouter à la liste"}
              </Button>
            </div>
          </div>

          {/* List of Existing Contacts */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#0f172a" }}>
              Adresses & Agences Enregistrées ({model.contacts?.length || 0}) :
            </span>

            {(model.contacts || []).map((el, idx) => (
              <div
                key={el.id || idx}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>
                    📍 {el.address || "Adresse non renseignée"}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px", fontSize: "0.78rem", color: "#64748b" }}>
                    {el.phones && (
                      <span>
                        📞 <strong>{el.phones}</strong>
                      </span>
                    )}
                    {el.emails && (
                      <span>
                        ✉️ {el.emails}
                      </span>
                    )}
                    {el.maplink && (
                      <a
                        href={el.maplink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "3px" }}
                      >
                        <FaExternalLinkAlt size={10} /> Voir sur Google Maps
                      </a>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setcontact(el)}
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#2563eb",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FaEdit size={11} /> Modifier
                  </button>

                  <button
                    onClick={() => {
                      setmodel((prev) => ({
                        ...prev,
                        contacts: prev.contacts.filter((item) => item.id !== el.id),
                      }));
                    }}
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FaTrash size={11} /> Supprimer
                  </button>
                </div>
              </div>
            ))}

            {(!model.contacts || model.contacts.length === 0) && (
              <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "0.85rem" }}>
                Aucune agence ou adresse enregistrée pour le moment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
