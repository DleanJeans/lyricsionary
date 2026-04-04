// Web shim for react-native-webview using a native <iframe>
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface WebViewProps {
  source?: { uri?: string };
  style?: any;
  onNavigationStateChange?: (state: { url: string }) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onMessage?: (event: any) => void;
  javaScriptEnabled?: boolean;
  ref?: any;
}

const WebView = React.forwardRef<any, WebViewProps>(
  ({ source, style, onLoadStart, onLoadEnd, onNavigationStateChange }, ref) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    React.useImperativeHandle(ref, () => ({
      injectJavaScript: () => {
        // Cannot inject JS into cross-origin iframes; no-op on web
      },
    }));

    return (
      <View style={[styles.container, style]}>
        <iframe
          ref={iframeRef}
          src={source?.uri}
          style={iframeStyles}
          onLoad={() => {
            onLoadEnd?.();
          }}
          title="WebView"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </View>
    );
  }
);

WebView.displayName = 'WebView';
export { WebView };
export default WebView;

const styles = StyleSheet.create({
  container: { flex: 1 },
});

const iframeStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  flex: 1,
};
