export enum Week {
  Monday,
  Tuesday,
  Wednedsay,
  Thursday,
  Friday,
  Saturday,
  Sunday
}
export type WeekDay = keyof typeof Week;

export enum Season {
  Winter,
  Spring,
  Summer,
  Autumn
}
export type SeasonName = keyof typeof Season;

export enum WeatherBase {
  Sunny,
  Cloudy,
  Other,
}

export enum WeatherModifier {
  None    = 0,
  Rainy   = 1 << 0,
  Windy   = 1 << 1,
  Foggy   = 1 << 2,
  Thunder = 1 << 3,
}
export type ModifierName = keyof typeof WeatherModifier;

export interface WeatherInstance {
  base: WeatherBase;
  modifier: WeatherModifier;
  wind: number;
}

export interface WeatherForecast {
  generatedAt: number;
  schedule: Record<WeekDay, WeatherInstance>;
}

export const getRandomRng = (min: number, max: number) => {
  const minCeiled = Math.ceil(min);
  return (Math.random() * ((max | 0) - minCeiled + 1) + minCeiled) | 0;
}

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