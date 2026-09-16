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

class ForecastBase {
  protected timeZone: string;
  protected season: Season = Season.Winter;
  protected dayNum: Week = Week.Sunday;

  constructor(date: Date, timeZone: string) {
    this.timeZone = validateTimezone(timeZone);
    this.updateDate(date);
  }

  private genInstanceBySeason(
    chancesSet: SeasonChances,
    rainAmplifier = 1.0
  ): WeatherInstance {
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

  protected getInstance(
    prevInstance: WeatherInstance | null = null
  ): WeatherInstance {
    const rainAmplifier = prevInstance?.base === WeatherBase.Other
      ? 1.25 : 1.0;
  
    const chancesSet: SeasonChances = GetChancesSet(this.season);
    const instance = this.genInstanceBySeason(chancesSet, rainAmplifier);
  
    return instance;
  }

  protected genNewForecast(): WeatherForecast {
    this.updateDate(new Date);
    const forecast = getDefaultForecast(Date.now(), this.timeZone);
  
    const weekOrder: WeekDay[] = [
      ...WEEK_ORDER.slice(this.dayNum),
      ...WEEK_ORDER.slice(0, this.dayNum)
    ];
  
    let prevInstance: WeatherInstance | null = null;
    for (const day of weekOrder) {
      const instance = this.getInstance(prevInstance);
      forecast.schedule[day] = instance;
      prevInstance = instance;
    }
  
    return forecast;
  }

  protected updateDate(date: Date) {
    const dateDay = getDayByTimeZone(date, this.timeZone);
    this.dayNum = Math.max(0, Math.min(6, dateDay));

    const dateMonth = getMonthByTimeZone(date, this.timeZone);
    const monthNum = Math.max(0, Math.min(11, dateMonth));
    this.season = getSeason(monthNum);
  }
}

class WeekForecast extends ForecastBase {
  private kvpName: string;
  private forecast: WeatherForecast;

  constructor(kvpName: string, timeZone: string) {
    super(new Date, timeZone);

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
  
            this.forecast = forecast;
            if (this.dayNum !== forecastDay)
              this.updateForecast();

            return;
          }
        }
      } catch (err) {
        console.error('Corrupted Weather Forecast');
      }
    }
    
    this.forecast = this.genNewForecast();
    SetResourceKvp(kvpName, JSON.stringify(this.forecast));
  }

  public updateForecast(): WeatherForecast {
    this.updateDate(new Date);
    this.forecast.updatedAt = Date.now();
  
    if (this.dayNum > 0) {
      const toUpdDays = WEEK_ORDER.slice(0, this.dayNum);
      const lastDay = WEEK_ORDER[WEEK_ORDER.length - 1];
  
      let prevInstance: WeatherInstance = this.forecast.schedule[lastDay];
      for (const day of toUpdDays) {
        const instance = this.getInstance(prevInstance);
        this.forecast.schedule[day] = instance;
        prevInstance = instance;
      }
    }
  
    SetResourceKvp(this.kvpName, JSON.stringify(this.forecast));

    return this.forecast;
  }

  public getForecast(): WeatherForecast {
    return this.forecast;
  }
}

export const Forecast = new WeekForecast(Config.kvpName, Config.timeZone);