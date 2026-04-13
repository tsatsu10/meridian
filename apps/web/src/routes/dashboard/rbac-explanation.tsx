/**
 * 🛡️ RBAC System Explanation
 * 
 * Explains how role permissions work in the current system structure
 * and how department integration would enhance it.
 */

import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  FolderOpen, 
  CheckSquare, 
  Users, 
  ArrowRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";

export const Route = createFileRoute("/dashboard/rbac-explanation")({
  component: RBACExplanationPage,
});

function RBACExplanationPage() {
  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          🛡️ RBAC System: Current vs Full Integration
        </h1>
        <p className="text-muted-foreground">
          Understanding how role-based permissions work in your current system structure.
        </p>
      </div>

      {/* Current System Structure */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Current System Structure
          </CardTitle>
          <CardDescription>
            Your app currently operates on a 3-tier hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-600">
              <Building className="h-5 w-5" />
              <span className="font-semibold">Workspace</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 text-green-600">
              <FolderOpen className="h-5 w-5" />
              <span className="font-semibold">Projects</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 text-orange-600">
              <CheckSquare className="h-5 w-5" />
              <span className="font-semibold">Tasks</span>
            </div>
          </div>
          
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Workspace Level</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Workspace managers (Alice Admin)</li>
                <li>• Global settings and user management</li>
                <li>• Cross-project analytics</li>
                <li>• Billing and subscriptions</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Project Level</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Project managers scope</li>
                <li>• Project-specific permissions</li>
                <li>• Team assignments per project</li>
                <li>• File sharing within projects</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-orange-600">Task Level</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Individual task permissions</li>
                <li>• Team lead subtask powers</li>
                <li>• Assignment and status updates</li>
                <li>• Time tracking per task</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How Permissions Work Currently */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            How Permission Differences Work Now
          </CardTitle>
          <CardDescription>
            Same role, different access based on project assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Project Manager Example */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Badge variant="secondary">project-manager</Badge>
                Example: How Two Project Managers Differ
              </h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="font-medium text-blue-600">Jennifer Williams</div>
                  <div className="text-sm text-muted-foreground">Assigned to: Web App, Mobile App</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Can manage Web App project
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Can manage Mobile App project
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Cannot access API project
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-blue-600">Mike Manager</div>
                  <div className="text-sm text-muted-foreground">Assigned to: API, Infrastructure</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Can manage API project
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Can manage Infrastructure project
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Cannot access Web App project
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Lead Example */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Badge variant="secondary">team-lead</Badge>
                Example: How Two Team Leads Differ
              </h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="font-medium text-purple-600">Lisa Rodriguez</div>
                  <div className="text-sm text-muted-foreground">Projects: Design System, UX Research</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-yellow-600" />
                      Can create subtasks in Design projects
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Can manage design team members
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Cannot access engineering projects
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-purple-600">Tom Leadership</div>
                  <div className="text-sm text-muted-foreground">Projects: API, Infrastructure</div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-yellow-600" />
                      Can create subtasks in Engineering projects
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      Can manage engineering team members
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-red-500" />
                      Cannot access design projects
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Department Integration Option */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-blue-600" />
            Option: Full Department Integration
          </CardTitle>
          <CardDescription>
            How adding departments would enhance the permission system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Enhanced Hierarchy */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold mb-3 text-blue-800">Enhanced 4-Tier Hierarchy</h4>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <Building className="h-5 w-5" />
                  <span className="font-semibold">Workspace</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 text-purple-600">
                  <Users className="h-5 w-5" />
                  <span className="font-semibold">Departments</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 text-green-600">
                  <FolderOpen className="h-5 w-5" />
                  <span className="font-semibold">Projects</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2 text-orange-600">
                  <CheckSquare className="h-5 w-5" />
                  <span className="font-semibold">Tasks</span>
                </div>
              </div>
            </div>

            {/* Department Benefits */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-semibold text-green-600">✅ Benefits of Departments</h4>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Clear Hierarchy:</strong> Sarah heads Product dept, David heads Engineering</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Team Organization:</strong> Groups projects by business function</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Budget Control:</strong> Department-level budget management</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <span><strong>Analytics:</strong> Department performance metrics</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-orange-600">⚠️ Current Workarounds</h4>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <span><strong>Project-based scope:</strong> Using project assignments instead</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <span><strong>Manual organization:</strong> Grouping projects by naming</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                    <span><strong>Role confusion:</strong> Department heads act like project managers</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Recommendations</CardTitle>
          <CardDescription>
            Choose your approach based on business needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">Option 1: Keep Current (Simpler)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Use project-based permissions</li>
                <li>• Remove department-head role</li>
                <li>• Simplify to: workspace → projects → tasks</li>
                <li>• Clear and straightforward</li>
              </ul>
              <Button variant="outline" className="mt-3 w-full">
                Simplify System
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">Option 2: Add Department UI (Enhanced)</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Create department management pages</li>
                <li>• Add department navigation</li>
                <li>• Implement department analytics</li>
                <li>• Full organizational structure</li>
              </ul>
              <Button className="mt-3 w-full">
                Implement Departments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">🔑 Key Takeaway</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700">
            <strong>Same roles CAN have different permissions</strong> - this is correct RBAC design! 
            The difference comes from <strong>scope assignments</strong> (which projects/departments users can access), 
            not from the base role permissions themselves.
          </p>
          <div className="mt-4 p-3 bg-blue-100 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Current State:</strong> Your system uses project-based scoping. 
              Lisa and Tom (both team-leads) have different project assignments, 
              so they appear to have different permissions - this is intentional and secure!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RBACExplanationPage;