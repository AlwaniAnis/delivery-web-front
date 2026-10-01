import React from "react";
import { Button, IconButton } from "rsuite";
import styles from "./filter.module.scss";
import SpinnerIcon from "@rsuite/icons/legacy/Spinner";
import SearchIcon from "@rsuite/icons/Search";
import SettingHorizontalIcon from "@rsuite/icons/SettingHorizontal";
import { FaFilter } from "react-icons/fa";

export default function Filter({
  advanced,
  search,
  loading,
  title = "Filtres de recherche",
  onReset,
  children,
  ...props
}) {
  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterHeader}>
        <div className={styles.filterTitle}>
          <FaFilter />
          <span>{title}</span>
        </div>
      </div>

      <div className={styles.filterBody}>
        <div className={styles.filterFields}>{children}</div>

        <div className={styles.filterActions}>
          <Button
            className={styles.searchBtn}
            onClick={() => search && search()}
            disabled={loading}
          >
            {loading ? (
              <SpinnerIcon pulse style={{ fontSize: "1.2em" }} />
            ) : (
              <>
                <SearchIcon />
                <span>Rechercher</span>
              </>
            )}
          </Button>

          {advanced && (
            <IconButton
              appearance="subtle"
              icon={<SettingHorizontalIcon />}
              title="Filtres avancés"
              style={{ borderRadius: "8px", height: "38px" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
