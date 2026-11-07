import { describe, it, expect } from "vitest";
import { flush, receive, refreshPinned } from "./live-buffer";
import type { FabricEvent } from "./events";

const ev = (id: string, t: string, status = "pending") => ({ id, created_at: t, status, name: "x", module: "m" }) as unknown as FabricEvent;

describe("live event buffer", () => {
  it("shows new events immediately when not held, newest first, no duplicates", () => {
    const b = receive({ events: [ev("a", "1")], pending: [] }, [ev("b", "2"), ev("a", "1")], false, 10);
    expect(b.events.map((e) => e.id)).toEqual(["b", "a"]);
  });
  it("holds events while paused and releases them on resume", () => {
    let b = receive({ events: [ev("a", "1")], pending: [] }, [ev("b", "2")], true, 10);
    expect(b.events.map((e) => e.id)).toEqual(["a"]);
    expect(b.pending.map((e) => e.id)).toEqual(["b"]);
    b = flush(b, 10);
    expect(b.events.map((e) => e.id)).toEqual(["b", "a"]);
    expect(b.pending).toEqual([]);
  });
  it("caps the list at the limit", () => {
    const b = receive({ events: [ev("a", "1"), ev("b", "2")], pending: [] }, [ev("c", "3")], false, 2);
    expect(b.events.map((e) => e.id)).toEqual(["c", "b"]);
  });
  it("updates pinned copies when the event changes, keeps them when it scrolls out", () => {
    const pinned = [ev("a", "1"), ev("z", "0")];
    const next = refreshPinned(pinned, [ev("a", "1", "processed")]);
    expect(next.map((e) => [e.id, e.status])).toEqual([["a", "processed"], ["z", "pending"]]);
  });
});
