import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export interface AudioPlayerHandle {
  play: (url: string) => void;
}

interface Props {
  /** Called when a recording ends or fails to play */
  onFinished: (url: string) => void;
}

// Plays in a hidden WebView so it needs no native audio module, and upload.wikimedia.org gets the same
// browser requests it serves the Wiktionary page (it rejects some generic user agents)
const PLAYER_HTML = `<!DOCTYPE html><html><body><script>
  var audio = new Audio();
  var current = '';
  function finish() { window.ReactNativeWebView.postMessage(current); }
  audio.onended = finish;
  audio.onerror = finish;
  window.playAudio = function (url) {
    audio.pause();
    current = url;
    audio.src = url;
    audio.play().catch(finish);
  };
</script></body></html>`;

const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(({ onFinished }, ref) => {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    play: (url) => webViewRef.current?.injectJavaScript(`window.playAudio && window.playAudio(${JSON.stringify(url)}); true;`),
  }));

  return (
    <WebView
      ref={webViewRef}
      source={{ html: PLAYER_HTML, baseUrl: 'https://en.wiktionary.org/' }}
      style={styles.player}
      javaScriptEnabled
      mediaPlaybackRequiresUserAction={false}
      onMessage={(event) => onFinished(event.nativeEvent.data)}
    />
  );
});

AudioPlayer.displayName = 'AudioPlayer';
export default AudioPlayer;

const styles = StyleSheet.create({
  player: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
