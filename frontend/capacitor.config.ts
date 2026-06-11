import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mediinfo.app',
  appName: 'MediInfo',
  webDir: 'dist',
  server: {
    androidScheme: 'https',  // keeps Supabase Auth cookies working
  },
};

export default config;