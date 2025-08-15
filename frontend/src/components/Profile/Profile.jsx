import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Orders from './Orders';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    addresses: [],
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/profile');
        setUser(response.data);
        setFormData({
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          phone: response.data.phone,
          addresses: response.data.addresses || [],
        });
      } catch (error) {
        console.error('Failed to fetch user', error);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (e, index) => {
    if (index !== undefined) {
      const newAddresses = [...formData.addresses];
      newAddresses[index][e.target.name] = e.target.value;
      setFormData({ ...formData, addresses: newAddresses });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleAddAddress = () => {
    setFormData({
      ...formData,
      addresses: [
        ...formData.addresses,
        { street: '', city: '', state: '', zipCode: '', country: 'India', isDefault: false },
      ],
    });
  };

  const handleRemoveAddress = (index) => {
    const newAddresses = [...formData.addresses];
    newAddresses.splice(index, 1);
    setFormData({ ...formData, addresses: newAddresses });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { addresses, ...userDetails } = formData;
      const userUpdateData = {
        ...userDetails,
        addresses,
      };
      const userResponse = await api.put('/profile/details', userUpdateData);
      setUser(userResponse.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update user', error);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Profile</h2>
      {isEditing ? (
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
            />
          </div>
          <h3 style={styles.subtitle}>Addresses</h3>
          {formData.addresses.map((address, index) => (
            <div key={index} style={styles.addressGroup}>
              <label style={styles.label}>Address {index + 1}</label>
              <input
                type="text"
                name="street"
                placeholder="Street"
                value={address.street}
                onChange={(e) => handleChange(e, index)}
                style={styles.input}
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                value={address.city}
                onChange={(e) => handleChange(e, index)}
                style={styles.input}
              />
              <input
                type="text"
                name="state"
                placeholder="State"
                value={address.state}
                onChange={(e) => handleChange(e, index)}
                style={styles.input}
              />
              <input
                type="text"
                name="zipCode"
                placeholder="Zip Code"
                value={address.zipCode}
                onChange={(e) => handleChange(e, index)}
                style={styles.input}
              />
              <input
                type="text"
                name="country"
                placeholder="Country"
                value={address.country}
                onChange={(e) => handleChange(e, index)}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => handleRemoveAddress(index)}
                style={styles.removeButton}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddAddress}
            style={styles.addButton}
          >
            Add Address
          </button>
          <div style={styles.buttonGroup}>
            <button type="submit" style={styles.saveButton}>
              Save
            </button>
            <button
              onClick={() => setIsEditing(false)}
              style={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div style={styles.details}>
          <p>
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
          <p>
            <strong>Phone:</strong> {user.phone}
          </p>
          <h3 style={styles.subtitle}>Addresses</h3>
          {user.addresses && user.addresses.length > 0 ? (
            user.addresses.map((address, index) => (
              <div key={index}>
                <p>
                  <strong>Address {index + 1}:</strong> {address.street}, {address.city}, {address.state} {address.zipCode}, {address.country}
                </p>
              </div>
            ))
          ) : (
            <p>No addresses provided</p>
          )}
          <button onClick={() => setIsEditing(true)} style={styles.editButton}>
            Edit
          </button>
        </div>
      )}
      <Orders />
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    border: '1px solid #ccc',
    borderRadius: '5px',
  },
  title: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    marginBottom: '5px',
  },
  input: {
    width: '100%',
    padding: '8px',
    boxSizing: 'border-box',
  },
  subtitle: {
    marginTop: '20px',
  },
  addressGroup: {
    marginBottom: '15px',
    border: '1px solid #eee',
    padding: '10px',
    borderRadius: '5px',
  },
  removeButton: {
    marginTop: '10px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '5px 10px',
    cursor: 'pointer',
  },
  addButton: {
    marginBottom: '15px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  saveButton: {
    backgroundColor: '#008CBA',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    cursor: 'pointer',
  },
  cancelButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    cursor: 'pointer',
  },
  details: {
    lineHeight: '1.6',
  },
  editButton: {
    marginTop: '20px',
    backgroundColor: '#008CBA',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    cursor: 'pointer',
  },
};

export default Profile;
