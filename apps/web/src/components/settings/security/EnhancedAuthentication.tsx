import { useState } from "react";
import { Fingerprint, Key, Smartphone, Shield } from "lucide-react";
import { useWebAuthn } from "@/hooks/use-web-authn";
import { useBiometrics } from "@/hooks/use-biometrics";
import { useTotp } from "@/hooks/use-totp";

interface EnhancedAuthenticationProps {
  userId: string;
}

export function EnhancedAuthentication({ userId }: EnhancedAuthenticationProps) {
  const { isSupported: isWebAuthnSupported, register: registerWebAuthn } = useWebAuthn();
  const { isAvailable: isBiometricsAvailable, setup: setupBiometrics } = useBiometrics();
  const { generateQR, verify } = useTotp();

  const [authMethods, setAuthMethods] = useState({
    webauthn: false,
    biometric: false,
    totp: false,
    recovery: true
  });

  return (
    <div className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-lg">
      <h2 className="text-2xl font-bold">Advanced Authentication</h2>
      
      {/* Security Key Authentication */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Key className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold">Security Keys</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Use hardware security keys for strongest protection
              </p>
            </div>
          </div>
          <button
            onClick={registerWebAuthn}
            disabled={!isWebAuthnSupported}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600
                     disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed
                     border border-blue-700 dark:border-blue-600 shadow-sm"
          >
            {authMethods.webauthn ? "Manage Keys" : "Add Key"}
          </button>
        </div>
      </div>

      {/* Biometric Authentication */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Fingerprint className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold">Biometric Authentication</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Use fingerprint or face recognition
              </p>
            </div>
          </div>
          <button
            onClick={setupBiometrics}
            disabled={!isBiometricsAvailable}
            className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600
                     disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed
                     border border-purple-700 dark:border-purple-600 shadow-sm"
          >
            {authMethods.biometric ? "Manage Biometrics" : "Enable Biometrics"}
          </button>
        </div>
      </div>

      {/* TOTP Authentication */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="text-lg font-semibold">Authenticator App</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Use time-based one-time passwords
              </p>
            </div>
          </div>
          <button
            onClick={generateQR}
            className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600
                     border border-green-700 dark:border-green-600 shadow-sm"
          >
            {authMethods.totp ? "Manage TOTP" : "Setup TOTP"}
          </button>
        </div>
      </div>

      {/* Recovery Options */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            <div>
              <h3 className="text-lg font-semibold">Recovery Options</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manage backup codes and recovery methods
              </p>
            </div>
          </div>
          <button
            className="px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600
                     border border-orange-700 dark:border-orange-600 shadow-sm"
          >
            Manage Recovery
          </button>
        </div>
      </div>
    </div>
  );
}