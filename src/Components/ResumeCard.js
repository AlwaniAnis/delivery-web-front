import React from "react";
import { BiMoney } from "react-icons/bi";
import { IoExpandOutline } from "react-icons/io5";
import format_number from "../Helpers/number_formatter";
export default function ResumeCard({
  color = "70,103,209",
  text = "",
  currency = "TND",
  amount = 0,
  notAmount,
  icon,
  action,radius=50
}) {
  return (
    <div
      className={"card-resume" + (action ? " with-action" : "")}
      onClick={action ? action : () => {}}
    >
      <span
        style={{
          color: `rgba(${color})`,
          background: `rgba(${color},0.3)`,
          borderRadius: radius+"%",
          width: "50px",
          height: "50px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "20px",
          marginRight: "10px",
        }}
      >
        {icon ? icon : <BiMoney fontSize="30px" />}
      </span>
      <div>
        <b>{text}</b> <br></br>
        <strong>{notAmount ? amount : format_number(amount)}</strong>{" "}
        {notAmount ? (
          ""
        ) : (
          <span style={{ color: "#888", fontSize: "11px", fontWeight: "400" }}>
            {currency}
          </span>
        )}
      </div>

      <button>
        <IoExpandOutline />
      </button>

      <style jsx>{`
      .card-resume  button {
          display: none;
        }
        .card-resume {
          padding: 10px;
          box-shadow: 0 0.46875rem 2.1875rem rgb(4 9 20 / 3%),
            0 0.9375rem 1.40625rem rgb(4 9 20 / 3%),
            0 0.25rem 0.53125rem rgb(4 9 20 / 5%),
            0 0.125rem 0.1875rem rgb(4 9 20 / 3%);
          position: relative;
          border-radius: 8px;
          background: #fff;
          display: flex;
          box-sizing: border-box;
        }
        .with-action {
          cursor: pointer;
        }
        .with-action:hover button {
          background: #444;
          color: #fff;
          position: absolute;
          right: 8px;
          bottom: 8px;
          display: inline-flex;
          border-radius: 4px;
          height: 30px;
          align-items: center;
          font-size: 20px;
        }

        .card-resume strong {
          font-weight: 700;
          color: rgb(73, 80, 87);
        }
        .card-resume b {
          color: #888;
          font-size: 15px;
          text-transform: uppercase;
          font-weight: 400;
        }
      `}</style>
    </div>
  );
}
