import type { SkyPhase } from "../art/domain.js";

/** The light of each hour: sun, sky and ground, haze, exposure. Shared by the 3D scenes. */
export const LIGHT: Record<
  SkyPhase,
  {
    sun: string;
    sunI: number;
    sky: string;
    ground: string;
    hemiI: number;
    fog: string;
    exposure: number;
  }
> = {
  day: {
    sun: "#FFE6C0",
    sunI: 2.6,
    sky: "#DCEBFF",
    ground: "#6B5A3A",
    hemiI: 1.15,
    fog: "#DCD8C2",
    exposure: 1.05,
  },
  dusk: {
    sun: "#FFB070",
    sunI: 2.0,
    sky: "#F2B999",
    ground: "#4A3A3A",
    hemiI: 0.85,
    fog: "#D9A88C",
    exposure: 1.0,
  },
  night: {
    sun: "#8FA8FF",
    sunI: 0.55,
    sky: "#2B3D66",
    ground: "#141B2A",
    hemiI: 0.55,
    fog: "#1A2438",
    exposure: 1.15,
  },
};
