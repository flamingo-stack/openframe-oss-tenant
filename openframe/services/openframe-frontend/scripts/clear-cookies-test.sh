#!/bin/bash

echo "🧹 Clearing browser cookies and testing login..."

# Clear Chrome cookies for localhost (macOS)
echo "1️⃣ Clearing Chrome cookies..."
rm -f ~/Library/Application\ Support/Google/Chrome/Default/Cookies*
rm -f ~/Library/Application\ Support/Google/Chrome/Default/Local\ Storage/leveldb/*localhost*

# Clear Safari cookies for localhost (macOS)
echo "2️⃣ Clearing Safari cookies..."
rm -f ~/Library/Cookies/Cookies.binarycookies

# Test the API endpoint
echo "3️⃣ Testing API endpoint..."
curl -I http://localhost/api/oauth/me 2>/dev/null | head -n 5

echo "4️⃣ Testing SSO providers endpoint..."
curl -s http://localhost/api/sso/providers | jq . 2>/dev/null || echo "Failed to fetch SSO providers"

echo "✅ Done! You can now open http://localhost:4000 in a fresh browser session"
echo "💡 Tip: Use incognito/private mode to ensure no cookies are cached"