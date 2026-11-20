import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { DAILY_GOALS } from '../utils/activity';

const KEY = '@lyricsionary_daily_goal';
const listeners = new Set<(goal: number) => void>();

/** Quiz answers a day to aim for (0 is none), shared so the sidebar's goal and the Review button agree */
export function useDailyGoal(): [number, (goal: number) => void] {
  const [goal, setGoal] = useState(0);
  useEffect(() => {
    let cancelled = false;
    listeners.add(setGoal);
    AsyncStorage.getItem(KEY)
      .then((json) => {
        const saved: unknown = json === null ? null : JSON.parse(json);
        if (!cancelled && typeof saved === 'number' && DAILY_GOALS.includes(saved)) setGoal(saved);
      })
      .catch((e) => console.error(`Failed to load ${KEY}`, e));
    return () => {
      cancelled = true;
      listeners.delete(setGoal);
    };
  }, []);
  const update = (next: number) => {
    listeners.forEach((l) => l(next));
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch((e) => console.error(`Failed to save ${KEY}`, e));
  };
  return [goal, update];
}
