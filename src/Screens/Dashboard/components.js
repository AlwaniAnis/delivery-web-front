import React from "react";
import {
  XYPlot,
  VerticalBarSeries,
  RadialChart,
  DiscreteColorLegend,
} from "react-vis";

function Stats({
  loading = false,
  amount = "0.000",
  currency = "TND",
  title = "Montant Total",
  increase = 0,
  data = [
    { x: 0, y: 8 },
    { x: 1, y: 5 },
    { x: 2, y: 4 },
    { x: 3, y: 9 },
    { x: 4, y: 1 },
    { x: 5, y: 7 },
    { x: 6, y: 6 },
    { x: 7, y: 3 },
    { x: 8, y: 2 },
    { x: 9, y: 0 },
  ],
  color = "#4f46e5",
}) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", margin: "8px 0" }}>
        <span
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#0f172a",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "-0.02em",
          }}
        >
          {amount}
        </span>
        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#94a3b8" }}>
          {currency}
        </span>
      </div>

      <div
        style={{
          height: "45px",
          overflow: "hidden",
          position: "relative",
          left: "-20px",
          marginTop: "10px",
        }}
      >
        <XYPlot height={70} width={160} color={color}>
          <VerticalBarSeries data={data} barWidth={0.6} />
        </XYPlot>
      </div>
    </div>
  );
}

export default Stats;

export function Stats2({
  amount1 = 0,
  amount2 = 0,
  ration = 0,
  title = "Taux de Livraison Réussie",
  color = "#10b981",
}) {
  const safeRatio = Math.min(Math.max(Number(ration) || 0, 0), 100);
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        background: "#ffffff",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          fontSize: "0.8rem",
          fontWeight: 700,
          color: "#64748b",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "12px",
        }}
      >
        {title}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span
            style={{
              fontSize: "2rem",
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {safeRatio}%
          </span>
          <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "6px" }}>
            Taux de succès
          </span>
        </div>
        <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
          <strong style={{ color: color }}>{amount2}</strong> livrés / {amount1} total
        </div>
      </div>

      {/* Progress Track */}
      <div
        style={{
          backgroundColor: "#f1f5f9",
          height: "8px",
          borderRadius: "999px",
          margin: "16px 0 8px 0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            backgroundColor: color,
            height: "100%",
            borderRadius: "999px",
            width: `${safeRatio}%`,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

export function Stats3({ labels = [], colors = [], data = [] }) {
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        background: "#fff",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <DiscreteColorLegend
        orientation="horizontal"
        height={80}
        colorRange={colors}
        items={labels}
      />
      <RadialChart
        innerRadius={30}
        padAngle={0.03}
        colorRange={colors}
        data={data}
        width={260}
        height={260}
      />
    </div>
  );
}
