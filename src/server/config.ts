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
  temp: number[];
}

export interface WeatherConfig {
  kvpName: string;
  timeZone: string;
  accurracy: number;
  allowSnow: boolean;
  snowXmas: boolean;
  fixedWeatherOnFrozen: boolean;
  noRainOnFrozen: boolean;
  tempCelsius: boolean;
  gameUpdRng: number[];
  modifierDurRng: number[];
  winterSet: SeasonChances;
  springSet: SeasonChances;
  summerSet: SeasonChances;
  autumnSet: SeasonChances;
}

// NOTE: Don't change this object. Change only the 'config.json' outter file.
// This object contains default "safe" values in case the actual config is corrupred or can't be read.
const DEFAULT_CONFIG: WeatherConfig = {
  kvpName: 'weather_forecast',
  timeZone: 'Europe/London',
  accurracy: 0.75,
  allowSnow: false,
  snowXmas: true,
  fixedWeatherOnFrozen: false,
  noRainOnFrozen: false,
  tempCelsius: true,
  gameUpdRng: [20, 90],
  modifierDurRng: [15, 60],
  winterSet: {
    cloudy: 0.25,
    fog: 0.3,
    rain: 0.25,
    thunder: 0.05,
    temp: [4, 16]
  },
  springSet: {
    cloudy: 0.1,
    fog: 0.2,
    rain: 0.3,
    thunder: 0.2,
    temp: [11, 25]
  },
  summerSet: {
    cloudy: 0.05,
    fog: 0.25,
    rain: 0.4,
    thunder: 0.5,
    temp: [18, 36]
  },
  autumnSet: {
    cloudy: 0.35,
    fog: 0.55,
    rain: 0.45,
    thunder: 0.45,
    temp: [9, 23]
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

    return rawConfig as WeatherConfig;
  } catch (err) {
    return configError();
  }
};

export const Config = loadConfig();