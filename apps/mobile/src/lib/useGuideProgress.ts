import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getDoneSteps, setDoneSteps } from './storage';

export function useGuideProgress(projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['guide-progress', projectId];
  const query = useQuery({
    queryKey,
    queryFn: () => getDoneSteps(projectId),
    staleTime: Infinity,
  });
  const mutation = useMutation({
    mutationFn: async (steps: string[]) => {
      await setDoneSteps(projectId, steps);
      return steps;
    },
    onSuccess: (steps) => queryClient.setQueryData(queryKey, steps),
  });

  const save = async (steps: string[]) => {
    if (mutation.isPending || query.isPending || query.isError) return false;
    try {
      await mutation.mutateAsync(steps);
      return true;
    } catch {
      return false;
    }
  };

  return {
    done: query.data ?? [],
    loading: query.isPending,
    loadError: query.isError,
    saveError: mutation.isError,
    saving: mutation.isPending,
    reload: query.refetch,
    save,
  };
}
