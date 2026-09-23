require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { Pool } = require('pg');
const { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 5173;

// Configure Multer for in-memory image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize S3 Client if configured
let s3Client = null;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'carousel';
const s3AccessKey = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const s3SecretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
const s3Endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT;
const s3Region = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-2';

if (s3AccessKey && s3SecretKey) {
  s3Client = new S3Client({
    region: s3Region,
    endpoint: s3Endpoint || undefined,
    credentials: {
      accessKeyId: s3AccessKey,
      secretAccessKey: s3SecretKey
    },
    forcePathStyle: true // Needed for custom S3 endpoints
  });
  console.log(`📦 Neon S3 Client connected to bucket: "${S3_BUCKET_NAME}"`);
} else {
  console.log(`ℹ️ S3 credentials not set in .env yet. Running in hybrid local/database mode.`);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname)));

// PostgreSQL Connection Pool (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});


// Initialize Database Tables & Seed Initial Data
async function initDatabase() {
  try {
    const client = await pool.connect();
    console.log(' Successfully connected to Neon PostgreSQL database.');

    // 1. Create Carousel Items Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS carousel_items (
        id SERIAL PRIMARY KEY,
        image_url VARCHAR(500) NOT NULL,
        title VARCHAR(255) NOT NULL,
        tag VARCHAR(100) DEFAULT 'PROJECT SHOWCASE',
        project_url VARCHAR(500),
        display_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Create Website Hyperlinks Directory Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_links (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        url VARCHAR(500) NOT NULL,
        preview_image VARCHAR(500),
        badge VARCHAR(50) DEFAULT 'Live Deployment',
        tech_stack TEXT[] DEFAULT ARRAY['React', 'Node.js', 'PostgreSQL'],
        status VARCHAR(50) DEFAULT 'Active',
        display_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Check and Seed Carousel Items
    const carouselRes = await client.query('SELECT COUNT(*) FROM carousel_items');
    if (parseInt(carouselRes.rows[0].count, 10) === 0) {
      console.log('⚡ Seeding initial carousel items into Neon PostgreSQL...');
      const initialCarousel = [
        { image_url: './carousel/image-1.webp', title: 'Live Gold & Silver Billing Engine with Instant Estimation Receipt', tag: 'FINTECH & BILLING', project_url: 'app.applyus.io/billing-engine/live', display_order: 1 },
        { image_url: './carousel/image-2.webp', title: 'Accounts & Daily EOD Day Book (Cash Counter, Scrap & Net Profit)', tag: 'ACCOUNTING & ERP', project_url: 'app.applyus.io/accounts/eod-day-book', display_order: 2 },
        { image_url: './carousel/image-3.webp', title: 'Chronological Daily Entry Log (248+ Real-Time Transactions)', tag: 'FINANCIAL LEDGER', project_url: 'app.applyus.io/ledger/chronological-log', display_order: 3 },
        { image_url: './carousel/image-4.webp', title: 'Multi-Category Inventory & Stock Tracking with Reorder Alerts', tag: 'INVENTORY & LOGISTICS', project_url: 'app.applyus.io/inventory/stock-management', display_order: 4 },
        { image_url: './carousel/image-5.webp', title: 'Craftsman Order Dispatch & Real-Time Job Progress Tracking', tag: 'WORKFLOW AUTOMATION', project_url: 'app.applyus.io/workers/craftsman-dispatch', display_order: 5 },
        { image_url: './carousel/image-6.webp', title: 'Responsive Craftsman Mobile Portal with Live Metal Balances', tag: 'MOBILE APPS & SAAS', project_url: 'app.applyus.io/mobile/craftsman-portal', display_order: 6 },
        { image_url: './carousel/image-7.webp', title: 'Real-Time Order Dispatch Chat with Photo Attachments', tag: 'MESSENGER & AI CHAT', project_url: 'app.applyus.io/mobile/order-dispatch-chat', display_order: 7 },
        { image_url: './carousel/image-8.webp', title: 'Mobile Ledger & Metal Statement with Filterable Records', tag: 'DIGITAL LEDGER', project_url: 'app.applyus.io/mobile/transaction-statement', display_order: 8 },
        { image_url: './carousel/image-9.webp', title: 'Custom Order Jewelry Specification & Metal Calculation Tool', tag: 'PRODUCT DESIGN', project_url: 'app.applyus.io/orders/jewelry-spec', display_order: 9 },
        { image_url: './carousel/image-10.webp', title: 'Admin Master Analytics & Financial Ledger Balance Dashboard', tag: 'ENTERPRISE ANALYTICS', project_url: 'app.applyus.io/analytics/master-dashboard', display_order: 10 }
      ];

      for (const item of initialCarousel) {
        await client.query(
          `INSERT INTO carousel_items (image_url, title, tag, project_url, display_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [item.image_url, item.title, item.tag, item.project_url, item.display_order]
        );
      }
    }

    // 4. Check and Seed Website Hyperlinks Directory
    const linksRes = await client.query('SELECT COUNT(*) FROM website_links');
    if (parseInt(linksRes.rows[0].count, 10) === 0) {
      console.log('⚡ Seeding initial website hyperlinks into Neon PostgreSQL...');
      const initialLinks = [
        {
          title: 'Jaya Bhavani Retail Gold & Silver Billing SaaS',
          category: 'Billing Software',
          description: 'Production-grade retail jewelry billing engine with live market rate sync, automated discount calculation, and thermal receipt printing.',
          url: 'https://jb-billing.applyus.io',
          preview_image: './carousel/image-1.webp',
          badge: 'Live Production',
          tech_stack: ['React', 'Node.js', 'PostgreSQL', 'Thermal API'],
          status: 'Active',
          display_order: 1
        },
        {
          title: 'Autonomous Voice AI Inbound Support Telephony Bot',
          category: 'AI Calling Agents',
          description: 'Sub-50ms conversational telephony agent handling customer order status inquiries, bookings, and CRM deal qualification 24/7.',
          url: 'https://voice.applyus.io/demo',
          preview_image: './carousel/image-2.webp',
          badge: 'Live Voice AI',
          tech_stack: ['WebSockets', 'WebRTC', 'OpenAI Whisper', 'FastAPI'],
          status: 'Active',
          display_order: 2
        },
        {
          title: 'ApplyUS Multi-Tenant Enterprise CRM & Deal Pipeline',
          category: 'Enterprise CRM',
          description: 'Tailored CRM with visual Kanban deal stages, automated WhatsApp notifications, email sequences, and lead attribution scoring.',
          url: 'https://crm.applyus.io',
          preview_image: './carousel/image-3.webp',
          badge: 'Enterprise Live',
          tech_stack: ['Next.js', 'Tailwind', 'PostgreSQL', 'Stripe'],
          status: 'Active',
          display_order: 3
        },
        {
          title: 'Omnichannel Cloud ERP & Multi-Warehouse Logistics',
          category: 'Cloud ERP',
          description: 'Enterprise resource planning system tracking inventory across 5 branches, automated purchase orders, and worker accounting.',
          url: 'https://erp.applyus.io',
          preview_image: './carousel/image-4.webp',
          badge: 'Cloud Deployment',
          tech_stack: ['React', 'Express', 'Neon PostgreSQL', 'Docker'],
          status: 'Active',
          display_order: 4
        },
        {
          title: 'Enterprise Knowledge RAG & Customer AI Assistant',
          category: 'AI Chatbots',
          description: 'Context-grounded conversational bot trained on internal documents with zero hallucinations, pgvector search, and citations.',
          url: 'https://chat.applyus.io',
          preview_image: './carousel/image-5.webp',
          badge: 'RAG Live',
          tech_stack: ['pgvector', 'LangChain', 'Claude 3.5', 'Next.js'],
          status: 'Active',
          display_order: 5
        },
        {
          title: 'Craftsman Mobile Portal & Assigned Orders Tracker',
          category: 'Mobile Apps',
          description: 'Lightweight PWA for workers to track gold/silver balances, view assigned jobs, and upload finished item photos.',
          url: 'https://craftsman.applyus.io',
          preview_image: './carousel/image-6.webp',
          badge: 'Mobile Live',
          tech_stack: ['PWA', 'React', 'Node.js', 'AWS S3'],
          status: 'Active',
          display_order: 6
        }
      ];

      for (const link of initialLinks) {
        await client.query(
          `INSERT INTO website_links (title, category, description, url, preview_image, badge, tech_stack, status, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [link.title, link.category, link.description, link.url, link.preview_image, link.badge, link.tech_stack, link.status, link.display_order]
        );
      }
    }

    client.release();
    console.log(' Database tables initialized and verified.');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
  }
}

// ==========================================
// ADMIN AUTHENTICATION & 60s LOCKOUT LOGIC
// ==========================================
const loginAttempts = new Map(); // key: ip/user -> { attempts: count, lockedUntil: timestamp }
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 seconds lockout
const MAX_FAILED_ATTEMPTS = 3;

// Helper: Check if client is locked out
function getLockoutStatus(identifier) {
  const record = loginAttempts.get(identifier);
  if (!record) return { locked: false, remainingSeconds: 0, attempts: 0 };

  const now = Date.now();
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, remainingSeconds, attempts: record.attempts };
  }

  // If lockout expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    loginAttempts.delete(identifier);
    return { locked: false, remainingSeconds: 0, attempts: 0 };
  }

  return { locked: false, remainingSeconds: 0, attempts: record.attempts };
}

