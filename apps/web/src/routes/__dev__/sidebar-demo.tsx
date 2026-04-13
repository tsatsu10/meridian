import { createFileRoute } from '@tanstack/react-router';
import { SidebarDemo } from '@/components/common/sidebar/sidebar-demo';

export const Route = createFileRoute('/__dev__/sidebar-demo')({
  component: SidebarDemo,
});

// Access this demo at: http://localhost:5173/dashboard/sidebar-demo 