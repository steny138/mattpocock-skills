// A running cat, facing right, as 16x16 pixels per frame.
// Each terminal cell holds two pixels stacked (half-block glyphs), which keeps
// the pixels square on a terminal's roughly 1:2 cells, so the Raster is
// 16 columns by 8 rows. '.' transparent, 'O' fur, 'D' eye.
//
// The shape is the RUN cycle of "Free Tiny cat with all animations" by
// KiriSoft Store (https://kirisoft-store.itch.io/free-tiny-cat-with-all-animations),
// recolored from the 1-bit original. The cat sits in the bottom 8 pixel rows
// of its 16x16 cell; the empty rows above are cropped, the cat itself untouched.

export const COLUMNS = 16
export const ROWS = 4
const PIXEL_ROWS = ROWS * 2
const CROP_TOP = 8

const DEFAULT = 0x01000000

/** Fur per plan state: orange while running or done (the cat just stops), red when blocked. */
export type Mood = 'running' | 'blocked' | 'done'
const FUR: Record<Mood, number> = { running: 0xf59e5b, blocked: 0xe5484d, done: 0xf59e5b }
const EYE = 0x1a1210

const RUN_FRAMES = [
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......O..O.....',
    '.......OOOO.....',
    '.......ODODO....',
    '....OOOOOOOO....',
    '...O.OOOOO......',
    '.....O...O......',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......O..O.....',
    '.......OOOO.....',
    '.......ODODO....',
    '.......OOOOO....',
    '.....OOOOOO.....',
    '....O.OO.O.O....',
    '......O.........',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......O..O.....',
    '.......OOOO.....',
    '.....O.ODODO....',
    '......OOOOOO....',
    '......OOOOO.....',
    '.....O..OOOO....',
    '.........O.O....',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......O..O.....',
    '.....O.OOOO.....',
    '......OODODO....',
    '......OOOOOO....',
    '.....O..OOOO....',
    '........O..O....',
  ],
  [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......O..O.....',
    '.....O.OOOO.....',
    '......OODODO....',
    '......OOOOOO....',
    '.....O..OOOO....',
    '.......O.O......',
  ],
]

const colorOf = (ch: string | undefined, mood: Mood): number | null =>
  ch === 'O' ? FUR[mood] : ch === 'D' ? EYE : null

const halfBlock = (top: number | null, bottom: number | null): [number, number, number] => {
  if (top === null && bottom === null) return [0x20, DEFAULT, DEFAULT]
  if (bottom === null) return [0x2580, top!, DEFAULT]
  if (top === null) return [0x2584, bottom, DEFAULT]

  return [0x2580, top, bottom]
}

/** Packs one frame as RasterProps.cells: base64 of [codePoint, fg, bg] u32 triplets, row-major. */
export const encodeFrame = (frame: number, mood: Mood = 'running'): string => {
  const rows = RUN_FRAMES[frame % RUN_FRAMES.length]!.slice(CROP_TOP)
  const words = new Uint32Array(COLUMNS * ROWS * 3)
  let i = 0

  for (let y = 0; y < PIXEL_ROWS; y += 2) {
    for (let x = 0; x < COLUMNS; x += 1) {
      const [cp, fg, bg] = halfBlock(colorOf(rows[y]?.[x], mood), colorOf(rows[y + 1]?.[x], mood))
      words[i++] = cp
      words[i++] = fg
      words[i++] = bg
    }
  }

  return base64(new Uint8Array(words.buffer))
}

/** Standard padded base64 of the bytes (the environment has btoa but no Uint8Array.toBase64). */
const base64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary)
}

export const FRAME_COUNT = RUN_FRAMES.length

const cycle = (mood: Mood): readonly string[] => Array.from({ length: FRAME_COUNT }, (_, i) => encodeFrame(i, mood))

/** Every frame of every mood, encoded once at load. */
export const FRAMES: Record<Mood, readonly string[]> = {
  running: cycle('running'),
  blocked: cycle('blocked'),
  done: cycle('done'),
}

/** The frame to show: the cat runs while working, stands still when blocked or done. */
export const frameFor = (mood: Mood, tick: number): string =>
  mood === 'running' ? FRAMES.running[tick % FRAME_COUNT]! : FRAMES[mood][1]!
