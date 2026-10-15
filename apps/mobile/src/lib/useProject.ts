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
    settled(p.verification?.job) &&
    Object.values(p.illustrations).every((i) => settled(i.job))
  );
}

/**
 * Polling 2,5 detik saat foreground, melambat ke 6 detik setelah ±1 menit menunggu (PRD §9).
 * Setelah semua job selesai, refetch tiap 5 menit hanya untuk menyegarkan signed URL aset.
 * Berhenti saat app di background (focusManager di _layout).
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => getProject(id),
    refetchInterval: (q) => (allSettled(q.state.data) ? 300_000 : q.state.dataUpdateCount > 24 ? 6000 : 2500),
    refetchOnWindowFocus: true,
    enabled: !!id,
  });
}
