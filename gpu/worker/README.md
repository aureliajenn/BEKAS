# BEKAS Vast.ai GPU Worker

Worker otomatis untuk job `mesh`. Worker mengambil antrean dari FastAPI, membaca input dan menulis output lewat signed URL Supabase Storage, lalu menyelesaikan job melalui API.

```text
FastAPI/Postgres ← claim + heartbeat + complete/fail ← Vast.ai worker
Supabase Storage ← signed download foto / signed upload GLB ← Vast.ai worker
```

Vast.ai tidak menerima request inference dari aplikasi. Worker memulai koneksi HTTPS keluar; tidak perlu membuka port API di instance.

## Implementasi di repo

- `bekas_gpu_worker.worker`: loop claim, heartbeat, retry polling, shutdown SIGTERM.
- `bekas_gpu_worker.mesh`: model subprocess persisten; memuat SF3D sebelum polling dan mempertahankan model warm antar-job. Jika SF3D gagal, prosesnya dihentikan sebelum TripoSR dimuat.
- `bekas_gpu_worker.model_runner`: adapter inference untuk API resmi SF3D dan TripoSR; mengekspor GLB.
- `bekas_gpu_worker.glb`: validasi header GLB v2, JSON chunk, dan batas ukuran.
- Backend `/worker/jobs/*`: token worker, claim atomik, lease, signed URLs, retry, verifikasi aset, dan completion idempoten.

