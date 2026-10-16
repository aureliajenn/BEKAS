import type { JobKind, JobStatus } from '@/types/contracts';
import type { ProjectResponse } from '@/lib/wire';

type CreateProjectResponse = {
  project_id: string;
  status: 'upload_pending';
  upload_target: { bucket: string; path: string; url: string; method: 'PUT'; headers: Record<string, string> };
  upload_expires_at: string;
};
type JobMutationResponse = { project_id: string; job_id: string; status: JobStatus };
type StartProjectResponse = {
  project_id: string;
  status: 'active';
  jobs: { job_id: string; kind: JobKind; status: JobStatus; attempt: number }[];
};

const REQUEST_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 90_000;

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly jobId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');

function requireBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new ApiClientError(0, 'api_not_configured', 'Alamat API belum dikonfigurasi di aplikasi.', false);
  }
  return API_BASE_URL;
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      const url = /^https:\/\//i.test(path) ? path : `${requireBaseUrl()}${path}`;
      response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...init.headers },
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiClientError(0, 'request_timeout', 'Permintaan terlalu lama. Periksa koneksi lalu coba lagi.', true);
      }
      throw new ApiClientError(0, 'network_unavailable', 'Tidak dapat terhubung ke server. Periksa koneksi internet.', true);
    }

    if (!response.ok) {
      let payload: Partial<{ code: string; message: string; retryable: boolean; job_id: string }> = {};
      try {
        payload = await response.json();
      } catch {
        // Upstream errors may not contain JSON; keep the message generic.
      }
      throw new ApiClientError(
        response.status,
        payload.code ?? 'api_error',
        payload.message ?? 'Server belum dapat memproses permintaan ini.',
        payload.retryable ?? response.status >= 500,
        payload.job_id,
      );
    }
    if (response.status === 204) return undefined as T;
    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiClientError(response.status, 'invalid_response', 'Respons server tidak sesuai kontrak. Coba muat ulang.', true);
    }
  } finally {
    clearTimeout(timer);
  }
}

export function createProject(idempotencyKey: string): Promise<CreateProjectResponse> {
  return request('/projects', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export async function uploadPhoto(target: CreateProjectResponse['upload_target'], photoUri: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      const photo = await fetch(photoUri, { signal: controller.signal });
      if (!photo.ok) throw new Error('photo_unavailable');
      response = await fetch(target.url, {
        method: target.method,
        body: await photo.blob(),
        headers: target.headers,
        signal: controller.signal,
      });
    } catch {
      throw new ApiClientError(0, controller.signal.aborted ? 'upload_timeout' : 'upload_failed',
        'Foto belum terunggah. Periksa koneksi lalu coba lagi.', true);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new ApiClientError(response.status, 'upload_failed', 'Storage belum menerima foto. Coba lagi.', response.status >= 500);
    }
  } finally {
    clearTimeout(timer);
  }
}

export function startProject(projectId: string): Promise<StartProjectResponse> {
  return request(`/projects/${encodeURIComponent(projectId)}/start`, { method: 'POST' });
}

export function getProject(projectId: string): Promise<ProjectResponse> {
  return request(`/projects/${encodeURIComponent(projectId)}`);
}

export function createGuide(
  projectId: string,
  ideaId: string,
  idempotencyKey: string,
): Promise<JobMutationResponse> {
  return request(`/projects/${encodeURIComponent(projectId)}/guide`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea_id: ideaId }),
  });
}

export function retryJob(
  projectId: string,
  jobId: string,
  idempotencyKey: string,
): Promise<JobMutationResponse> {
  return request(`/projects/${encodeURIComponent(projectId)}/retry`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_id: jobId }),
  });
}

export type { ProjectResponse };
