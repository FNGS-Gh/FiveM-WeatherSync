export enum Week {
  SUNDAY,
  MONDAY,
  TUESDAY,
  WEDNESDAY,
  THURSDAY,
  FRIDAY,
  SATURDAY
}
export type WeekDay = keyof typeof Week;

export const WEEK_ORDER: WeekDay[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY'
];

export enum Season {
  WINTER,
  SPRING,
  SUMMER,
  AUTUMN
}

export enum WeatherBase {
  SUNNY,
  CLOUDY,
  FOGGY,
  OTHER,
}

export enum WeatherModifier {
  NONE    = 0,
  RAINY   = 1 << 0,
  THUNDER = 1 << 1,
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
): Week => {
  const dayName = date.toLocaleDateString(
    'en-US',
    { timeZone, weekday: 'long' }
  ).toUpperCase() as WeekDay;

  return WEEK_ORDER.includes(dayName)
    ? Week[dayName]
    : 0
};

export const applyWeatherModifier = (
  instance: WeatherInstance,
  modifier: WeatherModifier
): WeatherInstance => {
  if (instance.base !== WeatherBase.OTHER)
    instance.base = WeatherBase.OTHER;

  instance.modifier = instance.modifier | modifier;

  return instance;
};

export const getDefaultForecast = (updatedAt: number, timeZone: string): WeatherForecast => ({
  updatedAt,
  timeZone,
  schedule: {
    SUNDAY: {
      base: WeatherBase.SUNNY,
      modifier: WeatherModifier.NONE
    },
    MONDAY: {
      base: WeatherBase.SUNNY,
      modifier: WeatherModifier.NONE
    },
    TUESDAY: {
      base: WeatherBase.SUNNY,
      modifier: WeatherModifier.NONE
    },
    WEDNESDAY: {
      base: WeatherBase.SUNNY,
      modifier: WeatherModifier.NONE
    },
    THURSDAY: {
      base: WeatherBase.SUNNY,
      modifier: WeatherModifier.NONE
    },
    FRIDAY: {
      base: WeatherBase.SUNNY,
      modifier: WeatherModifier.NONE
    },
    SATURDAY: {
      base: WeatherBase.SUNNY,
      modifier: WeatherModifier.NONE
    }
  }
});

const isValidWeatherInstance = (instance: unknown): instance is WeatherInstance => {
  const VALID_WEATHER_BASES = new Set<number>([
    WeatherBase.SUNNY,
    WeatherBase.CLOUDY,
    WeatherBase.FOGGY,
    WeatherBase.OTHER
  ]);
  const MAX_MODIFIER_MASK = WeatherModifier.NONE
    | WeatherModifier.RAINY
    | WeatherModifier.THUNDER;
  
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