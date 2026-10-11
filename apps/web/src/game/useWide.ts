import { useEffect, useState } from "react";

/** True on a computer-sized screen (Tailwind's lg breakpoint): side panels instead of sheets. */
export function useWide(): boolean {
  const query = "(min-width: 1024px)";
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );
  useEffect(() => {
    const m = window.matchMedia(query);
    const update = () => setWide(m.matches);
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return wide;
}
