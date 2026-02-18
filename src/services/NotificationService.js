import notifee, { 
  TriggerType, 
  AndroidImportance, 
  AndroidCategory,
  AndroidVisibility,
  AndroidLaunchActivityFlag
} from '@notifee/react-native';

class NotificationService {
  constructor() {
    this.bootstrap();
  }

  async bootstrap() {
    await notifee.createChannel({
      id: 'medication_reminders_premium',
      name: 'Medication Reminders',
      description: 'Gentle and professional health reminders.',
      importance: AndroidImportance.HIGH, 
      vibration: true,
      vibrationPattern: [300, 200, 300, 200], 
      sound: 'default', 
      visibility: AndroidVisibility.PUBLIC, 
      bypassDnd: true, 
    });
  }

  async scheduleMedication(id, name, dosage, date, originalScheduledTime = null) {
    try {
      await notifee.requestPermission();

      const now = Date.now();
      let scheduledTime = date.getTime();

      if (scheduledTime <= now) {
        scheduledTime = now + 10000; 
      }

      let stringId = id ? (typeof id === 'object' ? id.toString() : String(id)) : '';

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: scheduledTime,
        alarmManager: {
          allowWhileIdle: true,
        },
      };

      await notifee.createTriggerNotification(
        {
          id: stringId,
          title: '💊 Time for your health break',
          body: `Hi! It's time for your ${dosage} of ${name}. Staying on track helps you feel your best! ✨`,
          data: {
            medicationId: stringId, 
            medicationName: String(name), 
            dosage: String(dosage), 
            scheduledAt: originalScheduledTime || new Date(scheduledTime).toISOString(),
          },
          android: {
            channelId: 'medication_reminders_premium',
            category: AndroidCategory.ALARM,

            // --- THE WAKE-UP TRICK ---
            // Nilagay ulit natin 'to para mag-wake ang screen. 
            // Dahil sa previous MainActivity updates natin (no setShowWhenLocked), 
            // dapat iilaw lang ang screen para ipakita ang card, hindi ang dashboard.
            fullScreenAction: {
              id: 'default',
            },

            importance: AndroidImportance.HIGH,
            priority: 'high',
            visibility: AndroidVisibility.PUBLIC,
            autoCancel: true,        
            ongoing: false,

            pressAction: { 
              id: 'default',
              launchActivity: 'default',
              launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
            },

            actions: [
              {
                title: '✅ Mark as Taken',
                pressAction: { id: 'taken' },
              },
              {
                title: '⏰ Snooze (10m)',
                pressAction: { id: 'snooze' },
              },
            ],
          },
        },
        trigger,
      );

      console.log(`[NotificationService] Scheduled: ${name}. Force Wake + Card mode enabled.`);
    } catch (error) {
      console.error('[NotificationService] Error:', error);
    }
  }

  async snoozeMedication(notification) {
    try {
      if (notification.id) {
        await notifee.cancelNotification(notification.id);
      }
      const { medicationId, medicationName, dosage, scheduledAt } = notification.data;
      const snoozeDate = new Date(Date.now() + 10 * 60 * 1000); 
      await this.scheduleMedication(medicationId, medicationName, dosage, snoozeDate, scheduledAt);
    } catch (error) {
      console.error('[NotificationService] Snooze Error:', error);
    }
  }

  async cancelNotification(id) {
    try {
      const stringId = (id && typeof id === 'object') ? id.toString() : String(id);
      await notifee.cancelNotification(stringId);
    } catch (e) {
      console.error('[NotificationService] Cancel Error:', e);
    }
  }

  async cancelAll() {
    await notifee.cancelAllNotifications();
  }
}

export default new NotificationService();