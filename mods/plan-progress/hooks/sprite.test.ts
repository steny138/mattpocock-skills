import { expect, test } from 'claude-code/testing'

import { COLUMNS, FRAMES, FRAME_COUNT, ROWS, frameFor } from './sprite'

test('every frame of every mood packs exactly columns * rows cells', async () => {
  for (const cycle of Object.values(FRAMES)) {
    expect(cycle.length).toBe(FRAME_COUNT)
    for (const cells of cycle) expect(atob(cells).length).toBe(COLUMNS * ROWS * 3 * 4)
  }
})

test('the cat runs while working and stands still otherwise', async () => {
  expect(frameFor('running', 0)).not.toBe(frameFor('running', 1))
  expect(frameFor('blocked', 0)).toBe(frameFor('blocked', 1))
  expect(frameFor('blocked', 0)).not.toBe(frameFor('done', 0))
  expect(frameFor('done', 0)).toBe(frameFor('running', 1))
})
