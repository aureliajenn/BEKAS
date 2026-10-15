// Teks status per komponen. Tampilkan NAMA TAHAP, jangan persentase (PRD bagian 4).

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'retry_wait' | 'failed';
export type JobKind = 'upload' | 'mesh' | 'ideas' | 'guide' | 'illustration';

type Copy = Record<JobStatus, string>;

export const statusCopy: Record<JobKind, Copy> = {
  upload: {
    queued: 'Menyiapkan foto',
    running: 'Mengunggah foto',
    succeeded: 'Foto terkirim',
    retry_wait: 'Mencoba unggah lagi',
    failed: 'Foto gagal terkirim',
  },
  mesh: {
    queued: 'Menunggu giliran pembuatan 3D',
    running: 'Membuat model 3D',
    succeeded: 'Model 3D siap',
    retry_wait: 'Mencoba membuat model 3D lagi',
    failed: 'Model 3D belum tersedia; ide tetap dapat digunakan',
  },
  ideas: {
    queued: 'Menunggu giliran membaca foto',
    running: 'Mencari ide untuk barangmu',
    succeeded: '3 ide siap',
    retry_wait: 'Mencoba mencari ide lagi',
    failed: 'Ide gagal dibuat',
  },
  guide: {
    queued: 'Menunggu giliran menyusun panduan',
    running: 'Menyusun panduan',
    succeeded: 'Panduan siap',
    retry_wait: 'Mencoba menyusun panduan lagi',
    failed: 'Panduan gagal dibuat',
  },
  illustration: {
    queued: 'Ilustrasi menunggu giliran',
    running: 'Ilustrasi sedang dibuat',
    succeeded: 'Ilustrasi siap',
    retry_wait: 'Mencoba membuat ilustrasi lagi',
    failed: 'Ilustrasi gagal dibuat',
  },
};

/** Status khusus di luar status job. */
export const extraCopy = {
  meshWorkerPreparing: 'Menyiapkan model 3D',
  meshWorkerUnavailable: 'Pembuat 3D sedang tidak tersedia',
  needsNewPhoto: 'Fotonya kurang jelas buat kami. Coba foto ulang ya.',
  offline: 'Koneksi terputus. Kami lanjutkan saat online.',
  meshDisclaimer: 'Model 3D ini hanya gambaran bentuk, bukan ukuran asli.',
  cachedSample: 'Contoh tersimpan',
  retry: 'Coba lagi',
} as const;
