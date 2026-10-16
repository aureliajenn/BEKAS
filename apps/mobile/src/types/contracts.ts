export type InputStatus = 'accepted' | 'needs_new_photo';

export type JobKind = 'mesh' | 'ideas' | 'guide' | 'illustration';

export type JobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'retry_wait'
  | 'failed';

export type AssetKind = 'input' | 'mesh' | 'illustration';

export interface ObjectProfile {
  label: string;
  visible_parts: string[];
  material_guess: string;
  uncertainties: string[];
}

export interface CraftIdea {
  id: string;
  title: string;
  purpose: string;
  difficulty: string;
  estimated_minutes: number;
  extra_materials: string[];
  tools: string[];
  safety_notes: string[];
}

export interface IdeasResult {
  schema_version: string;
  input_status: InputStatus;
  explanation?: string;
  object_profile?: ObjectProfile;
  ideas: CraftIdea[];
}

export interface GuideStep {
  id: string;
  order: number;
  title: string;
  instruction: string;
  expected_result: string;
  illustration_prompt: string;
}

export interface GuideResult {
  schema_version: string;
  idea_id: string;
  title: string;
  materials: string[];
  tools: string[];
  safety_notes: string[];
  steps: GuideStep[];
}

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  job_id?: string;
}

// Draf bentuk respons GET /projects/{id}; samakan dengan backend saat endpoint dikunci.
export interface JobState {
  id: string;
  status: JobStatus;
  error?: ApiError;
}

export interface ProjectView {
  id: string;
  is_fixture?: boolean;
  input_url?: string;
  // worker_state: info operator/GPU di luar status job (DESIGN.md §7).
  mesh: { job: JobState; url?: string; model?: string; fallback_used?: boolean; worker_state?: 'preparing' | 'unavailable' };
  ideas: { job: JobState; result?: IdeasResult };
  selected_idea_id?: string;
  guide?: { job: JobState; result?: GuideResult };
  illustrations: Record<string, { job: JobState; url?: string }>;
  verification?: { job: JobState; result?: VerificationResult };
}

// ---------- Reward (PRD bagian 17) ----------

export interface VerificationResult {
  approved: boolean;
  reason?: string;
  points: number;
}

export interface Rw {
  rw_id: string;
  name: string;
  kelurahan: string;
  captain_name: string;
}

export interface LedgerEntry {
  entry_id: string;
  amount: number;
  source: 'upcycle' | 'redemption';
  sumber_dana?: string;
  description: string;
  created_at: string;
}

export interface Redemption {
  redemption_id: string;
  reward_name: string;
  points: number;
  status: 'pending' | 'fulfilled' | 'rejected';
  created_at: string;
}

export interface Wallet {
  balance: number;
  point_value_idr: number;
  daily_cap: number;
  verified_today: number;
  /** PRD 1.4: minggu berturut-turut dengan proyek terverifikasi; opsional untuk backend lama. */
  weekly_streak?: number;
  verified_this_week?: boolean;
  ledger: LedgerEntry[];
  redemptions: Redemption[];
  is_fixture?: boolean;
}

export interface Reward {
  reward_id: string;
  name: string;
  partner: string;
  kind: 'pulsa' | 'token_listrik' | 'emas' | 'voucher';
  price_points: number;
  stock: number;
}

export interface LeaderboardRow {
  rank: number;
  rw_id: string;
  name: string;
  kelurahan: string;
  items: number;
  captain_name: string;
}

export interface Leaderboard {
  month: string;
  rows: LeaderboardRow[];
  challenge: { title: string; target_items: number; reward: string; sponsor: string };
  is_fixture?: boolean;
}

export interface BankSampah {
  id: string;
  name: string;
  address: string;
  hours: string;
  accepts: string[];
  prices: { type: string; price_per_kg: number }[];
  lat: number;
  lng: number;
}
