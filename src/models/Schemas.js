import { Realm } from '@realm/react';

// 1. MEDICATION LOGS: Track adherence and "Guilt Trip" data
export class MedicationLog extends Realm.Object {
  static schema = {
    name: 'MedicationLog',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      medicationId: 'uuid',
      medicationName: 'string',
      status: 'string', // 'taken', 'skipped', 'missed', 'snoozed'
      scheduledAt: 'date', // The time the user was SUPPOSED to take it
      takenAt: 'date',     // The time the user ACTUALLY took it
      delayMinutes: 'int', // (takenAt - scheduledAt) in minutes for reporting
    },
  };
}

// 2. MEDICATION: Core details with Inventory and Adjustment logic
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
      reminderTime: 'date', // This acts as the "Next Occurrence"
      createdAt: 'date',
      isActive: { type: 'bool', default: true },
      
      // --- SMART ADJUSTMENT FIELDS ---
      isAdjustable: { type: 'bool', default: false }, // If true, prompt to move next dose if late
      
      // --- INVENTORY FIELDS ---
      stock: { type: 'int', default: 0 },
      reorderLevel: { type: 'int', default: 5 },
      isInventoryEnabled: { type: 'bool', default: false },
      
      owner: { 
        type: 'linkingObjects', 
        objectType: 'Profile', 
        property: 'medications' 
      },
    },
  };
}

// 3. PROFILE: The User Account
export class Profile extends Realm.Object {
  static schema = {
    name: 'Profile',
    primaryKey: '_id',
    properties: {
      _id: 'uuid',
      firstName: 'string',
      relationship: 'string',
      color: 'string',
      icon: 'string',
      isMain: { type: 'bool', default: false },
      medications: 'Medication[]', 
    },
  };
}