
RegisterCommand('weather', (_source: number, args: string[]) => {
  SetWeatherTypeOvertimePersist(args[0], Number(args[1]));
}, false);

RegisterCommand('weatherNow', (_source: number, args: string[]) => {
  SetWeatherTypeNowPersist(args[0]);
}, false);