#!/bin/bash

# Build script for GPT Webhook Server

echo "🔧 Building GPT Webhook Server..."

# Clean previous build
echo "📁 Cleaning previous build..."
npm run clean

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Verify build
if [ -f "dist/index.js" ]; then
    echo "✅ Build successful! Output in dist/"
    echo "📋 To run: npm start"
    echo "🐳 To build Docker: docker build -t gpt-webhook-server ."
else
    echo "❌ Build failed!"
    exit 1
fi