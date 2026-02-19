import type { Json } from '@/lib/database.types';

export type RemoteConfig = { [key: string]: Json | undefined };

export const defaultConfig: RemoteConfig = {
  forceUpdate: {
    enabled: false,
    minVersionIOS: '2.0.0',
    minVersionAndroid: '2.0.0'
  },
  features: {
    reviewEmailSignInEnabled: true
  },
  lastUpdated: '2026-01-22T12:00:00Z'
};
