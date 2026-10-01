import React, { Component, useEffect, useState } from "react";

export default function Responsive(props) {
  const [state, setstate] = useState("");
  useEffect(() => {
    if (window.innerWidth <= 576 && props.xs) {
      setstate("xs");
    } else if (window.innerWidth > 576 && window.innerWidth <= 768 && props.s)
      setstate("s");
    else if (window.innerWidth > 768 && window.innerWidth <= 992 && props.m)
      setstate("m");
    else if (window.innerWidth > 992 && window.innerWidth <= 1200 && props.l)
      setstate("l");
    else if (window.innerWidth > 1200 && props.xl) setstate("xl");
    else setstate("");
    window.addEventListener("resize", getWidth);
    return () => {
      window.removeEventListener("resize", getWidth);
    };
  }, [state, props]);
  function getWidth() {
    if (window.innerWidth <= 576 && props.xs) {
      setstate("xs");
    } else if (window.innerWidth > 576 && window.innerWidth <= 768 && props.s)
      setstate("s");
    else if (window.innerWidth > 768 && window.innerWidth <= 992 && props.m)
      setstate("m");
    else if (window.innerWidth > 992 && window.innerWidth <= 1200 && props.l)
      setstate("l");
    else if (window.innerWidth > 1200 && props.xl) setstate("xl");
    else setstate("");
  }
  return (
    <div
      style={{
        display: "inline-block",
        width:
          state == "xs"
            ? props.xs * (100 / 12) + "%"
            : state == "s"
            ? props.s * (100 / 12) + "%"
            : state == "m"
            ? props.m * (100 / 12) + "%"
            : state == "l"
            ? props.l * (100 / 12) + "%"
            : state == "xl"
            ? props.xl * (100 / 12) + "%"
            : "100%",
        ...props.style,
        verticalAlign: "top",

        margin: props.margin ? props.margin : 0,
        boxSizing: "border-box",
      }}
      className={props.className}
    >
      {props.children}
    </div>
  );
}
