# 🚀 Deployment Guide — omnitax-engines v0.2.0

**HTTP API deployment for production, staging, and local development.**

---

## 📋 Prerequisites

- Node.js 18+ (or 22+ for built-in SQLite support)
- Docker (optional, for containerized deployment)
- npm 8+

---

## 🏠 Local Development

### Quick Start (3 commands)

```bash
# 1. Install
npm install

# 2. Run tests
npm test

# 3. Start API server
node examples/api-server.js
```

**Output:**
```
✅ omnitax-engines API server running on http://localhost:3000
```

**Test the API:**
```bash
curl http://localhost:3000/

curl -X POST http://localhost:3000/api/v1/math/calculate-breakdown \
  -H "Content-Type: application/json" \
  -d '{"baseHt": "1000", "taxRatePct": 22, "currency": "EUR"}'

# With sandbox authentication
curl http://localhost:3000/api/v1/audit/verify-chain \
  -H "X-API-Key: vm_test_anything"
```

---

## 🐳 Docker (Single Container)

### Build & Run

```bash
# Build image
docker build -t omnitax-engines:latest .

# Run container
docker run -p 3000:3000 omnitax-engines:latest

# Or with environment overrides
docker run \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  omnitax-engines:latest
```

### Docker Compose

```bash
# Start stack
docker-compose up

# Background
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## ☁️ AWS Lambda (Serverless)

### Prerequisites
- AWS CLI configured
- Node.js 18 runtime
- IAM role with `AWSLambdaBasicExecutionRole`

### Package for Lambda

```bash
# Install production deps only
npm ci --only=production

# Create function payload
zip -r function.zip \
  index.js \
  engines/ \
  examples/api-server.js \
  node_modules/

# Upload
aws lambda create-function \
  --function-name omnitax-engines-api \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-role \
  --handler examples/api-server.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 512 \
  --environment Variables={NODE_ENV=production}
```

### API Gateway Integration

```bash
# Create HTTP API
aws apigatewayv2 create-api \
  --name omnitax-engines-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:region:account:function:omnitax-engines-api
```

---

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` or `production` |
| `PORT` | `3000` | HTTP port to listen on |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |

### Example (Production)

```bash
NODE_ENV=production PORT=8080 node examples/api-server.js
```

---

## 🔐 Authentication (Sandbox)

The API server supports three auth methods:

### 1. API Key (X-API-Key Header)

```bash
curl -H "X-API-Key: vm_test_anything" \
  http://localhost:3000/api/v1/audit/verify-chain
```

**Sandbox prefix:** `vm_test_`  
**Resolves to:** `sandbox_<SHA256_hash>`

### 2. Bearer Token

```bash
curl -H "Authorization: Bearer vm_test_anything" \
  http://localhost:3000/api/v1/audit/verify-chain
```

### 3. Anonymous (Stateless Endpoints Only)

```bash
curl http://localhost:3000/api/v1/math/calculate-breakdown \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"baseHt": "1000", "taxRatePct": 22}'
```

**Note:** Stateful endpoints (`/audit/seal`, `/audit/verify-chain`) require authentication (return 401 if anonymous).

---

## 📊 Endpoints

### Health Check
```
GET /api/v1/health
```
Returns: service status, version, environment, engines list.

### Calculate Breakdown
```
POST /api/v1/math/calculate-breakdown
```
**Body:**
```json
{
  "baseHt": "1000.00",
  "taxRatePct": 22,
  "currency": "EUR",
  "stampDuty": 0,
  "withholdingRatePct": 0
}
```

### Validate XML
```
POST /api/v1/validate/xml
```
**Body:**
```json
{
  "xml": "<FatturaElettronica>...</FatturaElettronica>",
  "schemaType": "auto",
  "country": "auto"
}
```

### Sandbox Gateway Simulation
```
POST /api/v1/sandbox/clear
```
**Body:**
```json
{
  "country": "IT",
  "documentContent": "<FatturaElettronica>...</FatturaElettronica>",
  "documentFormat": "xml"
}
```

### Audit: Seal Document
```
POST /api/v1/audit/seal
```
**Auth Required:** X-API-Key or Bearer  
**Body:**
```json
{
  "documentId": "INV-2026-001",
  "eventType": "DOCUMENT_CLEARED",
  "payload": { "amount": 1000, "currency": "EUR" },
  "jurisdiction": "IT"
}
```

### Audit: Verify Chain
```
GET /api/v1/audit/verify-chain
```
**Auth Required:** X-API-Key or Bearer

---

## 🧪 Testing

### Unit Tests (Included)

```bash
npm test
```

**Output:** 24/24 engines tests pass

### Integration Test (cURL)

```bash
#!/bin/bash
BASE_URL="http://localhost:3000"
KEY="vm_test_test"

# 1. Health
echo "1. Health check..."
curl -s $BASE_URL/api/v1/health | jq '.service'

# 2. Calculate
echo "2. Calculate tax..."
curl -s -X POST $BASE_URL/api/v1/math/calculate-breakdown \
  -H "Content-Type: application/json" \
  -d '{"baseHt": "1000", "taxRatePct": 22}' | jq '.result'

# 3. Seal document
echo "3. Seal document..."
curl -s -X POST $BASE_URL/api/v1/audit/seal \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"documentId": "TEST-001"}' | jq '.sealed'

# 4. Verify chain
echo "4. Verify chain..."
curl -s "$BASE_URL/api/v1/audit/verify-chain" \
  -H "X-API-Key: $KEY" | jq '.count'
```

---

## 📈 Production Checklist

- [ ] Environment variables set (NODE_ENV, PORT)
- [ ] SSL/TLS termination configured (reverse proxy or load balancer)
- [ ] Authentication enforced (API key validation in production)
- [ ] Persistent storage implemented (WORM chain → database)
- [ ] Logging aggregation configured (CloudWatch, Datadog, etc.)
- [ ] Monitoring alerts set up (health check, error rate)
- [ ] Rate limiting configured (if public API)
- [ ] CORS headers reviewed (only allow trusted origins)
- [ ] Tests passing (npm test)
- [ ] Load tested (expected throughput verified)

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use a different port
PORT=3001 node examples/api-server.js
```

### Docker Build Fails

```bash
# Clear cache
docker system prune -a

# Rebuild
docker build --no-cache -t omnitax-engines:latest .
```

### Health Check Failing

```bash
# Check logs
docker-compose logs omnitax-engines

# Test manually
curl http://localhost:3000/api/v1/health
```

---

## 📚 References

- **Repository:** https://github.com/elaka/omnitax-engines
- **npm:** https://npmjs.com/package/omnitax-engines
- **OpenAPI Spec:** `GET http://localhost:3000/api/v1/openapi.json` (upcoming)
- **Issues:** https://github.com/elaka/omnitax-engines/issues

---

**Deployment ready. Ship with confidence. 🚀**