// 1. Admin Login Endpoint (with 3-attempt 60s cooldown)
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress || 'client';
  const identifier = `${clientIp}_${username || 'user'}`;

  // Check lockout status
  const status = getLockoutStatus(identifier);
  if (status.locked) {
    return res.status(429).json({
      success: false,
      locked: true,
      remainingSeconds: status.remainingSeconds,
      error: `Security Lockout Active: Too many failed attempts. Please wait ${status.remainingSeconds}s before trying again.`
    });
  }

  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'admin@applyus2026';

  if (username === validUsername && password === validPassword) {
    // Reset failed attempts on success
    loginAttempts.delete(identifier);
    const token = Buffer.from(`${username}:${Date.now()}:${process.env.JWT_SECRET || 'applyus'}`).toString('base64');
    return res.json({
      success: true,
      message: 'Authentication successful',
      token,
      username
    });
  }

  // Increment failed attempts
  const currentAttempts = (status.attempts || 0) + 1;
  if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    loginAttempts.set(identifier, { attempts: currentAttempts, lockedUntil });
    return res.status(429).json({
      success: false,
      locked: true,
      remainingSeconds: 60,
      attempts: currentAttempts,
      error: `3 incorrect password attempts reached. Account locked for 60 seconds.`
    });
  } else {
    loginAttempts.set(identifier, { attempts: currentAttempts, lockedUntil: null });
    const remainingAttempts = MAX_FAILED_ATTEMPTS - currentAttempts;
    return res.status(401).json({
      success: false,
      locked: false,
      remainingAttempts,
      error: `Incorrect credentials. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before a 60-second lockout.`
    });
  }
});

