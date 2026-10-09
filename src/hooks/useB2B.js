import { useEffect } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import {
  activeRoleState,
  adminModuleState,
  isLogged,
  normalizeRole,
} from "../Atoms/auth.atom";
import { createAPIEndpoint } from "../Api/authenticated.requests";
import { ENDPOINTS } from "../Api/enpoints";
import { MyStore } from "../Atoms/store.atom";

const useB2B = () => {
  const logged = useRecoilValue(isLogged);
  const activeRole = useRecoilValue(activeRoleState);
  const adminModule = useRecoilValue(adminModuleState);
  const setstore = useSetRecoilState(MyStore);

  const normalizedRole = normalizeRole(activeRole);
  const isAdminStoreModule =
    normalizedRole === "admin" && adminModule === "store";
  const isB2B = normalizedRole === "B2Bclient" || isAdminStoreModule;

  useEffect(() => {
    if (normalizedRole === "depotAgent") return;

    let user = localStorage.getItem("auth");
    if (user) {
      try {
        user = JSON.parse(user);
        if (user.storeId) {
          createAPIEndpoint(ENDPOINTS.Store)
            .fetchById(user.storeId)
            .then((res) => {
              if (res && res.data) setstore(res.data);
            })
            .catch(() => {});
        } else {
          createAPIEndpoint(ENDPOINTS.Store + "/getDefault")
            .customGet()
            .then((res) => {
              if (res && res.data) setstore(res.data);
            })
            .catch(() => {});
        }
      } catch (e) {}
    }
  }, [logged, normalizedRole, setstore]);

  return { isB2B, isAdminStoreModule };
};
export default useB2B;
