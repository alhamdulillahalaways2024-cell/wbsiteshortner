// server.js - Complete Digital Platform with All Features (FIXED)
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// ===== BASE_URL =====
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
console.log(`🔗 BASE_URL: ${BASE_URL}`);

// ===== TELEGRAM BOT CONFIG =====
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const SKIP_VALIDATION = process.env.SKIP_VALIDATION === 'true' || !TELEGRAM_BOT_TOKEN;

console.log('🔧 Configuration:');
console.log(`📦 TELEGRAM_BOT_TOKEN: ${TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not Set'}`);
console.log(`🔓 SKIP_VALIDATION: ${SKIP_VALIDATION ? '✅ Yes (testing mode)' : '❌ No'}`);

// ============ Setup ============
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const viewsDir = path.join(__dirname, 'views');
if (!fs.existsSync(viewsDir)) {
    fs.mkdirSync(viewsDir, { recursive: true });
}

// ============ SQLite Database ============
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('❌ Database error:', err.message);
    } else {
        console.log('✅ SQLite database connected');
    }
});

// ============================================================
// ALL COUNTRIES WITH FLAGS
// ============================================================
const COUNTRIES = {
    'BD': { name: 'Bangladesh', flag: '🇧🇩' },
    'US': { name: 'United States', flag: '🇺🇸' },
    'GB': { name: 'United Kingdom', flag: '🇬🇧' },
    'IN': { name: 'India', flag: '🇮🇳' },
    'CA': { name: 'Canada', flag: '🇨🇦' },
    'AU': { name: 'Australia', flag: '🇦🇺' },
    'DE': { name: 'Germany', flag: '🇩🇪' },
    'FR': { name: 'France', flag: '🇫🇷' },
    'JP': { name: 'Japan', flag: '🇯🇵' },
    'CN': { name: 'China', flag: '🇨🇳' },
    'RU': { name: 'Russia', flag: '🇷🇺' },
    'BR': { name: 'Brazil', flag: '🇧🇷' },
    'NG': { name: 'Nigeria', flag: '🇳🇬' },
    'PK': { name: 'Pakistan', flag: '🇵🇰' },
    'EG': { name: 'Egypt', flag: '🇪🇬' },
    'ID': { name: 'Indonesia', flag: '🇮🇩' },
    'MX': { name: 'Mexico', flag: '🇲🇽' },
    'SA': { name: 'Saudi Arabia', flag: '🇸🇦' },
    'TR': { name: 'Turkey', flag: '🇹🇷' },
    'KR': { name: 'South Korea', flag: '🇰🇷' },
    'IT': { name: 'Italy', flag: '🇮🇹' },
    'ES': { name: 'Spain', flag: '🇪🇸' },
    'ZA': { name: 'South Africa', flag: '🇿🇦' },
    'AR': { name: 'Argentina', flag: '🇦🇷' },
    'AE': { name: 'UAE', flag: '🇦🇪' },
    'SG': { name: 'Singapore', flag: '🇸🇬' },
    'MY': { name: 'Malaysia', flag: '🇲🇾' },
    'PH': { name: 'Philippines', flag: '🇵🇭' },
    'VN': { name: 'Vietnam', flag: '🇻🇳' },
    'TH': { name: 'Thailand', flag: '🇹🇭' },
    'NL': { name: 'Netherlands', flag: '🇳🇱' },
    'SE': { name: 'Sweden', flag: '🇸🇪' },
    'NO': { name: 'Norway', flag: '🇳🇴' },
    'DK': { name: 'Denmark', flag: '🇩🇰' },
    'FI': { name: 'Finland', flag: '🇫🇮' },
    'PL': { name: 'Poland', flag: '🇵🇱' },
    'UA': { name: 'Ukraine', flag: '🇺🇦' },
    'RO': { name: 'Romania', flag: '🇷🇴' },
    'GR': { name: 'Greece', flag: '🇬🇷' },
    'PT': { name: 'Portugal', flag: '🇵🇹' },
    'BE': { name: 'Belgium', flag: '🇧🇪' },
    'CH': { name: 'Switzerland', flag: '🇨🇭' },
    'AT': { name: 'Austria', flag: '🇦🇹' },
    'HU': { name: 'Hungary', flag: '🇭🇺' },
    'CZ': { name: 'Czech Republic', flag: '🇨🇿' },
    'IE': { name: 'Ireland', flag: '🇮🇪' },
    'NZ': { name: 'New Zealand', flag: '🇳🇿' },
    'CL': { name: 'Chile', flag: '🇨🇱' },
    'CO': { name: 'Colombia', flag: '🇨🇴' },
    'PE': { name: 'Peru', flag: '🇵🇪' },
    'VE': { name: 'Venezuela', flag: '🇻🇪' },
    'IL': { name: 'Israel', flag: '🇮🇱' },
    'IR': { name: 'Iran', flag: '🇮🇷' },
    'IQ': { name: 'Iraq', flag: '🇮🇶' },
    'SY': { name: 'Syria', flag: '🇸🇾' },
    'LB': { name: 'Lebanon', flag: '🇱🇧' },
    'JO': { name: 'Jordan', flag: '🇯🇴' },
    'KW': { name: 'Kuwait', flag: '🇰🇼' },
    'QA': { name: 'Qatar', flag: '🇶🇦' },
    'BH': { name: 'Bahrain', flag: '🇧🇭' },
    'OM': { name: 'Oman', flag: '🇴🇲' },
    'YE': { name: 'Yemen', flag: '🇾🇪' },
    'AF': { name: 'Afghanistan', flag: '🇦🇫' },
    'KZ': { name: 'Kazakhstan', flag: '🇰🇿' },
    'UZ': { name: 'Uzbekistan', flag: '🇺🇿' },
    'TM': { name: 'Turkmenistan', flag: '🇹🇲' },
    'KG': { name: 'Kyrgyzstan', flag: '🇰🇬' },
    'TJ': { name: 'Tajikistan', flag: '🇹🇯' },
    'MN': { name: 'Mongolia', flag: '🇲🇳' },
    'KP': { name: 'North Korea', flag: '🇰🇵' },
    'TW': { name: 'Taiwan', flag: '🇹🇼' },
    'HK': { name: 'Hong Kong', flag: '🇭🇰' },
    'MO': { name: 'Macau', flag: '🇲🇴' },
    'MM': { name: 'Myanmar', flag: '🇲🇲' },
    'LA': { name: 'Laos', flag: '🇱🇦' },
    'KH': { name: 'Cambodia', flag: '🇰🇭' },
    'BN': { name: 'Brunei', flag: '🇧🇳' },
    'TL': { name: 'Timor-Leste', flag: '🇹🇱' },
    'FJ': { name: 'Fiji', flag: '🇫🇯' },
    'PG': { name: 'Papua New Guinea', flag: '🇵🇬' },
    'SB': { name: 'Solomon Islands', flag: '🇸🇧' },
    'VU': { name: 'Vanuatu', flag: '🇻🇺' },
    'WS': { name: 'Samoa', flag: '🇼🇸' },
    'TO': { name: 'Tonga', flag: '🇹🇴' },
    'KI': { name: 'Kiribati', flag: '🇰🇮' },
    'MH': { name: 'Marshall Islands', flag: '🇲🇭' },
    'FM': { name: 'Micronesia', flag: '🇫🇲' },
    'PW': { name: 'Palau', flag: '🇵🇼' },
    'TV': { name: 'Tuvalu', flag: '🇹🇻' },
    'NR': { name: 'Nauru', flag: '🇳🇷' },
    'CK': { name: 'Cook Islands', flag: '🇨🇰' },
    'NF': { name: 'Norfolk Island', flag: '🇳🇫' }
};

