pipeline {
  agent { label 'docker-agent' }

  options {
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    GHCR_USER = '6sense-technologies'
    GHCR_REPO = 'dep-shield-main-service'
    SHORT_SHA = "${env.GIT_COMMIT.take(7)}"
    IMAGE_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}-${env.SHORT_SHA}".toLowerCase()
    DEPLOY_URL = 'https://depshield-api.6sensehq.com'
    INFISICAL_PATH = 'dep-shield-main-service'
  }

  stages {
    stage('📦 Checkout Source Code') {
      when {
        anyOf {
          branch 'main'
          branch 'master'
          // branch 'test'
        }
      }
      steps {
        script {
          def deployUrl = env.DEPLOY_URL
          def repo = getRepoFromGitUrl()
          env.DEPLOYMENT_ID = createAndUpdateGitHubDeployment(repo, env.GIT_COMMIT, env.BRANCH_NAME, (env.BRANCH_NAME == 'test') ? 'Preview' : 'Production', deployUrl)
          env.DEPLOY_URL = (env.BRANCH_NAME == 'test') ? 'https://depshield-test-api.6sensehq.com' : 'https://depshield-api.6sensehq.com'
        }
        checkout scm
      }
    }

    stage('🔨 Build Docker Image') {
      when {
        anyOf {
          branch 'main'
          branch 'master'
          // branch 'test'
        }
      }
      steps {
        sh "docker build -t ghcr.io/${GHCR_USER}/${GHCR_REPO}:${IMAGE_TAG} ."
      }
    }

    stage('📤 Push to GHCR') {
      when {
        anyOf {
          branch 'main'
          branch 'master'
          // branch 'test'
        }
      }
      steps {
        script {
          def deployUrl = env.DEPLOY_URL
          def repo = getRepoFromGitUrl()
          updateGitHubDeploymentStatus(repo, env.BUILD_URL, env.DEPLOYMENT_ID, 'in_progress', (env.BRANCH_NAME == 'test') ? 'Preview' : 'Production', env.DEPLOY_URL)
        }
        withCredentials([usernamePassword(credentialsId: 'github-pat-6sensehq', usernameVariable: 'GITHUB_USER', passwordVariable: 'GITHUB_PAT')]) {
          sh '''
            echo $GITHUB_PAT | docker login ghcr.io -u $GITHUB_USER --password-stdin
            docker push ghcr.io/${GHCR_USER}/${GHCR_REPO}:${IMAGE_TAG}
            docker image prune -f
            docker container prune -f
            docker volume prune -f
          '''
        }
      }
    }

    stage('🚀 Deploy to Server') {
      when {
        anyOf {
          branch 'main'
          branch 'master'
          // branch 'test'
        }
      }
      steps {
        script {
          def infisicalEnv = (env.BRANCH_NAME == 'test') ? 'dev' : 'prod'
          def deployDir = (env.BRANCH_NAME == 'test') ? "${env.GHCR_REPO}-test" : "${env.GHCR_REPO}-prod"
          def deployEnv = infisicalEnv
          def deployUrl = env.DEPLOY_URL
          def repo = getRepoFromGitUrl()

          updateGitHubDeploymentStatus(repo, env.BUILD_URL, env.DEPLOYMENT_ID, 'in_progress', (env.BRANCH_NAME == 'test') ? 'Preview' : 'Production', env.DEPLOY_URL)

          withInfisical(configuration: [
            infisicalCredentialId: '6835f2d1ccea8e1cb5ed81e2',
            infisicalEnvironmentSlug: infisicalEnv,
            infisicalProjectSlug: 'depshield-hq4-l',
            infisicalUrl: 'https://infisical.6sensehq.com'
          ],
          infisicalSecrets: [
            infisicalSecret(
              includeImports: true,
              path: "/${env.INFISICAL_PATH}",
              secretValues: [
                [infisicalKey: 'HOST_PORT'],
                [infisicalKey: 'MONGODB_URI'],
                [infisicalKey: 'GITHUB_APP_CLIENT_ID'],
                [infisicalKey: 'GITHUB_APP_ID'],
                [infisicalKey: 'GITHUB_PRIVATE_KEY'],
                [infisicalKey: 'EMAIL_SENDER'],
                [infisicalKey: 'EMAIL_SERVICE_PORT'],
                [infisicalKey: 'EMAIL_PASSWORD'],
                [infisicalKey: 'EMAIL_USERNAME'],
                [infisicalKey: 'EMAIL_HOST'],
                [infisicalKey: 'SALT_ROUND'],
                [infisicalKey: 'JWT_EXPIRE_REFRESH_TOKEN'],
                [infisicalKey: 'JWT_EXPIRE'],
                [infisicalKey: 'JWT_REFRESH_SECRET'],
                [infisicalKey: 'REDIS_URL'],
              ]
            )
          ]) {
            // env.DEPLOYMENT_ID = createAndUpdateGitHubDeployment(repo, env.GIT_COMMIT, env.BRANCH_NAME, deployEnv, deployUrl)
            

            withCredentials([usernamePassword(credentialsId: 'github-pat-6sensehq', usernameVariable: 'GITHUB_USER', passwordVariable: 'GITHUB_PAT')]) {
              writeFile file: '.env', text: """\
MONGODB_URI=${MONGODB_URI}
GITHUB_APP_CLIENT_ID=${GITHUB_APP_CLIENT_ID}
GITHUB_APP_ID=${GITHUB_APP_ID}
GITHUB_PRIVATE_KEY=${GITHUB_PRIVATE_KEY}
EMAIL_SENDER=${EMAIL_SENDER}
EMAIL_SERVICE_PORT=${EMAIL_SERVICE_PORT}
EMAIL_PASSWORD=${EMAIL_PASSWORD}
EMAIL_USERNAME=${EMAIL_USERNAME}
EMAIL_HOST=${EMAIL_HOST}
SALT_ROUND=${SALT_ROUND}
JWT_EXPIRE_REFRESH_TOKEN=${JWT_EXPIRE_REFRESH_TOKEN}
JWT_EXPIRE=${JWT_EXPIRE}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
REDIS_URL=${REDIS_URL}
CONTAINER_NAME=${deployDir}
HOST_PORT=${HOST_PORT}
IMAGE_TAG=${IMAGE_TAG}
NODE_ENV=production
"""

              sshagent(credentials: ['ssh-6sensehq']) {
                sh """
                  ssh -o StrictHostKeyChecking=no jenkins-deploy@95.216.144.222 "mkdir -p ~/${deployDir}"
                  scp -o StrictHostKeyChecking=no docker-compose.yml jenkins-deploy@95.216.144.222:~/${deployDir}/
                  scp -o StrictHostKeyChecking=no .env jenkins-deploy@95.216.144.222:~/${deployDir}/

                  ssh -o StrictHostKeyChecking=no jenkins-deploy@95.216.144.222 '
                    cd ~/${deployDir} &&
                    echo "$GITHUB_PAT" | docker login ghcr.io -u $GITHUB_USER --password-stdin &&
                    docker compose pull &&
                    docker compose up -d --remove-orphans
                    docker container prune -f
                    docker image prune -a -f
                    docker volume prune -f
                    docker network prune -f
                    docker builder prune -f
                  '
                """
              }
            }
          }
        }
      }
    }
  }

  post {
    success {
      script {
        def repo = getRepoFromGitUrl()
        updateGitHubDeploymentStatus(repo, env.BUILD_URL, env.DEPLOYMENT_ID, 'success', (env.BRANCH_NAME == 'test') ? 'Preview' : 'Production', env.DEPLOY_URL)
      }
    }
    failure {
      script {
        def repo = getRepoFromGitUrl()
        updateGitHubDeploymentStatus(repo, env.BUILD_URL, env.DEPLOYMENT_ID ?: '0', 'failure', (env.BRANCH_NAME == 'test') ? 'Preview' : 'Production', env.DEPLOY_URL)
      }
    }
    always {
      echo "🧹 Running Docker cleanup..."
      sh '''
        docker container prune -f
        docker image prune -a -f
        docker volume prune -f
        docker network prune -f
        docker builder prune -f
      '''
    }
  }
}

