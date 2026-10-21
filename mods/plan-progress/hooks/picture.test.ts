import { expect, test } from 'claude-code/testing'

import { FRAME_COUNT, frameFile, pictureFor } from './picture'

const FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) => `png-${i + 1}`)

test('the frames ship under the mod root in order', async () => {
  expect(frameFile('/mod', 1)).toBe('/mod/assets/cat-1.png')
  expect(frameFile('/mod', FRAME_COUNT)).toBe(`/mod/assets/cat-${FRAME_COUNT}.png`)
})

test('the pictured cat cycles every shipped frame while working', async () => {
  const shown = Array.from({ length: FRAME_COUNT }, (_, tick) => pictureFor(FRAMES, 'running', tick).png)
  expect(shown).toEqual(FRAMES)
  expect(pictureFor(FRAMES, 'running', FRAME_COUNT).png).toBe(shown[0])
})

test('the pictured cat crouches on the first frame when blocked or done', async () => {
  expect(pictureFor(FRAMES, 'blocked', 5)).toEqual({ png: 'png-1' })
  expect(pictureFor(FRAMES, 'done', 5)).toEqual({ png: 'png-1' })
})
