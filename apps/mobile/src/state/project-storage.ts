import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GuideResult, IdeasResult } from '@/types/contracts';

const ACTIVE_PROJECT_KEY = '@bekas/active-project/v1';

export interface ActiveProject {
  id: string;
  photoUri: string;
  createdAt: string;
  source: 'fixture';
  result: IdeasResult;
  selectedIdeaId: string | null;
  guide: GuideResult | null;
  completedStepIds: string[];
}

export async function getActiveProject(): Promise<ActiveProject | null> {
  const value = await AsyncStorage.getItem(ACTIVE_PROJECT_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as ActiveProject;
  } catch {
    await AsyncStorage.removeItem(ACTIVE_PROJECT_KEY);
    return null;
  }
}

export async function saveActiveProject(project: ActiveProject): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_PROJECT_KEY, JSON.stringify(project));
}
