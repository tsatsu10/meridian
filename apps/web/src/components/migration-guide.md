# Meridian Design System Migration Guide

## Overview

This guide helps you migrate from basic UI components to the enhanced Meridian design system components. The new system provides persona-aware styling, improved accessibility, and enhanced visual design.

## Quick Migration Reference

### Card Components

**Before:**
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

<Card className="p-6">
  <CardHeader>
    <CardTitle>Project Overview</CardTitle>
    <CardDescription>Project details and metrics</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Footer actions */}
  </CardFooter>
</Card>
```

**After:**
```tsx
import { MeridianCard, MeridianCardHeader, MeridianCardTitle, MeridianCardDescription, MeridianCardContent, MeridianCardFooter } from '@/components/ui/meridian-card';

<MeridianCard variant="elevated" size="lg" persona="pm">
  <MeridianCardHeader>
    <MeridianCardTitle>Project Overview</MeridianCardTitle>
    <MeridianCardDescription>Project details and metrics</MeridianCardDescription>
  </MeridianCardHeader>
  <MeridianCardContent>
    {/* Content */}
  </MeridianCardContent>
  <MeridianCardFooter variant="split">
    {/* Footer actions */}
  </MeridianCardFooter>
</MeridianCard>
```

**Benefits:**
- Persona-aware styling that adapts to user roles
- Enhanced variants (elevated, glass, gradient)
- Improved interactive states
- Professional shadow system
- Better responsive behavior

### Button Components

**Before:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="default">
  Create Project
</Button>
```

**After:**
```tsx
import { MeridianButton } from '@/components/ui/meridian-button';

<MeridianButton 
  variant="primary" 
  size="lg" 
  persona="pm"
  leftIcon={<Plus className="h-4 w-4" />}
  loading={isCreating}
  loadingText="Creating..."
>
  Create Project
</MeridianButton>
```

**Benefits:**
- Enhanced variants (gradient, glass, success, warning, error)
- Built-in loading states with custom text
- Left/right icon support
- Persona theming
- Improved hover and focus states
- Ripple effects

### Badge Components

**Before:**
```tsx
import { Badge } from '@/components/ui/badge';

<Badge variant="default">Active</Badge>
<Badge variant="destructive">Error</Badge>
```

**After:**
```tsx
import { MeridianBadge, StatusBadge, PriorityBadge, RoleBadge } from '@/components/ui/meridian-badge';

<StatusBadge status="active" />
<PriorityBadge priority="high" />
<RoleBadge role="admin" persona="pm" />

// Or custom badges
<MeridianBadge 
  variant="gradient" 
  size="md" 
  persona="pm"
  dot
  interactive
  closeable
  onClose={() => handleRemove()}
>
  Custom Badge
</MeridianBadge>
```

**Benefits:**
- Specialized badge types for common use cases
- Interactive badges with hover effects
- Closeable badges
- Status dots and icons
- Persona-aware coloring

### Form Components

**Before:**
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    type="email" 
    placeholder="Enter email"
  />
</div>
```

**After:**
```tsx
import { MeridianFormField, MeridianFormLabel, MeridianFormInput } from '@/components/ui/meridian-form';

<MeridianFormField error="Email is required">
  <MeridianFormLabel variant="required">Email</MeridianFormLabel>
  <MeridianFormInput
    type="email"
    placeholder="Enter email"
    leftIcon={<Mail className="h-4 w-4" />}
    variant="glass"
    loading={isValidating}
  />
</MeridianFormField>
```

**Benefits:**
- Integrated validation states and messages
- Built-in icon support
- Glass effect variants
- Loading states for async validation
- Password visibility toggle
- Better accessibility

## Layout Migration

### Page Structure

**Before:**
```tsx
<div className="container mx-auto p-8">
  <div className="mb-8">
    <h1 className="text-3xl font-bold">Dashboard</h1>
    <p className="text-gray-600">Welcome to your dashboard</p>
  </div>
  <div className="space-y-6">
    {/* Content */}
  </div>
