#!/bin/bash

set -e

echo "🚀 Installing Music Self‑Bot..."

# Update package list
apt update

# Install Java (if not present)
if ! command -v java &> /dev/null; then
    echo "📦 Installing Java..."
    apt install -y openjdk-17-jre-headless
fi

# Install Node.js (if not present)
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Install PM2 globally
npm install -g pm2

echo "✅ Installation complete."
echo "Next steps:"
echo "  1. Edit .env with your Discord token"
echo "  2. Run ./start.sh to launch everything"