// ============================================================
// PRE-ADDED DOMAINS
// ============================================================
const PRE_ADDED_DOMAINS = [
    { domain: 'shortlink.click', description: 'Default' },
    { domain: 'linkhub.click', description: 'Hub' },
    { domain: 'urlcut.click', description: 'Cutter' },
    { domain: 'tinyurl.click', description: 'Tiny' },
    { domain: 'fastlink.click', description: 'Fast' },
    { domain: 'easylink.click', description: 'Easy' }
];

// ============================================================
// CREATE TABLES
// ============================================================
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegramId TEXT UNIQUE,
        name TEXT,
        email TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
        isOnline INTEGER DEFAULT 0,
        isValidated INTEGER DEFAULT 0,
        totalLinks INTEGER DEFAULT 0,
        totalClicks INTEGER DEFAULT 0,
        premium INTEGER DEFAULT 0,
        premiumUntil DATETIME
    )`);

    // Domains table
    db.run(`CREATE TABLE IF NOT EXISTS domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT UNIQUE,
        description TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Links table
    db.run(`CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortCode TEXT UNIQUE,
        originalUrl TEXT,
        userId INTEGER,
        domainId INTEGER,
        title TEXT,
        description TEXT,
        clicks INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        expiresAt DATETIME,
        password TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(domainId) REFERENCES domains(id)
    )`);

    // Click logs table
    db.run(`CREATE TABLE IF NOT EXISTS click_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linkId INTEGER,
        ip TEXT,
        userAgent TEXT,
        referer TEXT,
        country TEXT,
        countryCode TEXT,
        city TEXT,
        device TEXT,
        browser TEXT,
        os TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        isBot INTEGER DEFAULT 0,
        FOREIGN KEY(linkId) REFERENCES links(id)
    )`);

    // Saved links (bookmarks)
    db.run(`CREATE TABLE IF NOT EXISTS saved_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        linkId INTEGER,
        savedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(linkId) REFERENCES links(id)
    )`);

    // Link tags
    db.run(`CREATE TABLE IF NOT EXISTS link_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        linkId INTEGER,
        tag TEXT,
        FOREIGN KEY(linkId) REFERENCES links(id)
    )`);

    // Indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_telegramId ON users(telegramId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_isOnline ON users(isOnline)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_userId ON links(userId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_shortCode ON links(shortCode)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_createdAt ON links(createdAt)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_domainId ON links(domainId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_click_logs_linkId ON click_logs(linkId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_click_logs_timestamp ON click_logs(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_click_logs_country ON click_logs(countryCode)`);
    
    // Insert pre-added domains
    PRE_ADDED_DOMAINS.forEach((d) => {
        db.run(`INSERT OR IGNORE INTO domains (domain, description) VALUES (?, ?)`,
            [d.domain, d.description]);
    });
    
    console.log('✅ Database tables and indexes created successfully');
    console.log(`🌐 ${PRE_ADDED_DOMAINS.length} pre-added domains loaded`);
});

