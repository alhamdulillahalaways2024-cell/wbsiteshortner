// server.js - Complete Working Version with All Fixes
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
const BASE_URL = (process.env.BASE_URL || 'https://thispersonisbrandshortner.click').replace(/\/+$/, '');
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const SKIP_VALIDATION = process.env.SKIP_VALIDATION === 'true' || !TELEGRAM_BOT_TOKEN;

console.log('🔗 BASE_URL:', BASE_URL);
console.log('📦 TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? '✅ Set' : '❌ Not Set');
console.log('🔓 SKIP_VALIDATION:', SKIP_VALIDATION ? '✅ Yes' : '❌ No');

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

// ============ ALL COUNTRIES WITH FLAGS ============
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
    'NF': { name: 'Norfolk Island', flag: '🇳🇫' },
    'XX': { name: 'Unknown', flag: '🌍' }
};

// ============ PRE-ADDED DOMAINS ============
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
db.serialize(function() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        display_name TEXT,
        email TEXT,
        profile_photo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
        account_status TEXT DEFAULT 'active',
        isOnline INTEGER DEFAULT 0,
        isValidated INTEGER DEFAULT 0,
        totalLinks INTEGER DEFAULT 0,
        totalClicks INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS domains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT UNIQUE,
        description TEXT,
        isActive INTEGER DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

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

    // Insert pre-added domains
    PRE_ADDED_DOMAINS.forEach(function(d) {
        db.run(`INSERT OR IGNORE INTO domains (domain, description) VALUES (?, ?)`, [d.domain, d.description]);
    });
    
    console.log('✅ Database tables created successfully');
});

// ============ Middleware ============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7, secure: false, httpOnly: true }
}));

// ============ Make Data Available ============
app.use(function(req, res, next) {
    res.locals.BASE_URL = BASE_URL;
    res.locals.user = req.session.user || null;
    res.locals.page = req.path === '/' ? 'home' : req.path.slice(1);
    res.locals.countries = COUNTRIES;
    
    db.all('SELECT id, name FROM users WHERE isOnline = 1', function(err, users) {
        res.locals.onlineUsers = users ? users.length : 0;
        res.locals.onlineUserList = users || [];
        next();
    });
});

// ============ Helper Functions ============
function generateShortCode() {
    return crypto.randomBytes(4).toString('hex');
}

function getOnlineUsers(callback) {
    db.all('SELECT id, name FROM users WHERE isOnline = 1', function(err, users) {
        if (err) {
            console.error('❌ Online users error:', err);
            return callback(0, []);
        }
        callback(users ? users.length : 0, users || []);
    });
}

