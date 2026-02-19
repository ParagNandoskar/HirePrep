const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

/**
 * Load secrets from AWS Secrets Manager
 * Used in production to securely manage sensitive credentials
 */
async function loadSecrets() {
  try {
    const client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const secretName = process.env.AWS_SECRET_NAME || 'hireprep/production';

    const command = new GetSecretValueCommand({
      SecretId: secretName
    });

    const response = await client.send(command);

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      console.log('✅ Secrets loaded successfully from AWS Secrets Manager');
      return secrets;
    } else {
      console.error('❌ Secret is not in string format');
      return null;
    }
  } catch (error) {
    console.error('❌ Error loading secrets from AWS:', error.message);
    console.log('ℹ️  Falling back to environment variables');
    return null;
  }
}

module.exports = { loadSecrets };
