// Script to update environment variable references in Netlify functions
const fs = require('fs');
const path = require('path');

const functionsDir = './netlify/functions';
const envMapping = {
  'OPENAI_API_KEY': 'OPENAI_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS_BASE64': 'GOOGLE_CREDS',
  'GOOGLE_CLOUD_PROJECT_ID': 'GOOGLE_PROJECT',
  'VITE_EBAY_PROD_APP_ID': 'EBAY_PROD_APP',
  'VITE_EBAY_PROD_DEV_ID': 'EBAY_PROD_DEV', 
  'VITE_EBAY_PROD_CERT_ID': 'EBAY_PROD_CERT',
  'VITE_EBAY_SANDBOX_APP_ID': 'EBAY_SAND_APP',
  'VITE_EBAY_SANDBOX_DEV_ID': 'EBAY_SAND_DEV',
  'VITE_EBAY_SANDBOX_CERT_ID': 'EBAY_SAND_CERT',
  'GHL_API_KEY': 'GHL_KEY',
  'GHL_API_URL': 'GHL_URL',
  'GHL_PIPELINE_ID': 'GHL_PIPELINE',
  'GHL_STAGE_ID': 'GHL_STAGE'
};

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = false;
  
  for (const [longName, shortName] of Object.entries(envMapping)) {
    const pattern = new RegExp(`process\\.env\\.${longName}`, 'g');
    if (pattern.test(content)) {
      content = content.replace(pattern, `(process.env.${shortName} || process.env.${longName})`);
      updated = true;
      console.log(`Updated ${longName} -> ${shortName} in ${filePath}`);
    }
  }
  
  if (updated) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${filePath}`);
  }
  
  return updated;
}

// Get all JS files in functions directory
const files = fs.readdirSync(functionsDir)
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(functionsDir, file));

console.log(`Found ${files.length} function files to update...`);

let totalUpdated = 0;
files.forEach(file => {
  if (updateFile(file)) {
    totalUpdated++;
  }
});

console.log(`\n✅ Updated ${totalUpdated} files with shorter environment variable names`);
console.log('\nNow add these SHORT variables to your Netlify dashboard:');
Object.entries(envMapping).forEach(([longName, shortName]) => {
  console.log(`${shortName}=[your_${shortName.toLowerCase()}_value]`);
});