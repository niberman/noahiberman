import { useEffect, useMemo, useState } from "react";
import {
  getMapController,
  subscribeMapController,
  type MapFlyToOptions,
} from "@/lib/mapController";

export function useMapController() {
  const [controller, setController] = useState(getMapController());

  useEffect(() => {
    return subscribeMapController(() => {
      setController(getMapController());
    });
  }, []);

  return useMemo(() => {
    return {
      flyTo: (options: MapFlyToOptions) => {
        controller?.flyTo(options);
      },
      isReady: !!controller,
    };
  }, [controller]);
}

