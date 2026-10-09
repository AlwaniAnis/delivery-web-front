import React from "react";
import "./grid.css";
import GridIcon from "@rsuite/icons/Grid";
import { Edit, More } from "@rsuite/icons";
import { Dropdown, IconButton, Popover, Whisper } from "rsuite";
import TrashIcon from "@rsuite/icons/Trash";
import Swal from "sweetalert2";
import Loading from "../Loading";
import { FaInbox } from "react-icons/fa";

class Grid extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      index: 0,
      rows: [],
      pageSize: this.props.itemsPerPage,
    };
  }

  handleEvent2 = (event, id) => {
    var d = this.state.rows;
    var order1 = d[d.findIndex((x) => x.id === this.state.index)].order;
    var order2 = d[d.findIndex((x) => x.id === id)].order;
    d[d.findIndex((x) => x.id === id)].order = order1;
    d[d.findIndex((x) => x.id === this.state.index)].order = order2;
    d.sort((a, b) => a.order - b.order);
    this.setState({ rows: d, style: false });
  };

  onChange = (current, pageSize) => {
    this.props.paginate(this.props.filter, current, pageSize);
  };

  render() {
    let columns = this.props.columns;
    this.state.rows = this.props.rows;
    const props = this.props;

    return (
      <div id="custom-table-container">
        {this.props.loading && <Loading absolute></Loading>}
        <table id="custom-table">
          <tbody>
            <tr className="top-table-row">
              {columns &&
                columns.map((item, index) => {
                  return (
                    <td key={index} style={item.style}>
                      <span className={item["class"]}>{item.name}</span>
                    </td>
                  );
                })}
              {props.actionKey && (
                <td style={{ textAlign: "right", paddingRight: "20px" }}>
                  Actions
                </td>
              )}
            </tr>
            {columns &&
              this.state.rows &&
              this.state.rows.map((row, index) => {
                return (
                  <tr
                    style={{
                      direction: this.props.rtl ? "rtl" : "",
                      cursor: "pointer",
                    }}
                    key={index}
                    className="hovred-tr border-bottom body-table-row"
                  >
                    {this.props.draggable ? (
                      <td style={{ width: "30px", padding: "6px" }}>
                        <div
                          onDragOver={() => {
                            this.setState({ index: row.id });
                          }}
                          onDragEnd={(e) => {
                            this.handleEvent2(e, row.id);
                          }}
                        >
                          <span style={{ cursor: "grab" }} draggable={true}>
                            <GridIcon size="18px" />
                          </span>
                        </div>
                      </td>
                    ) : null}

                    {columns.map((column, i) => {
                      return (
                        <td
                          style={{ direction: this.props.rtl ? "rtl" : "" }}
                          className={column["tdClass"]}
                          key={i}
                          onClick={() =>
                            column.click
                              ? column.click(row[column.value])
                              : column.deleteLocal
                              ? column.deleteLocal(index)
                              : column.editLocal
                              ? column.editLocal(index)
                              : ""
                          }
                        >
                          {column.value4
                            ? column.render(
                                row[column.value],
                                row[column.value2],
                                row[column.value3],
                                row[column.value4],
                                row
                              )
                            : column.value3
                            ? column.render(
                                row[column.value],
                                row[column.value2],
                                row[column.value3],
                                row
                              )
                            : column.value2
                            ? column.render(
                                row[column.value],
                                row[column.value2],
                                row
                              )
                            : column.render(row[column.value], row)}
                        </td>
                      );
                    })}
                    {props.actionKey && (
                      <td style={{ textAlign: "right", paddingRight: "16px" }}>
                        {ActionCell({
                          row,
                          dataKey: row[props.actionKey],
                          noAdvancedActions: props.noAdvancedActions,
                          editAction:
                            props.canEditRow && !props.canEditRow(row)
                              ? false
                              : props.editAction,
                          deleteAction:
                            props.canDeleteRow && !props.canDeleteRow(row)
                              ? false
                              : props.deleteAction,
                          lockedRowMessage:
                            props.canEditRow && !props.canEditRow(row)
                              ? props.lockedRowLabel || "Verrouillé"
                              : null,
                          actions: props.actions,
                        })}
                      </td>
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {(!this.props.rows || !this.props.rows.length) && !this.props.loading && (
          <div className="grid-empty-state">
            <div className="grid-empty-icon">
              <FaInbox />
            </div>
            <h4 className="grid-empty-title">Aucune donnée disponible</h4>
            <p className="grid-empty-desc">
              Les enregistrements apparaîtront ici dès qu'ils seront ajoutés ou reçus du serveur.
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default Grid;

const renderMenu = (
  { onClose, left, top, className },
  ref,
  events = [],
  dataKey
) => {
  const handleSelect = (eventKey) => {
    onClose();
    if (events[eventKey]?.action) {
      events[eventKey].action(dataKey);
    }
  };
  return (
    <Popover ref={ref} className={className} style={{ left, top }} full>
      <Dropdown.Menu onSelect={handleSelect}>
        {events.map((ev, i) => (
          <Dropdown.Item key={i} eventKey={i}>
            {ev.render ? ev.render(ev.label, dataKey) : ev.label}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Popover>
  );
};

const ActionCell = ({
  dataKey,
  noAdvancedActions,
  editAction,
  deleteAction,
  lockedRowMessage,
  actions,
}) => {
  function handleDelete() {
    Swal.fire({
      title: "Confirmer la suppression ?",
      text: "Cette action est irréversible.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Oui, supprimer",
      cancelButtonText: "Annuler",
    }).then((result) => {
      if (result.isConfirmed) {
        deleteAction(dataKey);
      }
    });
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
      {!editAction && !deleteAction && lockedRowMessage && (
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "#64748b",
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            padding: "3px 7px",
            borderRadius: "5px",
            whiteSpace: "nowrap",
          }}
          title="Modification et suppression désactivées après le ramassage (Pickup)"
        >
          {lockedRowMessage}
        </span>
      )}
      {editAction && (
        <IconButton
          className="grid-action-btn-edit"
          appearance="subtle"
          onClick={() => editAction(dataKey)}
          icon={<Edit />}
          size="sm"
          circle
          title="Modifier"
        />
      )}
      {deleteAction && (
        <IconButton
          className="grid-action-btn-delete"
          appearance="subtle"
          onClick={handleDelete}
          icon={<TrashIcon />}
          size="sm"
          circle
          title="Supprimer"
        />
      )}
      {!noAdvancedActions && actions && actions.length > 0 && (
        <Whisper
          placement="autoVerticalEnd"
          trigger="click"
          speaker={(el, ref) => renderMenu(el, ref, actions, dataKey)}
        >
          <IconButton
            className="grid-action-btn-more"
            appearance="subtle"
            icon={<More />}
            size="sm"
            circle
            title="Options"
          />
        </Whisper>
      )}
    </div>
  );
};
