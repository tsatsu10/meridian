// Lazy load dotenv only when needed (fixes test imports)
let dotenvLoaded = false;

function loadDotenv() {
  if (!dotenvLoaded && process.env.NODE_ENV !== 'test') {
    try {
      // Dynamic import for better test compatibility
      require('dotenv').config();
      dotenvLoaded = true;
    } catch (error) {
      // Dotenv not available, use process.env directly
    }
  }
}

function getSettings() {
  loadDotenv();
  
  return {
    disableRegistration: process.env.DISABLE_REGISTRATION === "true",
    isDemoMode: process.env.DEMO_MODE === "true",
  };
}

export default getSettings;

