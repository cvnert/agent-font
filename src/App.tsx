import { useState, useEffect, useRef } from 'react'
import { fetchModels, sendChat, fetchTokenStats, fetchBalance, purchaseTokens, type ChatMessage, type TokenStats, type TokenUsage } from './api'
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
  const [balance, setBalance] = useState<number>(0)
  const [showPurchase, setShowPurchase] = useState(false)
  const [purchasing, setPurchasing] = useState(false)
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
    loadBalance()
  }, [])

  const loadBalance = async () => {
    try {
      const b = await fetchBalance()
      setBalance(b)
    } catch (err) {
      console.error('Failed to load balance:', err)
    }
  }

  const loadStats = async () => {
    try {
      const s = await fetchTokenStats()
      setStats(s)
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }

  const handlePurchase = async (pkg: 'small' | 'medium' | 'large') => {
    setPurchasing(true)
    try {
      const result = await purchaseTokens(pkg)
      setBalance(result.balance)
      alert(result.message)
      setShowPurchase(false)
    } catch (err: any) {
      alert(err.message || '购买失败')
    } finally {
      setPurchasing(false)
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
            loadBalance() // 刷新余额
          }
        },
      )
    } catch (err: any) {
      console.error('Chat error:', err)
      const errorMsg = err.message || '请求失败，请检查后端服务是否运行。'
      if (errorMsg.includes('余额不足') || errorMsg.includes('Token')) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `❌ ${errorMsg}\n\n请点击右上角 💰 购买 Token。` },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: errorMsg },
        ])
      }
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
          <div className="balance-badge" onClick={() => setShowPurchase(true)} title="点击购买">
            <span className="balance-icon">💰</span>
            <span className="balance-amount">{balance.toLocaleString()}</span>
          </div>
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

      {showPurchase && (
        <div className="purchase-panel">
          <div className="purchase-header">
            <h3>购买 Token</h3>
            <button className="close-btn" onClick={() => setShowPurchase(false)}>✕</button>
          </div>
          <div className="purchase-packages">
            <div className="package-card" onClick={() => handlePurchase('small')}>
              <div className="package-name">小份</div>
              <div className="package-amount">10,000 Tokens</div>
              <div className="package-price">¥9.9</div>
              <button className="buy-btn" disabled={purchasing}>
                {purchasing ? '购买中...' : '立即购买'}
              </button>
            </div>
            <div className="package-card recommended" onClick={() => handlePurchase('medium')}>
              <div className="package-badge">推荐</div>
              <div className="package-name">中份</div>
              <div className="package-amount">50,000 Tokens</div>
              <div className="package-price">¥39.9</div>
              <button className="buy-btn" disabled={purchasing}>
                {purchasing ? '购买中...' : '立即购买'}
              </button>
            </div>
            <div className="package-card" onClick={() => handlePurchase('large')}>
              <div className="package-name">大份</div>
              <div className="package-amount">200,000 Tokens</div>
              <div className="package-price">¥129.9</div>
              <button className="buy-btn" disabled={purchasing}>
                {purchasing ? '购买中...' : '立即购买'}
              </button>
            </div>
          </div>
          <p className="purchase-note">💡 点击套餐即可购买（演示模式，无需真实支付）</p>
        </div>
      )}

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
