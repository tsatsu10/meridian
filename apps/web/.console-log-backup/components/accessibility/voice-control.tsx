import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

interface VoiceCommand {
  command: string;
  description: string;
  action: () => void;
  aliases?: string[];
}

interface TranscriptEntry {
  id: string;
  text: string;
  timestamp: Date;
  recognized: boolean;
  action?: string;
}

// Speech recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function VoiceControl() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isBrowserSupported, setIsBrowserSupported] = useState(true);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentCommand, setCurrentCommand] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Define voice commands
  const commands: VoiceCommand[] = [
    {
      command: "go to dashboard",
      description: "Navigate to the main dashboard",
      action: () => {
        window.location.href = "/dashboard";
        speak("Navigating to dashboard");
      },
      aliases: ["open dashboard", "show dashboard"],
    },
    {
      command: "go to tasks",
      description: "Navigate to tasks page",
      action: () => {
        window.location.href = "/tasks";
        speak("Opening tasks");
      },
      aliases: ["open tasks", "show tasks"],
    },
    {
      command: "go to projects",
      description: "Navigate to projects page",
      action: () => {
        window.location.href = "/projects";
        speak("Opening projects");
      },
      aliases: ["open projects", "show projects"],
    },
    {
      command: "create task",
      description: "Open task creation dialog",
      action: () => {
        // Trigger task creation
        speak("Opening task creation");
        toast.success("Task Creation", {
          description: "Task creation dialog would open here",
        });
      },
      aliases: ["new task", "add task"],
    },
    {
      command: "search",
      description: "Focus on search input",
      action: () => {
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          speak("Search activated");
        }
      },
      aliases: ["find", "look for"],
    },
    {
      command: "help",
      description: "Show available commands",
      action: () => {
        speak("Here are the available commands: " + commands.map(c => c.command).join(", "));
      },
      aliases: ["show commands", "what can you do"],
    },
    {
      command: "stop listening",
      description: "Stop voice recognition",
      action: () => {
        stopListening();
        speak("Voice control stopped");
      },
      aliases: ["stop", "pause"],
    },
  ];

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const supported = !!SpeechRecognition && "speechSynthesis" in window;
    setIsBrowserSupported(supported);

    if (supported && !recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        console.log("Voice recognition started");
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log("Voice recognition ended");
        // Auto-restart if enabled
        if (isEnabled) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              console.error("Failed to restart recognition:", error);
            }
          }, 100);
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        const transcriptText = lastResult[0].transcript.toLowerCase().trim();
        
        setCurrentCommand(transcriptText);

        if (lastResult.isFinal) {
          console.log("Final transcript:", transcriptText);
          processCommand(transcriptText);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Microphone Access Denied", {
            description: "Please allow microphone access to use voice control",
          });
          setIsEnabled(false);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isEnabled]);

  // Text-to-speech function
  const speak = useCallback((text: string) => {
    if (synthRef.current && isEnabled) {
      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      synthRef.current.speak(utterance);
    }
  }, [isEnabled]);

  // Process voice commands
  const processCommand = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    
    // Find matching command
    const matchedCommand = commands.find(cmd => {
      const allCommands = [cmd.command, ...(cmd.aliases || [])];
      return allCommands.some(c => lowerText.includes(c));
    });

    const entry: TranscriptEntry = {
      id: Date.now().toString(),
      text: text,
      timestamp: new Date(),
      recognized: !!matchedCommand,
      action: matchedCommand?.command,
    };

    setTranscript(prev => [entry, ...prev].slice(0, 50)); // Keep last 50

    if (matchedCommand) {
      console.log("Executing command:", matchedCommand.command);
      matchedCommand.action();
    } else {
      speak("Command not recognized. Say 'help' for available commands.");
    }

    setCurrentCommand("");
  }, [commands, speak]);

  // Start listening
  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        speak("Voice control activated");
        toast.success("Voice Control Active", {
          description: "Say 'help' to hear available commands",
        });
      } catch (error) {
        console.error("Failed to start recognition:", error);
      }
    }
  }, [isListening, speak]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsEnabled(false);
    }
  }, [isListening]);

  // Toggle voice control
  const toggleVoiceControl = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (enabled) {
      startListening();
    } else {
      stopListening();
    }
  }, [startListening, stopListening]);

  if (!isBrowserSupported) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MicOff className="h-5 w-5 text-red-600" />
            Voice Control Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-900 dark:text-red-200">
              <strong>Browser Not Supported:</strong> Your browser does not support the Web Speech API.
              Please use a modern browser like Chrome, Edge, or Safari to access voice control features.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {isListening ? (
              <Mic className="h-5 w-5 text-green-600 animate-pulse" aria-hidden="true" />
            ) : (
              <MicOff className="h-5 w-5 text-gray-600" aria-hidden="true" />
            )}
            Voice Control
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="voice-control-toggle"
                checked={isEnabled}
                onCheckedChange={toggleVoiceControl}
              />
              <Label htmlFor="voice-control-toggle" className="text-sm">
                {isEnabled ? "Active" : "Inactive"}
              </Label>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Navigate and control the dashboard using voice commands
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            "p-4 border rounded-lg transition-colors",
            isListening
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-border bg-background/50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isListening ? (
                <Mic className="h-4 w-4 text-green-600 animate-pulse" />
              ) : (
                <MicOff className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">Listening Status</span>
            </div>
            <div className="text-xl font-bold">
              {isListening ? "Listening..." : "Not Listening"}
            </div>
            {currentCommand && (
              <div className="text-xs text-muted-foreground mt-1">
                Heard: "{currentCommand}"
              </div>
            )}
          </div>

          <div className={cn(
            "p-4 border rounded-lg transition-colors",
            isSpeaking
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-border bg-background/50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isSpeaking ? (
                <Volume2 className="h-4 w-4 text-blue-600 animate-pulse" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-xs text-muted-foreground">Speech Status</span>
            </div>
            <div className="text-xl font-bold">
              {isSpeaking ? "Speaking..." : "Silent"}
            </div>
          </div>
        </div>

        {/* Available Commands */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Available Commands
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() => speak("Here are the available commands: " + commands.map(c => c.command).join(", "))}
              disabled={!isEnabled}
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Read Aloud
            </Button>
          </div>
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-2">
              {commands.map((cmd, index) => (
                <div
                  key={index}
                  className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-mono text-sm font-medium text-primary">
                      "{cmd.command}"
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{cmd.description}</p>
                  {cmd.aliases && cmd.aliases.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-muted-foreground">Also:</span>
                      {cmd.aliases.map((alias, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Transcript History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Command History</h4>
            {transcript.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTranscript([])}
              >
                Clear
              </Button>
            )}
          </div>
          <ScrollArea className="h-[200px] pr-4">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mic className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No commands yet. Try saying "help" to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {transcript.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "p-3 border rounded-lg",
                      entry.recognized
                        ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                        : "border-red-200 bg-red-50 dark:bg-red-900/20"
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm">{entry.text}</span>
                      {entry.recognized ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{entry.timestamp.toLocaleTimeString()}</span>
                      {entry.action && (
                        <Badge variant="outline" className="text-xs">
                          {entry.action}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <strong>Quick Start:</strong> Enable voice control using the toggle above, then say commands like
              "go to dashboard", "create task", or "help" to see all available commands. The system provides
              voice feedback for your actions.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

