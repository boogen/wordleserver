# Docker Build and Versioning Strategy

This project uses GitHub Actions to automatically build and publish Docker images to the GitHub Container Registry (GHCR).

## Branch Strategy

The build process is controlled by the `.github/workflows/docker-publish.yml` file. Currently, it is configured to:

- **Build and Push**: Triggered on every push to `main` or `master` branches.
- **Build only (No Push)**: Triggered on every Pull Request to `main` or `master` to verify the build passes.
- **Release builds**: Triggered whenever a tag starting with `v` is pushed (e.g., `v1.0.0`).

### Modifying Branches
To change which branches trigger a build, edit the `on.push.branches` section in the workflow file.

## Versioning and Branch Tags

The Docker image is tagged automatically based on the branch it was built from:

- **RC Branch**: `ghcr.io/boogen/wordleserver:rc`
- **Main Branch**: `ghcr.io/boogen/wordleserver:main` (or `master`)
- **Specific Versions**: `ghcr.io/boogen/wordleserver:v1.0.0` (when using Git tags)

### Recommended Portainer Image Tag
For your Release Candidate environment, use:
`image: ghcr.io/boogen/wordleserver:rc`

This ensures you always get the latest code from the `rc` branch without accidentally pulling experimental code or older stable releases.

### How to Create a Release
1.  Ensure your code is merged into `main`.
2.  Create a tag: `git tag -a v1.0.0 -m "Release version 1.0.0"`
3.  Push the tag: `git push origin v1.0.0`
4.  The action will automatically build and publish the image with the version tag.

## Deployment with Portainer

To deploy this project using Portainer Stacks:

1.  **Add GHCR Registry**:
    -   Go to **Registries** > **Add registry** > **Custom**.
    -   URL: `ghcr.io`
    -   Username: Your GitHub username.
    -   Password: A GitHub Personal Access Token (PAT) with `read:packages` permissions.

2.  **Create Stack**:
    -   Use the `docker-compose.yml` content but replace the `build:` section in `wordle_prod` with:
        `image: ghcr.io/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME:latest`
    -   Add all required environment variables in the Portainer "Environment variables" section.

3.  **Data Upload**:
    -   To run the data loader in Portainer, you can temporarily change the stack to run the `model` service or run it via the console on the server.

## Environment Variables
The application expects standard environment variables to be provided at runtime.

### Database Configuration
To connect to external databases on production, set the following environment variables in your `.env` or deployment environment:

- `MONGO_HOST`: Hostname of your external MongoDB (defaults to `mongo_wordle` if using internal container).
- `MARIADB_HOST`: Hostname of your external MariaDB (defaults to `stats_db` if using internal container).
- `STATS_DB_USER`, `STATS_DB_PASSWORD`, `STATS_DB_NAME`: Credentials for MariaDB.

If these are set to external addresses, you can stop the internal `mongo` and `mariadb` services.

### Other variables
- `PORT`: Port the API listens on (default 5000).
- `ONE_SIGNAL_API_KEY`, `GEMINI_API_KEY`: API keys for external services.

