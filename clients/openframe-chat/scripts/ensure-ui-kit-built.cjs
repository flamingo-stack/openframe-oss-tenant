#!/usr/bin/env node
const { execSync } = require('child_process')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { join } = require('path')

function run(cmd, cwd) {
  execSync(cmd, { stdio: 'inherit', cwd })
}

const pkgRoot = process.cwd()
const uiKitPath = join(pkgRoot, 'node_modules', '@flamingo', 'ui-kit')

if (!existsSync(uiKitPath)) {
  process.exit(0)
}

const pkgJsonPath = join(uiKitPath, 'package.json')
let pkg
try {
  pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
} catch {
  process.exit(0)
}

const distPath = join(uiKitPath, 'dist')
const buildMarker = join(uiKitPath, '.built')
const needsBuild = !existsSync(distPath) && !existsSync(buildMarker)

if (!needsBuild) {
  process.exit(0)
}

try {
  if (!existsSync(join(uiKitPath, 'node_modules'))) {
    try {
      run('npm ci --no-fund --no-audit', uiKitPath)
    } catch {
      run('npm install --no-fund --no-audit', uiKitPath)
    }
  }

  if (pkg.scripts && (pkg.scripts.build || pkg.scripts.prepare)) {
    const script = pkg.scripts.build ? 'build' : 'prepare'
    run(`npm run ${script}`, uiKitPath)
  }

  try { writeFileSync(buildMarker, 'ok') } catch {}
} catch (e) {
  console.warn('[ensure-ui-kit-built] warning:', e?.message || e)
}


