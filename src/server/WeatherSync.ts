import { CLOUDY_SET, FOGGY_SET, RainSequence, SUNNY_SET, WeatherType } from '../shared/utils';
import { Config } from './config';
import { WeekForecast, Forecast } from './forecast';
import {
  genChance,
  getChanceBag,
  getRandomRng,
  getRandomRngInc,
  Season,
  WeatherBase,
  WeatherForecast,
  WeatherInstance,
  WeatherModifier,
  Week,
  WEEK_ORDER,
  WeekDay
} from './utils';

const LONG_M_SEQ: Record<string, RainSequence[]> = {
  RAINY: [
    { durMult: 0.1, type: 'OVERCAST' },
    { durMult: 0.1, type: 'CLEARING' },
    { durMult: 0.6, type: 'RAIN' },
    { durMult: 0.1, type: 'CLEARING'},
    { durMult: 0.1, type: 'OVERCAST' },
  ],
  THUNDER: [
    { durMult: 0.1, type: 'OVERCAST' },
    { durMult: 0.1, type: 'CLEARING' },
    { durMult: 0.2, type: 'RAIN' },
    { durMult: 0.2, type: 'THUNDER' },
    { durMult: 0.2, type: 'RAIN' },
    { durMult: 0.1, type: 'CLEARING'},
    { durMult: 0.1, type: 'OVERCAST' },
  ]
} as const;
const TINY_M_SEQ: Record<string, RainSequence[]> = {
  RAINY: [
    { durMult: 0.1, type: 'OVERCAST' },
    { durMult: 0.8, type: 'CLEARING' },
    { durMult: 0.1, type: 'OVERCAST' },
  ],
  THUNDER: [
    { durMult: 0.2, type: 'CLEARING' },
    { durMult: 0.2, type: 'RAIN' },
    { durMult: 0.2, type: 'THUNDER' },
    { durMult: 0.2, type: 'RAIN' },
    { durMult: 0.2, type: 'CLEARING'},
  ]
} as const;

const LONG_DUR_MEMO = new Map<string, number>();
const TINY_DUR_MEMO = new Map<string, number>();

const DAY_SECONDS = 86400;      // 24 * 3600
const SUNRISE_SECONDS = 19800;  // 05:30 in-game sunrise time (5.5 * 3600)
const SUNSET_SECONDS = 72000;   // 20:00 in-game sunset time (20.0 * 3600)

const TEMP_PEAK = 45000;        // 12:30 in-game ((5.5 + 20.0) / 2 ~= 12.75 => 12.5 * 3600)
const TEMP_LOW = 59400;         // 16:30 in-game ((12.5 + 20.0) / 2 ~= 16.25 => 16.5 * 3600)

const getInitTemp = (
  timeMS: number,
  tempAvg: number,
  range: number[]
): number => {
  let temp: number;

  if (timeMS >= SUNSET_SECONDS || timeMS < SUNRISE_SECONDS)
    temp = range[0];
  else if (timeMS >= SUNRISE_SECONDS && timeMS < TEMP_PEAK)
    temp = getRandomRngInc(tempAvg, range[1]);
  else if (timeMS >= TEMP_PEAK && timeMS < TEMP_LOW)
    temp = range[1];
  else temp = getRandomRngInc(range[0], tempAvg);

  return temp;
};

const parseTemp = (temp: number, range: number[]): number =>
  Math.max(range[0], Math.min(range[1], temp));

const getUntilDayEndMS = (
  date: Date,
  formatter: Intl.DateTimeFormat
): number => {
  const DAY_IN_MS = DAY_SECONDS * 1000;

  const parts = formatter.formatToParts(date);
  const time = { h: 0, m: 0, s: 0, ms: 0 };

  for (const part of parts) {
    if (!part.type || !part.value) continue;
    switch (part.type) {
      case 'hour':
        time.h = parseInt(part.value, 10);
        break;
      case 'minute':
        time.m = parseInt(part.value, 10);
        break;
      case 'second':
        time.s = parseInt(part.value, 10);
        break;
      case 'fractionalSecond':
        time.ms = parseInt(part.value.padEnd(3, '0'), 10);
        break;
    }
  }

  if (time.h === 24) time.h = 0;

  const msPassed = time.h * 3600000
    + time.m * 60000
    + time.s * 1000
    + time.ms;
  const msRemaining = DAY_IN_MS - msPassed;

  return Math.max(0, Math.min(DAY_IN_MS, msRemaining));
};

