import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import {
  clearLastCrash,
  CrashReport,
  formatCrash,
  installGlobalCrashHandlers,
  loadLastCrash,
  saveCrash,
  subscribeToCrashes,
  toReport,
} from '../services/crashReport';

installGlobalCrashHandlers();

const CrashScreen = ({ report, previous, onRetry }: { report: CrashReport; previous: boolean; onRetry: () => void }) => {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(formatCrash(report));
    setCopied(true);
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        <Ionicons name="bug-outline" size={26} color={Colors.danger} />
        <Text style={styles.title}>{previous ? 'The app crashed last time' : 'Something went wrong'}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 16 }}>
        <Text style={styles.meta}>{report.kind} error · {new Date(report.at).toLocaleString()}</Text>
        <Text selectable style={styles.message}>{report.message}</Text>
        {!!report.stack && <Text selectable style={styles.stack}>{report.stack}</Text>}
        {!!report.componentStack && (
          <>
            <Text style={styles.section}>Component stack</Text>
            <Text selectable style={styles.stack}>{report.componentStack.trim()}</Text>
          </>
        )}
      </ScrollView>
      <View style={[styles.buttons, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        <Pressable style={[styles.button, styles.outline]} onPress={copy}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={Colors.text} />
          <Text style={styles.buttonText}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.filled]} onPress={onRetry}>
          <Ionicons name="refresh" size={18} color={Colors.white} />
          <Text style={styles.buttonText}>{previous ? 'Continue' : 'Try again'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

interface BoundaryProps {
  children: React.ReactNode;
  onCrash: (report: CrashReport) => void;
}

class Boundary extends React.Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const report = toReport(error, 'render', { componentStack: info.componentStack ?? undefined, shown: true });
    void saveCrash(report);
    this.props.onCrash(report);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Wraps the whole app: shows the error instead of a blank screen, and the last crash after a restart
export default function CrashGuard({ children }: { children: React.ReactNode }) {
  const [report, setReport] = useState<CrashReport | null>(null);
  const [previous, setPrevious] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    void loadLastCrash().then((last) => {
      // A crash that was never shown (the app died first) is shown now; rejections are only kept
      if (mounted && last && last.kind !== 'rejection' && !last.shown) {
        setPrevious(true);
        setReport(last);
        void saveCrash({ ...last, shown: true });
      }
    });
    const unsubscribe = subscribeToCrashes((r) => {
      setPrevious(false);
      setReport(r);
      void saveCrash({ ...r, shown: true });
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const retry = useCallback(() => {
    setReport(null);
    setPrevious(false);
    setAttempt((a) => a + 1);
  }, []);

  return (
    <SafeAreaProvider>
      {report ? (
        <CrashScreen report={report} previous={previous} onRetry={retry} />
      ) : (
        <Boundary key={attempt} onCrash={setReport}>
          {children}
        </Boundary>
      )}
    </SafeAreaProvider>
  );
}

// Used to read the last stored crash from elsewhere (e.g. a settings screen)
export { clearLastCrash, loadLastCrash };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  scroll: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 12 },
  meta: { color: Colors.textMuted, fontSize: 12, marginBottom: 8 },
  message: { color: Colors.danger, fontSize: 15, fontWeight: '600', marginBottom: 10 },
  section: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 14, marginBottom: 4 },
  stack: { color: Colors.textSecondary, fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },
  buttons: { flexDirection: 'row', gap: 12, paddingTop: 12 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  outline: { borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  filled: { backgroundColor: Colors.primary },
  buttonText: { color: Colors.text, fontSize: 15, fontWeight: '600' },
});
