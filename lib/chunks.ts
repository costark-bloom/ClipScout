// Pure client+server-safe chunk splitter — no Anthropic imports

export const WORDS_PER_CHUNK = 400
export const WORDS_FIRST_CHUNK = 200

export function splitIntoChunks(script: string): Array<{ text: string; offset: number }> {
  const paragraphs = script.split(/\n\n+/)
  const chunks: Array<{ text: string; offset: number }> = []

  let currentChunk = ''
  let currentOffset = 0
  let chunkStartOffset = 0

  for (const paragraph of paragraphs) {
    const wordCount = (currentChunk + paragraph).split(/\s+/).filter(Boolean).length
    const limit = chunks.length === 0 ? WORDS_FIRST_CHUNK : WORDS_PER_CHUNK

    if (currentChunk && wordCount > limit) {
      chunks.push({ text: currentChunk.trim(), offset: chunkStartOffset })
      chunkStartOffset = currentOffset
      currentChunk = paragraph + '\n\n'
    } else {
      currentChunk += paragraph + '\n\n'
    }

    currentOffset = script.indexOf(paragraph, currentOffset) + paragraph.length + 2
  }

  if (currentChunk.trim()) {
    chunks.push({ text: currentChunk.trim(), offset: chunkStartOffset })
  }

  return chunks
}
