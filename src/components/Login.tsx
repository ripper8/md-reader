import React, { useState } from 'react'
import { User, Lock, LogIn, AlertCircle, Eye, EyeOff, ShieldCheck, Server, X } from 'lucide-react'

interface LoginProps {
  onLoginSuccess: (token: string, username: string) => void
  onClose: () => void
}

export default function Login({ onLoginSuccess, onClose }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Моля, въведете потребителско име и парола.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('https://movies.acyapps.com/Users/AuthenticateByName', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'MediaBrowser Client="MDReader", Device="WebBrowser", DeviceId="mdreader-web-client", Version="1.0.0"'
        },
        body: JSON.stringify({
          Username: username.trim(),
          Pw: password
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Невалидно потребителско име или парола.')
        } else {
          throw new Error('Грешка при свързване с Jellyfin сървъра.')
        }
      }

      const data = await response.json()
      if (data.AccessToken && data.User) {
        onLoginSuccess(data.AccessToken, data.User.Name)
        onClose()
      } else {
        throw new Error('Сървърът върна непълен отговор.')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Възникна неочаквана грешка при влизане.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="login-card fade-in" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose} title="Затвори">
          <X size={18} />
        </button>

        <div className="login-header">
          <div className="login-logo">
            <ShieldCheck size={32} className="login-logo-icon" />
          </div>
          <h1 className="login-title">Вход в MDReader</h1>
          <p className="login-subtitle">Оторизация чрез Jellyfin сървър</p>
        </div>

        <div className="login-server-badge">
          <Server size={12} />
          <span>movies.acyapps.com</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error-alert animate-shake">
              <AlertCircle size={16} className="login-error-icon" />
              <span>{error}</span>
            </div>
          )}

          <div className="login-input-group">
            <label htmlFor="username">Потребителско име</label>
            <div className="login-input-wrapper">
              <User size={16} className="login-field-icon" />
              <input
                type="text"
                id="username"
                placeholder="Въведете потребителско име..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="login-input-group">
            <label htmlFor="password">Парола</label>
            <div className="login-input-wrapper">
              <Lock size={16} className="login-field-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="Въведете парола..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn-login-submit ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="login-spinner"></span>
            ) : (
              <>
                <LogIn size={16} />
                <span>Влизане</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Връзката е защитена чрез SSL криптиране директно към Вашия Jellyfin сървър.</p>
        </div>
      </div>
    </div>
  )
}
