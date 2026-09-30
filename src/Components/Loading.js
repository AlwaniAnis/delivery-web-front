import React from "react";

export default function Loading({ absolute }) {
  return (
    <div
      style={{
        zIndex: 9999999,
        position: absolute ? "absolute" : "fixed",
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(255,255,255,0.85)",
        height: absolute ? "100%" : "100vh",
      }}
    >
      <img
        alt="... loading"
        style={{
          position: "absolute",
          top: absolute ? "30vh" : "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "60px",
          height: "60px",
        }}
        src="\svg-loaders\rings.svg"
      />
    </div>
  );
}