// ============ GET LOCATION FROM IP ============
async function getLocationFromIP(ip) {
    // Skip for localhost
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === 'unknown') {
        return { country: 'Localhost', countryCode: 'LOCAL', city: 'Local' };
    }

    try {
        // Using ip-api.com for location detection
        const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon`, {
            timeout: 5000
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
        console.log('⚠️ IP Geolocation failed for IP:', ip, error.message);
        return { country: 'Unknown', countryCode: 'XX', city: 'Unknown' };
    }
}

// ============ Routes ============

// Home
app.get('/', function(req, res) {
    res.render('index', { 
        page: 'home',
        error: null,
        success: null,
        info: null,
        shortUrl: null
    });
});

// Login
app.get('/login', function(req, res) {
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

app.post('/login', function(req, res) {
    var telegramId = req.body.telegramId;
    var username = req.body.username;
    var firstName = req.body.firstName || username;
    var lastName = req.body.lastName || '';
    var email = req.body.email || null;
    
    if (!telegramId || !username) {
        return res.render('index', {
            page: 'login',
            error: 'Please provide both Telegram ID and Name',
            success: null,
            info: null
        });
    }

    var cleanTelegramId = telegramId.trim().replace(/[^0-9]/g, '');
    
    if (!cleanTelegramId) {
        return res.render('index', {
            page: 'login',
            error: 'Please enter a valid numeric Telegram ID',
            success: null,
            info: null
        });
    }

    db.get('SELECT * FROM users WHERE telegram_id = ?', [cleanTelegramId], function(err, user) {
        if (err) {
            return res.render('index', { page: 'login', error: 'Database error.', success: null, info: null });
        }

        if (user) {
            db.run(`UPDATE users SET 
                    username = ?, 
                    first_name = ?, 
                    last_name = ?, 
                    display_name = ?,
                    email = COALESCE(?, email),
                    last_login = CURRENT_TIMESTAMP, 
                    isOnline = 1, 
                    isValidated = 1 
                    WHERE telegram_id = ?`,
                [username, firstName, lastName, firstName + ' ' + lastName, email, cleanTelegramId], 
                function(err) {
                    if (err) {
                        return res.render('index', { page: 'login', error: 'Update failed.', success: null, info: null });
                    }
                    
                    db.get('SELECT * FROM users WHERE telegram_id = ?', [cleanTelegramId], function(err, updatedUser) {
                        if (err || !updatedUser) {
                            return res.render('index', { page: 'login', error: 'User not found.', success: null, info: null });
                        }
                        
                        req.session.user = { 
                            id: updatedUser.id, 
                            telegram_id: updatedUser.telegram_id,
                            username: updatedUser.username,
                            first_name: updatedUser.first_name,
                            last_name: updatedUser.last_name,
                            display_name: updatedUser.display_name,
                            email: updatedUser.email,
                            profile_photo: updatedUser.profile_photo
                        };
                        req.session.save(function() {
                            res.redirect('/dashboard');
                        });
                    });
                });
        } else {
            db.run(`INSERT INTO users 
                    (telegram_id, username, first_name, last_name, display_name, email, isOnline, isValidated, last_login) 
                    VALUES (?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)`,
                [cleanTelegramId, username, firstName, lastName, firstName + ' ' + lastName, email], 
                function(err) {
                    if (err) {
                        console.error('Registration error:', err);
                        return res.render('index', { page: 'login', error: 'Registration failed.', success: null, info: null });
                    }
                    
                    db.get('SELECT * FROM users WHERE telegram_id = ?', [cleanTelegramId], function(err, newUser) {
                        if (err || !newUser) {
                            return res.render('index', { page: 'login', error: 'User creation failed.', success: null, info: null });
                        }
                        
                        req.session.user = { 
                            id: newUser.id, 
                            telegram_id: newUser.telegram_id,
                            username: newUser.username,
                            first_name: newUser.first_name,
                            last_name: newUser.last_name,
                            display_name: newUser.display_name,
                            email: newUser.email,
                            profile_photo: newUser.profile_photo
                        };
                        req.session.save(function() {
                            res.redirect('/dashboard');
                        });
                    });
                });
        }
    });
});

// ============================================================
// USER DATA API
// ============================================================
app.get('/api/user-data', function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], function(err, user) {
        if (err || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        var fields = ['email', 'first_name', 'last_name', 'display_name', 'profile_photo'];
        var filled = 0;
        fields.forEach(function(field) {
            if (user[field] && user[field] !== '') filled++;
        });
        var completion = Math.round((filled / fields.length) * 100);

        res.json({
            id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            display_name: user.display_name,
            email: user.email,
            profile_photo: user.profile_photo,
            created_at: user.created_at,
            last_login: user.last_login,
            account_status: user.account_status,
            totalLinks: user.totalLinks || 0,
            totalClicks: user.totalClicks || 0,
            completion: completion
        });
    });
});

// ============================================================
// UPDATE PROFILE
// ============================================================
app.post('/api/update-profile', function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    var { first_name, last_name, display_name, email, profile_photo } = req.body;
    
    if (email && email !== '') {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
    }

    first_name = first_name || req.session.user.first_name || '';
    last_name = last_name || req.session.user.last_name || '';
    display_name = display_name || first_name + ' ' + last_name;
    
    db.run(`UPDATE users SET 
            first_name = ?, 
            last_name = ?, 
            display_name = ?, 
            email = ?,
            profile_photo = COALESCE(?, profile_photo)
            WHERE id = ?`,
        [first_name, last_name, display_name, email || null, profile_photo || null, req.session.user.id],
        function(err) {
            if (err) {
                console.error('Profile update error:', err);
                return res.status(500).json({ error: 'Failed to update profile' });
            }

            db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], function(err, updatedUser) {
                if (err || !updatedUser) {
                    return res.status(404).json({ error: 'User not found' });
                }

                req.session.user = {
                    id: updatedUser.id,
                    telegram_id: updatedUser.telegram_id,
                    username: updatedUser.username,
                    first_name: updatedUser.first_name,
                    last_name: updatedUser.last_name,
                    display_name: updatedUser.display_name,
                    email: updatedUser.email,
                    profile_photo: updatedUser.profile_photo
                };

                res.json({
                    success: true,
                    user: req.session.user,
                    message: 'Profile updated successfully!'
                });
            });
        });
});

// Logout
app.post('/logout', function(req, res) {
    if (req.session.user) {
        db.run('UPDATE users SET isOnline = 0 WHERE id = ?', [req.session.user.id]);
    }
    req.session.destroy(function() {
        res.redirect('/');
    });
});

// ============================================================
// DASHBOARD
// ============================================================
app.get('/dashboard', function(req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    // Update online status
    db.run('UPDATE users SET isOnline = 1, last_login = CURRENT_TIMESTAMP WHERE id = ?', [req.session.user.id]);

    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], function(err, userData) {
        if (err) userData = {};

        db.all('SELECT * FROM domains WHERE isActive = 1 ORDER BY domain', function(err, domains) {
            if (err) domains = [];

            db.all(`SELECT l.*, d.domain as domainName 
                    FROM links l 
                    LEFT JOIN domains d ON l.domainId = d.id 
                    WHERE l.userId = ? 
                    ORDER BY l.createdAt DESC`, [req.session.user.id], function(err, links) {
                if (err) {
                    return res.redirect('/');
                }

                var totalClicks = 0;
                if (links) {
                    for (var i = 0; i < links.length; i++) {
                        totalClicks = totalClicks + (links[i].clicks || 0);
                    }
                }
                
                var linksWithUrl = [];
                if (links) {
                    for (var j = 0; j < links.length; j++) {
                        var link = links[j];
                        // Use BASE_URL for default domain, or custom domain if set
                        var domain = link.domainName ? link.domainName : BASE_URL.replace(/^https?:\/\//, '');
                        linksWithUrl.push({
                            id: link.id,
                            shortCode: link.shortCode,
                            originalUrl: link.originalUrl,
                            clicks: link.clicks || 0,
                            createdAt: link.createdAt,
                            title: link.title || '',
                            description: link.description || '',
                            isActive: link.isActive,
                            isExpired: link.expiresAt ? new Date(link.expiresAt) < new Date() : false,
                            shortUrl: 'https://' + domain + '/' + link.shortCode
                        });
                    }
                }

                db.run('UPDATE users SET totalLinks = ?, totalClicks = ? WHERE id = ?', 
                    [links ? links.length : 0, totalClicks, req.session.user.id]);

                getOnlineUsers(function(count, users) {
                    // Get country stats from click_logs
                    db.all(`SELECT 
                                country,
                                countryCode,
                                COUNT(*) as count 
                            FROM click_logs 
                            WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                            AND isBot = 0
                            AND country IS NOT NULL
                            AND country != ''
                            GROUP BY countryCode 
                            ORDER BY count DESC 
                            LIMIT 20`,
                        [req.session.user.id], function(err, countryStats) {
                            
                            if (err) countryStats = [];

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
                                todayClicks: 0,
                                weekClicks: 0,
                                monthClicks: 0,
                                botClicks: 0,
                                realClicks: 0,
                                clickRate: 100,
                                topLink: null,
                                weekData: [0,0,0,0,0,0,0],
                                countryStats: countryStats || [],
                                cityStats: [],
                                deviceStats: [],
                                browserStats: [],
                                osStats: []
                            });
                        });
                });
            });
        });
    });
});

// ============================================================
// SHORTEN LINK
// ============================================================
app.post('/shorten', function(req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    var originalUrl = req.body.originalUrl;
    var customSlug = req.body.customSlug;
    var domainId = req.body.domainId;
    var title = req.body.title;
    var description = req.body.description;
    var password = req.body.password;
    var expiresIn = req.body.expiresIn;
    
    if (!originalUrl) {
        return res.redirect('/dashboard?error=Please provide a URL');
    }

    var shortCode = customSlug || generateShortCode();

    db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], function(err, existing) {
        if (err) {
            return res.redirect('/dashboard?error=Database error');
        }

        if (existing) {
            if (customSlug) {
                return res.redirect('/dashboard?error=' + encodeURIComponent('"' + customSlug + '" is already taken'));
            }
            shortCode = generateShortCode();
        }

        var expiresAt = null;
        if (expiresIn) {
            var now = new Date();
            if (expiresIn === '1d') now.setDate(now.getDate() + 1);
            else if (expiresIn === '7d') now.setDate(now.getDate() + 7);
            else if (expiresIn === '30d') now.setDate(now.getDate() + 30);
            else if (expiresIn === '90d') now.setDate(now.getDate() + 90);
            else if (expiresIn === '365d') now.setDate(now.getDate() + 365);
            expiresAt = now.toISOString();
        }

        var insertDomainId = domainId && domainId !== 'default' ? domainId : null;
        var hashedPassword = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
        
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
// REDIRECT - FIXED: Works with all domains
// ============================================================
app.get('/:shortCode', async function(req, res) {
    var shortCode = req.params.shortCode;
    
    var routes = ['login', 'dashboard', 'logout', 'shorten', 'update-link', 'delete-link', 
                  'api', 'signup', 'favicon.ico', 'qr', 'save-link', 'unsave-link', 
                  'add-tag', 'remove-tag', 'admin', 'check-password', 'og-image.png'];
    
    if (routes.indexOf(shortCode) !== -1) {
        return res.redirect('/');
    }

    var userAgent = req.headers['user-agent'] || '';
    var ip = req.ip || req.connection.remoteAddress || 'unknown';
    var referer = req.headers['referer'] || '';
    var host = req.get('host') || '';

    // Get link with domain info
    db.get(`SELECT l.*, d.domain as domainName 
            FROM links l 
            LEFT JOIN domains d ON l.domainId = d.id 
            WHERE l.shortCode = ?`, [shortCode], function(err, link) {
        if (err || !link) {
            return res.status(404).send('Link not found');
        }

        if (!link.isActive) {
            return res.status(410).send('This link has been deactivated');
        }

        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
            return res.status(410).send('This link has expired');
        }

        // ===== DOMAIN CHECK - FIXED =====
        // If link has a custom domain, check if request came from that domain
        if (link.domainName) {
            var requestDomain = host.toLowerCase();
            var linkDomain = link.domainName.toLowerCase();
            // If domain doesn't match, redirect to the correct domain
            if (requestDomain !== linkDomain) {
                return res.redirect('https://' + linkDomain + '/' + shortCode);
            }
        }

        // ===== COUNT CLICK WITH LOCATION =====
        db.run('UPDATE links SET clicks = clicks + 1 WHERE id = ?', [link.id], function(err) {
            if (err) {
                console.error('❌ Click count error:', err);
            }
            
            // Get location from IP
            getLocationFromIP(ip).then(function(geoData) {
                // Insert click log with country data
                db.run(`INSERT INTO click_logs 
                        (linkId, ip, userAgent, referer, country, countryCode, city, isBot) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
                    [link.id, ip, userAgent, referer, geoData.country, geoData.countryCode, geoData.city],
                    function(err) {
                        if (err) {
                            console.error('❌ Click log error:', err);
                        }
                        res.redirect(link.originalUrl);
                    });
            }).catch(function(error) {
                console.error('❌ Location error:', error);
                // Fallback - insert without location
                db.run(`INSERT INTO click_logs 
                        (linkId, ip, userAgent, referer, isBot) 
                        VALUES (?, ?, ?, ?, 0)`,
                    [link.id, ip, userAgent, referer],
                    function(err) {
                        res.redirect(link.originalUrl);
                    });
            });
        });
    });
});

