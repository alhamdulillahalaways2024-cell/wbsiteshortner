// server.js - With City Detection
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

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

// Create tables with indexes
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegramId TEXT UNIQUE,
        name TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
        isOnline INTEGER DEFAULT 0,
        isValidated INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortCode TEXT UNIQUE,
        originalUrl TEXT,
        userId INTEGER,
        clicks INTEGER DEFAULT 0,
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
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        isBot INTEGER DEFAULT 0,
        FOREIGN KEY(linkId) REFERENCES links(id)
    )`);

    // Indexes
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_telegramId ON users(telegramId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_isOnline ON users(isOnline)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_userId ON links(userId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_shortCode ON links(shortCode)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_createdAt ON links(createdAt)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_user_created ON links(userId, createdAt)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_click_logs_linkId ON click_logs(linkId)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_click_logs_timestamp ON click_logs(timestamp)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_click_logs_country ON click_logs(countryCode)`);
    
    console.log('✅ Database tables and indexes created successfully');
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

// ============ MAKE BASE_URL AVAILABLE ============
app.use((req, res, next) => {
    res.locals.BASE_URL = BASE_URL;
    res.locals.user = req.session.user || null;
    res.locals.page = req.path === '/' ? 'home' : req.path.slice(1);
    
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

// ============ GET COUNTRY & CITY FROM IP ============
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
    const { telegramId, username } = req.body;
    
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
            db.run('UPDATE users SET name = ?, lastSeen = CURRENT_TIMESTAMP, isOnline = 1, isValidated = 1 WHERE id = ?', 
                [finalName, user.id], (err) => {
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
            db.run('INSERT INTO users (telegramId, name, isOnline, isValidated) VALUES (?, ?, 1, 1)',
                [cleanTelegramId, finalName], function(err) {
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
// DASHBOARD WITH ANALYTICS & LOCATION DATA
// ============================================================
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    db.run('UPDATE users SET isOnline = 1, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', 
        [req.session.user.id]);

    db.all('SELECT * FROM links WHERE userId = ? ORDER BY createdAt DESC', 
        [req.session.user.id], (err, links) => {
            if (err) {
                return res.redirect('/');
            }

            const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
            
            const linksWithUrl = links.map(link => ({
                id: link.id,
                shortCode: link.shortCode,
                originalUrl: link.originalUrl,
                clicks: link.clicks,
                createdAt: link.createdAt,
                shortUrl: `${BASE_URL}/${link.shortCode}`
            }));

            // ===== Get Country Stats =====
            db.all(`SELECT 
                        country,
                        countryCode,
                        COUNT(*) as count 
                    FROM click_logs 
                    WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                    AND isBot = 0
                    GROUP BY countryCode 
                    ORDER BY count DESC 
                    LIMIT 10`,
                [req.session.user.id], (err, countryStats) => {
                    
                    // ===== Get City Stats =====
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
                        [req.session.user.id], (err, cityStats) => {
                            
                            // ===== Get Today's Clicks =====
                            db.get(`SELECT COUNT(*) as count FROM click_logs 
                                    WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                    AND timestamp >= datetime('now', '-1 day')
                                    AND isBot = 0`, 
                                [req.session.user.id], (err, todayResult) => {
                                    const todayClicks = todayResult ? todayResult.count : 0;

                                    // ===== Get Week's Clicks =====
                                    db.get(`SELECT COUNT(*) as count FROM click_logs 
                                            WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                            AND timestamp >= datetime('now', '-7 days')
                                            AND isBot = 0`, 
                                        [req.session.user.id], (err, weekResult) => {
                                            const weekClicks = weekResult ? weekResult.count : 0;

                                            // ===== Get Bot Clicks =====
                                            db.get(`SELECT COUNT(*) as count FROM click_logs 
                                                    WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                    AND isBot = 1`, 
                                                [req.session.user.id], (err, botResult) => {
                                                    const botClicks = botResult ? botResult.count : 0;

                                                    // ===== Get Real Clicks =====
                                                    db.get(`SELECT COUNT(*) as count FROM click_logs 
                                                            WHERE linkId IN (SELECT id FROM links WHERE userId = ?) 
                                                            AND isBot = 0`, 
                                                        [req.session.user.id], (err, realResult) => {
                                                            const realClicks = realResult ? realResult.count : 0;

                                                            // ===== Get Top Link =====
                                                            db.get(`SELECT shortCode, clicks FROM links 
                                                                    WHERE userId = ? 
                                                                    ORDER BY clicks DESC LIMIT 1`, 
                                                                [req.session.user.id], (err, topLink) => {
                                                                    
                                                                    const total = realClicks + botClicks;
                                                                    const clickRate = total > 0 ? Math.round((realClicks / total) * 100) : 100;

                                                                    // ===== Get Weekly Data =====
                                                                    const weekDays = [];
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
                                                                                [req.session.user.id, date],
                                                                                (err, result) => {
                                                                                    resolve(result ? result.count : 0);
                                                                                });
                                                                        });
                                                                    });

                                                                    Promise.all(weekDataPromises).then((weekData) => {
                                                                        getOnlineUsers((count, users) => {
                                                                            res.render('index', {
                                                                                page: 'dashboard',
                                                                                user: req.session.user,
                                                                                links: linksWithUrl,
                                                                                totalClicks: totalClicks,
                                                                                onlineUsers: count,
                                                                                onlineUserList: users,
                                                                                error: null,
                                                                                success: null,
                                                                                info: null,
                                                                                shortUrl: null,
                                                                                todayClicks: todayClicks,
                                                                                weekClicks: weekClicks,
                                                                                botClicks: botClicks,
                                                                                realClicks: realClicks,
                                                                                clickRate: clickRate,
                                                                                topLink: topLink,
                                                                                weekData: weekData,
                                                                                countryStats: countryStats || [],
                                                                                cityStats: cityStats || []
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

// Shorten Link
app.post('/shorten', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { originalUrl, customSlug } = req.body;
    
    if (!originalUrl) {
        return res.redirect('/dashboard?error=Please provide a URL');
    }

    let shortCode = customSlug || generateShortCode();

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

        db.run('INSERT INTO links (shortCode, originalUrl, userId) VALUES (?, ?, ?)',
            [shortCode, originalUrl, req.session.user.id], function(err) {
                if (err) {
                    return res.redirect('/dashboard?error=Failed to create link');
                }

                res.redirect('/dashboard?success=' + encodeURIComponent('Link created successfully!'));
            });
    });
});

// ============================================================
// REDIRECT WITH BOT DETECTION + LOCATION TRACKING
// ============================================================
app.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    
    const routes = ['login', 'dashboard', 'logout', 'shorten', 'update-link', 'delete-link', 'api', 'signup', 'favicon.ico'];
    if (routes.includes(shortCode)) {
        return res.redirect('/');
    }

    const userAgent = req.headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const referer = req.headers['referer'] || '';

    // Check if it's a social media crawler
    const isSocialCrawler = userAgent.includes('facebookexternalhit') || 
                            userAgent.includes('Facebot') ||
                            userAgent.includes('Twitterbot') ||
                            userAgent.includes('WhatsApp') ||
                            userAgent.includes('TelegramBot');

    if (isSocialCrawler) {
        db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], (err, link) => {
            if (err || !link) {
                return res.status(404).send('Link not found');
            }
            
            return res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${link.shortCode} - This Person Is brand Shortlink</title>
                    <meta property="og:title" content="This Person Is brand Shortlink" />
                    <meta property="og:description" content="Short link: ${BASE_URL}/${link.shortCode} → ${link.originalUrl}" />
                    <meta property="og:type" content="website" />
                    <meta property="og:url" content="${BASE_URL}/${link.shortCode}" />
                    <meta property="og:image" content="https://img.icons8.com/fluency/96/000000/link.png" />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content="This Person Is brand Shortlink" />
                    <meta name="twitter:description" content="Short link: ${BASE_URL}/${link.shortCode}" />
                    <meta http-equiv="refresh" content="0; url=${link.originalUrl}" />
                </head>
                <body>
                    <p>Redirecting to <a href="${link.originalUrl}">${link.originalUrl}</a></p>
                </body>
                </html>
            `);
        });
        return;
    }

    const botDetected = isBot(userAgent, ip, req);
    
    db.get('SELECT * FROM links WHERE shortCode = ?', [shortCode], (err, link) => {
        if (err || !link) {
            return res.status(404).send('Link not found');
        }

        // ===== Get Location from IP =====
        getLocationFromIP(ip).then((geoData) => {
            if (botDetected) {
                db.run('INSERT INTO click_logs (linkId, ip, userAgent, referer, country, countryCode, city, isBot) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
                    [link.id, ip, userAgent, referer, geoData.country, geoData.countryCode, geoData.city]);
                return res.redirect(link.originalUrl);
            }

            if (!checkRateLimit(ip, link.id)) {
                return res.redirect(link.originalUrl);
            }

            db.run('UPDATE links SET clicks = clicks + 1 WHERE id = ?', [link.id], (err) => {
                if (err) {
                    console.error('❌ Click count error:', err);
                }
                
                db.run('INSERT INTO click_logs (linkId, ip, userAgent, referer, country, countryCode, city, isBot) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
                    [link.id, ip, userAgent, referer, geoData.country, geoData.countryCode, geoData.city]);

                res.redirect(link.originalUrl);
            });
        }).catch(() => {
            // Fallback if geo lookup fails
            if (botDetected) {
                db.run('INSERT INTO click_logs (linkId, ip, userAgent, referer, country, countryCode, isBot) VALUES (?, ?, ?, ?, ?, ?, 1)',
                    [link.id, ip, userAgent, referer, 'Unknown', 'XX']);
                return res.redirect(link.originalUrl);
            }

            if (!checkRateLimit(ip, link.id)) {
                return res.redirect(link.originalUrl);
            }

            db.run('UPDATE links SET clicks = clicks + 1 WHERE id = ?', [link.id], (err) => {
                db.run('INSERT INTO click_logs (linkId, ip, userAgent, referer, country, countryCode, isBot) VALUES (?, ?, ?, ?, ?, ?, 0)',
                    [link.id, ip, userAgent, referer, 'Unknown', 'XX']);
                res.redirect(link.originalUrl);
            });
        });
    });
});

// Update Link
app.post('/update-link/:id', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const { newUrl } = req.body;
    
    if (!newUrl) {
        return res.redirect('/dashboard?error=Please provide a new URL');
    }

    db.run('UPDATE links SET originalUrl = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?',
        [newUrl, req.params.id, req.session.user.id], (err) => {
            if (err) {
                return res.redirect('/dashboard?error=Update failed');
            }
            res.redirect('/dashboard?success=Link updated successfully!');
        });
});

// Delete Link
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

// API - Online users
app.get('/api/online-users', (req, res) => {
    db.all('SELECT name FROM users WHERE isOnline = 1', (err, users) => {
        res.json({
            count: users ? users.length : 0,
            users: users || []
        });
    });
});

// API - Click stats
app.get('/api/click-stats', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    db.all(`SELECT 
        l.shortCode,
        l.clicks,
        COUNT(cl.id) as totalClicks,
        SUM(CASE WHEN cl.isBot = 1 THEN 1 ELSE 0 END) as botClicks,
        SUM(CASE WHEN cl.isBot = 0 THEN 1 ELSE 0 END) as realClicks
        FROM links l
        LEFT JOIN click_logs cl ON l.id = cl.linkId
        WHERE l.userId = ?
        GROUP BY l.id`, 
        [req.session.user.id], (err, results) => {
            if (err) {
                return res.json({ error: err.message });
            }
            res.json({ stats: results });
        });
});

// API - Location stats
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
    console.log(`✅ Ready to use!`);
});
