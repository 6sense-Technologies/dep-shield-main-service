# Depshield Backend Documentation

Depshield is a powerful tool designed to analyze and monitor the security and integrity of your code repositories. Inspired by **Debricked**, it scans for vulnerabilities, dependency limitations, and potential security risks across different branches, ensuring a secure and optimized development workflow.

---

## Features

- **Dependency Analysis**: Identify and track dependencies within your project.
- **Vulnerability Scanning**: Detect security vulnerabilities and limitations in dependencies.
- **Branch Monitoring**: Scan and retrieve data from repositories efficiently.
- **Authentication & Security**: Utilizes Auth.js for authentication and Codecy for tracking code errors and duplication.
- **Comprehensive Testing**: Ensures reliability with Jest and Playwright.

---

## Branching Strategy

Depshield follows a structured branching strategy:

- **Test Branch**: Internal testing and debugging.
- **Beta Branch**: For client testing before release.
- **Development Branch**: Uses the naming convention `depshield-client-vX.00.00X`, where `X` changes with each iteration.

---

## Configuration

To configure the GitHub App credentials for the Depshield backend, set the following environment variables in your `.env` file:

```env
GITHUB_APP_ID=your_app_id
GITHUB_APP_CLIENT_ID=your_client_id
GITHUB_APP_CLIENT_SECRET=your_client_secret
GITHUB_PRIVATE_KEY=your_base64_encoded_private_key
```

### Step 1: Create a GitHub App

1. Navigate to **Settings** > **Developer settings** > **GitHub Apps** on GitHub.
2. Click **New GitHub App** and provide:
   - **GitHub App Name** (e.g., "Depshield App")
   - **Homepage URL** (your repository or website URL)
   - **Webhook URL** (optional)
   - **Permissions**: "Contents: Read-only" and "Metadata: Read-only"
3. Click **Create GitHub App** and copy the **App ID** (`GITHUB_APP_ID`).

### Step 2: Generate a Private Key

1. In the GitHub App settings, go to **Private keys**.
2. Click **Generate a private key** (downloads a `.pem` file).
3. Convert the `.pem` file to a base64 string:
   - **macOS/Linux**:
     ```bash
     base64 -i private-key.pem | tr -d '\n'
     ```
   - **Windows (PowerShell)**:
     ```powershell
     [Convert]::ToBase64String([IO.File]::ReadAllBytes("private-key.pem"))
     ```
4. Copy the output as `GITHUB_PRIVATE_KEY`.

### Step 3: Set Up OAuth for the GitHub App

1. In the GitHub App settings, enter your **User authorization callback URL** (e.g., `http://localhost:3000/api/auth/callback`).
2. Save changes and copy the **Client ID** (`GITHUB_APP_CLIENT_ID`).
3. Generate a **Client Secret** (`GITHUB_APP_CLIENT_SECRET`).

### Step 4: Add to `.env` File

Ensure all values are correctly set in your `.env` file as shown above.

---

## Technologies Used

- **Framework**: Nest.js
- **Code Quality Monitoring**: Codecy

---

## Getting Started

### Install Dependencies

Depshield uses Yarn as its package manager. If you don’t have Yarn installed, follow the [installation guide](https://classic.yarnpkg.com/lang/en/docs/install).

To install all dependencies, run:

```bash
yarn install
```

### Start the Development Server

```bash
yarn start:dev
```

Open [http://localhost:3000](http://localhost:3000) to access the application.

---

## Deployment

Depshield can be deployed on various platforms, including Vercel and Koyeb. Below are deployment steps for Vercel.

### Deploying with Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Log in to Vercel:
   ```bash
   vercel login
   ```
3. Navigate to your project directory and deploy:
   ```bash
   vercel
   ```
4. For production deployment:
   ```bash
   vercel --prod
   ```

### Deploying to Development and Preview Environments

- **Development Environment**:
  ```bash
  vercel --env development
  ```
- **Preview Deployment** (for testing branches before merging):
  ```bash
  vercel --pre
  ```

### Assigning a Custom Domain

1. Add your domain to Vercel:
   ```bash
   vercel domains add yourdomain.com
   ```
2. Update DNS settings as per Vercel’s instructions.
3. Set the domain for production:
   ```bash
   vercel alias yourdeploymenturl yourdomain.com
   ```
4. Verify the domain:
   ```bash
   vercel domains inspect yourdomain.com
   ```

### Logging Out of Vercel CLI

```bash
vercel logout
```

---

## Additional Resources

- [Nest.js Documentation](https://docs.nestjs.com) - Backend framework documentation.
- [GitHub App Documentation](https://docs.github.com/en/developers/apps/building-github-apps) - Guide on building GitHub Apps.
- [Vercel Documentation](https://vercel.com/docs) - Deployment and configuration guidance.

---

## Contributing

We welcome contributions! Please adhere to branch naming conventions and test all changes before submitting pull requests.

### Contribution Guidelines

1. Fork the repository.
2. Create a feature branch (e.g., `feature/new-feature`).
3. Commit changes with meaningful messages.
4. Run tests before submitting a pull request.
5. Submit a pull request for review.

---

## License

Depshield is an open-source project. See the LICENSE file for details.

---
