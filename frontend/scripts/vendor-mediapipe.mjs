#!/usr/bin/env node
/**
 * Copy MediaPipe WASM from the installed npm package and download
 * face_landmarker.task into frontend/public/mediapipe/.
 *
 * Run automatically via `npm postinstall`. Manual: `npm run vendor:mediapipe`.
 * Binaries are gitignored — do not commit wasm/ or the .task file.
 *
 * License: Apache-2.0 (package + model cards). See public/mediapipe/NOTICE.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destRoot = path.join(frontendRoot, 'public', 'mediapipe')
const destWasm = path.join(destRoot, 'wasm')
const destModel = path.join(destRoot, 'face_landmarker.task')
const pkgJsonPath = path.join(
  frontendRoot,
  'node_modules',
  '@mediapipe',
  'tasks-vision',
  'package.json',
)
const srcWasm = path.join(
  frontendRoot,
  'node_modules',
  '@mediapipe',
  'tasks-vision',
  'wasm',
)
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const MIN_MODEL_BYTES = 1_000_000

function fail(message) {
  console.error(`vendor-mediapipe: ${message}`)
  process.exit(1)
}

if (!fs.existsSync(pkgJsonPath) || !fs.existsSync(srcWasm)) {
  fail(
    `missing @mediapipe/tasks-vision in node_modules. Run npm install in frontend/.`,
  )
}

const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'))
console.log(`vendor-mediapipe: @mediapipe/tasks-vision@${pkg.version}`)

fs.mkdirSync(destRoot, { recursive: true })
fs.rmSync(destWasm, { recursive: true, force: true })
fs.cpSync(srcWasm, destWasm, { recursive: true })
console.log(`vendor-mediapipe: copied wasm -> ${path.relative(frontendRoot, destWasm)}`)

const existing = fs.existsSync(destModel) ? fs.statSync(destModel).size : 0
if (existing >= MIN_MODEL_BYTES) {
  console.log(
    `vendor-mediapipe: reuse face_landmarker.task (${existing} bytes)`,
  )
} else {
  console.log(`vendor-mediapipe: downloading face_landmarker.task`)
  const response = await fetch(MODEL_URL)
  if (!response.ok) {
    fail(`model download failed (${response.status} ${response.statusText})`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < MIN_MODEL_BYTES) {
    fail(`model download too small (${buffer.length} bytes)`)
  }
  fs.writeFileSync(destModel, buffer)
  console.log(`vendor-mediapipe: wrote face_landmarker.task (${buffer.length} bytes)`)
}
