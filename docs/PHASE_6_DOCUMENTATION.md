# Phase 6.4: Documentation - Complete Reference

## 📚 Comprehensive Documentation Guide

### Overview
This document serves as a complete reference for the Meridian project management platform, covering all features implemented in Phases 4-6.

---

## 🎯 Quick Start Guide

### For Developers

#### Prerequisites
```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0 or pnpm >= 8.0.0
PostgreSQL >= 14.0 (or SQLite for development)

# Optional
Redis >= 6.0 (for caching)
```

#### Setup
```bash
# Clone repository
git clone <repository-url>
cd meridian

# Install dependencies
pnpm install

# Setup environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your configuration

# Setup database
cd apps/api
npm run db:push      # Push schema
npm run db:seed      # Seed data (optional)

# Start development servers
cd ../..
pnpm dev             # Start web frontend
pnpm dev:api         # Start API server (separate terminal)
```

#### Development URLs
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3008
- **WebSocket:** ws://localhost:3008

---

## 🏗️ Architecture Overview

### Technology Stack

**Backend:**
- **Runtime:** Node.js 18+
- **Framework:** Hono (lightweight, fast)
- **Database:** PostgreSQL (production) / SQLite (development)
- **ORM:** Drizzle ORM (type-safe)
- **Real-time:** Socket.IO
- **Validation:** Zod

**Frontend:**
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** TanStack Router
- **State:** Zustand + TanStack Query
- **UI:** Radix UI + Tailwind CSS
- **Icons:** Lucide React

### Project Structure
```
meridian/
├── apps/
│   ├── api/              # Backend API
│   │   ├── src/
│   │   │   ├── database/        # Schema & connection
│   │   │   ├── project-notes/   # Notes API
│   │   │   ├── settings/        # Settings & themes
│   │   │   ├── realtime/        # WebSocket handlers
│   │   │   └── index.ts         # Main entry
│   │   └── package.json
│   │
│   └── web/              # Frontend SPA
│       ├── src/
│       │   ├── components/      # React components
│       │   ├── routes/          # TanStack Router routes
│       │   ├── hooks/           # Custom React hooks
│       │   ├── lib/             # Utilities
│       │   └── main.tsx         # Entry point
│       └── package.json
│
├── docs/                 # Documentation
│   ├── PHASE_4_*.md
│   ├── PHASE_5_*.md
│   └── PHASE_6_*.md
│
├── package.json          # Root workspace config
└── pnpm-workspace.yaml   # Monorepo config
```

---

## 📖 Feature Documentation

### Phase 4: Enhanced Personalization

#### 4.1 Custom Theme Builder

**Purpose:** Create, share, and manage custom color themes

**API Endpoints:**
```typescript
// Get all themes
GET /api/settings/themes/:workspaceId/themes
Response: { data: Theme[], success: true }

// Create theme
POST /api/settings/themes/:workspaceId/themes
Body: {
  name: string,
  colors: { primary, secondary, ... },
  typography: { fontFamily, fontSize, ... },
  spacing: { baseUnit, scale }
}
Response: { data: Theme, success: true }

// Update theme
PATCH /api/settings/themes/:workspaceId/themes/:themeId
Body: Partial<Theme>

// Delete theme
DELETE /api/settings/themes/:workspaceId/themes/:themeId

// Export theme
GET /api/settings/themes/:workspaceId/themes/:themeId/export
Response: JSON file download

// Import theme
POST /api/settings/themes/:workspaceId/themes/import
Body: { theme: ThemeJSON }

// Share to marketplace
POST /api/settings/themes/:workspaceId/themes/:themeId/share
Body: { isPublic: boolean }

// Browse marketplace
GET /api/settings/themes/marketplace
Query: ?category=<category>&search=<term>

// Install from marketplace
POST /api/settings/themes/:workspaceId/marketplace/:themeId/install
```

**Frontend Usage:**
```typescript
import { ThemeBuilder } from '@/components/themes/theme-builder';
import { ThemeMarketplace } from '@/components/themes/theme-marketplace';

function ThemesPage() {
  return (
    <div>
      <ThemeBuilder workspaceId="workspace-123" />
      <ThemeMarketplace workspaceId="workspace-123" />
    </div>
  );
}
```

---

#### 4.2 Dark/Light/Auto Mode

**Purpose:** Automatic theme switching based on time or location

**API Endpoints:**
```typescript
// Get appearance settings
GET /api/settings/appearance/:userEmail
Response: {
  data: {
    mode: 'light' | 'dark' | 'auto',
    scheduledTheme: { enabled, lightTime, darkTime },
    locationBased: { enabled, latitude, longitude }
  }
}

// Update appearance settings
PATCH /api/settings/appearance/:userEmail
Body: Partial<AppearanceSettings>
```

