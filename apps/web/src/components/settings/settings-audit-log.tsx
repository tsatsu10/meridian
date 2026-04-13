import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SettingsAPI } from "@/lib/api/settings-api";
import type { SettingsAuditLog } from "@/lib/api/settings-api";
import type { AllSettings } from "@/store/settings";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Clock, 
  User, 
  Filter, 
  Download, 
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Settings,
  RotateCcw,
  Upload,
  Zap,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

// Icon wrappers
const ClockIcon = Clock as React.FC<{ className?: string }>;
const UserIcon = User as React.FC<{ className?: string }>;
const FilterIcon = Filter as React.FC<{ className?: string }>;
const DownloadIcon = Download as React.FC<{ className?: string }>;
const SearchIcon = Search as React.FC<{ className?: string }>;
const ChevronLeftIcon = ChevronLeft as React.FC<{ className?: string }>;
const ChevronRightIcon = ChevronRight as React.FC<{ className?: string }>;
const CalendarIcon = Calendar as React.FC<{ className?: string }>;
const SettingsIcon = Settings as React.FC<{ className?: string }>;
const RotateCcwIcon = RotateCcw as React.FC<{ className?: string }>;
const UploadIcon = Upload as React.FC<{ className?: string }>;
const ZapIcon = Zap as React.FC<{ className?: string }>;
const AlertCircleIcon = AlertCircle as React.FC<{ className?: string }>;

interface SettingsAuditLogProps {
  userId: string;
}

