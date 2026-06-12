// src/hooks/usePushNotifications.js
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '../lib/supabase'

const SUPABASE_FUNCTIONS_URL = 'https://xfuzwuraowhaxqnfolzg.supabase.co/functions/v1'

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || ''
}

export async function subscribeToPush() {
  try {
    const permission = await PushNotifications.requestPermissions()
    if (permission.receive !== 'granted') {
      console.warn('Push notification permission denied')
      return false
    }

    await PushNotifications.register()

    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM token:', token.value)
      try {
        const authToken = await getAuthToken()
        await fetch(`${SUPABASE_FUNCTIONS_URL}/push-subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ fcm_token: token.value })
        })
      } catch (err) {
        console.error('Failed to save FCM token:', err)
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('FCM registration error:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notification received:', notification)
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Notification tapped:', action)
    })

    return true
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}

export async function unsubscribeFromPush() {
  try {
    await PushNotifications.removeAllListeners()
    const authToken = await getAuthToken()
    await fetch(`${SUPABASE_FUNCTIONS_URL}/push-unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    })
  } catch (err) {
    console.error('Unsubscribe failed:', err)
  }
}