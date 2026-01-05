const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyC-BWfjMn33ebQMw_6bEUNbnnUMj_9Oc6I';
const genAI = new GoogleGenerativeAI(API_KEY);

async function listAvailableModels() {
  try {
    console.log('🔍 Checking API key and fetching available models...\n');
    
    // Try to list models using REST API directly
    const fetch = require('node-fetch');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    if (!response.ok) {
      console.log(`❌ API Key Error: ${response.status} ${response.statusText}`);
      const error = await response.text();
      console.log('Error details:', error);
      console.log('\n⚠️  Your API key may be invalid, expired, or restricted.');
      console.log('Please generate a new API key at: https://makersuite.google.com/app/apikey');
      return;
    }
    
    const data = await response.json();
    
    if (data.models && data.models.length > 0) {
      console.log('✅ API Key is valid!\n');
      console.log('📋 Available models for generateContent:\n');
      
      const contentModels = data.models.filter(m => 
        m.supportedGenerationMethods && 
        m.supportedGenerationMethods.includes('generateContent')
      );
      
      contentModels.forEach(model => {
        console.log(`  • ${model.name}`);
        console.log(`    Display: ${model.displayName}`);
        console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`);
        console.log('');
      });
      
      if (contentModels.length > 0) {
        console.log('\n🧪 Testing first available model...\n');
        const testModel = contentModels[0].name;
        const model = genAI.getGenerativeModel({ model: testModel });
        const result = await model.generateContent('Say hello in one word');
        const response = await result.response;
        console.log(`✅ SUCCESS with ${testModel}`);
        console.log(`Response: ${response.text()}`);
      }
    } else {
      console.log('⚠️  No models found for this API key');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listAvailableModels();