const getWeatherSet = (base: WeatherBase): Set<WeatherType> => {
  switch (base) {
    case WeatherBase.SUNNY:
      return new Set<WeatherType>(SUNNY_SET);
    case WeatherBase.FOGGY:
      return new Set<WeatherType>(FOGGY_SET);
    default:
      return new Set<WeatherType>(CLOUDY_SET);
  }
};

class WorldWeather {
  private readonly forecast: WeekForecast;
  private readonly rainDurRng: number[];
  private readonly tinyRainDur: number;

  private instance: WeatherInstance;
  private tempRng: number[] = [];
  private tempAvg = 0;
  private base: WeatherBase = WeatherBase.SUNNY;
  private modifier: WeatherModifier = WeatherModifier.NONE;
  private currSet = new Set<WeatherType>;

  private dayTimeout: NodeJS.Timeout | null = null;
  private updTimeout: NodeJS.Timeout | null = null;

  public current: WeatherType;
  public temp: number;
  public wind: number;
  public lastRainMS = 0;
  public next: WeatherType | null = null;
  public nextInMS = 0;
  public rainDurM = -1;

  constructor(forecast: WeekForecast) {
    this.forecast = forecast;
    this.instance = this.getCurrInstance();

    this.rainDurRng = Config.modifierDurRng;
    this.tinyRainDur = Math.floor(
      Math.abs(this.rainDurRng[1] - this.rainDurRng[0]) * 0.4
    );

    this.updateValues();

    const inGameMS: number = globalThis
      .exports['FiveM-TimeSync'].GetTime();
    this.temp = getInitTemp(inGameMS, this.tempAvg, this.tempRng);
    this.wind = 0.5 <= this.temp / this.tempRng[1]
      ? getRandomRngInc(7, 12)
      : getRandomRngInc(1, 6);

    this.current = this.getRandomType();
    this.currSet.delete(this.current);

    this.scheduleDayEnd();
    this.scheduleUpdate();
  }

  private canDoModifier: (() => boolean) = () => false;

  private getRandomType(): WeatherType {
    const arr = Array.from(this.currSet);
    return arr[getRandomRng(0, arr.length)];
  }

  private getCurrInstance(): WeatherInstance {
    const dayName = WEEK_ORDER[this.forecast.dayNum];
    return this.forecast.data.schedule[dayName];
  }

  private updateValues() {
    this.tempRng = this.instance.temp;
    this.tempAvg = Math.floor((this.tempRng[0] + this.tempRng[1]) / 2);
    this.base = this.instance.base;
    this.modifier = this.instance.modifier;
    this.currSet = getWeatherSet(this.base);

    this.canDoModifier = getChanceBag(Config.accurracy, 10);
  }

  private updateTemp(timeMS: number, extra?: number) {
    if (extra === undefined) {
      if (timeMS >= SUNSET_SECONDS || timeMS < SUNRISE_SECONDS)
        this.temp = Math.max(this.tempRng[0], this.temp - 1);
      else if (timeMS >= SUNRISE_SECONDS && timeMS < TEMP_PEAK)
        this.temp = Math.min(this.tempRng[1], this.temp + 2);
      else if (timeMS >= TEMP_PEAK && timeMS < TEMP_LOW)
        this.temp = Math.min(this.tempRng[1], this.temp + 1);
      else this.temp = Math.max(this.tempRng[0], this.temp - 2);
    } else this.temp = parseTemp(this.temp + extra, this.tempRng);
  }

  private updateWind(extra?: number) {
    if (extra === undefined) {
      if (genChance() <= 0.5)
        this.wind = Math.max(1, Math.min(12, this.wind + 1));
      else this.wind = Math.max(1, Math.min(12, this.wind - 1));
    } else this.wind = Math.max(1, Math.min(12, this.wind + extra));
  }

