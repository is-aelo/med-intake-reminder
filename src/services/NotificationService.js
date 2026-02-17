import notifee, { 
  TriggerType, 
  AndroidImportance, 
  AndroidCategory,
  AndroidVisibility 
} from '@notifee/react-native';

/**
 * Service class for medication notifications and action handling.
 */
class NotificationService {
  constructor() {
    this.bootstrap();
  }

  /**
   * Initializes the notification channel.
   * Note: Incremented version to v3 to force Android to update channel settings.
   */
  async bootstrap() {
    await notifee.createChannel({
      id: 'medication_alarms_v3', // New ID to ensure settings update
      name: 'Urgent Medication Alarms',
      description: 'Critical and persistent alerts for medication.',
      importance: AndroidImportance.HIGH, 
      vibration: true,
      // LONG VIBRATION: Array of [vibrate, pause] pairs repeated to last ~1 minute
      vibrationPattern: Array(30).fill([1000, 1000]).flat(), 
      sound: 'default', 
      visibility: AndroidVisibility.PUBLIC,
      bypassDnd: true, // Attempt to bypass Do Not Disturb
    });
  }

  /**
   * Schedules a notification with high priority, persistent alert, and alarm category.
   */
  async scheduleMedication(id, name, dosage, date) {
    try {
      await notifee.requestPermission();

      const trigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: date.getTime(),
        alarmManager: true, // Use exact alarms
      };

      await notifee.createTriggerNotification(
        {
          id: id,
          title: '💊 MEDICATION REMINDER',
          body: `It is time to take your ${name} (${dosage}).`,
          data: {
            medicationId: id,
            scheduledAt: date.toISOString(),
          },
          android: {
            channelId: 'medication_alarms_v3',
            category: AndroidCategory.ALARM, // Categorize as Alarm for system priority
            importance: AndroidImportance.HIGH,
            priority: 'high',
            fullScreenIntent: true, // Push to front even if device is locked
            autoCancel: false,      // User must interact with buttons
            ongoing: true,         // Prevent notification from being swiped away
            pressAction: { id: 'default' },
            actions: [
              {
                title: '✅ MARK AS TAKEN',
                pressAction: { id: 'taken' },
              },
              {
                title: '⏰ SNOOZE (10 MIN)',
                pressAction: { id: 'snooze' },
              },
            ],
          },
        },
        trigger,
      );

      console.log(`[NotificationService] Scheduled: ${name} at ${date.toLocaleTimeString()}`);
    } catch (error) {
      console.error('[NotificationService] Scheduling Error:', error);
    }
  }

  /**
   * Re-schedules the notification for 10 minutes later.
   */
  async snoozeMedication(notification) {
    const { medicationId } = notification.data;
    
    // Safely extract name and dosage from body text
    const bodyText = notification.body || "";
    const name = bodyText.includes('your ') ? bodyText.split('your ')[1].split(' (')[0] : "Medication";
    const dosageMatch = bodyText.match(/\(([^)]+)\)/);
    const dosage = dosageMatch ? dosageMatch[1] : "";

    const snoozeDate = new Date(Date.now() + 10 * 60 * 1000); 

    await this.scheduleMedication(medicationId, name, dosage, snoozeDate);
    await notifee.cancelNotification(notification.id);
  }

  async cancelNotification(id) {
    await notifee.cancelNotification(id);
  }

  async cancelAll() {
    await notifee.cancelAllNotifications();
  }
}

export default new NotificationService();