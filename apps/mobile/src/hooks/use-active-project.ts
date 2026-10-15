import { useEffect, useState } from 'react';

import { getActiveProject, type ActiveProject } from '@/state/project-storage';

export function useActiveProject(projectId?: string) {
  const [project, setProject] = useState<ActiveProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getActiveProject()
      .then((value) => {
        if (mounted) setProject(value && (!projectId || value.id === projectId) ? value : null);
      })
      .catch(() => {
        if (mounted) setProject(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  return { project, setProject, loading };
}
