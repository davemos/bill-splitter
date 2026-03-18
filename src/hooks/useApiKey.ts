import * as SecureStore from 'expo-secure-store';
import { useState, useEffect, useCallback } from 'react';

const API_KEY_STORAGE_KEY = 'anthropic_api_key';

export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(API_KEY_STORAGE_KEY).then((key) => {
      setApiKeyState(key);
      setIsLoading(false);
    });
  }, []);

  const saveApiKey = useCallback(async (key: string) => {
    await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, key.trim());
    setApiKeyState(key.trim());
  }, []);

  const clearApiKey = useCallback(async () => {
    await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
    setApiKeyState(null);
  }, []);

  return { apiKey, isLoading, saveApiKey, clearApiKey };
}