// ============ Middleware ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: true,
    saveUninitialized: true,
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24 * 7,
        secure: false,
        httpOnly: true
    }
}));

// ============ MAKE DATA AVAILABLE ============
app.use((req, res, next) => {
    res.locals.BASE_URL = BASE_URL;
    res.locals.user = req.session.user || null;
    res.locals.page = req.path === '/' ? 'home' : req.path.slice(1);
    res.locals.countries = COUNTRIES;
    
    getOnlineUsers((count, users) => {
        res.locals.onlineUsers = count;
        res.locals.onlineUserList = users;
        next();
    });
});

// ============ TELEGRAM VALIDATION ============
async function validateTelegramId(telegramId, username) {
    if (SKIP_VALIDATION) {
        return { valid: true, name: username };
    }

    if (!TELEGRAM_BOT_TOKEN) {
        return { valid: true, name: username };
    }

    try {
        const response = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat`, {
            params: { chat_id: telegramId },
            timeout: 5000
        });

        if (response.data && response.data.ok) {
            const user = response.data.result;
            return { 
                valid: true, 
                name: user.first_name + (user.last_name ? ' ' + user.last_name : '')
            };
        }
        return { valid: false, error: 'Invalid Telegram ID' };
    } catch (error) {
        return { 
            valid: false, 
            error: 'Invalid Telegram ID. Make sure you entered the correct ID.' 
        };
    }
}

// ============ GET LOCATION FROM IP ============
async function getLocationFromIP(ip) {
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
        return { country: 'Localhost', countryCode: 'LOCAL', city: 'Local' };
    }

    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,lat,lon`, {
            timeout: 3000
        });

        if (response.data && response.data.status === 'success') {
            return {
                country: response.data.country || 'Unknown',
                countryCode: response.data.countryCode || 'XX',
                city: response.data.city || 'Unknown'
            };
        }
        return { country: 'Unknown', countryCode: 'XX', city: 'Unknown' };
    } catch (error) {
        return { country: 'Unknown', countryCode: 'XX', city: 'Unknown' };
    }
}

// ============ DETECT DEVICE, BROWSER, OS ============
function detectDeviceInfo(userAgent) {
    const info = {
        device: 'Unknown',
        browser: 'Unknown',
        os: 'Unknown'
    };

    if (!userAgent) return info;

    // Detect OS
    if (userAgent.includes('Windows')) info.os = 'Windows';
    else if (userAgent.includes('Mac')) info.os = 'macOS';
    else if (userAgent.includes('Linux')) info.os = 'Linux';
    else if (userAgent.includes('Android')) info.os = 'Android';
    else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) info.os = 'iOS';
    else if (userAgent.includes('Chrome OS')) info.os = 'Chrome OS';

    // Detect Browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) info.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) info.browser = 'Safari';
    else if (userAgent.includes('Edg')) info.browser = 'Edge';
    else if (userAgent.includes('Opera')) info.browser = 'Opera';
    else if (userAgent.includes('Brave')) info.browser = 'Brave';

    // Detect Device
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        info.device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
        info.device = 'Tablet';
    } else {
        info.device = 'Desktop';
    }

    return info;
}

// ============ BOT DETECTION ============
function isBot(userAgent, ip, req) {
    const botPatterns = [
        /bot/i, /crawl/i, /spider/i, /scrape/i, /headless/i,
        /puppeteer/i, /selenium/i, /phantom/i, /curl/i, /wget/i,
        /python/i, /java/i, /go-http/i, /node-fetch/i, /axios/i,
        /postman/i, /insomnia/i, /httpie/i, /lighthouse/i,
        /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
        /baiduspider/i, /yandexbot/i, /facebookexternalhit/i,
        /facebot/i, /twitterbot/i, /telegrambot/i, /whatsapp/i,
        /slackbot/i, /discordbot/i, /applebot/i, /datadog/i,
        /newrelic/i, /pingdom/i, /uptime/i, /monitor/i, /healthcheck/i
    ];

    if (userAgent) {
        for (let pattern of botPatterns) {
            if (pattern.test(userAgent)) {
                return true;
            }
        }
    }

    if (userAgent && (userAgent.includes('Headless') || userAgent.includes('HeadlessChrome'))) {
        return true;
    }

    return false;
}

// ============ RATE LIMITING ============
const clickLimits = {};

function checkRateLimit(ip, linkId) {
    const key = `${ip}-${linkId}`;
    const now = Date.now();
    const windowMs = 60000;
    
    if (!clickLimits[key]) {
        clickLimits[key] = { count: 1, firstClick: now };
        return true;
    }

    const data = clickLimits[key];
    
    if (now - data.firstClick > windowMs) {
        clickLimits[key] = { count: 1, firstClick: now };
        return true;
    }

    if (data.count >= 5) {
        return false;
    }

    data.count++;
    return true;
}

// ============ Helper Functions ============
function getOnlineUsers(callback) {
    db.all('SELECT name FROM users WHERE isOnline = 1', (err, users) => {
        if (err) return callback(0, []);
        callback(users ? users.length : 0, users || []);
    });
}

function generateShortCode() {
    return crypto.randomBytes(4).toString('hex');
}

