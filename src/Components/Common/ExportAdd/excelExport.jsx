import ReactExport from "react-data-export";

function ExportExcel({ name, data, ...props }) {
  const ExcelFile = ReactExport.ExcelFile;
  const ExcelSheet = ReactExport.ExcelFile.ExcelSheet;

  return (
    <ExcelFile
      filename={name ? name : "file"}
      element={
        <button
          style={{
            width: "0",
            height: "0",
            opacity: 0,
            overflow: "hidden",
          }}
          type="button"
          id="hidden-btn-export"
        >
          download
        </button>
      }
    >
      <ExcelSheet dataSet={data} name={name ? name : "file"} />
    </ExcelFile>
  );
}
export default ExportExcel;
