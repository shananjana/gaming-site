# Game Service

The game service handles all game-related operations, such as listing games, categories, and search functionality.

## Tech Stack

- Node.js
- Express.js
- JSON for storing game metadata
- ESLint for code linting

## Running Locally

```bash
npm install
npm start
```

## Docker

```bash
docker build -t lugx-game-service .
docker run -p 5001:5001 lugx-game-service
```

## Linting

```bash
npx eslint .
```

## CI/CD

- GitHub Actions workflow triggers on changes to `game-service/`
- Lints code, builds Docker image, and pushes to DockerHub
