```markdown
# 🎵 Kaizen Music Self‑Bot

A powerful self‑bot that lets you play music in Discord using your **own account**.  
No bot tokens – just your user token and a VPS.

> ⚠️ **DISCLAIMER**  
> This is a self‑bot and **violates Discord's Terms of Service**. Use at your own risk.  
> This project is for **educational purposes only**.

---

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `!play <song>` | Play a song (YouTube search or URL) |
| `!skip` | Skip current song |
| `!stop` | Stop and leave voice |
| `!queue` | Show upcoming songs |
| `!volume <0-200>` | Adjust volume |
| `!help` | Show this message |

All commands are sent from your account – the bot replies as you.

---

## 🖥️ Requirements

- A VPS with **Ubuntu 20.04/22.04** (1GB RAM minimum)
- **Node.js 18+** and **npm**
- Your **Discord user token** ([how to get it](#how-to-get-your-token))

---

## 🚀 Quick Setup

1. **Connect to your VPS** via SSH.
2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
   sudo apt install -y nodejs
```

1. Clone or upload this repository to your VPS.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a .env file with your token:
   ```
   TOKEN=your_discord_user_token_here
   ```
4. Start the bot:
   ```bash
   node index.js
   ```

For 24/7 operation, use pm2:

```bash
npm install -g pm2
pm2 start index.js --name music-bot
pm2 save
pm2 startup
```

---

🔍 How to Get Your Discord Token

1. Open Discord in your browser (or desktop with DevTools).
2. Press F12 → Network tab.
3. Send a message or perform any action.
4. Look for a request to https://discord.com/api/v9/....
5. In the request headers, find authorization – copy the entire string.

Never share your token – it gives full access to your account.

---

🤖 About Kaizen.bot

This music player is just one small part of the Kaizen.bot ecosystem.
The full bot offers many more features:

· Quest automation
· Server cloning (full, emojis, stickers)
· Account tools (unfriend all, purge DMs, account stats)
· Raid & spam tools
· Auto call
· Bio/status rotator
· Friend monitor
· And much more – all completely free!

👉 Join our community for updates, support, and the full Kaizen.bot:
https://discord.gg/mXafwDq2bx

---

⚙️ How It Works (Briefly)

The bot uses discord.js-selfbot-v13 to interact with Discord's gateway as a user. It captures voice connection data and sends it to a local Lavalink server (included and auto‑started) which streams audio to your voice channel. You don't need to configure anything – everything runs inside this folder.

---

🆘 Support

If you run into any issues, join the Discord server above. We're happy to help!

Enjoy the music! 🎶

```
