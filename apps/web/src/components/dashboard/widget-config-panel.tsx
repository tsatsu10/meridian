/**
 * ⚙️ Widget Configuration Panel
 * 
 * Allows users to customize widget settings and data filters
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface WidgetConfigPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgetId: string | null;
  widgetName: string;
  currentConfig: any;
  configSchema: any;
  onSave: (config: any) => void;
}

export function WidgetConfigPanel({
  open,
  onOpenChange,
  widgetId,
  widgetName,
  currentConfig,
  configSchema,
  onSave,
}: WidgetConfigPanelProps) {
  const [config, setConfig] = useState(currentConfig || {});
  const [isDirty, setIsDirty] = useState(false);
  
  useEffect(() => {
    setConfig(currentConfig || {});
    setIsDirty(false);
  }, [currentConfig, widgetId]);
  
  const handleConfigChange = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };
  
  const handleSave = () => {
    onSave(config);
    setIsDirty(false);
    onOpenChange(false);
    toast.success("Widget configuration saved!");
  };
  
  const handleReset = () => {
    setConfig(currentConfig || {});
    setIsDirty(false);
  };
  
  // Render config field based on schema
  const renderConfigField = (key: string, schema: any) => {
    const value = config[key];
    
    switch (schema.type) {
      case "boolean":
        return (
          <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor={key} className="font-medium">{schema.label || key}</Label>
              {schema.description && (
                <p className="text-sm text-muted-foreground mt-1">{schema.description}</p>
              )}
            </div>
            <Switch
              id={key}
              checked={value ?? schema.default ?? false}
              onCheckedChange={(checked) => handleConfigChange(key, checked)}
            />
          </div>
        );
      
      case "number":
        return (
          <div key={key} className="space-y-3">
            <Label htmlFor={key} className="font-medium">{schema.label || key}</Label>
            {schema.description && (
              <p className="text-sm text-muted-foreground">{schema.description}</p>
            )}
            <div className="flex items-center gap-4">
              <Slider
                id={key}
                min={schema.minimum || 0}
                max={schema.maximum || 100}
                step={schema.step || 1}
                value={[value ?? schema.default ?? 0]}
                onValueChange={([val]) => handleConfigChange(key, val)}
                className="flex-1"
              />
              <Input
                type="number"
                value={value ?? schema.default ?? 0}
                onChange={(e) => handleConfigChange(key, parseInt(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        );
      
      case "string":
        if (schema.enum) {
          return (
            <div key={key} className="space-y-2">
              <Label htmlFor={key} className="font-medium">{schema.label || key}</Label>
              {schema.description && (
                <p className="text-sm text-muted-foreground">{schema.description}</p>
              )}
              <Select value={value || schema.default} onValueChange={(val) => handleConfigChange(key, val)}>
                <SelectTrigger id={key}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {schema.enum.map((option: string) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="font-medium">{schema.label || key}</Label>
            {schema.description && (
              <p className="text-sm text-muted-foreground">{schema.description}</p>
            )}
            <Input
              id={key}
              value={value || schema.default || ""}
              onChange={(e) => handleConfigChange(key, e.target.value)}
              placeholder={schema.placeholder}
            />
          </div>
        );
      
      case "array":
        return (
          <div key={key} className="space-y-2">
            <Label className="font-medium">{schema.label || key}</Label>
            {schema.description && (
              <p className="text-sm text-muted-foreground">{schema.description}</p>
            )}
            <div className="p-3 border rounded-lg bg-muted/30">
              <code className="text-xs">{JSON.stringify(value || schema.default || [], null, 2)}</code>
            </div>
          </div>
        );
      
      default:
        return (
          <div key={key} className="space-y-2">
            <Label htmlFor={key} className="font-medium">{key}</Label>
            <Input
              id={key}
              value={JSON.stringify(value || "")}
              onChange={(e) => {
                try {
                  handleConfigChange(key, JSON.parse(e.target.value));
                } catch {
                  handleConfigChange(key, e.target.value);
                }
              }}
            />
          </div>
        );
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configure: {widgetName}
          </DialogTitle>
          <DialogDescription>
            Customize widget settings and display options
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-6 mt-6">
            {configSchema?.properties ? (
              Object.entries(configSchema.properties).map(([key, schema]: [string, any]) => (
                renderConfigField(key, schema)
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No configuration options available</p>
                <p className="text-sm">This widget uses default settings</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-6 mt-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Raw Configuration (JSON)</h3>
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleReset} disabled={!isDirty}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!isDirty}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

