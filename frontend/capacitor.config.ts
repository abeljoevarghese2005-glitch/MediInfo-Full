import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mediinfo.app',
  appName: 'MediInfo',
  webDir: 'dist',
  server: {
    url: 'https://medi-info-full.vercel.app',
    cleartext: true
  }
}

export default config