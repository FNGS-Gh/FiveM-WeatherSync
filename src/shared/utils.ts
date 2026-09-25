export const WEATHER_TYPES = [
  "CLEAR",
  "EXTRASUNNY",
  "CLOUDS",
  "OVERCAST",
  "RAIN",
  "CLEARING",
  "THUNDER",
  "SMOG",
  "FOGGY",
  "XMAS",
  "SNOW",
  "SNOWLIGHT",
  "BLIZZARD",
  "HALLOWEEN",
  "NEUTRAL",
  "RAIN_HALLOWEEN",
  "SNOW_HALLOWEEN",
] as const;

export type WeatherType = typeof WEATHER_TYPES[number];

export const SUNNY_SET: WeatherType[] = [
  "CLEAR",
  "EXTRASUNNY"
] as const;

export const CLOUDY_SET: WeatherType[] = [
  "CLOUDS",
  "OVERCAST",
  "SMOG"
] as const;

export const FOGGY_SET: WeatherType[] = [
  "FOGGY",
  "SMOG"
] as const;

export const SNOW_MAP: Partial<Record<WeatherType, WeatherType>> = {
  "CLEAR": "XMAS",
  // to do
} as const;

export interface RainSequence {
  readonly durMult: number;
  readonly type: WeatherType;
}