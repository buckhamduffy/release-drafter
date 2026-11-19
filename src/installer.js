import fs from 'fs'
import path from 'path'
import { x } from 'tar'
import * as core from '@actions/core'

export const downloadAndExtract = async (url, targetDir) => {
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
  await x({
    file: inputPath,
    cwd: targetDir
  })
}

const downloadFile = async (url, outputPath) => {
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath)
  }

  const fetch = (await import('node-fetch')).default

  let res
  try {
    res = await fetch(url)
  } catch (err) {
    throw new Error(`Fail to download file ${url}: ${err}`)
  }

  if (!res.ok) {
    throw new Error(`Fail to download file ${url}: HTTP ${res.status} ${res.statusText}`)
  }

  const body = await res.arrayBuffer()

  fs.writeFileSync(outputPath, Buffer.from(body))
}
