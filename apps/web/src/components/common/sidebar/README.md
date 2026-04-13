# 🎨 Modern Sidebar System

The greatest sidebar of all time for modern web applications. Combines Apple-level polish, Tesla-like minimalism, and Uber's functional clarity.

## ✨ Features

### 🎭 **Design Excellence**
- **Apple-level Polish**: Refined animations, perfect spacing, premium feel
- **Tesla Minimalism**: Clean, distraction-free interface
- **Uber Functionality**: Clear hierarchy, intuitive interactions

### 🚀 **Core Features**
- ✅ **Dual States**: Open (full) and closed (icon-only) modes
- ✅ **Smooth Animations**: Spring-based transitions with Framer Motion
- ✅ **Responsive Design**: Perfect on desktop and mobile
- ✅ **Smart Tooltips**: Context-aware positioning with delays
- ✅ **Nested Menus**: Expandable submenus with smooth reveals
- ✅ **Badge System**: Notification counts and status indicators
- ✅ **Active States**: Visual feedback for current page/section
- ✅ **Search Integration**: Built-in search with real-time filtering
- ✅ **User Profile**: Avatar, status, and quick actions

### ♿ **Accessibility (WCAG 2.2 AA)**
- ✅ **Keyboard Navigation**: Full tab, arrow key, and enter/space support
- ✅ **Screen Reader**: Semantic HTML with proper ARIA labels
- ✅ **Focus Management**: Visible focus indicators and logical flow
- ✅ **High Contrast**: Color combinations meeting AA standards
- ✅ **Motion Respect**: Honors `prefers-reduced-motion`

### 📱 **Mobile Excellence**
- ✅ **Touch-First**: Optimized for touch interactions
- ✅ **Overlay Mode**: Full-screen sidebar on mobile
- ✅ **Auto-Close**: Closes after navigation on mobile
- ✅ **Gesture Support**: Swipe to close (can be added)

## 🛠 Installation & Setup

### 1. Dependencies

```bash
npm install framer-motion lucide-react
# or
yarn add framer-motion lucide-react
```

### 2. Import Components

```tsx
import { ModernSidebar } from '@/components/common/sidebar/modern-sidebar';
import { SidebarDemo } from '@/components/common/sidebar/sidebar-demo'; // For testing
```

### 3. Basic Usage

```tsx
import React, { useState } from 'react';
import { ModernSidebar } from './modern-sidebar';
import { Home, Settings, Users } from 'lucide-react';

const App = () => {
  const [isOpen, setIsOpen] = useState(true);

  const sections = [
    {
      id: 'main',
      items: [
        {
          id: 'home',
          label: 'Dashboard',
          icon: Home,
          href: '/dashboard',
          isActive: true,
        },
        {
          id: 'users',
          label: 'Users',
          icon: Users,
          href: '/users',
          badge: 5,
        }
      ]
    },
    {
      id: 'settings',
      title: 'Administration',
      items: [
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          href: '/settings',
        }
      ]
    }
  ];

  return (
    <div className="h-screen flex">
      <ModernSidebar
        sections={sections}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        userName="John Doe"
        userEmail="john@company.com"
      />
      <main className="flex-1 p-8">
        {/* Your app content */}
      </main>
    </div>
  );
};
```

## 📚 API Reference

### ModernSidebar Props

```tsx
interface ModernSidebarProps {
  sections: SidebarSection[];
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  userAvatar?: string;
  userName?: string;
  userEmail?: string;
}
```

### SidebarSection

```tsx
interface SidebarSection {
  id: string;
  title?: string; // Optional section header
  items: SidebarItem[];
}
```

### SidebarItem

```tsx
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: string | number;
  children?: SidebarItem[]; // For nested menus
  isActive?: boolean;
  onClick?: () => void;
}
```

## 🎨 Customization

### Theme Colors

The sidebar uses CSS variables for easy theming:

```css
:root {
  --sidebar-bg: linear-gradient(135deg, #1f2937 0%, #111827 50%, #0f172a 100%);
  --sidebar-border: rgba(55, 65, 81, 0.5);
  --sidebar-text: #d1d5db;
  --sidebar-text-active: #ffffff;
  --sidebar-accent: #3b82f6;
  --sidebar-accent-secondary: #8b5cf6;
  --sidebar-hover: rgba(255, 255, 255, 0.1);
}
```

