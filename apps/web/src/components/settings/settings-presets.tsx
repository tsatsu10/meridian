import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/store/settings";
import { SETTINGS_PRESETS, POPULAR_PRESETS, SettingsPreset } from "@/store/settings-presets";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Check, 
  Eye, 
  Users, 
  Star,
  Zap,
  ChevronRight,
  Settings
} from "lucide-react";
import { cn } from "@/lib/cn";

// Icon wrappers
const SparklesIcon = Sparkles as React.FC<{ className?: string }>;
const CheckIcon = Check as React.FC<{ className?: string }>;
const EyeIcon = Eye as React.FC<{ className?: string }>;
const UsersIcon = Users as React.FC<{ className?: string }>;
const StarIcon = Star as React.FC<{ className?: string }>;
const ZapIcon = Zap as React.FC<{ className?: string }>;
const ChevronRightIcon = ChevronRight as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;

interface SettingsPresetsProps {
  onPresetApplied?: () => void;
}

export function SettingsPresets({ onPresetApplied }: SettingsPresetsProps) {
  const { applyPreset, getAppliedPreset, isLoading } = useSettingsStore();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showAllPresets, setShowAllPresets] = useState(false);
  const appliedPreset = getAppliedPreset();

  const handleApplyPreset = async (presetId: string) => {
    await applyPreset(presetId);
    setSelectedPreset(null);
    onPresetApplied?.();
  };

  const presetsToShow = showAllPresets ? SETTINGS_PRESETS : POPULAR_PRESETS;

  const PresetCard = ({ preset, isSelected, isApplied }: { 
    preset: SettingsPreset; 
    isSelected: boolean;
    isApplied: boolean;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200",
        isSelected 
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" 
          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600",
        isApplied && "ring-2 ring-green-500/50"
      )}
      onClick={() => setSelectedPreset(isSelected ? null : preset.id)}
    >
      {/* Applied indicator */}
      {isApplied && (
        <div className="absolute -top-2 -right-2 p-1 bg-green-500 rounded-full">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Popular badge */}
      {preset.popular && (
        <div className="absolute -top-2 -left-2">
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-xs">
            <StarIcon className="w-3 h-3" />
            Popular
          </Badge>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="text-2xl">{preset.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
              {preset.name}
            </h3>
            {isApplied && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
            {preset.description}
          </p>
          <div className="text-xs text-zinc-400 dark:text-zinc-500">
            {preset.persona}
          </div>
        </div>
        <ChevronRightIcon 
          className={cn(
            "w-4 h-4 text-zinc-400 transition-transform",
            isSelected && "rotate-90"
          )} 
        />
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700"
          >
            <div className="space-y-3">
              {/* Preview key settings */}
              <div>
                <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Key Settings Preview
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {preset.settings.appearance && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Theme:</span>
                      <span className="capitalize">{preset.settings.appearance.theme}</span>
                    </div>
                  )}
                  {preset.settings.appearance && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Density:</span>
                      <span className="capitalize">{preset.settings.appearance.density}</span>
                    </div>
                  )}
                  {preset.settings.notifications && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Email alerts:</span>
                      <span>{preset.settings.notifications.soundEnabled ? "On" : "Off"}</span>
                    </div>
                  )}
                  {preset.settings.security && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">2FA:</span>
                      <span>{preset.settings.security.twoFactorEnabled ? "Enabled" : "Disabled"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplyPreset(preset.id);
                  }}
                  disabled={isLoading || isApplied}
                  className="flex-1"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isApplied ? (
                    <>
                      <CheckIcon className="w-4 h-4 mr-1" />
                      Applied
                    </>
                  ) : (
                    <>
                      <ZapIcon className="w-4 h-4 mr-1" />
                      Apply Preset
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Implement preset preview
                  }}
                >
                  <EyeIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <SparklesIcon className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Quick Setup Presets
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Apply optimized settings based on your role and preferences
            </p>
          </div>
        </div>

        {/* Applied preset indicator */}
        {appliedPreset && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div className="text-lg">{appliedPreset.icon}</div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  {appliedPreset.name} preset is active
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Your settings have been optimized for {appliedPreset.persona.toLowerCase()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Presets grid */}
        <div className="space-y-3">
          {presetsToShow.map((preset, index) => (
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PresetCard
                preset={preset}
                isSelected={selectedPreset === preset.id}
                isApplied={appliedPreset?.id === preset.id}
              />
            </motion.div>
          ))}
        </div>

        {/* Show more/less toggle */}
        <div className="mt-6 text-center">
          <Button
            variant="ghost"
            onClick={() => setShowAllPresets(!showAllPresets)}
            className="gap-2"
          >
            <UsersIcon className="w-4 h-4" />
            {showAllPresets ? "Show Popular Only" : `Show All ${SETTINGS_PRESETS.length} Presets`}
          </Button>
        </div>

        {/* Custom preset hint */}
        <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="flex items-start gap-3">
            <SettingsIcon className="w-4 h-4 text-zinc-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Need something different?
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You can always customize individual settings after applying a preset. 
                Your changes will be auto-saved and the preset indicator will be cleared.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 