// ============================================================
// UPDATE LINK
// ============================================================
app.post('/update-link/:id', function(req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    var newUrl = req.body.newUrl;
    
    if (!newUrl) {
        return res.redirect('/dashboard?error=Please provide a new URL');
    }
    
    db.run('UPDATE links SET originalUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?',
        [newUrl, req.params.id, req.session.user.id], function(err) {
            if (err) {
                return res.redirect('/dashboard?error=Update failed');
            }
            res.redirect('/dashboard?success=Link updated successfully!');
        });
});

// ============================================================
// DELETE LINK
// ============================================================
app.post('/delete-link/:id', function(req, res) {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    db.run('DELETE FROM links WHERE id = ? AND userId = ?', [req.params.id, req.session.user.id], function(err) {
        if (err) {
            return res.redirect('/dashboard?error=Delete failed');
        }
        res.redirect('/dashboard?success=Link deleted successfully!');
    });
});

// ============================================================
// TOGGLE LINK
// ============================================================
app.post('/toggle-link/:id', function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.get('SELECT isActive FROM links WHERE id = ? AND userId = ?', [req.params.id, req.session.user.id], function(err, link) {
        if (err || !link) {
            return res.status(404).json({ error: 'Link not found' });
        }

        var newStatus = link.isActive ? 0 : 1;
        db.run('UPDATE links SET isActive = ? WHERE id = ?', [newStatus, req.params.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to toggle link' });
            }
            res.json({ success: true, isActive: newStatus });
        });
    });
});

