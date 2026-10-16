"""Run: python -m app.smoke_sf3d input.jpg output.glb (uses backend settings)."""
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path

from app.config import Settings
from app.services.sf3d import SF3DService


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    settings = Settings()
    provider = SF3DService(
        space_id=settings.sf3d_space_id,
        token=settings.hf_token.get_secret_value() if settings.hf_token else None,
        timeout=settings.mesh_job_timeout_seconds, max_bytes=settings.max_glb_bytes,
    )
    result = await provider.generate(args.input.read_bytes())
    args.output.write_bytes(result)
    print(f"Validated GLB: {len(result)} bytes -> {args.output}")


if __name__ == "__main__":
    asyncio.run(main())
