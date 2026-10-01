import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { RecoilRoot } from "recoil";
import { BrowserRouter as Router } from "react-router-dom";
import "rsuite/dist/rsuite.min.css";

// Suppress harmless browser ResizeObserver loop notifications
window.addEventListener("error", (e) => {
  if (
    typeof e?.message === "string" &&
    (e.message.includes("ResizeObserver loop") ||
      e.message.includes("ResizeObserver loop completed with undelivered notifications"))
  ) {
    e.stopImmediatePropagation();
  }
});

ReactDOM.render(
  <RecoilRoot>
    <Router>
      <App />
    </Router>
  </RecoilRoot>,
  document.getElementById("root")
);