// ============================================================
// QR CODE GENERATOR
// ============================================================
app.get('/qr/:shortCode', function(req, res) {
    var shortCode = req.params.shortCode;
    
    db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], function(err, link) {
        if (err || !link) {
            return res.status(404).send('Link not found');
        }

        try {
            var url = BASE_URL + '/' + shortCode;
            QRCode.toDataURL(url, {
                width: 300,
                margin: 2,
                color: { dark: '#6C63FF', light: '#FFFFFF' }
            }, function(err, qrImage) {
                if (err) {
                    return res.status(500).json({ error: 'QR generation failed' });
                }
                res.json({ qr: qrImage, url: url });
            });
        } catch (error) {
            res.status(500).json({ error: 'QR generation failed' });
        }
    });
});

// ============================================================
// API ROUTES
// ============================================================

app.get('/api/online-users', function(req, res) {
    db.all('SELECT name FROM users WHERE isOnline = 1', function(err, users) {
        if (err) {
            return res.json({ count: 0, users: [] });
        }
        res.json({
            count: users ? users.length : 0,
            users: users || []
        });
    });
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use(function(err, req, res, next) {
    console.error('❌ Server Error:', err.message);
    res.status(500).send('Something went wrong! Check server logs.');
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, '0.0.0.0', function() {
    console.log('🚀 Server running on port ' + PORT);
    console.log('🔗 BASE_URL: ' + BASE_URL);
    console.log('✅ Ready to use!');
});
