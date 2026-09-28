import {
  WEATHER_TYPES,
  WeatherType,
  SyncPayload,
  InitPayload,
  SNOW_MAP
} from '../shared/utils';

const FADE_TIME_S = 30; // Seconds it takes to transition to new weather

let snowApplied = false;

const validateWeather = (
  tryWeather: WeatherType,
  tryNext: WeatherType | null
): { weather: WeatherType, next: WeatherType | null } => {
  let weather = snowApplied
    ? SNOW_MAP[tryWeather] ?? "SNOW_HALLOWEEN"
    : tryWeather;

  if (!WEATHER_TYPES.includes(weather)) {
    weather = WEATHER_TYPES[0];
    // Notify player
    console.log(`^1ERROR: Weather type is non-existent (${tryWeather}/${weather})`);
  }
  
  let next = tryNext;

  if (next) {
    if (snowApplied)
      next = SNOW_MAP[next] ?? "SNOW_HALLOWEEN";

    if (!WEATHER_TYPES.includes(next)) {
      next = WEATHER_TYPES[0];
      // Notify player
      console.log(`^1ERROR: NEXT weather type is non-existent (${tryNext}/${next})`);
    }
  }

  return { weather, next };
};

const applyWeather = (payload: SyncPayload, instant = false) => {
  const { weather, next } = validateWeather(
    payload.weather,
    payload.next,
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

onNet('Weather:Init', (payload: InitPayload) => {
  emit('Weather:InitTZ', payload.timeZone);

  snowApplied = payload.isSnow;

  if (payload.isSnow) {
    SetSnowLevel(1.0);
    SetForcePedFootstepsTracks(true);
    SetForceVehicleTrails(true);
    RequestNamedPtfxAsset('core_snow');
  } else {
    SetSnowLevel(0.0);
    SetForcePedFootstepsTracks(false);
    SetForceVehicleTrails(false);
    RemoveNamedPtfxAsset('core_snow');
  }

  applyWeather({
    weather: payload.weather,
    temp: payload.temp,
    next: payload.next,
    nextInMS: payload.nextInMS
  }, true);
});

onNet('Weather:Sync', (payload: SyncPayload) => applyWeather(payload));

onNet('Weather:UpdateNext', (tryNext: WeatherType, nextInMS: number) => {
  let next = tryNext;

  if (next) {
    if (snowApplied)
      next = SNOW_MAP[next] ?? "SNOW_HALLOWEEN";

    if (!WEATHER_TYPES.includes(next)) {
      next = WEATHER_TYPES[0];
      // Notify player
      console.log(`^1ERROR: NEXT weather type is non-existent (${tryNext}/${next})`);
    }
  }

  emit('Weather:UpdateNextUI', next, nextInMS);
});

on('onClientMapStart', () => emitNet('Weather:RequestInit'));