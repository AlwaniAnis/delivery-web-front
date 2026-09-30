export default function TopBarLoader({ color = "150,150,150" }) {
  return (
    <div className="top-bar-loader">
      <style jsx>
        {`
          .top-bar-loader {
            height: 5px;
            width: 100%;
            background: rgba(${color}, 0.3);
          }
        `}
      </style>
    </div>
  );
}
