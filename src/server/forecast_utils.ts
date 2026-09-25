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
  temp: number[];
}

export interface WeatherForecast {
  updatedAt: number;
  timeZone: string;
  schedule: Record<WeekDay, WeatherInstance>;
}

export const shiftTemp = (
  temp: number[],
  toAdd: number,
  range: number[]
): number[] => {
  const avgTemp = Math.floor((range[0] + range[1]) / 2);
  const minTemp = Math.max(range[0], Math.min(avgTemp, temp[0] + toAdd));
  const maxTemp = Math.max(avgTemp, Math.min(range[1], temp[1] + toAdd));
  return [minTemp, maxTemp];
};

export const getSeason = (m: number): Season =>
  m >= 0 && m < 12
  ? (((m + 1) % 12) / 3) | 0
  : 0;

export const validateTimezone = (timeZone: string): string => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
};

export const getMonth = (
  date: Date,
  formatter: Intl.DateTimeFormat
): number => {
  const parts = formatter.formatToParts(date);
  const monthPart = parts.find(p => p.type === 'month');
  return monthPart?.value
    ? parseInt(monthPart.value, 10) - 1
    : 0;
};

export const getWeekDay = (
  date: Date,
  formatter: Intl.DateTimeFormat
): Week => {
  const parts = formatter.formatToParts(date);
  const dayPart = parts.find(p => p.type === 'weekday');
  const dayName = dayPart?.value
    ? dayPart?.value.toUpperCase() as WeekDay
    : WEEK_ORDER[0] as WeekDay;
  return WEEK_ORDER.includes(dayName) ? Week[dayName] : 0;
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

export const getDefWeatherInstance = () => ({
  base: WeatherBase.SUNNY,
  modifier: WeatherModifier.NONE,
  temp: [0, 25]
});

export const getDefaultForecast = (updatedAt: number, timeZone: string): WeatherForecast => ({
  updatedAt,
  timeZone,
  schedule: {
    SUNDAY: getDefWeatherInstance(),
    MONDAY: getDefWeatherInstance(),
    TUESDAY: getDefWeatherInstance(),
    WEDNESDAY: getDefWeatherInstance(),
    THURSDAY: getDefWeatherInstance(),
    FRIDAY: getDefWeatherInstance(),
    SATURDAY: getDefWeatherInstance()
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

  const { base, modifier, temp } = instance as Record<string, unknown>;

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

  if (
    typeof temp !== 'object'
    || !Array.isArray(temp)
    || temp.length !== 2
    || temp[0] > temp[1]
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