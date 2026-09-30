import React from "react";
import {
  XYPlot,
  LineSeries,
  VerticalBarSeries,
  RadialChart,
  DiscreteColorLegend,
} from "react-vis";
import { DeliveryStatus, SaleStatus } from "../../Constants/types";

function Stats({
  loading = false,
  amount = 0.0,
  currency = "TND",
  title = "Test",
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
  color = "rgb(93,120,255)",
}) {
  return (
    <div
      style={{
        wordWrap: "break-word",
        border: "1px solid rgba(0, 0, 0, 0.125)",
        background: "#fff",
        padding: "10px",
        boxShadow: " 0 0 10px rgb(28 39 60 / 6%)",
      }}
    >
      {loading ? (
        <div></div>
      ) : (
        <>
          <h6 style={{ textTransform: "uppercase" }}>{title}</h6>
          <div
            style={{
              height: "70px",
              overflow: "hidden",
              position: "relative",
              left: "-30px",
            }}
          >
            {" "}
            <XYPlot height={100} width={130} color={color}>
              <VerticalBarSeries data={data} />
            </XYPlot>
          </div>
          <div>
            <span
              style={{
                fontSize: "15px",
                fontWeight: "lighter",
              }}
            >
              {currency}
            </span>{" "}
            <b
              style={{
                fontSize: "25px",
                fontWeight: "bolder",
              }}
            >
              {amount}
            </b>
          </div>
          {increase ? (
            <div>
              <b
                style={{
                  color: increase > 0 ? "rgb(84,177,7)" : "rgb(221,59,75)",
                }}
              >
                {increase} %
              </b>{" "}
              <i>
                {increase > 0
                  ? "plus élevé que le mois précédent"
                  : "inférieur par rapport au mois précédent"}
              </i>
            </div>
          ) : (
            ""
          )}
        </>
      )}
    </div>
  );
}

export default Stats;

export function Stats2({
  amount1 = "0.000",
  amount2 = "1.000",
  ration = (0).tofixed(2),
  title = "Rapport Vente-Recouvrement",
  color = "rgb(84,177,7)",
}) {
  return (
    <div
      style={{
        wordWrap: "break-word",
        border: "1px solid rgba(0, 0, 0, 0.125)",
        background: "#fff",
        padding: "10px",
        boxShadow: " 0 0 10px rgb(28 39 60 / 6%)",
      }}
    >
      <h4 style={{ textTransform: "uppercase" }}>{title}</h4>
      <div
        style={{
          backgroundColor: "#eee",
          height: "10px",
          borderRadius: "5px",
          margin: "50px 0 10px 0",
        }}
      >
        <div
          style={{
            backgroundColor: color,
            height: "10px",
            borderRadius: "5px",

            width: ration + "%",
          }}
        ></div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span> {amount2}</span>
        <b style={{ color }}>{ration + "%"}</b>
        <span> {amount1}</span>
      </div>
    </div>
  );
}

export function Stats3({ labels = [], colors = [], data = [] }) {
  return (
    <div
      style={{
        wordWrap: "break-word",
        border: "1px solid rgba(0, 0, 0, 0.125)",
        background: "#fff",
        padding: "10px",
        boxShadow: " 0 0 10px rgb(28 39 60 / 6%)",
      }}
    >
      <DiscreteColorLegend
        orientation="horizontal"
        height={100}
        colorRange={colors}
        // width={600}
        items={labels}
      />
      <RadialChart
        innerRadius={20}
        padAngle={0.03}
        colorRange={colors}
        data={data}
        width={300}
        height={300}
      />
    </div>
  );
}

const COLORS = [
  "#6588cd",
  "#66b046",
  "#a361c7",
  "#ad953f",
  "#c75a87",
  "#55a47b",
  "#cb6141",
];
