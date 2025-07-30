// Helper script to get GoHighLevel Pipeline and Stage IDs
// Run this with: node scripts/get-pipeline-ids.js

const fetch = require('node:fetch');
require('dotenv').config();

async function getPipelineIds() {
  try {
    console.log('🔍 Fetching your GoHighLevel pipelines...\n');
    
    const response = await fetch(`${process.env.GHL_API_URL}/pipelines`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    console.log('📋 Your Pipelines:');
    console.log('==================');
    
    if (data.pipelines && data.pipelines.length > 0) {
      data.pipelines.forEach((pipeline, index) => {
        console.log(`\n${index + 1}. Pipeline: "${pipeline.name}"`);
        console.log(`   Pipeline ID: ${pipeline.id}`);
        
        if (pipeline.stages && pipeline.stages.length > 0) {
          console.log('   Stages:');
          pipeline.stages.forEach((stage, stageIndex) => {
            console.log(`     ${stageIndex + 1}. "${stage.name}" - Stage ID: ${stage.id}`);
          });
        }
      });
      
      console.log('\n🎯 Copy the Pipeline ID and Stage ID you want to use!');
      console.log('💡 Tip: Look for your "EasyFlip Leads" pipeline');
      
    } else {
      console.log('❌ No pipelines found. Make sure you created one in GoHighLevel.');
    }

  } catch (error) {
    console.error('❌ Error fetching pipelines:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your GHL_API_KEY in .env file');
    console.log('2. Verify your API key has "opportunities.read" permission');
    console.log('3. Make sure GHL_API_URL is correct');
  }
}

getPipelineIds();