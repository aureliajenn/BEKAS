import { Asset } from 'expo-asset';

import { icon3d, pencilInitialAssets } from '@/theme/assets';
import type { ApiError, JobState, ProjectView, VerificationResult } from '@/types/contracts';

import { needsNewPhoto, pencilAssetsForStep, pencilIdeaId, sampleGuide, sampleIdeas } from './fixtures';
import { getJSON, listKeys, setJSON } from './storage';
import { fromApi, type ProjectResponse } from './wire';

const BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
export const USE_FIXTURES = process.env.EXPO_PUBLIC_USE_FIXTURES === 'true' || !BASE;

export class ApiFailure extends Error {
  constructor(public detail: ApiError) {
    super(detail.message);
  }
}

export async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiFailure(
      body?.code
        ? body
        : { code: `http_${res.status}`, message: 'Server sedang bermasalah.', retryable: res.status >= 500 },
    );
  }
  return body as T;
}

// Minimal 16 karakter (syarat header Idempotency-Key di backend).
export const newKey = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

type Pending = { key: string; projectId?: string };

/**
 * Buat proyek → PUT foto ke signed URL → mulai job.
 * Key + project ID disimpan lokal: retry setelah putus memakai key yang sama sehingga backend
 * mengembalikan proyek yang sama (dengan signed URL baru), bukan proyek ganda.
 */
export async function createProject(photoUri: string, scenario: Scenario = 'normal'): Promise<string> {
  if (USE_FIXTURES) return fixtureCreate(photoUri, scenario);

  const pending = (await getJSON<Pending>('bekas:pending')) ?? { key: newKey() };
  await setJSON('bekas:pending', pending);

  let projectId = pending.projectId;
  try {
    const created = await call<CreateProjectResponse>('/projects', {
      method: 'POST',
      headers: { 'Idempotency-Key': pending.key },
    });
    projectId = created.project_id;
    await setJSON('bekas:pending', { ...pending, projectId });

    const { url, method, headers } = created.upload_target;
    const up = await fetch(url, { method, headers, body: await (await fetch(photoUri)).blob() });
    if (!up.ok) throw new ApiFailure({ code: 'upload_failed', message: 'Upload foto gagal.', retryable: true });
  } catch (e) {
    // Start sukses tapi respons hilang: key sudah terpakai, lanjut ke start (idempoten).
    if (!(e instanceof ApiFailure && e.detail.code === 'project_already_started' && projectId)) throw e;
  }

  await call(`/projects/${projectId}/start`, { method: 'POST' });
  await setJSON('bekas:pending', null);
  return projectId!;
}

export async function getProject(id: string): Promise<ProjectView> {
  if (USE_FIXTURES) return fixtureProject(id);
  return fromApi(await call<ProjectResponse>(`/projects/${id}`));
}

export async function requestGuide(id: string, ideaId: string): Promise<void> {
  if (USE_FIXTURES) {
    const s = await fixtureState(id);
    if (!s.ideaId) await setJSON(`bekas:fixture:${id}`, { ...s, ideaId, guideAt: Date.now() });
    return;
  }
  // Key stabil per proyek+ide: tap ganda tidak membuat panduan kedua.
  await call(`/projects/${id}/guide`, {
    method: 'POST',
    headers: { 'Idempotency-Key': `guide-${id}-${ideaId}` },
    body: JSON.stringify({ idea_id: ideaId }),
  });
}

export async function retryJob(id: string, jobId: string): Promise<void> {
  if (USE_FIXTURES) {
    const s = await fixtureState(id);
    await setJSON(`bekas:fixture:${id}`, { ...s, retries: { ...s.retries, [jobId]: Date.now() } });
    return;
  }
  // Backend hanya me-retry job yang gagal, jadi tap ganda cukup ditolak di sana.
  await call(`/projects/${id}/retry`, {
    method: 'POST',
    headers: { 'Idempotency-Key': newKey() },
    body: JSON.stringify({ job_id: jobId }),
  });
}

export type CreateProjectResponse = {
  project_id: string;
  upload_target: { url: string; method: 'PUT'; headers: Record<string, string> };
};

// ---------- Fixture: setiap state DESIGN.md §7 bisa dipicu lewat skenario ----------

export const scenarios = {
  normal: 'Alur normal sampai selesai',
  upload_fail: 'Upload gagal sekali',
  needs_new_photo: 'Foto tidak sesuai',
  gpu_unavailable: 'Pembuat 3D tidak tersedia',
  mesh_fail: 'Model 3D gagal',
  ideas_fail: 'Ide gagal dibuat',
  guide_fail: 'Panduan gagal dibuat',
  illustration_fail: 'Ilustrasi langkah 3 gagal',
  offline: 'Koneksi terputus 10 detik',
  verify_rejected: 'Verifikasi ditolak sekali',
} as const;
export type Scenario = keyof typeof scenarios;

export type FixtureState = {
  createdAt: number;
  inputUri: string;
  scenario: Scenario;
  ideaId?: string;
  guideAt?: number;
  retries?: Record<string, number>;
  /** Verifikasi foto sesudah (PRD §17). */
  verifyAt?: number;
  afterUri?: string;
  verifyAttempts?: number;
  /** RW saat verifikasi, dibekukan untuk leaderboard (PRD §17.4). */
  rwId?: string | null;
};

/** URI aset lokal, dipakai sebagai foto contoh dan ilustrasi contoh. */
export const assetUri = (mod: number) => Asset.fromModule(mod).uri;
const sampleIllustrations = [icon3d.botol, icon3d.tasDaur, icon3d.tongBio, icon3d.daun, icon3d.tanamanListrik, icon3d.tasHijau];

