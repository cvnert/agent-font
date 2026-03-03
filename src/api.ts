export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function handleUnauthorized(res: Response) {
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    window.location.href = '/login'
  }
}

export async function registerUser(username: string, password: string) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '注册失败')
  return data
}

export async function loginUser(username: string, password: string) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '登录失败')
  return data as { token: string; username: string }
}

export async function fetchModels(): Promise<string[]> {
  const res = await fetch('/api/models', {
    headers: authHeaders(),
  })
  if (!res.ok) {
    handleUnauthorized(res)
    throw new Error(`Failed to fetch models: ${res.status}`)
  }
  const data = await res.json()
  return data.models
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export async function sendChat(
  model: string,
  messages: ChatMessage[],
  onChunk: (content: string) => void,
  onDone: (usage?: TokenUsage) => void,
) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ model, messages }),
  })

  if (!res.ok) {
    handleUnauthorized(res)
    throw new Error(`Chat request failed: ${res.status}`)
  }
  if (!res.body) throw new Error('Response body is null')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let usage: TokenUsage | undefined

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
        onDone(usage)
        return
      }
      try {
        const parsed = JSON.parse(payload)
        if (parsed.content) {
          onChunk(parsed.content)
        }
        if (parsed.usage) {
          usage = parsed.usage
        }
      } catch {
        // skip malformed JSON
      }
    }
  }

  onDone(usage)
}

export interface TokenStats {
  total_conversations: number
  total_prompt_tokens: number
  total_completion_tokens: number
  total_tokens: number
  today_conversations: number
  today_tokens: number
}

export async function fetchTokenStats(): Promise<TokenStats> {
  const res = await fetch('/api/usage/stats', {
    headers: authHeaders(),
  })
  if (!res.ok) {
    handleUnauthorized(res)
    throw new Error(`Failed to fetch stats: ${res.status}`)
  }
  return res.json()
}

export interface ChatUsage {
  id: number
  user_id: number
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  created_at: string
}

export async function fetchRecentUsage(limit: number = 10): Promise<ChatUsage[]> {
  const res = await fetch(`/api/usage/recent?limit=${limit}`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    handleUnauthorized(res)
    throw new Error(`Failed to fetch recent usage: ${res.status}`)
  }
  const data = await res.json()
  return data.usages
}