interface AuditFilters {
  action?: SettingsAuditLog["action"];
  section?: keyof AllSettings;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export function SettingsAuditLog({ userId }: SettingsAuditLogProps) {
  const [logs, setLogs] = useState<SettingsAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [selectedLog, setSelectedLog] = useState<SettingsAuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  const logsPerPage = 20;

  const actionIcons = {
    UPDATE: SettingsIcon,
    RESET: RotateCcwIcon,
    PRESET_APPLIED: ZapIcon,
    IMPORT: UploadIcon,
    EXPORT: DownloadIcon,
  };

  const actionColors = {
    UPDATE: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    RESET: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
    PRESET_APPLIED: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    IMPORT: "text-green-600 bg-green-50 dark:bg-green-900/20",
    EXPORT: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
  };

  // Load audit logs
  const loadLogs = async (page = 1) => {
    setIsLoading(true);
    
    try {
      const result = await SettingsAPI.getAuditLogs(userId, {
        limit: logsPerPage,
        offset: (page - 1) * logsPerPage,
        ...filters,
      });
      
      setLogs(result.logs);
      setTotalLogs(result.total);
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
      toast.error("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadLogs(1);
  }, [userId, filters]);

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  // Export audit logs
  const handleExport = async () => {
    try {
      const result = await SettingsAPI.getAuditLogs(userId, {
        limit: 10000, // Large limit for export
        ...filters,
      });
      
      const csvContent = [
        // Header
        'Timestamp,Action,Section,User,IP,User Agent,Changes',
        // Data rows
        ...result.logs.map(log => [
          log.metadata.timestamp,
          log.action,
          log.section || 'All',
          log.userId,
          log.metadata.ip,
          `"${log.metadata.userAgent}"`,
          `"${JSON.stringify(log.changes).replace(/"/g, '""')}"`,
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `settings-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Audit log exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export audit log');
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  // Get change summary
  const getChangeSummary = (changes: SettingsAuditLog["changes"]) => {
    const changeCount = Object.keys(changes).length;
    const fields = Object.keys(changes).slice(0, 3);
    
    if (changeCount === 0) return "No changes";
    
    let summary = fields.join(", ");
    if (changeCount > 3) {
      summary += ` and ${changeCount - 3} more`;
    }
    
    return summary;
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-5 h-5 text-indigo-500" />
            <div>
              <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Settings Audit Log
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Track all changes to your settings for compliance and security
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <FilterIcon className="w-4 h-4" />
              Filters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Action
                  </label>
                  <select
                    value={filters.action || ""}
                    onChange={(e) => handleFilterChange("action", e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="">All Actions</option>
                    <option value="UPDATE">Update</option>
                    <option value="RESET">Reset</option>
                    <option value="PRESET_APPLIED">Preset Applied</option>
                    <option value="IMPORT">Import</option>
                    <option value="EXPORT">Export</option>
                  </select>
                </div>

                {/* Section Filter */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Section
                  </label>
                  <select
                    value={filters.section || ""}
                    onChange={(e) => handleFilterChange("section", e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                  >
                    <option value="">All Sections</option>
                    <option value="profile">Profile</option>
                    <option value="appearance">Appearance</option>
                    <option value="notifications">Notifications</option>
                    <option value="security">Security</option>
                    <option value="privacy">Privacy</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="relative flex-1 max-w-md">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search changes..."
                    value={filters.searchTerm || ""}
                    onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-sm"
                  />
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <RotateCcwIcon className="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary */}
        <div className="mb-6 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">
              Showing {logs.length} of {totalLogs} audit log entries
            </span>
            <span className="text-zinc-500 dark:text-zinc-500">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircleIcon className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                No audit logs found
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400">
                {Object.keys(filters).length > 0 ? "Try adjusting your filters" : "No settings changes have been logged yet"}
              </p>
            </div>
          ) : (
            logs.map((log, index) => {
              const ActionIcon = actionIcons[log.action];
              const timestamp = formatTimestamp(log.metadata.timestamp);
              const changeSummary = getChangeSummary(log.changes);
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg cursor-pointer transition-all",
                    "hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm",
                    selectedLog?.id === log.id && "ring-2 ring-indigo-500/50 border-indigo-500"
                  )}
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                      actionColors[log.action]
                    )}>
                      <ActionIcon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", actionColors[log.action])}
                        >
                          {log.action.replace('_', ' ')}
                        </Badge>
                        
                        {log.section && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {log.section}
                          </Badge>
                        )}
                        
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {timestamp.date} at {timestamp.time}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <UserIcon className="w-3 h-3 text-zinc-400" />
                        <span className="text-zinc-600 dark:text-zinc-400">
                          {log.userId}
                        </span>
                        <span className="text-zinc-400">•</span>
                        <span className="text-zinc-500 dark:text-zinc-500 truncate">
                          {changeSummary}
                        </span>
                      </div>
                    </div>
                    
                    <ChevronRightIcon className={cn(
                      "w-4 h-4 text-zinc-400 transition-transform",
                      selectedLog?.id === log.id && "rotate-90"
                    )} />
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {selectedLog?.id === log.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                              Session Details
                            </h4>
                            <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                              <div>IP: {log.metadata.ip}</div>
                              <div>Session: {log.metadata.sessionId}</div>
                              <div>Browser: {log.metadata.userAgent.split(' ')[0]}</div>
                            </div>
                          </div>
                          
                          {Object.keys(log.changes).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Changes Made
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(log.changes).map(([field, change]) => (
                                  <div key={field} className="text-xs">
                                    <div className="font-medium text-zinc-600 dark:text-zinc-400">
                                      {field}:
                                    </div>
                                    <div className="pl-2 space-y-1">
                                      <div className="text-red-600 dark:text-red-400">
                                        From: {JSON.stringify(change.from)}
                                      </div>
                                      <div className="text-green-600 dark:text-green-400">
                                        To: {JSON.stringify(change.to)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLogs(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="gap-2"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    onClick={() => loadLogs(page)}
                    disabled={isLoading}
                  >
                    {page}
                  </Button>
                );
              })}
              
              {totalPages > 5 && (
                <>
                  <span className="text-zinc-400">...</span>
                  <Button
                    variant={currentPage === totalPages ? "default" : "ghost"}
                    size="sm"
                    onClick={() => loadLogs(totalPages)}
                    disabled={isLoading}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadLogs(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="gap-2"
            >
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 