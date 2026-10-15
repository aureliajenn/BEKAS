import { useQuery } from '@tanstack/react-query';

import type { JobState, ProjectView } from '@/types/contracts';

import { getProject } from './api';

const settled = (j?: JobState) => !j || j.status === 'succeeded' || j.status === 'failed';

function allSettled(p?: ProjectView) {
  if (!p) return false;
  return (
    settled(p.mesh.job) &&
    settled(p.ideas.job) &&
    settled(p.guide?.job) &&
    Object.values(p.illustrations).every((i) => settled(i.job))
  );
}

/** Polling 2,5 detik saat foreground; berhenti sendiri ketika semua job selesai/gagal. */
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    refetchInterval: (q) => (allSettled(q.state.data) ? false : 2500),
    refetchOnWindowFocus: true,
    enabled: !!id,
  });
}
