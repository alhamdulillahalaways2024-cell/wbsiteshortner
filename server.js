// server.js - Complete Premium URL Shortener (No Password)
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

console.log('🔗 BASE_URL:', BASE_URL);

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

// ============ COUNTRIES WITH FLAGS ============
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
    'XX': { name: 'Unknown', flag: '🌍' }
};

// ============================================================
// CREATE TABLES (NO PASSWORD)
// ============================================================
db.serialize(function() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE,
        username TEXT UNIQUE,
        first_name TEXT,
        last_name TEXT,
        display_name TEXT,
        email TEXT,
        profile_photo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
        account_status TEXT DEFAULT 'active',
        isOnline INTEGER DEFAULT 0,
        isValidated INTEGER DEFAULT 1,
        totalLinks INTEGER DEFAULT 0,
        totalClicks INTEGER DEFAULT 0,
        timezone TEXT DEFAULT 'Asia/Dhaka'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortCode TEXT UNIQUE,
        originalUrl TEXT,
        userId INTEGER,
        title TEXT,
        description TEXT,
        clicks INTEGER DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        expiresAt DATETIME,
        password TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
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
    res.locals.onlineUsers = 0;
    res.locals.onlineUserList = [];
    res.locals.error = null;
    res.locals.success = null;
    res.locals.info = null;
    res.locals.shortUrl = null;
    res.locals.links = [];
    res.locals.totalClicks = 0;
    res.locals.todayClicks = 0;
    res.locals.weekClicks = 0;
    res.locals.monthClicks = 0;
    res.locals.botClicks = 0;
    res.locals.realClicks = 0;
    res.locals.clickRate = 100;
    res.locals.topLink = null;
    res.locals.weekData = [0,0,0,0,0,0,0];
    res.locals.countryStats = [];
    res.locals.cityStats = [];
    res.locals.deviceStats = [];
    res.locals.browserStats = [];
    res.locals.osStats = [];
    res.locals.userData = {};
    
    db.all('SELECT id, display_name, username FROM users WHERE isOnline = 1', function(err, users) {
        if (!err && users && users.length > 0) {
            var formattedUsers = [];
            for (var i = 0; i < users.length; i++) {
                formattedUsers.push({
                    id: users[i].id,
                    name: users[i].display_name || users[i].username || 'User'
                });
            }
            res.locals.onlineUsers = formattedUsers.length;
            res.locals.onlineUserList = formattedUsers;
        }
        next();
    });
});

// ============ Helper Functions ============
function generateShortCode() {
    return crypto.randomBytes(4).toString('hex');
}

function getOnlineUsers(callback) {
    db.all('SELECT id, display_name, username FROM users WHERE isOnline = 1', function(err, users) {
        if (err || !users || users.length === 0) {
            return callback(0, []);
        }
        var formattedUsers = [];
        for (var i = 0; i < users.length; i++) {
            formattedUsers.push({
                id: users[i].id,
                name: users[i].display_name || users[i].username || 'User'
            });
        }
        callback(formattedUsers.length, formattedUsers);
    });
}