let uploadFailedOnce = false;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fixtureCreate(photoUri: string, scenario: Scenario) {
  await sleep(1200);
  if (scenario === 'upload_fail' && !uploadFailedOnce) {
    uploadFailedOnce = true;
    throw new ApiFailure({ code: 'upload_failed', message: 'Koneksi terputus saat mengunggah.', retryable: true });
  }
  const id = `contoh-${Date.now().toString(36)}`;
  await setJSON(`bekas:fixture:${id}`, { createdAt: Date.now(), inputUri: photoUri, scenario } satisfies FixtureState);
  return id;
}

export async function fixtureState(id: string): Promise<FixtureState> {
  return (await getJSON<FixtureState>(`bekas:fixture:${id}`)) ?? { createdAt: Date.now(), inputUri: '', scenario: 'normal' };
}

export const setFixtureState = (id: string, s: FixtureState) => setJSON(`bekas:fixture:${id}`, s);

/** Semua proyek contoh di HP ini; dompet contoh diturunkan dari sini supaya kredit poin tidak ganda. */
export async function listFixtureProjects(): Promise<{ id: string; s: FixtureState }[]> {
  const keys = await listKeys('bekas:fixture:contoh-');
  return Promise.all(keys.map(async (k) => ({ id: k.slice('bekas:fixture:'.length), s: (await getJSON<FixtureState>(k))! })));
}

export const UPCYCLE_POINTS = 500;

/** Verifikasi contoh: antre 1 dtk, diperiksa 3 dtk; skenario verify_rejected menolak percobaan pertama. */
export function fixtureVerification(s: FixtureState): { job: JobState; result?: VerificationResult } | undefined {
  if (!s.verifyAt) return undefined;
  const t = Date.now() - s.verifyAt;
  const job: JobState = { id: 'job-verification', status: t < 1000 ? 'queued' : t < 4000 ? 'running' : 'succeeded' };
  if (job.status !== 'succeeded') return { job };
  const rejected = s.scenario === 'verify_rejected' && (s.verifyAttempts ?? 1) === 1;
  return {
    job,
    result: rejected
      ? { approved: false, points: 0, reason: 'Foto belum menunjukkan hasil olahan dari botol yang sama. Coba foto hasilnya dari dekat dengan cahaya terang.' }
      : { approved: true, points: UPCYCLE_POINTS },
  };
}

/** Status job dari waktu berjalan; job yang di-retry berjalan 2 detik lalu sukses. */
function job(s: FixtureState, id: string, t: number, queuedUntil: number, doneAt: number, fail: boolean): JobState {
  const retriedAt = s.retries?.[id];
  if (retriedAt) return { id, status: Date.now() - retriedAt < 2000 ? 'running' : 'succeeded' };
  if (fail && t >= doneAt) {
    return { id, status: 'failed', error: { code: 'fixture_failure', message: 'Gagal (skenario contoh).', retryable: true, job_id: id } };
  }
  return { id, status: t < queuedUntil ? 'queued' : t < doneAt ? 'running' : 'succeeded' };
}

async function fixtureProject(id: string): Promise<ProjectView> {
  const s = await fixtureState(id);
  const t = Date.now() - s.createdAt;
  const sc = s.scenario;

  if (sc === 'offline' && t > 5000 && t < 15000) {
    throw new ApiFailure({ code: 'network', message: 'Koneksi terputus.', retryable: true });
  }

  const mesh = sc === 'gpu_unavailable' ? ({ id: 'job-mesh', status: 'queued' } as JobState) : job(s, 'job-mesh', t, 4000, 12000, sc === 'mesh_fail');
  const ideas = job(s, 'job-ideas', t, 800, 4000, sc === 'ideas_fail');
  const meshReady = mesh.status === 'succeeded';

  const view: ProjectView = {
    id,
    is_fixture: true,
    input_url: s.inputUri,
    mesh: {
      job: mesh,
      url: meshReady ? assetUri(pencilInitialAssets.model) : undefined,
      model: 'Contoh tersimpan',
      worker_state: sc === 'gpu_unavailable' ? 'unavailable' : mesh.status === 'running' && t < 7000 && !s.retries?.[mesh.id] ? 'preparing' : undefined,
    },
    ideas: { job: ideas, result: ideas.status === 'succeeded' ? (sc === 'needs_new_photo' ? needsNewPhoto : sampleIdeas) : undefined },
    illustrations: {},
    verification: fixtureVerification(s),
  };

  if (s.ideaId && s.guideAt) {
    const g = Date.now() - s.guideAt;
    const guide = job(s, 'job-guide', g, 300, 2500, sc === 'guide_fail');
    const result = guide.status === 'succeeded' ? sampleGuide(s.ideaId) : undefined;
    view.selected_idea_id = s.ideaId;
    view.guide = { job: guide, result };
    if (s.ideaId === pencilIdeaId) {
      result?.steps.forEach((step) => {
        const illustration = pencilAssetsForStep(step.id)?.illustration;
        if (illustration) {
          view.illustrations[step.id] = {
            job: { id: `job-ill-${step.id}`, status: 'succeeded' },
            url: assetUri(illustration),
          };
        }
      });
      return view;
    }
    // Ilustrasi dihitung sejak panduan siap; langkah 1 digambar dulu.
    const since = s.retries?.['job-guide'] ? Date.now() - s.retries['job-guide'] - 2000 : g - 2500;
    result?.steps.forEach((step, i) => {
      const ill = job(s, `job-ill-${step.id}`, since, i * 3000, 3000 + i * 3000, sc === 'illustration_fail' && i === 2);
      view.illustrations[step.id] = {
        job: ill,
        url: ill.status === 'succeeded' ? assetUri(sampleIllustrations[i % sampleIllustrations.length]) : undefined,
      };
    });
  }
  return view;
}
