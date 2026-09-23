/**
 * Script to Batch Upload all Carousel Images from /carousel folder to Neon/S3 Bucket
 * Run: node sync-carousel-bucket.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'carousel';

async function syncToBucket() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
  const endpoint = process.env.AWS_ENDPOINT_URL_S3 || process.env.S3_ENDPOINT;
  const region = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-2';
  const bucketName = process.env.S3_BUCKET_NAME || 'carousel';

  if (!accessKeyId || !secretAccessKey) {
    console.error('❌ Error: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required in .env');
    process.exit(1);
  }

  const s3 = new S3Client({
    region: region,
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    },
    forcePathStyle: true
  });

  const carouselDir = path.join(__dirname, 'carousel');
  const files = fs.readdirSync(carouselDir).filter(f => /\.(webp|png|jpg|jpeg)$/i.test(f));

  console.log(`🚀 Found ${files.length} images to upload to bucket "${bucketName}"...`);

  const baseUrl = process.env.S3_PUBLIC_URL || 
    (endpoint ? `${endpoint}/${bucketName}` : `https://${bucketName}.s3.amazonaws.com`);


  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(carouselDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const contentType = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'image/jpeg';

    console.log(`📤 Uploading [${i + 1}/${files.length}] ${file} to S3...`);

    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: file,
      Body: fileBuffer,
      ContentType: contentType
    }));

    const s3Url = `${baseUrl}/${file}`;
    console.log(`   ✅ S3 URL: ${s3Url}`);

    // Update Neon PostgreSQL carousel_items table
    await pool.query(
      `UPDATE carousel_items SET image_url = $1 WHERE image_url LIKE $2 OR display_order = $3`,
      [s3Url, `%${file}%`, i + 1]
    );

    // Also update matching website_links preview_image
    await pool.query(
      `UPDATE website_links SET preview_image = $1 WHERE preview_image LIKE $2`,
      [s3Url, `%${file}%`]
    );
  }

  console.log('🎉 All carousel images successfully uploaded to bucket and synced with Neon PostgreSQL!');
  await pool.end();
}

syncToBucket().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
