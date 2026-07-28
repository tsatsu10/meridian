/**
 * Automatic theme selection: sunrise/sunset for the location-based schedule,
 * and a plain clock range for the fixed schedule.
 *
 * The previous implementation of both was broken in the same way — it worked
 * with times formatted for display. Sun times were hardcoded to 06:00/18:00
 * (latitude and longitude were accepted and then ignored), rendered with
 * `toLocaleTimeString("en-US")` into strings like "06:00 AM", and parsed back
 * with `split(":").map(Number)`, which yields `NaN` for the minutes. Every
 * comparison against `NaN` is false, so the day branch was unreachable and the
 * theme was forced to dark at noon. Everything here works in `Date`s and
 * minute counts, and formatting happens only at the UI edge.
 */

export type ThemeChoice = "light" | "dark";

export type SunTimes = {
  sunrise: Date;
  sunset: Date;
};

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const JULIAN_UNIX_EPOCH = 2440587.5;
const JULIAN_J2000 = 2451545;
const MILLISECONDS_PER_DAY = 86400000;

/** Earth's obliquity of the ecliptic. */
const OBLIQUITY_DEGREES = 23.4397;
/**
 * Standard sunrise/sunset altitude: the sun's centre sits 0.833° below the
 * horizon at the moment its upper limb appears, accounting for refraction and
 * the solar radius.
 */
const SUNRISE_ALTITUDE_DEGREES = -0.833;

const sin = (degrees: number) => Math.sin(degrees * DEGREES_TO_RADIANS);
const cos = (degrees: number) => Math.cos(degrees * DEGREES_TO_RADIANS);

function toJulianDay(date: Date): number {
  return date.getTime() / MILLISECONDS_PER_DAY + JULIAN_UNIX_EPOCH;
}

function fromJulianDay(julianDay: number): Date {
  return new Date((julianDay - JULIAN_UNIX_EPOCH) * MILLISECONDS_PER_DAY);
}

/**
 * Sunrise and sunset for a date and position, using the standard sunrise
 * equation (mean solar anomaly → equation of centre → ecliptic longitude →
 * declination → hour angle).
 *
 * Returns `null` when the sun neither rises nor sets that day — inside the
 * polar circles the hour angle has no solution, and callers must fall back to
 * a different signal rather than invent times.
 */
export function getSunTimes(
  date: Date,
  latitude: number,
  longitude: number,
): SunTimes | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  // Days since J2000, corrected for the observer's longitude.
  const julianDay = toJulianDay(date);
  const dayNumber = Math.round(
    julianDay - JULIAN_J2000 - 0.0009 + longitude / 360,
  );
  const meanSolarNoon = dayNumber + 0.0009 - longitude / 360;

  // Solar mean anomaly.
  const meanAnomaly = (357.5291 + 0.98560028 * meanSolarNoon) % 360;

  // Equation of the centre, then true ecliptic longitude.
  const equationOfCentre =
    1.9148 * sin(meanAnomaly) +
    0.02 * sin(2 * meanAnomaly) +
    0.0003 * sin(3 * meanAnomaly);
  const eclipticLongitude =
    (meanAnomaly + equationOfCentre + 180 + 102.9372) % 360;

  // Solar transit (local solar noon) as a Julian day.
  const solarTransit =
    JULIAN_J2000 +
    meanSolarNoon +
    0.0053 * sin(meanAnomaly) -
    0.0069 * sin(2 * eclipticLongitude);

  // Solar declination.
  const declinationSin = sin(eclipticLongitude) * sin(OBLIQUITY_DEGREES);
  const declinationCos = Math.cos(Math.asin(declinationSin));

  // Hour angle. Outside [-1, 1] there is no sunrise or sunset on this date:
  // midnight sun or polar night.
  const hourAngleCos =
    (sin(SUNRISE_ALTITUDE_DEGREES) - sin(latitude) * declinationSin) /
    (cos(latitude) * declinationCos);

  if (!Number.isFinite(hourAngleCos) || hourAngleCos > 1 || hourAngleCos < -1) {
    return null;
  }

  const hourAngle = Math.acos(hourAngleCos) * RADIANS_TO_DEGREES;

  return {
    sunrise: fromJulianDay(solarTransit - hourAngle / 360),
    sunset: fromJulianDay(solarTransit + hourAngle / 360),
  };
}

/**
 * Light between sunrise (inclusive) and sunset (exclusive), dark otherwise.
 */
export function themeForSunTimes(now: Date, times: SunTimes): ThemeChoice {
  const t = now.getTime();
  return t >= times.sunrise.getTime() && t < times.sunset.getTime()
    ? "light"
    : "dark";
}

/**
 * Parses "HH:MM" into minutes since local midnight, or null if malformed.
 */
function parseClockTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Which theme a fixed daily schedule calls for *right now*.
 *
 * This is a range test, not the equality test it replaces: the old code only
 * switched if the wall clock string matched the target exactly during one of
 * its once-a-minute checks, so a backgrounded tab, a drifting interval, or
 * simply opening the page at any other time left the theme untouched.
 * Schedules that wrap past midnight (light at 20:00, dark at 06:00) work too.
 */
export function themeForSchedule(
  now: Date,
  lightThemeTime: string,
  darkThemeTime: string,
): ThemeChoice {
  const lightAt = parseClockTime(lightThemeTime);
  const darkAt = parseClockTime(darkThemeTime);

  if (lightAt === null || darkAt === null || lightAt === darkAt) {
    return "dark";
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (lightAt < darkAt) {
    return nowMinutes >= lightAt && nowMinutes < darkAt ? "light" : "dark";
  }

  // Wraps past midnight: light from lightAt through to darkAt the next day.
  return nowMinutes >= lightAt || nowMinutes < darkAt ? "light" : "dark";
}