</div>
```

**After:**
```tsx
import { MeridianPage, MeridianPageHeader, MeridianPageContent, MeridianSection } from '@/components/ui/meridian-layout';

<MeridianPage persona="pm" variant="default">
  <MeridianPageHeader
    title="Dashboard"
    description="Welcome to your dashboard"
    actions={
      <MeridianButton variant="primary">
        Add Project
      </MeridianButton>
    }
    breadcrumbs={[
      { label: 'Home', href: '/' },
      { label: 'Dashboard' }
    ]}
  />
  <MeridianPageContent>
    <MeridianSection title="Recent Projects">
      {/* Content */}
    </MeridianSection>
  </MeridianPageContent>
</MeridianPage>
```

**Benefits:**
- Consistent page structure
- Built-in breadcrumb support
- Persona-aware styling
- Responsive design
- Proper semantic HTML

### Grid Layouts

**Before:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <div key={item.id}>
      {/* Item content */}
    </div>
  ))}
</div>
```

**After:**
```tsx
import { MeridianGrid } from '@/components/ui/meridian-layout';

<MeridianGrid cols={3} gap="lg">
  {items.map(item => (
    <MeridianCard key={item.id} variant="elevated" interactive>
      {/* Item content */}
    </MeridianCard>
  ))}
</MeridianGrid>
```

**Benefits:**
- Responsive by default
- Consistent spacing
- Auto-fit options
- Better mobile behavior

## Data Display Migration

### Tables

**Before:**
```tsx
<table className="w-full">
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {data.map(row => (
      <tr key={row.id}>
        <td>{row.name}</td>
        <td>{row.status}</td>
        <td>
          <Button size="sm">Edit</Button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**After:**
```tsx
import { MeridianDataTable } from '@/components/ui/meridian-data-table';

<MeridianDataTable
  data={data}
  columns={[
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      filterable: true
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />
    }
  ]}
  actions={[
    {
      label: 'Edit',
      icon: <Edit className="h-4 w-4" />,
      onClick: (row) => handleEdit(row)
    }
  ]}
  searchable
  pagination={{
    page: 1,
    pageSize: 10,
    total: 100,
    onPageChange: handlePageChange,
    onPageSizeChange: handlePageSizeChange
  }}
  persona="pm"
/>
```

**Benefits:**
- Built-in sorting and filtering
- Search functionality
- Pagination controls
- Action buttons
- Row selection
- Responsive design
- Loading states

## Persona Integration

### Adding Persona Awareness

All Meridian components support persona theming. Here's how to integrate it:

```tsx
// Component level
<MeridianCard persona="pm">
  <MeridianCardContent>
    <MeridianButton variant="primary" persona="pm">
      PM Action
    </MeridianButton>
  </MeridianCardContent>
</MeridianCard>

// Page level
<MeridianPage persona="exec">
  {/* All child components inherit exec styling */}
</MeridianPage>

// Context-based (recommended)
import { PersonaProvider } from '@/contexts/persona-context';

<PersonaProvider persona="tl">
  <App />
</PersonaProvider>
```

### Persona-Specific Layouts

```tsx
import { PMLayout, ExecutiveLayout, TeamLeadLayout, DeveloperLayout, DesignerLayout } from '@/components/ui/meridian-layout';

// Automatic persona styling and layout optimization
<PMLayout 
  title="Project Dashboard"
  description="Manage your projects efficiently"
  actions={<CreateProjectButton />}
>
  <ProjectGrid />
</PMLayout>
```

## Styling Migration

### CSS Classes

The new design system introduces utility classes:

**Colors:**
- `text-meridian-primary` → Primary brand color
- `bg-meridian-success` → Success background
- `border-meridian-error` → Error border

**Shadows:**
- `shadow-meridian-sm` → Small shadow
- `shadow-meridian-lg` → Large shadow
- `shadow-primary` → Colored shadow

**Glass Effects:**
- `glass-light` → Light glass effect
- `glass-card-light` → Glass card styling

**Typography:**
- `text-h1` through `text-h6` → Heading styles
- `text-caption` → Small caption text
- `text-overline` → Overline text

### Component Variants

Each component now supports multiple variants:

```tsx
// Card variants
<MeridianCard variant="default" />      // Standard card
<MeridianCard variant="elevated" />     // Enhanced shadow
<MeridianCard variant="glass" />        // Glass morphism
<MeridianCard variant="gradient" />     // Gradient background

