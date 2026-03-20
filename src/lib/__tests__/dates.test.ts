import { describe, expect, it } from "vitest";
import { formatDate, parseLocalDate, safeDate } from "@/lib/dates";

describe("parseLocalDate", () => {
  it("parses YYYY-MM-DD as local date", () => {
    const d = parseLocalDate("1985-03-15");
    expect(d.getFullYear()).toBe(1985);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(15);
  });

  it("returns Invalid Date for empty string", () => {
    const d = parseLocalDate("");
    expect(Number.isNaN(d.getTime())).toBe(true);
  });

  it("returns Invalid Date for garbage", () => {
    const d = parseLocalDate("not-a-date");
    expect(Number.isNaN(d.getTime())).toBe(true);
  });
});

describe("safeDate", () => {
  it("parses ISO timestamp correctly", () => {
    const d = safeDate("2010-01-01T00:00:00.000Z");
    expect(d.getUTCFullYear()).toBe(2010);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(1);
  });

  it("parses bare date as local", () => {
    const d = safeDate("1985-03-15");
    expect(d.getDate()).toBe(15);
  });

  it("returns Invalid Date for empty", () => {
    expect(Number.isNaN(safeDate("").getTime())).toBe(true);
  });
});

describe("formatDate", () => {
  it("formats valid date", () => {
    const d = new Date(2025, 0, 15); // Jan 15, 2025 local
    const result = formatDate(d);
    expect(result).toContain("2025");
  });

  it('returns "—" for Invalid Date', () => {
    expect(formatDate(new Date(NaN))).toBe("—");
  });

  it('returns "—" for Infinity date', () => {
    expect(formatDate(new Date(Infinity))).toBe("—");
  });
});
