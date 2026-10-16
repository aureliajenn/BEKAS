# Fixtures

For the new team-created 3D demo, place source assets in [`apps/mobile/assets/demo/`](../apps/mobile/assets/demo/README.md). Its package manifest records object metadata, reference renders and optional stage models. This folder remains for stored result fixtures; the new asset folder is not wired into the app until valid files are supplied.

Store only team-owned demo fixtures here. Each complete example needs a manifest recording input, model/version, source job when applicable, and whether output is cached. UI must label fixture results **“Contoh tersimpan”**; never present them as generated from a new photo.

Large images and GLBs should live in private Supabase Storage with a checked-in manifest and documented download instructions, not as untracked files or model weights in this repository.
