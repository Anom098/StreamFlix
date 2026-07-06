import React, { useState } from 'react';
import { LogIn, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthPortalProps {
  onAuthSuccess: (user: { id: string; username: string; isAdmin: boolean }) => void;
  onClose: () => void;
  apiUrl?: string;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onAuthSuccess, onClose, apiUrl = 'http://localhost:5000' }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      if (isLogin) {
        setSuccess('Logged in successfully!');
        setTimeout(() => {
          onAuthSuccess({ id: data.id.toString(), username: data.username, isAdmin: data.isAdmin === true });
          onClose();
        }, 1000);
      } else {
        setSuccess('Account created! You can now log in.');
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '420px', padding: '2.5rem' }} 
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', textAlign: 'center' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem', textAlign: 'center' }}>
          {isLogin ? 'Access your watchlist and start streaming' : 'Sign up to build your custom watchlist'}
        </p>

        {error && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              color: '#ef4444', 
              padding: '0.75rem 1rem', 
              borderRadius: '6px', 
              fontSize: '0.85rem', 
              marginBottom: '1.25rem' 
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'rgba(16, 185, 129, 0.1)', 
              border: '1px solid rgba(16, 185, 129, 0.25)', 
              color: '#10b981', 
              padding: '0.75rem 1rem', 
              borderRadius: '6px', 
              fontSize: '0.85rem', 
              marginBottom: '1.25rem' 
            }}
          >
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#0a0c10',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#0a0c10',
                border: '1px solid var(--border-light)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>

          {!isLogin && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.5rem' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype password"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: '#0a0c10',
                  border: '1px solid var(--border-light)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ 
              justifyContent: 'center', 
              marginTop: '0.5rem', 
              padding: '0.8rem',
              borderRadius: '6px',
              width: '100%'
            }}
          >
            {loading ? (
              'Processing...'
            ) : isLogin ? (
              <>
                <LogIn size={18} /> Sign In
              </>
            ) : (
              <>
                <UserPlus size={18} /> Register
              </>
            )}
          </button>
        </form>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button 
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--accent)', 
              fontWeight: 700, 
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};
