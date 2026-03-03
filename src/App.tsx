import { useState, useEffect, useRef } from 'react'
import { fetchModels, sendChat, fetchTokenStats, type ChatMessage, type TokenStats, type TokenUsage } from './api'
import { useAuth } from './AuthContext'
import './App.css'

function App() {
  const { username, logout } = useAuth()
  const [models, setModels] = useState<string[]>([])
  const [currentModel, setCurrentModel] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [currentUsage, setCurrentUsage] = useState<TokenUsage | null>(null)
  const [stats, setStats] = useState<TokenStats | null>(null)
  const [showStats, setShowStats] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchModels()
      .then((list) => {
        setModels(list)
        if (list.length > 0) setCurrentModel(list[0])
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const s = await fetchTokenStats()
      setStats(s)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading || !currentModel) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)
    setStreamingContent('')
    setCurrentUsage(null)

    let accumulated = ''

    try {
      await sendChat(
        currentModel,
        updatedMessages,
        (chunk) => {
          accumulated += chunk
          setStreamingContent(accumulated)
        },
        (usage) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: accumulated },
          ])
          setStreamingContent('')
          setIsLoading(false)
          if (usage) {
            setCurrentUsage(usage)
            loadStats() // 刷新统计
          }
        },
      )
    } catch (err) {
      console.error('Chat error:', err)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '请求失败，请检查后端服务是否运行。' },
      ])
      setStreamingContent('')
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>AI Chat</h1>
        <div className="header-right">
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value)}
            disabled={isLoading}
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <button
            className="stats-toggle-btn"
            onClick={() => setShowStats(!showStats)}
            title="Token 统计"
          >
            📊
          </button>
          <span className="header-username">{username}</span>
          <button className="logout-btn" onClick={logout}>退出</button>
        </div>
      </header>

      {showStats && stats && (
        <div className="stats-panel">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">本次</span>
              <span className="stat-value">{currentUsage?.total_tokens ?? '-'}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">今日对话</span>
              <span className="stat-value">{stats.today_conversations}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">今日 Token</span>
              <span className="stat-value">{stats.today_tokens.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">总计对话</span>
              <span className="stat-value">{stats.total_conversations}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">总计 Token</span>
              <span className="stat-value">{stats.total_tokens.toLocaleString()}</span>
            </div>
            <div className="stat-item detail" title="输入 / 输出">
              <span className="stat-label">输入/输出</span>
              <span className="stat-value">
                {stats.total_prompt_tokens.toLocaleString()} / {stats.total_completion_tokens.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      <main className="chat-messages">
        {messages.length === 0 && !streamingContent && (
          <div className="empty-hint">选择模型，开始对话</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-bubble">{msg.content}</div>
          </div>
        ))}
        {streamingContent && (
          <div className="message assistant">
            <div className="message-bubble">{streamingContent}</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，Enter 发送..."
          rows={1}
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? '发送中...' : '发送'}
        </button>
      </footer>
    </div>
  )
}

export default App