// ============ Routes ============

// Home
app.get('/', (req, res) => {
    res.render('index', { 
        page: 'home',
        error: null,
        success: null,
        info: null,
        shortUrl: null
    });
});

// Login
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('index', { 
        page: 'login',
        error: null,
        success: null,
        info: null
    });
});

app.post('/login', async (req, res) => {
    const { telegramId, username, email } = req.body;
    
    if (!telegramId || !username) {
        return res.render('index', {
            page: 'login',
            error: 'Please provide both Telegram ID and Name',
            success: null,
            info: null
        });
    }

    const cleanTelegramId = telegramId.trim().replace(/[^0-9]/g, '');
    
    if (!cleanTelegramId) {
        return res.render('index', {
            page: 'login',
            error: 'Please enter a valid numeric Telegram ID',
            success: null,
            info: null
        });
    }

    const validation = await validateTelegramId(cleanTelegramId, username);
    
    if (!validation.valid) {
        return res.render('index', {
            page: 'login',
            error: validation.error || '❌ Invalid Telegram ID.',
            success: null,
            info: null
        });
    }

    db.get('SELECT * FROM users WHERE telegramId = ?', [cleanTelegramId], (err, user) => {
        if (err) {
            return res.render('index', { 
                page: 'login', 
                error: 'Database error.',
                success: null,
                info: null
            });
        }

        const finalName = validation.name || username;

        if (user) {
            db.run('UPDATE users SET name = ?, email = ?, lastSeen = CURRENT_TIMESTAMP, isOnline = 1, isValidated = 1 WHERE id = ?', 
                [finalName, email || null, user.id], (err) => {
                    if (err) {
                        return res.render('index', { 
                            page: 'login', 
                            error: 'Update failed.',
                            success: null,
                            info: null
                        });
                    }
                    req.session.user = { id: user.id, name: finalName, telegramId: cleanTelegramId };
                    req.session.save(() => res.redirect('/dashboard'));
                });
        } else {
            db.run('INSERT INTO users (telegramId, name, email, isOnline, isValidated) VALUES (?, ?, ?, 1, 1)',
                [cleanTelegramId, finalName, email || null], function(err) {
                    if (err) {
                        return res.render('index', { 
                            page: 'login', 
                            error: 'Registration failed.',
                            success: null,
                            info: null
                        });
                    }
                    req.session.user = { id: this.lastID, name: finalName, telegramId: cleanTelegramId };
                    req.session.save(() => res.redirect('/dashboard'));
                });
        }
    });
});

// Logout
app.post('/logout', (req, res) => {
    if (req.session.user) {
        db.run('UPDATE users SET isOnline = 0 WHERE id = ?', [req.session.user.id]);
    }
    req.session.destroy(() => res.redirect('/'));
});

// ============================================================
// DASHBOARD
// ============================================================
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    db.run('UPDATE users SET isOnline = 1, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', 
        [req.session.user.id]);

    // Get user stats
    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], (err, userData) => {
        if (err) userData = {};

        // Get all domains
        db.all('SELECT * FROM domains WHERE isActive = 1 ORDER BY domain', (err, domains) => {
            if (err) domains = [];

            // Get links with domain info
            db.all(`SELECT l.*, d.domain as domainName 
                    FROM links l 
                    LEFT JOIN domains d ON l.domainId = d.id 
                    WHERE l.userId = ? 
                    ORDER BY l.createdAt DESC`, 
                [req.session.user.id], (err, links) => {
                    if (err) {
                        return res.redirect('/');
                    }

                    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
                    
                    const linksWithUrl = links.map(link => {
                        const domain = link.domainName ? link.domainName : 'shortlink.click';
                        return {
                            ...link,
                            shortUrl: `https://${domain}/${link.shortCode}`,
                            isExpired: link.expiresAt ? new Date(link.expiresAt) < new Date() : false
                        };
                    });

                    // Update user stats
                    db.run('UPDATE users SET totalLinks = ?, totalClicks = ? WHERE id = ?', 
                        [links.length, totalClicks, req.session.user.id]);

                    // Get analytics data
                    getAnalyticsData(req.session.user.id, (analyticsData) => {
                        getOnlineUsers((count, users) => {
                            res.render('index', {
                                page: 'dashboard',
                                user: req.session.user,
                                userData: userData,
                                links: linksWithUrl,
                                totalClicks: totalClicks,
                                onlineUsers: count,
                                onlineUserList: users,
                                domains: domains || [],
                                countries: COUNTRIES,
                                error: null,
                                success: null,
                                info: null,
                                shortUrl: null,
                                ...analyticsData
                            });
                        });
                    });
                });
        });
    });
});

