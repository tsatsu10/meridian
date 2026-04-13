import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/mobile-performance')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/mobile-performance"!</div>
}
