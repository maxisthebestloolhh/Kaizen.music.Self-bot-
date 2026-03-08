require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const Lavalink = require('./lavalink');
const queueManager = require('./queue');

const client = new Client();

// === Configuration ===
const TOKEN = process.env.TOKEN;
const LAVALINK_HOST = process.env.LAVALINK_HOST || 'localhost';
const LAVALINK_PORT = process.env.LAVALINK_PORT || 2333;
const LAVALINK_PASSWORD = process.env.LAVALINK_PASSWORD || 'youshallnotpass';
const LAVALINK_SECURE = process.env.LAVALINK_SECURE === 'true';

// === Lavalink client ===
const lavalink = new Lavalink({
    restHost: `http${LAVALINK_SECURE ? 's' : ''}://${LAVALINK_HOST}:${LAVALINK_PORT}`,
    wsHost: `ws${LAVALINK_SECURE ? 's' : ''}://${LAVALINK_HOST}:${LAVALINK_PORT}`,
    password: LAVALINK_PASSWORD,
    clientName: 'MyMusicSelfbot'
});

// Store voice connection data per guild
const voiceConnections = new Map(); // guildId -> { sessionId, token, endpoint }

// === Discord ready event ===
client.on('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    lavalink.connect(client.user.id);
});

// === Lavalink events ===
lavalink.on('ready', (data) => {
    console.log('🔊 Lavalink ready, session:', data.sessionId);
});

lavalink.on('event', (data) => {
    console.log('Lavalink event:', data);
    // When track finishes, play next
    if (data.type === 'TrackEndEvent' && data.reason === 'FINISHED') {
        playNext(data.guildId);
    }
});

// === Raw gateway events – capture voice state and server updates ===
client.on('raw', (packet) => {
    if (packet.t === 'VOICE_STATE_UPDATE') {
        const { guild_id, session_id, user_id } = packet.d;
        if (user_id === client.user.id) {
            let conn = voiceConnections.get(guild_id) || {};
            conn.sessionId = session_id;
            voiceConnections.set(guild_id, conn);
        }
    } else if (packet.t === 'VOICE_SERVER_UPDATE') {
        const { guild_id, token, endpoint } = packet.d;
        let conn = voiceConnections.get(guild_id) || {};
        conn.token = token;
        conn.endpoint = endpoint;
        voiceConnections.set(guild_id, conn);
    }
});

// === Helper: get voice connection for a guild ===
function getVoiceConnection(guildId) {
    return voiceConnections.get(guildId);
}

// === Helper: play next track in queue ===
async function playNext(guildId) {
    const queue = queueManager.get(guildId);
    if (!queue) return;

    const nextTrack = queue.songs.shift();
    if (!nextTrack) {
        queue.nowPlaying = null;
        return;
    }

    queue.nowPlaying = nextTrack;
    const voice = getVoiceConnection(guildId);
    if (!voice || !voice.token || !voice.sessionId || !voice.endpoint) {
        console.error('Missing voice data for guild', guildId);
        return;
    }

    try {
        await lavalink.updatePlayer(guildId, nextTrack, {
            token: voice.token,
            sessionId: voice.sessionId,
            endpoint: voice.endpoint
        });
        if (queue.textChannel) {
            const channel = await client.channels.fetch(queue.textChannel).catch(() => null);
            if (channel) channel.send(`▶️ Now playing: **${nextTrack.info.title}**`);
        }
    } catch (err) {
        console.error('Failed to play track:', err);
    }
}

// === Message commands (self‑bot only) ===
client.on('messageCreate', async (message) => {
    if (message.author.id !== client.user.id) return; // only self

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // --- !play ---
    if (command === 'play') {
        const query = args.join(' ');
        if (!query) return message.reply('❌ Please provide a song name or URL.');

        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) return message.reply('❌ You are not in a voice channel.');

        // Join voice channel
        await voiceChannel.join().catch(err => {
            return message.reply(`❌ Failed to join voice: ${err.message}`);
        });

        // Wait a bit for voice server updates
        await new Promise(r => setTimeout(r, 1000));

        // Load tracks from Lavalink
        const res = await lavalink.loadTracks(`ytmsearch:${query}`).catch(err => {
            return message.reply(`❌ Search failed: ${err.message}`);
        });
        if (!res) return;

        let tracks = [];
        if (res.loadType === 'track' || res.loadType === 'search') {
            tracks = res.loadType === 'search' ? res.data : [res.data];
        } else {
            return message.reply('❌ No tracks found.');
        }

        const track = tracks[0];
        const queue = queueManager.get(message.guildId) || queueManager.create(message.guildId);
        queue.songs.push(track);
        queue.textChannel = message.channel.id;

        if (!queue.nowPlaying) {
            playNext(message.guildId);
            message.reply(`✅ Added to queue: **${track.info.title}** (now playing)`);
        } else {
            message.reply(`✅ Added to queue: **${track.info.title}**`);
        }
    }

    // --- !skip ---
    else if (command === 'skip') {
        const queue = queueManager.get(message.guildId);
        if (!queue || !queue.nowPlaying) return message.reply('❌ Nothing is playing.');
        // Stop current track to trigger TrackEndEvent
        await lavalink.updatePlayerProperties(message.guildId, { paused: true });
        playNext(message.guildId);
        message.reply('⏭️ Skipped.');
    }

    // --- !stop ---
    else if (command === 'stop') {
        const queue = queueManager.get(message.guildId);
        if (!queue || !queue.nowPlaying) return message.reply('❌ Nothing is playing.');
        queue.songs = [];
        queue.nowPlaying = null;
        await lavalink.destroyPlayer(message.guildId);
        message.member?.voice.channel?.leave();
        message.reply('⏹️ Stopped and left voice.');
    }

    // --- !queue ---
    else if (command === 'queue') {
        const queue = queueManager.get(message.guildId);
        if (!queue || (queue.songs.length === 0 && !queue.nowPlaying))
            return message.reply('📭 Queue is empty.');
        let msg = `**Now playing:** ${queue.nowPlaying?.info.title || 'None'}\n**Up next:**\n`;
        queue.songs.slice(0, 10).forEach((s, i) => msg += `${i+1}. ${s.info.title}\n`);
        message.reply(msg);
    }

    // --- !volume ---
    else if (command === 'volume') {
        const vol = parseInt(args[0]);
        if (isNaN(vol) || vol < 0 || vol > 200) return message.reply('❌ Volume must be 0-200.');
        const queue = queueManager.get(message.guildId);
        if (!queue || !queue.nowPlaying) return message.reply('❌ Nothing is playing.');
        await lavalink.updatePlayerProperties(message.guildId, { volume: vol });
        queue.volume = vol;
        message.reply(`🔊 Volume set to ${vol}%`);
    }

    // --- !help ---
    else if (command === 'help') {
        const helpMsg = `
**Music Self‑Bot Commands:**
!play <song> – Play a song (YouTube search or URL)
!skip – Skip current song
!stop – Stop and leave voice
!queue – Show current queue
!volume <0-200> – Set volume
!help – Show this message
        `;
        message.reply(helpMsg);
    }
});

// === Login ===
client.login(TOKEN).catch(err => {
    console.error('Login failed:', err);
});
