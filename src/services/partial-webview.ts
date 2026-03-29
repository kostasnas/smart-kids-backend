import { registerPlugin } from '@capacitor/core';

export interface PartialWebViewPlugin {
  open(options: { url: string }): Promise<{ success: boolean }>;
  close(): Promise<void>;
  getCurrentUrl(): Promise<{ url: string }>;
  addListener(event: 'urlChanged', handler: (data: { url: string }) => void): Promise<any>;
  addListener(event: 'pageLoaded', handler: (data: { url: string }) => void): Promise<any>;
  addListener(event: 'browserClosed', handler: () => void): Promise<any>;
  removeAllListeners(): Promise<void>;
}

const PartialWebView = registerPlugin<PartialWebViewPlugin>('PartialWebView', {
  web: () => ({
    async open({ url }: { url: string }) {
      window.open(url, '_blank');
      return { success: true };
    },
    async close() {},
    async getCurrentUrl() { return { url: window.location.href }; },
    async addListener(_: string, handler: any) {
      return { remove: () => {} };
    },
    async removeAllListeners() {},
  }),
});

export { PartialWebView };
