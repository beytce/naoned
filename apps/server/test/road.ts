import { type Delivery, dayIndex, deliveryOrdersFor, vehiclesOf } from "@comptoirs/engine";
import type { GameWorld } from "../src/game/world.js";

/**
 * Board orders of a world under test ask for one or two loaves only, so that a merchant's
 * starting stock covers any city order (the board is drawn from the world's random id).
 */
export function smallOrders(world: GameWorld): void {
  world.ctx.settings.deliveries.quantity = { bread: [1, 2] };
  world.ctx.settings.deliveries.weights = {};
}

/** Sends a city order of bread on the merchant's first vehicle; returns the delivery. */
export async function deliverBread(world: GameWorld, playerId: string, now: number) {
  const day = dayIndex(world.ctx, now);
  const order = deliveryOrdersFor(world.ctx, world.current, playerId, day).find(
    (o) => o.kind === "city" && o.resource === "bread",
  );
  const vehicle = vehiclesOf(world.current, playerId)[0];
  if (!order || !vehicle) throw new Error("no bread order or no vehicle");
  const res = await world.execute({
    type: "dispatchDelivery",
    playerId,
    orderId: order.id,
    vehicleId: vehicle.id,
  });
  if (!res.ok) throw new Error(`dispatch refused: ${res.error}`);
  return Object.values(world.current.deliveries ?? {}).at(-1) as Delivery;
}
