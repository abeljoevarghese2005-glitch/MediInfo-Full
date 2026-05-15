// src/hooks/usePushNotifications.js
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = 'BErAQwEBStBYEz301Cimfen61RiYq6FAw4liNAaUad7A4crX2W63IKL2P1l2pplAZV0KwGanSqErDyXWwvlcTXw'
const SUPABASE_FUNCTIONS_URL = 'https://xfuzwuraowhaxqnfolzg.supabase.co/functions/v1'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported')
    return null
  }
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  return reg
}

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export async function subscribeToPush(userId, apiBase) {
  try {
    const reg = await registerServiceWorker()
    if (!reg) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    }

    const token = await getAuthToken()
    await fetch(`${SUPABASE_FUNCTIONS_URL}/push-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(subscription.toJSON())
    })

    return true
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}

export async function unsubscribeFromPush(userId, apiBase) {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return
    const subscription = await reg.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      const token = await getAuthToken()
      await fetch(`${SUPABASE_FUNCTIONS_URL}/push-unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
    }
  } catch (err) {
    console.error('Unsubscribe failed:', err)
  }
}