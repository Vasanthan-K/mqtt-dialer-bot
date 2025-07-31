import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2e4dac08ba784b9d91e10d063f2efc91',
  appName: 'mqtt-dialer-bot',
  webDir: 'dist',
  server: {
    url: 'https://2e4dac08-ba78-4b9d-91e1-0d063f2efc91.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;