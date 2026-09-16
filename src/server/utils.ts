export enum Week {
  Sunday,
  Monday,
  Tuesday,
  Wednesday,
  Thursday,
  Friday,
  Saturday
}
export type WeekDay = keyof typeof Week;

export const WEEK_ORDER: WeekDay[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

export enum Season {
  Winter,
  Spring,
  Summer,
  Autumn
}

export enum WeatherBase {
  Sunny,
  Cloudy,
  Foggy,
  Other,
}

export enum WeatherModifier {
  None    = 0,
  Rainy   = 1 << 0,
  Thunder = 1 << 1,
}

export interface WeatherInstance {
  base: WeatherBase;
  modifier: WeatherModifier;
}

export interface WeatherForecast {
  updatedAt: number;
  timeZone: string;
  schedule: Record<WeekDay, WeatherInstance>;
}

export const getRandomRng = (min: number, max: number) => {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil;
};

export const genChance = (amplifier = 1.0): number => 
  amplifier * (getRandomRng(1, 100) / 100);

export const getSeason = (m: number): Season =>
  m >= 0 && m < 12
  ? (((m + 1) % 12) / 3) | 0
  : 0;

export const validateTimezone = (timeZone: string): string => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;;
  }
};

export const getMonthByTimeZone = (
  date: Date,
  timeZone: string
): number => parseInt(
  date.toLocaleDateString('en-US', { timeZone, month: 'numeric' }),
  10
) - 1;

export const getDayByTimeZone = (
  date: Date,
  timeZone: string
): number => {
  const dayName = date.toLocaleDateString(
    'en-US',
    { timeZone, weekday: 'long' }
  ) as WeekDay;

  return WEEK_ORDER.includes(dayName)
    ? Week[dayName]
    : 0
};

export const getDefaultForecast = (updatedAt: number, timeZone: string): WeatherForecast => ({
  updatedAt,
  timeZone,
  schedule: {
    Sunday: {
      base: WeatherBase.Sunny,
      modifier: WeatherModifier.None
    },
    Monday: {
      base: WeatherBase.Sunny,
      modifier: WeatherModifier.None
    },
    Tuesday: {
      base: WeatherBase.Sunny,
      modifier: WeatherModifier.None
    },
    Wednesday: {
      base: WeatherBase.Sunny,
      modifier: WeatherModifier.None
    },
    Thursday: {
      base: WeatherBase.Sunny,
      modifier: WeatherModifier.None
    },
    Friday: {
      base: WeatherBase.Sunny,
      modifier: WeatherModifier.None
    },
    Saturday: {
      base: WeatherBase.Sunny,
      modifier: WeatherModifier.None
    }
  }
});

const isValidWeatherInstance = (instance: unknown): instance is WeatherInstance => {
  const VALID_WEATHER_BASES = new Set<number>([
    WeatherBase.Sunny,
    WeatherBase.Cloudy,
    WeatherBase.Foggy,
    WeatherBase.Other
  ]);
  const MAX_MODIFIER_MASK = WeatherModifier.None
    | WeatherModifier.Rainy
    | WeatherModifier.Thunder;
  
  if (typeof instance !== 'object' || instance === null)
    return false;

  const { base, modifier } = instance as Record<string, unknown>;

  if (
    typeof base !== 'number'
    || !VALID_WEATHER_BASES.has(base)
  ) return false;

  if (
    typeof modifier !== 'number'
    || !Number.isInteger(modifier) 
    || modifier < 0 
    || (modifier & ~MAX_MODIFIER_MASK) !== 0
  ) return false;

  return true;
};

export const isValidForecast = (forecast: unknown): forecast is WeatherForecast => {
  if (forecast === null || typeof forecast !== 'object')
    return false;

  const candidate = forecast as Record<string, unknown>;

  if (
    typeof candidate.updatedAt !== 'number'
    || !Number.isInteger(candidate.updatedAt)
    || candidate.updatedAt <= 0
  ) return false;
  
  if (
    typeof candidate.timeZone !== 'string'
    || candidate.timeZone.trim() === ''
  ) return false;

  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate.timeZone });
  } catch {
    return false;
  }

  if (
    typeof candidate.schedule !== 'object'
    || candidate.schedule === null
  ) return false;

  const schedule = candidate.schedule as Record<string, unknown>;
  const scheduleKeys = Object.keys(schedule);

  if (scheduleKeys.length !== WEEK_ORDER.length) return false;

  for (const day of WEEK_ORDER) {
    if (!(day in schedule)) return false;
    if (!isValidWeatherInstance(schedule[day])) return false;
  }

  return true;
};