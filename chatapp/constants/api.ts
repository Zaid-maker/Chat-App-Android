import axios from 'axios';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const PORT = '5000';
const FALLBACK_SERVER_IP = '192.168.100.204';

const parseHost = (value?: string | null): string | null => {
    if (!value) return null;

    const raw = value.includes('://') ? value : `http://${value}`;
    try {
        return new URL(raw).hostname || null;
    } catch {
        return null;
    }
};

const getExpoHost = (): string | null => {
    const hostUri = Constants.expoConfig?.hostUri;
    return parseHost(hostUri);
};

const getMetroHost = (): string | null => {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (!scriptURL) {
        return null;
    }

    try {
        const hostname = new URL(scriptURL).hostname;
        if (!hostname) {
            return null;
        }

        // Android emulator cannot reach localhost on host machine directly.
        if (hostname === 'localhost' && Platform.OS === 'android') {
            return '10.0.2.2';
        }

        return hostname;
    } catch {
        return null;
    }
};

const SERVER_IP =
    process.env.EXPO_PUBLIC_SERVER_IP ||
    (__DEV__ ? getExpoHost() : null) ||
    (__DEV__ ? getMetroHost() : null) ||
    FALLBACK_SERVER_IP;

export const API_BASE_URL = `http://${SERVER_IP}:${PORT}/api`;
export const SOCKET_URL = `http://${SERVER_IP}:${PORT}`;

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
