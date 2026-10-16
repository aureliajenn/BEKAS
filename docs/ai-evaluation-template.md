# Evaluasi AI BEKAS — template

Jangan isi skor sebelum evaluator melihat output nyata. Simpan foto berhak pakai di penyimpanan tim, bukan di repo; gunakan `photo_id` anonim pada laporan ini.

## Status verifikasi provider

- Dokumen resmi OpenAI menyatakan `gpt-6-luna` dan `gpt-6.1-sol` mendukung Responses API, image input, dan Structured Outputs: [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Images/Vision](https://developers.openai.com/api/docs/guides/images-vision).
- Akses model pada project API, kuota, dan harga akun BEKAS belum diuji. Ini bukan hasil benchmark produk.
- Untuk mengulang: catat model aktual, prompt version, provider request ID, latency, usage, fallback reason, dan evaluator.

## Setup evaluasi awal — 5 foto

| photo_id | expected scope / ambiguity | input_status | profile accurate (0–2) | idea 1 (0–2) | idea 2 (0–2) | idea 3 (0–2) | variety (0–2) | safety pass? | materials plausible? | total latency ms | input tokens | output tokens | model / fallback reason | evaluator / notes |
|---|---|---:|---:|---:|---:|---:|---:|---|---|---:|---:|---:|---|---|
| P01 | | | | | | | | | | | | | | |
| P02 | | | | | | | | | | | | | | |
| P03 | | | | | | | | | | | | | | |
| P04 | | | | | | | | | | | | | | |
| P05 | | | | | | | | | | | | | | |

Untuk tiap output `accepted`, pastikan tepat tiga ID berbeda. Untuk foto blur, multi-objek, transparan sulit, atau di luar scope, nilai apakah `needs_new_photo` memberi alasan spesifik tanpa memaksakan ide.

## Acceptance — 10 foto dalam scope

| photo_id | label / materials / safety pass | reviewer 1 idea ratings (0–2 × 3) | reviewer 2 idea ratings (0–2 × 3) | guide steps 4–6 / estimate matched? | latency: download / provider / total ms | input / output tokens | model / prompt versions | fallback reason | notes |
|---|---|---|---|---|---|---|---|---|---|
| A01 | | | | | | | | | |
| A02 | | | | | | | | | |
| A03 | | | | | | | | | |
| A04 | | | | | | | | | |
| A05 | | | | | | | | | |
| A06 | | | | | | | | | |
| A07 | | | | | | | | | |
| A08 | | | | | | | | | |
| A09 | | | | | | | | | |
| A10 | | | | | | | | | |

Report denominator, accepted vs `needs_new_photo`, evaluator agreement, latency percentiles, and actual billed usage. Keep mesh status independent; ideas and guide must remain usable if mesh fails. Never replace a live failure with fixture output.
