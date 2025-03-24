import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Configuration
const config = {
  directories: [
    'documents/legal/pdfs',
    'error_logs',
    'logs',
    'monitoring/prometheus',
    'monitoring/grafana/provisioning',
    'monitoring/alertmanager',
    'monitoring/logstash/config',
    'monitoring/logstash/pipeline',
    'monitoring/filebeat',
    'backups'
  ],
  envFile: '.env',
  envExampleFile: '.env.example'
};

// Create necessary directories
function createDirectories() {
  console.log('Creating necessary directories...');
  config.directories.forEach(dir => {
    const dirPath = join(__dirname, '..', dir);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
}

// Check and create .env file
function setupEnvFile() {
  console.log('Checking environment configuration...');
  const envPath = join(__dirname, '..', config.envFile);
  const envExamplePath = join(__dirname, '..', config.envExampleFile);

  if (!existsSync(envPath)) {
    if (existsSync(envExamplePath)) {
      const envContent = readFileSync(envExamplePath, 'utf8');
      writeFileSync(envPath, envContent);
      console.log('Created .env file from .env.example');
    } else {
      console.error('Error: .env.example file not found');
      process.exit(1);
    }
  }
}

// Install dependencies
function installDependencies() {
  console.log('Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('Dependencies installed successfully');
  } catch (error) {
    console.error('Error installing dependencies:', error);
    process.exit(1);
  }
}

// Setup Prisma
function setupPrisma() {
  console.log('Setting up Prisma...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Prisma setup completed');
  } catch (error) {
    console.error('Error setting up Prisma:', error);
    process.exit(1);
  }
}

// Build TypeScript
function buildTypeScript() {
  console.log('Building TypeScript...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('TypeScript build completed');
  } catch (error) {
    console.error('Error building TypeScript:', error);
    process.exit(1);
  }
}

// Main setup function
async function setup() {
  try {
    console.log('Starting setup process...');
    
    createDirectories();
    setupEnvFile();
    installDependencies();
    setupPrisma();
    buildTypeScript();

    console.log('\nSetup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Update the .env file with your configuration');
    console.log('2. Start the application: npm start');
    console.log('3. Access the application at http://localhost:3000');
    console.log('4. Access Prisma Studio at http://localhost:5555');
    console.log('5. Access monitoring dashboards:');
    console.log('   - Grafana: http://localhost:3001');
    console.log('   - Prometheus: http://localhost:9090');
    console.log('   - Alertmanager: http://localhost:9093');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
setup(); 