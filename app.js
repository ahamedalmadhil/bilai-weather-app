const $ = (id) => document.getElementById(id);
let units = "celsius";
let currentWeather = null;
let currentForecast = null;
let place = { name: "Chennai", country: "India", latitude: 13.0827, longitude: 80.2707 };

const weatherMap = {
  0:["Clear sky","☀️"],1:["Mainly clear","🌤️"],2:["Partly cloudy","⛅"],3:["Overcast","☁️"],
  45:["Fog","🌫️"],48:["Rime fog","🌫️"],51:["Light drizzle","🌦️"],53:["Drizzle","🌦️"],55:["Dense drizzle","🌧️"],
  56:["Freezing drizzle","🌧️"],57:["Freezing drizzle","🌧️"],61:["Slight rain","🌦️"],63:["Rain","🌧️"],65:["Heavy rain","🌧️"],
  66:["Freezing rain","🌧️"],67:["Freezing rain","🌧️"],71:["Slight snow","🌨️"],73:["Snow","🌨️"],75:["Heavy snow","❄️"],
  77:["Snow grains","🌨️"],80:["Rain showers","🌦️"],81:["Rain showers","🌧️"],82:["Heavy showers","⛈️"],
  85:["Snow showers","🌨️"],86:["Heavy snow showers","❄️"],95:["Thunderstorm","⛈️"],96:["Thunderstorm with hail","⛈️"],99:["Thunderstorm with hail","⛈️"]
};
function weatherInfo(code){return weatherMap[code] || ["Conditions unavailable","🌤️"];}
function temp(v){return Math.round(units==="celsius"?v:(v*9/5)+32);}
function degree(){return units==="celsius"?"°C":"°F";}
function timeOnly(value){return value ? new Date(value).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "--:--";}
function dayName(value, today=false){return today?"Today":new Date(value+"T12:00:00").toLocaleDateString([], {weekday:"short"});}
function uvText(v){return v<3?"Low":v<6?"Moderate":v<8?"High":v<11?"Very high":"Extreme";}
function showNotice(message,error=false){$("notice").textContent=message;$("notice").classList.toggle("error",error);}