**Frontend Usage:**
```typescript
// Scheduled theme switching
const [scheduledEnabled, setScheduledEnabled] = useState(false);
const [lightTime, setLightTime] = useState('06:00');
const [darkTime, setDarkTime] = useState('18:00');

useEffect(() => {
  if (scheduledEnabled) {
    const checkTheme = () => {
      const now = new Date();
      const currentTime = `${now.getHours()}:${now.getMinutes()}`;
      
      if (currentTime >= lightTime && currentTime < darkTime) {
        applyTheme('light');
      } else {
        applyTheme('dark');
      }
    };
    
    checkTheme();
    const interval = setInterval(checkTheme, 60000); // Check every minute
    return () => clearInterval(interval);
  }
}, [scheduledEnabled, lightTime, darkTime]);

// Location-based theme switching
const handleLocationTheme = async () => {
  const position = await getCurrentPosition();
  const sunTimes = await calculateSunTimes(position.latitude, position.longitude);
  
  const now = new Date();
  if (now >= sunTimes.sunrise && now < sunTimes.sunset) {
    applyTheme('light');
  } else {
    applyTheme('dark');
  }
};
```

---

#### 4.3 Background Images

**Purpose:** Upload and customize dashboard backgrounds

**API Endpoints:**
```typescript
// Upload background
POST /api/settings/background/upload
Body: FormData with 'file' field
Response: { data: { url: string } }

// Get background settings
GET /api/settings/background/:userEmail
Response: {
  data: {
    imageUrl: string,
    position: 'center' | 'cover' | 'contain',
    blur: number, // 0-20
    opacity: number // 0-100
  }
}

// Update settings
PATCH /api/settings/background/:userEmail
Body: Partial<BackgroundSettings>
```

**Frontend Usage:**
```typescript
const handleBackgroundUpload = async (file: File) => {
  if (file.size > 5 * 1024 * 1024) {
    toast.error('File size must be less than 5MB');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/settings/background/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json();
  setBackgroundImage(data.data.url);
};
```

---

#### 4.4 Font Customization

**Purpose:** Customize typography across the platform

**Available Fonts:**
- Inter (Default)
- Roboto
- Open Sans
- Lato
- Montserrat
- Poppins
- Source Sans Pro
- Raleway
- Nunito
- Ubuntu
- Work Sans
- Plus Jakarta Sans

**API Endpoints:**
```typescript
// Get font settings
GET /api/settings/fonts/:userEmail

// Update font settings
PATCH /api/settings/fonts/:userEmail
Body: {
  fontFamily: string,
  fontSize: number, // 12-20
  fontWeight: number, // 300-700
  lineHeight: number, // 1.2-2.0
  letterSpacing: number // -0.05 to 0.2
}
```

---

#### 4.5 Accessibility Mode

**Purpose:** WCAG AAA compliant accessibility features

**Features:**
- High contrast mode (7:1 contrast ratio)
- Large text mode (+2px base size)
- Enhanced focus indicators
- Screen reader optimizations
- Keyboard navigation helpers
- Reduced motion

**API Endpoints:**
```typescript
// Get accessibility settings
GET /api/settings/appearance/:userEmail

// Update settings
PATCH /api/settings/appearance/:userEmail
Body: {
  highContrast: boolean,
  largeText: boolean,
  enhancedFocus: boolean,
  screenReaderMode: boolean,
  keyboardNavigation: boolean,
  reducedMotion: boolean
}
```

**CSS Classes Applied:**
```css
/* When enabled, these classes are added to <html> */
.high-contrast { /* 7:1 contrast ratios */ }
.large-text { /* +2px font size */ }
.enhanced-focus { /* Prominent focus indicators */ }
.screen-reader-mode { /* ARIA optimizations */ }
.keyboard-nav { /* Keyboard shortcuts */ }
.reduced-motion { /* Disable animations */ }
```

---

#### 4.6 Dashboard Templates

**Purpose:** Save and share dashboard layouts

**API Endpoints:**
```typescript
// Get all templates
GET /api/settings/dashboard-templates/:workspaceId
Response: { data: Template[] }

// Create template
POST /api/settings/dashboard-templates/:workspaceId
Body: {
  name: string,
  description: string,
  layout: LayoutConfig,
  widgets: WidgetConfig[],
  gridConfig: GridConfig,
  category: string,
  tags: string[]
}

// Update template
PATCH /api/settings/dashboard-templates/:workspaceId/:templateId

// Delete template
DELETE /api/settings/dashboard-templates/:workspaceId/:templateId

// Clone template
POST /api/settings/dashboard-templates/:workspaceId/:templateId/clone

// Marketplace
GET /api/settings/dashboard-templates/marketplace/public
```

