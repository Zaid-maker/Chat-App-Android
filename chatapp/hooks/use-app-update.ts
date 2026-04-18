import { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

type GithubAsset = {
  name: string;
  browser_download_url: string;
};

type GithubRelease = {
  tag_name: string;
  name?: string;
  body?: string | null;
  html_url: string;
  assets: GithubAsset[];
};

type UpdateConfig = {
  githubOwner?: string;
  githubRepo?: string;
};

type ReleaseMetadata = {
  version?: string;
  buildNumber?: number;
  notes?: string;
  apkUrl?: string;
};

type UpdateState = {
  checking: boolean;
  downloading: boolean;
  available: boolean;
  currentBuildNumber: number;
  latestBuildNumber: number;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseUrl: string;
  apkUrl: string;
  notes: string;
  error: string | null;
};

const EMPTY_STATE: UpdateState = {
  checking: false,
  downloading: false,
  available: false,
  currentBuildNumber: 0,
  latestBuildNumber: 0,
  currentVersion: '0.0.0',
  latestVersion: '',
  releaseName: '',
  releaseUrl: '',
  apkUrl: '',
  notes: '',
  error: null,
};

const UPDATE_APK_NAME = 'chatapp-update.apk';

const getUpdateConfig = (): UpdateConfig => {
  const extra = Constants.expoConfig?.extra as { update?: UpdateConfig } | undefined;
  return extra?.update || {};
};

const safeJsonParse = (value?: string | null): ReleaseMetadata => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as ReleaseMetadata;
    }
  } catch {
    return {};
  }

  return {};
};

const parseBuildNumber = (value?: string | null) => {
  if (!value) return 0;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    return numericValue;
  }

  const match = value.match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
};

export function useAppUpdate() {
  const [state, setState] = useState<UpdateState>(EMPTY_STATE);
  const updateConfig = useMemo(() => getUpdateConfig(), []);

  const checkForUpdate = useCallback(async () => {
    if (!updateConfig.githubOwner || !updateConfig.githubRepo) {
      setState((prev) => ({
        ...prev,
        checking: false,
        error: 'Missing GitHub release configuration.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, checking: true, error: null }));

    try {
      const response = await fetch(
        `https://api.github.com/repos/${updateConfig.githubOwner}/${updateConfig.githubRepo}/releases/latest`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub releases request failed with ${response.status}`);
      }

      const release = (await response.json()) as GithubRelease;
      const metadata = safeJsonParse(release.body);
      const apkAsset = release.assets.find((asset) => asset.name.toLowerCase().endsWith('.apk'));

      const currentBuildNumber = parseBuildNumber(Application.nativeBuildVersion);
      const latestBuildNumber = metadata.buildNumber || parseBuildNumber(release.tag_name);
      const currentVersion = Application.nativeApplicationVersion || '0.0.0';
      const latestVersion = metadata.version || release.name || release.tag_name;
      const apkUrl = metadata.apkUrl || apkAsset?.browser_download_url || '';
      const notes = metadata.notes || '';

      setState({
        checking: false,
        downloading: false,
        available: latestBuildNumber > currentBuildNumber && apkUrl.length > 0,
        currentBuildNumber,
        latestBuildNumber,
        currentVersion,
        latestVersion,
        releaseName: release.name || release.tag_name,
        releaseUrl: release.html_url,
        apkUrl,
        notes,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        checking: false,
        error: error?.message || 'Failed to check for updates.',
      }));
    }
  }, [updateConfig.githubOwner, updateConfig.githubRepo]);

  const installUpdate = useCallback(async () => {
    if (!state.apkUrl) {
      Alert.alert('Update unavailable', 'No APK asset was attached to the latest release.');
      return;
    }

    if (Platform.OS !== 'android') {
      await Linking.openURL(state.releaseUrl || state.apkUrl);
      return;
    }

    setState((prev) => ({ ...prev, downloading: true, error: null }));

    try {
      const downloadTarget = new File(Paths.document, UPDATE_APK_NAME).uri;
      const downloadedFile = await FileSystem.downloadAsync(state.apkUrl, downloadTarget);
      const contentUri = await FileSystem.getContentUriAsync(downloadedFile.uri);

      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'application/vnd.android.package-archive',
      });
    } catch (error: any) {
      Alert.alert('Install failed', error?.message || 'Unable to download or open the APK.');
    } finally {
      setState((prev) => ({ ...prev, downloading: false }));
    }
  }, [state.apkUrl, state.releaseUrl]);

  return {
    checking: state.checking,
    downloading: state.downloading,
    available: state.available,
    currentBuildNumber: state.currentBuildNumber,
    latestBuildNumber: state.latestBuildNumber,
    currentVersion: state.currentVersion,
    latestVersion: state.latestVersion,
    releaseName: state.releaseName,
    releaseUrl: state.releaseUrl,
    notes: state.notes,
    error: state.error,
    checkForUpdate,
    installUpdate,
  };
}