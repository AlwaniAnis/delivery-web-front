export default function downloadData(filenameForDownload="file", data , extension=".zip") {
    var textUrl = URL.createObjectURL(data);
    var element = document.createElement("a");
    debugger;
    element.setAttribute("href", textUrl);
    filenameForDownload =
      filenameForDownload.length > 0
        ? filenameForDownload
        : textUrl.replace(/^.*[\\\/]/, "");
    element.setAttribute("download", filenameForDownload+extension);
    // element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    console.log("done");
  }
