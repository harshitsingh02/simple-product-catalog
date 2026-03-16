import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import mysql from 'mysql2/promise';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  let pool: mysql.Pool | null = null;
  let dbInitError: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      let dbUrl = process.env.DATABASE_URL.trim();
      
      // Fix common copy-paste mistakes (e.g., using https:// instead of mysql://)
      if (dbUrl.startsWith('https://') || dbUrl.startsWith('http://')) {
        dbUrl = dbUrl.replace(/^https?:\/\//, 'mysql://');
      }
      
      // Ensure a database name is specified (Aiven defaults to 'defaultdb')
      try {
        const parsedUrl = new URL(dbUrl);
        console.log(`Attempting to connect to MySQL host: ${parsedUrl.hostname} on port ${parsedUrl.port || 3306}`);
        
        if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
          parsedUrl.pathname = '/defaultdb';
          dbUrl = parsedUrl.toString();
        }
      } catch (e) {
        console.warn('Could not parse DATABASE_URL, proceeding with raw value.');
      }

      pool = mysql.createPool({
        uri: dbUrl,
        ssl: {
          rejectUnauthorized: false // Often required for managed databases like Aiven
        },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Initialize MySQL tables
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          category_id INT,
          image_url VARCHAR(1024),
          FOREIGN KEY (category_id) REFERENCES categories(id)
        )
      `);

      // Seed initial data if empty
      const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM categories');
      if (rows[0].count === 0) {
        await pool.query(`INSERT INTO categories (name) VALUES ('Electronics'), ('Clothing'), ('Books'), ('Home & Garden')`);
        await pool.query(`
          INSERT INTO products (name, description, price, category_id, image_url) VALUES 
          ('Wireless Headphones', 'High-quality noise-canceling headphones.', 199.99, 1, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=400&h=300'),
          ('Cotton T-Shirt', 'Comfortable 100% cotton t-shirt.', 19.99, 2, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400&h=300'),
          ('JavaScript The Good Parts', 'A classic book on JavaScript.', 29.99, 3, 'https://images.unsplash.com/photo-1589998059171-988d887df646?auto=format&fit=crop&q=80&w=400&h=300'),
          ('Ceramic Planter', 'Beautiful ceramic planter for indoor plants.', 34.50, 4, 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&q=80&w=400&h=300')
        `);
      }
      console.log('MySQL Database initialized successfully');
    } catch (error: any) {
      console.error('Failed to initialize MySQL database:', error);
      dbInitError = error.message || String(error);
      pool = null;
    }
  } else {
    console.warn('DATABASE_URL is not set. Please set it to your Aiven MySQL connection string.');
  }

  // Middleware to check if DB is configured
  const checkDb = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!pool) {
      if (dbInitError) {
        return res.status(500).json({ error: `Database connection failed: ${dbInitError}. Please check your connection string and ensure your database allows connections from all IPs (0.0.0.0/0).` });
      }
      return res.status(500).json({ error: 'Database not configured. Please set DATABASE_URL environment variable.' });
    }
    next();
  };

  // API Routes
  
  // Get all categories
  app.get('/api/categories', checkDb, async (req, res) => {
    try {
      const [categories] = await pool!.query('SELECT * FROM categories');
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // Get products with optional search and category filter
  app.get('/api/products', checkDb, async (req, res) => {
    try {
      const { search, category } = req.query;
      let query = 'SELECT products.*, categories.name as category_name FROM products LEFT JOIN categories ON products.category_id = categories.id WHERE 1=1';
      const params: any[] = [];

      if (search) {
        query += ' AND (products.name LIKE ? OR products.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (category) {
        query += ' AND products.category_id = ?';
        params.push(Number(category));
      }

      query += ' ORDER BY products.id DESC';

      const [products] = await pool!.query(query, params);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // Add a new product
  app.post('/api/products', checkDb, async (req, res) => {
    try {
      const { name, description, price, category_id, image_url } = req.body;
      if (!name || price == null) {
        return res.status(400).json({ error: 'Name and price are required' });
      }

      // Convert 0 or empty string to null for category_id
      const finalCategoryId = (category_id === 0 || category_id === '' || category_id === undefined) ? null : category_id;
      const finalImageUrl = image_url || '';

      console.log(`Adding product: ${name}, Image: ${finalImageUrl}`);

      const [result] = await pool!.execute<mysql.ResultSetHeader>(
        'INSERT INTO products (name, description, price, category_id, image_url) VALUES (?, ?, ?, ?, ?)',
        [name, description, price, finalCategoryId, finalImageUrl]
      );

      const [newProduct] = await pool!.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
      res.status(201).json((newProduct as any[])[0]);
    } catch (error: any) {
      console.error('Failed to add product:', error);
      res.status(500).json({ error: `Failed to add product: ${error.message || String(error)}` });
    }
  });

  // Update a product
  app.put('/api/products/:id', checkDb, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, price, category_id, image_url } = req.body;

      if (!name || price == null) {
        return res.status(400).json({ error: 'Name and price are required' });
      }

      // Convert 0 or empty string to null for category_id
      const finalCategoryId = (category_id === 0 || category_id === '' || category_id === undefined) ? null : category_id;
      const finalImageUrl = image_url || '';

      console.log(`Updating product ${id}: ${name}, Image: ${finalImageUrl}`);

      const [result] = await pool!.execute<mysql.ResultSetHeader>(
        'UPDATE products SET name = ?, description = ?, price = ?, category_id = ?, image_url = ? WHERE id = ?',
        [name, description, price, finalCategoryId, finalImageUrl, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const [updatedProduct] = await pool!.query('SELECT * FROM products WHERE id = ?', [id]);
      res.json((updatedProduct as any[])[0]);
    } catch (error: any) {
      console.error('Failed to update product:', error);
      res.status(500).json({ error: `Failed to update product: ${error.message || String(error)}` });
    }
  });

  // Delete a product
  app.delete('/api/products/:id', checkDb, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [result] = await pool!.execute<mysql.ResultSetHeader>('DELETE FROM products WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
