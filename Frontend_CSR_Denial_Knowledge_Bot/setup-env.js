const fs = require('fs');
const path = require('path');

// Environment configuration template
const envTemplate = `# API Configuration
# Modify these values according to your backend configuration
REACT_APP_API_PROTOCOL=http
REACT_APP_API_HOST=localhost
REACT_APP_API_PORT=8081

# Development vs Production
REACT_APP_NODE_ENV=development
`;

// Create .env file
const envPath = path.join(__dirname, '.env');

if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ .env file created successfully!');
  console.log('📍 Location:', envPath);
  console.log('📝 Edit this file to match your backend configuration');
} else {
  console.log('ℹ️  .env file already exists');
  console.log('📍 Location:', envPath);
}

console.log('\n🔧 Backend Configuration:');
console.log('- Update server.port in application.properties');
console.log('- Current backend port: 8081 (as per application.properties)');

console.log('\n🌐 Frontend Configuration:');
console.log('- API calls now use centralized configuration');
console.log('- Update REACT_APP_API_PORT in .env to match backend');

console.log('\n🚀 To run this script: node setup-env.js'); 