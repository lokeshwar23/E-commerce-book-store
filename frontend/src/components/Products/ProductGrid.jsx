import { useState, useEffect } from 'react';
import { productsAPI } from '../../services/api';

const normalizeKey = (k) => (k || '')
  .toString()
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const pick = (obj, candidates = []) => {
  if (!obj || typeof obj !== 'object') return undefined;
  const map = new Map();
  Object.keys(obj).forEach((k) => {
    map.set(normalizeKey(k), obj[k]);
  });
  for (const c of candidates) {
    const val = map.get(normalizeKey(c));
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return undefined;
};

const getBookEmoji = (bookType) => {
  const emojis = {
    'paperback': '📚',
    'hardcover': '📖',
    'boardbook': '📘',
    'massmarketpaperback': '📙',
    'spiralbound': '📗',
    'productbundle': '📚'
  };
  const key = normalizeKey(bookType);
  return emojis[key] || '📚';
};

const generateBookPrice = (bookType) => {
  const basePrices = {
    paperback: { min: 200, max: 800 },
    hardcover: { min: 400, max: 1200 },
    boardbook: { min: 150, max: 500 },
    massmarketpaperback: { min: 150, max: 400 },
    spiralbound: { min: 300, max: 800 },
    productbundle: { min: 500, max: 1500 },
    default: { min: 200, max: 600 }
  };
  const key = normalizeKey(bookType);
  const range = basePrices[key] || basePrices.default;
  const val = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  return Number.isFinite(val) ? val : 0;
};

const getLanguageDisplayName = (code) => {
  const languages = {
    'en': 'English',
    'hi': 'Hindi',
    'mixed': 'Mixed'
  };
  return languages[code] || code;
};

const normalizeProduct = (p) => {
  // Prefer DB mapped fields, then CSV-like variants, case/format insensitive
  const id = p.id || p._id || pick(p, ['isbn', 'sku', 'uid']) || String(Math.random());
  const name = p.name || pick(p, ['book_name', 'book name', 'title']) || 'Unknown Book';
  const author = p.author || pick(p, ['author_name', 'author name', 'writer']) || 'Unknown Author';
  const bookType = p.bookType || pick(p, ['book_type', 'type', 'format']) || 'Paperback';
  const genre = p.genre || pick(p, ['category', 'genre']) || 'General';
  const language = p.language || pick(p, ['language', 'lang']) || 'English';
  const image = p.image || getBookEmoji(bookType);

  // Rating: use database value directly
  let rating = Number(p.rating) || 0;
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) rating = 0;

  // Votes: use database value directly
  let votes = Number(p.votes) || 0;
  if (!Number.isFinite(votes) || votes < 0) votes = 0;

  // Price: parse robustly from various fields/strings and capture currency symbol
  const rawPrice = p.price ?? pick(p, ['price', 'amount', 'mrp', 'cost', 'sale_price', 'sellingprice', 'offerprice', 'price_text', 'pricetext']);
  let currencySymbol = '₹';
  if (typeof rawPrice === 'string') {
    if (rawPrice.includes('$')) currencySymbol = '$';
  }
  let priceNum;
  if (typeof rawPrice === 'string') {
    // keep digits and optional single dot
    const cleaned = rawPrice.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
    priceNum = parseFloat(cleaned);
  } else {
    priceNum = Number(rawPrice);
  }
  if (!Number.isFinite(priceNum) || priceNum < 0) {
    priceNum = generateBookPrice(bookType);
  }

  return {
    id,
    name,
    author,
    price: priceNum,
    currencySymbol,
    category: p.category || 'Books',
    image,
    rating,
    description: p.description || `${name} by ${author}. ${bookType} • ${rating}⭐ (${votes} votes)`,
    stock: Number(p.stock) || 0,
    bookType,
    votes,
    amazonLink: p.amazonLink || pick(p, ['book_link', 'url']) || '',
    isbn: p.isbn || '',
    language: getLanguageDisplayName(p.bookLanguage || p.language),
    genre,
  };
};

