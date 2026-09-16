/* 
 * CONFIG BREAKDOWN:
 * -----------------
 * https://nodatime.org/TimeZones
 */

export interface SeasonChances {
  cloudy: number;
  fog: number;
  rain: number;
  thunder: number;
}

interface WeatherConfig {
  kvpName: string;
  timeZone: string;
  accurracy: number;
  allowSnow: boolean;
  snowXmas: boolean;
  winterChances: SeasonChances;
  springChances: SeasonChances;
  summerChances: SeasonChances;
  autumnChances: SeasonChances;
}

// NOTE: Don't change this object. Change only the 'config.json' outter file.
// This object contains default "safe" values in case the actual config is corrupred or can't be read.
const DEFAULT_CONFIG: WeatherConfig = {
  kvpName: 'weather_forecast',
  timeZone: 'Europe/London',
  accurracy: 0.75,
  allowSnow: false,
  snowXmas: true,
  winterChances: {
    cloudy: 0.25,
    fog: 0.3,
    rain: 0.25,
    thunder: 0.05
  },
  springChances: {
    cloudy: 0.1,
    fog: 0.2,
    rain: 0.3,
    thunder: 0.2
  },
  summerChances: {
    cloudy: 0.05,
    fog: 0.25,
    rain: 0.4,
    thunder: 0.5
  },
  autumnChances: {
    cloudy: 0.35,
    fog: 0.55,
    rain: 0.45,
    thunder: 0.45
  }
} as const;

const isWeatherConfig = (data: unknown): data is WeatherConfig => { 
  if (typeof data !== 'object' || data === null) return false; 

  const obj = data as Record<string, unknown>; 

  return true; 
};

const loadConfig = (): WeatherConfig => {
  const resourceName = GetCurrentResourceName();
  const configFile = LoadResourceFile(resourceName, 'config.json');

  const configError = () => {
    console.error('Failed to load config.json');
    return DEFAULT_CONFIG;
  };

  if (!configFile) return configError();

  try {
    const rawConfig: unknown = JSON.parse(configFile);

    if (!isWeatherConfig(rawConfig))
      return configError();

    return rawConfig;
  } catch (err) {
    return configError();
  }
};

export const Config = loadConfig();