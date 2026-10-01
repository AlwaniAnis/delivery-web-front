import { useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { isLogged } from "../Atoms/auth.atom";
import { createAPIEndpoint } from "../Api/authenticated.requests";
import { ENDPOINTS } from "../Api/enpoints";
import { MyStore } from "../Atoms/store.atom";

const useB2B = () => {
  const [isB2B, setisB2B] = useState(false);
  const logged = useRecoilValue(isLogged);
  const setstore = useSetRecoilState(MyStore);
  useEffect(() => {
    let user = localStorage.getItem("auth");
    if (user) {
      user = JSON.parse(user);
      setisB2B(user.role == "B2Bclient");
      if (user.storeId)
        createAPIEndpoint(ENDPOINTS.Store)
          .fetchById(user.storeId)
          .then((res) => {
            if (res && res.data) setstore(res.data);
          })
          .catch(() => {});
      else
        createAPIEndpoint(ENDPOINTS.Store + "/getDefault")
          .customGet()
          .then((res) => {
            if (res && res.data) setstore(res.data);
          })
          .catch(() => {});
    }
  }, [logged]);
  return { isB2B };
};
export default useB2B;
