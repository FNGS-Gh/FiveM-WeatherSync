import {
  WEATHER_TYPES,
  WeatherType,
  SyncPayload,
  InitPayload
} from '../shared/utils';

const FADE_TIME_S = 30; // Seconds it takes to transition to new weather

const validateWeather = (
  tryWeather: WeatherType,
  tryNext: WeatherType
): Record<string, WeatherType> => {
  let weather = tryWeather;
  if (!WEATHER_TYPES.includes(tryWeather)) {
    weather = WEATHER_TYPES[0];
    // Notify player
    console.log(`^1ERROR: Init weather type is non-existent (${tryWeather})`);
  }

  let next = tryNext;
  if (!WEATHER_TYPES.includes(tryNext)) {
    next = WEATHER_TYPES[0];
    // Notify player
    console.log(`^1ERROR: Init NEXT weather type is non-existent (${tryNext})`);
  }

  return { weather, next };
};

const applyWeather = (payload: SyncPayload, instant = false) => {
  const { weather, next } = validateWeather(
    payload.weather,
    payload.next ? payload.next : WEATHER_TYPES[0]
  );

  emit(
    'Weather:UpdateUI',
    weather,
    payload.temp,
    next,
    payload.nextInMS
  );

  if (instant) SetWeatherTypeNowPersist(weather);
  else SetWeatherTypeOvertimePersist(weather, FADE_TIME_S);
};

// TO DO: Snow

onNet('Weather:Init', (payload: InitPayload) => {
  emit('Weather:InitTZ', payload.timeZone);

  applyWeather({
    weather: payload.weather,
    temp: payload.temp,
    next: payload.next,
    nextInMS: payload.nextInMS
  }, true);
});

onNet('Weather:Sync', (payload: SyncPayload) => applyWeather(payload));

on('onClientMapStart', () => emitNet('Weather:RequestInit'));

// tmp
RegisterCommand('weather', (_source: number, args: string[]) => {
  SetWeatherTypeOvertimePersist(args[0], Number(args[1]));
}, false);

RegisterCommand('weatherNow', (_source: number, args: string[]) => {
  SetWeatherTypeNowPersist(args[0]);
}, false);

RegisterCommand('rain', (_source: number, args: string[]) => {
  SetRainLevel(parseFloat(args[0]));
}, false);