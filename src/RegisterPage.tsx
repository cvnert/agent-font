import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from './api'
import './Auth.css'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      await registerUser(username, password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>注册</h2>
        {error && <div className="auth-error">{error}</div>}
        <input
          type="text"
          placeholder="用户名（3-50字符）"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          minLength={3}
          maxLength={50}
          required
        />
        <input
          type="password"
          placeholder="密码（6-72字符）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          maxLength={72}
          required
        />
        <input
          type="password"
          placeholder="确认密码"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
        <p className="auth-link">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </form>
    </div>
  )
}
