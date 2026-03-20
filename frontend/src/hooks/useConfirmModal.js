import { useState, useCallback } from 'react';

const CLOSED = { isOpen: false, message: '', onConfirm: null, confirmText: 'Confirm', isDangerous: false };

export default function useConfirmModal() {
  const [confirmState, setConfirmState] = useState(CLOSED);

  const confirm = useCallback((opts) => {
    setConfirmState({ ...CLOSED, isOpen: true, ...opts });
  }, []);

  const close = useCallback(() => {
    setConfirmState(CLOSED);
  }, []);

  return { confirmState, confirm, close };
}