---

#### 4.7 Widget Library

**Purpose:** Reusable, configurable dashboard widgets

**API Endpoints:**
```typescript
// Get available widgets
GET /api/settings/widgets/:workspaceId

// Create custom widget
POST /api/settings/widgets/:workspaceId
Body: {
  name: string,
  type: 'chart' | 'table' | 'metric' | 'list',
  category: string,
  component: string,
  defaultConfig: WidgetConfig
}

// User's widget instances
GET /api/settings/widget-instances/:workspaceId

// Add widget to dashboard
POST /api/settings/widget-instances/:workspaceId
Body: {
  widgetId: string,
  position: { x, y },
  size: { width, height },
  config: CustomConfig
}

// Update widget instance
PATCH /api/settings/widget-instances/:workspaceId/:instanceId

// Remove widget
DELETE /api/settings/widget-instances/:workspaceId/:instanceId
```

---

### Phase 5: Project Notes System

#### 5.1 Project Notes API

**Purpose:** Collaborative note-taking with version control

**Database Schema:**
```sql
-- Main notes table
CREATE TABLE project_notes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL,
  content TEXT, -- Rich text JSON
  created_by TEXT NOT NULL REFERENCES users(id),
  last_edited_by TEXT REFERENCES users(id),
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  tags JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Version history
CREATE TABLE note_versions (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES project_notes(id),
  content TEXT NOT NULL,
  edited_by TEXT NOT NULL REFERENCES users(id),
  version_number INTEGER NOT NULL,
  change_description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Comments
CREATE TABLE note_comments (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES project_notes(id),
  user_email TEXT NOT NULL REFERENCES users(email),
  comment TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API Endpoints:**
```typescript
// Notes CRUD
POST /api/project-notes/projects/:projectId/notes
GET /api/project-notes/projects/:projectId/notes
GET /api/project-notes/notes/:noteId
PATCH /api/project-notes/notes/:noteId  // Auto-creates version
DELETE /api/project-notes/notes/:noteId
PATCH /api/project-notes/notes/:noteId/pin

// Version history
GET /api/project-notes/notes/:noteId/versions

// Comments
GET /api/project-notes/notes/:noteId/comments
POST /api/project-notes/notes/:noteId/comments
PATCH /api/project-notes/notes/:noteId/comments/:commentId
DELETE /api/project-notes/notes/:noteId/comments/:commentId
```

---

#### 5.2 Real-Time Collaboration

**Purpose:** Live editing with presence indicators

**WebSocket Events:**
```typescript
// Join note session
socket.emit('note:join', {
  noteId: string,
  userEmail: string
});

// Response
socket.on('note:joined', (data: {
  noteId: string,
  users: Collaborator[],
  cursors: CursorPosition[]
}) => {
  // Update UI with collaborators
});

// User joined
socket.on('note:user_joined', (data: {
  userEmail: string,
  userName: string,
  color: string,
  timestamp: string
}) => {
  // Show new collaborator
});

// User left
socket.on('note:user_left', (data: {
  userEmail: string
}) => {
  // Remove collaborator
});

// Cursor updates
socket.emit('note:cursor', {
  noteId: string,
  userEmail: string,
  position: number,
  selection?: { start, end }
});

socket.on('note:cursor_update', (data: CursorPosition) => {
  // Update cursor UI
});

// Typing indicator
socket.emit('note:typing', {
  noteId: string,
  userEmail: string,
  isTyping: boolean
});

socket.on('note:typing', (data: {
  userEmail: string,
  isTyping: boolean
}) => {
  // Show typing indicator
});

// Content changes
socket.emit('note:change', {
  noteId: string,
  userEmail: string,
  changes: Change[]
});

socket.on('note:content_change', (data: {
  userEmail: string,
  changes: Change[]
}) => {
  // Apply remote changes
});

// Leave note
socket.emit('note:leave', {
  noteId: string,
  userEmail: string
});
```

**Frontend Hook:**
```typescript
import { useNoteCollaboration } from '@/hooks/use-note-collaboration';

