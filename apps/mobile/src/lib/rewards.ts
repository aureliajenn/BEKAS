// Client fitur reward (PRD bagian 17). Mode fixture menurunkan saldo dari proyek contoh di HP ini.
import type { BankSampah, Leaderboard, LedgerEntry, Redemption, Reward, Rw, Wallet } from '@/types/contracts';

import {
  ApiFailure,
  call,
  fixtureState,
  fixtureVerification,
  listFixtureProjects,
  newKey,
  setFixtureState,
  sleep,
  USE_FIXTURES,
  type CreateProjectResponse,
} from './api';
import { getJSON, setJSON } from './storage';

// ---------- Peserta: ID acak perangkat + RW. Bukan autentikasi (PRD §17.1). ----------

type Participant = { id: string; rwId: string | null };
const PARTICIPANT = 'bekas:participant';

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export async function getParticipant(): Promise<Participant> {
  const saved = await getJSON<Participant>(PARTICIPANT);
  if (saved) return saved;
  const fresh = { id: uuid(), rwId: null };
  await setJSON(PARTICIPANT, fresh);
  return fresh;
}

export async function chooseRw(rwId: string): Promise<void> {
  const p = await getParticipant();
  if (!USE_FIXTURES) await call(`/participants/${p.id}`, { method: 'PUT', body: JSON.stringify({ rw_id: rwId }) });
  await setJSON(PARTICIPANT, { ...p, rwId });
}

// ---------- Verifikasi foto sesudah ----------

export const DAILY_VERIFY_CAP = 3;

/** Upload foto sesudah lalu antrekan pemeriksaan. Lempar ApiFailure untuk batas harian/foto ganda. */
export async function startVerification(projectId: string, photoUri: string): Promise<void> {
  const participant = await getParticipant();

  if (USE_FIXTURES) {
    await sleep(1000);
    const s = await fixtureState(projectId);
    if (fixtureVerification(s)?.result?.approved) {
      throw new ApiFailure({ code: 'already_verified', message: 'Proyek ini sudah mendapat poin.', retryable: false });
    }
    if (photoUri === s.inputUri) {
      throw new ApiFailure({ code: 'duplicate_photo', message: 'Foto ini sama dengan foto sebelum diolah. Foto hasil karyamu ya.', retryable: false });
    }
    if ((await fixtureWallet()).verified_today >= DAILY_VERIFY_CAP) {
      throw new ApiFailure({ code: 'daily_cap_reached', message: `Batas ${DAILY_VERIFY_CAP} proyek terverifikasi per hari sudah tercapai. Lanjut besok ya.`, retryable: false });
    }
    await setFixtureState(projectId, { ...s, verifyAt: Date.now(), afterUri: photoUri, verifyAttempts: (s.verifyAttempts ?? 0) + 1 });
    return;
  }

  const created = await call<Pick<CreateProjectResponse, 'upload_target'>>(`/projects/${projectId}/verification`, {
    method: 'POST',
    headers: { 'Idempotency-Key': newKey() },
    body: JSON.stringify({ participant_id: participant.id }),
  });
  const { url, method, headers } = created.upload_target;
  const up = await fetch(url, { method, headers, body: await (await fetch(photoUri)).blob() });
  if (!up.ok) throw new ApiFailure({ code: 'upload_failed', message: 'Upload foto gagal.', retryable: true });
  await call(`/projects/${projectId}/verification/start`, { method: 'POST' });
}

// ---------- Dompet, hadiah, tukar ----------

export async function fetchWallet(): Promise<Wallet> {
  if (USE_FIXTURES) return fixtureWallet();
  return call<Wallet>(`/participants/${(await getParticipant()).id}/wallet`);
}

export async function fetchRewards(): Promise<Reward[]> {
  if (USE_FIXTURES) {
    const store = await fixtureStore();
    return sampleRewards.map((r) => ({ ...r, stock: r.stock - store.redemptions.filter((x) => x.reward_id === r.reward_id).length }));
  }
  return call<Reward[]>('/rewards');
}

