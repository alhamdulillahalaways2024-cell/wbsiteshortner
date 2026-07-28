// server.js - Complete Working Version (All Countries with Flags)
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
const BASE_URL = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
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

// ============================================================
// ALL COUNTRIES WITH FLAGS (COMPLETE LIST)
// ============================================================
const COUNTRIES = {
    // Asia
    'BD': { name: 'Bangladesh', flag: '🇧🇩' },
    'IN': { name: 'India', flag: '🇮🇳' },
    'PK': { name: 'Pakistan', flag: '🇵🇰' },
    'CN': { name: 'China', flag: '🇨🇳' },
    'JP': { name: 'Japan', flag: '🇯🇵' },
    'KR': { name: 'South Korea', flag: '🇰🇷' },
    'KP': { name: 'North Korea', flag: '🇰🇵' },
    'MN': { name: 'Mongolia', flag: '🇲🇳' },
    'TW': { name: 'Taiwan', flag: '🇹🇼' },
    'HK': { name: 'Hong Kong', flag: '🇭🇰' },
    'MO': { name: 'Macau', flag: '🇲🇴' },
    'ID': { name: 'Indonesia', flag: '🇮🇩' },
    'MY': { name: 'Malaysia', flag: '🇲🇾' },
    'PH': { name: 'Philippines', flag: '🇵🇭' },
    'SG': { name: 'Singapore', flag: '🇸🇬' },
    'TH': { name: 'Thailand', flag: '🇹🇭' },
    'VN': { name: 'Vietnam', flag: '🇻🇳' },
    'LA': { name: 'Laos', flag: '🇱🇦' },
    'KH': { name: 'Cambodia', flag: '🇰🇭' },
    'MM': { name: 'Myanmar', flag: '🇲🇲' },
    'BN': { name: 'Brunei', flag: '🇧🇳' },
    'TL': { name: 'Timor-Leste', flag: '🇹🇱' },
    'AF': { name: 'Afghanistan', flag: '🇦🇫' },
    'KZ': { name: 'Kazakhstan', flag: '🇰🇿' },
    'UZ': { name: 'Uzbekistan', flag: '🇺🇿' },
    'TM': { name: 'Turkmenistan', flag: '🇹🇲' },
    'KG': { name: 'Kyrgyzstan', flag: '🇰🇬' },
    'TJ': { name: 'Tajikistan', flag: '🇹🇯' },
    'IR': { name: 'Iran', flag: '🇮🇷' },
    'IQ': { name: 'Iraq', flag: '🇮🇶' },
    'SY': { name: 'Syria', flag: '🇸🇾' },
    'LB': { name: 'Lebanon', flag: '🇱🇧' },
    'JO': { name: 'Jordan', flag: '🇯🇴' },
    'IL': { name: 'Israel', flag: '🇮🇱' },
    'SA': { name: 'Saudi Arabia', flag: '🇸🇦' },
    'YE': { name: 'Yemen', flag: '🇾🇪' },
    'OM': { name: 'Oman', flag: '🇴🇲' },
    'AE': { name: 'UAE', flag: '🇦🇪' },
    'QA': { name: 'Qatar', flag: '🇶🇦' },
    'BH': { name: 'Bahrain', flag: '🇧🇭' },
    'KW': { name: 'Kuwait', flag: '🇰🇼' },
    'TR': { name: 'Turkey', flag: '🇹🇷' },
    'GE': { name: 'Georgia', flag: '🇬🇪' },
    'AM': { name: 'Armenia', flag: '🇦🇲' },
    'AZ': { name: 'Azerbaijan', flag: '🇦🇿' },
    
    // Europe
    'GB': { name: 'United Kingdom', flag: '🇬🇧' },
    'DE': { name: 'Germany', flag: '🇩🇪' },
    'FR': { name: 'France', flag: '🇫🇷' },
    'IT': { name: 'Italy', flag: '🇮🇹' },
    'ES': { name: 'Spain', flag: '🇪🇸' },
    'PT': { name: 'Portugal', flag: '🇵🇹' },
    'NL': { name: 'Netherlands', flag: '🇳🇱' },
    'BE': { name: 'Belgium', flag: '🇧🇪' },
    'CH': { name: 'Switzerland', flag: '🇨🇭' },
    'AT': { name: 'Austria', flag: '🇦🇹' },
    'SE': { name: 'Sweden', flag: '🇸🇪' },
    'NO': { name: 'Norway', flag: '🇳🇴' },
    'DK': { name: 'Denmark', flag: '🇩🇰' },
    'FI': { name: 'Finland', flag: '🇫🇮' },
    'PL': { name: 'Poland', flag: '🇵🇱' },
    'CZ': { name: 'Czech Republic', flag: '🇨🇿' },
    'HU': { name: 'Hungary', flag: '🇭🇺' },
    'RO': { name: 'Romania', flag: '🇷🇴' },
    'BG': { name: 'Bulgaria', flag: '🇧🇬' },
    'GR': { name: 'Greece', flag: '🇬🇷' },
    'IE': { name: 'Ireland', flag: '🇮🇪' },
    'IS': { name: 'Iceland', flag: '🇮🇸' },
    'LI': { name: 'Liechtenstein', flag: '🇱🇮' },
    'LU': { name: 'Luxembourg', flag: '🇱🇺' },
    'MT': { name: 'Malta', flag: '🇲🇹' },
    'MC': { name: 'Monaco', flag: '🇲🇨' },
    'SM': { name: 'San Marino', flag: '🇸🇲' },
    'VA': { name: 'Vatican City', flag: '🇻🇦' },
    'SK': { name: 'Slovakia', flag: '🇸🇰' },
    'SI': { name: 'Slovenia', flag: '🇸🇮' },
    'HR': { name: 'Croatia', flag: '🇭🇷' },
    'BA': { name: 'Bosnia', flag: '🇧🇦' },
    'RS': { name: 'Serbia', flag: '🇷🇸' },
    'ME': { name: 'Montenegro', flag: '🇲🇪' },
    'MK': { name: 'North Macedonia', flag: '🇲🇰' },
    'AL': { name: 'Albania', flag: '🇦🇱' },
    'BY': { name: 'Belarus', flag: '🇧🇾' },
    'UA': { name: 'Ukraine', flag: '🇺🇦' },
    'MD': { name: 'Moldova', flag: '🇲🇩' },
    'LT': { name: 'Lithuania', flag: '🇱🇹' },
    'LV': { name: 'Latvia', flag: '🇱🇻' },
    'EE': { name: 'Estonia', flag: '🇪🇪' },
    
    // North America
    'US': { name: 'United States', flag: '🇺🇸' },
    'CA': { name: 'Canada', flag: '🇨🇦' },
    'MX': { name: 'Mexico', flag: '🇲🇽' },
    'GT': { name: 'Guatemala', flag: '🇬🇹' },
    'BZ': { name: 'Belize', flag: '🇧🇿' },
    'SV': { name: 'El Salvador', flag: '🇸🇻' },
    'HN': { name: 'Honduras', flag: '🇭🇳' },
    'NI': { name: 'Nicaragua', flag: '🇳🇮' },
    'CR': { name: 'Costa Rica', flag: '🇨🇷' },
    'PA': { name: 'Panama', flag: '🇵🇦' },
    'CU': { name: 'Cuba', flag: '🇨🇺' },
    'JM': { name: 'Jamaica', flag: '🇯🇲' },
    'HT': { name: 'Haiti', flag: '🇭🇹' },
    'DO': { name: 'Dominican Republic', flag: '🇩🇴' },
    'BS': { name: 'Bahamas', flag: '🇧🇸' },
    'BB': { name: 'Barbados', flag: '🇧🇧' },
    'TT': { name: 'Trinidad', flag: '🇹🇹' },
    'LC': { name: 'St Lucia', flag: '🇱🇨' },
    'VC': { name: 'St Vincent', flag: '🇻🇨' },
    'GD': { name: 'Grenada', flag: '🇬🇩' },
    'DM': { name: 'Dominica', flag: '🇩🇲' },
    'KN': { name: 'St Kitts', flag: '🇰🇳' },
    'AG': { name: 'Antigua', flag: '🇦🇬' },
    
    // South America
    'BR': { name: 'Brazil', flag: '🇧🇷' },
    'AR': { name: 'Argentina', flag: '🇦🇷' },
    'CL': { name: 'Chile', flag: '🇨🇱' },
    'CO': { name: 'Colombia', flag: '🇨🇴' },
    'PE': { name: 'Peru', flag: '🇵🇪' },
    'VE': { name: 'Venezuela', flag: '🇻🇪' },
    'BO': { name: 'Bolivia', flag: '🇧🇴' },
    'PY': { name: 'Paraguay', flag: '🇵🇾' },
    'UY': { name: 'Uruguay', flag: '🇺🇾' },
    'EC': { name: 'Ecuador', flag: '🇪🇨' },
    'GY': { name: 'Guyana', flag: '🇬🇾' },
    'SR': { name: 'Suriname', flag: '🇸🇷' },
    'GF': { name: 'French Guiana', flag: '🇬🇫' },
    
    // Africa
    'EG': { name: 'Egypt', flag: '🇪🇬' },
    'ZA': { name: 'South Africa', flag: '🇿🇦' },
    'NG': { name: 'Nigeria', flag: '🇳🇬' },
    'KE': { name: 'Kenya', flag: '🇰🇪' },
    'TZ': { name: 'Tanzania', flag: '🇹🇿' },
    'GH': { name: 'Ghana', flag: '🇬🇭' },
    'MA': { name: 'Morocco', flag: '🇲🇦' },
    'DZ': { name: 'Algeria', flag: '🇩🇿' },
    'TN': { name: 'Tunisia', flag: '🇹🇳' },
    'LY': { name: 'Libya', flag: '🇱🇾' },
    'SD': { name: 'Sudan', flag: '🇸🇩' },
    'SS': { name: 'South Sudan', flag: '🇸🇸' },
    'ET': { name: 'Ethiopia', flag: '🇪🇹' },
    'SO': { name: 'Somalia', flag: '🇸🇴' },
    'DJ': { name: 'Djibouti', flag: '🇩🇯' },
    'ER': { name: 'Eritrea', flag: '🇪🇷' },
    'UG': { name: 'Uganda', flag: '🇺🇬' },
    'RW': { name: 'Rwanda', flag: '🇷🇼' },
    'BI': { name: 'Burundi', flag: '🇧🇮' },
    'CD': { name: 'DR Congo', flag: '🇨🇩' },
    'CG': { name: 'Congo', flag: '🇨🇬' },
    'GA': { name: 'Gabon', flag: '🇬🇦' },
    'CM': { name: 'Cameroon', flag: '🇨🇲' },
    'CI': { name: 'Ivory Coast', flag: '🇨🇮' },
    'BF': { name: 'Burkina Faso', flag: '🇧🇫' },
    'ML': { name: 'Mali', flag: '🇲🇱' },
    'NE': { name: 'Niger', flag: '🇳🇪' },
    'TD': { name: 'Chad', flag: '🇹🇩' },
    'CF': { name: 'Central Africa', flag: '🇨🇫' },
    'AO': { name: 'Angola', flag: '🇦🇴' },
    'ZM': { name: 'Zambia', flag: '🇿🇲' },
    'ZW': { name: 'Zimbabwe', flag: '🇿🇼' },
    'MW': { name: 'Malawi', flag: '🇲🇼' },
    'MZ': { name: 'Mozambique', flag: '🇲🇿' },
    'MG': { name: 'Madagascar', flag: '🇲🇬' },
    'MU': { name: 'Mauritius', flag: '🇲🇺' },
    'SC': { name: 'Seychelles', flag: '🇸🇨' },
    'KM': { name: 'Comoros', flag: '🇰🇲' },
    'CV': { name: 'Cape Verde', flag: '🇨🇻' },
    'ST': { name: 'Sao Tome', flag: '🇸🇹' },
    'GW': { name: 'Guinea-Bissau', flag: '🇬🇼' },
    'GN': { name: 'Guinea', flag: '🇬🇳' },
    'SL': { name: 'Sierra Leone', flag: '🇸🇱' },
    'LR': { name: 'Liberia', flag: '🇱🇷' },
    'TG': { name: 'Togo', flag: '🇹🇬' },
    'BJ': { name: 'Benin', flag: '🇧🇯' },
    'SN': { name: 'Senegal', flag: '🇸🇳' },
    'GM': { name: 'Gambia', flag: '🇬🇲' },
    'MR': { name: 'Mauritania', flag: '🇲🇷' },
    'LS': { name: 'Lesotho', flag: '🇱🇸' },
    'BW': { name: 'Botswana', flag: '🇧🇼' },
    'NA': { name: 'Namibia', flag: '🇳🇦' },
    'SZ': { name: 'Eswatini', flag: '🇸🇿' },
    
    // Oceania
    'AU': { name: 'Australia', flag: '🇦🇺' },
    'NZ': { name: 'New Zealand', flag: '🇳🇿' },
    'PG': { name: 'Papua New Guinea', flag: '🇵🇬' },
    'FJ': { name: 'Fiji', flag: '🇫🇯' },
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
    'PN': { name: 'Pitcairn', flag: '🇵🇳' },
    'TK': { name: 'Tokelau', flag: '🇹🇰' },
    'WF': { name: 'Wallis & Futuna', flag: '🇼🇫' },
    'NU': { name: 'Niue', flag: '🇳🇺' },
    
    // Others
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

// ============ CREATE TABLES ============
db.serialize(function() {
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
    
    db.all('SELECT name FROM users WHERE isOnline = 1', function(err, users) {
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
    db.all('SELECT name FROM users WHERE isOnline = 1', function(err, users) {
        callback(users ? users.length : 0, users || []);
    });
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

    db.get('SELECT * FROM users WHERE telegramId = ?', [cleanTelegramId], function(err, user) {
        if (err) {
            return res.render('index', { page: 'login', error: 'Database error.', success: null, info: null });
        }

        if (user) {
            db.run('UPDATE users SET name = ?, email = ?, lastSeen = CURRENT_TIMESTAMP, isOnline = 1, isValidated = 1 WHERE id = ?', 
                [username, email, user.id], function(err) {
                    if (err) {
                        return res.render('index', { page: 'login', error: 'Update failed.', success: null, info: null });
                    }
                    req.session.user = { id: user.id, name: username, telegramId: cleanTelegramId };
                    req.session.save(function() {
                        res.redirect('/dashboard');
                    });
                });
        } else {
            db.run('INSERT INTO users (telegramId, name, email, isOnline, isValidated) VALUES (?, ?, ?, 1, 1)',
                [cleanTelegramId, username, email], function(err) {
                    if (err) {
                        return res.render('index', { page: 'login', error: 'Registration failed.', success: null, info: null });
                    }
                    req.session.user = { id: this.lastID, name: username, telegramId: cleanTelegramId };
                    req.session.save(function() {
                        res.redirect('/dashboard');
                    });
                });
        }
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

    db.run('UPDATE users SET isOnline = 1, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', [req.session.user.id]);

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
                        var domain = link.domainName ? link.domainName : 'shortlink.click';
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
                        countryStats: [],
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
// REDIRECT
// ============================================================
app.get('/:shortCode', function(req, res) {
    var shortCode = req.params.shortCode;
    
    var routes = ['login', 'dashboard', 'logout', 'shorten', 'update-link', 'delete-link', 
                  'api', 'signup', 'favicon.ico', 'qr', 'save-link', 'unsave-link', 
                  'add-tag', 'remove-tag', 'admin', 'check-password'];
    
    if (routes.indexOf(shortCode) !== -1) {
        return res.redirect('/');
    }

    var userAgent = req.headers['user-agent'] || '';
    var ip = req.ip || req.connection.remoteAddress || 'unknown';
    var referer = req.headers['referer'] || '';
    var host = req.get('host') || '';

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

        if (link.domainName) {
            var requestDomain = host.toLowerCase();
            var linkDomain = link.domainName.toLowerCase();
            if (requestDomain !== linkDomain) {
                return res.redirect('https://' + linkDomain + '/' + shortCode);
            }
        }

        db.run('UPDATE links SET clicks = clicks + 1 WHERE id = ?', [link.id], function(err) {
            if (err) {
                console.error('❌ Click count error:', err);
            }
            
            db.run(`INSERT INTO click_logs 
                    (linkId, ip, userAgent, referer, isBot) 
                    VALUES (?, ?, ?, ?, 0)`,
                [link.id, ip, userAgent, referer]);
            
            res.redirect(link.originalUrl);
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
    console.log('🏳️ ' + Object.keys(COUNTRIES).length + ' countries loaded with flags');
    console.log('✅ Ready to use!');
});