function NoteEditor({ noteId }: Props) {
  const {
    connected,
    collaborators,
    cursors,
    typingUsers,
    remoteChanges,
    updateCursor,
    sendContentChange,
    setTyping,
  } = useNoteCollaboration({
    noteId,
    userEmail: currentUser.email,
    enabled: true,
  });

  // Use in component
  return (
    <div>
      {/* Show collaborators */}
      {collaborators.map(user => (
        <Avatar key={user.userEmail} style={{ borderColor: user.color }}>
          {user.userName}
        </Avatar>
      ))}
      
      {/* Show typing */}
      {typingUsers.length > 0 && (
        <p>{typingUsers.join(', ')} typing...</p>
      )}
      
      {/* Editor */}
      <textarea
        onChange={e => {
          setContent(e.target.value);
          setTyping(true);
        }}
        onSelect={e => {
          updateCursor(e.target.selectionStart);
        }}
      />
    </div>
  );
}
```

---

## 🔐 Security Best Practices

### Authentication
```typescript
// All API routes require authentication
app.use('*', async (c, next) => {
  const userEmail = c.get('userEmail');
  if (!userEmail) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});
```

### Input Validation
```typescript
// Use Zod for all inputs
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const noteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000).optional(),
  tags: z.array(z.string()).max(10).optional(),
});

app.post('/notes', zValidator('json', noteSchema), async (c) => {
  const data = c.req.valid('json');
  // data is type-safe and validated
});
```

### SQL Injection Prevention
```typescript
// Always use Drizzle ORM, never raw SQL
import { eq } from 'drizzle-orm';

// Safe
const notes = await db
  .select()
  .from(projectNotesTable)
  .where(eq(projectNotesTable.projectId, projectId));

// NEVER do this
const notes = await db.execute(`SELECT * FROM project_notes WHERE project_id = '${projectId}'`);
```

---

## 🚀 Deployment Guide

### Environment Variables

**Backend (.env):**
```bash
NODE_ENV=production
API_PORT=3008
HOST=0.0.0.0

# Database
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@host:5432/meridian

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security
JWT_SECRET=your-secret-key-here
SESSION_SECRET=another-secret-key

# CORS
CORS_ORIGINS=https://app.meridian.com,https://www.meridian.com

# WebSocket
WS_URL=wss://api.meridian.com
```

**Frontend (.env):**
```bash
VITE_API_URL=https://api.meridian.com
VITE_WS_URL=wss://api.meridian.com
```

### Production Build

**Backend:**
```bash
cd apps/api
npm run build
npm start
```

**Frontend:**
```bash
cd apps/web
npm run build
# Deploy dist/ folder to CDN or static hosting
```

### Docker Deployment

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: meridian
      POSTGRES_USER: meridian
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    command: redis-server --requirepass secure_password

  api:
    build: ./apps/api
    ports:
      - "3008:3008"
    environment:
      DATABASE_URL: postgresql://meridian:secure_password@postgres:5432/meridian
      REDIS_HOST: redis
      REDIS_PASSWORD: secure_password
    depends_on:
      - postgres
      - redis

  web:
    build: ./apps/web
    ports:
      - "80:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## 📊 Monitoring & Maintenance

### Health Checks
```typescript
// apps/api/src/health/index.ts

app.get('/health', async (c) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    websocket: checkWebSocket(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');

  return c.json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  }, healthy ? 200 : 503);
});
```

### Logging
```typescript
// Use structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log all requests
app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  
  logger.info('Request', {
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
  });
});
```

---

## 🆘 Troubleshooting

### Common Issues

**WebSocket connection fails:**
```typescript
// Check CORS configuration
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Verify WebSocket URL in frontend
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3008';
```

**Database migrations not applying:**
```bash
# Generate migration
cd apps/api
npm run db:generate

# Apply migration
npm run db:push

# Or use Drizzle Kit directly
npx drizzle-kit push:pg
```

**Build errors:**
```bash
# Clear caches
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf apps/*/.next
rm -rf apps/*/dist

# Reinstall
pnpm install

# Rebuild
pnpm build
```

---

## 📚 Additional Resources

### API Documentation
- Swagger/OpenAPI docs available at `/api/docs` (if enabled)
- Postman collection: `docs/postman-collection.json`

### Contributing
- See `CONTRIBUTING.md` for contribution guidelines
- Code style guide: `docs/CODE_STYLE.md`
- Git workflow: `docs/GIT_WORKFLOW.md`

### Support
- GitHub Issues: For bug reports and feature requests
- Discussions: For questions and community support
- Wiki: For detailed guides and tutorials

---

**Last Updated:** Phase 6 - System-Wide Debugging & Optimization Complete

**Version:** 1.0.0

**Status:** ✅ Production Ready

