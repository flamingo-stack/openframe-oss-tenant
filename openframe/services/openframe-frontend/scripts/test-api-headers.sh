#!/bin/bash

echo "🔍 Testing API with different header configurations..."

# Test 1: Direct API call with minimal headers
echo -e "\n1️⃣ Testing direct API call to /api/oauth/me..."
curl -v http://localhost/api/oauth/me 2>&1 | grep -E "(< HTTP|< |> Host:|> User-Agent:|> Accept:|Request Header)"

# Test 2: Test SSO providers endpoint
echo -e "\n2️⃣ Testing SSO providers endpoint..."
curl -v http://localhost/api/sso/providers 2>&1 | grep -E "(< HTTP|< |> Host:|> User-Agent:|> Accept:|Request Header)"

# Test 3: Test with credentials included
echo -e "\n3️⃣ Testing with credentials included..."
curl -v --include-cookies http://localhost/api/oauth/me 2>&1 | grep -E "(< HTTP|< |> Host:|> User-Agent:|> Accept:|> Cookie:|Request Header)"

# Test 4: Check gateway configuration
echo -e "\n4️⃣ Checking if request goes through gateway..."
curl -I http://localhost/api/oauth/me 2>&1 | head -n 10

echo -e "\n✅ Tests complete. Look for 'Request header is too large' errors above."