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
      id: 'medication_alarms', // Bagong ID para sa alarm behavior
      name: 'Medication Alarms',
      description: 'Critical health reminders with sound.',
      importance: AndroidImportance.HIGH, 
      vibration: true,
      sound: 'med_alarm', // Tinuturo ang med_alarm.mp3 sa res/raw
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
          title: '💊 Medication Alarm',
          body: `Time for your ${dosage} of ${name}.`,
          data: {
            medicationId: stringId, 
            medicationName: String(name), 
            dosage: String(dosage), 
            scheduledAt: originalScheduledTime || new Date(scheduledTime).toISOString(),
            isAlarm: 'true', // Flag para malaman ng App.js na alarm ito
          },
          android: {
            channelId: 'medication_alarms',
            category: AndroidCategory.ALARM,
            importance: AndroidImportance.HIGH,
            priority: 'high',
            visibility: AndroidVisibility.PUBLIC,
            
            // --- SOUND CONFIG ---
            sound: 'med_alarm', 

            // --- THE ALARM TRIGGER ---
            // Ito ang magbubukas sa App.js para ipakita ang Overlay
            fullScreenAction: {
              id: 'default',
            },

            // Ginawang true para hindi ma-swipe hangga't hindi ini-ignore o tina-take
            ongoing: true, 
            autoCancel: false,

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
                title: '⏰ Snooze',
                pressAction: { id: 'snooze' },
              },
            ],
          },
        },
        trigger,
      );

      console.log(`[NotificationService] Alarm Scheduled: ${name} with med_alarm sound.`);
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
      // 10 minutes snooze
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