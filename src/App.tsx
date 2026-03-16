import React, { useState, useEffect } from 'react';
import { ShoppingBag, ShieldCheck, User, Plus, Edit2, Trash2, Search, X } from 'lucide-react';

// --- Types ---
interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category_id: number;
  category_name?: string;
  image_url: string;
}

interface Category {
  id: number;
  name: string;
}

// --- Main App Component ---
export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  // Fetch initial data
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  // Refetch products when search or category changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch categories');
      }
      setCategories(data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      setError(error.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch products');
      }
      setProducts(data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch products:', error);
      setError(error.message);
      setProducts([]);
    }
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    const url = editingProduct 
      ? `/api/products/${editingProduct.id}` 
      : '/api/products';
    
    const method = editingProduct ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to save product');
    }
    
    await fetchProducts();
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: number) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      await fetchProducts();
      setProductToDelete(null);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setError(error.message);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Catalog
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                isAdmin 
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
              {isAdmin ? 'Admin Mode' : 'User Mode'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Our Products</h2>
            <p className="text-slate-500 mt-1">Browse our latest collection</p>
          </div>
          
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border border-slate-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            <h3 className="font-semibold mb-1">Error</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Product Grid */}
        {!error && products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 border-dashed">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No products found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
                <div className="aspect-w-4 aspect-h-3 bg-slate-200 relative">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=400&h=300'}
                    alt={product.name}
                    className="object-cover w-full h-48"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('placeholder')) {
                        target.src = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?auto=format&fit=crop&q=80&w=400&h=300';
                      }
                    }}
                  />
                  {product.category_name && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-slate-700 shadow-sm">
                      {product.category_name}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">{product.name}</h3>
                    <span className="text-lg font-bold text-indigo-600">${Number(product.price).toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">
                    {product.description || 'No description available.'}
                  </p>
                  
                  {isAdmin && (
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => openEditModal(product)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => setProductToDelete(product.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductFormModal
          product={editingProduct}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete !== null && (
        <DeleteConfirmModal
          onConfirm={() => handleDeleteProduct(productToDelete)}
          onCancel={() => setProductToDelete(null)}
        />
      )}
    </div>
  );
}

// --- Delete Confirmation Modal Component ---
function DeleteConfirmModal({ 
  onConfirm, 
  onCancel 
}: { 
  onConfirm: () => Promise<void>, 
  onCancel: () => void 
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    await onConfirm();
    setIsDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Product</h3>
          <p className="text-slate-500 mb-6">
            Are you sure you want to delete this product? This action cannot be undone.
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Product Form Modal Component ---
function ProductFormModal({ 
  product, 
  categories, 
  onSave, 
  onClose 
}: { 
  product: Product | null, 
  categories: Category[], 
  onSave: (p: Partial<Product>) => Promise<void>, 
  onClose: () => void 
}) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category_id: categories.length > 0 ? categories[0].id : 0,
    image_url: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData(product);
    } else if (categories.length > 0 && !formData.category_id) {
      setFormData(prev => ({ ...prev, category_id: categories[0].id }));
    }
  }, [product, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      setError(error.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-xl font-semibold text-slate-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Price ($) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                value={formData.category_id || ''}
                onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
            <input
              type="url"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              value={formData.image_url || ''}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