/** Ajukan tukar. Key dibuat sekali per niat tukar oleh pemanggil supaya tap ganda tidak memotong dua kali. */
export async function redeem(reward: Reward, idempotencyKey: string): Promise<void> {
  if (USE_FIXTURES) {
    await sleep(800);
    const store = await fixtureStore();
    if (store.redemptions.some((x) => x.key === idempotencyKey)) return;
    const [wallet, rewards] = await Promise.all([fixtureWallet(), fetchRewards()]);
    const stock = rewards.find((r) => r.reward_id === reward.reward_id)?.stock ?? 0;
    if (stock <= 0) throw new ApiFailure({ code: 'out_of_stock', message: 'Stok hadiah ini habis.', retryable: false });
    if (wallet.balance < reward.price_points) {
      throw new ApiFailure({ code: 'insufficient_balance', message: 'Poinmu belum cukup untuk hadiah ini.', retryable: false });
    }
    store.redemptions.push({ key: idempotencyKey, reward_id: reward.reward_id, name: reward.name, points: reward.price_points, at: Date.now() });
    await setJSON(STORE, store);
    return;
  }
  const p = await getParticipant();
  await call(`/participants/${p.id}/redemptions`, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ reward_id: reward.reward_id }),
  });
}

export const newRedeemKey = newKey;

// ---------- RW, leaderboard, bank sampah ----------

export const currentMonth = () => new Date().toISOString().slice(0, 7);

export async function fetchRws(): Promise<Rw[]> {
  if (USE_FIXTURES) return sampleRws;
  return call<Rw[]>('/rws');
}

export async function fetchLeaderboard(): Promise<Leaderboard> {
  const month = currentMonth();
  if (!USE_FIXTURES) return call<Leaderboard>(`/leaderboard?month=${month}`);

  // Proyek terverifikasi di HP ini bulan ini ikut menambah angka RW pengguna.
  const [{ rwId }, wallet] = await Promise.all([getParticipant(), fixtureWallet()]);
  const mine = wallet.ledger.filter((e) => e.source === 'upcycle' && e.created_at.startsWith(month) && !e.entry_id.startsWith('seed')).length;
  const rows = sampleRws
    .map((rw) => ({ ...rw, items: sampleItems[rw.rw_id] + (rw.rw_id === rwId ? mine : 0) }))
    .sort((a, b) => b.items - a.items)
    .map((rw, i) => ({ rank: i + 1, ...rw }));
  return {
    month,
    rows,
    challenge: { title: 'Olah 150 barang bulan ini', target_items: 150, reward: 'Tong pilah untuk RW', sponsor: 'DLH (contoh)' },
    is_fixture: true,
  };
}

export async function fetchBankSampah(): Promise<BankSampah[]> {
  if (USE_FIXTURES) return sampleBankSampah;
  return call<BankSampah[]>('/bank-sampah');
}

// ---------- Fixture ----------

const STORE = 'bekas:fixture:rewards';
type FixtureRedemption = { key: string; reward_id: string; name: string; points: number; at: number };
type FixtureStore = { redemptions: FixtureRedemption[] };

async function fixtureStore(): Promise<FixtureStore> {
  return (await getJSON<FixtureStore>(STORE)) ?? { redemptions: [] };
}

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

// Riwayat awal agar dompet tidak kosong saat demo; berlabel contoh.
const seedLedger = (): LedgerEntry[] => [
  { entry_id: 'seed-1', amount: 500, source: 'upcycle', sumber_dana: 'dana_edukasi', description: 'Proyek contoh: tempat pensil dari botol', created_at: iso(Date.now() - 3 * DAY) },
  { entry_id: 'seed-2', amount: 500, source: 'upcycle', sumber_dana: 'dana_edukasi', description: 'Proyek contoh: pot gantung', created_at: iso(Date.now() - 8 * DAY) },
];