### Animation Timing

Customize animation speeds in the component:

```tsx
const sidebarVariants = {
  closed: {
    width: "4rem",
    transition: {
      type: "spring",
      stiffness: 300, // Adjust for speed
      damping: 30     // Adjust for smoothness
    }
  }
};
```

## 🔧 Advanced Features

### 1. Search Integration

```tsx
const [searchQuery, setSearchQuery] = useState("");
const [filteredSections, setFilteredSections] = useState(sections);

useEffect(() => {
  if (!searchQuery) {
    setFilteredSections(sections);
    return;
  }

  const filtered = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  setFilteredSections(filtered);
}, [searchQuery, sections]);
```

### 2. Dynamic Badge Updates

```tsx
const updateBadge = (itemId: string, count: number) => {
  setSections(prev => prev.map(section => ({
    ...section,
    items: section.items.map(item =>
      item.id === itemId ? { ...item, badge: count } : item
    )
  })));
};
```

### 3. Custom Tooltips

```tsx
<NavigationItem
  item={{
    ...item,
    tooltip: {
      content: "Custom tooltip content",
      position: "right",
      delay: 500
    }
  }}
/>
```

## 🧪 Testing

### Unit Tests

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ModernSidebar } from './modern-sidebar';

test('toggles sidebar state', () => {
  const onToggle = jest.fn();
  render(
    <ModernSidebar
      sections={[]}
      isOpen={true}
      onToggle={onToggle}
    />
  );
  
  const toggleButton = screen.getByLabelText(/close sidebar/i);
  fireEvent.click(toggleButton);
  
  expect(onToggle).toHaveBeenCalled();
});
```

### Accessibility Tests

```tsx
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('has no accessibility violations', async () => {
  const { container } = render(<ModernSidebar {...props} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## 🎯 Performance

### Optimization Tips

1. **Lazy Load Icons**: Use dynamic imports for large icon sets
2. **Virtualization**: For sidebars with 100+ items
3. **Memoization**: Wrap sections in `useMemo` for expensive computations
4. **Animation Budget**: Limit concurrent animations to 3-4

```tsx
const sections = useMemo(() => generateSections(), [dependencies]);

const NavigationItemMemo = React.memo(NavigationItem);
```

## 🚀 Best Practices

### 1. Content Organization

```tsx
// ✅ Good: Logical grouping
const sections = [
  { id: 'primary', items: ['Dashboard', 'Projects'] },
  { id: 'workspace', title: 'Workspace', items: ['Teams', 'Calendar'] },
  { id: 'admin', title: 'Administration', items: ['Settings', 'Users'] }
];

// ❌ Avoid: Flat structure with 10+ items
```

### 2. Badge Usage

```tsx
// ✅ Good: Meaningful counts
badge: unreadCount > 0 ? unreadCount : undefined

// ❌ Avoid: Decorative badges
badge: "New!" // Use design elements instead
```

### 3. Responsive Breakpoints

```tsx
// ✅ Good: Conditional rendering
{isMobile ? <MobileNavigation /> : <DesktopSidebar />}

// ✅ Good: CSS-based responsive
@media (max-width: 768px) { /* mobile styles */ }
```

## 🎨 Design Tokens

### Spacing System

```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 0.75rem;   /* 12px */
--space-lg: 1rem;      /* 16px */
--space-xl: 1.5rem;    /* 24px */
--space-2xl: 2rem;     /* 32px */
```

### Typography Scale

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
```

### Animation Curves

```css
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0.0, 1, 1);
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

## 🔄 Migration Guide

### From v1 to v2

```tsx
// v1 (Old)
<Sidebar items={flatItems} />

// v2 (New)
<ModernSidebar 
  sections={[{ id: 'main', items: groupedItems }]}
  isOpen={isOpen}
  onToggle={onToggle}
/>
```

## 📦 Related Components

- **Navigation**: For breadcrumbs and pagination
- **Command Palette**: For quick navigation (Cmd+K)
- **User Menu**: Dropdown with user actions
- **Mobile Navigation**: Bottom tab bar for mobile

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Ensure accessibility compliance
5. Test on multiple devices

---

**Made with ❤️ for the best user experience possible.** 