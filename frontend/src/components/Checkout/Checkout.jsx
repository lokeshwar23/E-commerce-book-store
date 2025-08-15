import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { cartAPI } from '../../services/api';

const Checkout = () => {
  const [cart, setCart] = useState({ items: [], discount: 0 });
  const [user, setUser] = useState({ isLoggedIn: false, addresses: [] });
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const profile = await api.get('/profile');
          setUser({ isLoggedIn: true, ...profile.data });
          if (profile.data.addresses.length > 0) {
            setSelectedAddress(profile.data.addresses.find(a => a.isDefault) || profile.data.addresses[0]);
          }
        } else {
          navigate('/login');
        }
        const cartData = await cartAPI.get();
        setCart(cartData);
      } catch (error) {
        console.error('Failed to load checkout data', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [navigate]);

  const handleConfirmOrder = async () => {
    if (!selectedAddress) {
      alert('Please select a shipping address.');
      return;
    }
    try {
      await cartAPI.checkout({ ...cart, shippingAddress: selectedAddress });
      alert('Order placed successfully! 🎉');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to place order', error);
      alert('Failed to place order. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <h2>Checkout</h2>
      <div style={styles.addressSection}>
        <h3>Select Shipping Address</h3>
        {user.addresses.length > 0 ? (
          user.addresses.map(address => (
            <div key={address._id} style={styles.addressOption}>
              <input
                type="radio"
                id={address._id}
                name="address"
                value={address._id}
                checked={selectedAddress?._id === address._id}
                onChange={() => setSelectedAddress(address)}
              />
              <label htmlFor={address._id}>
                {address.street}, {address.city}, {address.state} {address.zipCode}
              </label>
            </div>
          ))
        ) : (
          <div>
            <p>No addresses found. Please add one to proceed.</p>
            <button onClick={() => navigate('/profile')} style={styles.addButton}>
              Add New Address
            </button>
          </div>
        )}
      </div>
      <div style={styles.cartSummary}>
        <h3>Order Summary</h3>
        {cart.items.map(item => (
          <div key={item.productId} style={styles.summaryItem}>
            <span>{item.name} x {item.quantity}</span>
            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <div style={styles.summaryTotal}>
          <strong>Total:</strong>
          <strong>₹{cart.total.toFixed(2)}</strong>
        </div>
      </div>
      <button onClick={handleConfirmOrder} style={styles.confirmButton}>
        Confirm Order
      </button>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  addressSection: {
    marginBottom: '20px',
  },
  addressOption: {
    marginBottom: '10px',
  },
  cartSummary: {
    marginBottom: '20px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '10px',
  },
  summaryTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    marginTop: '10px',
  },
  confirmButton: {
    backgroundColor: '#059669',
    color: 'white',
    border: 'none',
    padding: '15px 20px',
    borderRadius: '5px',
    cursor: 'pointer',
    width: '100%',
    fontSize: '16px',
  },
  addButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
  },
};

export default Checkout;