// Analytics data function
function getAnalyticsData(userId, callback) {
    // Today's clicks
    db.get(`SELECT COUNT(*) as count FROM click_logs 
            WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
            AND timestamp >= datetime('now', '-1 day')
            AND isBot = 0`, 
        [userId], (err, todayResult) => {
            const todayClicks = todayResult ? todayResult.count : 0;

            // Week's clicks
            db.get(`SELECT COUNT(*) as count FROM click_logs 
                    WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                    AND timestamp >= datetime('now', '-7 days')
                    AND isBot = 0`, 
                [userId], (err, weekResult) => {
                    const weekClicks = weekResult ? weekResult.count : 0;

                    // Month's clicks
                    db.get(`SELECT COUNT(*) as count FROM click_logs 
                            WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                            AND timestamp >= datetime('now', '-30 days')
                            AND isBot = 0`, 
                        [userId], (err, monthResult) => {
                            const monthClicks = monthResult ? monthResult.count : 0;

                            // Bot clicks
                            db.get(`SELECT COUNT(*) as count FROM click_logs 
                                    WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                    AND isBot = 1`, 
                                [userId], (err, botResult) => {
                                    const botClicks = botResult ? botResult.count : 0;

                                    // Real clicks
                                    db.get(`SELECT COUNT(*) as count FROM click_logs 
                                            WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                            AND isBot = 0`, 
                                        [userId], (err, realResult) => {
                                            const realClicks = realResult ? realResult.count : 0;

                                            // Top link
                                            db.get(`SELECT shortCode, clicks FROM links 
                                                    WHERE userId = ? 
                                                    ORDER BY clicks DESC LIMIT 1`, 
                                                [userId], (err, topLink) => {
                                                    
                                                    const total = realClicks + botClicks;
                                                    const clickRate = total > 0 ? Math.round((realClicks / total) * 100) : 100;

                                                    // Weekly data
                                                    const weekDays = [];
                                                    const weekData = [];
                                                    for (let i = 6; i >= 0; i--) {
                                                        const date = new Date();
                                                        date.setDate(date.getDate() - i);
                                                        const dateStr = date.toISOString().split('T')[0];
                                                        weekDays.push(dateStr);
                                                    }

                                                    const weekDataPromises = weekDays.map((date) => {
                                                        return new Promise((resolve) => {
                                                            db.get(`SELECT COUNT(*) as count FROM click_logs 
                                                                    WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                                    AND date(timestamp) = ?
                                                                    AND isBot = 0`,
                                                                [userId, date],
                                                                (err, result) => {
                                                                    resolve(result ? result.count : 0);
                                                                });
                                                        });
                                                    });

                                                    Promise.all(weekDataPromises).then((weekData) => {
                                                        // Country stats
                                                        db.all(`SELECT 
                                                                    country,
                                                                    countryCode,
                                                                    COUNT(*) as count 
                                                                FROM click_logs 
                                                                WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                                AND isBot = 0
                                                                GROUP BY countryCode 
                                                                ORDER BY count DESC 
                                                                LIMIT 20`,
                                                            [userId], (err, countryStats) => {
                                                                
                                                                // City stats
                                                                db.all(`SELECT 
                                                                            city,
                                                                            COUNT(*) as count 
                                                                        FROM click_logs 
                                                                        WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                                        AND isBot = 0
                                                                        AND city IS NOT NULL
                                                                        AND city != ''
                                                                        GROUP BY city 
                                                                        ORDER BY count DESC 
                                                                        LIMIT 10`,
                                                                    [userId], (err, cityStats) => {
                                                                        
                                                                        // Device stats
                                                                        db.all(`SELECT 
                                                                                    device,
                                                                                    COUNT(*) as count 
                                                                                FROM click_logs 
                                                                                WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                                                AND isBot = 0
                                                                                AND device IS NOT NULL
                                                                                GROUP BY device 
                                                                                ORDER BY count DESC`,
                                                                            [userId], (err, deviceStats) => {
                                                                                
                                                                                // Browser stats
                                                                                db.all(`SELECT 
                                                                                            browser,
                                                                                            COUNT(*) as count 
                                                                                        FROM click_logs 
                                                                                        WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                                                        AND isBot = 0
                                                                                        AND browser IS NOT NULL
                                                                                        GROUP BY browser 
                                                                                        ORDER BY count DESC`,
                                                                                    [userId], (err, browserStats) => {
                                                                                        
                                                                                        // OS stats
                                                                                        db.all(`SELECT 
                                                                                                    os,
                                                                                                    COUNT(*) as count 
                                                                                                FROM click_logs 
                                                                                                WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                                                                AND isBot = 0
                                                                                                AND os IS NOT NULL
                                                                                                GROUP BY os 
                                                                                                ORDER BY count DESC`,
                                                                                            [userId], (err, osStats) => {
                                                                                                callback({
                                                                                                    todayClicks: todayClicks,
                                                                                                    weekClicks: weekClicks,
                                                                                                    monthClicks: monthClicks,
                                                                                                    botClicks: botClicks,
                                                                                                    realClicks: realClicks,
                                                                                                    clickRate: clickRate,
                                                                                                    topLink: topLink,
                                                                                                    weekData: weekData,
                                                                                                    countryStats: countryStats || [],
                                                                                                    cityStats: cityStats || [],
                                                                                                    deviceStats: deviceStats || [],
                                                                                                    browserStats: browserStats || [],
                                                                                                    osStats: osStats || []
                                                                                                });
                                                                                            });
                                                                                        });
                                                                                    });
                                                                                });
                                                                            });
                                                                        });
                                                                    });
                                                                });
                                                        });
                                                });
                                        });
                                });
                        });
                });
        });
}

