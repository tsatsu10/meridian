import { motion } from "framer-motion";

const PasswordStrengthIndicator = ({ password = "" }) => {
  const getStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getStrength();
  const strengthLabel = ["Very Weak", "Weak", "Fair", "Good", "Strong"][strength - 1] || "";

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="w-full h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${strength > 2 ? "bg-green-500" : strength > 1 ? "bg-yellow-500" : "bg-red-500"}`}
          initial={{ width: 0 }}
          animate={{ width: `${(strength / 5) * 100}%` }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-20 text-right">{strengthLabel}</span>
    </div>
  );
};

export default PasswordStrengthIndicator;
