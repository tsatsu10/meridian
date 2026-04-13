import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore } from "@/store/settings";
import { SettingsAPI, SettingsExport, SettingsImport, SettingsValidationError } from "@/lib/api/settings-api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  Upload, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  X,
  Eye,
  Settings,
  FileJson,
  Table,
  Code
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

// Icon wrappers
const DownloadIcon = Download as React.FC<{ className?: string }>;
const UploadIcon = Upload as React.FC<{ className?: string }>;
const FileTextIcon = FileText as React.FC<{ className?: string }>;
const AlertTriangleIcon = AlertTriangle as React.FC<{ className?: string }>;
const CheckCircleIcon = CheckCircle as React.FC<{ className?: string }>;
const InfoIcon = Info as React.FC<{ className?: string }>;
const XIcon = X as React.FC<{ className?: string }>;
const EyeIcon = Eye as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const FileJsonIcon = FileJson as React.FC<{ className?: string }>;
const TableIcon = Table as React.FC<{ className?: string }>;
const CodeIcon = Code as React.FC<{ className?: string }>;

interface SettingsImportExportProps {
  userId: string;
}

export function SettingsImportExport({ userId }: SettingsImportExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<SettingsValidationError[]>([]);
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "yaml">("json");
  const [importFormat, setImportFormat] = useState<"json" | "csv" | "yaml">("json");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { settings } = useSettingsStore();

  const formatOptions = [
    {
      value: "json",
      label: "JSON",
      description: "JavaScript Object Notation - most compatible",
      icon: FileJsonIcon,
      mimeType: "application/json",
      extension: ".json"
    },
    {
      value: "csv",
      label: "CSV",
      description: "Comma Separated Values - spreadsheet compatible",
      icon: TableIcon,
      mimeType: "text/csv",
      extension: ".csv"
    },
    {
      value: "yaml",
      label: "YAML",
      description: "Human-readable data serialization",
      icon: CodeIcon,
      mimeType: "text/yaml",
      extension: ".yaml"
    }
  ];

  const sectionOptions = [
    { value: "profile", label: "Profile", description: "Personal information and preferences" },
    { value: "appearance", label: "Appearance", description: "Theme, layout, and visual settings" },
    { value: "notifications", label: "Notifications", description: "Email, push, and in-app notifications" },
    { value: "security", label: "Security", description: "2FA, login, and security preferences" },
    { value: "privacy", label: "Privacy", description: "Data sharing and visibility settings" },
  ];

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const exportOptions: SettingsExport = {
        format: exportFormat,
        sections: selectedSections.length > 0 ? selectedSections as any : undefined,
        includeMetadata: true,
        compressed: false,
      };

      const result = await SettingsAPI.exportSettings(userId, exportOptions);
      
      // Create and download file
      const blob = new Blob([result.data], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Settings exported successfully as ${result.filename}`);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export settings");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportPreview(null);
      setImportWarnings([]);
      setImportErrors([]);
      
      // Auto-detect format from file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === "json") setImportFormat("json");
      else if (extension === "csv") setImportFormat("csv");
      else if (extension === "yaml" || extension === "yml") setImportFormat("yaml");
    }
  };

  // Preview import
  const handlePreviewImport = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    
    try {
      const importOptions: SettingsImport = {
        data: importFile,
        format: importFormat,
        preview: true,
      };

      const result = await SettingsAPI.importSettings(userId, importOptions);
      
      setImportPreview(result.preview);
      setImportWarnings(result.warnings || []);
      setImportErrors(result.errors || []);
      setShowPreview(true);
      
      if (result.errors && result.errors.length > 0) {
        toast.error(`Found ${result.errors.length} validation errors`);
      } else {
        toast.success("Import preview generated successfully");
      }
    } catch (error) {
      console.error("Preview failed:", error);
      toast.error("Failed to preview import");
    } finally {
      setIsImporting(false);
    }
  };

  // Confirm import
  const handleConfirmImport = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    
    try {
      const importOptions: SettingsImport = {
        data: importFile,
        format: importFormat,
        overwrite: true,
        preview: false,
      };

      const result = await SettingsAPI.importSettings(userId, importOptions);
      
      if (result.imported) {
        // Refresh settings store
        window.location.reload(); // Simple refresh for now
        toast.success("Settings imported successfully");
      }
      
      setShowPreview(false);
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Failed to import settings");
    } finally {
      setIsImporting(false);
    }
  };

  // Toggle section selection
  const toggleSection = (section: string) => {
    setSelectedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-5 h-5 text-indigo-500" />
          <div>
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Import & Export Settings
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Backup your settings or import configurations from files
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Export Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2">
              <DownloadIcon className="w-4 h-4 text-green-500" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                Export Settings
              </h3>
            </div>

            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                Export Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {formatOptions.map((format) => (
                  <button
                    key={format.value}
                    onClick={() => setExportFormat(format.value as any)}
                    className={cn(
                      "p-3 border rounded-lg text-left transition-all",
                      exportFormat === format.value
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <format.icon className="w-4 h-4" />
                      <span className="font-medium text-sm">{format.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {format.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Section Selection */}
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                Sections to Export (optional)
              </label>
              <div className="space-y-2">
                {sectionOptions.map((section) => (
                  <label
                    key={section.value}
                    className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.value)}
                      onChange={() => toggleSection(section.value)}
                      className="rounded border-zinc-300 dark:border-zinc-600"
                    />
                    <div>
                      <div className="font-medium text-sm">{section.label}</div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {section.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {selectedSections.length === 0 && (
                <p className="text-xs text-zinc-400 mt-2">
                  Leave empty to export all sections
                </p>
              )}
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full gap-2"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <DownloadIcon className="w-4 h-4" />
              )}
              Export Settings
            </Button>
          </motion.div>

          {/* Import Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2">
              <UploadIcon className="w-4 h-4 text-blue-500" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                Import Settings
              </h3>
            </div>

            {/* File Upload */}
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                Choose File
              </label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
                  importFile
                    ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                    : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-500"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv,.yaml,.yml"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {importFile ? (
                  <div className="space-y-2">
                    <FileTextIcon className="w-8 h-8 text-green-500 mx-auto" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">
                        {importFile.name}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {(importFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadIcon className="w-8 h-8 text-zinc-400 mx-auto" />
                    <div>
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">
                        Drop files here or click to browse
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Supports JSON, CSV, and YAML formats
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Format Selection for Import */}
            {importFile && (
              <div>
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block">
                  File Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {formatOptions.map((format) => (
                    <button
                      key={format.value}
                      onClick={() => setImportFormat(format.value as any)}
                      className={cn(
                        "p-2 border rounded text-center transition-all",
                        importFormat === format.value
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                          : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300"
                      )}
                    >
                      <format.icon className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs font-medium">{format.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Import Actions */}
            {importFile && (
              <div className="space-y-3">
                <Button
                  onClick={handlePreviewImport}
                  disabled={isImporting}
                  variant="outline"
                  className="w-full gap-2"
                >
                  {isImporting ? (
                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                  Preview Import
                </Button>

                {showPreview && (
                  <Button
                    onClick={handleConfirmImport}
                    disabled={isImporting || importErrors.length > 0}
                    className="w-full gap-2"
                  >
                    {isImporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircleIcon className="w-4 h-4" />
                    )}
                    Confirm Import
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </div>

        {/* Import Preview */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 border-t border-zinc-200 dark:border-zinc-700 pt-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  Import Preview
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(false)}
                >
                  <XIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Validation Results */}
              {(importErrors.length > 0 || importWarnings.length > 0) && (
                <div className="space-y-3 mb-6">
                  {importErrors.length > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangleIcon className="w-4 h-4 text-red-500" />
                        <span className="font-medium text-red-700 dark:text-red-300">
                          {importErrors.length} Validation Error(s)
                        </span>
                      </div>
                      <div className="space-y-1">
                        {importErrors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 dark:text-red-400">
                            <span className="font-medium">{error.field}:</span> {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {importWarnings.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <InfoIcon className="w-4 h-4 text-amber-500" />
                        <span className="font-medium text-amber-700 dark:text-amber-300">
                          {importWarnings.length} Warning(s)
                        </span>
                      </div>
                      <div className="space-y-1">
                        {importWarnings.map((warning, index) => (
                          <div key={index} className="text-sm text-amber-600 dark:text-amber-400">
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Content */}
              {importPreview && (
                <div className="space-y-4">
                  <h4 className="font-medium text-zinc-700 dark:text-zinc-300">
                    Settings to be imported:
                  </h4>
                  {Object.entries(importPreview).map(([section, data]) => (
                    <div key={section} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{section}</Badge>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          {Object.keys(data as object).length} setting(s)
                        </span>
                      </div>
                      <pre className="text-xs text-zinc-600 dark:text-zinc-400 overflow-x-auto">
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 