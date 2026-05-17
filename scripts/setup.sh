#!/bin/bash
set -e

echo "Setting up Eurasan OpenClaw integration environment..."

if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please edit .env with your actual credentials"
else
    echo ".env already exists, skipping..."
fi

if [ ! -d logs ]; then
    mkdir logs
    echo "Created logs directory"
fi

echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your Eurasan credentials"
echo "2. Run: openclaw run examples/login.sf --env .env"
echo "3. For testing: npm test"