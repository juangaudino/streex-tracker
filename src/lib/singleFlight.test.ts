import { describe, expect, it, vi } from "vitest";
import { SingleFlight } from "./singleFlight";

describe("SingleFlight", () => {
  it("accepts only one action while the first save is still pending", async () => {
    const flight = new SingleFlight();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const save = vi.fn(async () => pending);

    const first = flight.run(save);
    const second = await flight.run(save);

    expect(second.started).toBe(false);
    expect(save).toHaveBeenCalledTimes(1);
    release();
    expect((await first).started).toBe(true);
    expect(flight.running).toBe(false);
  });

  it("releases the action after a failed save so retry remains possible", async () => {
    const flight = new SingleFlight();
    await expect(flight.run(async () => { throw new Error("save failed"); })).rejects.toThrow("save failed");

    const retry = await flight.run(async () => true);
    expect(retry).toEqual({ started: true, value: true });
  });
});
