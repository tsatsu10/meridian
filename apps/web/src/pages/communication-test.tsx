import React from "react";
import { SimpleCommunicationTest } from "@/components/communication/SimpleCommunicationTest";

export default function CommunicationTestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="container mx-auto max-w-6xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Meridian Communication System Test</h1>
            <p className="text-muted-foreground">
              Test the fixed communication features: Channel creation, Team dropdown, Message persistence, and Quick Actions
            </p>
          </div>
          
          <SimpleCommunicationTest />
          
          <div className="text-center space-y-2 p-4 bg-muted rounded-lg">
            <h2 className="text-lg font-semibold">✅ Issues Fixed</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>• Create channel button now works with real API calls</div>
              <div>• Team dropdown shows real teams from workspace data</div>
              <div>• Messages persist in database (no more vanishing on reload)</div>
              <div>• Quick action buttons provide informative feedback</div>
              <div>• Role-based access control fully implemented</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 