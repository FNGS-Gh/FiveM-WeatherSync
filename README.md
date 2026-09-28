# FiveM-WeatherSync
`by Ghost @ FNGS / 2026` → [Author's GitHub](https://github.com/GhostQck) / [Publish Github](https://github.com/FNGS-Gh)

This standalone script provides advanced weather control features. The main goal was to implement a dynamic forecast system rather than a standard sync among players. The generated forecasts contain multiple detail levels, such as the set of all possible weather events during the day and the max/min temperature range.

The weather is scheduled logically, following a nature-like principle. For example, if it was raining yesterday, it would most likely repeat on the following day. The temperature alters gradually based on the current in-game time: it gets colder as the night approaches and vice versa. Rain reduces the temperature value and sets it back upon finishing.

Please note that I've used my other script for the in-game time dependency: [FiveM-TimeSync](https://github.com/FNGS-Gh/FiveM-TimeSync)

*More details can be found below under the* **"2. Description"** *section ▼*

## 1. Installation
❗️ *This project is published under the MIT License. Upon using it, please make sure to keep the credits and apply the same type of licensing.*

---

###
If you don't care about the code readability and you just want to deploy the resource straight away, you can delete everything except of the following files and folders (and their content respectively):

```
fxmanifest.lua
config.json
dist/
```

The `config.json` file can be modified anytime with no need to rebuild the scripts.

---

###
If you want to modify the code, you'll find the source TypeScript files within the `src/` folder. Please note that this repo doesn't contain any TS builder and etc, so you'll need to set up your dev environment accordingly.

Also make sure that you have the `@citizenfx` packages:

```
npm install -D typescript @citizenfx/client @citizenfx/server
```

## 2. Description

The very first thing this project does on booting is retrieving a valid weekly forecast (today and the 6 days afterwards). The forecast object is stored via the embedded Cfx mechanism for KVPs (`SetResourceKvp()` / `GetResourceKvpString()` and etc), which are stored locally on server. During that step, there are two possible outcomes: either the forecast is both valid and available, or the forecast is generated from afresh.

Moving forward, the server script creates the weather sync handler to store and modify all the weather states. Weather updates are scheduled via the `setTimeout()` function to avoid any thread loops or intervals. At this point, it's important to note that the way the weather is handled fully represents my personal belief on how the weather/time behavior can provide the best possible gaming experience. This project follows an independent practice: the weekly forecast is attached to the actual real time zone you specify within the `config.json` file, rather than to the in-game timeflow. Each forecast day represents an actual real-life day and updates accordingly, completely ignoring the in-game day cycle.

For example, if the generated forecast suggests that the ongoing day (in real life) is going to feature rain at some point, all the elapsed in-game days during the server uptime will have a pseudo-random chance to actually trigger the `RAIN` GTA V weather, despite of whether the in-game day has already changed to the next one.

*The weather types breakdown can be found below under the* **"3. Weather Types"** *section ▼*

In general, this weather system provides a weekly forecast for a real-life week, not the in-game one. Meanwhile, the in-game days can pass and shift, but they would still follow the scheduled weather type of the ongoing real-life day.

The server script also runs a scheduled timeout task to update the weekly forecast, as the real-life day ends in accordance to the set time zone, meaning that the script itself can run indefinitely, if needed. The client script simply receives an updated weather state as soon as the update occurs, regardless of the real time attachment.

### Features:

- Local in-game weather sync between all players;
- Fully customizable via the `config.json` file;
- Completely standalone;
- Lightweight production script files (in `prod/`);
- Adjustable weather occurence chances (in `config.json`);
- Smooth rain sequences (not just the default GTA V `RAIN` weather);
- Zero thread loops: every update occurs on a scheduled basis;
- Unique and maybe even unexpected usage of the standard GTA V weather types, which work great and in my opinion are missed on;
- Realistic forecasts and temperature behavior;

###

The processor time is expectedly at the constant `0.00ms` value, since the client script doesn't have any thread loops. As for the server script, I've tried to make it as optimized as possible: some relatively hard-to-calculate and repeating values are memoized within the `Map` hash table. Generally, I feel like both the client and the server side run smoothly.

## 3. Weather Types

| Weather Type | Implementation |
| :----------: | -------------- |
| *SUNNY* | The in-game weather runs through a short cycle: `CLEAR` ↔ `EXTRASUNNY` |
| *CLOUDY* | The in-game weather randomly runs through the following cycle: `CLOUDS` → `SMOG` → `OVERCAST` |
| *FOGGY* | Cycle: `FOGGY` → `SNOWLIGHT` → `SMOG` → `OVERCAST` |
| *OTHER* | Applied only when a rain occurs. *See more details below* ▼ |
---

### Rain Sequences:

| Length <br />\ <br /> Modifier | SHORT | LONG |
| :---------: | ----- | ---- |
| __RAIN__    | `OVERCAST` → `CLEARING` → `OVERCAST` | `OVERCAST` → `CLEARING` → `RAIN` → `CLEARING` → `OVERCAST` |
| __THUNDER__ | `CLEARING` → `RAIN` → `THUNDER` → `RAIN` → `CLEARING` | `OVERCAST` → `CLEARING` → `RAIN` → `THUNDER` → `RAIN` → `CLEARING` → `OVERCAST` |

---

## 4. Known Issues

*None at the moment*