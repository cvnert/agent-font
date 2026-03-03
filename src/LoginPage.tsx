import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { loginUser } from './api'
import './Auth.css'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await loginUser(username, password)
      login(data.token, data.username)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>登录</h2>
        {error && <div className="auth-error">{error}</div>}
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
        <p className="auth-link">
          没有账号？<Link to="/register">去注册</Link>
        </p>
      </form>
    </div>
  )
}
