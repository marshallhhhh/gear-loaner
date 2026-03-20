import { useCallback, useState } from 'react';

export default function useAlertModal() {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    message: '',
    title: 'Notice',
    okText: 'Ok',
  });

  const showAlert = useCallback((message, options = {}) => {
    setAlertState({
      isOpen: true,
      message,
      title: options.title ?? 'Notice',
      okText: options.okText ?? 'Ok',
    });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { alertState, showAlert, closeAlert };
}