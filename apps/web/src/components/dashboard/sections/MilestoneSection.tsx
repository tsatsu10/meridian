import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Target } from "lucide-react";
import MilestoneDashboard from "@/components/dashboard/milestone-dashboard";

export default function MilestoneSection() {
  return (
    <Card className="bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Project Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MilestoneDashboard
          variant="compact"
          showProjectFilter={false}
        />
      </CardContent>
    </Card>
  );
}