// Button variants  
<MeridianButton variant="primary" />    // Primary action
<MeridianButton variant="success" />    // Success action
<MeridianButton variant="gradient" />   // Gradient styling
<MeridianButton variant="glass" />      // Glass effect

// Form variants
<MeridianFormInput variant="default" /> // Standard input
<MeridianFormInput variant="glass" />   // Glass effect input
<MeridianFormInput variant="error" />   // Error state
```

## Performance Considerations

### Bundle Size
The new components are tree-shakeable. Import only what you need:

```tsx
// Good - imports only what's needed
import { MeridianCard } from '@/components/ui/meridian-card';

// Avoid - imports entire library
import * from '@/components/ui';
```

### Animation Performance
Animations use CSS transforms for better performance:

```tsx
<MeridianCard 
  interactive 
  className="transform-gpu" // Enable GPU acceleration
>
  Content
</MeridianCard>
```

## Accessibility Improvements

The new components include enhanced accessibility:

- **Keyboard Navigation**: All interactive components support keyboard navigation
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Improved focus indicators and management
- **Color Contrast**: WCAG 2.1 AA compliant color combinations

## Common Migration Issues

### 1. Class Name Conflicts
**Issue**: Existing Tailwind classes conflict with new design system
**Solution**: Use component variants instead of custom classes

```tsx
// Before
<Card className="shadow-lg bg-blue-50 border-blue-200">

// After  
<MeridianCard variant="primary" size="lg">
```

### 2. Event Handler Changes
**Issue**: Some event handlers have changed signatures
**Solution**: Update handler signatures

```tsx
// Before
<Button onClick={(e) => handleClick(e)}>

// After
<MeridianButton onClick={handleClick}>
```

### 3. Missing Variants
**Issue**: Custom styling not available in new components
**Solution**: Request new variants or use escape hatch

```tsx
<MeridianCard 
  variant="default"
  className="custom-override" // Escape hatch for one-off styling
>
```

## Testing Migration

### Component Testing
```tsx
import { render, screen } from '@testing-library/react';
import { MeridianButton } from '@/components/ui/meridian-button';

test('button renders with persona styling', () => {
  render(
    <MeridianButton variant="primary" persona="pm">
      Click me
    </MeridianButton>
  );
  
  expect(screen.getByRole('button')).toHaveAttribute('data-persona', 'pm');
});
```

### Visual Regression Testing
Use tools like Chromatic or Percy to catch visual changes during migration.

## Gradual Migration Strategy

1. **Phase 1**: Migrate core components (buttons, cards, forms)
2. **Phase 2**: Update layout components and page structures  
3. **Phase 3**: Add persona theming throughout the application
4. **Phase 4**: Enhance with advanced features (animations, glass effects)

## Support and Resources

- **Component Documentation**: See individual component files for detailed APIs
- **Design Tokens**: `/src/styles/meridian-light-mode.css`
- **Examples**: `/src/components/examples/meridian-component-showcase.tsx`
- **Types**: `/src/components/ui/types.ts`

## Rollback Plan

If issues arise, you can gradually rollback:

1. Keep old components alongside new ones
2. Use feature flags to toggle between systems
3. Migrate page by page rather than all at once

```tsx
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { Card } from '@/components/ui/card'; // Old
import { MeridianCard } from '@/components/ui/meridian-card'; // New

const MyComponent = () => {
  const useMeridianDesign = useFeatureFlag('meridian-design-system');
  
  return useMeridianDesign ? (
    <MeridianCard variant="elevated">New Design</MeridianCard>
  ) : (
    <Card>Old Design</Card>
  );
};
``` 