Wire format API: [kontrak worker](../../docs/api-contract.md#vastai-worker-wire-format). Implementasi route: `services/api/app/routes/worker.py`.

## Setup Vast.ai

### 1. Siapkan instance

- Pilih instance **on-demand** untuk demo yang perlu stabil; hindari interruptible untuk sesi kritis.
- Mulai evaluasi dengan GPU 12 GB VRAM atau lebih dan disk cukup untuk source, dependency, cache bobot, serta output sementara. PRD menyebut model sekitar 6 GB VRAM pada konfigurasi default; benchmark tetap wajib.
- Pilih image Linux dengan Python 3.10+ dan PyTorch/CUDA kompatibel. Catat GPU, CUDA, tarif, disk, serta host.
- Pasang volume persisten untuk cache Hugging Face bila biaya/opsi instance mendukung.
- Jangan expose port inference. Worker hanya butuh outbound HTTPS ke API, Hugging Face saat download model, dan Supabase Storage.

### 2. Pasang model

Gunakan environment PyTorch/CUDA yang sudah lolos smoke test. Checkout dan pin commit SF3D/TripoSR yang diuji sebelum demo; jangan mengandalkan `main` yang dapat berubah.

```bash
git clone https://github.com/Stability-AI/stable-fast-3d.git /opt/stable-fast-3d
git clone https://github.com/VAST-AI-Research/TripoSR.git /opt/TripoSR

python -m venv --system-site-packages /opt/venvs/sf3d
/opt/venvs/sf3d/bin/python -m pip install --upgrade setuptools==69.5.1 wheel
/opt/venvs/sf3d/bin/python -m pip install -r /opt/stable-fast-3d/requirements.txt

python -m venv --system-site-packages /opt/venvs/triposr
/opt/venvs/triposr/bin/python -m pip install --upgrade setuptools wheel
/opt/venvs/triposr/bin/python -m pip install -r /opt/TripoSR/requirements.txt
```

SF3D gated Hugging Face weights perlu akses repository dan read token. Set `HF_TOKEN` sebagai secret environment pada instance; jangan menulisnya ke Dockerfile, Git, atau log. TripoSR fallback memakai environment terpisah agar dependency tidak saling menimpa. Jalankan keduanya bergantian dan ukur VRAM aktual.

### 3. Install worker

Clone repo BEKAS pada instance, lalu:

```bash
cd /workspace/BEKAS/gpu/worker
python -m venv /opt/venvs/bekas-worker
/opt/venvs/bekas-worker/bin/python -m pip install -e .
```

Isi environment berikut di konfigurasi instance Vast.ai. `WORKER_TOKEN` harus sama dengan backend; buat nilai acak, misalnya `openssl rand -hex 32`.

```text
API_BASE_URL=https://<backend-public-url>
WORKER_TOKEN=<random-secret-shared-with-backend>
WORKER_ID=bekas-vast-gpu-01
SF3D_PYTHON=/opt/venvs/sf3d/bin/python
SF3D_RUN_PY=/opt/stable-fast-3d/run.py
SF3D_VERSION=<pinned-commit>
TRIPOSR_PYTHON=/opt/venvs/triposr/bin/python
TRIPOSR_RUN_PY=/opt/TripoSR/run.py
TRIPOSR_VERSION=<pinned-commit>
HF_TOKEN=<read-only-token-if-needed>
```

Parameter timeout, ukuran file, model ID, dan contoh env lain ada di [`.env.example`](.env.example). Jangan kirim `DATABASE_URL`, Supabase service key, atau OpenAI key ke worker.

### 4. Konfigurasi backend

Backend perlu:

1. `DATABASE_URL` ke Supabase Postgres dengan SSL.
2. `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` disimpan hanya pada server.
3. `SUPABASE_STORAGE_BUCKET=bekas-assets`; buat bucket tersebut **private**.
4. `WORKER_TOKEN` yang sama dengan secret worker.
5. Migration `database/migrations/0001_initial_schema.sql` diterapkan.

Worker API perlu backend yang dapat dijangkau publik lewat HTTPS dan project input yang sudah memiliki asset `input` di bucket.

### 5. Jalankan dan periksa

```bash
nvidia-smi
curl -fsS "$API_BASE_URL/health"
/opt/venvs/bekas-worker/bin/bekas-gpu-worker
```

Worker memuat SF3D saat startup sebelum mulai claim job. Log `Mesh model warm; worker is polling for jobs` berarti siap. Claim kosong akan mengembalikan `204` dan worker menunggu sebelum mencoba lagi. Tekan SIGTERM untuk stop bersih.

Saat demo: cek saldo dan tarif, pastikan worker/model warm, pantau job dan biaya, lalu stop/destroy instance setelah output aman tersimpan. Instance on-demand menghindari bidding interruption; bukan jaminan uptime.

## Pengaturan worker

| Variable | Default | Fungsi |
|---|---:|---|
| `POLL_INTERVAL_SECONDS` | `5` | Jeda antrean kosong |
| `HEARTBEAT_INTERVAL_SECONDS` | `20` | Interval perpanjangan lease |
| `REQUEST_TIMEOUT_SECONDS` | `30` | Timeout HTTP API/storage |
| `MAX_CLAIM_SECONDS` | `600` | Batas total satu claim, termasuk transfer |
| `MODEL_LOAD_TIMEOUT_SECONDS` | `900` | Batas load model sebelum worker siap |
| `MESH_TIMEOUT_SECONDS` | `300` | Timeout satu inferensi model |
| `MAX_INPUT_BYTES` | `5000000` | Batas ukuran foto |
| `MAX_GLB_BYTES` | `25000000` | Batas output GLB |
| `SF3D_MODEL_ID` | `stabilityai/stable-fast-3d` | Model Hub SF3D |
| `TRIPOSR_MODEL_ID` | `stabilityai/TripoSR` | Model Hub TripoSR |

Versi adapter pada completion berasal dari `SF3D_VERSION`/`TRIPOSR_VERSION`; isi dengan commit/tag yang diuji.

## Verifikasi lokal

Test worker tanpa GPU/model:

```bash
cd gpu/worker
python -m pip install -e ".[dev]"
python -m pytest
```

Integration inference, signed URL Supabase, claim Postgres, dan instance billing harus diuji pada akun/environment Vast.ai sebenarnya sebelum demo.
