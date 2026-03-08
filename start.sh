#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
else
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

echo "🚀 Starting Lavalink server..."

# Download Lavalink if not already present
if [ ! -f Lavalink.jar ]; then
    echo "📥 Downloading Lavalink..."
    wget -q https://github.com/lavalink-devs/Lavalink/releases/download/4.0.8/Lavalink.jar
fi

# Create application.yml if it doesn't exist
if [ ! -f application.yml ]; then
    echo "📝 Creating application.yml..."
    cat > application.yml << 'EOF'
server:
  port: 2333
  address: 0.0.0.0

lavalink:
  server:
    password: "youshallnotpass"
    sources:
      youtube: true
      bandcamp: true
      soundcloud: true
      twitch: true
      vimeo: true
      http: true
      local: false
EOF
fi

# Start Lavalink with PM2
pm2 start java -- -jar Lavalink.jar --name lavalink

# Install Node dependencies (if needed)
npm install

# Start the bot with PM2
pm2 start index.js --name music-bot

# Save PM2 config so it restarts on reboot
pm2 save
pm2 startup

echo "✅ All services started. Use 'pm2 logs' to see output."
