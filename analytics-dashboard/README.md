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
docker build -t lugx-analytic-dashboard .
docker run -p 8081:8081 lugx-analytic-dashboard
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
