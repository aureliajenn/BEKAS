import type { GuideResult, IdeasResult } from '@/types/contracts';
import pencilDemo from '../../assets/demo/tempat-pensil/content.json';

export const pencilIdeaId = pencilDemo.idea.id;
export const pencilMeshStates = pencilDemo.mesh_states;

// Contoh tersimpan untuk pengembangan UI. Selalu tampil berlabel "Contoh tersimpan".
export const SAMPLE_GLB =
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb';

export const sampleIdeas: IdeasResult = {
  schema_version: '1.0',
  input_status: 'accepted',
  object_profile: pencilDemo.object_profile,
  ideas: [
    pencilDemo.idea,
    {
      id: 'idea-pot',
      title: 'Pot gantung tanaman kecil',
      purpose: 'Wadah sukulen atau sirih gading yang digantung di teras.',
      difficulty: 'Sedang',
      estimated_minutes: 30,
      extra_materials: ['Tali rami', 'Tanah dan bibit tanaman'],
      tools: ['Gunting', 'Spidol', 'Bor tangan kecil'],
      safety_notes: ['Tepi potongan tajam, ampelas atau tutup dengan selotip.'],
    },
    {
      id: 'idea-celengan',
      title: 'Celengan dengan tutup ulir',
      purpose: 'Celengan sederhana yang bisa dibuka lewat tutup botol.',
      difficulty: 'Sedang',
      estimated_minutes: 45,
      extra_materials: ['Cat akrilik', 'Kertas warna'],
      tools: ['Cutter', 'Kuas', 'Ampelas'],
      safety_notes: ['Lubang koin dibuat oleh orang dewasa; rapikan sisi yang tajam.'],
    },
  ],
};

export const needsNewPhoto: IdeasResult = {
  schema_version: '1',
  input_status: 'needs_new_photo',
  explanation: 'Di foto terlihat beberapa barang sekaligus dan latarnya ramai. Coba foto satu botol saja di atas meja polos.',
  ideas: [],
};

export function sampleGuide(ideaId: string): GuideResult {
  if (ideaId === pencilIdeaId) return pencilDemo.guide;
  const idea = sampleIdeas.ideas.find((i) => i.id === ideaId) ?? sampleIdeas.ideas[0];
  return {
    schema_version: '1',
    idea_id: idea.id,
    title: idea.title,
    materials: ['Botol plastik bersih dan kering', ...idea.extra_materials],
    tools: idea.tools,
    safety_notes: idea.safety_notes,
    steps: [
      {
        id: 's1',
        order: 1,
        title: 'Cuci dan keringkan botol',
        instruction: 'Lepas label, cuci botol dengan sabun, lalu jemur sampai benar-benar kering.',
        expected_result: 'Botol bersih tanpa sisa lem label.',
        illustration_prompt: '',
      },
      {
        id: 's2',
        order: 2,
        title: 'Tandai garis potong',
        instruction: 'Lilitkan selotip melingkar di sepertiga bawah botol, lalu ikuti tepinya dengan spidol.',
        expected_result: 'Garis potong lurus mengelilingi botol.',
        illustration_prompt: '',
      },
      {
        id: 's3',
        order: 3,
        title: 'Potong mengikuti garis',
        instruction: 'Tusuk perlahan dengan ujung gunting, lalu potong mengikuti garis spidol.',
        expected_result: 'Botol terbagi dua dengan tepi rata.',
        illustration_prompt: '',
      },
      {
        id: 's4',
        order: 4,
        title: 'Rapikan tepi tajam',
        instruction: 'Ampelas tepi potongan atau tutup dengan selotip kain supaya aman dipegang.',
        expected_result: 'Tepi tidak lagi tajam saat diraba.',
        illustration_prompt: '',
      },
      {
        id: 's5',
        order: 5,
        title: 'Hias dan gunakan',
        instruction: 'Hias bagian luar sesuai selera, lalu isi sesuai kegunaan ide.',
        expected_result: `${idea.title} siap dipakai.`,
        illustration_prompt: '',
      },
    ],
  };
}
