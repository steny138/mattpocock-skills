import { expect, test } from 'claude-code/testing'

import { FRAME_COUNT, pictureFor } from './picture'

test('the pictured cat cycles every shipped frame while working', async () => {
  const files = Array.from({ length: FRAME_COUNT }, (_, tick) => pictureFor('/mod', 'running', tick).file)
  expect(files).toEqual(Array.from({ length: FRAME_COUNT }, (_, i) => `/mod/assets/cat-${i + 1}.png`))
  expect(pictureFor('/mod', 'running', FRAME_COUNT).file).toBe(files[0])
})

test('the pictured cat crouches on the first frame when blocked or done', async () => {
  expect(pictureFor('/mod', 'blocked', 5)).toEqual({ file: '/mod/assets/cat-1.png', format: 'png' })
  expect(pictureFor('/mod', 'done', 5)).toEqual({ file: '/mod/assets/cat-1.png', format: 'png' })
})