  private scheduleDayEnd() {
    if (this.dayTimeout) {
      clearTimeout(this.dayTimeout);
      this.dayTimeout = null;
    }

    const inMS = getUntilDayEndMS(new Date, this.forecast.formatter);

    this.dayTimeout = setTimeout(() => {
      this.forecast.updateForecast();
      this.instance = this.getCurrInstance(); 

      this.updateValues();
      this.scheduleDayEnd();
    }, inMS + 1000);
  }

  private scheduleUpdate() {
    if (this.updTimeout) {
      clearTimeout(this.updTimeout);
      this.updTimeout = null;
    }

    this.updateWind();

    const inMinutes = getRandomRngInc(Config.gameUpdRng[0], Config.gameUpdRng[1]);
    const inMS = inMinutes * 60000;

    this.nextInMS = inMS;

    if (
      this.modifier === WeatherModifier.NONE
      || !this.canDoModifier()
    ) {
      const newType = this.getRandomType();
      this.currSet.delete(newType);
      this.next = newType;

      this.updTimeout = setTimeout(() => {
        if (genChance() <= 0.6) {
          const inGameMS: number = globalThis.exports['FiveM-TimeSync'].GetTime();
          this.updateTemp(inGameMS);
        }

        this.updateWeather(newType, true);
        this.scheduleUpdate();
      }, inMS);
      
      return;
    }

    const totalDurM = getRandomRngInc(this.rainDurRng[0], this.rainDurRng[1]);
    const totalDurMS = totalDurM * 60000;

    const seqGroup = totalDurMS <= this.tinyRainDur ? TINY_M_SEQ : LONG_M_SEQ;
    const seqMemo = seqGroup === LONG_M_SEQ ? LONG_DUR_MEMO : TINY_DUR_MEMO;
    const seqQueue = seqGroup[WeatherModifier[this.modifier]]
      ? seqGroup[WeatherModifier[this.modifier]]
      : seqGroup.RAINY;
    
    let rainRatio = seqMemo.get(WeatherModifier[this.modifier]);
    if (!rainRatio) {
      rainRatio = seqQueue.reduce(
        (acc, curr) => acc + (curr.type !== 'OVERCAST' ? curr.durMult : 0.0),
        0.0
      );
      seqMemo.set(WeatherModifier[this.modifier], rainRatio);
    }

    this.rainDurM = Math.floor(totalDurM * rainRatio);

    const gameMS: number = globalThis.exports['FiveM-TimeSync'].GetTime();
    this.updateTemp(gameMS, -2);

    this.runRainSeq(inMS, totalDurMS, seqQueue);
  }

  private updateWeather(type: WeatherType, natural = false) {
    if (getWeatherSet(this.base).has(this.current))
      this.currSet.add(this.current);

    this.current = type;
    // emit on clients + check snow
  }
  
  private runRainSeq(
    startIn: number,
    totalDur: number,
    seqQueue: RainSequence[],
    idx = 0
  ) {
    if (this.updTimeout) {
      clearTimeout(this.updTimeout);
      this.updTimeout = null;
    }

    if (idx >= seqQueue.length) {
      const newType = this.getRandomType();
      this.currSet.delete(newType);
      this.next = newType;
      this.nextInMS = startIn;

      const gameMS: number = globalThis.exports['FiveM-TimeSync'].GetTime();
      this.updateTemp(gameMS, 2);

      this.updTimeout = setTimeout(() => {
        this.updateWeather(newType);
        this.scheduleUpdate();
      }, startIn);

      return;
    }

    const type = seqQueue[idx].type;
    const nextStartIn = Math.floor(seqQueue[idx].durMult * totalDur);

    this.next = type;
    this.nextInMS = startIn;

    this.updTimeout = setTimeout(() => {
      if (this.updTimeout) {
        clearTimeout(this.updTimeout);
        this.updTimeout = null;
      }

      this.updateWeather(type, true);
      this.runRainSeq(nextStartIn, totalDur, seqQueue, idx + 1);
    }, startIn);
  }
}

console.dir(Forecast.data);
const WeatherSync = new WorldWeather(Forecast);