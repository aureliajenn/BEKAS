// Jalankan: node --experimental-strip-types src/lib/wire.check.ts
import assert from 'node:assert/strict';

import { fromApi } from './wire.ts';

const none = { status: 'not_started' as const, job_id: null, error: null };

// Proyek baru: mesh antre, ide gagal, panduan belum diminta.
const fresh = fromApi({
  project_id: 'p1',
  ideas: null,
  selected_idea_id: null,
  guide: null,
  components: {
    mesh: none,
    ideas: { status: 'failed', job_id: 'j-ideas', error: { code: 'x', message: 'gagal', retryable: true } },
    guide: none,
  },
  illustrations: {},
  assets: [{ kind: 'input', step_id: null, url: 'https://s/in.jpg' }],
});
assert.equal(fresh.mesh.job.status, 'queued');
assert.equal(fresh.mesh.url, undefined);
assert.equal(fresh.ideas.job.id, 'j-ideas');
assert.equal(fresh.ideas.job.error?.retryable, true);
assert.equal(fresh.guide, undefined);
assert.equal(fresh.input_url, 'https://s/in.jpg');
assert.equal(fresh.verification, undefined); // backend lama tanpa field verification

// Panduan jalan: URL ilustrasi dicocokkan per step_id, mesh siap.
const guided = fromApi({
  project_id: 'p1',
  ideas: null,
  selected_idea_id: 'idea-1',
  guide: null,
  components: {
    mesh: { status: 'succeeded', job_id: 'j-mesh' },
    ideas: { status: 'succeeded', job_id: 'j-ideas' },
    guide: { status: 'running', job_id: 'j-guide' },
    verification: { status: 'succeeded', job_id: 'j-ver' },
  },
  verification: { approved: true, points: 500 },
  illustrations: { s1: { status: 'succeeded', job_id: 'i1' }, s2: { status: 'queued', job_id: 'i2' } },
  assets: [
    { kind: 'mesh', step_id: null, url: 'https://s/m.glb' },
    { kind: 'illustration', step_id: 's1', url: 'https://s/s1.png' },
  ],
});
assert.equal(guided.mesh.url, 'https://s/m.glb');
assert.equal(guided.guide?.job.status, 'running');
assert.equal(guided.selected_idea_id, 'idea-1');
assert.equal(guided.illustrations.s1.url, 'https://s/s1.png');
assert.equal(guided.illustrations.s2.url, undefined);
assert.equal(guided.input_url, undefined);
assert.equal(guided.verification?.job.status, 'succeeded');
assert.equal(guided.verification?.result?.points, 500);

console.log('wire.check ok');
