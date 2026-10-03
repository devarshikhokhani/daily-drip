import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Synchronously initialize user from localStorage to prevent "Sign In" button flash on refresh
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('dd_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('dd_token'));
  const [loading, setLoading] = useState(true);

  // Validate token and fetch fresh user details on mount
  useEffect(() => {
    async function verifyAuth() {
      const storedToken = localStorage.getItem('dd_token');
      if (!storedToken) {
        setUser(null);
        localStorage.removeItem('dd_user');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem('dd_user', JSON.stringify(data.user));
          setToken(storedToken);
        } else {
          // Token invalid or expired
          localStorage.removeItem('dd_token');
          localStorage.removeItem('dd_user');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('dd_token', data.token);
    localStorage.setItem('dd_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password, role = 'customer') => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    localStorage.setItem('dd_token', data.token);
    localStorage.setItem('dd_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('dd_token');
    localStorage.removeItem('dd_user');
    setToken(null);
    setUser(null);
  };

  // Instant demo accounts helper
  const demoLogin = async (role) => {
    const credentials = {
      customer: { email: 'customer@dailydrip.cafe', password: 'coffee123' },
      staff: { email: 'barista@dailydrip.cafe', password: 'barista123' },
      admin: { email: 'admin@dailydrip.cafe', password: 'admin123' }
    };

    const cred = credentials[role] || credentials.customer;
    return await login(cred.email, cred.password);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => {
      const next = { ...prev, ...updatedUser };
      localStorage.setItem('dd_user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      demoLogin,
      updateUser,
      isAuthenticated: !!user,
      isStaff: user?.role === 'staff' || user?.role === 'admin',
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
