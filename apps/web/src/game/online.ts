import { useEffect, useState } from "react";

/** Whether the device says it is on the network (audit of 4 November, UX M10), read live. */
export function useOnline(onBack?: () => void) {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => {
      setOnline(true);
      onBack?.();
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [onBack]);
  return online;
}
