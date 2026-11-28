import * as SecureStore from "expo-secure-store";

const SECURE_KEY = "parksmart_refresh_token";

// In-memory fallback if SecureStore is unavailable in certain environments (e.g., SSR or web testing)
let memoryRefreshToken: string | null = null;

// Native availability never changes at runtime; ask once and reuse the promise.
let availabilityPromise: Promise<boolean> | null = null;
function secureAvailable(): Promise<boolean> {
  return (availabilityPromise ??= SecureStore.isAvailableAsync().catch(() => false));
}

export const SessionStore = {
  async load(): Promise<string | null> {
    try {
      const isAvailable = await secureAvailable();
      if (isAvailable) {
        const token = await SecureStore.getItemAsync(SECURE_KEY);
        return token || memoryRefreshToken;
      }
    } catch {
      // Fallback on error
    }
    return memoryRefreshToken;
  },

  async save(refreshToken: string): Promise<void> {
    memoryRefreshToken = refreshToken;
    try {
      const isAvailable = await secureAvailable();
      if (isAvailable) {
        await SecureStore.setItemAsync(SECURE_KEY, refreshToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
    } catch {
      // Swallowed: memory copy already updated
    }
  },

  async clear(): Promise<void> {
    memoryRefreshToken = null;
    try {
      const isAvailable = await secureAvailable();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(SECURE_KEY);
      }
    } catch {
      // Swallowed
    }
  },
};
