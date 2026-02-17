import { Realm } from '@realm/react';

// 1. LOGS: To track "Taken" or "Skipped" history
export class MedicationLog extends Realm.Object {
  static schema = {
    name: 'MedicationLog',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      medicationId: 'uuid',
      status: 'string', // 'taken', 'skipped', 'missed'
      takenAt: 'date',
    },
  };
}

// 2. MEDICATION: The specific medicine details
export class Medication extends Realm.Object {
  static schema = {
    name: 'Medication',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      name: 'string',
      dosage: 'string',
      unit: 'string',
      category: 'string',
      isPermanent: 'bool',
      duration: 'string?',
      frequency: 'string',
      intervalValue: 'string?',
      startDate: 'date',
      reminderTime: 'date',
      createdAt: 'date',
      isActive: { type: 'bool', default: true },
      owner: { 
        type: 'linkingObjects', 
        objectType: 'Profile', 
        property: 'medications' 
      },
    },
  };
}

// 3. PROFILE: The "Person" (The 3-5 users)
export class Profile extends Realm.Object {
  static schema = {
    name: 'Profile',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      firstName: 'string',
      relationship: 'string', // e.g., 'Self', 'Mother', 'Child'
      color: 'string',        // Hex code (e.g., '#2D5A27')
      icon: 'string',         // Icon name (e.g., 'account', 'baby-face', 'human-old')
      isMain: { type: 'bool', default: false },
      medications: 'Medication[]', 
    },
  };
}