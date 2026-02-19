// src/services/NotificationService.js
import notifee, {
  TriggerType,
  RepeatFrequency,
  AndroidImportance,
  AndroidCategory,
  AndroidVisibility,
  AndroidLaunchActivityFlag,
} from '@notifee/react-native';
import Realm from 'realm';
import { Frequency, MedicationStatus } from '../models/Schemas';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const CHANNEL_ID = 'medication_alarms';
const SNOOZE_DURATION_MINUTES = 10;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Safely converts a Realm UUID or string to a plain string.
 */
const toStringId = (id) => {
  if (!id) return '';
  return typeof id === 'object' ? id.toString() : String(id);
};

/**
 * Builds the notification data payload from a Medication object and a Schedule.
 * This is the single source of truth for what App.js and background handlers receive.
 */
const buildNotificationData = (medication, schedule) => ({
  medicationId: toStringId(medication._id),
  profileId: medication.owner?.[0]?._id
    ? toStringId(medication.owner[0]._id)
    : '',
  medicationName: medication.name,
  dosageSnapshot: `${medication.dosage} ${medication.unit}`,
  scheduledAt: new Date().toISOString(), // overwritten at fire time; used as fallback
  scheduleHour: String(schedule.hour),
  scheduleMinute: String(schedule.minute),
  isAlarm: 'true',
});

/**
 * Computes the next Date a given schedule slot should fire,
 * accounting for whether that time has already passed today.
 */
const computeNextFireDate = (hour, minute) => {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next;
};

/**
 * Generates a stable, unique Notifee notification ID for a given
 * medication + schedule slot so we can cancel/update it reliably.
 * Format: "<medicationId>_<hour>_<minute>"
 */
const buildNotificationId = (medicationId, hour, minute) =>
  `${toStringId(medicationId)}_${hour}_${minute}`;

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────

class NotificationService {
  // ── BOOTSTRAP ──────────────────────────────

  /**
   * Call this once at app startup (from WelcomeScreen's onStart or App.js).
   * Creates the Android notification channel and requests permissions.
   */
  async bootstrap() {
    try {
      await notifee.requestPermission();

      await notifee.createChannel({
        id: CHANNEL_ID,
        name: 'Medication Alarms',
        description: 'Critical health reminders for your medications.',
        importance: AndroidImportance.HIGH,
        vibration: true,
        vibrationPattern: [300, 500, 300, 500],
        sound: 'med_alarm', // place med_alarm.mp3 in android/app/src/main/res/raw/
        visibility: AndroidVisibility.PUBLIC,
        bypassDnd: true,
      });

      console.log('[NotificationService] Bootstrap complete.');
    } catch (e) {
      console.error('[NotificationService] Bootstrap error:', e);
    }
  }

  // ── SCHEDULE ───────────────────────────────

  /**
   * Schedules one Notifee alarm for a single Schedule slot of a medication.
   * Called internally by scheduleMedicationAlarms().
   *
   * @param {Medication} medication  - Full Realm Medication object
   * @param {Schedule}   schedule    - The embedded Schedule object (hour, minute, etc.)
   * @returns {string} The Notifee notification ID that was scheduled
   */
  async _scheduleOneAlarm(medication, schedule) {
    const notificationId = buildNotificationId(medication._id, schedule.hour, schedule.minute);
    const fireDate = computeNextFireDate(schedule.hour, schedule.minute);
    const data = buildNotificationData(medication, schedule);

    // Patch scheduledAt with the actual computed fire time
    data.scheduledAt = fireDate.toISOString();

    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: fireDate.getTime(),
      repeatFrequency: this._resolveRepeatFrequency(medication.frequency),
      alarmManager: {
        allowWhileIdle: true, // fires even in Android Doze mode
      },
    };

    await notifee.createTriggerNotification(
      {
        id: notificationId,
        title: '💊 Medication Alarm',
        body: `Time for your ${medication.dosage} ${medication.unit} of ${medication.name}.`,
        data,
        android: {
          channelId: CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          visibility: AndroidVisibility.PUBLIC,
          sound: 'med_alarm',
          ongoing: true,       // can't be swiped away until actioned
          autoCancel: false,

          // Full-screen intent — triggers AlarmOverlay when phone is locked/idle
          fullScreenAction: {
            id: 'default',
            launchActivity: 'default',
          },

          pressAction: {
            id: 'default',
            launchActivity: 'default',
            launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
          },

          actions: [
            {
              title: '✅ Taken',
              pressAction: { id: MedicationStatus.TAKEN },
            },
            {
              title: '⏰ Snooze',
              pressAction: { id: MedicationStatus.SNOOZED },
            },
            {
              title: '✖ Skip',
              pressAction: { id: MedicationStatus.SKIPPED },
            },
          ],
        },
        ios: {
          sound: 'med_alarm.caf', // place med_alarm.caf in your Xcode project
          critical: true,         // bypasses silent mode (requires Apple entitlement)
          criticalVolume: 1.0,
          categoryId: 'MEDICATION_ALARM',
        },
      },
      trigger,
    );