// 2. Admin Verify Token
app.get('/api/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, authenticated: false });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [user] = decoded.split(':');
    if (user === (process.env.ADMIN_USERNAME || 'admin')) {
      return res.json({ success: true, authenticated: true, username: user });
    }
  } catch (e) {}
  return res.status(401).json({ success: false, authenticated: false });
});

// ==========================================
// REST API ROUTES
// ==========================================

// Serve /admin route to admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// 1. Get all Carousel Items
app.get('/api/carousel', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM carousel_items ORDER BY display_order ASC, id ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching carousel items:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Add a new Carousel Item
app.post('/api/carousel', async (req, res) => {
  try {
    const { image_url, title, tag, project_url, display_order } = req.body;
    if (!image_url || !title) {
      return res.status(400).json({ success: false, error: 'image_url and title are required' });
    }
    const result = await pool.query(
      `INSERT INTO carousel_items (image_url, title, tag, project_url, display_order)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [image_url, title, tag || 'PROJECT SHOWCASE', project_url || '#', display_order || 0]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error adding carousel item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get all Website Hyperlinks
app.get('/api/websites', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = 'SELECT * FROM website_links WHERE status = $1';
    const params = ['Active'];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR description ILIKE $${params.length} OR array_to_string(tech_stack, ',') ILIKE $${params.length})`;
    }

    query += ' ORDER BY display_order ASC, id ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error('Error fetching website links:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Add a new Website Hyperlink
app.post('/api/websites', async (req, res) => {
  try {
    const { title, category, description, url, preview_image, badge, tech_stack, display_order } = req.body;
    if (!title || !url) {
      return res.status(400).json({ success: false, error: 'Title and URL are required' });
    }

    const techArray = Array.isArray(tech_stack)
      ? tech_stack
      : (tech_stack ? tech_stack.split(',').map(s => s.trim()) : ['React', 'Node.js', 'PostgreSQL']);

    const result = await pool.query(
      `INSERT INTO website_links (title, category, description, url, preview_image, badge, tech_stack, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        title,
        category || 'Billing Software',
        description || '',
        url,
        preview_image || './carousel/image-1.webp',
        badge || 'Live Deployment',
        techArray,
        display_order || 0
      ]
    );

    res.status(201).json({ success: true, message: 'Website link stored successfully in PostgreSQL', data: result.rows[0] });
  } catch (err) {
    console.error('Error creating website link:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete a Website Hyperlink
app.delete('/api/websites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM website_links WHERE id = $1', [id]);
    res.json({ success: true, message: 'Website link deleted' });
  } catch (err) {
    console.error('Error deleting website link:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.5 Delete a Carousel Item
app.delete('/api/carousel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM carousel_items WHERE id = $1', [id]);
    res.json({ success: true, message: 'Carousel item deleted from database' });
  } catch (err) {
    console.error('Error deleting carousel item:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Upload Image to S3 Bucket & Record in Neon DB (Auto-Converts to WebP)
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    const { title, category, tag, url, target } = req.body;
    
    // Automatically convert incoming image to optimized WebP format
    let imageBuffer = req.file.buffer;
    try {
      imageBuffer = await sharp(req.file.buffer)
        .webp({ quality: 88, effort: 4 })
        .toBuffer();
    } catch (sharpErr) {
      console.warn('WebP conversion fallback to original buffer:', sharpErr.message);
    }

    const fileName = `image-${Date.now()}.webp`;
    const contentType = 'image/webp';

    let publicUrl = `./carousel/${fileName}`;

    if (s3Client) {
      const uploadParams = {
        Bucket: S3_BUCKET_NAME,
        Key: fileName,
        Body: imageBuffer,
        ContentType: contentType
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      
      const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT;
      const baseUrl = process.env.S3_PUBLIC_URL || (endpoint ? `${endpoint}/${S3_BUCKET_NAME}` : `https://${S3_BUCKET_NAME}.s3.amazonaws.com`);
      publicUrl = `${baseUrl}/${fileName}`;
      console.log(`✅ Uploaded WebP to Neon S3 Bucket: ${publicUrl}`);
    } else {
      // Save locally to carousel/ if S3 credentials are not yet entered
      const localFilePath = path.join(__dirname, 'carousel', fileName);
      fs.writeFileSync(localFilePath, imageBuffer);
      publicUrl = `./carousel/${fileName}`;
      console.log(`💾 Saved WebP locally to: ${publicUrl}`);
    }

    // Optionally create database record directly
    if (target === 'carousel') {
      const dbRes = await pool.query(
        `INSERT INTO carousel_items (image_url, title, tag, project_url) VALUES ($1, $2, $3, $4) RETURNING *`,
        [publicUrl, title || 'New Carousel Item', tag || 'SAAS APPLICATION', url || '#']
      );
      return res.status(201).json({ success: true, url: publicUrl, data: dbRes.rows[0] });
    } else if (target === 'website') {
      const dbRes = await pool.query(
        `INSERT INTO website_links (title, category, url, preview_image) VALUES ($1, $2, $3, $4) RETURNING *`,
        [title || 'New Website Link', category || 'Billing Software', url || '#', publicUrl]
      );
      return res.status(201).json({ success: true, url: publicUrl, data: dbRes.rows[0] });
    }

    res.json({ success: true, url: publicUrl, message: 'Image uploaded successfully' });
  } catch (err) {
    console.error('Error uploading image:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. List Objects in S3 Bucket
app.get('/api/bucket/carousel', async (req, res) => {
  try {
    if (!s3Client) {
      // Fallback: list local carousel files
      const localDir = path.join(__dirname, 'carousel');
      const files = fs.existsSync(localDir) ? fs.readdirSync(localDir).map(f => `./carousel/${f}`) : [];
      return res.json({ success: true, mode: 'local', count: files.length, images: files });
    }

    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME
    });

    const response = await s3Client.send(command);
    const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT;
    const baseUrl = process.env.S3_PUBLIC_URL || (endpoint ? `${endpoint}/${S3_BUCKET_NAME}` : `https://${S3_BUCKET_NAME}.s3.amazonaws.com`);
    
    const items = (response.Contents || []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      url: `${baseUrl}/${item.Key}`
    }));

    res.json({ success: true, mode: 's3', count: items.length, images: items });
  } catch (err) {
    console.error('Error listing S3 bucket:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to index.html for unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 ApplyUS Server running at http://localhost:${PORT}`);
  await initDatabase();
});
