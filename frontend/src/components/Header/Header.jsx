import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, cartAPI } from '../../services/api';

const Header = ({ cartItemCount = 0 }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const readUser = () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('user');
      if (token && userData) {
        setUser(JSON.parse(userData));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    readUser();
    setLoading(false);
    const handler = () => readUser();
    window.addEventListener('authChanged', handler);
    return () => window.removeEventListener('authChanged', handler);
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      await cartAPI.clear();
    } catch (error) {
      // ignore
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('cartSessionId');
      window.dispatchEvent(new Event('authChanged'));
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <header style={styles.header}>
        <div style={styles.container}>
          <div style={styles.logo}>
            <Link to="/" style={styles.logoLink}>
              📚 Amazon Books Store
            </Link>
          </div>
          <div style={styles.nav}>
            <span>Loading...</span>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <div style={styles.logo}>
          <Link to="/" style={styles.logoLink}>
            📚 E-Commerce Book Store
          </Link>
        </div>
        
        <nav style={styles.nav}>
          <Link to="/" style={styles.navLink}>
            Home
          </Link>
          
          {user ? (
            <>
              <Link to="/profile" style={styles.navLink}>
                Profile
              </Link>
              <span style={styles.userInfo}>
                Welcome, {user.username}!
              </span>
              <button
                onClick={handleLogout}
                style={styles.logoutButton}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.authLink}>
                Login
              </Link>
              <Link to="/register" style={styles.authLink}>
                Register
              </Link>
            </>
          )}
          
          <Link to="/cart" style={styles.cartLink}>
            🛒 Cart ({cartItemCount})
          </Link>
        </nav>
      </div>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: 'rgb(0, 136, 204)',
    color: 'white',
    padding: '1rem 0',
    boxShadow: '0 2px 4px rgba(220, 231, 233, 0.1)'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold'
  },
  logoLink: {
    color: 'white',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
  },
  authLink: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: '1px solid #6b7280',
    backgroundColor: 'rgba(155, 73, 10, 0.93)',
  },
  userInfo: {
    color: '#fbbf24',
    fontWeight: '500'
  },
  logoutButton: {
    backgroundColor: 'rgb(40, 217, 197)',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    cursor: 'pointer',
  },
  cartLink: {
    color: 'white',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '0.375rem',
    border: '1px solid rgba(240, 63, 63, 0.08)',
    backgroundColor: 'rgba(242, 148, 192, 0.05)',
  }
};

export default Header;
