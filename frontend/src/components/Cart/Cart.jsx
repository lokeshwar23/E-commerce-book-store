import { useState, useEffect } from 'react';
import api, { cartAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Cart = ({ onCartChange }) => {
  const [cart, setCart] = useState({ items: [], discount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState({ isLoggedIn: false, addresses: [] });
  const navigate = useNavigate();

  useEffect(() => {
    loadCart();
  }, []);

  // ✅ Check auth status on mount
  useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const profile = await api.get('/profile');
          setUser({ isLoggedIn: true, ...profile.data });
        } catch (err) {
          console.error("Failed to fetch profile", err);
          setUser({ isLoggedIn: true, addresses: [] });
        }
      } else {
        setUser({ isLoggedIn: false, addresses: [] });
      }
    };
    checkAuthAndFetchProfile();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartAPI.get();
      setCart(cartData);
      setError(null);
    } catch (err) {
      setError('Failed to load cart');
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity < 1) return;
    setCart(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.productId === productId ? { ...item, quantity } : item
      )
    }));
    try {
      await cartAPI.updateQuantity(productId, quantity);
      onCartChange();
    } catch (err) {
      console.error('Error updating quantity:', err);
      loadCart();
    }
  };

  const removeItem = async productId => {
    setCart(prev => ({
      ...prev,
      items: prev.items.filter(item => item.productId !== productId)
    }));
    try {
      await cartAPI.removeItem(productId);
      onCartChange();
    } catch (err) {
      console.error('Error removing item:', err);
      loadCart();
    }
  };

  const applyDiscount = async code => {
    try {
      const updatedCart = await cartAPI.applyDiscount(code);
      setCart(updatedCart);
    } catch (err) {
      console.error('Error applying discount:', err);
    }
  };

  const clearCart = async () => {
    try {
      await cartAPI.clear();
      setCart({ items: [], discount: 0 });
      onCartChange();
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
  };

  const handleCheckout = () => {
    if (!user.isLoggedIn) {
      navigate('/cart_login');
      return;
    }
    if (cart.items.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    navigate('/checkout');
  };

  const subtotal = cart.items.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    return sum + price * quantity;
  }, 0);

  const discountAmount = subtotal * (Number(cart.discount) / 100);
  const total = subtotal - discountAmount;
  const itemCount = cart.items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0
  );

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <h2>Loading cart...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Error: {error}</h2>
          <button onClick={loadCart} style={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Shopping Cart</h1>
        {itemCount > 0 && (
          <span style={styles.itemCount}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {cart.items.length === 0 ? (
        <div style={styles.emptyCart}>
          <h2>Your cart is empty</h2>
          <p>Add some books to get started!</p>
        </div>
      ) : (
        <>
          <div style={styles.cartItems}>
            {cart.items.map(item => (
              <div key={item.id} style={styles.cartItem}>
                <div style={styles.itemImage}>{item.image}</div>
                <div style={styles.itemDetails}>
                  <h3 style={styles.itemName}>{item.name}</h3>
                  <p style={styles.itemPrice}>₹{item.price.toFixed(2)}</p>
                </div>
                <div style={styles.itemQuantity}>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity - 1)
                    }
                    style={styles.quantityButton}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span style={styles.quantity}>{item.quantity}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.productId, item.quantity + 1)
                    }
                    style={styles.quantityButton}
                  >
                    +
                  </button>
                </div>
                <div style={styles.itemTotal}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  style={styles.removeButton}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={styles.discountSection}>
            <h3>Discount Codes</h3>
            <p style={styles.discountInfo}>Try: SAVE10, SAVE20, WELCOME</p>
            <div style={styles.discountButtons}>
              {['SAVE10', 'SAVE20', 'WELCOME'].map(code => (
                <button
                  key={code}
                  onClick={() => applyDiscount(code)}
                  style={styles.discountButton}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.totals}>
            <div style={styles.totalRow}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {cart.discount > 0 && (
              <div style={styles.totalRow}>
                <span>Discount ({cart.discount}%):</span>
                <span style={styles.discount}>
                  -₹{discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div style={styles.totalRow}>
              <span style={styles.grandTotal}>Total:</span>
              <span style={styles.grandTotal}>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div style={styles.actions}>
            <button onClick={clearCart} style={styles.clearButton}>
              Clear Cart
            </button>
            <button onClick={handleCheckout} style={styles.checkoutButton}>
              Checkout - ₹{total.toFixed(2)}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e5e7eb'
  },
  itemCount: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px'
  },
  error: {
    textAlign: 'center',
    padding: '50px',
    color: '#ef4444'
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  emptyCart: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  },
  cartItems: {
    marginBottom: '30px'
  },
  cartItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '20px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '16px',
    backgroundColor: 'white'
  },
  itemImage: {
    fontSize: '40px',
    marginRight: '20px'
  },
  itemDetails: {
    flex: 1
  },
  itemName: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937'
  },
  itemPrice: {
    margin: 0,
    color: '#6b7280',
    fontSize: '14px'
  },
  itemQuantity: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '0 20px'
  },
  quantityButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  },
  quantity: {
    minWidth: '20px',
    textAlign: 'center',
    fontWeight: '500'
  },
  itemTotal: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#059669',
    margin: '0 20px',
    minWidth: '80px',
    textAlign: 'right'
  },
  removeButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  discountSection: {
    backgroundColor: '#f9fafb',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px'
  },
  discountInfo: {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '16px'
  },
  discountButtons: {
    display: 'flex',
    gap: '12px'
  },
  discountButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  totals: {
    backgroundColor: '#f3f4f6',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '30px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: '16px'
  },
  discount: {
    color: '#059669'
  },
  grandTotal: {
    fontSize: '18px',
    fontWeight: 'bold',
    borderTop: '1px solid #d1d5db',
    paddingTop: '12px',
    marginTop: '12px'
  },
  actions: {
    display: 'flex',
    gap: '16px'
  },
  clearButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '16px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    flex: 1
  },
  checkoutButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '16px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    flex: 2
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    width: '400px',
  },
  addressOption: {
    marginBottom: '10px',
  },
  modalActions: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    marginRight: '10px',
  },
  confirmButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};

export default Cart;