    console.log(
      `[NotificationService] Scheduled: ${medication.name} at ${schedule.hour}:${String(schedule.minute).padStart(2, '0')} → ID: ${notificationId}`,
    );

    return notificationId;
  }

  /**
   * Schedules ALL alarm slots for a given Medication.
   * Also writes the generated notificationId back into each Schedule in Realm
   * so we can cancel/update them later.
   *
   * @param {Realm}      realm
   * @param {Medication} medication
   */
  async scheduleMedicationAlarms(realm, medication) {
    try {
      for (const schedule of medication.schedules) {
        if (!schedule.isActive) continue;

        const notificationId = await this._scheduleOneAlarm(medication, schedule);

        // Persist the notificationId back into the Schedule embedded object
        realm.write(() => {
          schedule.notificationId = notificationId;
        });
      }
    } catch (e) {
      console.error('[NotificationService] scheduleMedicationAlarms error:', e);
    }
  }

  /**
   * Cancels ALL active Notifee alarms for a given Medication
   * by reading the stored notificationId from each Schedule.
   *
   * @param {Medication} medication
   */
  async cancelMedicationAlarms(medication) {
    try {
      for (const schedule of medication.schedules) {
        if (schedule.notificationId) {
          await notifee.cancelTriggerNotification(schedule.notificationId);
          console.log(`[NotificationService] Cancelled: ${schedule.notificationId}`);
        }
      }
    } catch (e) {
      console.error('[NotificationService] cancelMedicationAlarms error:', e);
    }
  }

  /**
   * Cancels and re-schedules all alarms for a medication.
   * Call this after the user edits a medication's schedule.
   *
   * @param {Realm}      realm
   * @param {Medication} medication
   */
  async rescheduleMedicationAlarms(realm, medication) {
    await this.cancelMedicationAlarms(medication);
    await this.scheduleMedicationAlarms(realm, medication);
  }

  /**
   * Re-schedules ALL active medications from Realm.
   * Call this on app boot or foreground resume as a safety net,
   * because Android can wipe scheduled alarms after a reboot.
   *
   * @param {Realm} realm
   */
  async rescheduleAllAlarms(realm) {
    try {
      const medications = realm.objects('Medication').filtered('isActive == true');

      for (const medication of medications) {
        await this.scheduleMedicationAlarms(realm, medication);
      }

      console.log(`[NotificationService] Rescheduled alarms for ${medications.length} medications.`);
    } catch (e) {
      console.error('[NotificationService] rescheduleAllAlarms error:', e);
    }
  }

  // ── SNOOZE ─────────────────────────────────

  /**
   * Snoozes an alarm by scheduling a new one-off notification
   * and writing a SnoozeLog entry to Realm.
   *
   * @param {Realm}        realm
   * @param {Notification} notification  - The Notifee notification object from the event
   */
  async snoozeMedication(realm, notification) {
    try {
      const {
        medicationId,
        profileId,
        medicationName,
        dosageSnapshot,
        scheduledAt,
      } = notification.data;

      // Cancel the current alarm notification
      if (notification.id) {
        await notifee.cancelNotification(notification.id);
      }

      const snoozeTime = new Date(Date.now() + SNOOZE_DURATION_MINUTES * 60 * 1000);
      const snoozeNotificationId = `${medicationId}_snooze_${snoozeTime.getTime()}`;

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: snoozeTime.getTime(),
        alarmManager: { allowWhileIdle: true },
      };

      // Schedule the snoozed notification (one-off, no repeat)
      await notifee.createTriggerNotification(
        {
          id: snoozeNotificationId,
          title: '💊 Snoozed Reminder',
          body: `Don't forget: ${dosageSnapshot} of ${medicationName}.`,
          data: {
            medicationId,
            profileId,
            medicationName,
            dosageSnapshot,
            scheduledAt, // keep the original scheduled time for delay calculation
            isAlarm: 'true',
          },
          android: {
            channelId: CHANNEL_ID,
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            visibility: AndroidVisibility.PUBLIC,
            sound: 'med_alarm',
            ongoing: true,
            autoCancel: false,
            fullScreenAction: { id: 'default', launchActivity: 'default' },
            pressAction: {
              id: 'default',
              launchActivity: 'default',
              launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
            },
            actions: [
              { title: '✅ Taken', pressAction: { id: MedicationStatus.TAKEN } },
              { title: '⏰ Snooze', pressAction: { id: MedicationStatus.SNOOZED } },
              { title: '✖ Skip', pressAction: { id: MedicationStatus.SKIPPED } },
            ],
          },
          ios: {
            sound: 'med_alarm.caf',
            critical: true,
            criticalVolume: 1.0,
          },
        },
        trigger,
      );

      // Write a SnoozeLog entry to Realm for adherence tracking / Guilt Trip feature
      realm.write(() => {
        realm.create('SnoozeLog', {
          _id: new Realm.BSON.UUID(),
          medicationLogId: new Realm.BSON.UUID(), // link this after MedicationLog is created on 'taken'
          snoozedAt: new Date(),
          snoozeDurationMinutes: SNOOZE_DURATION_MINUTES,
          newAlarmTime: snoozeTime,
          notificationId: snoozeNotificationId,
        });
      });

      console.log(
        `[NotificationService] Snoozed: ${medicationName} → fires at ${snoozeTime.toLocaleTimeString()}`,
      );
    } catch (e) {
      console.error('[NotificationService] snoozeMedication error:', e);
    }
  }

  // ── NEXT OCCURRENCE ────────────────────────

  /**
   * Computes the next Date this medication should fire based on its
   * frequency and schedules. Used by App.js after marking a dose as taken.
   *
   * @param {Medication} medication
   * @returns {Date|null}
   */
  computeNextOccurrence(medication) {
    try {
      if (!medication.schedules || medication.schedules.length === 0) return null;

      const now = new Date();

      switch (medication.frequency) {
        case Frequency.DAILY:
        case Frequency.SPECIFIC_DAYS: {
          // Find the earliest schedule slot that hasn't fired yet today,
          // or fall back to the first slot tomorrow
          const todaySlots = medication.schedules
            .filter((s) => s.isActive)
            .map((s) => {
              const d = new Date();
              d.setHours(s.hour, s.minute, 0, 0);
              return d;
            })
            .filter((d) => d > now)
            .sort((a, b) => a - b);

          if (todaySlots.length > 0) return todaySlots[0];

          // All slots have passed today — return the first slot tomorrow
          const first = medication.schedules
            .filter((s) => s.isActive)
            .sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute))[0];

          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(first.hour, first.minute, 0, 0);
          return tomorrow;
        }

        case Frequency.EVERY_X_HOURS: {
          if (!medication.intervalHours) return null;
          return new Date(now.getTime() + medication.intervalHours * 60 * 60 * 1000);
        }

        case Frequency.AS_NEEDED:
        default:
          return null;
      }
    } catch (e) {
      console.error('[NotificationService] computeNextOccurrence error:', e);
      return null;
    }
  }

  // ── CANCEL HELPERS ─────────────────────────

  /**
   * Cancels a single notification by ID (string or Realm UUID).
   */
  async cancelNotification(id) {
    try {
      await notifee.cancelNotification(toStringId(id));
    } catch (e) {
      console.error('[NotificationService] cancelNotification error:', e);
    }
  }

  /**
   * Nuclear option — cancels every scheduled and delivered notification.
   * Use with care (e.g. during logout or profile deletion).
   */
  async cancelAll() {
    try {
      await notifee.cancelAllNotifications();
      console.log('[NotificationService] All notifications cancelled.');
    } catch (e) {
      console.error('[NotificationService] cancelAll error:', e);
    }
  }

  // ── PRIVATE HELPERS ────────────────────────

  /**
   * Maps the Medication frequency string to a Notifee RepeatFrequency.
   * For EVERY_X_HOURS and AS_NEEDED we return undefined (no repeat —
   * the next alarm is manually scheduled after each fire).
   */
  _resolveRepeatFrequency(frequency) {
    switch (frequency) {
      case Frequency.DAILY:
        return RepeatFrequency.DAILY;
      case Frequency.SPECIFIC_DAYS:
        // Notifee doesn't natively support specific days with RepeatFrequency;
        // we handle day filtering in computeNextOccurrence and reschedule manually.
        return undefined;
      case Frequency.EVERY_X_HOURS:
      case Frequency.AS_NEEDED:
      default:
        return undefined;
    }
  }
}

// Export as a singleton
export default new NotificationService();