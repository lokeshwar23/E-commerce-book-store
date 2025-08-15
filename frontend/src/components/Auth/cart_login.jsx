import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import Login from './Login';
import Register from './Register';

const CartLogin = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already logged in, redirect to cart
    const token = localStorage.getItem('authToken');
    if (token) {
      navigate('/cart');
    }
  }, [navigate]);

  const handleLogin = async credentials => {
    try {
      await authAPI.login(credentials);
      navigate('/cart');
    } catch (err) {
      console.error('Login failed:', err);
      alert('Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async userData => {
    try {
      await authAPI.register(userData);
      navigate('/cart');
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Registration failed. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <div style={styles.tabs}>
          <button
            onClick={() => setIsLoggingIn(true)}
            style={isLoggingIn ? styles.activeTab : styles.tab}
          >
            Login
          </button>
          <button
            onClick={() => setIsLoggingIn(false)}
            style={!isLoggingIn ? styles.activeTab : styles.tab}
          >
            Register
          </button>
        </div>
        {isLoggingIn ? (
          <Login onLogin={handleLogin} />
        ) : (
          <Register onRegister={handleRegister} />
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '80vh',
    backgroundColor: '#f3f4f6'
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px',
    padding: '30px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },
  tabs: {
    display: 'flex',
    marginBottom: '20px'
  },
  tab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: '#e5e7eb',
    cursor: 'pointer',
    fontSize: '16px'
  },
  activeTab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontSize: '16px'
  }
};

export default CartLogin;
