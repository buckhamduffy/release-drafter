const fs = require('fs')
const path = require('path')
const tar = require('tar')
const core = require('@actions/core')

exports.downloadAndExtract = async (url, targetDir) => {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const outputFile = path.join(targetDir, 'file.tar.gz')

  core.debug('Downloading cog')
  await downloadFile(url, outputFile)

  core.debug('Extracting cog')
  await extractFile(
    outputFile,
    targetDir
  )
}

const extractFile = async (inputPath, targetDir) => {
  await tar.x({
    file: inputPath,
    cwd: targetDir
  })
}

const downloadFile = async (url, outputPath) => {
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath)
  }

  const fetch = (await import('node-fetch')).default

  const body = await fetch(url)
    .then((x) => x.buffer())
    .catch((err) => {
      core.setFailed(`Fail to download file ${url}: ${err}`)
      return undefined
    })

  if (body === undefined) return

  await fs.writeFileSync(outputPath, body)
}
