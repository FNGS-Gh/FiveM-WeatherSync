import { Config, SeasonChances, WeatherConfig } from './config';
import {
  Week,
  WeekDay,
  WEEK_ORDER,
  Season,
  WeatherBase,
  WeatherModifier,
  WeatherInstance,
  WeatherForecast,
  genChance,
  getSeason,
  validateTimezone,
  getMonth,
  getWeekDay,
  applyWeatherModifier,
  getDefaultForecast,
  isValidForecast,
  getDefWeatherInstance,
  shiftTemp,
  getRandomRngInc
} from './utils';

// Module Functions
const getKvpForecast = (kvpName: string): WeatherForecast | null => {
  try {
    const rawForecast = GetResourceKvpString(kvpName);

    if (rawForecast) {
      const tryForecast: unknown = JSON.parse(rawForecast);
    
      if (isValidForecast(tryForecast))
        return tryForecast as WeatherForecast;
    }
  } catch (err) {
    console.error(`Corrupted Weather Forecast | KVP: ${kvpName}`);
  }

  return null;
};

const getChancesSet = (
  season: Season,
  config: WeatherConfig
): SeasonChances => {
  let chancesSet: SeasonChances;

  switch (season) {
    case Season.SPRING:
      chancesSet = config.springSet;
      break;
    case Season.SUMMER:
      chancesSet = config.summerSet;
      break;
    case Season.AUTUMN:
      chancesSet = config.autumnSet;
      break;
    default:
      chancesSet = config.winterSet;
      break;
  }

  return chancesSet;
};

const genInstanceBySeason = (
  chancesSet: SeasonChances,
  rainAmplifier = 1.0,
  tempRng: number[]
): WeatherInstance => {
  const instance = getDefWeatherInstance();
  instance.temp = [...tempRng];

  let toShift = genChance() > 0.6 ? -1 : 1;

  const rainChance = genChance(rainAmplifier);
  if (rainChance <= chancesSet.rain) {
    instance.base = WeatherBase.OTHER;
    applyWeatherModifier(instance, WeatherModifier.RAINY);
    toShift -= getRandomRngInc(1, 4);

    const thunderChance = genChance();
    if (thunderChance <= chancesSet.thunder)
      applyWeatherModifier(instance, WeatherModifier.THUNDER)
  } else {
    const cloudyChance = genChance();
    if (cloudyChance <= chancesSet.cloudy) {
      instance.base = WeatherBase.CLOUDY;
      toShift--;

      const fogChance = genChance();
      if (fogChance <= chancesSet.fog)
        instance.base = WeatherBase.FOGGY;
    } else toShift += 2;
  }

  instance.temp = shiftTemp(
    instance.temp,
    toShift,
    chancesSet.temp
  );

  return instance;
};

const getInstance = (
  season: Season,
  prevInstance: WeatherInstance | null = null
): WeatherInstance => {
  const rainAmplifier = prevInstance?.base === WeatherBase.OTHER
    ? 1.25 : 1.0;

  const chancesSet: SeasonChances = getChancesSet(season, Config);
  const tempRange: number[] = prevInstance?.temp
    ? prevInstance.temp
    : chancesSet.temp;

  const instance = genInstanceBySeason(
    chancesSet,
    rainAmplifier,
    tempRange
  );

  return instance;
};

const genNewForecast = (
  timeZone: string,
  season: Season,
  dayNum: Week
): WeatherForecast => {
  const forecast = getDefaultForecast(Date.now(), timeZone);

  const weekOrder: WeekDay[] = [
    ...WEEK_ORDER.slice(dayNum),
    ...WEEK_ORDER.slice(0, dayNum)
  ];

  let prevInstance: WeatherInstance | null = null;
  for (const day of weekOrder) {
    const instance = getInstance(season, prevInstance);
    forecast.schedule[day] = instance;
    prevInstance = instance;
  }

  return forecast;
};

// Main Class
export class WeekForecast {
  private readonly kvpName: string;
  private readonly timeZone: string;
  
  public readonly formatter: Intl.DateTimeFormat;
  public season: Season = Season.WINTER;
  public dayNum: Week = Week.SUNDAY;
  public data: WeatherForecast;

  constructor(
    kvpName: string,
    timeZone: string,
    kvpForecast: WeatherForecast | null
  ) {
    this.kvpName = kvpName;
    this.timeZone = validateTimezone(timeZone);

    this.formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone,
      month: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      fractionalSecondDigits: 3,
      hour12: false,
    });

    this.updateDate(new Date);

    if (kvpForecast && kvpForecast.timeZone === this.timeZone) {
      const forecastDay = getWeekDay(
        new Date(kvpForecast.updatedAt),
        this.formatter
      );

      this.data = kvpForecast;
      if (this.dayNum !== forecastDay)
        this.updateForecast();
    } else {
      this.data = genNewForecast(this.timeZone, this.season, this.dayNum);
      SetResourceKvp(kvpName, JSON.stringify(this.data));
    }
  }

  private updateDate(date: Date) {
    const dateDay = getWeekDay(date, this.formatter);
    this.dayNum = Math.max(0, Math.min(6, dateDay));

    const dateMonth = getMonth(date, this.formatter);
    const monthNum = Math.max(0, Math.min(11, dateMonth));
    this.season = getSeason(monthNum);
  }

  public updateForecast(): WeatherForecast {
    this.updateDate(new Date);
    this.data.updatedAt = Date.now();
  
    if (this.dayNum > 0) {
      const toUpdDays = WEEK_ORDER.slice(0, this.dayNum);
      const lastDay = WEEK_ORDER[WEEK_ORDER.length - 1];
  
      let prevInstance: WeatherInstance = this.data.schedule[lastDay];
      for (const day of toUpdDays) {
        const instance = getInstance(this.season, prevInstance);
        this.data.schedule[day] = instance;
        prevInstance = instance;
      }
    }
  
    SetResourceKvp(this.kvpName, JSON.stringify(this.data));

    return this.data;
  }

  public regenForecast(): WeatherForecast {
    this.updateDate(new Date);
    
    this.data = genNewForecast(this.timeZone, this.season, this.dayNum);
    SetResourceKvp(this.kvpName, JSON.stringify(this.data));

    return this.data;
  }
}

export const Forecast = new WeekForecast(
  Config.kvpName,
  Config.timeZone,
  getKvpForecast(Config.kvpName)
);