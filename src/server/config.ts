/* 
 * CONFIG BREAKDOWN:
 * -----------------
 * https://nodatime.org/TimeZones
 */

interface WeatherConfig {
  kvpName: string;
  timeZone: string;
  allowSnow: boolean;
  snowXmas: boolean;
}

// NOTE: Don't change this object. Change only the 'config.json' outter file.
// This object contains default "safe" values in case the actual config is corrupred or can't be read.
const DEFAULT_CONFIG: WeatherConfig = {
  kvpName: 'weather_forecast',
  timeZone: 'Europe/London',
  allowSnow: false,
  snowXmas: true,
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
    console.log('error');
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