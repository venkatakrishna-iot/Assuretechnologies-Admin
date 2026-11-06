import { useState, useEffect } from 'react';
import type { Product } from '../types';
import './ProductTable.css';
import { BASE_URL } from '../services/api';

interface ProductTableProps {
  products: Product[];
  onEditProduct: (id: string) => void;
  onDeleteProduct: (id: string) => void;
  onToggleStatus?: (product: Product) => void;
}

function ImageCell({ image, alt }: { image?: string | File; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setUrl(null);
      return;
    }
    if (image instanceof File) {
      const objectUrl = URL.createObjectURL(image);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else if (typeof image === 'string') {
      if (image.startsWith('/uploads/')) {
        setUrl(`${BASE_URL}${image}`);
      } else {
        setUrl(image);
      }
    }
  }, [image]);

  if (!url) return <span className="product-banner-text">{alt}</span>;
  return <img src={url} alt={alt} style={{ height: '40px', width: 'auto', borderRadius: '4px', objectFit: 'cover' }} />;
}

export default function ProductTable({ products, onEditProduct, onDeleteProduct, onToggleStatus }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="glass-panel product-table-empty">
        No products found. Add a product to get started.
      </div>
    );
  }

  return (
    <div className="glass-panel product-table-wrapper">
      <div className="product-table-scroll">
        <table className="product-table">
          <thead>
            <tr>
              <th className="id-col">ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Banner</th>
              <th>Price</th>
              <th>GST Slab</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td className="product-id" title={product.id}>
                  {product.display_id || product.id}
                </td>
                <td>
                  <div className="product-name">
                    {product.name} 
                    {product.vendor_id && <span style={{fontSize: '10px', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', color: '#475569'}}>Vendor</span>}
                  </div>
                  <div className="product-desc">{product.description}</div>
                </td>
                <td>
                  <span className="product-category-badge">
                    {product.category}
                  </span>
                </td>
                <td className="product-banner">
                  <ImageCell image={product.banner} alt={product.bannerName || 'Product'} />
                </td>
                <td className="product-price">{product.price}</td>
                <td>
                  <span style={{ fontSize: '0.82rem', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', fontWeight: 600, color: '#334155' }}>
                    {product.tax_slab != null ? `${product.tax_slab}%` : '18%'}
                  </span>
                </td>
                <td>
                  <span className={`product-status-badge ${product.status === 'In Stock' || product.status === 'Active' ? 'product-status-success' : 'product-status-warning'}`}>
                    {product.status}
                  </span>
                </td>
                <td>
                  <div className="product-actions" style={{display: 'flex', alignItems: 'center'}}>
                    {onToggleStatus && (
                      <label className="switch" title="Toggle Status" style={{ marginRight: '10px', marginBottom: '0' }}>
                        <input 
                          type="checkbox" 
                          checked={product.status === 'In Stock' || product.status === 'Active'}
                          onChange={() => onToggleStatus(product)}
                        />
                        <span className="slider round"></span>
                      </label>
                    )}
                    <button
                      onClick={() => onEditProduct(product.id)}
                      className="action-btn edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteProduct(product.id)}
                      className="action-btn delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
