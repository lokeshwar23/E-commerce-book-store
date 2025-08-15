import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header/Header';
import ProductGrid from './components/Products/ProductGrid';
import Cart from './components/Cart/Cart';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import CartLogin from './components/Auth/cart_login';
import Profile from './components/Profile/Profile';
import Checkout from './components/Checkout/Checkout';
import { cartAPI } from './services/api';

function App() {
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    const handleAuthChange = () => {
      loadCartCount();
    };

    window.addEventListener('authChanged', handleAuthChange);
    loadCartCount();

    return () => {
      window.removeEventListener('authChanged', handleAuthChange);
    };
  }, []);

  const loadCartCount = async () => {
    try {
      const cart = await cartAPI.get();
      const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      setCartItemCount(count);
    } catch (err) {
      console.error('Error loading cart count:', err);
      setCartItemCount(0);
    }
  };

  const handleCartChange = () => {
    loadCartCount();
  };

  const handleAddToCart = async (product) => {
    try {
      await cartAPI.addItem(product.id, 1);
      // Update cart count
      loadCartCount();
    } catch (err) {
      console.error('Error adding to cart:', err);
    }
  };

  return (
    <Router>
      <div className="App">
        <Header cartItemCount={cartItemCount} />
        <main>
          <Routes>
            <Route 
              path="/" 
              element={
                <ProductGrid onAddToCart={handleAddToCart} />
              } 
            />
            <Route 
              path="/cart" 
              element={
                <Cart onCartChange={handleCartChange} />
              } 
            />
            <Route 
              path="/login" 
              element={
                <Login />
              } 
            />
            <Route 
              path="/register" 
              element={
                <Register />
              } 
            />
            <Route 
              path="/cart_login" 
              element={
                <CartLogin />
              } 
            />
            <Route 
              path="/profile"
              element={
                <Profile />
              }
            />
            <Route 
              path="/checkout"
              element={
                <Checkout />
              }
            />
            <Route 
              path="*" 
              element={
                <Navigate to="/" replace />
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
