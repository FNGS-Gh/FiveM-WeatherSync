"use strict";(()=>{RegisterCommand("weather",(r,e)=>{SetWeatherTypeOvertimePersist(e[0],Number(e[1]))},!1);RegisterCommand("weatherNow",(r,e)=>{SetWeatherTypeNowPersist(e[0])},!1);})();
