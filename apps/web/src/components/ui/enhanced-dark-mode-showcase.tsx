import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';

export const EnhancedDarkModeShowcase = () => {
  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* Hero Section with Gradient Text */}
      <div className="text-center space-y-4 mb-12">
        <h1 className="text-5xl font-bold gradient-purple">
          Enhanced Dark Mode
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Experience the sophisticated dark mode inspired by modern design trends with glass-morphism effects and rich purple gradients.
        </p>
      </div>

      {/* Glass Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Glass Card Example */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="gradient-text">Glass Morphism</CardTitle>
            <CardDescription>
              Cards with backdrop blur and translucent backgrounds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Elegant glass-morphism effect with subtle borders and shadows.
            </p>
            <Button variant="default" className="w-full">
              Explore Feature
            </Button>
          </CardContent>
        </Card>

        {/* Elevated Card */}
        <Card className="elevation-3 bg-card-elevated">
          <CardHeader>
            <CardTitle>Elevated Surface</CardTitle>
            <CardDescription>
              Enhanced depth with sophisticated shadows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Badge variant="secondary">Design</Badge>
              <Badge variant="outline">Development</Badge>
              <p className="text-sm">
                Multi-layered shadow system for visual hierarchy.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Card */}
        <Card className="glass-card hover:elevation-4 transition-all duration-300">
          <CardHeader>
            <CardTitle>Interactive Elements</CardTitle>
            <CardDescription>
              Hover effects and micro-interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button variant="default" className="w-full">
                Primary Action
              </Button>
              <Button variant="outline" className="w-full">
                Secondary Action
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
        {/* Color Palette */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Enhanced Color Palette</CardTitle>
            <CardDescription>
              Sophisticated purple-based dark mode colors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-primary"></div>
                <p className="text-xs text-center">Primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-secondary"></div>
                <p className="text-xs text-center">Secondary</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-accent"></div>
                <p className="text-xs text-center">Accent</p>
              </div>
              <div className="space-y-2">
                <div className="h-16 rounded-lg bg-muted"></div>
                <p className="text-xs text-center">Muted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Animation Showcase */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Smooth Animations</CardTitle>
            <CardDescription>
              Fluid transitions and micro-interactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="default" 
                  className="transform hover:scale-105 transition-all duration-200"
                >
                  Hover Me
                </Button>
                <Button 
                  variant="outline" 
                  className="hover:shadow-lg hover:shadow-primary/25 transition-all duration-300"
                >
                  Shadow Effect
                </Button>
              </div>
              <div className="p-4 rounded-lg border border-border hover:border-border-hover transition-colors duration-200">
                <p className="text-sm">Hover to see border animation</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Glass Navigation Example */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Glass Navigation Components</CardTitle>
          <CardDescription>
            Navigation elements with backdrop blur effects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['Dashboard', 'Projects', 'Tasks', 'Teams', 'Settings'].map((item) => (
              <Button
                key={item}
                variant="ghost"
                className="glass hover:bg-accent-hover transition-all duration-200"
              >
                {item}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg glass-card text-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
          <p className="text-sm font-medium">Active</p>
        </div>
        <div className="p-4 rounded-lg glass-card text-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mx-auto mb-2"></div>
          <p className="text-sm font-medium">Pending</p>
        </div>
        <div className="p-4 rounded-lg glass-card text-center">
          <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2"></div>
          <p className="text-sm font-medium">In Progress</p>
        </div>
        <div className="p-4 rounded-lg glass-card text-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mx-auto mb-2"></div>
          <p className="text-sm font-medium">Blocked</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedDarkModeShowcase; 