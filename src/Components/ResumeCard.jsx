import React from "react";
import { BiMoney } from "react-icons/bi";
import { IoExpandOutline } from "react-icons/io5";
import format_number from "../Helpers/number_formatter";

export default function ResumeCard({
  color = "79, 70, 229",
  text = "",
  currency = "TND",
  amount = 0,
  notAmount,
  icon,
  action,
}) {
  return (
    <div
      className={`card-resume ${action ? "with-action" : ""}`}
      onClick={action ? action : () => {}}
      style={{
        padding: "16px 18px",
        borderRadius: "14px",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        position: "relative",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        cursor: action ? "pointer" : "default",
        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          color: `rgb(${color})`,
          background: `rgba(${color}, 0.12)`,
          borderRadius: "12px",
          width: "48px",
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          flexShrink: 0,
        }}
      >
        {icon ? icon : <BiMoney />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "#64748b",
            fontSize: "0.8rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            marginBottom: "4px",
          }}
        >
          {text}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: "6px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "'JetBrains Mono', monospace",
              minWidth: 0,
              overflowWrap: "anywhere",
              lineHeight: 1.15,
            }}
          >
            {notAmount ? amount : format_number(amount)}
          </span>
          {!notAmount && (
            <span style={{ color: "#94a3b8", fontSize: "0.75rem", fontWeight: 600, flexShrink: 0 }}>
              {currency}
            </span>
          )}
        </div>
      </div>

      {action && (
        <div
          style={{
            color: "#94a3b8",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <IoExpandOutline />
        </div>
      )}
    </div>
  );
}
