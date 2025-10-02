import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.dda509fb90724253ac68992dd3c7d931',
  appName: 'melody-mint-muse',
  webDir: 'dist',
  server: {
    url: 'https://dda509fb-9072-4253-ac68-992dd3c7d931.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
