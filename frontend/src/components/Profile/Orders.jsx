import { useState, useEffect } from 'react';
import api from '../../services/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/profile/orders');
        setOrders(response.data);
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <div>Loading orders...</div>;
  }

  return (
    <div>
      <h3>My Orders</h3>
      {orders.length === 0 ? (
        <p>You have no orders.</p>
      ) : (
        orders.map(order => (
          <div key={order._id} style={styles.orderCard}>
            <h4>Order #{order.orderNumber}</h4>
            <p>Ordered on: {new Date(order.createdAt).toLocaleDateString()}</p>
            <p>Status: {order.status}</p>
            <p>Total: ₹{order.totalAmount.toFixed(2)}</p>
            <div style={styles.shippingAddress}>
              <h5>Shipping Address:</h5>
              <p>
                {order.shippingAddress.street}, {order.shippingAddress.city},<br />
                {order.shippingAddress.state} - {order.shippingAddress.zipCode},<br />
                {order.shippingAddress.country}
              </p>
            </div>
            <div>
              <h5>Items:</h5>
              {order.items.map(item => (
                <div key={item.product._id}>
                  <span>{item.product.name} x {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const styles = {
  orderCard: {
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '15px',
    marginBottom: '15px',
  },
  shippingAddress: {
    marginTop: '10px',
  },
};

export default Orders;
