import { createClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const memoryCache = {}

export async function initSupabaseStorage() {
  try {
    const { keys } = await Preferences.keys()
    await Promise.all(
      keys.map(async (key) => {
        const { value } = await Preferences.get({ key })
        if (value !== null) {
          memoryCache[key] = value
          localStorage.setItem(key, value)
        }
      })
    )
  } catch (e) {
    console.warn('Failed to preload Preferences:', e)
  }
}

const SyncStorage = {
  getItem: (key) => memoryCache[key] ?? localStorage.getItem(key) ?? null,
  setItem: (key, value) => {
    memoryCache[key] = value
    localStorage.setItem(key, value)
    Preferences.set({ key, value }).catch(() => {})
  },
  removeItem: (key) => {
    delete memoryCache[key]
    localStorage.removeItem(key)
    Preferences.remove({ key }).catch(() => {})
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
})