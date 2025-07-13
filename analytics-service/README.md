# Analytic Service

This service handles analytics for Lugx Gaming, such as tracking page views, game popularity, and click events.

## Tech Stack

- Node.js
- Express.js
- ESLint for code linting

## Running Locally

```bash
npm install
npm start
```

## Docker

```bash
docker build -t lugx-analytic-service .
docker run -p 5000:5000 lugx-analytic-service
```

## Linting

```bash
npx eslint .
```

## CI/CD

- GitHub Actions workflow runs:
  - Hadolint on Dockerfile
  - ESLint on JS files
  - Builds and pushes Docker image with git commit SHA
