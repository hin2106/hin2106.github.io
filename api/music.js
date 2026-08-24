import fs from 'node:fs'
import path from 'node:path'

function decodeId3Text(buffer) {
  if (!buffer?.length) return ''
  const encoding = buffer[0]
  let data = buffer.subarray(1)
  let text = ''
  if (encoding === 1 || encoding === 2) {
    const bigEndian = encoding === 2 || (data[0] === 0xfe && data[1] === 0xff)
    if (data[0] === 0xff && data[1] === 0xfe || data[0] === 0xfe && data[1] === 0xff) data = data.subarray(2)
    if (bigEndian) {
      const swapped = Buffer.alloc(data.length - data.length % 2)
      for (let index = 0; index < swapped.length; index += 2) {
        swapped[index] = data[index + 1]
        swapped[index + 1] = data[index]
      }
      data = swapped
    }
    text = data.toString('utf16le')
  } else {
    text = data.toString(encoding === 3 ? 'utf8' : 'latin1')
  }
  return text.replace(/^\uFEFF|\0/g, '').trim()
}

function readId3Tags(filePath) {
  const descriptor = fs.openSync(filePath, 'r')
  try {
    const header = Buffer.alloc(10)
    if (fs.readSync(descriptor, header, 0, 10, 0) !== 10 || header.toString('ascii', 0, 3) !== 'ID3') return {}
    const version = header[3]
    const tagSize = header[6] << 21 | header[7] << 14 | header[8] << 7 | header[9]
    const tags = {}
    let position = 10
    while (position + 10 <= tagSize + 10 && Object.keys(tags).length < 2) {
      const frameHeader = Buffer.alloc(10)
      fs.readSync(descriptor, frameHeader, 0, 10, position)
      const id = frameHeader.toString('ascii', 0, 4)
      if (!/^[A-Z0-9]{4}$/.test(id)) break
      const size = version === 4
        ? frameHeader[4] << 21 | frameHeader[5] << 14 | frameHeader[6] << 7 | frameHeader[7]
        : frameHeader.readUInt32BE(4)
      position += 10
      if (size <= 0 || position + size > tagSize + 10) break
      if (id === 'TIT2' || id === 'TPE1') {
        const data = Buffer.alloc(size)
        fs.readSync(descriptor, data, 0, size, position)
        tags[id] = decodeId3Text(data)
      }
      position += size
    }
    return tags
  } finally {
    fs.closeSync(descriptor)
  }
}

export default function handler(request, response) {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed' })
  try {
    const directory = path.join(process.cwd(), 'assets', 'music')
    const tracks = fs.readdirSync(directory)
      .filter(file => file.toLowerCase().endsWith('.mp3'))
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(file => {
        const label = file.replace(/\.mp3$/i, '')
        const parts = label.split(/\s+-\s+/, 2)
        const tags = readId3Tags(path.join(directory, file))
        return {
          artist: tags.TPE1 || (parts.length === 2 ? parts[0].trim() : 'Không rõ nghệ sĩ'),
          name: tags.TIT2 || (parts.length === 2 ? parts[1].trim() : label.trim()),
          file,
        }
      })
    response.setHeader('Cache-Control', 'no-cache, must-revalidate')
    return response.status(200).json(tracks)
  } catch (error) {
    return response.status(500).json({ error: 'Unable to read music directory', detail: error.message })
  }
}