async function fixtureWallet(): Promise<Wallet> {
  const [projects, store] = await Promise.all([listFixtureProjects(), fixtureStore()]);
  const earned: LedgerEntry[] = projects.flatMap(({ id, s }) => {
    const v = fixtureVerification(s);
    if (!v?.result?.approved) return [];
    return [{
      entry_id: `upcycle:${id}`,
      amount: v.result.points,
      source: 'upcycle' as const,
      sumber_dana: 'dana_edukasi',
      description: 'Proyek upcycle terverifikasi',
      created_at: iso(s.verifyAt! + 4000),
    }];
  });
  const spent: LedgerEntry[] = store.redemptions.map((r) => ({
    entry_id: `redeem:${r.key}`,
    amount: -r.points,
    source: 'redemption',
    description: `Tukar: ${r.name}`,
    created_at: iso(r.at),
  }));
  const ledger = [...earned, ...spent, ...seedLedger()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const today = new Date().toISOString().slice(0, 10);
  return {
    balance: ledger.reduce((sum, e) => sum + e.amount, 0),
    point_value_idr: 1,
    daily_cap: DAILY_VERIFY_CAP,
    verified_today: earned.filter((e) => e.created_at.startsWith(today)).length,
    ledger,
    redemptions: store.redemptions.map<Redemption>((r) => ({
      redemption_id: r.key,
      reward_name: r.name,
      points: r.points,
      status: 'pending',
      created_at: iso(r.at),
    })),
    is_fixture: true,
  };
}

const sampleRewards: Reward[] = [
  { reward_id: 'r-voucher', name: 'Voucher belanja Rp1.000', partner: 'Warung mitra (contoh)', kind: 'voucher', price_points: 1000, stock: 10 },
  { reward_id: 'r-pulsa', name: 'Pulsa Rp5.000', partner: 'Operator seluler (contoh)', kind: 'pulsa', price_points: 5000, stock: 20 },
  { reward_id: 'r-token', name: 'Token listrik Rp20.000', partner: 'Mitra token listrik (contoh)', kind: 'token_listrik', price_points: 20000, stock: 10 },
  { reward_id: 'r-emas', name: 'Tabungan emas 0,01 gram', partner: 'Mitra tabungan emas (contoh)', kind: 'emas', price_points: 25000, stock: 0 },
];

const sampleRws: Rw[] = [
  { rw_id: 'rw-sukaluyu-05', name: 'RW 05', kelurahan: 'Sukaluyu', captain_name: 'Bu Sari (PKK)' },
  { rw_id: 'rw-cihaurgeulis-02', name: 'RW 02', kelurahan: 'Cihaurgeulis', captain_name: 'Kang Dimas (Karang Taruna)' },
  { rw_id: 'rw-sadangserang-07', name: 'RW 07', kelurahan: 'Sadang Serang', captain_name: 'Bu Rina (kader Kang Pisman)' },
  { rw_id: 'rw-lebakgede-03', name: 'RW 03', kelurahan: 'Lebakgede', captain_name: 'Pak Ujang (pengurus RW)' },
];

const sampleItems: Record<string, number> = {
  'rw-sukaluyu-05': 112,
  'rw-cihaurgeulis-02': 98,
  'rw-sadangserang-07': 76,
  'rw-lebakgede-03': 41,
};

const sampleBankSampah: BankSampah[] = [
  {
    id: 'bs-1',
    name: 'Bank Sampah Melati (contoh)',
    address: 'Jl. Contoh No. 12, Sukaluyu, Bandung',
    hours: 'Sabtu–Minggu, 08.00–11.00',
    accepts: ['Botol PET', 'Gelas plastik', 'Kardus', 'Kresek bersih'],
    prices: [
      { type: 'Botol PET bersih', price_per_kg: 8000 },
      { type: 'Gelas plastik', price_per_kg: 5000 },
      { type: 'Kardus', price_per_kg: 2000 },
    ],
    lat: -6.8925,
    lng: 107.6265,
  },
  {
    id: 'bs-2',
    name: 'Bank Sampah Berkah RW 02 (contoh)',
    address: 'Jl. Contoh No. 4, Cihaurgeulis, Bandung',
    hours: 'Rabu, 15.00–17.00',
    accepts: ['Botol PET', 'Wadah plastik kaku', 'Kaleng'],
    prices: [
      { type: 'Botol PET bersih', price_per_kg: 8500 },
      { type: 'Wadah plastik kaku', price_per_kg: 4000 },
      { type: 'Kaleng', price_per_kg: 9000 },
    ],
    lat: -6.9015,
    lng: 107.6335,
  },
];
