import { Config, SeasonChances } from './config';
import {
  Season,
  WeatherBase,
  WeatherModifier,
  WeatherInstance,
  WeatherForecast,
  genChance,
  validateTimezone,
  getSeason,
  WeekDay,
  Week,
  WEEK_ORDER,
  getDefaultForecast,
  getDayByTimeZone,
  getMonthByTimeZone,
  isValidForecast
} from './utils';

const WEATHER_KVP_NAME = Config.kvpName;
const TIMEZONE = validateTimezone(Config.timeZone);

const ApplyWeatherModifier = (
  instance: WeatherInstance,
  modifier: WeatherModifier
): WeatherInstance => {
  if (instance.base !== WeatherBase.Other)
    instance.base = WeatherBase.Other;

  instance.modifier = instance.modifier | modifier;

  return instance;
};

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
    ApplyWeatherModifier(instance, WeatherModifier.Rainy);

    const thunderChance = genChance();
    if (thunderChance <= chancesSet.thunder)
      ApplyWeatherModifier(instance, WeatherModifier.Thunder)
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

const GenWeatherInstance = (
  season: Season,
  prevInstance: WeatherInstance | null = null
): WeatherInstance => {
  const rainAmplifier = prevInstance?.base === WeatherBase.Other
    ? 1.25 : 1.0;

  const chancesSet: SeasonChances = GetChancesSet(season);
  const instance = GenInstanceBySeason(chancesSet, rainAmplifier);

  return instance;
};

export const GenNewForecast = (date: Date): WeatherForecast => {
  const forecast = getDefaultForecast(Date.now(), TIMEZONE);

  const dateMonth = getMonthByTimeZone(date, TIMEZONE);
  const monthNum = Math.max(0, Math.min(11, dateMonth));
  const season: Season = getSeason(monthNum);

  const dateDay = getDayByTimeZone(date, forecast.timeZone);
  const weekDayNum: Week = Math.max(0, Math.min(6, dateDay));

  const weekOrder: WeekDay[] = [
    ...WEEK_ORDER.slice(weekDayNum),
    ...WEEK_ORDER.slice(0, weekDayNum)
  ];

  let prevInstance: WeatherInstance | null = null;
  for (const day of weekOrder) {
    const instance = GenWeatherInstance(season, prevInstance);
    forecast.schedule[day] = instance;
    prevInstance = instance;
  }

  return forecast;
};

const UpdateForecast = (
  date: Date,
  forecast: WeatherForecast
): WeatherForecast => {
  forecast.updatedAt = Date.now();

  const dateDay = getDayByTimeZone(date, forecast.timeZone);
  const weekDayNum: Week = Math.max(0, Math.min(6, dateDay));

  if (weekDayNum > 0) {
    const dateMonth = getMonthByTimeZone(date, TIMEZONE);
    const monthNum = Math.max(0, Math.min(11, dateMonth));
    const season: Season = getSeason(monthNum);

    const toUpdDays = WEEK_ORDER.slice(0, weekDayNum);
    const lastDay = WEEK_ORDER[WEEK_ORDER.length - 1];

    let prevInstance: WeatherInstance = forecast.schedule[lastDay];
    for (const day of toUpdDays) {
      const instance = GenWeatherInstance(season, prevInstance);
      forecast.schedule[day] = instance;
      prevInstance = instance;
    }
  }

  return forecast;
};

const GetForecast = (): WeatherForecast => {
  const currDate = new Date;

  const setNewForecast = (): WeatherForecast => {
    const forecast = GenNewForecast(currDate);
    SetResourceKvp(WEATHER_KVP_NAME, JSON.stringify(forecast));
    return forecast;
  };

  const rawForecast = GetResourceKvpString(WEATHER_KVP_NAME);

  if (rawForecast) {
    try {
      const tryForecast: unknown = JSON.parse(rawForecast);
      
      if (isValidForecast(tryForecast)) {
        const forecast = tryForecast as WeatherForecast;
        if (forecast.timeZone === TIMEZONE) {
          const currDay = getDayByTimeZone(currDate, TIMEZONE);
          const forecastDay = getDayByTimeZone(
            new Date(forecast.updatedAt),
            TIMEZONE
          );

          if (currDay === forecastDay) return forecast;
          else return UpdateForecast(currDate, forecast);
        }
      }
    } catch (err) {
      console.error('Corrupted Weather Forecast');
      return setNewForecast();
    }
  }

  return setNewForecast();
};