// ============ GET LOCATION FROM IP ============
async function getLocationFromIP(ip) {
    if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost' || ip === 'unknown') {
        return { country: 'Localhost', countryCode: 'LOCAL', city: 'Local' };
    }

    try {
        var response = await axios.get('http://ip-api.com/json/' + ip + '?fields=status,country,countryCode,city', {
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
        return { country: 'Unknown', countryCode: 'XX', city: 'Unknown' };
    }
}

// ============ BOT DETECTION ============
function isBot(userAgent) {
    if (!userAgent) return false;
    var botPatterns = ['bot', 'crawl', 'spider', 'scrape', 'headless', 'puppeteer', 'selenium', 'phantom', 'curl', 'wget', 'python', 'java', 'go-http', 'node-fetch', 'axios', 'postman', 'insomnia', 'httpie', 'lighthouse', 'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot', 'facebookexternalhit', 'facebot', 'twitterbot', 'telegrambot', 'whatsapp', 'slackbot', 'discordbot', 'applebot', 'datadog', 'newrelic', 'pingdom', 'uptime', 'monitor', 'healthcheck'];
    var lowerUA = userAgent.toLowerCase();
    for (var i = 0; i < botPatterns.length; i++) {
        if (lowerUA.indexOf(botPatterns[i]) !== -1) {
            return true;
        }
    }
    return false;
}

// ============ DETECT DEVICE ============
function detectDeviceInfo(userAgent) {
    var info = { device: 'Desktop', browser: 'Unknown', os: 'Unknown' };
    if (!userAgent) return info;

    if (userAgent.indexOf('Mobile') !== -1 || userAgent.indexOf('Android') !== -1 || userAgent.indexOf('iPhone') !== -1) {
        info.device = 'Mobile';
    } else if (userAgent.indexOf('Tablet') !== -1 || userAgent.indexOf('iPad') !== -1) {
        info.device = 'Tablet';
    }

    if (userAgent.indexOf('Chrome') !== -1 && userAgent.indexOf('Edg') === -1) info.browser = 'Chrome';
    else if (userAgent.indexOf('Firefox') !== -1) info.browser = 'Firefox';
    else if (userAgent.indexOf('Safari') !== -1 && userAgent.indexOf('Chrome') === -1) info.browser = 'Safari';
    else if (userAgent.indexOf('Edg') !== -1) info.browser = 'Edge';
    else if (userAgent.indexOf('Opera') !== -1) info.browser = 'Opera';

    if (userAgent.indexOf('Windows') !== -1) info.os = 'Windows';
    else if (userAgent.indexOf('Mac') !== -1) info.os = 'macOS';
    else if (userAgent.indexOf('Linux') !== -1) info.os = 'Linux';
    else if (userAgent.indexOf('Android') !== -1) info.os = 'Android';
    else if (userAgent.indexOf('iOS') !== -1 || userAgent.indexOf('iPhone') !== -1 || userAgent.indexOf('iPad') !== -1) info.os = 'iOS';

    return info;
}

// ============ Routes ============

// Home
app.get('/', function(req, res) {
    try {
        res.render('index', { 
            page: 'home',
            error: null,
            success: null,
            info: null,
            shortUrl: null
        });
    } catch (err) {
        console.error('Home route error:', err);
        res.status(500).send('Server error. Please try again.');
    }
});

// Login Page
app.get('/login', function(req, res) {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    try {
        res.render('index', { 
            page: 'login',
            error: null,
            success: null,
            info: null
        });
    } catch (err) {
        console.error('Login route error:', err);
        res.status(500).send('Server error. Please try again.');
    }
});

// ============================================================
// LOGIN WITH TELEGRAM ID (NO PASSWORD)
// ============================================================
app.post('/login', function(req, res) {
    var telegramId = req.body.telegramId;
    var username = req.body.username;
    var firstName = req.body.firstName || username;
    var lastName = req.body.lastName || '';
    var email = req.body.email || '';
    var timezone = req.body.timezone || 'Asia/Dhaka';
    
    if (!telegramId || !username || !firstName || !lastName) {
        return res.render('index', {
            page: 'login',
            error: 'Please provide Telegram ID, Username, First Name and Last Name',
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

    // Check if user exists by telegram_id
    db.get('SELECT * FROM users WHERE telegram_id = ?', [cleanTelegramId], function(err, user) {
        if (err) {
            return res.render('index', {
                page: 'login',
                error: 'Database error. Please try again.',
                success: null,
                info: null
            });
        }

        if (user) {
            // Update existing user
            db.run(`UPDATE users SET 
                    username = ?, 
                    first_name = ?, 
                    last_name = ?, 
                    display_name = ?,
                    email = COALESCE(?, email),
                    timezone = ?,
                    last_login = CURRENT_TIMESTAMP, 
                    isOnline = 1 
                    WHERE telegram_id = ?`,
                [username, firstName, lastName, firstName + ' ' + lastName, email, timezone, cleanTelegramId],
                function(err) {
                    if (err) {
                        return res.render('index', {
                            page: 'login',
                            error: 'Update failed. Please try again.',
                            success: null,
                            info: null
                        });
                    }

                    db.get('SELECT * FROM users WHERE telegram_id = ?', [cleanTelegramId], function(err, updatedUser) {
                        if (err || !updatedUser) {
                            return res.render('index', {
                                page: 'login',
                                error: 'User not found.',
                                success: null,
                                info: null
                            });
                        }

                        req.session.user = {
                            id: updatedUser.id,
                            telegram_id: updatedUser.telegram_id,
                            username: updatedUser.username,
                            first_name: updatedUser.first_name,
                            last_name: updatedUser.last_name,
                            display_name: updatedUser.display_name,
                            email: updatedUser.email,
                            profile_photo: updatedUser.profile_photo,
                            timezone: updatedUser.timezone || 'Asia/Dhaka'
                        };

                        req.session.save(function() {
                            res.redirect('/dashboard');
                        });
                    });
                });
        } else {
            // Create new user
            db.run(`INSERT INTO users 
                    (telegram_id, username, first_name, last_name, display_name, email, timezone, isOnline, last_login) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
                [cleanTelegramId, username, firstName, lastName, firstName + ' ' + lastName, email, timezone],
                function(err) {
                    if (err) {
                        console.error('Registration error:', err);
                        return res.render('index', {
                            page: 'login',
                            error: 'Registration failed. Please try again.',
                            success: null,
                            info: null
                        });
                    }

                    db.get('SELECT * FROM users WHERE telegram_id = ?', [cleanTelegramId], function(err, newUser) {
                        if (err || !newUser) {
                            return res.render('index', {
                                page: 'login',
                                error: 'Registration failed. Please try again.',
                                success: null,
                                info: null
                            });
                        }

                        req.session.user = {
                            id: newUser.id,
                            telegram_id: newUser.telegram_id,
                            username: newUser.username,
                            first_name: newUser.first_name,
                            last_name: newUser.last_name,
                            display_name: newUser.display_name,
                            email: newUser.email,
                            profile_photo: newUser.profile_photo,
                            timezone: newUser.timezone || 'Asia/Dhaka'
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
// UPDATE USER PROFILE
// ============================================================
app.post('/api/update-profile', function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    var first_name = req.body.first_name || req.session.user.first_name || '';
    var last_name = req.body.last_name || req.session.user.last_name || '';
    var display_name = req.body.display_name || first_name + ' ' + last_name;
    var email = req.body.email || null;
    var profile_photo = req.body.profile_photo || null;
    
    if (email && email !== '') {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address' });
        }
    }
    
    db.run('UPDATE users SET first_name = ?, last_name = ?, display_name = ?, email = ?, profile_photo = COALESCE(?, profile_photo) WHERE id = ?',
        [first_name, last_name, display_name, email, profile_photo, req.session.user.id],
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
                    profile_photo: updatedUser.profile_photo,
                    timezone: updatedUser.timezone || 'Asia/Dhaka'
                };

                res.json({
                    success: true,
                    user: req.session.user,
                    message: 'Profile updated successfully!'
                });
            });
        });
});

// ============================================================
// UPDATE TIMEZONE
// ============================================================
app.post('/api/update-timezone', function(req, res) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    var timezone = req.body.timezone;
    if (!timezone) {
        return res.status(400).json({ error: 'Timezone is required' });
    }

    db.run('UPDATE users SET timezone = ? WHERE id = ?', [timezone, req.session.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update timezone' });
        }

        db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], function(err, updatedUser) {
            if (err || !updatedUser) {
                return res.status(404).json({ error: 'User not found' });
            }

            req.session.user.timezone = updatedUser.timezone;

            res.json({
                success: true,
                timezone: updatedUser.timezone,
                message: 'Timezone updated successfully!'
            });
        });
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
        for (var i = 0; i < fields.length; i++) {
            if (user[fields[i]] && user[fields[i]] !== '') filled++;
        }
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
            timezone: user.timezone || 'Asia/Dhaka',
            completion: completion
        });
    });
});

// ============================================================
// LOGOUT
// ============================================================
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

    db.run('UPDATE users SET isOnline = 1, last_login = CURRENT_TIMESTAMP WHERE id = ?', [req.session.user.id]);

    db.get('SELECT * FROM users WHERE id = ?', [req.session.user.id], function(err, userData) {
        if (err) userData = {};

        db.all('SELECT * FROM links WHERE userId = ? ORDER BY createdAt DESC', [req.session.user.id], function(err, links) {
            if (err) {
                return res.redirect('/');
            }

            var totalClicks = 0;
            var linksWithUrl = [];
            if (links) {
                for (var i = 0; i < links.length; i++) {
                    totalClicks = totalClicks + (links[i].clicks || 0);
                    linksWithUrl.push({
                        id: links[i].id,
                        shortCode: links[i].shortCode,
                        originalUrl: links[i].originalUrl,
                        clicks: links[i].clicks || 0,
                        createdAt: links[i].createdAt,
                        title: links[i].title || '',
                        description: links[i].description || '',
                        isActive: links[i].isActive,
                        isExpired: links[i].expiresAt ? new Date(links[i].expiresAt) < new Date() : false,
                        shortUrl: BASE_URL + '/' + links[i].shortCode
                    });
                }
            }

            db.run('UPDATE users SET totalLinks = ?, totalClicks = ? WHERE id = ?', 
                [links ? links.length : 0, totalClicks, req.session.user.id]);

            getOnlineUsers(function(count, users) {
                db.all(`SELECT country, countryCode, COUNT(*) as count 
                        FROM click_logs 
                        WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                        AND isBot = 0 
                        AND country IS NOT NULL 
                        AND country != '' 
                        GROUP BY countryCode 
                        ORDER BY count DESC 
                        LIMIT 10`,
                    [req.session.user.id], function(err, countryStats) {
                        
                        if (err) countryStats = [];

                        db.all(`SELECT device, browser, os, COUNT(*) as count 
                                FROM click_logs 
                                WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                AND isBot = 0 
                                AND device IS NOT NULL 
                                GROUP BY device, browser, os 
                                ORDER BY count DESC`,
                            [req.session.user.id], function(err, deviceStats) {
                                
                                if (err) deviceStats = [];

                                db.get(`SELECT COUNT(*) as count FROM click_logs 
                                        WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                        AND isBot = 1`,
                                    [req.session.user.id], function(err, botResult) {
                                        var botClicks = botResult ? botResult.count : 0;

                                        db.get(`SELECT COUNT(*) as count FROM click_logs 
                                                WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                AND isBot = 0`,
                                            [req.session.user.id], function(err, realResult) {
                                                var realClicks = realResult ? realResult.count : 0;
                                                var total = realClicks + botClicks;
                                                var clickRate = total > 0 ? Math.round((realClicks / total) * 100) : 100;

                                                var weekData = [0,0,0,0,0,0,0];

                                                try {
                                                    res.render('index', {
                                                        page: 'dashboard',
                                                        user: req.session.user,
                                                        userData: userData,
                                                        links: linksWithUrl,
                                                        totalClicks: totalClicks,
                                                        onlineUsers: count,
                                                        onlineUserList: users,
                                                        countries: COUNTRIES,
                                                        error: null,
                                                        success: null,
                                                        info: null,
                                                        shortUrl: null,
                                                        todayClicks: 0,
                                                        weekClicks: 0,
                                                        monthClicks: 0,
                                                        botClicks: botClicks,
                                                        realClicks: realClicks,
                                                        clickRate: clickRate,
                                                        topLink: null,
                                                        weekData: weekData,
                                                        countryStats: countryStats || [],
                                                        cityStats: [],
                                                        deviceStats: deviceStats || [],
                                                        browserStats: [],
                                                        osStats: []
                                                    });
                                                } catch (renderErr) {
                                                    console.error('Dashboard render error:', renderErr);
                                                    res.status(500).send('Dashboard loading error. Please try again.');
                                                }
                                            });
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
    var title = req.body.title || '';
    var description = req.body.description || '';
    var password = req.body.password || '';
    var expiresIn = req.body.expiresIn || '';
    
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

        var hashedPassword = password ? crypto.createHash('sha256').update(password).digest('hex') : null;
        
        db.run('INSERT INTO links (shortCode, originalUrl, userId, title, description, password, expiresAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [shortCode, originalUrl, req.session.user.id, 
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
app.get('/:shortCode', async function(req, res) {
    var shortCode = req.params.shortCode;
    
    var routes = ['login', 'dashboard', 'logout', 'shorten', 'update-link', 'delete-link', 
                  'api', 'signup', 'favicon.ico', 'qr'];
    
    if (routes.indexOf(shortCode) !== -1) {
        return res.redirect('/');
    }

    var userAgent = req.headers['user-agent'] || '';
    var ip = req.ip || req.connection.remoteAddress || 'unknown';
    var referer = req.headers['referer'] || '';

    db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], function(err, link) {
        if (err || !link) {
            return res.status(404).send('Link not found');
        }

        if (!link.isActive) {
            return res.status(410).send('This link has been deactivated');
        }

        if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
            return res.status(410).send('This link has expired');
        }

        var botDetected = isBot(userAgent);
        var deviceInfo = detectDeviceInfo(userAgent);

        db.run('UPDATE links SET clicks = clicks + 1 WHERE id = ?', [link.id], function(err) {
            if (err) {
                console.error('❌ Click count error:', err);
            }
            
            getLocationFromIP(ip).then(function(geoData) {
                db.run('INSERT INTO click_logs (linkId, ip, userAgent, referer, country, countryCode, city, device, browser, os, isBot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [link.id, ip, userAgent, referer, geoData.country, geoData.countryCode, 
                     geoData.city, deviceInfo.device, deviceInfo.browser, deviceInfo.os, botDetected ? 1 : 0],
                    function(err) {
                        if (err) {
                            console.error('❌ Click log error:', err);
                        }
                        res.redirect(link.originalUrl);
                    });
            }).catch(function() {
                db.run('INSERT INTO click_logs (linkId, ip, userAgent, referer, device, browser, os, isBot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [link.id, ip, userAgent, referer, deviceInfo.device, deviceInfo.browser, deviceInfo.os, botDetected ? 1 : 0],
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
    db.all('SELECT display_name, username FROM users WHERE isOnline = 1', function(err, users) {
        if (err) {
            return res.json({ count: 0, users: [] });
        }
        var formattedUsers = [];
        if (users) {
            for (var i = 0; i < users.length; i++) {
                formattedUsers.push({
                    name: users[i].display_name || users[i].username || 'User'
                });
            }
        }
        res.json({
            count: formattedUsers.length,
            users: formattedUsers
        });
    });
});

// ============================================================
// ERROR HANDLER
// ============================================================
app.use(function(err, req, res, next) {
    console.error('❌ Server Error:', err.message);
    console.error(err.stack);
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
