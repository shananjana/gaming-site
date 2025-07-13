# Frontend Service

This is the static frontend of the Lugx Gaming site, built with HTML, CSS, and JavaScript.

## Features

- Responsive static layout
- Category-based game listings
- Game detail page support

## Running Locally

```bash
docker build -t lugx-frontend .
docker run -p 8080:80 lugx-frontend
```

Then visit: [http://localhost:8080](http://localhost:8080)

## Docker

The Dockerfile uses an Nginx base image to serve static content.

## CI/CD

- GitHub Actions workflow triggers on changes to the `frontend/` folder.
- Docker image is published to DockerHub with the current Git commit SHA.
