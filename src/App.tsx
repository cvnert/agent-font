import { useState, useEffect, useRef } from 'react'
import { fetchModels, sendChat, type ChatMessage } from './api'
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

    let accumulated = ''

    try {
      await sendChat(
        currentModel,
        updatedMessages,
        (chunk) => {
          accumulated += chunk
          setStreamingContent(accumulated)
        },
        () => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: accumulated },
          ])
          setStreamingContent('')
          setIsLoading(false)
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
          <span className="header-username">{username}</span>
          <button className="logout-btn" onClick={logout}>退出</button>
        </div>
      </header>

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