const ProductGrid = ({ onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: 'All',
    genre: 'All',
    language: 'All',
    bookType: 'All',
    search: '',
    sortBy: 'name'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(24);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [availableFilters, setAvailableFilters] = useState({
    genres: [],
    languages: [],
    bookTypes: []
  });

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, limit]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { items, page: curPage, limit: curLimit, total: curTotal, totalPages: curTotalPages } = await productsAPI.getAllWithMeta({ ...filters, page, limit });
      setProducts(Array.isArray(items) ? items : []);
      setPage(curPage || 1);
      setLimit(curLimit || 24);
      setTotal(curTotal || 0);
      setTotalPages(curTotalPages || 1);
      setError(null);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [genres, languages, bookTypes] = await Promise.all([
        productsAPI.getGenres(),
        productsAPI.getLanguages(),
        productsAPI.getBookTypes()
      ]);
      
      setAvailableFilters({
        genres: ['All', ...((genres || []).filter(Boolean))],
        languages: ['All', ...((languages || []).filter(Boolean))],
        bookTypes: ['All', ...((bookTypes || []).filter(Boolean))]
      });
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  useEffect(() => { loadFilterOptions(); }, []);

  const handleFilterChange = (filterName, value) => {
    setPage(1);
    if (filterName === 'search') {
      setSearchTerm(value);
    } else {
      setFilters(prev => ({
        ...prev,
        [filterName]: value
      }));
    }
  };

  const handleSearch = () => {
    setPage(1);
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
  };

  const handlePrev = () => setPage(p => Math.max(1, p - 1));
  const handleNext = () => setPage(p => Math.min(totalPages, p + 1));

  if (loading) {
    return (
      <div style={styles.loading}>
        <h2>Loading products...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <h2>Error: {error}</h2>
        <button 
          onClick={loadProducts}
          style={styles.retryButton}
        >
          Retry
        </button>
      </div>
    );
  }

  const normalized = products.map(normalizeProduct);

  return (
    <div style={styles.container}>
      {/* Filters */}
      <div style={styles.filters}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={styles.searchInput}
          />
          <button onClick={handleSearch} style={styles.searchButton}>Search</button>
        </div>
        
        <div style={styles.filterRow}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Genre: </label>
            <select
              value={filters.genre}
              onChange={(e) => handleFilterChange('genre', e.target.value)}
              style={styles.filterSelect}
            >
              {availableFilters.genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Language: </label>
            <select
              value={filters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
              style={styles.filterSelect}
            >
              {availableFilters.languages.map(language => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Book Type: </label>
            <select
              value={filters.bookType}
              onChange={(e) => handleFilterChange('bookType', e.target.value)}
              style={styles.filterSelect}
            >
              {availableFilters.bookTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>Sort by: </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              style={styles.filterSelect}
            >
              <option value="name">Name</option>
              <option value="price">Price</option>
              <option value="rating">Rating</option>
              <option value="votes">Popularity</option>
              <option value="author">Author</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label>Per page:</label>
            <select value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }} style={styles.filterSelect}>
              {[12, 24, 36, 48].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div style={styles.productGrid}>
        {normalized.length === 0 ? (
          <div style={styles.noProducts}>
            <h3>No products found</h3>
            <p>Try adjusting your filters or search terms</p>
          </div>
        ) : (
          normalized.map(product => (
            <div key={product.id} style={styles.productCard}>
              <div style={styles.productImage}>
                {(() => {
                  let href = product.amazonLink;
                  if (href && typeof href === 'string') {
                    if (!/^https?:\/\//i.test(href)) {
                      href = 'https://' + href.replace(/^\/+/, '');
                    }
                  } else {
                    href = product.id ? `http://localhost:5000/api/products/image/${product.id}` : undefined;
                  }
                  return href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" title="Open product page" style={{ textDecoration: 'none' }}>
                      <span style={{ cursor: 'pointer' }}>{product.image}</span>
                    </a>
                  ) : (
                    <span>{product.image}</span>
                  );
                })()}
              </div>
              <div style={styles.productInfo}>
                <h3 style={styles.productName}>{product.name}</h3>
                <p style={styles.productAuthor}>by {product.author}</p>
                <p style={styles.productMeta}>
                  {product.genre} • {product.language} • {product.bookType}
                </p>
                <div style={styles.productRating}>
                  <span style={styles.star}>★</span>
                  <span style={styles.rating}>{product.rating.toFixed(1)}</span>
                  <span style={styles.votes}>
                    ({product.votes.toLocaleString()} votes)
                  </span>
                </div>
                <div style={styles.productFooter}>
                  <span style={styles.productPrice}>
                    {(product.currencySymbol || '₹')}{product.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => onAddToCart(product)}
                    style={styles.addToCartButton}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px' }}>
        <button onClick={handlePrev} disabled={page <= 1} style={{ ...styles.addToCartButton, backgroundColor: '#6b7280' }}>Prev</button>
        <div>
          Page {page} of {totalPages} • {total.toLocaleString()} items
        </div>
        <button onClick={handleNext} disabled={page >= totalPages} style={{ ...styles.addToCartButton }}>Next</button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px'
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
  filters: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  },
  searchContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '16px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '16px',
    '&:focus': {
      outline: 'none',
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  filterRow: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: 'white'
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '24px'
  },
  productCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: 'white',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.15)'
    }
  },
  productImage: {
    fontSize: '60px',
    textAlign: 'center',
    marginBottom: '16px'
  },
  productInfo: {
    textAlign: 'center'
  },
  productName: {
    margin: '0 0 8px 0',
    color: '#1f2937',
    fontSize: '16px',
    lineHeight: '1.4',
    fontWeight: '600'
  },
  productAuthor: {
    color: '#3b82f6',
    margin: '6px 0',
    fontWeight: '500',
    fontSize: '14px'
  },
  productMeta: {
    color: '#6b7280',
    margin: '6px 0',
    fontSize: '12px'
  },
  productRating: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    margin: '12px 0'
  },
  star: {
    color: '#fbbf24',
    fontSize: '16px'
  },
  rating: {
    color: '#374151',
    fontWeight: '500'
  },
  votes: {
    color: '#6b7280',
    fontSize: '12px'
  },
  productFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px'
  },
  productPrice: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#059669'
  },
  addToCartButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#2563eb'
    }
  },
  noProducts: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6b7280'
  }
};

export default ProductGrid;
