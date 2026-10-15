import { fixtureIdeas } from '@/data/fixtures';
import type { ActiveProject } from '@/state/project-storage';

export const FIXTURES_ENABLED = process.env.EXPO_PUBLIC_USE_FIXTURES !== 'false';

export function createFixtureProject(photoUri: string): ActiveProject {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    photoUri,
    createdAt: new Date().toISOString(),
    source: 'fixture',
    result: fixtureIdeas,
    selectedIdeaId: null,
    guide: null,
    completedStepIds: [],
  };
}
