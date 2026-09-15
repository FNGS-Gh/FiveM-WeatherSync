export enum Weather {
  Clear         = "CLEAR",
  ExtraSunny    = "EXTRASUNNY",
  Clouds        = "CLOUDS",
  Overcast      = "OVERCAST",
  Rain          = "RAIN",
  Clearing      = "CLEARING",
  Thunder       = "THUNDER",
  Smog          = "SMOG",
  Foggy         = "FOGGY",
  Xmas          = "XMAS",
  Snow          = "SNOW",
  SnowLight     = "SNOWLIGHT",
  Blizzard      = "BLIZZARD",
  Halloween     = "HALLOWEEN",
  Neutral       = "NEUTRAL",
  RainHalloween = "RAIN_HALLOWEEN",
  SnowHalloween = "SNOW_HALLOWEEN",
}
export type WeatherType = keyof typeof Weather;

export const X_WEATHER_TYPES: Weather[] = [
  Weather.Xmas,
  Weather.Snow,
  Weather.SnowLight,
  Weather.Blizzard,
  Weather.SnowHalloween,
] as const;

export const H_WEATHER_TYPES: Weather[] = [
  Weather.Halloween,
  Weather.RainHalloween,
  Weather.SnowHalloween,
] as const;