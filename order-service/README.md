# Order Service

Handles orders and cart functionality for Lugx Gaming. Supports cart management via sessions and PostgreSQL.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- ESLint for code linting

## Running Locally

```bash
npm install
npm start
```

Ensure your PostgreSQL database is running and accessible.

## Docker

```bash
docker build -t lugx-order-service .
docker run -p 5002:5002 lugx-order-service
```

## Linting

```bash
npx eslint .
```

## CI/CD

- GitHub Actions workflow triggers on changes to `order-service/`
- Runs Hadolint, ESLint, builds Docker image, and pushes to DockerHub
