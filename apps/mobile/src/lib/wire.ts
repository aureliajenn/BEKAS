import type { ApiError, GuideResult, IdeasResult, JobState, JobStatus, ProjectView, VerificationResult } from '../types/contracts';

// Bentuk wire FastAPI (services/api/app/schemas/projects.py) → ProjectView untuk layar.

type WireStatus = JobStatus | 'not_started';
type Component = { status: WireStatus; job_id?: string | null; error?: ApiError | null };

export type ProjectResponse = {
  project_id: string;
  ideas: IdeasResult | null;
  selected_idea_id: string | null;
  guide: GuideResult | null;
  // verification: PRD 1.3 §17.3; opsional sampai backend reward siap.
  components: { mesh: Component; ideas: Component; guide: Component; verification?: Component };
  verification?: VerificationResult | null;
  illustrations: Record<string, Component>;
  assets: { kind: 'input' | 'mesh' | 'illustration'; step_id: string | null; url: string }[];
};

const toJob = (c: Component): JobState => ({
  id: c.job_id ?? '',
  // not_started = job belum dibuat; di layar sama dengan menunggu giliran.
  status: c.status === 'not_started' ? 'queued' : c.status,
  error: c.error ?? undefined,
});

/** Ubah respons GET /projects/{id} ke ProjectView yang dipakai layar. */
export function fromApi(r: ProjectResponse): ProjectView {
  const asset = (kind: string, step: string | null = null) => r.assets.find((a) => a.kind === kind && a.step_id === step)?.url;
  return {
    id: r.project_id,
    input_url: asset('input'),
    mesh: { job: toJob(r.components.mesh), url: asset('mesh') },
    ideas: { job: toJob(r.components.ideas), result: r.ideas ?? undefined },
    selected_idea_id: r.selected_idea_id ?? undefined,
    guide: r.components.guide.status === 'not_started' ? undefined : { job: toJob(r.components.guide), result: r.guide ?? undefined },
    verification:
      !r.components.verification || r.components.verification.status === 'not_started'
        ? undefined
        : { job: toJob(r.components.verification), result: r.verification ?? undefined },
    illustrations: Object.fromEntries(
      Object.entries(r.illustrations).map(([step, c]) => [step, { job: toJob(c), url: asset('illustration', step) }]),
    ),
  };
}
