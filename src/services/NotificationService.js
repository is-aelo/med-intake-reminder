import notifee, { 
  TriggerType, 
  AndroidImportance, 
  AndroidCategory,
  AndroidVisibility 
} from '@notifee/react-native';

/**
 * Service class for premium medication notifications.
 * FIXED: Prevents "Access to invalidated Results objects" by 
 * converting Realm data to plain strings early.
 */
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

  /**
   * Schedules a reminder with defensive ID handling.
   */
  async scheduleMedication(id, name, dosage, date, originalScheduledTime = null) {
    try {
      await notifee.requestPermission();

      const now = Date.now();
      let scheduledTime = date.getTime();

      // If the time is in the past, push it slightly forward
      if (scheduledTime <= now) {
        scheduledTime = now + 10000; 
      }

      /**
       * CRITICAL FIX: Convert ID to string immediately.
       * This prevents "Access to invalidated Results objects" error 
       * when Realm closes the connection in the background.
       */
      let stringId = '';
      if (id) {
        if (typeof id === 'string') {
          stringId = id;
        } else if (typeof id === 'object') {
          // Handles both UUID and ObjectId even if the object is being invalidated
          stringId = id.toString(); 
        }
      }

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: scheduledTime, 
        alarmManager: true, 
      };

      await notifee.createTriggerNotification(
        {
          id: stringId,
          title: '💊 Time for your health break',
          body: `Hi! It's time for your ${dosage} of ${name}. Staying on track helps you feel your best! ✨`,
          data: {
            medicationId: stringId, // Pass as plain string
            medicationName: String(name), // Pass as plain string
            dosage: String(dosage), // Pass as plain string
            scheduledAt: originalScheduledTime || new Date(scheduledTime).toISOString(),
          },
          android: {
            channelId: 'medication_reminders_premium',
            category: AndroidCategory.REMINDER,
            importance: AndroidImportance.HIGH,
            priority: 'high',
            fullScreenIntent: false, 
            autoCancel: true,        
            ongoing: false,           
            
            pressAction: { id: 'default' },
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

      console.log(`[NotificationService] Scheduled: ${name} for ${new Date(scheduledTime).toLocaleTimeString()}`);
    } catch (error) {
      console.error('[NotificationService] Scheduling Error:', error);
    }
  }

  /**
   * Handles the snooze logic.
   * Data is extracted from notification.data which are already plain strings.
   */
  async snoozeMedication(notification) {
    try {
      if (notification.id) {
        await notifee.cancelNotification(notification.id);
      }

      const { medicationId, medicationName, dosage, scheduledAt } = notification.data;
      
      const name = medicationName || "Medication";
      const dose = dosage || "1 dose";
      const snoozeDate = new Date(Date.now() + 10 * 60 * 1000); 

      // medicationId here is already a string from the notification payload
      await this.scheduleMedication(medicationId, name, dose, snoozeDate, scheduledAt);
      
      console.log(`[NotificationService] Snoozed: ${name} to ${snoozeDate.toLocaleTimeString()}`);
    } catch (error) {
      console.error('[NotificationService] Snooze Error:', error);
    }
  }

  /**
   * Safe cancellation helper.
   */
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