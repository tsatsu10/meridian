import { toast } from '@/components/ui/use-toast';

export interface DeviceSensors {
  accelerometer: boolean;
  gyroscope: boolean;
  magnetometer: boolean;
  ambientLight: boolean;
  proximity: boolean;
  geolocation: boolean;
}

export interface BiometricAuth {
  available: boolean;
  type: 'fingerprint' | 'face' | 'iris' | 'none';
  supported: boolean;
}

export interface DeviceCapabilities {
  sensors: DeviceSensors;
  biometric: BiometricAuth;
  hapticFeedback: boolean;
  vibration: boolean;
  camera: boolean;
  microphone: boolean;
  bluetooth: boolean;
  nfc: boolean;
  share: boolean;
  clipboard: boolean;
  fullscreen: boolean;
  wakeLock: boolean;
}

export interface SensorData {
  accelerometer?: {
    x: number;
    y: number;
    z: number;
  };
  gyroscope?: {
    x: number;
    y: number;
    z: number;
  };
  magnetometer?: {
    x: number;
    y: number;
    z: number;
  };
  ambientLight?: number;
  proximity?: number;
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: number;
  };
}

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export class NativeFeatures {
  private static instance: NativeFeatures;
  private capabilities: DeviceCapabilities;
  private sensorData: SensorData = {};
  private sensorListeners: Map<string, Function[]> = new Map();
  private geolocationWatchId: number | null = null;
  private sensorPermissionStatus: Map<string, PermissionState> = new Map();

  private constructor() {
    this.capabilities = {
      sensors: {
        accelerometer: false,
        gyroscope: false,
        magnetometer: false,
        ambientLight: false,
        proximity: false,
        geolocation: false
      },
      biometric: {
        available: false,
        type: 'none',
        supported: false
      },
      hapticFeedback: false,
      vibration: false,
      camera: false,
      microphone: false,
      bluetooth: false,
      nfc: false,
      share: false,
      clipboard: false,
      fullscreen: false,
      wakeLock: false
    };

    this.initializeNativeFeatures();
  }

  static getInstance(): NativeFeatures {
    if (!NativeFeatures.instance) {
      NativeFeatures.instance = new NativeFeatures();
    }
    return NativeFeatures.instance;
  }

  private async initializeNativeFeatures(): Promise<void> {
    try {
      // Detect device capabilities
      await this.detectCapabilities();

      // Initialize sensors if available
      if (this.hasAnySensors()) {
        await this.initializeSensors();
      }

      // Initialize biometric authentication
      await this.initializeBiometric();

      console.log('Native Features initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Native Features:', error);
    }
  }

  private async detectCapabilities(): Promise<void> {
    // Detect sensor capabilities
    this.capabilities.sensors.accelerometer = 'Accelerometer' in window;
    this.capabilities.sensors.gyroscope = 'Gyroscope' in window;
    this.capabilities.sensors.magnetometer = 'Magnetometer' in window;
    this.capabilities.sensors.ambientLight = 'AmbientLightSensor' in window;
    this.capabilities.sensors.proximity = 'ProximitySensor' in window;
    this.capabilities.sensors.geolocation = 'geolocation' in navigator;

    // Detect other capabilities
    this.capabilities.vibration = 'vibrate' in navigator;
    this.capabilities.camera = 'mediaDevices' in navigator;
    this.capabilities.microphone = 'mediaDevices' in navigator;
    this.capabilities.bluetooth = 'bluetooth' in navigator;
    this.capabilities.nfc = 'NDEFReader' in window;
    this.capabilities.share = 'share' in navigator;
    this.capabilities.clipboard = 'clipboard' in navigator;
    this.capabilities.fullscreen = 'fullscreen' in document;
    this.capabilities.wakeLock = 'wakeLock' in navigator;

    // Detect haptic feedback
    this.capabilities.hapticFeedback = 'vibrate' in navigator || 'haptic' in navigator;
  }

  private hasAnySensors(): boolean {
    return Object.values(this.capabilities.sensors).some(capable => capable);
  }

  private async initializeSensors(): Promise<void> {
    try {
      // Initialize accelerometer
      if (this.capabilities.sensors.accelerometer) {
        await this.initializeAccelerometer();
      }

      // Initialize gyroscope
      if (this.capabilities.sensors.gyroscope) {
        await this.initializeGyroscope();
      }

      // Initialize magnetometer
      if (this.capabilities.sensors.magnetometer) {
        await this.initializeMagnetometer();
      }

      // Initialize ambient light sensor
      if (this.capabilities.sensors.ambientLight) {
        await this.initializeAmbientLightSensor();
      }

      // Initialize proximity sensor
      if (this.capabilities.sensors.proximity) {
        await this.initializeProximitySensor();
      }

      // Initialize geolocation
      if (this.capabilities.sensors.geolocation) {
        await this.initializeGeolocation();
      }
    } catch (error) {
      console.error('Failed to initialize sensors:', error);
    }
  }

  private async initializeAccelerometer(): Promise<void> {
    try {
      const accelerometer = new (window as any).Accelerometer({ frequency: 60 });
      
      accelerometer.addEventListener('reading', () => {
        this.sensorData.accelerometer = {
          x: accelerometer.x,
          y: accelerometer.y,
          z: accelerometer.z
        };
        this.notifySensorListeners('accelerometer', this.sensorData.accelerometer);
      });

      accelerometer.start();
    } catch (error) {
      console.error('Failed to initialize accelerometer:', error);
    }
  }

  private async initializeGyroscope(): Promise<void> {
    try {
      const gyroscope = new (window as any).Gyroscope({ frequency: 60 });
      
      gyroscope.addEventListener('reading', () => {
        this.sensorData.gyroscope = {
          x: gyroscope.x,
          y: gyroscope.y,
          z: gyroscope.z
        };
        this.notifySensorListeners('gyroscope', this.sensorData.gyroscope);
      });

      gyroscope.start();
    } catch (error) {
      console.error('Failed to initialize gyroscope:', error);
    }
  }

  private async initializeMagnetometer(): Promise<void> {
    try {
      const magnetometer = new (window as any).Magnetometer({ frequency: 60 });
      
      magnetometer.addEventListener('reading', () => {
        this.sensorData.magnetometer = {
          x: magnetometer.x,
          y: magnetometer.y,
          z: magnetometer.z
        };
        this.notifySensorListeners('magnetometer', this.sensorData.magnetometer);
      });

      magnetometer.start();
    } catch (error) {
      console.error('Failed to initialize magnetometer:', error);
    }
  }

  private async initializeAmbientLightSensor(): Promise<void> {
    try {
      const lightSensor = new (window as any).AmbientLightSensor();
      
      lightSensor.addEventListener('reading', () => {
        this.sensorData.ambientLight = lightSensor.illuminance;
        this.notifySensorListeners('ambientLight', this.sensorData.ambientLight);
      });

      lightSensor.start();
    } catch (error) {
      console.error('Failed to initialize ambient light sensor:', error);
    }
  }

  private async initializeProximitySensor(): Promise<void> {
    try {
      const proximitySensor = new (window as any).ProximitySensor();
      
      proximitySensor.addEventListener('reading', () => {
        this.sensorData.proximity = proximitySensor.distance;
        this.notifySensorListeners('proximity', this.sensorData.proximity);
      });

      proximitySensor.start();
    } catch (error) {
      console.error('Failed to initialize proximity sensor:', error);
    }
  }

  private async initializeGeolocation(): Promise<void> {
    try {
      const position = await this.getCurrentPosition();
      this.sensorData.geolocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };

      // Start watching for position changes
      this.geolocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          this.sensorData.geolocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this.notifySensorListeners('geolocation', this.sensorData.geolocation);
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } catch (error) {
      console.error('Failed to initialize geolocation:', error);
    }
  }

  private async initializeBiometric(): Promise<void> {
    try {
      // Check if WebAuthn is available
      if ('PublicKeyCredential' in window) {
        this.capabilities.biometric.supported = true;
        
        // Check if biometric authentication is available
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        this.capabilities.biometric.available = available;
        
        if (available) {
          // Determine biometric type (this is a simplified check)
          this.capabilities.biometric.type = 'fingerprint'; // Default assumption
        }
      }
    } catch (error) {
      console.error('Failed to initialize biometric:', error);
    }
  }

  private getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      });
    });
  }

  // Public methods for sensor data access
  getSensorData(): SensorData {
    return { ...this.sensorData };
  }

  getCapabilities(): DeviceCapabilities {
    return { ...this.capabilities };
  }

  // Sensor event listeners
  addSensorListener(sensor: string, callback: Function): void {
    if (!this.sensorListeners.has(sensor)) {
      this.sensorListeners.set(sensor, []);
    }
    this.sensorListeners.get(sensor)!.push(callback);
  }

  removeSensorListener(sensor: string, callback: Function): void {
    const callbacks = this.sensorListeners.get(sensor);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  private notifySensorListeners(sensor: string, data: any): void {
    const callbacks = this.sensorListeners.get(sensor);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  // Haptic feedback
  async triggerHapticFeedback(pattern: number | number[] = 100): Promise<void> {
    if (!this.capabilities.hapticFeedback) {
      console.warn('Haptic feedback not available');
      return;
    }

    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      } else if ('haptic' in navigator) {
        await (navigator as any).haptic.trigger('impact', { style: 'medium' });
      }
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
    }
  }

  // Native sharing
  async share(data: ShareData): Promise<boolean> {
    if (!this.capabilities.share) {
      console.warn('Native sharing not available');
      return false;
    }

    try {
      await navigator.share(data);
      return true;
    } catch (error) {
      console.error('Failed to share data:', error);
      return false;
    }
  }

  // Clipboard operations
  async copyToClipboard(text: string): Promise<boolean> {
    if (!this.capabilities.clipboard) {
      console.warn('Clipboard API not available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied to Clipboard',
        description: 'Text has been copied to your clipboard.',
        duration: 2000
      });
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  async readFromClipboard(): Promise<string> {
    if (!this.capabilities.clipboard) {
      console.warn('Clipboard API not available');
      return '';
    }

    try {
      return await navigator.clipboard.readText();
    } catch (error) {
      console.error('Failed to read from clipboard:', error);
      return '';
    }
  }

  // Fullscreen
  async enterFullscreen(element?: HTMLElement): Promise<boolean> {
    if (!this.capabilities.fullscreen) {
      console.warn('Fullscreen API not available');
      return false;
    }

    try {
      const targetElement = element || document.documentElement;
      await targetElement.requestFullscreen();
      return true;
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      return false;
    }
  }

  async exitFullscreen(): Promise<boolean> {
    if (!this.capabilities.fullscreen) {
      console.warn('Fullscreen API not available');
      return false;
    }

    try {
      await document.exitFullscreen();
      return true;
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      return false;
    }
  }

  // Wake lock
  async requestWakeLock(): Promise<boolean> {
    if (!this.capabilities.wakeLock) {
      console.warn('Wake Lock API not available');
      return false;
    }

    try {
      const wakeLock = await (navigator as any).wakeLock.request('screen');
      return true;
    } catch (error) {
      console.error('Failed to request wake lock:', error);
      return false;
    }
  }

  // Camera access
  async getCameraStream(constraints: MediaStreamConstraints = {}): Promise<MediaStream | null> {
    if (!this.capabilities.camera) {
      console.warn('Camera not available');
      return null;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        ...constraints
      });
    } catch (error) {
      console.error('Failed to access camera:', error);
      return null;
    }
  }

  // Microphone access
  async getMicrophoneStream(constraints: MediaStreamConstraints = {}): Promise<MediaStream | null> {
    if (!this.capabilities.microphone) {
      console.warn('Microphone not available');
      return null;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        ...constraints
      });
    } catch (error) {
      console.error('Failed to access microphone:', error);
      return null;
    }
  }

  // Biometric authentication
  async authenticateWithBiometric(): Promise<boolean> {
    if (!this.capabilities.biometric.available) {
      console.warn('Biometric authentication not available');
      return false;
    }

    try {
      // This is a simplified implementation
      // In a real app, you would use WebAuthn for proper biometric authentication
      const result = await this.simulateBiometricAuth();
      return result;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  private async simulateBiometricAuth(): Promise<boolean> {
    // Simulate biometric authentication
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(Math.random() > 0.1); // 90% success rate
      }, 1000);
    });
  }

  // Permission management
  async requestPermission(permission: PermissionName): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({ name: permission });
      this.sensorPermissionStatus.set(permission, result.state);
      return result.state;
    } catch (error) {
      console.error(`Failed to request permission for ${permission}:`, error);
      return 'denied';
    }
  }

  getPermissionStatus(permission: PermissionName): PermissionState {
    return this.sensorPermissionStatus.get(permission) || 'denied';
  }

  // Device orientation
  getDeviceOrientation(): 'portrait' | 'landscape' | 'unknown' {
    if (window.screen && window.screen.orientation) {
      return window.screen.orientation.type.includes('portrait') ? 'portrait' : 'landscape';
    }
    
    // Fallback
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }

  // Battery status
  async getBatteryStatus(): Promise<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  } | null> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (error) {
        console.error('Failed to get battery status:', error);
      }
    }
    return null;
  }

  // Network information
  getNetworkInfo(): {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  } | null {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  // Cleanup
  cleanup(): void {
    // Stop geolocation watching
    if (this.geolocationWatchId !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }

    // Clear sensor listeners
    this.sensorListeners.clear();
  }
}

export const nativeFeatures = NativeFeatures.getInstance(); 