async function geocodeCity(city){
  const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const response=await fetch(url);
  if(!response.ok) throw new Error("Could not search for that city.");
  const data=await response.json();
  if(!data.results?.length) throw new Error("City not found. Try another spelling.");
  const result=data.results[0];
  return {name:result.name,country:result.country||"",latitude:result.latitude,longitude:result.longitude};
}
async function loadWeather(){
  showNotice("Fetching the latest forecast…");
  try{
    const params=new URLSearchParams({
      latitude:place.latitude,longitude:place.longitude,
      current:"temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,pressure_msl,wind_speed_10m",
      hourly:"temperature_2m,weather_code,uv_index,visibility",
      daily:"weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset",
      forecast_days:"5",timezone:"auto"
    });
    const response=await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if(!response.ok) throw new Error("Weather service is temporarily unavailable.");
    const data=await response.json();
    currentWeather=data.current;currentForecast=data;
    renderWeather(data);
    showNotice(`Updated just now · Local time ${timeOnly(data.current.time)}`);
  }catch(error){showNotice(error.message||"Something went wrong. Please try again.",true);}
}
function renderWeather(data){
  const c=data.current,d=data.daily,h=data.hourly;
  $("placeName").textContent=`${place.name}, ${place.country}`;
  $("currentDate").textContent=new Date(c.time).toLocaleDateString([], {weekday:"long",month:"long",day:"numeric"});
  const [label,icon]=weatherInfo(c.weather_code);
  $("mainIcon").textContent=icon;$("temperature").innerHTML=`${temp(c.temperature_2m)}<span>${degree()}</span>`;
  $("condition").textContent=label;
  $("highTemp").textContent=`${temp(d.temperature_2m_max[0])}${degree()}`;
  $("lowTemp").textContent=`${temp(d.temperature_2m_min[0])}${degree()}`;
  $("humidity").innerHTML=`${c.relative_humidity_2m}<small>%</small>`;
  $("wind").innerHTML=`${Math.round(c.wind_speed_10m)}<small> km/h</small>`;
  $("feels").innerHTML=`${temp(c.apparent_temperature)}<small>${degree()}</small>`;
  const nowIndex=h.time.findIndex(t=>t>=c.time);
  const uv=h.uv_index[Math.max(0,nowIndex)]??0;
  $("uv").textContent=Number(uv).toFixed(1);$("uvLabel").textContent=uvText(uv);
  $("pressure").innerHTML=`${Math.round(c.pressure_msl)}<small> hPa</small>`;
  const vis=h.visibility[Math.max(0,nowIndex)]??0;
  $("visibility").innerHTML=`${(vis/1000).toFixed(1)}<small> km</small>`;
  $("sunrise").textContent=timeOnly(d.sunrise[0]);$("sunset").textContent=timeOnly(d.sunset[0]);
  renderHourly(h,nowIndex);renderWeekly(d);
}
function renderHourly(h,start){
  const list=$("hourlyList");list.innerHTML="";
  for(let i=Math.max(0,start);i<Math.min(h.time.length,Math.max(0,start)+6);i++){
    const [label,icon]=weatherInfo(h.weather_code[i]);
    const time=i===start?"Now":new Date(h.time[i]).toLocaleTimeString([],{hour:"numeric"});
    const item=document.createElement("div");item.className="hour-item";
    item.innerHTML=`<div class="hour-time">${time}</div><div class="hour-icon" title="${label}">${icon}</div><div class="hour-temp">${temp(h.temperature_2m[i])}°</div>`;
    list.appendChild(item);
  }
}
function renderWeekly(d){
  const list=$("weeklyList");list.innerHTML="";
  d.time.forEach((date,i)=>{
    const [label,icon]=weatherInfo(d.weather_code[i]);
    const row=document.createElement("div");row.className="day-row";
    row.innerHTML=`<span class="day-name">${dayName(date,i===0)}</span><span class="day-icon" title="${label}">${icon}</span><span class="day-desc">${label}</span><span class="day-temps">${temp(d.temperature_2m_max[i])}° <span>${temp(d.temperature_2m_min[i])}°</span></span>`;
    list.appendChild(row);
  });
}
$("searchForm").addEventListener("submit",async e=>{
  e.preventDefault();const city=$("cityInput").value.trim();if(!city)return;
  try{showNotice("Finding your city…");place=await geocodeCity(city);await loadWeather();$("cityInput").value="";}
  catch(error){showNotice(error.message,true);}
});
$("locationButton").addEventListener("click",()=>{
  if(!navigator.geolocation){showNotice("Location is not supported by this browser.",true);return;}
  showNotice("Requesting your location…");
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      place={name:"Your location",country:"",latitude:pos.coords.latitude,longitude:pos.coords.longitude};
      const r=await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${place.latitude}&longitude=${place.longitude}&language=en&format=json`);
      if(r.ok){const data=await r.json();const p=data.results?.[0];if(p)place={...place,name:p.name,country:p.country||""};}
      await loadWeather();
    }catch(e){showNotice("Could not load weather for your location.",true);}
  },()=>showNotice("Location permission was not granted. You can search for a city instead.",true),{enableHighAccuracy:false,timeout:10000});
});
$("unitToggle").addEventListener("click",()=>{units=units==="celsius"?"fahrenheit":"celsius";$("unitToggle").textContent=units==="celsius"?"°C":"°F";if(currentForecast)renderWeather(currentForecast);});
$("themeToggle").addEventListener("click",()=>{document.body.classList.toggle("light");$("themeToggle").textContent=document.body.classList.contains("light")?"☾":"☼";});
loadWeather();
