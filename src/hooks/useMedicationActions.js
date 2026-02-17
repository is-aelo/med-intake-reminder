import { useRealm } from '@realm/react';
import { useState } from 'react';

export const useMedicationActions = (onSuccess) => {
  const realm = useRealm();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMedication = (medication) => {
    if (!medication) return;

    try {
      setIsDeleting(true);
      realm.write(() => {
        realm.delete(medication);
      });
      
      // Tawagin ang callback (halimbawa: onBack o i-close ang modal)
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Critical: Failed to delete medication:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteMedication,
    isDeleting
  };
};