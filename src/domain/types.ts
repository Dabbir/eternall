/** Calendar date in `YYYY-MM-DD` form. Always interpreted as a civil date (no time zone). */
export type ISODate = string;

export const TONES = ['joy', 'calm', 'tender', 'bold', 'grief', 'wonder'] as const;
export type Tone = (typeof TONES)[number];

export const TONE_LABEL: Record<Tone, string> = {
  joy: 'Joy',
  calm: 'Calm',
  tender: 'Tender',
  bold: 'Bold',
  grief: 'Grief',
  wonder: 'Wonder',
};

export const INKS = ['ochre', 'moss', 'tide', 'plum', 'clay', 'slate'] as const;
export type Ink = (typeof INKS)[number];

export type ThemePreference = 'system' | 'light' | 'dark';
export type Lens = 'moments' | 'chapters' | 'plain';

export interface Profile {
  name: string;
  birthDate: ISODate;
  /** How many years the lifeline spans. */
  horizonYears: number;
  createdAt: string;
}

export interface Inscription {
  id: string;
  date: ISODate;
  title: string;
  body: string;
  tone: Tone;
  createdAt: string;
  updatedAt: string;
}

export interface Capsule {
  id: string;
  title: string;
  body: string;
  sealedOn: ISODate;
  opensOn: ISODate;
  /** SHA-256 of the sealed contents, used to prove the letter is unchanged when opened. */
  fingerprint: string;
  openedAt: string | null;
}

export interface Chapter {
  id: string;
  title: string;
  start: ISODate;
  /** `null` means the chapter is still being lived. */
  end: ISODate | null;
  ink: Ink;
  note: string;
}

export interface Settings {
  theme: ThemePreference;
  lens: Lens;
}

export const DATA_VERSION = 1 as const;

export interface AppData {
  version: typeof DATA_VERSION;
  profile: Profile | null;
  inscriptions: Inscription[];
  capsules: Capsule[];
  chapters: Chapter[];
  settings: Settings;
}

export const EMPTY_DATA: AppData = {
  version: DATA_VERSION,
  profile: null,
  inscriptions: [],
  capsules: [],
  chapters: [],
  settings: { theme: 'system', lens: 'moments' },
};

export const LIMITS = {
  name: 40,
  title: 80,
  chapterTitle: 60,
  inscriptionBody: 10_000,
  capsuleBody: 20_000,
  chapterNote: 400,
  minHorizon: 50,
  maxHorizon: 120,
  maxAge: 120,
} as const;
