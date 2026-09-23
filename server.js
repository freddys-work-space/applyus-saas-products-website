require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5173;

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
// REST API ROUTES
// ==========================================

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

// Fallback to index.html for unmatched routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 ApplyUS Server running at http://localhost:${PORT}`);
  await initDatabase();
});
