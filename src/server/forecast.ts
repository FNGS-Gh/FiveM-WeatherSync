import { Config, SeasonChances } from './config';
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
  getMonthByTimeZone,
  getDayByTimeZone,
  applyWeatherModifier,
  getDefaultForecast,
  isValidForecast
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
    console.error('Corrupted Weather Forecast');
  }

  return null;
};

const getChancesSet = (season: Season): SeasonChances => {
  let chancesSet: SeasonChances = Config.winterChances;

  switch (season) {
    case Season.SPRING:
      chancesSet = Config.springChances;
      break;
    case Season.SUMMER:
      chancesSet = Config.summerChances;
      break;
    case Season.AUTUMN:
      chancesSet = Config.autumnChances;
      break;
  }

  return chancesSet;
};

const genInstanceBySeason = (
  chancesSet: SeasonChances,
  rainAmplifier = 1.0
): WeatherInstance => {
  const instance: WeatherInstance = {
    base: WeatherBase.SUNNY,
    modifier: WeatherModifier.NONE
  };

  const rainChance = genChance(rainAmplifier);
  if (rainChance <= chancesSet.rain) {
    instance.base = WeatherBase.OTHER;
    applyWeatherModifier(instance, WeatherModifier.RAINY);

    const thunderChance = genChance();
    if (thunderChance <= chancesSet.thunder)
      applyWeatherModifier(instance, WeatherModifier.THUNDER)
  } else {
    const cloudyChance = genChance();
    if (cloudyChance <= chancesSet.cloudy) {
      instance.base = WeatherBase.CLOUDY;

      const fogChance = genChance();
      if (fogChance <= chancesSet.fog)
        instance.base = WeatherBase.FOGGY;
    }
  }

  return instance;
};

const getInstance = (
  season: Season,
  prevInstance: WeatherInstance | null = null
): WeatherInstance => {
  const rainAmplifier = prevInstance?.base === WeatherBase.OTHER
    ? 1.25 : 1.0;

  const chancesSet: SeasonChances = getChancesSet(season);
  const instance = genInstanceBySeason(chancesSet, rainAmplifier);

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
class WeekForecast {
  private readonly kvpName: string;
  private readonly timeZone: string;

  private season: Season = Season.WINTER;
  private dayNum: Week = Week.SUNDAY;
  
  public data: WeatherForecast;

  constructor(
    kvpName: string,
    timeZone: string,
    kvpForecast: WeatherForecast | null
  ) {
    this.kvpName = kvpName;
    this.timeZone = validateTimezone(timeZone);
    this.updateDate(new Date);

    if (kvpForecast && kvpForecast.timeZone === this.timeZone) {
      const forecastDay = getDayByTimeZone(
        new Date(kvpForecast.updatedAt),
        this.timeZone
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
    const dateDay = getDayByTimeZone(date, this.timeZone);
    this.dayNum = Math.max(0, Math.min(6, dateDay));

    const dateMonth = getMonthByTimeZone(date, this.timeZone);
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
}

export const Forecast = new WeekForecast(
  Config.kvpName,
  Config.timeZone,
  getKvpForecast(Config.kvpName)
);