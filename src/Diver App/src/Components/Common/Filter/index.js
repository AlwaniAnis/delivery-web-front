import { Button, Grid, IconButton, SelectPicker } from "rsuite";
import React, { useState } from "react";
import { Col, Input, Row } from "rsuite";
import styles from "./filter.module.scss";
import SpinnerIcon from "@rsuite/icons/legacy/Spinner";
import SearchIcon from "@rsuite/icons/Search";
import SettingHorizontalIcon from "@rsuite/icons/SettingHorizontal";
import Responsive from "../../Responsive";
export default function Filter({ advanced, search, loading, ...props }) {
  return (
    <div className={styles.container}>
      <div>{props.children}</div>

      <div className="p-10">
        <Button appearance="primary" color="violet" onClick={() => search()}>
          {loading ? (
            <SpinnerIcon pulse style={{ fontSize: "2em" }} />
          ) : (
            <>
              {" "}
              <SearchIcon /> Recherche
            </>
          )}
        </Button>{" "}
        {advanced && <IconButton icon={<SettingHorizontalIcon />} />}
      </div>
    </div>
  );
}
const style = { display: "block" };
