import React, { useRef, useState } from "react";
import { Input, Loader, Message, SelectPicker, TagPicker } from "rsuite";
import { useRecoilValue } from "recoil";
import Swal from "sweetalert2";
import {
  FaWarehouse,
  FaCloudUploadAlt,
  FaFileAlt,
  FaFilePdf,
  FaFileImage,
  FaTrash,
  FaExternalLinkAlt,
  FaIdCard,
} from "react-icons/fa";
import { cities } from "../../Data/cities";
import { preparationPlacesState } from "../../Atoms/preparationPlaces.atom";
import { activeRoleState, currentDepotIdState, normalizeRole } from "../../Atoms/auth.atom";
import { APi } from "../../Api";
import { BASE_URL } from "../../Config/api.config";
import { parseDriverDocuments } from "../../Constants/types";

export const getDriverUploadUrl = (fileName) => {
  const cleanBase = (BASE_URL || "https://deliveryapi.a2dev.org/").replace(/\/$/, "");
  return `${cleanBase}/uploads/${encodeURIComponent(fileName)}`;
};

export const isImageFileName = (fileName) => {
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fileName || "");
};

function AddEdit({
  _setmodel,
  error,
  onDriverDocumentsSynced,
  model = {
    cin: "",
    phone1: "",
    phone2: "",
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    carNumber: "",
    cities: "",
    solde: 0,
    documents: "",
    preparationPlaceId: 1,
  },
}) {
  const depotsList = useRecoilValue(preparationPlacesState);
  const activeRole = useRecoilValue(activeRoleState);
  const currentDepotId = useRecoilValue(currentDepotIdState);
  const isDepotAgent = normalizeRole(activeRole) === "depotAgent";

  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingFileName, setDeletingFileName] = useState("");
  const fileInputRef = useRef(null);

  const currentPlaceId = Number(
    model.preparationPlaceId ||
      model.preparationPlace?.id ||
      (isDepotAgent ? currentDepotId : depotsList?.[0]?.id) ||
      1
  );

  const docsList = parseDriverDocuments(model);

  const syncDriverInBackendIfExisting = async (nextDocsString, nextModelSnapshot) => {
    if (!nextModelSnapshot?.id) return;
    const placeId = Number(
      isDepotAgent
        ? currentDepotId || 1
        : nextModelSnapshot.preparationPlaceId ||
            nextModelSnapshot.preparationPlace?.id ||
            depotsList?.[0]?.id ||
            1
    );
    const payload = {
      ...nextModelSnapshot,
      preparationPlaceId: placeId,
      documents: nextDocsString,
      Documents: nextDocsString,
    };
    delete payload.preparationPlace;
    delete payload.tarifId;
    delete payload.TarifId;
    delete payload.tarif;
    delete payload.isPicker;
    delete payload.IsPicker;

    await APi.createAPIEndpoint(APi.ENDPOINTS.Driver).update(nextModelSnapshot.id, payload);
    if (typeof onDriverDocumentsSynced === "function") {
      onDriverDocumentsSynced(nextModelSnapshot.id, nextDocsString);
    }
  };

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingDoc(true);
    const uploadedNames = [];

    try {
      for (const file of files) {
        const res = await APi.createAPIEndpoint(APi.ENDPOINTS.Upload).upload1(file);
        const returnedName =
          typeof res.data === "string"
            ? res.data.trim()
            : res.data?.fileName || res.data?.name || "";
        if (returnedName) {
          uploadedNames.push(returnedName);
        }
      }

      if (uploadedNames.length > 0) {
        const mergedDocs = Array.from(new Set([...docsList, ...uploadedNames]));
        const nextDocsString = mergedDocs.join(",");
        const nextModel = {
          ...model,
          documents: nextDocsString,
          Documents: nextDocsString,
        };
        _setmodel(nextModel);

        if (model.id) {
          await syncDriverInBackendIfExisting(nextDocsString, nextModel);
        }

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: model.id
            ? "Document téléversé et fiche livreur mise à jour !"
            : "Document téléversé avec succès !",
          showConfirmButton: false,
          timer: 1800,
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Erreur d'upload",
        text:
          err?.response?.data ||
          err?.message ||
          "Impossible de téléverser le document sur le serveur.",
      });
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteDocument = async (fileName) => {
    setDeletingFileName(fileName);
    try {
      await APi.createAPIEndpoint(APi.ENDPOINTS.Upload)
        .delete(encodeURIComponent(fileName))
        .catch(() => {});

      const remaining = docsList.filter((f) => f !== fileName);
      const nextDocsString = remaining.join(",");
      const nextModel = {
        ...model,
        documents: nextDocsString,
        Documents: nextDocsString,
      };
      _setmodel(nextModel);

      if (model.id) {
        await syncDriverInBackendIfExisting(nextDocsString, nextModel);
      }

      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Document supprimé !",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible de supprimer le fichier.",
      });
    } finally {
      setDeletingFileName("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          background: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
          borderRadius: "10px",
          padding: "12px 14px",
        }}
      >
        <label
          style={{
            fontWeight: 800,
            color: "#065f46",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "6px",
            fontSize: "0.85rem",
          }}
        >
          <FaWarehouse style={{ color: "#059669" }} /> Dépôt d'Affectation (PreparationPlace) * :
        </label>
        {isDepotAgent ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #86efac",
              borderRadius: "8px",
              padding: "8px 12px",
              fontWeight: 700,
              color: "#0f172a",
              fontSize: "0.85rem",
            }}
          >
            🏢{" "}
            {depotsList.find((d) => Number(d.id) === Number(currentDepotId))?.name ||
              `Dépôt #${currentDepotId}`}
          </div>
        ) : (
          <SelectPicker
            data={(depotsList || []).map((d) => ({
              label: `🏢 ${d.name} (${d.code || `DEP-${d.id}`})`,
              value: Number(d.id),
            }))}
            block
            cleanable={false}
            searchable={true}
            placeholder="Choisir le dépôt (PreparationPlace)..."
            value={currentPlaceId}
            onSelect={(val) => {
              _setmodel((prev) => ({
                ...prev,
                preparationPlaceId: Number(val),
              }));
            }}
          />
        )}
        <small style={{ display: "block", color: "#047857", marginTop: "4px", fontSize: "0.75rem" }}>
          Chaque livreur appartient directement à un dépôt (PreparationPlace).
        </small>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Nom :</label>
          <Input
            onChange={(lastName) => {
              _setmodel((prev) => ({ ...prev, lastName }));
            }}
            value={model.lastName || ""}
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Prénom :</label>
          <Input
            onChange={(firstName) => {
              _setmodel((prev) => ({ ...prev, firstName }));
            }}
            value={model.firstName || ""}
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Secteur :</label>
        <TagPicker
          data={cities.map((el) => ({ value: el, label: el }))}
          block
          onSelect={(s) => {
            _setmodel((prev) => ({ ...prev, cities: s.join() }));
          }}
          onChange={(s) => {
            _setmodel((prev) => ({ ...prev, cities: (s || []).join() }));
          }}
          value={model.cities ? model.cities.split(",") : []}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>CIN :</label>
          <Input
            value={model.cin || ""}
            onChange={(cin) => {
              _setmodel((prev) => ({ ...prev, cin }));
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
            Matricule Voiture :
          </label>
          <Input
            value={model.carNumber || ""}
            onChange={(carNumber) => {
              _setmodel((prev) => ({ ...prev, carNumber }));
            }}
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Email :</label>
        <Input
          value={model.email || ""}
          onChange={(email) => {
            _setmodel((prev) => ({ ...prev, email }));
          }}
          type="email"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
            Téléphone 1 :
          </label>
          <Input
            value={model.phone1 || ""}
            onChange={(phone1) => {
              _setmodel((prev) => ({ ...prev, phone1 }));
            }}
            type="tel"
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>
            Téléphone 2 :
          </label>
          <Input
            value={model.phone2 || ""}
            onChange={(phone2) => {
              _setmodel((prev) => ({ ...prev, phone2 }));
            }}
            type="tel"
          />
        </div>
      </div>

      <div>
        <label style={{ fontWeight: 700, fontSize: "0.82rem", color: "#334155" }}>Adresse :</label>
        <Input
          value={model.address || ""}
          onChange={(address) => {
            _setmodel((prev) => ({ ...prev, address }));
          }}
        />
      </div>

      <div>
        <label style={{ fontWeight: 700, color: "#166534", display: "block", fontSize: "0.82rem" }}>
          💰 Solde Portefeuille Livreur (TND) :
        </label>
        <Input
          type="number"
          step="0.100"
          placeholder="0.000"
          value={model.solde ?? model.Solde ?? 0}
          onChange={(val) => {
            const num = parseFloat(val) || 0;
            _setmodel((prev) => ({ ...prev, solde: num, Solde: num }));
          }}
        />
      </div>

      {/* DRIVER DOCUMENTS UPLOAD & RETRIEVAL SECTION */}
      <div
        style={{
          background: "#eff6ff",
          border: "1.5px solid #bfdbfe",
          borderRadius: "12px",
          padding: "14px",
          marginTop: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          <div>
            <label
              style={{
                fontWeight: 800,
                color: "#1e3a8a",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.85rem",
                margin: 0,
              }}
            >
              <FaIdCard style={{ color: "#2563eb" }} /> Documents du Livreur (CIN, Permis, Carte Grise...) :
            </label>
            <small style={{ color: "#475569", fontSize: "0.74rem", display: "block", marginTop: "2px" }}>
              Téléversez les pièces justificatives via <code>/api/Upload</code>. Fichiers accessibles sous <code>/uploads/+nom</code>.
            </small>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleUploadFiles}
              style={{ display: "none" }}
            />
            <button
              type="button"
              disabled={uploadingDoc}
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "7px 14px",
                fontWeight: 700,
                fontSize: "0.8rem",
                cursor: uploadingDoc ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {uploadingDoc ? (
                <>
                  <Loader size="xs" inverse /> Upload en cours...
                </>
              ) : (
                <>
                  <FaCloudUploadAlt size={14} /> Ajouter Document (CIN / Permis)
                </>
              )}
            </button>
          </div>
        </div>

        {docsList.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px dashed #93c5fd",
              borderRadius: "8px",
              padding: "12px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "0.78rem",
            }}
          >
            Aucun document attaché pour ce livreur. Cliquez sur « Ajouter Document » pour téléverser sa Carte d'Identité (CIN) ou son permis.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            {docsList.map((fileName, idx) => {
              const fileUrl = getDriverUploadUrl(fileName);
              const isImg = isImageFileName(fileName);
              const isPdf = /\.pdf$/i.test(fileName);
              return (
                <div
                  key={`${fileName}-${idx}`}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    {isImg ? (
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        <img
                          src={fileUrl}
                          alt={fileName}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          style={{
                            width: "42px",
                            height: "42px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                          }}
                        />
                      </a>
                    ) : isPdf ? (
                      <FaFilePdf size={24} style={{ color: "#dc2626", flexShrink: 0 }} />
                    ) : (
                      <FaFileAlt size={22} style={{ color: "#2563eb", flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          color: "#0f172a",
                          wordBreak: "break-all",
                        }}
                      >
                        Document #{idx + 1} — <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#475569" }}>{fileName}</span>
                      </div>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "0.74rem",
                          color: "#2563eb",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          marginTop: "2px",
                        }}
                      >
                        <FaExternalLinkAlt size={10} /> Ouvrir / Télécharger (/uploads/{fileName})
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={deletingFileName === fileName}
                    onClick={() => handleDeleteDocument(fileName)}
                    style={{
                      background: "#fef2f2",
                      color: "#dc2626",
                      border: "1px solid #fecaca",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                    title="Supprimer ce fichier du serveur (/api/Upload/{fileName})"
                  >
                    <FaTrash size={11} />
                    {deletingFileName === fileName ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <Message showIcon type="error">
          {error}
        </Message>
      )}
    </div>
  );
}

export default AddEdit;

