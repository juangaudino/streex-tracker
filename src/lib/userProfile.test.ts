import { beforeEach, describe, expect, it } from "vitest";
import { profileCompleteness, readUserProfile, writeUserProfile } from "./userProfile";

describe("user profile preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults optional fields to empty strings", () => {
    expect(readUserProfile("u1")).toEqual({ firstName: "", phoneNumber: "" });
  });

  it("persists profile fields per user", () => {
    writeUserProfile({ firstName: "Juan", phoneNumber: "555" }, "u1");
    expect(readUserProfile("u1")).toEqual({ firstName: "Juan", phoneNumber: "555" });
    expect(readUserProfile("u2")).toEqual({ firstName: "", phoneNumber: "" });
  });

  it("calculates setup completeness", () => {
    expect(profileCompleteness({ firstName: "Juan", phoneNumber: "" })).toBe(1);
    expect(profileCompleteness({ firstName: "Juan", phoneNumber: "555" })).toBe(2);
  });
});