// -------------------
// GitHub API Helpers
// -------------------
def getRepoFromGitUrl() {
  def url = env.GIT_URL
  if (!url || url.trim() == '') {
    url = sh(script: "git config --get remote.origin.url", returnStdout: true).trim()
  }
  if (url.startsWith("git@github.com:")) {
    return url.replace("git@github.com:", "").replace(".git", "")
  } else if (url.startsWith("https://github.com/")) {
    return url.replace("https://github.com/", "").replace(".git", "")
  } else {
    error("Unknown Git URL format: ${url}")
  }
}

def createAndUpdateGitHubDeployment(String repo, String ref, String branch, String deployEnv, String deployUrl) {
  withCredentials([usernamePassword(credentialsId: 'github-pat-6sensehq', usernameVariable: 'GH_USER', passwordVariable: 'GITHUB_PAT')]) {
    withEnv(["TOKEN=${GITHUB_PAT}"]) {
      def description = "Deployed from Jenkins pipeline for branch ${branch}"
      def rawResponse = sh(
        script: """
          curl -s -X POST \\
            -H 'Authorization: token $TOKEN' \\
            -H 'Accept: application/vnd.github+json' \\
            https://api.github.com/repos/${repo}/deployments \\
            -d '{
              "ref": "${ref}",
              "task": "deploy",
              "auto_merge": false,
              "required_contexts": [],
              "description": "${description}",
              "environment": "${deployEnv}",
              "environment_url": "${deployUrl}",
              "sha": "${ref}"
            }'
        """,
        returnStdout: true
      ).trim()

      def deploymentId = sh(
        script: """
          echo '${rawResponse}' | grep -Eo '"id":[ ]*[0-9]+' | head -n1 | cut -d':' -f2
        """,
        returnStdout: true
      ).trim()

      if (!deploymentId || deploymentId == "null") {
        error("❌ Failed to extract deployment ID")
      }

      return deploymentId
    }
  }
}


def updateGitHubDeploymentStatus(String repo, String logUrl, String deploymentId, String status, String deployEnv, String deployUrl) {
  withCredentials([usernamePassword(credentialsId: 'github-pat-6sensehq', usernameVariable: 'GH_USER', passwordVariable: 'GITHUB_PAT')]) {
    withEnv(["TOKEN=${GITHUB_PAT}"]) {
      sh """
        curl -s -X POST \\
          -H 'Authorization: token $TOKEN' \\
          -H "Accept: application/vnd.github+json" \\
          https://api.github.com/repos/${repo}/deployments/${deploymentId}/statuses \\
          -d '{
            "state": "${status}",
            "log_url": "${logUrl}",
            "description": "Deployment ${status}",
            "environment": "${deployEnv}",
            "environment_url": "${deployUrl}"
          }'
      """
    }
    
  }
}
