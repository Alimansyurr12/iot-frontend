import { useEffect, useState } from 'react'
import AlertNotification from '../components/AlertNotification'
import api from '../services/api'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)

  useEffect(() => {
    if (!notification) return undefined

    const timeout = setTimeout(() => {
      setNotification(null)
    }, 3500)

    return () => clearTimeout(timeout)
  }, [notification])

  const showNotification = (type, message) => {
    setNotification({
      type,
      message,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      })

      const data = response.data

      if (!data.success || !data.token) {
        const message = data.message || 'Login gagal.'
        setError(message)
        showNotification('error', message)
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('isLoggedIn', 'true')

      showNotification('success', data.message || 'Login berhasil.')

      setTimeout(() => {
        onLogin()
      }, 800)
    } catch (error) {
      console.error('Login error:', error)

      const message =
        error.response?.data?.message ||
        'Tidak dapat terhubung ke server.'

      setError(message)
      showNotification('error', message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <AlertNotification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      <div style={cardStyle}>
        <h1 style={titleStyle}>Login Admin</h1>
        <p style={subtitleStyle}>Masuk untuk membuka dashboard monitoring</p>

        {error && <div style={errorStyle}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle} htmlFor="username">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Masukkan username"
            style={inputStyle}
            autoComplete="username"
            disabled={loading}
          />

          <label style={labelStyle} htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Masukkan password"
            style={inputStyle}
            autoComplete="current-password"
            disabled={loading}
          />

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  background: '#f5f7fb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  fontFamily: 'Arial, sans-serif',
}

const cardStyle = {
  width: '100%',
  maxWidth: '400px',
  background: '#ffffff',
  padding: '28px',
  borderRadius: '14px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
}

const titleStyle = {
  margin: 0,
  textAlign: 'center',
  color: '#1f2937',
}

const subtitleStyle = {
  textAlign: 'center',
  color: '#6b7280',
  marginTop: '8px',
  marginBottom: '24px',
}

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  color: '#374151',
  fontWeight: 'bold',
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  marginBottom: '16px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
}

const buttonStyle = {
  width: '100%',
  background: '#2563eb',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  padding: '10px 16px',
  cursor: 'pointer',
  fontWeight: 'bold',
}

const errorStyle = {
  background: '#fee2e2',
  color: '#991b1b',
  padding: '10px',
  borderRadius: '8px',
  marginBottom: '16px',
  textAlign: 'center',
}

export default Login