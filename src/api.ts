export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function fetchModels(): Promise<string[]> {
  const res = await fetch('/api/models')
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`)
  const data = await res.json()
  return data.models
}

export async function sendChat(
  model: string,
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  onDone: () => void,
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages }),
  })

  if (!res.ok) throw new Error(`Chat request failed: ${res.status}`)
  if (!res.body) throw new Error('Response body is null')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const payload = trimmed.slice(6)
      if (payload === '[DONE]') {
        onDone()
        return
      }
      try {
        const parsed = JSON.parse(payload)
        if (parsed.content) {
          onChunk(parsed.content)
        }
      } catch {
        // skip malformed JSON
      }
    }
  }

  onDone()
}
