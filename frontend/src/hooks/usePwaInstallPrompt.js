import { useCallback, useEffect, useState } from "react";
import {
  getPwaInstallSnapshot,
  initializePwaInstallPrompt,
  promptPwaInstall,
  subscribePwaInstallPrompt,
} from "services/pwaInstall.service";

export default function usePwaInstallPrompt() {
  const [installState, setInstallState] = useState(getPwaInstallSnapshot);

  useEffect(() => {
    initializePwaInstallPrompt();
    setInstallState(getPwaInstallSnapshot());
    return subscribePwaInstallPrompt(() => setInstallState(getPwaInstallSnapshot()));
  }, []);

  const promptInstall = useCallback(() => promptPwaInstall(), []);

  return {
    ...installState,
    promptInstall,
    shouldShowInstall: !installState.isInstalled,
  };
}
