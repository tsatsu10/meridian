# Magic UI Integration

This directory contains Magic UI components integrated into the Meridian project management system.

## Components Integrated

### BlurFade
- **Purpose**: Smooth entrance animations with blur effect
- **Usage**: Wraps components that need smooth entry animations
- **Props**:
  - `delay`: Animation delay in seconds
  - `duration`: Animation duration  
  - `yOffset`: Y-axis movement distance
  - `inView`: Whether to trigger on scroll into view
  - `blur`: Blur amount during animation

### Usage Examples

```typescript
// Basic fade in animation
<BlurFade delay={0.1} inView>
  <div>Content that fades in</div>
</BlurFade>

// Staggered animations
{items.map((item, index) => (
  <BlurFade key={item.id} delay={0.05 * index} inView>
    <ItemComponent item={item} />
  </BlurFade>
))}
```

## Where It's Used

### ChatSidebar
- Channel list items with staggered delays
- Search and filter controls
- Create channel button

### ChatMessageArea  
- Header elements with smooth entrance
- Message search functionality
- Empty states and loading indicators

### ChatInfoSidebar
- Channel information sections
- Team member lists with presence indicators
- Quick action buttons

## Animations Pattern

The project uses a consistent animation pattern:
- **0.05s**: Very quick stagger delays between list items
- **0.1s**: Standard component entrance delay
- **0.2s**: Larger section entrance delay
- **0.3s**: Final elements that should appear last

## Dependencies

- `framer-motion`: Core animation library
- Requires proper TypeScript configuration for UseInViewOptions

## Performance Notes

- Animations use `once: true` to prevent re-triggering
- BlurFade components are optimized for performance
- Delays are kept minimal to maintain responsiveness 