// The cat as a picture, for terminals that draw Images: a crouch-and-pounce,
// facing right, eight frames shipped as PNGs under assets/.
//
// The frames are the owner's own illustration, cut from 352x310 white-backed
// frames: the white touching the edges made transparent, cropped to the box all
// eight frames share, scaled to 308x188 and reduced to a 128-colour palette. At
// about 1.64:1 they fill 14 columns by 4 rows of roughly 1:2 cells, the height
// of the Raster cat they replace.
//
// The terminal gets the PNG bytes, never a path: Orca's xterm.js refuses kitty
// file transmission (EINVAL) without the blit being denied, so a path drew a
// blank box and the Raster fallback never ran.

import type { Mood } from './sprite'

export const COLUMNS = 14
export const ROWS = 4
export const FRAME_COUNT = 8

export type Picture = { png: string }

/** Where frame `n` (1-based) ships, under the mod's root. */
export const frameFile = (root: string, n: number): string => `${root}/assets/cat-${n}.png`

/** The frame to show, from the base64 PNGs in frame order: the cat pounces while working, crouches when blocked or done. */
export const pictureFor = (frames: readonly string[], mood: Mood, tick: number): Picture => ({
  png: frames[mood === 'running' ? tick % FRAME_COUNT : 0]!,
})