// ============================================================
// QR CODE GENERATOR
// ============================================================
app.get('/qr/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    
    db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], async (err, link) => {
        if (err || !link) {
            return res.status(404).send('Link not found');
        }

        try {
            const url = `${BASE_URL}/${shortCode}`;
            const qrImage = await QRCode.toDataURL(url, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#6C63FF',
                    light: '#FFFFFF'
                }
            });
            
            res.json({ qr: qrImage, url: url });
        } catch (error) {
            res.status(500).json({ error: 'QR generation failed' });
        }
    });
});

// ============================================================
// SHORTEN LINK WITH ALL FEATURES
// ============================================================
app.post('/shorten', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { originalUrl, customSlug, domainId, title, description, password, expiresIn } = req.body;
    
    if (!originalUrl) {
        return res.redirect('/dashboard?error=Please provide a URL');
    }

    let shortCode = customSlug || generateShortCode();

    // Check if shortCode exists
    db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], (err, existing) => {
        if (err) {
            return res.redirect('/dashboard?error=Database error');
        }

        if (existing) {
            if (customSlug) {
                return res.redirect('/dashboard?error=' + encodeURIComponent(`"${customSlug}" is already taken`));
            }
            shortCode = generateShortCode();
        }

        // Calculate expiry date
        let expiresAt = null;
        if (expiresIn) {
            const now = new Date();
            if (expiresIn === '1d') now.setDate(now.getDate() + 1);
            else if (expiresIn === '7d') now.setDate(now.getDate() + 7);
            else if (expiresIn === '30d') now.setDate(now.getDate() + 30);
            else if (expiresIn === '90d') now.setDate(now.getDate() + 90);
            else if (expiresIn === '365d') now.setDate(now.getDate() + 365);
            expiresAt = now.toISOString();
        }

        const insertDomainId = domainId && domainId !== 'default' ? domainId : null;
        const hashedPassword = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
        
        db.run(`INSERT INTO links 
                (shortCode, originalUrl, userId, domainId, title, description, password, expiresAt) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [shortCode, originalUrl, req.session.user.id, insertDomainId, 
             title || null, description || null, hashedPassword, expiresAt], 
            function(err) {
                if (err) {
                    return res.redirect('/dashboard?error=Failed to create link');
                }

                res.redirect('/dashboard?success=' + encodeURIComponent('Link created successfully!'));
            });
    });
});

// ============================================================
// REDIRECT WITH ALL FEATURES
// ============================================================
app.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    
    const routes = ['login', 'dashboard', 'logout', 'shorten', 'update-link', 'delete-link', 
                    'api', 'signup', 'favicon.ico', 'qr', 'save-link', 'unsave-link', 
                    'add-tag', 'remove-tag', 'admin', 'check-password'];
    if (routes.includes(shortCode)) {
        return res.redirect('/');
    }

    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const referer = req.headers['referer'] || '';
    const host = req.get('host') || '';

    // Get link with domain info
    db.get(`SELECT l.*, d.domain as domainName 
            FROM links l 
            LEFT JOIN domains d ON l.domainId = d.id 
            WHERE l.shortCode = ?`, 
        [shortCode], async (err, link) => {
            if (err || !link) {
                return res.status(404).send('Link not found');
            }

            // Check if link is active
            if (!link.isActive) {
                return res.status(410).send('This link has been deactivated');
            }

            // Check if link is expired
            if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
                return res.status(410).send('This link has expired');
            }

            // Check domain match
            if (link.domainName) {
                const requestDomain = host.toLowerCase();
                const linkDomain = link.domainName.toLowerCase();
                if (requestDomain !== linkDomain) {
                    return res.redirect(`https://${linkDomain}/${shortCode}`);
                }
            }

            // Check for password protection
            if (link.password) {
                // Check if already authenticated in session
                if (req.session.passwordAccess && req.session.passwordAccess[shortCode]) {
                    // Already authenticated, proceed
                } else {
                    const enteredPassword = req.query.password || req.body.password;
                    if (!enteredPassword) {
                        return res.send(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Password Protected Link</title>
                                <style>
                                    body { font-family: 'Inter', Arial, sans-serif; background: #0A0A0F; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                                    .container { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); max-width: 400px; width: 100%; text-align: center; }
                                    h2 { margin-bottom: 10px; background: linear-gradient(135deg, #6C63FF, #00D4FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                                    p { color: #B0B0C8; margin-bottom: 20px; }
                                    input { width: 100%; padding: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; margin: 10px 0; font-family: 'Inter', sans-serif; }
                                    input:focus { border-color: #6C63FF; outline: none; }
                                    button { width: 100%; padding: 12px; background: linear-gradient(135deg, #6C63FF, #00D4FF); border: none; border-radius: 10px; color: #fff; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
                                    button:hover { transform: scale(1.02); }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h2>🔒 Password Protected</h2>
                                    <p>This link is password protected. Please enter the password to continue.</p>
                                    <form method="POST" action="/check-password/${shortCode}">
                                        <input type="password" name="password" placeholder="Enter password" required>
                                        <button type="submit">Unlock Link</button>
                                    </form>
                                </div>
                            </body>
                            </html>
                        `);
                    }
                }
            }

            // Check if it's a social media crawler
            const isSocialCrawler = userAgent.includes('facebookexternalhit') || 
                                    userAgent.includes('Facebot') ||
                                    userAgent.includes('Twitterbot') ||
                                    userAgent.includes('WhatsApp') ||
                                    userAgent.includes('TelegramBot');

            if (isSocialCrawler) {
                return res.send(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>${link.shortCode} - This Person Is brand Shortlink</title>
                        <meta property="og:title" content="${link.title || 'This Person Is brand Shortlink'}" />
                        <meta property="og:description" content="${link.description || `Short link: ${BASE_URL}/${link.shortCode}`}" />
                        <meta property="og:type" content="website" />
                        <meta property="og:url" content="${BASE_URL}/${link.shortCode}" />
                        <meta property="og:image" content="https://img.icons8.com/fluency/96/000000/link.png" />
                        <meta name="twitter:card" content="summary_large_image" />
                        <meta http-equiv="refresh" content="0; url=${link.originalUrl}" />
                    </head>
                    <body>
                        <p>Redirecting to <a href="${link.originalUrl}">${link.originalUrl}</a></p>
                    </body>
                    </html>
                `);
            }

            // Bot detection and rate limiting
            const botDetected = isBot(userAgent, ip, req);

            if (botDetected) {
                db.run('INSERT INTO click_logs (linkId, ip, userAgent, referer, isBot) VALUES (?, ?, ?, ?, 1)',
                    [link.id, ip, userAgent, referer]);
                return res.redirect(link.originalUrl);
            }

            if (!checkRateLimit(ip, link.id)) {
                return res.redirect(link.originalUrl);
            }

            // Get device info
            const deviceInfo = detectDeviceInfo(userAgent);

            // Count the click
            db.run('UPDATE links SET clicks = clicks + 1 WHERE id = ?', [link.id], (err) => {
                if (err) {
                    console.error('❌ Click count error:', err);
                }
                
                // Get location data
                getLocationFromIP(ip).then((geoData) => {
                    db.run(`INSERT INTO click_logs 
                            (linkId, ip, userAgent, referer, country, countryCode, city, device, browser, os, isBot) 
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                        [link.id, ip, userAgent, referer, geoData.country, geoData.countryCode, 
                         geoData.city, deviceInfo.device, deviceInfo.browser, deviceInfo.os]);
                    res.redirect(link.originalUrl);
                }).catch(() => {
                    db.run(`INSERT INTO click_logs 
                            (linkId, ip, userAgent, referer, isBot) VALUES (?, ?, ?, ?, 0)`,
                        [link.id, ip, userAgent, referer]);
                    res.redirect(link.originalUrl);
                });
            });
        });
});

// ============================================================
// PASSWORD CHECK ROUTE
// ============================================================
app.post('/check-password/:shortCode', (req, res) => {
    const { shortCode } = req.params;
    const { password } = req.body;

    db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], (err, link) => {
        if (err || !link) {
            return res.status(404).send('Link not found');
        }

        const hashed = crypto.createHash('sha256').update(password).digest('hex');
        if (hashed === link.password) {
            // Set session variable to allow access
            req.session.passwordAccess = req.session.passwordAccess || {};
            req.session.passwordAccess[shortCode] = true;
            return res.redirect(`/${shortCode}`);
        }

        return res.send(`
            <html>
            <head>
                <title>Incorrect Password</title>
                <style>
                    body { font-family: 'Inter', Arial, sans-serif; background: #0A0A0F; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                    .container { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); max-width: 400px; width: 100%; text-align: center; }
                    h2 { margin-bottom: 10px; color: #FF4466; }
                    p { color: #B0B0C8; margin-bottom: 20px; }
                    a { color: #6C63FF; text-decoration: none; font-weight: 600; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>❌ Incorrect Password</h2>
                    <p>The password you entered is incorrect.</p>
                    <a href="/${shortCode}">← Try again</a>
                </div>
            </body>
            </html>
        `);
    });
});

// ============================================================
// UPDATE LINK
// ============================================================
app.post('/update-link/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { newUrl, domainId, title, description, expiresIn } = req.body;
    
    if (!newUrl) {
        return res.redirect('/dashboard?error=Please provide a new URL');
    }

    let expiresAt = null;
    if (expiresIn) {
        const now = new Date();
        if (expiresIn === '1d') now.setDate(now.getDate() + 1);
        else if (expiresIn === '7d') now.setDate(now.getDate() + 7);
        else if (expiresIn === '30d') now.setDate(now.getDate() + 30);
        else if (expiresIn === '90d') now.setDate(now.getDate() + 90);
        else if (expiresIn === '365d') now.setDate(now.getDate() + 365);
        expiresAt = now.toISOString();
    }

    const updateDomainId = domainId && domainId !== 'default' ? domainId : null;
    
    db.run(`UPDATE links SET 
            originalUrl = ?, 
            domainId = ?, 
            title = ?, 
            description = ?, 
            expiresAt = ?,
            updatedAt = CURRENT_TIMESTAMP 
            WHERE id = ? AND userId = ?`,
        [newUrl, updateDomainId, title || null, description || null, expiresAt, 
         req.params.id, req.session.user.id], (err) => {
            if (err) {
                return res.redirect('/dashboard?error=Update failed');
            }
            res.redirect('/dashboard?success=Link updated successfully!');
        });
});

// ============================================================
// TOGGLE LINK ACTIVE STATUS
// ============================================================
app.post('/toggle-link/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get('SELECT isActive FROM links WHERE id = ? AND userId = ?', 
        [req.params.id, req.session.user.id], (err, link) => {
            if (err || !link) {
                return res.status(404).json({ error: 'Link not found' });
            }

            const newStatus = link.isActive ? 0 : 1;
            db.run('UPDATE links SET isActive = ? WHERE id = ?', 
                [newStatus, req.params.id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to toggle link' });
                    }
                    res.json({ success: true, isActive: newStatus });
                });
        });
});

// ============================================================
// DELETE LINK
// ============================================================
app.post('/delete-link/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    db.run('DELETE FROM links WHERE id = ? AND userId = ?', 
        [req.params.id, req.session.user.id], (err) => {
            if (err) {
                return res.redirect('/dashboard?error=Delete failed');
            }
            res.redirect('/dashboard?success=Link deleted successfully!');
        });
});

// ============================================================
// SAVE/BOOKMARK LINK
// ============================================================
app.post('/save-link/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.run('INSERT OR IGNORE INTO saved_links (userId, linkId) VALUES (?, ?)',
        [req.session.user.id, req.params.id], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save link' });
            }
            res.json({ success: true });
        });
});

// ============================================================
// UNSAVE/REMOVE BOOKMARK
// ============================================================
app.post('/unsave-link/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.run('DELETE FROM saved_links WHERE userId = ? AND linkId = ?',
        [req.session.user.id, req.params.id], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to unsave link' });
            }
            res.json({ success: true });
        });
});

// ============================================================
// ADD TAG TO LINK
// ============================================================
app.post('/add-tag/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tag } = req.body;
    if (!tag) {
        return res.status(400).json({ error: 'Tag is required' });
    }

    db.run('INSERT INTO link_tags (linkId, tag) VALUES (?, ?)',
        [req.params.id, tag.toLowerCase().trim()], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to add tag' });
            }
            res.json({ success: true });
        });
});

// ============================================================
// REMOVE TAG FROM LINK
// ============================================================
app.post('/remove-tag/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { tag } = req.body;
    if (!tag) {
        return res.status(400).json({ error: 'Tag is required' });
    }

    db.run('DELETE FROM link_tags WHERE linkId = ? AND tag = ?',
        [req.params.id, tag.toLowerCase().trim()], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to remove tag' });
            }
            res.json({ success: true });
        });
});

// ============================================================
// API ROUTES
// ============================================================

// Online users
app.get('/api/online-users', (req, res) => {
    db.all('SELECT name FROM users WHERE isOnline = 1', (err, users) => {
        res.json({
            count: users ? users.length : 0,
            users: users || []
        });
    });
});

// Click stats
app.get('/api/click-stats', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all(`SELECT 
        l.shortCode,
        l.clicks,
        l.title,
        COUNT(cl.id) as totalClicks,
        SUM(CASE WHEN cl.isBot = 1 THEN 1 ELSE 0 END) as botClicks,
        SUM(CASE WHEN cl.isBot = 0 THEN 1 ELSE 0 END) as realClicks
        FROM links l
        LEFT JOIN click_logs cl ON l.id = cl.linkId
        WHERE l.userId = ?
        GROUP BY l.id
        ORDER BY l.clicks DESC`, 
        [req.session.user.id], (err, results) => {
            if (err) {
                return res.json({ error: err.message });
            }
            res.json({ stats: results });
        });
});

// Location stats
app.get('/api/location-stats', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all(`SELECT 
        country,
        countryCode,
        city,
        COUNT(*) as count
        FROM click_logs 
        WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
        AND isBot = 0
        GROUP BY countryCode, city
        ORDER BY count DESC 
        LIMIT 50`,
        [req.session.user.id], (err, results) => {
            if (err) {
                return res.json({ error: err.message });
            }
            res.json({ locations: results });
        });
});

// Device stats
app.get('/api/device-stats', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all(`SELECT 
        device,
        browser,
        os,
        COUNT(*) as count
        FROM click_logs 
        WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
        AND isBot = 0
        GROUP BY device, browser, os
        ORDER BY count DESC`,
        [req.session.user.id], (err, results) => {
            if (err) {
                return res.json({ error: err.message });
            }
            res.json({ devices: results });
        });
});

// ============ Error Handler ============
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    res.status(500).send('Something went wrong! Check server logs.');
});

// ============ Start Server ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 BASE_URL: ${BASE_URL}`);
    console.log(`📦 Database: SQLite (with indexes)`);
    console.log(`📱 Telegram Validation: ${TELEGRAM_BOT_TOKEN ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`🤖 Bot Protection: ✅ Enabled`);
    console.log(`📊 Analytics: ✅ Enabled`);
    console.log(`🌍 Location Detection: ✅ Enabled (Country + City)`);
    console.log(`🌐 Pre-added Domains: ${PRE_ADDED_DOMAINS.length} domains`);
    console.log(`🏳️ All Countries: ${Object.keys(COUNTRIES).length} countries with flags`);
    console.log(`📱 Device Detection: ✅ Enabled`);
    console.log(`🔒 Password Protection: ✅ Enabled`);
    console.log(`📅 Link Expiry: ✅ Enabled`);
    console.log(`🏷️ Link Tags: ✅ Enabled`);
    console.log(`📌 Bookmarks: ✅ Enabled`);
    console.log(`📱 QR Code: ✅ Enabled`);
    console.log(`✅ Ready to use!`);
});
