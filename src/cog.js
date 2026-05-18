const exec = require('@actions/exec')
const core = require('@actions/core')
const fs = require('fs')
const path = require('path')
const { downloadAndExtract } = require('./installer')

const version = '6.5.0'
const tar = `cocogitto-${version}-x86_64-unknown-linux-musl.tar.gz`
const binDir = `${process.env.HOME}/.local/bin`

/**
 * Installs the latest version of cog.
 * @returns {Promise<void>}
 */
const installCog = async () => {
  try {
    await downloadAndExtract(
			`https://github.com/cocogitto/cocogitto/releases/download/${version}/${tar}`,
			binDir
    )

    if (fs.existsSync(path.join(binDir, 'x86_64-unknown-linux-musl', 'cog'))) {
      fs.renameSync(
        path.join(binDir, 'x86_64-unknown-linux-musl', 'cog'),
        path.join(binDir, 'cog')
      )
    }
  } catch (e) {
    core.setFailed(e.message)
    process.exit(1)
  }

  core.addPath(binDir)
}

/**
 * @param {string} nextVersion
 * @returns {Promise<boolean>}
 */
const checkIfReleaseExists = async (nextVersion) => {
  try {
    await exec.exec('git', ['fetch', '--tags', 'origin'])
    const checkTag = await exec.getExecOutput('git', ['tag', '-l', nextVersion])

    return checkTag.stdout.trim() === nextVersion
  } catch (e) {
    core.setFailed(e.message)
    process.exit(1)
  }
}

/**
 * @param {string} version
 * @returns {`v${number}.${number}.${number}`}
 */
const bumpPatch = (version) => {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/)

  if (!match) {
    throw new Error('Invalid semver: ' + version)
  }

  const [, major, minor, patch] = match

  const nextPatch = Number(patch) + 1

  return `v${major}.${minor}.${nextPatch}`
}

/**
 * @returns {Promise<string>}
 */
const getManualNextRelease = async () => {
  const defaultVersion = 'v0.0.0-1'
  try {
    const result = await exec.getExecOutput(
      'cog',
      ['get-version', '-t']
    )

    const release = result.stdout.trim()

    if (!/^v?(\d+\.\d+\.\d+)$/.test(release)) {
      core.error('Invalid release version: ' + release)
      return defaultVersion
    }

    return bumpPatch(release)
  } catch (e) {
    core.error(e.message)
    return defaultVersion
  }
}

/**
 * @param {boolean} bumpOnFailure
 * @returns {Promise<string>}
 */
const getNextRelease = async (bumpOnFailure = false) => {
  let release = ''

  try {
    const result = await exec.getExecOutput(
      'cog',
      ['bump', '--dry-run', '--auto']
    )

    release = result.stdout.trim()

    if (!/^v?(\d+\.\d+\.\d+)$/.test(release)) {
      throw new Error('Invalid release version: ' + release)
    }
  } catch (e) {
    if (bumpOnFailure) {
      if (/No conventional commit found to bump current version/i.test(e.message)) {
        return await getManualNextRelease()
      }
    }

    core.setFailed(e.message)
    process.exit(1)
  }

  core.debug('new release output: ' + release)

  return release
}

const generateChangelogBetween = async (from, to) => {
  let changelog = ''

  try {
    const result = await exec.getExecOutput(
      'cog',
      [
        'changelog',
        from + '..' + to
      ])

    changelog = result.stdout.trim()
  } catch (e) {
    core.setFailed(e.message)
    process.exit(1)
  }

  return changelog
}

const generateChangelogAt = async (version) => {
  let changelog = ''

  try {
    const result = await exec.getExecOutput(
      'cog',
      [
        'changelog',
        '--at',
        version
      ])

    changelog = result.stdout.trim()
  } catch (e) {
    core.setFailed(e.message)
    process.exit(1)
  }

  return changelog
}

const bumpRelease = async () => {
  const nextVersion = await getNextRelease()

  const releaseExists = await checkIfReleaseExists(nextVersion)
  if (releaseExists) {
    core.info(`Release ${nextVersion} already exists, skipping version bump.`)
    return nextVersion
  }

  try {
    await exec.exec('cog', ['bump', '--auto'])
  } catch (e) {
    core.setFailed(e.message)
    process.exit(1)
  }

  return nextVersion
}

exports.installCog = installCog
exports.getNextRelease = getNextRelease
exports.generateChangelogBetween = generateChangelogBetween
exports.bumpRelease = bumpRelease
exports.generateChangelogAt = generateChangelogAt
exports.getManualNextRelease = getManualNextRelease
