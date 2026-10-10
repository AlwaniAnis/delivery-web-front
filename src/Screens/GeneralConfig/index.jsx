import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaCog,
  FaSave,
  FaTruck
} from "react-icons/fa";
import { Button, Input, Loader, Message } from "rsuite";
import Swal from "sweetalert2";
import { createAPIEndpoint } from "../../Api/authenticated.requests";
import { ENDPOINTS } from "../../Api/enpoints";

const defaultConfig = {
  id: 1,
  maxDeliveryAttempts: 3,
  deliveryAttemptIntervalHours: 24,
  enableDeliveryNotifications: true,
  notificationEmailTemplate:
    "Your delivery is scheduled for {date}. Please be available.",
  notificationSmsTemplate:
    "Your delivery is scheduled for {date}. Please be available.",
  enableAutoReturnToDepot: true,
  autoReturnToDepotAfterDays: 7,
};

export default function GeneralConfigPage() {
  const [model, setModel] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setLoadError("");

    try {
      const res = await createAPIEndpoint(ENDPOINTS.GeneralConfig).customGet();

      if (res?.data) {
        const nextCfg = {
          ...defaultConfig,
          ...res.data,
          id: res.data.id ?? 1,
        };
        setModel(nextCfg);
        try {
          localStorage.setItem("tawsil_general_config", JSON.stringify(nextCfg));
        } catch (e) {}
      }
    } catch (err) {
      try {
        const cached = localStorage.getItem("tawsil_general_config");
        if (cached) {
          setModel({ ...defaultConfig, ...JSON.parse(cached) });
        }
      } catch (e) {}
      setLoadError(
        err.response?.data?.message ||
          err.response?.data ||
          err.message ||
          "Impossible de charger la configuration."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (name, value) => {
    setModel((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    if (
      model.maxDeliveryAttempts < 1 ||
      model.deliveryAttemptIntervalHours < 1 ||
      model.autoReturnToDepotAfterDays < 1
    ) {
      Swal.fire({
        icon: "warning",
        title: "Valeurs invalides",
        text: "Les nombres de tentatives et les délais doivent être supérieurs à zéro.",
      });
      return;
    }

    setSaving(true);

    try {
      try {
        localStorage.setItem("tawsil_general_config", JSON.stringify(model));
      } catch (e) {}
      // The backend PUT endpoint accepts the model at /api/GeneralConfig.
      // Use the API helper method that sends PUT to the endpoint root.
      await createAPIEndpoint(ENDPOINTS.GeneralConfig).customPut(model);

      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Configuration enregistrée avec succès !",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text:
          err.response?.data?.message ||
          err.response?.data ||
          err.message ||
          "Impossible de mettre à jour la configuration.",
      });
    } finally {
      setSaving(false);
    }
  };

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #e2e8f0",
    padding: "22px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  };

  const sectionTitleStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    paddingBottom: "12px",
    borderBottom: "1px solid #f1f5f9",
    margin: 0,
    color: "#0f172a",
    fontSize: "1.05rem",
    fontWeight: 800,
  };

  const labelStyle = {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#334155",
    marginBottom: "7px",
    display: "block",
  };

  const numberInput = (name) => (
    <Input
    type="number"
      block
      value={model[name]}
     
      onChange={(val) => {
              const parsed = val === "" ? "" : parseInt(val);
            updateField( name,
                Number.isNaN(parsed) ? 1 : parsed,
              
              );
            }}
    />
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        <Loader size="md" content="Chargement de la configuration..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "16px" }}>
      {/* Header */}
      <div
        style={{
          background: "#0f172a",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "20px 24px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
          boxShadow: "0 8px 20px rgba(15,23,42,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              background: "#334155",
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "21px",
            }}
          >
            <FaCog />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "1.35rem",
                fontWeight: 800,
                color: "#ffffff",
              }}
            >
              Configuration Générale
            </h2>
           
          </div>
        </div>

        <Button
          appearance="primary"
          loading={saving}
          disabled={saving}
          onClick={handleSave}
          style={{
            background: "#059669",
            border: "none",
            fontWeight: 700,
            padding: "10px 18px",
          }}
        >
          <FaSave style={{ marginRight: "8px" }} />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {loadError && (
        <Message
          type="error"
          showIcon
          closable
          style={{ marginBottom: "20px" }}
          onClose={() => setLoadError("")}
        >
          <strong>Erreur de chargement</strong>
          <div>{String(loadError)}</div>
          <Button size="sm" appearance="link" onClick={loadConfig}>
            Réessayer
          </Button>
        </Message>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "20px",
        }}
      >
        {/* Delivery attempts */}
        <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>
            <FaTruck style={{ color: "#2563eb" }} />
            Gestion des tentatives & Retour au dépôt
          </h3>

          <div>
            <label style={labelStyle}>
              Nombre maximum de tentatives avant retour au dépôt (maxDeliveryAttempts)
            </label>
            {numberInput("maxDeliveryAttempts")}
            <small style={{ color: "#475569", display: "block", marginTop: "6px", lineHeight: 1.5 }}>
              • Chaque fois que le livreur part en livraison avec un colis (<strong>StartDelivery</strong>), le compteur de tentatives augmente de <strong>+1</strong>.<br />
              • Lorsque le colis atteint <strong>{model.maxDeliveryAttempts || 3} tentative(s)</strong> sans être livré, il est automatiquement signalé comme <strong>Prêt pour retour au dépôt / boutique</strong>.
            </small>
          </div>

          <div
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: "10px",
              padding: "12px 14px",
              fontSize: "0.82rem",
              color: "#1e3a8a",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: "4px" }}>
              📷 Sécurité Opérationnelle : Scan QR / Code-barres Obligatoire
            </div>
            <div style={{ color: "#334155", lineHeight: 1.45 }}>
              Pour éviter toute erreur ou confusion :
              <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                <li>
                  <strong>Ramassage par le livreur (Pickup)</strong> : validé uniquement par scan du code-barres / QR code du colis.
                </li>
                <li>
                  <strong>Réception par le dépôt (Arrivée / Retour au dépôt)</strong> : validée uniquement par scan du code-barres / QR code du colis.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {/* <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>
            <FaBell style={{ color: "#d97706" }} />
            Notifications
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              background: "#f8fafc",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                Activer les notifications de livraison
              </div>
              <small style={{ color: "#64748b" }}>
                Autorise l'envoi des notifications prévues par le backend.
              </small>
            </div>
            <Toggle
              checked={model.enableDeliveryNotifications}
              onChange={(checked) =>
                updateField("enableDeliveryNotifications", checked)
              }
              checkedChildren="Oui"
              unCheckedChildren="Non"
            />
          </div>

          <div>
            <label style={labelStyle}>
              <FaEnvelope style={{ marginRight: "6px", color: "#2563eb" }} />
              Modèle de notification email
            </label>
            <Input
              as="textarea"
              rows={4}
              value={model.notificationEmailTemplate || ""}
              onChange={(value) =>
                updateField("notificationEmailTemplate", value)
              }
              placeholder="Your delivery is scheduled for {date}..."
            />
            <small style={{ color: "#64748b" }}>
              Utilisez {"{date}"} comme emplacement pour la date de livraison.
            </small>
          </div>

          <div>
            <label style={labelStyle}>
              <FaSms style={{ marginRight: "6px", color: "#059669" }} />
              Modèle de notification SMS
            </label>
            <Input
              as="textarea"
              rows={4}
              value={model.notificationSmsTemplate || ""}
              onChange={(value) =>
                updateField("notificationSmsTemplate", value)
              }
              placeholder="Your delivery is scheduled for {date}..."
            />
            <small style={{ color: "#64748b" }}>
              Le backend devra remplacer {"{date}"} avant l'envoi.
            </small>
          </div>
        </div> */}

        {/* Automatic return */}
        {/* <div style={cardStyle}>
          <h3 style={sectionTitleStyle}>
            <FaUndoAlt style={{ color: "#dc2626" }} />
            Retour automatique au dépôt
          </h3>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              background: "#f8fafc",
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
                Activer le retour automatique
              </div>
              <small style={{ color: "#64748b" }}>
                Active la règle de retour automatique configurée côté serveur.
              </small>
            </div>
            <Toggle
              checked={model.enableAutoReturnToDepot}
              onChange={(checked) =>
                updateField("enableAutoReturnToDepot", checked)
              }
              checkedChildren="Oui"
              unCheckedChildren="Non"
            />
          </div>

          <div>
            <label style={labelStyle}>
              Retour après (jours)
            </label>
            {numberInput("autoReturnToDepotAfterDays")}
            <small style={{ color: "#64748b" }}>
              Nombre de jours avant le déclenchement de la règle automatique.
            </small>
          </div>

          <Message type="info" showIcon>
            Cette page enregistre les paramètres. Le traitement automatique doit
            être implémenté dans le backend.
          </Message>
        </div> */}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "20px",
        }}
      >
        <Button
          appearance="primary"
          size="lg"
          loading={saving}
          disabled={saving || !!loadError}
          onClick={handleSave}
          style={{
            background: "#059669",
            border: "none",
            minWidth: "190px",
            fontWeight: 700,
          }}
        >
          <FaCheckCircle style={{ marginRight: "8px" }} />
          Enregistrer la configuration
        </Button>
      </div>
    </div>
  );
}