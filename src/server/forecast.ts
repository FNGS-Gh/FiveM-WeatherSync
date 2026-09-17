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

const GetChancesSet = (season: Season): SeasonChances => {
  let chancesSet: SeasonChances = Config.winterChances;

  switch (season) {
    case Season.Spring:
      chancesSet = Config.springChances;
      break;
    case Season.Summer:
      chancesSet = Config.summerChances;
      break;
    case Season.Autumn:
      chancesSet = Config.autumnChances;
      break;
  }

  return chancesSet;
}

const GenInstanceBySeason = (
  chancesSet: SeasonChances,
  rainAmplifier = 1.0
): WeatherInstance => {
  const instance: WeatherInstance = {
    base: WeatherBase.Sunny,
    modifier: WeatherModifier.None
  };

  const rainChance = genChance(rainAmplifier);
  if (rainChance <= chancesSet.rain) {
    instance.base = WeatherBase.Other;
    applyWeatherModifier(instance, WeatherModifier.Rainy);

    const thunderChance = genChance();
    if (thunderChance <= chancesSet.thunder)
      applyWeatherModifier(instance, WeatherModifier.Thunder)
  } else {
    const cloudyChance = genChance();
    if (cloudyChance <= chancesSet.cloudy) {
      instance.base = WeatherBase.Cloudy;

      const fogChance = genChance();
      if (fogChance <= chancesSet.fog)
        instance.base = WeatherBase.Foggy;
    }
  }

  return instance;
};

const GetInstance = (
  season: Season,
  prevInstance: WeatherInstance | null = null
): WeatherInstance => {
  const rainAmplifier = prevInstance?.base === WeatherBase.Other
    ? 1.25 : 1.0;

  const chancesSet: SeasonChances = GetChancesSet(season);
  const instance = GenInstanceBySeason(chancesSet, rainAmplifier);

  return instance;
};

const GenNewForecast = (
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
    const instance = GetInstance(season, prevInstance);
    forecast.schedule[day] = instance;
    prevInstance = instance;
  }

  return forecast;
};

class WeekForecast {
  private timeZone: string;
  private season: Season = Season.Winter;
  private dayNum: Week = Week.Sunday;
  private kvpName: string;
  public data: WeatherForecast;

  constructor(kvpName: string, timeZone: string) {
    this.timeZone = validateTimezone(timeZone);
    this.updateDate(new Date);

    this.kvpName = kvpName;

    const rawForecast = GetResourceKvpString(kvpName);
    if (rawForecast) {
      try {
        const tryForecast: unknown = JSON.parse(rawForecast);
        
        if (isValidForecast(tryForecast)) {
          const forecast = tryForecast as WeatherForecast;
          if (forecast.timeZone === this.timeZone) {
            const forecastDay = getDayByTimeZone(
              new Date(forecast.updatedAt),
              this.timeZone
            );
  
            this.data = forecast;
            if (this.dayNum !== forecastDay)
              this.updateForecast();

            return;
          }
        }
      } catch (err) {
        console.error('Corrupted Weather Forecast');
      }
    }
    
    this.data = GenNewForecast(this.timeZone, this.season, this.dayNum);
    SetResourceKvp(kvpName, JSON.stringify(this.data));
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
        const instance = GetInstance(this.season, prevInstance);
        this.data.schedule[day] = instance;
        prevInstance = instance;
      }
    }
  
    SetResourceKvp(this.kvpName, JSON.stringify(this.data));

    return this.data;
  }
}

export const Forecast = new WeekForecast(Config.kvpName, Config.timeZone);