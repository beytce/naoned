import type { EmpireSettings } from "./settings.js";

/**
 * The knowledge that spreads (CADRAGE-v3 § 6): a level owned by more than `fromShareBps` of the
 * active houses gets cheaper and quicker to build, more so as it spreads, up to its bounds when all
 * own it. A level owned by few is never cut: the top is never lowered.
 */
export function catchupCut(
  shareOwningBps: number,
  s: EmpireSettings,
): { costCutBps: number; timeCutBps: number } {
  const { fromShareBps, maxCostCutBps, maxTimeCutBps } = s.catchup;
  const share = Math.min(10_000, Math.max(0, shareOwningBps));
  if (share <= fromShareBps || fromShareBps >= 10_000) return { costCutBps: 0, timeCutBps: 0 };
  const span = 10_000 - fromShareBps;
  return {
    costCutBps: Math.floor((maxCostCutBps * (share - fromShareBps)) / span),
    timeCutBps: Math.floor((maxTimeCutBps * (share - fromShareBps)) / span),
  };
}
