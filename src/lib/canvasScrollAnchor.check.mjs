import assert from "node:assert/strict"

function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max)
}

function applyScrollLeft(scrollWidth, clientWidth, worldX, padX) {
  const maxL = Math.max(0, scrollWidth - clientWidth)
  return clamp(worldX + padX - clientWidth / 2, 0, maxL)
}

function caseFor(clientW, boardW, worldX) {
  const padX = clientW / 2
  const scrollWidth = padX * 2 + boardW
  return applyScrollLeft(scrollWidth, clientW, worldX, padX)
}

assert.equal(caseFor(1000, 400, 200), 200)
assert.equal(caseFor(2000, 400, 200), 200)
assert.equal(caseFor(400, 400, 200), 200)

console.log("canvasScrollAnchor.check ok")
