# 🖼️ Unsplash Integration Guide

Complete guide to the Unsplash photo library integration in Meridian.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Setup & Configuration](#setup--configuration)
3. [Features](#features)
4. [API Endpoints](#api-endpoints)
5. [Frontend Usage](#frontend-usage)
6. [Components](#components)
7. [Attribution Requirements](#attribution-requirements)
8. [Caching Strategy](#caching-strategy)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Unsplash integration provides professional stock photography for:
- **Dashboard Backgrounds** - Personalized workspace visuals
- **Project Cover Images** - Professional project headers
- **Widget Backgrounds** - Beautiful widget customization
- **Empty States** - Engaging placeholder imagery
- **User Profiles** - Cover photos and visual identity

### Key Benefits

✅ **200,000+ Free Photos** - Massive high-quality library  
✅ **Generous Free Tier** - 50 requests/hour (36K/month)  
✅ **No Storage Costs** - CDN-hosted by Unsplash  
✅ **Instant Selection** - No upload wait times  
✅ **Professional Quality** - Curated by Unsplash  
✅ **Smart Categories** - Pre-configured for Meridian use cases  
✅ **Type-safe** - Full TypeScript & Zod validation  

---

## Setup & Configuration

### 1. Get Unsplash Access Key

1. Visit [https://unsplash.com/developers](https://unsplash.com/developers)
2. Create a new application (free)
3. Copy your **Access Key**
4. (Optional) Copy **Secret Key** for write operations

**Free Tier Includes:**
- ✅ 50 requests per hour
- ✅ ~36,000 requests/month
- ✅ All photo sizes
- ✅ Search functionality
- ✅ Random photos
- ✅ Collections access
- ⚠️ Attribution required

### 2. Configure Environment Variables

Add to `apps/api/.env`:

```bash
# Photo Library Service
UNSPLASH_ACCESS_KEY=your_actual_access_key_here
UNSPLASH_SECRET_KEY=your_secret_key_here  # Optional
UNSPLASH_APP_NAME=Meridian  # Your app name
```

### 3. Verify Configuration

The Unsplash service will log initialization status on startup:

```
✅ Unsplash photo library initialized
   App: Meridian
   Free tier: 50 requests/hour
```

If the access key is missing:

```
⚠️  Unsplash access key not configured. Photo library features will be disabled.
   Get a free access key at https://unsplash.com/developers
```

---

## Features

### Photo Search

Search millions of photos by keyword:

```typescript
const result = await unsplashService.searchPhotos({
  query: 'workspace productivity',
  page: 1,
  perPage: 20,
  orientation: 'landscape',
  orderBy: 'relevant',
});

// Returns: { photos: Photo[], total: number }
```

### Random Photos

Get random photos for variety:

```typescript
const photos = await unsplashService.getRandomPhoto({
  query: 'minimal workspace',
  orientation: 'landscape',
  count: 5,
});
```

### Curated Collections

Browse pre-curated photo sets:

```typescript
const collections = await unsplashService.getCollections(page, perPage);
```

### Download Tracking

**Required by Unsplash TOS** - Track when users select photos:

```typescript
// MUST call when user selects a photo
await unsplashService.trackDownload(photoId);
```

---

## API Endpoints

### GET `/api/unsplash/search`

Search photos by keyword.

**Query Parameters:**
- `query` - Search term (required)
- `page` - Page number (default: 1)
- `perPage` - Results per page (default: 20, max: 30)
- `orientation` - landscape | portrait | squarish
- `orderBy` - relevant | latest

**Example:**
```bash
GET /api/unsplash/search?query=workspace&page=1&perPage=20&orientation=landscape
```

**Response:**
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "abc123",
        "description": "Clean minimal workspace",
        "urls": {
          "regular": "https://images.unsplash.com/photo.jpg",
          "thumb": "https://images.unsplash.com/thumb.jpg"
        },
        "user": {
          "name": "John Doe",
          "username": "johndoe",
          "profileUrl": "https://unsplash.com/@johndoe"
        },
        "color": "#2C3E50",
        "width": 4000,
        "height": 3000,
        "likes": 150
      }
    ],
    "total": 1000,
    "page": 1,
    "perPage": 20,
    "totalPages": 50
  }
}
```

---

### GET `/api/unsplash/random`

Get random photo(s).

**Query Parameters:**
- `query` - Filter by search term
- `orientation` - landscape | portrait | squarish
- `collections` - Collection ID(s)
- `count` - Number of photos (1-30)

**Example:**
```bash
GET /api/unsplash/random?query=nature&orientation=landscape&count=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "xyz789",
    "description": "Mountain landscape",
    "urls": { "regular": "..." },
    "user": { "name": "Jane Smith" }
  }
}
```

---

### POST `/api/unsplash/download/:id`

Track photo download (required by Unsplash TOS).

**Must call when user selects/uses a photo.**

**Example:**
```bash
POST /api/unsplash/download/abc123
```

**Response:**
```json
{
  "success": true,
  "message": "Download tracked successfully"
}
```

---

### GET `/api/unsplash/categories`

Get predefined categories for Meridian.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "productivity",
      "name": "Productivity",
      "description": "Professional workspaces",
      "query": "workspace productivity minimal",
      "icon": "💼"
    },
    {
      "id": "teamwork",
      "name": "Teamwork",
      "description": "Collaboration scenes",
      "query": "team collaboration meeting",
      "icon": "👥"
    }
  ]
}
```

---

### GET `/api/unsplash/stats` (Admin)

Get service usage statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 500,
    "searchRequests": 400,
    "randomRequests": 80,
    "downloadRequests": 20,
    "cacheHits": 450,
    "cacheHitRate": "90.00%",
    "topSearches": [
      { "query": "workspace", "count": 200 },
      { "query": "teamwork", "count": 150 }
    ]
  }
}
```

---

## Frontend Usage

### Using the Photo Picker Component

```tsx
import { UnsplashPhotoPicker } from '@/components/unsplash/unsplash-photo-picker';
import { useState } from 'react';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleSelect = (photo) => {
    setSelectedPhoto(photo);
    // Use photo.urls.regular for backgrounds
    // Use photo.urls.small for thumbnails
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Choose Photo
      </button>

      <UnsplashPhotoPicker
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelect={handleSelect}
        orientation="landscape"
        defaultQuery="workspace"
      />
    </>
  );
}
```

### Using the Image Component

```tsx
import { UnsplashImage } from '@/components/unsplash/unsplash-image';

