import React from "react";
import { Button, IconButton, Loader, Modal } from "rsuite";
import ChangeListIcon from "@rsuite/icons/ChangeList";
import PlusRoundIcon from "@rsuite/icons/PlusRound";
import Divider from "rsuite/Divider";
import { exportAddAtom } from "../../../Atoms/exportAdd.atom";
import { useRecoilState } from "recoil";
// import ExportExcel from "./excelExport";

export default function ExportAdd({
  AddComponent,
  excelData,
  nameExcel,
  noExport,
  save,
  noAdd,
  ActionOnClose,
  handleExport,
  size,
  additionalBtn,
  title = "Ajouter",
  full,
}) {
  const handleOpen = () =>
    setstate((prev) => {
      return { ...prev, open: true };
    });
  const [state, setstate] = useRecoilState(exportAddAtom);
  const handleClose = () =>
    setstate((prev) => {
      return { ...prev, open: false };
    });
  const exportExcel = async () => {
    if (handleExport) {
      // await handleExport();
    }
    document.querySelector("#hidden-btn-export").click();
  };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "8px",
        padding: "12px 0",
        zIndex: "1",
        maxWidth: "100%",
      }}
    >
      {!noExport && (
        <Button color="green" onClick={exportExcel} appearance="primary">
          <ChangeListIcon /> Export
        </Button>
      )}

      {additionalBtn ? additionalBtn : ""}

      {!noAdd && (
        <>
          <Divider vertical></Divider>
          <IconButton
            onClick={handleOpen}
            appearance="primary"
            icon={<PlusRoundIcon />}
          >
            Ajout
          </IconButton>

          <Modal
            size={full ? "full" : size ? size : "lg"}
            overflow={false}
            style={{
              maxHeight: "calc(100vh - 50px)",
              overflow: "auto",
              maxWidth: "100vw",
            }}
            open={state.open}
            onClose={() => {
              handleClose();
              if (ActionOnClose) ActionOnClose();
            }}
          >
            <Modal.Header>
              <Modal.Title>{title}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div
                style={{
                  maxHeight: "calc(100vh - 240px)",
                  overflow: "auto",
                  maxWidth: "100vw",
                }}
              >
                {AddComponent}
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={save} appearance="primary">
                {state.loading ? <Loader size="sm" /> : "Enregistrer"}
              </Button>
              <Button
                onClick={() => {
                  handleClose();
                  if (ActionOnClose) ActionOnClose();
                }}
                appearance="subtle"
              >
                Annuler
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
      {/* <ExportExcel data={excelData} name={nameExcel} /> */}
    </div>
  );
}
