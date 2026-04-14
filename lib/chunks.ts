// Pure client+server-safe chunk splitter — no Anthropic imports

export const WORDS_PER_CHUNK = 400

export function splitIntoChunks(script: string): Array<{ text: string; offset: number }> {
  const paragraphs = script.split(/\n\n+/)
  const chunks: Array<{ text: string; offset: number }> = []

  let currentChunk = ''
  let currentOffset = 0
  let chunkStartOffset = 0

  for (const paragraph of paragraphs) {
    const wordCount = (currentChunk + paragraph).split(/\s+/).filter(Boolean).length

    if (currentChunk && wordCount > WORDS_PER_CHUNK) {
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
