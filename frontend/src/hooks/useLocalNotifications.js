// src/hooks/useLocalNotifications.js
// Handles exact-time local notifications for medicine reminders and appointments.
// Uses @capacitor/local-notifications — fires at precisely the scheduled time,
// no server polling, works offline, works when app is in background.

import { LocalNotifications } from '@capacitor/local-notifications'

// Generate a stable numeric ID from any string (Capacitor requires integer IDs)
function makeNotifId(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function formatTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`
}

/**
 * Request notification permission.
 * Returns true if granted, false otherwise.
 */
export async function requestNotifPermission() {
  try {
    const perm = await LocalNotifications.requestPermissions()
    return perm.display === 'granted'
  } catch {
    return false
  }
}

/**
 * Check current notification permission status.
 * Returns 'granted' | 'denied' | 'prompt'
 */
export async function checkNotifPermission() {
  try {
    const perm = await LocalNotifications.checkPermissions()
    return perm.display
  } catch {
    return 'denied'
  }
}

/**
 * Schedule local notifications for a medication reminder.
 * Fires at exactly reminder_time every day (or per frequency) between start_date and end_date.
 * Schedules up to 60 notifications ahead (Android/iOS limit-safe).
 *
 * @param {object} reminder - Full reminder row from Supabase
 */
export async function scheduleReminderNotifications(reminder) {
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return

    const { id, medicine_name, dosage, frequency, reminder_time, start_date, end_date } = reminder
    if (!reminder_time || !start_date || frequency === 'as needed') return

    const [hours, minutes] = reminder_time.split(':').map(Number)

    const timesPerDay = {
      'daily': 1,
      'twice daily': 2,
      'three times daily': 3,
      'weekly': 1,
    }[frequency] || 1

    const intervalHours = timesPerDay > 1 ? Math.floor(24 / timesPerDay) : 0

    const start = new Date(start_date + 'T00:00:00')
    const end = end_date
      ? new Date(end_date + 'T23:59:59')
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days ahead if no end date
    const now = new Date()

    const notifications = []
    const current = new Date(start)

    while (current <= end && notifications.length < 60) {
      for (let i = 0; i < timesPerDay; i++) {
        const notifDate = new Date(current)
        notifDate.setHours(hours + (i * intervalHours), minutes, 0, 0)

        if (notifDate <= now) continue // skip past times

        const body = dosage
          ? `Take ${dosage} — ${frequency}`
          : `Time to take your medicine`

        notifications.push({
          id: makeNotifId(`${id}_${notifDate.toISOString()}_${i}`),
          title: `💊 ${medicine_name}`,
          body,
          schedule: { at: notifDate },
          sound: 'default',
          extra: { reminderId: id },
        })
      }

      current.setDate(current.getDate() + (frequency === 'weekly' ? 7 : 1))
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch (err) {
    console.error('scheduleReminderNotifications error:', err)
  }
}

/**
 * Cancel all pending notifications for a reminder (call on delete).
 * @param {string} reminderId
 */
export async function cancelReminderNotifications(reminderId) {
  try {
    const pending = await LocalNotifications.getPending()
    const toCancel = pending.notifications
      .filter(n => n.extra?.reminderId === reminderId)
      .map(n => ({ id: n.id }))
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel })
    }
  } catch (err) {
    console.error('cancelReminderNotifications error:', err)
  }
}

/**
 * Schedule appointment reminder notifications.
 * Fires 24h before and 1h before the appointment.
 * Call this when an appointment is confirmed.
 *
 * @param {object} appointment - appointment row with doctor_name, appointment_date, appointment_time
 */
export async function scheduleAppointmentNotifications(appointment) {
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return

    const { id, appointment_date, appointment_time, doctor_name } = appointment
    if (!appointment_date) return

    const timeStr = appointment_time || '09:00'
    const apptDateTime = new Date(`${appointment_date}T${timeStr}:00`)
    const now = new Date()

    const notifications = []

    const oneDayBefore = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000)
    if (oneDayBefore > now) {
      notifications.push({
        id: makeNotifId(`${id}_24h`),
        title: '📅 Appointment Tomorrow',
        body: `Dr. ${doctor_name} at ${formatTime(timeStr)} — don't forget!`,
        schedule: { at: oneDayBefore },
        sound: 'default',
        extra: { appointmentId: id },
      })
    }

    const oneHourBefore = new Date(apptDateTime.getTime() - 60 * 60 * 1000)
    if (oneHourBefore > now) {
      notifications.push({
        id: makeNotifId(`${id}_1h`),
        title: '⏰ Appointment in 1 Hour',
        body: `Dr. ${doctor_name} at ${formatTime(timeStr)} — get ready!`,
        schedule: { at: oneHourBefore },
        sound: 'default',
        extra: { appointmentId: id },
      })
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications })
    }
  } catch (err) {
    console.error('scheduleAppointmentNotifications error:', err)
  }
}

/**
 * Cancel appointment notifications (call if appointment is cancelled).
 * @param {string} appointmentId
 */
export async function cancelAppointmentNotifications(appointmentId) {
  try {
    const pending = await LocalNotifications.getPending()
    const toCancel = pending.notifications
      .filter(n => n.extra?.appointmentId === appointmentId)
      .map(n => ({ id: n.id }))
    if (toCancel.length > 0) {
      await LocalNotifications.cancel({ notifications: toCancel })
    }
  } catch (err) {
    console.error('cancelAppointmentNotifications error:', err)
  }
}