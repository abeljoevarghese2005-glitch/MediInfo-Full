import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Custom storage using Capacitor Preferences — persists across app close on Android
const CapacitorStorage = {
  getItem: async (key) => {
    const { value } = await Preferences.get({ key })
    return value
  },
  setItem: async (key, value) => {
    await Preferences.set({ key, value })
    // also mirror to localStorage for synchronous reads
    localStorage.setItem(key, value)
  },
  removeItem: async (key) => {
    await Preferences.remove({ key })
    localStorage.removeItem(key)
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CapacitorStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
})