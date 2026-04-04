import './global.css';

import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import SearchScreen from './src/screens/SearchScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      Lyricsionary
      <StatusBar style="light" backgroundColor="#000000" />
      <SearchScreen />
    </QueryClientProvider>
  );
}

