import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();

const sanitizeKey = (key: string): string => key.replace(/[^a-zA-Z0-9_.-]/g, '_');

/**
 * Universal safe storage utility using Expo SecureStore with memory fallback.
 * Guarantees zero native module crashes in Expo Go / standalone builds.
 */
export const SafeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const validKey = sanitizeKey(key);
    try {
      const value = await SecureStore.getItemAsync(validKey);
      if (value !== null) return value;
      return memoryStore.get(validKey) ?? null;
    } catch {
      return memoryStore.get(validKey) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    const validKey = sanitizeKey(key);
    memoryStore.set(validKey, value);
    try {
      await SecureStore.setItemAsync(validKey, value);
    } catch (e) {
      console.error('SecureStore setItem error:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    const validKey = sanitizeKey(key);
    memoryStore.delete(validKey);
    try {
      await SecureStore.deleteItemAsync(validKey);
    } catch (e) {
      // SecureStore ignore error
    }
  },
};

