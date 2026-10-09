import React, { useEffect, useState } from "react";

export default function Responsive(props) {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  let cols = 12;
  if (viewportWidth <= 480) {
    // On phone screens <= 480px, always stack full-width (12/12) so cards and inputs never clip
    cols = 12;
  } else if (viewportWidth <= 576) {
    cols = props.xs ? props.xs : 12;
  } else if (viewportWidth <= 768) {
    cols = props.s ? props.s : props.m || props.l || props.xl ? 6 : 12;
  } else if (viewportWidth <= 992) {
    cols = props.m ? props.m : props.l ? Math.max(props.l, 6) : 12;
  } else if (viewportWidth <= 1200) {
    cols = props.l ? props.l : props.xl ? props.xl : 12;
  } else {
    cols = props.xl ? props.xl : props.l ? props.l : 12;
  }

  const widthPct = `${Math.min(100, Math.max(10, cols * (100 / 12)))}%`;

  return (
    <div
      style={{
        display: "inline-block",
        width: widthPct,
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

