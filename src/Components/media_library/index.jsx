import React, { useRef, useState } from "react";
import "./filedrop.scss";
import classes from "./style.module.scss";

import TrashIcon from "@rsuite/icons/Trash";
import { useEffect } from "react";
import { FileDrop } from "react-file-drop";
import { Button, Checkbox, IconButton, SelectPicker } from "rsuite";
import { createAPIEndpoint } from "../../Api/authenticated.requests";
import { ENDPOINTS } from "../../Api/enpoints";
import { BASE_URL } from "../../Config/api.config";
import Progress from "./components/Progress/Progress.jsx";
export default function AnisMediaLibrary({
  medias,
  refresh,
  setfilter,
  filter,
  picker,
  onPick,
  reset,
  selected,
  small_path,
}) {
  const [add_opened, setadd_opened] = useState(false);
  const [picked, setpicked] = useState([]);
  const [tag, settag] = useState("");
  useEffect(() => {
    if (!reset) {
      setpicked([]);
    }
  }, [reset]);
  useEffect(() => {
    if (selected) {
      setpicked(selected);
      console.log("from lib");

      console.log(selected);
    }
  }, [selected]);
  return (
    <div className={classes.container + (picker ? " " + classes.picker : "")}>
      <div className={classes.header}>
        <div>
          <SelectPicker
            value={filter.type}
            onSelect={(type) => setfilter((prev) => ({ ...prev, type }))}
            defaultValue=""
            searchable={false}
            data={[
              { label: "Tout", value: "" },
              { label: "Image", value: "image" },
              { label: "Video", value: "video" },
            ]}
            className={classes.select}
          />
          <input
            value={tag}
            onChange={(e) => settag(e.target.value)}
            placeholder="chercher ..."
            style={{ margin: "5px" }}
          ></input>
          <button
            style={{
              color: "#fff",
              background: "#0b9666",
              padding: "6px 12px",
              borderRadius: "5px",
            }}
            onClick={() => setfilter((prev) => ({ ...prev, tag }))}
          >
            chercher
          </button>
        </div>
        <button
          style={{
            color: "#fff",
            background: "#0b9666",
            padding: "6px 12px",
            borderRadius: "5px",
          }}
          onClick={() => setadd_opened(!add_opened)}
        >
          upload +
        </button>
      </div>
      {add_opened && (
        <div
          style={{
            position: "fixed",
            zIndex: 199999999,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.1)",
            padding: "30px 2%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "10px",
              //   height: "100%",
              //   width: "100%",
              padding: "10px 2px",
              display: "inline-block",
              minWidth: "284px",
              width: "50%",
              maxHeight: "calc(100vh - 60px)",
              overflow: "auto",
            }}
          >
            <div style={{ textAlign: "right" }}>
              <button
                style={{
                  background: "#f1F1F1",
                  color: "#111",
                  fontWeight: "bold",
                }}
                onClick={() => setadd_opened(!add_opened)}
              >
                fermer
              </button>
            </div>
            <FileD
              refresh={() => {
                refresh();
                setadd_opened(false);
              }}
            />
          </div>
        </div>
      )}
      <div className={classes.imgs_container} style={{}}>
        {medias &&
          medias.map((m, i) => (
            <div
              className={classes.image_item}
              style={{ display: "inline-block", position: "relative" }}
            >
              <img
                alt="alt"
                style={{
                  borderRadius: "10px",
                  boxShadow:
                    "rgba(60, 64, 67, 0.3) 0px 1px 2px 0px, rgba(60, 64, 67, 0.15) 0px 2px 6px 2px",
                  border:
                    picked &&
                    picked.length &&
                    picked.find((el) => el.id == m.id)
                      ? "5px solid rgb(53,152,255)"
                      : "",
                  cursor: picker ? "pointer" : "",
                }}
                src={
                  BASE_URL + "Uploads/" + (m.small_path ? m.small_path : m.path)
                }
                onClick={() => {
                  if (picker) {
                    onPick(m);
                    if (picked.find((_el) => _el.id == m.id)) {
                      let medias = picked.filter((_el) => _el.id != m.id);
                      setpicked((prev) => [...medias]);
                    } else {
                      let medias = [...picked];
                      medias.push(m);
                      setpicked((prev) => [...medias]);
                    }
                  }
                }}
              />
              <div
                style={{
                  display: "flex",
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                }}
              >
                {picker ? (
                  <>
                    <span style={{ color: "#111" }}>
                      {" "}
                      <Checkbox
                        checked={picked.find((el) => el.id == m.id) != null}
                        onChange={(e) => {
                          onPick(m);
                          if (picked.find((_el) => _el.id == m.id)) {
                            let medias = picked.filter((_el) => _el.id != m.id);
                            setpicked((prev) => [...medias]);
                          } else {
                            let medias = [...picked];
                            medias.push(m);
                            setpicked((prev) => [...medias]);
                          }
                        }}
                      />
                    </span>
                  </>
                ) : (
                  <IconButton
                    onClick={() =>
                      createAPIEndpoint(ENDPOINTS.Media)
                        .delete(m.id)
                        .then((res) => refresh())
                    }
                    appearance="danger"
                    icon={<TrashIcon />}
                    circle
                  />
                )}
              </div>
            </div>
          ))}
      </div>{" "}
    </div>
  );
}
export function FileD({ refresh, single =true}) {
  const inputRef = useRef();
  const [filenames, setNames] = useState([]);
  const [tag, settag] = useState("");

  const fileHandler = async (files) => {
    const extension = files[0].name.split(".")[1]?.toLowerCase();
    if (extension !== undefined) {
      const fNames = Object.keys(files).map((name) => {
        return {
          name: files[name].name,
          icon: files[name].name.split(".")[1]?.toUpperCase().trim(),
          newName: "",
        };
      });
      setNames((prev) => [...prev, fNames].flat());
      let _names = [...filenames, ...fNames];
      console.log(files)
      Array.from(files).forEach(async file => {
        let uploaded = await createAPIEndpoint(ENDPOINTS.File+"/Visa").upload1(file);
        if(uploaded.data) {
          let i=_names.findIndex(el=>el.name==uploaded.data)
          let _f={..._names[i]}
          _f.newName = uploaded.data;
          _names[i]=_f

        }

      }); 
      setNames((prev) => [..._names]);
console.log(_names)
      //  if (single) {
      //}
    } else {
      alert("file type not supported");
    }
  };

  const filePicker = () => {
    inputRef.current.click();
  };

  const addMedias = async () => {
    let data = filenames.map((f) => ({
      path: f.newName,
      small_path: "thumb_" + f.newName,
      name: f.newName,
      type: single ? "wood" : "image",
      tags: tag,
    }));
    let res = await createAPIEndpoint(ENDPOINTS.Media + "/addMany").create(
      data
    );

    if (res.data && refresh) refresh();
    if (res.data && single) single(res.data[0]);
  };
  return (
    <div className="container">
      <h3>UPLOAD FILE</h3>
      <div className="progressContainer">
        {filenames &&
          filenames.map((file, i) => (
            <Progress
              key={i}
              name={file.name}
              icon={file.icon}
              uploaded={filenames[i].newName}
              
            />
          ))}
      </div>

      <FileDrop onTargetClick={filePicker} onDrop={(f) => fileHandler(f)}>
        <p className="placeholder">
          DRAG FILE HERE <br /> OR <span>BROWSE</span>
        </p>
        <input
          accept=" .png,  .jpg, .jpeg"
          value=""
          style={{ visibility: "hidden", opacity: 0 }}
          ref={inputRef}
          multiple="multiple"
          type="file"
          onChange={(e) => fileHandler(e.target.files)}
        />
      </FileDrop>
      {!single && (
        <input
          vcalue={tag}
          onChange={(e) => settag(e.target.value)}
          style={{
            padding: "8px 10px",
            borderRadius: "5px",
            border: "1px solid #aaa",

            width: "100%",
            margin: "10px 0",
          }}
          placeholder="entrer un  tag"
        />
      )}
      <div style={{ width: "100%" }}>
        <Button onClick={addMedias} appearance="primary">
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
