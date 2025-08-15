import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generate a simple session ID for cart management
const getSessionId = () => {
  let sessionId = localStorage.getItem('cartSessionId');
  if (!sessionId) {
    sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('cartSessionId', sessionId);
  }
  return sessionId;
};

// Authentication API
export const authAPI = {
  // User registration
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // User login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

// Products API
export const productsAPI = {
  // Get all products with optional filtering (array only)
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.genre && filters.genre !== 'All') params.append('genre', filters.genre);
    if (filters.language && filters.language !== 'All') params.append('language', filters.language);
    if (filters.bookType && filters.bookType !== 'All') params.append('bookType', filters.bookType);
    if (filters.author) params.append('author', filters.author);
    // If page/limit provided, backend will return a paginated object; this method strips to items only
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    
    const response = await api.get(`/products?${params}`);
    const data = response.data;
    return Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
  },

  // Get all products with optional filtering and keep pagination meta
  getAllWithMeta: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.genre && filters.genre !== 'All') params.append('genre', filters.genre);
    if (filters.language && filters.language !== 'All') params.append('language', filters.language);
    if (filters.bookType && filters.bookType !== 'All') params.append('bookType', filters.bookType);
    if (filters.author) params.append('author', filters.author);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));

    const response = await api.get(`/products?${params}`);
    const data = response.data;
    if (Array.isArray(data)) {
      return { items: data, page: 1, limit: data.length, total: data.length, totalPages: 1 };
    }
    const { items = [], page = 1, limit = items.length, total = items.length, totalPages = 1 } = data || {};
    return { items, page, limit, total, totalPages };
  },

  // Get single product by ID
  getById: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Get products by category
  getByCategory: async (category) => {
    const response = await api.get(`/products/category/${category}`);
    return response.data;
  },

  // Get available genres
  getGenres: async () => {
    const response = await api.get('/products/genres/list');
    return response.data;
  },

  // Get available languages
  getLanguages: async () => {
    const response = await api.get('/products/languages/list');
    return response.data;
  },

  // Get available book types
  getBookTypes: async () => {
    const response = await api.get('/products/types/list');
    return response.data;
  },

  // Get top rated books
  getTopRated: async () => {
    const response = await api.get('/products/top/rated');
    return response.data;
  },

  // Get bestselling books
  getBestselling: async () => {
    const response = await api.get('/products/top/bestselling');
    return response.data;
  }
};

// Cart API
export const cartAPI = {
  // Get cart
  get: async () => {
    const sessionId = getSessionId();
    const response = await api.get(`/cart/${sessionId}`);
    return response.data;
  },

  // Add item to cart
  addItem: async (productId, quantity = 1) => {
    const sessionId = getSessionId();
    const response = await api.post(`/cart/${sessionId}/items`, { productId, quantity });
    return response.data;
  },

  // Update item quantity
  updateQuantity: async (productId, quantity) => {
    const sessionId = getSessionId();
    const response = await api.put(`/cart/${sessionId}/items/${productId}`, { quantity });
    return response.data;
  },

  // Remove item from cart
  removeItem: async (productId) => {
    const sessionId = getSessionId();
    const response = await api.delete(`/cart/${sessionId}/items/${productId}`);
    return response.data;
  },

  // Apply discount code
  applyDiscount: async (code) => {
    const sessionId = getSessionId();
    const response = await api.post(`/cart/${sessionId}/discount`, { code });
    return response.data;
  },

  // Clear cart
  clear: async () => {
    const sessionId = getSessionId();
    const response = await api.delete(`/cart/${sessionId}`);
    return response.data;
  },

  // Checkout
  checkout: async (checkoutData) => {
    const sessionId = getSessionId();
    const response = await api.post(`/cart/${sessionId}/checkout`, checkoutData);
    return response.data;
  },

  // Merge guest cart with user cart
  merge: async () => {
    const sessionId = getSessionId();
    const response = await api.post(`/cart/${sessionId}/merge`);
    return response.data;
  },
};

export default api;
