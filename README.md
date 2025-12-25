# Sentiment Analysis (Backend) ✅

**Short description:**
A small Express.js backend that fetches YouTube comments and analyzes sentiment using **AWS Comprehend** and the **YouTube Data API**. It provides endpoints to fetch comments and run single or batch sentiment analyses.

---

## Table of contents
- 🔧 Features
- ⚙️ Prerequisites
- 🚀 Install & Run
- 🔐 Environment variables
- 📦 API Endpoints & Examples
- 📝 Notes & TODOs
- 🛠 Troubleshooting
- 🤝 Contributing
- 📄 License

---

## 🔧 Features
- Fetch YouTube comments using the YouTube Data API
- Detect dominant language and sentiment with AWS Comprehend
- Batch sentiment analysis with key phrases extraction
- Returns sentiment distribution, example comments, keywords, and an overall score

---

## ⚙️ Prerequisites
- Node.js (v14+ recommended)
- npm
- AWS account with Comprehend access (and keys)
- Google Cloud/YouTube Data API key

---

## 🚀 Install & Run

1. Clone the repo and install:
```bash
git clone <repo-url>
cd sentiment-analysis-be
npm install
```

2. Create a `.env` file (see required vars below) and then start:
```bash
npm start
# runs: nodemon index.js
```

The server listens on `PORT` (default 3000).

---

## 🔐 Environment variables
Create a `.env` with at least:
- `GOOGLE_AUTH_KEY` — YouTube Data API key
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` — e.g., `us-east-1`
- `PORT` — optional

**⚠️ Important:** Before running the project, you must configure AWS credentials locally using the AWS CLI (for example, `aws configure`) so that the AWS SDK can find credentials. Support for supplying AWS credentials via environment variables will be added in a future update.

> Note: Some code uses `us-east-1` directly in one route — ensure `us-east-1` is available/accepted or change `AWS_REGION` usage as needed.

---

## 🔗 Front-end

This project has a front-end repository available here: https://github.com/NishantAsnani/sentiment-analysis-fe

---

## 📦 API Endpoints & Examples

All endpoints are mounted under `/api`.

1) POST /api/analyze-sentiment
- Purpose: Single sentiment detection — **current implementation analyzes the first element of the dummy comments array `seeders/data.js` (i.e., `data[0]`)**.
- Body: **none** (the route currently ignores the request body and uses the seeded sample text). To change the text analyzed, edit `seeders/data.js` or modify the route to accept a `text` or `url` parameter.
- Response:
```json
{ "sentiment": "POSITIVE|NEGATIVE|NEUTRAL|MIXED", "sentimentScore": { /* AWS SentimentScore */ } }
```
- Example curl:
```bash
curl -X POST http://localhost:3000/api/analyze-sentiment \
  -H "Content-Type: application/json"
```

2) POST /api/batch-analyze-sentiment
- Purpose: Fetch up to many comments, batch detect sentiment & key phrases, and return distribution + aggregated results
- Body:
```json
{ "url": "https://www.youtube.com/watch?v=<VIDEO_ID>" }
```
- Response shape:
```json
{
  "results": {
    "sentimentDistribution": [{ "name": "POSITIVE", "value": 10 }, ...],
    "overallSentiment": "POSITIVE",
    "overallScore": 7.8,
    "comments": { "positive":[...], "negative":[...], ... },
    "keywords": [{ "text": "topic", "value": 3 }, ...],
    "totalCount": 150
  }
}
```
- Example curl:
```bash
curl -X POST http://localhost:3000/api/batch-analyze-sentiment \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=VIDEO_ID"}'
```

3) GET /api/youtube-comments
- Purpose: Return raw comments fetched from YouTube
- Example:
```
GET /api/youtube-comments?url=https://www.youtube.com/watch?v=VIDEO_ID
```

---

## API Testing (Postman)

A Postman collection is provided in the `/postman` folder.

### Steps to use:
1. Import the collection file (`/postman/Sentiment Analysis.postman_collection.json`).
2. Import the environment file from `/postman` (if present) or create an environment.
3. Set `local` variable to `http://localhost:3000` (or `http://localhost:3000/api` if you prefer the base to include `/api`).

> **Note:** The provided Postman environment sample (`/postman/local.env.sample.json`) uses port **3000** by default. If you run the server on a different port, update the `local` value in Postman and in `postman/local.env.sample.json` to match your chosen `PORT` so the variables stay consistent.

---

## 📝 Notes & TODOs
- The file `seeders/data.js` contains sample comments. In `/api/analyze-sentiment` the code currently calls Comprehend on `data[0]` (sample text) — consider updating it to analyze the fetched comments or passed text parameter.
- Batch processing uses `BATCH_SIZE = 25` and filters comments > 4500 bytes per AWS limits.
- Sensitive keys should never be committed to source control.

---

## 🛠 Troubleshooting
- Missing `GOOGLE_AUTH_KEY`: You’ll get errors when fetching comments.
- Missing AWS creds or wrong region: Comprehend calls will fail.
- Invalid YouTube URL: The code extracts `v=` parameter; provide full URL with `?v=...`.

---

## 🤝 Contributing
- Open issues and PRs are welcome.
- Keep env keys out of commits. Add tests and usage examples when possible.
