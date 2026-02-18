import notifee, { 
  TriggerType, 
  AndroidImportance, 
  AndroidCategory,
  AndroidVisibility 
} from '@notifee/react-native';

/**
 * Service class for premium medication notifications.
 * Clean, empathetic, and professional.
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
   * Schedules a reminder with a friendly, non-aggressive tone.
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

      // Convert BSON ID to string for Notifee compatibility
      const stringId = typeof id === 'object' ? id.toHexString() : id;

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: scheduledTime, 
        alarmManager: true, 
      };

      await notifee.createTriggerNotification(
        {
          id: stringId,
          // Tone: "Empathetic & Premium" instead of "Deadline"
          title: '💊 Time for your health break',
          body: `Hi! It's time for your ${dosage} of ${name}. Staying on track helps you feel your best! ✨`,
          data: {
            medicationId: stringId,
            medicationName: name,
            dosage: dosage,
            // Keep track of the original schedule for accurate delay reporting
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
   * Handles the snooze logic while preserving the original scheduled time.
   */
  async snoozeMedication(notification) {
    try {
      if (notification.id) {
        await notifee.cancelNotification(notification.id);
      }

      const { medicationId, medicationName, dosage, scheduledAt } = notification.data;
      
      // Fallback values
      const name = medicationName || "Medication";
      const dose = dosage || "1 dose";

      // Schedule for 10 minutes from now
      const snoozeDate = new Date(Date.now() + 10 * 60 * 1000); 

      // We pass the 'scheduledAt' back so the log still reflects the original target time
      await this.scheduleMedication(medicationId, name, dose, snoozeDate, scheduledAt);
      
      console.log(`[NotificationService] Snoozed: ${name} to ${snoozeDate.toLocaleTimeString()}`);
    } catch (error) {
      console.error('[NotificationService] Snooze Error:', error);
    }
  }

  async cancelNotification(id) {
    const notificationId = typeof id === 'object' ? id.toHexString() : id;
    await notifee.cancelNotification(notificationId);
  }

  async cancelAll() {
    await notifee.cancelAllNotifications();
  }
}

export default new NotificationService();