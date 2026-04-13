// @epic-3.5: Core Team Communication Features - Testing Route
import { createFileRoute } from "@tanstack/react-router";
import { SimpleCommunicationTest } from "@/components/communication/SimpleCommunicationTest";
import LazyDashboardLayout from "@/components/performance/lazy-dashboard-layout";

export const Route = createFileRoute("/dashboard/communication")({
  component: CommunicationTestRoute,
});

function CommunicationTestRoute() {
  return (
    <LazyDashboardLayout>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Communication System</h1>
                      <p className="text-muted-foreground">
              Test and interact with Meridian's real-time communication features
                      </p>
                    </div>
          <SimpleCommunicationTest />
        </div>
      </div>
    </LazyDashboardLayout>
  );
} 