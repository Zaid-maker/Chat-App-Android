import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStorage: { [key: string]: string } = {};

type StorageBackend = 'asyncStorage' | 'localStorage' | 'memory';

// Toggle to true temporarily when you need to debug storage backend selection.
const LOG_STORAGE_BACKEND_FALLBACK = false;

let resolvedBackend: StorageBackend | null = null;
let resolvingBackend: Promise<StorageBackend> | null = null;

const logFallback = (message: string, error?: unknown) => {
    if (!LOG_STORAGE_BACKEND_FALLBACK) return;
    if (error) {
        console.warn(message, error);
        return;
    }
    console.warn(message);
};

const getLocalStorage = (): Storage | null => {
    try {
        if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
            return globalThis.localStorage;
        }
    } catch {
        return null;
    }
    return null;
};

const resolveBackend = async (): Promise<StorageBackend> => {
    if (resolvedBackend) return resolvedBackend;
    if (resolvingBackend) return resolvingBackend;

    resolvingBackend = (async () => {
        try {
            const probeKey = '__storage_probe__';
            await AsyncStorage.setItem(probeKey, '1');
            await AsyncStorage.removeItem(probeKey);
            resolvedBackend = 'asyncStorage';
            return resolvedBackend;
        } catch (e) {
            const local = getLocalStorage();
            if (local) {
                logFallback('AsyncStorage unavailable, using localStorage fallback.');
                resolvedBackend = 'localStorage';
                return resolvedBackend;
            }

            logFallback('AsyncStorage unavailable, using memory fallback:', e);
            resolvedBackend = 'memory';
            return resolvedBackend;
        } finally {
            resolvingBackend = null;
        }
    })();

    return resolvingBackend;
};

const storage = {
    setItem: async (key: string, value: string) => {
        const backend = await resolveBackend();

        if (backend === 'asyncStorage') {
            await AsyncStorage.setItem(key, value);
            return;
        }

        if (backend === 'localStorage') {
            getLocalStorage()?.setItem(key, value);
            return;
        }

        memoryStorage[key] = value;
    },
    getItem: async (key: string) => {
        const backend = await resolveBackend();

        if (backend === 'asyncStorage') {
            const value = await AsyncStorage.getItem(key);
            return value;
        }

        if (backend === 'localStorage') {
            return getLocalStorage()?.getItem(key) ?? null;
        }

        return memoryStorage[key] || null;
    },
    removeItem: async (key: string) => {
        const backend = await resolveBackend();

        if (backend === 'asyncStorage') {
            await AsyncStorage.removeItem(key);
        } else if (backend === 'localStorage') {
            getLocalStorage()?.removeItem(key);
        }

        delete memoryStorage[key];
    },
    clear: async () => {
        const backend = await resolveBackend();

        if (backend === 'asyncStorage') {
            await AsyncStorage.clear();
        } else if (backend === 'localStorage') {
            getLocalStorage()?.clear();
        }

        for (const key in memoryStorage) delete memoryStorage[key];
    }
};

export default storage;
