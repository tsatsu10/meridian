**

# 🌤️ OpenWeatherMap Integration Guide

Complete guide to the OpenWeatherMap weather service integration in Meridian.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Setup & Configuration](#setup--configuration)
3. [Features](#features)
4. [API Endpoints](#api-endpoints)
5. [Frontend Usage](#frontend-usage)
6. [Automatic Location Detection](#automatic-location-detection)
7. [Caching Strategy](#caching-strategy)
8. [Monitoring & Quotas](#monitoring--quotas)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The OpenWeatherMap integration provides real-time weather data for:
- **Dashboard Weather Widgets** - Show current conditions for user/workspace location
- **Automatic Location Detection** - Uses ipstack to detect user location
- **5-Day Forecasts** - Extended weather predictions
- **Smart Caching** - 30-minute refresh intervals to optimize API usage

### Key Benefits

✅ **Generous Free Tier** - 60 calls/minute, 1M calls/month  
✅ **Automatic Location** - Powered by ipstack integration  
✅ **30-minute Intelligent caching** - Balances freshness with API conservation  
✅ **Beautiful Widgets** - Pre-built UI components ready to use  
✅ **Type-safe** - Full TypeScript & Zod validation  
✅ **5-Day Forecast** - Included in free tier  

---

## Setup & Configuration

### 1. Get OpenWeatherMap API Key

1. Sign up at [https://openweathermap.org/api](https://openweathermap.org/api)
2. Navigate to API Keys section
3. Generate a new API key (free tier included)
4. Copy your API key

**Free Tier Includes:**
- ✅ Current weather data
- ✅ 5-day / 3-hour forecast
- ✅ 60 calls/minute
- ✅ 1,000,000 calls/month
- ✅ HTTPS included

### 2. Configure Environment Variables

Add to `apps/api/.env`:

```bash
# Weather Service
OPENWEATHERMAP_API_KEY=your_actual_api_key_here
OPENWEATHERMAP_UNITS=metric  # or 'imperial' for Fahrenheit
```

### 3. Verify Configuration

The weather service will log initialization status on startup:

```
✅ Weather service initialized with OpenWeatherMap API
   Units: metric (Celsius)
   Free tier: 60 calls/minute, 1,000,000 calls/month
```

If the API key is missing:

```
⚠️  OpenWeatherMap API key not configured. Weather features will be disabled.
   Get a free API key at https://openweathermap.org/api
```

---

## Features

### Automatic Integration Points

The OpenWeatherMap integration powers:

1. **Weather Widget** (`quick-wins/weather-widget.tsx`)
   - Current temperature and conditions
   - Humidity and wind information
   - "Feels like" temperature
   - Cloud cover percentage
   - Auto-refresh every 30 minutes

2. **Location Detection**
   - Automatically detects user location via ipstack
   - Falls back to workspace default location
   - Supports manual location override

3. **Dashboard Integration**
   - Available in Quick Wins drawer
   - Configurable per workspace
   - Customizable refresh intervals

---

## API Endpoints

All endpoints require authentication for security.

### GET `/api/weather/current`

Get current weather for a location.

**Query Parameters:**
- `city` - City name (e.g., "Mountain View")
- `country` - Country code (e.g., "US")
- `lat` - Latitude
- `lon` - Longitude
- `autoDetect` - Auto-detect location from IP (true/false)

**Examples:**

```bash
# By city name
GET /api/weather/current?city=London&country=GB

# By coordinates
GET /api/weather/current?lat=37.39&lon=-122.08

# Auto-detect from IP
GET /api/weather/current?autoDetect=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "location": {
      "city": "Mountain View",
      "country": "US",
      "timezone": "UTC-8",
      "localtime": "2024-01-15T14:30:00Z",
      "coordinates": {
        "lat": 37.39,
        "lon": -122.08
      }
    },
    "current": {
      "temp": 15,
      "feelsLike": 14,
      "tempMin": 12,
      "tempMax": 18,
      "condition": "Clear",
      "description": "clear sky",
      "icon": "01d",
      "humidity": 65,
      "pressure": 1013,
      "windSpeed": 4,
      "windDirection": 180,
      "windDirectionCompass": "S",
      "cloudCover": 10,
      "visibility": 10000,
      "sunrise": "2024-01-15T06:30:00Z",
      "sunset": "2024-01-15T17:45:00Z",
      "isDay": true
    }
  }
}
```

---

### GET `/api/weather/forecast`

Get 5-day weather forecast.

**Query Parameters:**
- `city` - City name
- `country` - Country code
- `lat` - Latitude
- `lon` - Longitude

**Example:**
```bash
GET /api/weather/forecast?city=San Francisco&country=US
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2024-01-16",
      "tempMin": 10,
      "tempMax": 18,
      "condition": "Clear",
      "description": "clear sky",
      "icon": "01d",
      "humidity": 65,
      "windSpeed": 4,
      "chanceOfRain": 0.1
    },
    // ... 4 more days
  ]
}
```

---

### GET `/api/weather/location/:ip`

Get weather for a specific IP address (Admin/Workspace Manager only).

**Example:**
```bash
GET /api/weather/location/8.8.8.8
Headers:
  x-user-email: admin@example.com
  x-user-role: admin
```

**Response:** Same as `/current` endpoint

---

### GET `/api/weather/stats`

Get service usage statistics (Admin/Workspace Manager only).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 1250,
    "cacheHits": 1150,
    "cacheMisses": 100,
    "apiCalls": 100,
    "errors": 0,
    "lastApiCall": "2024-01-15T10:30:00Z",
    "quotaWarning": false,
    "cacheSize": 45,
    "forecastCacheSize": 20,
    "cacheHitRate": "92.00%",
    "topLocations": [
      { "city": "New York", "requests": 300 },
      { "city": "San Francisco", "requests": 250 },
      { "city": "London", "requests": 200 }
    ]
  }
}
```

---

### GET `/api/weather/quota`

Check API rate limit usage (Admin/Workspace Manager only).

**Response:**
```json
{
  "success": true,
  "data": {
    "callsLastMinute": 5,
    "limit": 60,
    "percentage": 8.33
  },
  "warning": null,
  "critical": null
}
```

---

### DELETE `/api/weather/cache`

Clear weather cache (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "Weather cache cleared successfully (Current + Forecast)"
}
```

---

## Frontend Usage

### Using the Weather Widget

```tsx
import { WeatherWidget } from '@/components/dashboard/quick-wins/weather-widget';

// Auto-detect user location
<WeatherWidget autoDetect={true} />

// Specific location
<WeatherWidget location="New York" />

// With custom styling
<WeatherWidget 
  location="London"
  className="w-full"
/>
```

### Using the useWeather Hook

```tsx
import { useWeather } from '@/hooks/use-weather';

function MyComponent() {
  const { weather, loading, error, refetch } = useWeather({
    city: 'San Francisco',
    country: 'US',
    autoDetect: false,
    refreshInterval: 30 * 60 * 1000, // 30 minutes
  });

  if (loading) return <div>Loading weather...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!weather) return null;

  return (
    <div>
      <h2>{weather.location.city}</h2>
      <p>{weather.current.temp}°C - {weather.current.description}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

### Using the useForecast Hook

```tsx
import { useForecast } from '@/hooks/use-weather';

function ForecastWidget() {
  const { forecast, loading, error } = useForecast({
    city: 'Mountain View',
    country: 'US',
  });

  if (loading) return <div>Loading forecast...</div>;
  if (!forecast) return null;

  return (
    <div>
      {forecast.map((day) => (
        <div key={day.date}>
          <span>{day.date}</span>
          <span>{day.tempMin}° / {day.tempMax}°</span>
          <span>{day.condition}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Automatic Location Detection

### How It Works

```
User Opens Dashboard → Get User IP → ipstack API → Location
                                                      ↓
                                              OpenWeatherMap API
                                                      ↓
                                                Weather Widget
```

**Example Flow:**
1. User IP: `8.8.8.8`
2. ipstack detects: **Mountain View, California, US**
3. OpenWeatherMap fetches weather for: **Mountain View**
4. Widget displays: **15°C ☀️ Clear Sky**

### Configuration

```tsx
// Enable auto-detection (default)
<WeatherWidget autoDetect={true} />

// Disable auto-detection, use specific location
<WeatherWidget location="Paris" autoDetect={false} />

// Auto-detect only if no location provided
<WeatherWidget location={workspaceLocation} autoDetect={!workspaceLocation} />
```

---

## Caching Strategy

### Cache Configuration

**Current Weather:**
- **TTL:** 30 minutes
- **Why:** Weather changes gradually, 30-min is optimal
- **Storage:** In-memory Map (Redis support available)
- **Key Format:** `city:country` or `coords:lat,lon`

**Forecast:**
- **TTL:** 1 hour
- **Why:** Forecasts are more stable
- **Storage:** Separate cache from current weather

### Cache Behavior

```typescript
// First request - API call
GET /api/weather/current?city=NYC
→ API call → Cache for 30 minutes

// Requests within 30 minutes - cache hit
GET /api/weather/current?city=NYC
→ Instant response from cache

// After 30 minutes - cache expired
GET /api/weather/current?city=NYC
→ New API call → Cache refreshed
```

### Cache Performance

- Typical hit rate: **90-95%**
- API call reduction: **90%+**
- Response time (cached): **<5ms**
- Response time (API): **200-500ms**

---

## Monitoring & Quotas

### Free Tier Limits

| Metric | Limit |
|--------|-------|
| Calls per minute | 60 |
| Calls per month | 1,000,000 |
| Data updates | Every 10 minutes |
| HTTPS | ✅ Included |

### Usage Estimation

**With 30-minute caching:**

| Scenario | API Calls/Month | Within Free Tier? |
|----------|-----------------|-------------------|
| 100 users, 10 locations | ~14,400 | ✅ Yes (1.4%) |
| 1,000 users, 50 locations | ~72,000 | ✅ Yes (7.2%) |
| 10,000 users, 200 locations | ~288,000 | ✅ Yes (28.8%) |
| 100,000 users, 500 locations | ~720,000 | ✅ Yes (72%) |

**You can easily handle 100,000 users on the free tier!**

### Monitoring Usage

```bash
# Check current usage
curl http://localhost:3005/api/weather/stats \
  -H "x-user-email: admin@example.com" \
  -H "x-user-role: admin"

# Check rate limit
curl http://localhost:3005/api/weather/quota \
  -H "x-user-email: admin@example.com" \
  -H "x-user-role: admin"
```

---

## Best Practices

### 1. Use Auto-Detection When Possible

```tsx
// ✅ Good - Auto-detect user location
<WeatherWidget autoDetect={true} />

// ⚠️ Less optimal - Manual location for all users
<WeatherWidget location="New York" />
```

### 2. Set Appropriate Refresh Intervals

```tsx
// ✅ Good - 30 minutes (balances freshness & API usage)
refreshInterval: 30 * 60 * 1000

// ❌ Too frequent - wastes API calls
refreshInterval: 5 * 60 * 1000 // 5 minutes

// ❌ Too infrequent - stale data
refreshInterval: 4 * 60 * 60 * 1000 // 4 hours
```

### 3. Handle Errors Gracefully

```tsx
const { weather, error } = useWeather({ city: 'London' });

if (error) {
  // Show fallback UI, don't crash
  return <WeatherUnavailableMessage />;
}
```

### 4. Cache Management

```typescript
// Clear cache when deploying new version
if (appVersionChanged) {
  await fetch('/api/weather/cache', { method: 'DELETE' });
}
```

### 5. Monitor Top Locations

```typescript
// Optimize for most requested locations
const stats = await fetch('/api/weather/stats');
const topCities = stats.topLocations;

// Pre-warm cache for popular cities
topCities.forEach(({ city }) => {
  weatherService.getCurrentWeather({ city });
});
```

---

## Troubleshooting

### API Key Issues

**Problem:** Service not working, no weather data

**Solution:**
1. Verify `OPENWEATHERMAP_API_KEY` in `.env` file
2. Check API key is active at https://home.openweathermap.org/api_keys
3. Wait 10 minutes after key generation (activation time)
4. Restart the API server

### Rate Limit Errors

**Problem:** Getting 429 errors frequently

**Solution:**
1. Check quota: `GET /api/weather/quota`
2. Ensure caching is working: `GET /api/weather/stats`
3. Increase cache TTL if needed (default: 30 min)
4. Check for burst traffic patterns

### Location Not Found

**Problem:** "Weather data not available for this location"

**Solution:**
1. Verify city name spelling
2. Try adding country code: `city=Paris&country=FR`
3. Use coordinates instead: `lat=48.8566&lon=2.3522`
4. Check OpenWeatherMap supports this location

### Auto-Detection Not Working

**Problem:** autoDetect=true but using default location

**Solution:**
1. Verify ipstack integration is working
2. Check `IPSTACK_API_KEY` is configured
3. Test ipstack: `GET /api/geolocation/current`
4. Review server logs for geolocation errors

### Stale Weather Data

**Problem:** Weather not updating

**Solution:**
1. Check cache stats: `GET /api/weather/stats`
2. Verify refresh interval is correct
3. Clear cache manually: `DELETE /api/weather/cache`
4. Check lastApiCall timestamp in stats

---

## Additional Resources

- **OpenWeatherMap Documentation:** https://openweathermap.org/api
- **API Dashboard:** https://home.openweathermap.org/
- **Weather Icons:** https://openweathermap.org/weather-conditions
- **Status Page:** https://status.openweathermap.org/

---

## Synergy with ipstack

### Combined Power

The OpenWeatherMap integration works seamlessly with ipstack:

```typescript
// ipstack provides location
const location = await geolocationService.getLocation(userIP);
// → Mountain View, CA, US

// OpenWeatherMap provides weather
const weather = await weatherService.getCurrentWeather({
  city: location.city,
  country: location.countryCode
});
// → 15°C, Sunny, 65% humidity

// Combined in session
session.metadata = {
  location: location.city,
  weather: `${weather.current.temp}°C, ${weather.current.condition}`
};
```

### Location Priority

The system uses a smart fallback:

```
1. Manual Override (widget config)
   ↓ (if not set)
2. User IP Location (ipstack)
   ↓ (if detection fails)
3. Workspace Default Location
   ↓ (if not set)
4. Fallback to "New York"
```

---

## Advanced Features

### Weather Icons

OpenWeatherMap provides icon codes. Get the icon URL:

```typescript
import { getWeatherIconUrl } from '@/hooks/use-weather';

const iconUrl = getWeatherIconUrl('01d', '2x');
// → https://openweathermap.org/img/wn/01d@2x.png

// Use in component
<img src={iconUrl} alt="Weather icon" />
```

### Condition Mapping

Map OpenWeatherMap conditions to your local icons:

```typescript
import { mapWeatherCondition } from '@/hooks/use-weather';

const condition = mapWeatherCondition('Rain');
// → 'rainy'

// Use with local icons
<WeatherIcon condition={condition} />
```

### Multi-Location Support

```typescript
// Fetch weather for multiple office locations
const offices = [
  { name: 'HQ', city: 'San Francisco' },
  { name: 'Remote', city: 'New York' },
  { name: 'EMEA', city: 'London' }
];

const weatherData = await Promise.all(
  offices.map(async (office) => {
    const response = await fetch(
      `/api/weather/current?city=${office.city}`
    );
    const data = await response.json();
    return { ...office, weather: data.data };
  })
);
```

---

## Weather Widget Features

### Current Features

✅ **Temperature** - Current, min, max, feels like  
✅ **Conditions** - Clear, cloudy, rainy, snowy  
✅ **Humidity** - Percentage  
✅ **Wind** - Speed and direction (compass)  
✅ **Cloud Cover** - Percentage  
✅ **Location** - City and country  
✅ **Auto-Refresh** - Every 30 minutes  
✅ **Manual Refresh** - Click button to update  
✅ **Error Handling** - Graceful fallback UI  

### Enhanced Data Available

The API provides additional data you can display:

- ✅ **Visibility** - In meters/kilometers
- ✅ **Pressure** - Atmospheric pressure
- ✅ **Sunrise/Sunset** - Times
- ✅ **Day/Night** - Boolean indicator
- ✅ **Rain Volume** - Last 1h and 3h
- ✅ **Snow Volume** - Last 1h and 3h

---

## Configuration Examples

### Workspace-Wide Default

```typescript
// Set default location for workspace
const workspaceSettings = {
  defaultLocation: 'San Francisco',
  weatherUnits: 'metric',
  weatherRefreshInterval: 30,
};

// All users see weather for SF unless they override
<WeatherWidget location={workspaceSettings.defaultLocation} />
```

### User-Specific Location

```typescript
// Each user sees weather for their detected location
<WeatherWidget autoDetect={true} />

// Powered by ipstack → OpenWeatherMap pipeline
```

### Multi-Office Dashboard

```tsx
function MultiOfficeWeather() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <WeatherWidget location="San Francisco" />
      <WeatherWidget location="New York" />
      <WeatherWidget location="London" />
    </div>
  );
}
```

---

## Support

For issues related to:
- **OpenWeatherMap API:** Contact OpenWeatherMap support or check status page
- **Meridian Integration:** Check logs in `apps/api/logs/`
- **Auto-Detection:** Verify ipstack integration is working
- **Widget Display:** Check browser console for errors

---

**Last Updated:** 2024-01-15  
**Integration Version:** 2.0.0 (Real Data Edition)  
**Compatible with:** Meridian v0.4.0+  
**Powered by:** OpenWeatherMap API + ipstack Geolocation

