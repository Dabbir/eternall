/** Calendar date in `YYYY-MM-DD` form, always a civil date (no time zone). */
export type ISODate = string;

/** The tone of a memory. Shared by every imprint, so a memory feels the same everywhere. */
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

export const isTone = (v: unknown): v is Tone => typeof v === 'string' && (TONES as readonly string[]).includes(v);
