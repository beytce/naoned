import { z } from "zod";

/**
 * The Terraferma's actions as a client may send them (docs/plan-terraferme.md): the monthly
 * world's routes and the empire's theatres read the same ones.
 */
export const terraActionSchemas = [
  z.object({ type: z.literal("terraPlace"), cell: z.number().int().nonnegative() }),
  z.object({
    type: z.literal("terraFront"),
    aim: z.number().int().nonnegative(),
    shareBps: z.number().int().min(1).max(10_000),
  }),
  z.object({ type: z.literal("terraRecall"), frontId: z.string().max(32) }),
  z.object({ type: z.literal("terraAlly"), other: z.string().uuid() }),
  z.object({ type: z.literal("terraAccept"), from: z.string().uuid() }),
  z.object({ type: z.literal("terraBreak"), other: z.string().uuid() }),
  z.object({
    type: z.literal("terraSend"),
    to: z.string().uuid(),
    count: z.number().int().positive().max(100_000),
  }),
  z.object({
    type: z.literal("terraBuild"),
    cell: z.number().int().nonnegative(),
    kind: z.enum(["rocca", "borgo", "porto", "bombarda", "mura"]),
  }),
  z.object({ type: z.literal("terraRaise") }),
  z.object({ type: z.literal("terraFire"), cell: z.number().int().nonnegative() }),
  z.object({
    type: z.literal("terraSignal"),
    kind: z.enum(["help", "attack", "thanks", "peace"]),
    cell: z.number().int().nonnegative().optional(),
  }),
  z.object({
    type: z.literal("terraGift"),
    to: z.string().uuid(),
    amount: z.string().regex(/^\d{1,9}$/),
  }),
  z.object({ type: z.literal("terraEmbargo"), target: z.string().uuid().nullable() }),
  z.object({
    type: z.literal("terraSail"),
    aim: z.number().int().nonnegative(),
    shareBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    type: z.literal("terraPeasants"),
    shareBps: z.number().int().min(0).max(10_000),
  }),
  z.object({
    type: z.literal("terraDecree"),
    code: z.string().max(32),
    target: z.string().max(32).optional(),
  }),
] as const;
