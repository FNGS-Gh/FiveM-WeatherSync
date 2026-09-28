/* 
 * CONFIG BREAKDOWN:
 * -----------------
 *
 * -- SeasonChances interface --
 * cloudy: number   <- [0.0-1.0] Chance that the "cloudy" weather type will occur;
 * fog: number      <- [0.0-1.0] Same but for the "foggy" weather type;
 * rain: number     <- [0.0-1.0] Chance that the rain will occur;
 * thunder: number  <- [0.0-1.0] Chance that the rain will be paired with a thunderstorm;
 * temp: number[]   <- [min, max] Temperature range (I referred to Celsius, but it doesn't really matter);
 * 
 * -- WeatherConfig -------------
 * kvpName: string                <- Preferred KVP name to store the generated forecast;
 * timeZone: string               <- Time zone to calculate the current day of the week and etc (https://nodatime.org/TimeZones);
 * accurracy: number              <- [0.0-1.0] How accurate the forecast is (only impacts rainy days);
 * allowMisc: boolean             <- Core restriction to allow misc weather types (HALLOWEEN and etc);
 * allowSnow: boolean             <- Core restriction to allow any snow weather types;
 * snowXmas: boolean              <- Whether you want it to automatically snow during Christmas period;
 * snowStart: string              <- [MM/DD] (e.g. 12/25) Date when the Christmas period starts (incl.);
 * snowStop: string               <- [MM/DD] (e.g. 01/05) Date when the Chistmas period ends (incl.);
 * fixedWeatherOnFrozen: boolean  <- (for my TimeSync script) Restrict automated weather updates when the time is frozen;
 * noRainOnFrozen: boolean        <- (for my TimeSync script) Restrict automated rain updates. The weather updates normally;
 * gameUpdRng: number[]           <- [min, max] Weather update time range for random intervals (in minutes);
 * modifierDurRng: number[]       <- [min, max] Rain duration range (in minutes);
 * winterSet: SeasonChances       <- Chances set for Winter (see above);
 * springSet: SeasonChances       <- Chances set for Spring;
 * summerSet: SeasonChances       <- Chances set for Summer;
 * autumnSet: SeasonChances       <- Chances set for Autumn;
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
  allowMisc: boolean;
  allowSnow: boolean;
  snowXmas: boolean;
  snowStart: string;
  snowStop: string;
  fixedWeatherOnFrozen: boolean;
  noRainOnFrozen: boolean;
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
  allowMisc: false,
  allowSnow: true,
  snowXmas: true,
  snowStart: '12/20',
  snowStop: '01/05',
  fixedWeatherOnFrozen: false,
  noRainOnFrozen: false,
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

const isSeasonChances = (data: unknown): data is SeasonChances => {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (typeof obj.cloudy !== 'number' || isNaN(obj.cloudy) || obj.cloudy < 0 || obj.cloudy > 1) return false;
  if (typeof obj.fog !== 'number' || isNaN(obj.fog) || obj.fog < 0 || obj.fog > 1) return false;
  if (typeof obj.rain !== 'number' || isNaN(obj.rain) || obj.rain < 0 || obj.rain > 1) return false;
  if (typeof obj.thunder !== 'number' || isNaN(obj.thunder) || obj.thunder < 0 || obj.thunder > 1) return false;

  if (!Array.isArray(obj.temp) || obj.temp.length !== 2) return false;
  if (typeof obj.temp[0] !== 'number' || isNaN(obj.temp[0])) return false;
  if (typeof obj.temp[1] !== 'number' || isNaN(obj.temp[1])) return false;
  if (obj.temp[0] > obj.temp[1]) return false;

  return true;
};

const isWeatherConfig = (data: unknown): data is WeatherConfig => {
  if (typeof data !== 'object' || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (typeof obj.kvpName !== 'string' || obj.kvpName.trim() === '') return false;
  if (typeof obj.timeZone !== 'string' || obj.timeZone.trim() === '') return false;

  if (typeof obj.accurracy !== 'number' || isNaN(obj.accurracy) || obj.accurracy < 0 || obj.accurracy > 1) return false;

  if (typeof obj.allowMisc !== 'boolean') return false;
  if (typeof obj.allowSnow !== 'boolean') return false;
  if (typeof obj.snowXmas !== 'boolean') return false;

  if (typeof obj.snowStart !== 'string' || obj.snowStart.trim() === '') return false;
  if (typeof obj.snowStop !== 'string' || obj.snowStop.trim() === '') return false;

  if (typeof obj.fixedWeatherOnFrozen !== 'boolean') return false;
  if (typeof obj.noRainOnFrozen !== 'boolean') return false;

  if (!Array.isArray(obj.gameUpdRng) || obj.gameUpdRng.length !== 2) return false;
  if (typeof obj.gameUpdRng[0] !== 'number' || isNaN(obj.gameUpdRng[0]) || obj.gameUpdRng[0] < 0) return false;
  if (typeof obj.gameUpdRng[1] !== 'number' || isNaN(obj.gameUpdRng[1]) || obj.gameUpdRng[1] < 0) return false;
  if (obj.gameUpdRng[0] > obj.gameUpdRng[1]) return false;

  if (!Array.isArray(obj.modifierDurRng) || obj.modifierDurRng.length !== 2) return false;
  if (typeof obj.modifierDurRng[0] !== 'number' || isNaN(obj.modifierDurRng[0]) || obj.modifierDurRng[0] < 0) return false;
  if (typeof obj.modifierDurRng[1] !== 'number' || isNaN(obj.modifierDurRng[1]) || obj.modifierDurRng[1] < 0) return false;
  if (obj.modifierDurRng[0] > obj.modifierDurRng[1]) return false;

  if (!isSeasonChances(obj.winterSet)) return false;
  if (!isSeasonChances(obj.springSet)) return false;
  if (!isSeasonChances(obj.summerSet)) return false;
  if (!isSeasonChances(obj.autumnSet)) return false;

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