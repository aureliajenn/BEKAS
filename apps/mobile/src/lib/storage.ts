import AsyncStorage from '@react-native-async-storage/async-storage';

// Hanya referensi lokal; UUID proyek bukan autentikasi (PRD §10).
const ACTIVE = 'bekas:active_project';

export const getActiveProject = () => AsyncStorage.getItem(ACTIVE);
export const setActiveProject = (id: string) => AsyncStorage.setItem(ACTIVE, id);
export const clearActiveProject = () => AsyncStorage.removeItem(ACTIVE);

export async function getDoneSteps(projectId: string): Promise<string[]> {
  return JSON.parse((await AsyncStorage.getItem(`bekas:done:${projectId}`)) ?? '[]');
}

export const setDoneSteps = (projectId: string, ids: string[]) =>
  AsyncStorage.setItem(`bekas:done:${projectId}`, JSON.stringify(ids));

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export const setJSON = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));
