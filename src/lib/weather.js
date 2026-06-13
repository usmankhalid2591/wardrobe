// Lightweight weather lookup: browser geolocation + Open-Meteo (no API key).

// WMO weather codes -> short description
const CODES = {
  0: 'clear sky', 1: 'mostly clear', 2: 'partly cloudy', 3: 'overcast',
  45: 'foggy', 48: 'foggy',
  51: 'light drizzle', 53: 'drizzle', 55: 'heavy drizzle',
  56: 'freezing drizzle', 57: 'freezing drizzle',
  61: 'light rain', 63: 'rain', 65: 'heavy rain',
  66: 'freezing rain', 67: 'freezing rain',
  71: 'light snow', 73: 'snow', 75: 'heavy snow', 77: 'snow grains',
  80: 'light rain showers', 81: 'rain showers', 82: 'violent rain showers',
  85: 'snow showers', 86: 'heavy snow showers',
  95: 'thunderstorm', 96: 'thunderstorm with hail', 99: 'thunderstorm with hail',
}

function describe(code) {
  return CODES[code] || 'mild weather'
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 30 * 60 * 1000,
    })
  })
}

// Resolves to { tempC, code, description } or null if location/weather
// can't be determined (permission denied, offline, etc.). Never throws.
export async function getWeather() {
  try {
    const pos = await getPosition()
    const { latitude, longitude } = pos.coords
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const cur = data?.current
    if (!cur) return null
    return {
      tempC: Math.round(cur.temperature_2m),
      code: cur.weather_code,
      description: describe(cur.weather_code),
    }
  } catch {
    return null
  }
}