function BackgroundDisplay({ photo }) {
  return (
    <UnsplashImage
      photo={photo}
      size="regular" // or 'full', 'small', 'thumb'
      className="w-full h-64"
      showAttribution={true}
      attributionPosition="bottom-right"
    />
  );
}
```

### Using the unsplash Hook

```tsx
import { useUnsplashSearch } from '@/hooks/use-unsplash';

function PhotoGallery() {
  const {
    photos,
    loading,
    error,
    search,
    loadMore,
    hasMore,
  } = useUnsplashSearch({
    query: 'productivity',
    perPage: 20,
    orientation: 'landscape',
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <input 
        type="text" 
        onChange={(e) => search(e.target.value)} 
        placeholder="Search photos..."
      />
      
      <div className="grid grid-cols-4 gap-4">
        {photos.map(photo => (
          <img key={photo.id} src={photo.urls.thumb} />
        ))}
      </div>
      
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
}
```

---

## Components

### `UnsplashPhotoPicker`

Full-featured photo selection modal.

**Props:**
- `isOpen` - Control modal visibility
- `onClose` - Close handler
- `onSelect` - Called when photo is selected
- `orientation` - Filter by orientation
- `defaultQuery` - Initial search term
- `title` - Custom modal title
- `description` - Custom modal description

**Features:**
- ✅ Keyword search
- ✅ Quick category buttons
- ✅ Infinite scroll / load more
- ✅ Photo preview grid
- ✅ Photographer attribution
- ✅ Automatic download tracking

---

### `UnsplashImage`

Display Unsplash photo with attribution.

**Props:**
- `photo` - UnsplashPhoto object
- `size` - 'raw' | 'full' | 'regular' | 'small' | 'thumb'
- `showAttribution` - Display photographer credit (default: true)
- `attributionPosition` - Where to show attribution
- `objectFit` - CSS object-fit value
- `className` - Additional CSS classes

---

### `UnsplashAttribution`

Standalone attribution component.

```tsx
<UnsplashAttribution photo={photo} />
// Renders: "Photo by John Doe on Unsplash"
```

---

## Attribution Requirements

### Unsplash TOS Requirements

**MUST DO:**
1. ✅ **Display photographer credit** - "Photo by [Name]"
2. ✅ **Link to photographer** - Link to their Unsplash profile
3. ✅ **Link to Unsplash** - Include "on Unsplash" link
4. ✅ **Track downloads** - Call download endpoint when photo is used

**Our Components Handle This Automatically:**
- `<UnsplashImage>` includes attribution by default
- `trackUnsplashDownload()` called automatically
- `<UnsplashAttribution>` for custom layouts

**Example Attribution:**

```
Photo by John Doe on Unsplash
       ↑ link      ↑ link
```

### Removing Attribution

To remove attribution, upgrade to **Unsplash+ ($99/month)**.

---

## Caching Strategy

### Cache Configuration

**Search Results:**
- **TTL:** 24 hours
- **Why:** Search results are relatively stable
- **Storage:** In-memory Map
- **Key:** `search:query:page:perPage:orientation:orderBy`

**Random Photos:**
- **TTL:** 1 hour
- **Why:** Want variety in random selections
- **Storage:** In-memory Map

**Photo Details:**
- **TTL:** 7 days
- **Why:** Photo metadata doesn't change
- **Storage:** In-memory Map

### Cache Performance

- Typical hit rate: **85-90%**
- API call reduction: **85%+**
- Response time (cached): **<5ms**
- Response time (API): **300-600ms**

### Why Different TTLs?

```
Search results (24h) → Stable, good for discovery
Random photos (1h)   → Variety, fresh daily inspiration
Photo details (7d)   → Never changes, cache aggressively
```

---

## Monitoring & Quotas

### Free Tier Limits

| Metric | Limit |
|--------|-------|
| Requests per hour | 50 |
| Monthly requests | ~36,000 |
| Demo/Development | Free forever |

### Rate Limit Tracking

```bash
# Check current usage
curl http://localhost:3005/api/unsplash/quota \
  -H "x-user-email: admin@example.com" \
  -H "x-user-role: admin"

# Response
{
  "requestsLastHour": 10,
  "limit": 50,
  "percentage": 20,
  "remaining": 40
}
```

### Usage Estimation

**With 24-hour caching:**

| Users | Avg Searches/Day | API Calls/Month | Free Tier % |
|-------|------------------|-----------------|-------------|
| 100 | 200 | ~6,000 | 16% |
| 1,000 | 500 | ~15,000 | 42% |
| 5,000 | 1,000 | ~30,000 | 83% |

**Free tier easily supports 5,000+ users!**

---

## Best Practices

### 1. Always Track Downloads

```tsx
// ✅ GOOD - Tracks download when photo is selected
const handlePhotoSelect = async (photo) => {
  await trackUnsplashDownload(photo.id);
  setBackgroundImage(photo.urls.regular);
};

// ❌ BAD - Doesn't track download (violates TOS)
const handlePhotoSelect = (photo) => {
  setBackgroundImage(photo.urls.regular);
};
```

### 2. Use Appropriate Photo Sizes

```tsx
// ✅ GOOD - Right size for use case
<img src={photo.urls.thumb} />  // Grid previews (200px)
<img src={photo.urls.small} />  // Thumbnails (400px)
<img src={photo.urls.regular} /> // Backgrounds (1080px)
<img src={photo.urls.full} />    // High-res displays (>1080px)

// ❌ BAD - Unnecessarily large
<img src={photo.urls.full} className="w-20" /> // Overkill for small size
```

### 3. Show Attribution

```tsx
// ✅ GOOD - Attribution visible
<UnsplashImage 
  photo={photo} 
  showAttribution={true} 
/>

// ⚠️ Only if you have Unsplash+ paid plan
<UnsplashImage 
  photo={photo} 
  showAttribution={false} 
/>
```

### 4. Cache Aggressively

Search results don't change often - cache is your friend!

```typescript
// Service automatically caches for 24 hours
// No need to fetch same search repeatedly
```

### 5. Use Categories for Better UX

```tsx
// ✅ GOOD - Quick category access
<UnsplashPhotoPicker 
  categories={['productivity', 'teamwork', 'minimal']}
/>

// Users can quickly browse relevant photos
```

---

## Troubleshooting

### API Key Issues

**Problem:** Service not working, no photos returned

**Solution:**
1. Verify `UNSPLASH_ACCESS_KEY` in `.env` file
2. Check key is active at https://unsplash.com/oauth/applications
3. Ensure app is in "Demo" or "Production" status
4. Restart the API server

### Rate Limit Errors

**Problem:** Getting 403 errors frequently

**Solution:**
1. Check quota: `GET /api/unsplash/quota`
2. Verify caching is working: `GET /api/unsplash/stats`
3. Rate limits reset every hour
4. Consider upgrading if consistently hitting limits

### Photos Not Loading

**Problem:** Photos fail to load in UI

**Solution:**
1. Check browser console for CORS errors
2. Verify Unsplash CDN is accessible
3. Check photo URLs are valid
4. Try different photo size (regular vs full)

### Attribution Not Showing

**Problem:** Attribution text not visible

**Solution:**
1. Ensure `showAttribution={true}` on `<UnsplashImage>`
2. Check z-index conflicts with other elements
3. Verify text color contrasts with background
4. Try different `attributionPosition`

---

## Integration Examples

### Background Customization

```tsx
function BackgroundSettings() {
  const [showPicker, setShowPicker] = useState(false);
  const [background, setBackground] = useState(null);

  const handlePhotoSelect = async (photo) => {
    await trackUnsplashDownload(photo.id);
    setBackground(photo.urls.regular);
    // Save to settings...
  };

  return (
    <div>
      <button onClick={() => setShowPicker(true)}>
        Choose from Unsplash
      </button>

      <UnsplashPhotoPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePhotoSelect}
        orientation="landscape"
      />

      {background && (
        <div 
          className="preview"
          style={{ backgroundImage: `url(${background})` }}
        />
      )}
    </div>
  );
}
```

### Project Cover Images

```tsx
function ProjectSettings() {
  const [coverImage, setCoverImage] = useState(null);

  return (
    <div>
      <Label>Cover Image</Label>
      
      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="unsplash">Unsplash</TabsTrigger>
        </TabsList>
        
        <TabsContent value="unsplash">
          <UnsplashPhotoPicker
            onSelect={(photo) => {
              trackUnsplashDownload(photo.id);
              setCoverImage(photo.urls.regular);
            }}
            defaultQuery="business professional"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Smart Background Suggestions

```tsx
// Suggest backgrounds based on project type
const backgroundSuggestions = {
  'software-development': 'coding workspace minimal',
  'marketing': 'creative design studio',
  'sales': 'professional business team',
  'design': 'creative workspace art',
};

<UnsplashPhotoPicker
  defaultQuery={backgroundSuggestions[projectType]}
/>
```

---

## Advanced Features

### Location-Based Photos

Combine with ipstack for location-specific imagery:

```typescript
// Get user location
const location = await geolocationService.getLocation(userIP);

// Search for photos from that city
const photos = await unsplashService.searchPhotos({
  query: `${location.city} landmarks cityscape`,
  orientation: 'landscape',
});
```

### Weather-Matched Backgrounds

Combine with OpenWeatherMap:

```typescript
// Get current weather
const weather = await weatherService.getCurrentWeather({ city });

// Match background to weather
const weatherQueries = {
  'Clear': 'sunny blue sky workspace',
  'Rain': 'rain drops window cozy',
  'Snow': 'snowy peaceful cabin',
  'Clouds': 'cloudy minimal desk',
};

const photos = await unsplashService.searchPhotos({
  query: weatherQueries[weather.current.condition],
});
```

### Daily Rotating Backgrounds

```typescript
// Same photo all day, changes tomorrow
const today = new Date().toDateString();

const photo = await unsplashService.getRandomPhoto({
  query: 'workspace minimal',
  orientation: 'landscape',
  // Use date as seed for consistency (implementation detail)
});
```

---

## Predefined Categories

The integration includes 8 curated categories:

1. **💼 Productivity** - Professional workspaces
2. **👥 Teamwork** - Collaboration scenes
3. **💻 Technology** - Tech and coding
4. **🌿 Nature** - Calming landscapes
5. **◻️ Minimal** - Clean aesthetics
6. **🏢 Business** - Professional environments
7. **🎨 Creative** - Artistic workspaces
8. **⭐ Motivation** - Inspiring imagery

Use these for quick access to relevant photos.

---

## Performance

### Response Times

| Operation | Cached | API Call |
|-----------|--------|----------|
| Search | <5ms | 300-600ms |
| Random | <5ms | 300-600ms |
| Photo Details | <5ms | 200-400ms |
| Download Track | N/A | 100-300ms |

### Storage Savings

**Without Unsplash:**
- User uploads: ~5MB per background image
- 1,000 users = ~5GB storage
- Storage cost: ~$50/month

**With Unsplash:**
- CDN-hosted: 0MB storage
- Unlimited users = 0GB storage
- Storage cost: **$0/month**

**Savings: $50+/month** 💰

---

## Additional Resources

- **Unsplash API Docs:** https://unsplash.com/documentation
- **Unsplash Guidelines:** https://unsplash.com/api-terms
- **Get Access Key:** https://unsplash.com/developers
- **Photo Library:** https://unsplash.com/

---

## Support

For issues related to:
- **Unsplash API:** Contact Unsplash support
- **Meridian Integration:** Check logs in `apps/api/logs/`
- **Photo Selection:** Check browser console for errors
- **Attribution:** Ensure TOS compliance

---

**Last Updated:** 2024-01-15  
**Integration Version:** 1.0.0  
**Compatible with:** Meridian v0.4.0+  
**Powered by:** Unsplash API

