import { describe, expect, it } from "vitest";
import { getSunTimes, themeForSchedule, themeForSunTimes } from "../auto-theme";

/**
 * Regression: "Location-Based Theme" advertised syncing with sunrise and
 * sunset. It asked for geolocation permission and displayed the coordinates,
 * but calculateSunTimes() ignored latitude and longitude entirely and returned
 * a hardcoded 06:00/18:00. It then formatted those with
 * toLocaleTimeString("en-US") — producing "06:00 AM" — and parsed them back
 * with split(":").map(Number), so the minutes came out NaN, every comparison
 * was false, and the theme was forced to dark at any hour of the day.
 */

const MINUTE = 60 * 1000;

function minutesOfDayUTC(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

describe("getSunTimes", () => {
  it("puts sunrise before sunset", () => {
    const times = getSunTimes(
      new Date("2026-03-20T12:00:00Z"),
      51.5074,
      -0.1278,
    );

    expect(times).not.toBeNull();
    expect(times?.sunrise.getTime()).toBeLessThan(
      times?.sunset.getTime() as number,
    );
  });

  it("gives the equator roughly 06:00/18:00 solar time at an equinox", () => {
    // Longitude 0 keeps solar time and UTC aligned, so this is checkable
    // without a timezone database.
    const times = getSunTimes(new Date("2026-03-20T12:00:00Z"), 0, 0);

    expect(times).not.toBeNull();
    expect(minutesOfDayUTC(times?.sunrise as Date)).toBeGreaterThan(
      5 * 60 + 45,
    );
    expect(minutesOfDayUTC(times?.sunrise as Date)).toBeLessThan(6 * 60 + 15);
    expect(minutesOfDayUTC(times?.sunset as Date)).toBeGreaterThan(
      17 * 60 + 45,
    );
    expect(minutesOfDayUTC(times?.sunset as Date)).toBeLessThan(18 * 60 + 15);
  });

  it("gives London a long June day and a short December one", () => {
    const june = getSunTimes(
      new Date("2026-06-21T12:00:00Z"),
      51.5074,
      -0.1278,
    );
    const december = getSunTimes(
      new Date("2026-12-21T12:00:00Z"),
      51.5074,
      -0.1278,
    );

    const hours = (t: NonNullable<ReturnType<typeof getSunTimes>>) =>
      (t.sunset.getTime() - t.sunrise.getTime()) / (60 * MINUTE);

    expect(hours(june as NonNullable<typeof june>)).toBeGreaterThan(16);
    expect(hours(december as NonNullable<typeof december>)).toBeLessThan(8.5);
  });

  it("returns null inside the arctic circle during midnight sun", () => {
    // Longyearbyen in June: the sun never sets, so there is no sunrise/sunset
    // to schedule against and the caller must fall back rather than compute
    // nonsense.
    expect(
      getSunTimes(new Date("2026-06-21T12:00:00Z"), 78.22, 15.63),
    ).toBeNull();
  });

  it("returns null inside the arctic circle during polar night", () => {
    expect(
      getSunTimes(new Date("2026-12-21T12:00:00Z"), 78.22, 15.63),
    ).toBeNull();
  });

  it("is deterministic for the same inputs", () => {
    const a = getSunTimes(new Date("2026-05-01T12:00:00Z"), 40.7, -74);
    const b = getSunTimes(new Date("2026-05-01T12:00:00Z"), 40.7, -74);

    expect(a?.sunrise.toISOString()).toBe(b?.sunrise.toISOString());
    expect(a?.sunset.toISOString()).toBe(b?.sunset.toISOString());
  });

  it("shifts with longitude — one timezone west is about an hour later in UTC", () => {
    const atZero = getSunTimes(new Date("2026-03-20T12:00:00Z"), 0, 0);
    const fifteenWest = getSunTimes(new Date("2026-03-20T12:00:00Z"), 0, -15);

    const delta =
      minutesOfDayUTC(fifteenWest?.sunrise as Date) -
      minutesOfDayUTC(atZero?.sunrise as Date);

    expect(delta).toBeGreaterThan(50);
    expect(delta).toBeLessThan(70);
  });
});

describe("themeForSunTimes", () => {
  const times = {
    sunrise: new Date("2026-03-20T06:00:00Z"),
    sunset: new Date("2026-03-20T18:00:00Z"),
  };

  it("is light during the day", () => {
    expect(themeForSunTimes(new Date("2026-03-20T12:00:00Z"), times)).toBe(
      "light",
    );
  });

  it("is dark before sunrise", () => {
    expect(themeForSunTimes(new Date("2026-03-20T05:00:00Z"), times)).toBe(
      "dark",
    );
  });

  it("is dark after sunset", () => {
    expect(themeForSunTimes(new Date("2026-03-20T19:00:00Z"), times)).toBe(
      "dark",
    );
  });

  it("is light exactly at sunrise", () => {
    expect(themeForSunTimes(new Date("2026-03-20T06:00:00Z"), times)).toBe(
      "light",
    );
  });

  it("is dark exactly at sunset", () => {
    expect(themeForSunTimes(new Date("2026-03-20T18:00:00Z"), times)).toBe(
      "dark",
    );
  });
});

describe("themeForSchedule", () => {
  it("is light between the light time and the dark time", () => {
    expect(themeForSchedule(at(12, 0), "06:00", "18:00")).toBe("light");
  });

  it("is dark after the dark time", () => {
    expect(themeForSchedule(at(20, 0), "06:00", "18:00")).toBe("dark");
  });

  it("is dark in the small hours before the light time", () => {
    // The old implementation compared the clock to the target for exact string
    // equality once a minute, so loading the page at 03:00 left whatever theme
    // happened to be set — it only ever switched if you were watching at the
    // precise minute.
    expect(themeForSchedule(at(3, 0), "06:00", "18:00")).toBe("dark");
  });

  it("switches exactly at the boundaries", () => {
    expect(themeForSchedule(at(6, 0), "06:00", "18:00")).toBe("light");
    expect(themeForSchedule(at(18, 0), "06:00", "18:00")).toBe("dark");
  });

  it("handles a schedule that wraps past midnight", () => {
    // Night owl: light from 20:00, dark from 06:00.
    expect(themeForSchedule(at(22, 0), "20:00", "06:00")).toBe("light");
    expect(themeForSchedule(at(2, 0), "20:00", "06:00")).toBe("light");
    expect(themeForSchedule(at(7, 0), "20:00", "06:00")).toBe("dark");
  });

  it("falls back to dark rather than crashing on malformed times", () => {
    expect(themeForSchedule(at(12, 0), "not-a-time", "18:00")).toBe("dark");
  });

  it("treats identical times as always dark instead of flapping", () => {
    expect(themeForSchedule(at(12, 0), "09:00", "09:00")).toBe("dark");
  });
});

function at(hours: number, minutes: number) {
  const d = new Date("2026-03-20T00:00:00");
  d.setHours(hours, minutes, 0, 0);
  return d;
}
