/**
 * d4rk_livemap – routes/auth.js
 * Discord OAuth2: Login, Callback, Logout
 */

const express = require('express');
const fetch   = require('node-fetch');
const router  = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';

// ── Hilfsfunktionen ──────────────────────────────────────────

function getOAuthURL() {
    const hasRoles = process.env.DISCORD_REQUIRED_ROLES &&
                     process.env.DISCORD_REQUIRED_ROLES.trim() !== '';

    const scopes = hasRoles
        ? 'identify guilds.members.read'
        : 'identify guilds';

    const params = new URLSearchParams({
        client_id:     process.env.DISCORD_CLIENT_ID,
        redirect_uri:  process.env.DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope:         scopes,
        prompt:        'none',
    });

    return `https://discord.com/api/oauth2/authorize?${params}`;
}

function getRequiredRoles() {
    const raw = process.env.DISCORD_REQUIRED_ROLES || '';
    return raw.split(',').map(r => r.trim()).filter(Boolean);
}

// ── Routen ───────────────────────────────────────────────────

// GET /auth/login → Weiterleitung zu Discord
router.get('/login', (req, res) => {
    res.redirect(getOAuthURL());
});

// GET /auth/callback → Discord Callback verarbeiten
router.get('/callback', async (req, res) => {
    const { code, error } = req.query;
    const FE = process.env.FRONTEND_URL || 'http://localhost:3001';

    if (error || !code) {
        return res.redirect(FE + '/login.html?error=no_code');
    }

    try {
        // ── Step 1: Code → Access Token ───────────────────
        const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id:     process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type:    'authorization_code',
                code,
                redirect_uri:  process.env.DISCORD_REDIRECT_URI,
            }),
        });

        if (!tokenRes.ok) {
            const body = await tokenRes.text();
            console.error('[Auth] Token-Fehler:', tokenRes.status, body);
            return res.redirect(FE + '/login.html?error=token_error');
        }

        const tokenData = await tokenRes.json();
        const at = tokenData.access_token;

        // ── Step 2: Nutzer-Info ────────────────────────────
        const userRes = await fetch(`${DISCORD_API}/users/@me`, {
            headers: { Authorization: `Bearer ${at}` },
        });

        if (!userRes.ok) return res.redirect(FE + '/login.html?error=user_error');

        const user = await userRes.json();
        if (!user || !user.id) return res.redirect(FE + '/login.html?error=user_error');

        // ── Step 3: Guild + Rollen prüfen ─────────────────
        const requiredRoles = getRequiredRoles();

        if (requiredRoles.length > 0) {
            // guilds.members.read → Rollen lesen (Bot im Server nötig)
            const memberRes = await fetch(
                `${DISCORD_API}/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`,
                { headers: { Authorization: `Bearer ${at}` } }
            );

            if (!memberRes.ok) {
                console.warn('[Auth] Nicht im Guild:', user.username, memberRes.status);
                return res.redirect(FE + '/login.html?error=not_in_guild');
            }

            const member = await memberRes.json();
            const hasRole = requiredRoles.some(r => member.roles?.includes(r));

            if (!hasRole) {
                console.warn('[Auth] Rolle fehlt für:', user.username);
                return res.redirect(FE + '/login.html?error=no_role');
            }
        } else {
            // Nur guilds-Scope → Guild-Mitgliedschaft reicht
            const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
                headers: { Authorization: `Bearer ${at}` },
            });

            if (!guildsRes.ok) return res.redirect(FE + '/login.html?error=user_error');

            const guilds    = await guildsRes.json();
            const inGuild   = guilds.some(g => g.id === process.env.DISCORD_GUILD_ID);

            if (!inGuild) {
                console.warn('[Auth] Nicht im Guild:', user.username);
                return res.redirect(FE + '/login.html?error=not_in_guild');
            }
        }

        // ── Step 4: Session anlegen ────────────────────────
        const displayName = user.global_name || user.username;
        const avatar      = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
            : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(user.id) % 5n)}.png`;

        req.session.user = {
            userId:   user.id,
            username: displayName,
            avatar,
            loginAt:  Date.now(),
        };

        console.log(`[Auth] ✓ Login: ${displayName} (${user.id})`);

        // Zur Frontend-URL weiterleiten nach erfolgreichem Login
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        res.redirect(frontendUrl);

    } catch (err) {
        console.error('[Auth] Unbekannter Fehler:', err);
        res.redirect(FE + '/login.html?error=unknown');
    }
});

// GET /auth/logout → Session löschen
router.get('/logout', (req, res) => {
    const name = req.session?.user?.username || '?';
    req.session.destroy(() => {
        console.log(`[Auth] Logout: ${name}`);
        res.redirect((process.env.FRONTEND_URL || 'http://localhost:3001') + '/login.html');
    });
});

// GET /auth/me → Aktuelle Session-Info (für Frontend)
router.get('/me', (req, res) => {
    if (!req.session?.user) {
        return res.status(401).json({ authenticated: false });
    }
    res.json({
        authenticated: true,
        user:          req.session.user,
    });
});

module.exports = router;