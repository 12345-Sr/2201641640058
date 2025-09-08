const express = require('express');
const { nanoid } = require('nanoid');
const app = express();
app.use(express.json());

const PORT = 3000;
const BASE_URL = 'http://localhost:3000';

// In-memory storage
const urlDatabase = {};

// Helper function to get ISO timestamp after `validity` minutes
function getExpiry(validityMinutes) {
  return new Date(Date.now() + validityMinutes * 60000).toISOString();
}

// Create Short URL
app.post('/shorturls', (req, res) => {
  const { url, validity = 30, shortcode } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid "url" is required' });
  }

  const code = shortcode || nanoid(8);

  if (urlDatabase[code]) {
    return res.status(409).json({ error: 'Shortcode already exists' });
  }

  urlDatabase[code] = {
    longUrl: url,
    createdAt: new Date().toISOString(),
    expiry: getExpiry(validity),
    clickCount: 0,
    clicks: []
  };

  res.status(201).json({
    shortLink: `${BASE_URL}/${code}`,
    expiry: urlDatabase[code].expiry
  });
});

// Redirect to Long URL
app.get('/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const record = urlDatabase[shortcode];

  if (!record) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  const now = new Date();
  if (now > new Date(record.expiry)) {
    return res.status(410).json({ error: 'Short URL expired' });
  }

  // Record click
  record.clickCount++;
  record.clicks.push({
    timestamp: now.toISOString(),
    referrer: req.get('Referrer') || 'direct',
    geoLocation: req.ip
  });

  res.redirect(record.longUrl);
});


app.get('/shorturls/:shortcode', (req, res) => {
  const { shortcode } = req.params;
  const record = urlDatabase[shortcode];

  if (!record) {
    return res.status(404).json({ error: 'Short URL not found' });
  }

  res.json({
    longUrl: record.longUrl,
    createdAt: record.createdAt,
    expiry: record.expiry,
    clickCount: record.clickCount,
    clicks: record.clicks
  });
});

app.listen(PORT, () => {
  console.log(`URL Shortener running at http://localhost:${PORT}`);
});
