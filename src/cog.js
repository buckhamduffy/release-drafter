const exec = require('@actions/exec')
const core = require('@actions/core')
const { downloadAndExtract } = require('./installer')

const version = '5.3.1'
const tar = `cocogitto-${version}-x86_64-unknown-linux-musl.tar.gz`
const binDir = `${process.env.HOME}/.local/bin`

const installCog = async () => {
  try {
    await downloadAndExtract(
            `https://github.com/cocogitto/cocogitto/releases/download/${version}/${tar}`,
            binDir
    )
  } catch (e) {
    core.setFailed(e.message)
    process.exit(1)
  }

  core.addPath(binDir)
}

const checkIfReleaseExists = async (nextVersion) => {
  try {
    await exec.exec('git', ['fetch', '--tags', 'origin']);
    const checkTag = await exec.getExecOutput('git', ['tag', '-l', nextVersion]);

    return checkTag.stdout.trim() === nextVersion;
  } catch (e) {
    core.setFailed(e.message);
    process.exit(1);
  }
}

const getNextRelease = async () => {
  let release = ''

  try {
    const result = await exec.getExecOutput(
      'cog',
      ['bump', '--dry-run', '--auto']
    )

    release = result.stdout.trim()

    if (!/^v(\d+\.\d+\.\d+)$/.test(release)) {
      throw new Error('Invalid release version: ' + release)
    }
  } catch (e) {
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
  const nextVersion = await getNextRelease();

  const releaseExists = await checkIfReleaseExists(nextVersion);
  if (releaseExists) {
    core.info(`Release ${nextVersion} already exists, skipping version bump.`);
    return nextVersion;
  }

  try {
    await exec.exec('cog', ['bump', '--auto']);
  } catch (e) {
    core.setFailed(e.message);
    process.exit(1);
  }

  return nextVersion;
}

exports.installCog = installCog
exports.getNextRelease = getNextRelease
exports.generateChangelogBetween = generateChangelogBetween
exports.bumpRelease = bumpRelease
exports.generateChangelogAt = generateChangelogAt
