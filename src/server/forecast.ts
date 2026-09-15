import { Config } from './config';
import {
  Season,
  WeatherBase,
  WeatherModifier,
  ModifierName,
  WeatherInstance,
  WeatherForecast,
  getRandomRng,
  validateTimezone,
} from './utils';

const WEATHER_KVP_NAME = Config.kvpName;
const TIMEZONE = validateTimezone(Config.timeZone);

const GenerateSeasonInstance = (season: Season): WeatherInstance => {
  const chance = getRandomRng(1, 10);

  const instance: WeatherInstance = {
    base: WeatherBase.Sunny,
    modifier: WeatherModifier.None,
    wind: 1
  };

  switch (season) {
    case Season.Winter:
      break;
    case Season.Spring:
      break;
    case Season.Summer:
      break;
    case Season.Autumn:
      break;
  }

  return instance;
};

const GenerateWeatherInstance = (
  season: Season,
  prevModifier: WeatherModifier
): WeatherInstance => {
  const chance = getRandomRng(1, 10);
  const instance: WeatherInstance = GenerateSeasonInstance(season);

  return instance;
};

const GenerateForecast = (season: string): WeatherForecast => {

};

const GetForecast = () => {};