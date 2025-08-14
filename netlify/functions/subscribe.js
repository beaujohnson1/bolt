// GoHighLevel API Integration Function for Netlify
const { config } = require('./_shared/config.cjs');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Parse the request body
    const { 
      email, 
      name, 
      firstName, 
      lastName, 
      picture, 
      googleId, 
      source, 
      timestamp, 
      page_url 
    } = JSON.parse(event.body);

    // Validate required fields
    if (!email) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: false, 
          message: 'Email is required' 
        })
      };
    }

    // Prepare contact data for GoHighLevel
    const contactData = {
      email: email,
      firstName: firstName || name?.split(' ')[0] || '',
      lastName: lastName || name?.split(' ')[1] || '',
      phone: '', // Optional - can be added later
      tags: [
        'easyflip-landing-page', 
        'early-access-signup',
        source === 'google_signin' ? 'google-signup' : 'email-signup'
      ],
      customFields: {
        source: source || 'landing_page',
        signup_date: timestamp || new Date().toISOString(),
        page_url: page_url || 'https://easyflip-landing.netlify.app',
        google_id: googleId || '',
        profile_picture: picture || '',
        full_name: name || `${firstName || ''} ${lastName || ''}`.trim(),
        lead_source: 'EasyFlip Landing Page',
        interest_level: 'High - Early Access Request'
      }
    };

    // Add location ID for Private Integration Token (required for agency-level tokens)
    if (process.env.GHL_LOCATION_ID) {
      contactData.locationId = process.env.GHL_LOCATION_ID;
      console.log('📍 [SUBSCRIBE] Adding location ID for sub-account targeting');
    }

    // Add to pipeline if configured
    if (config.ghl.pipelineId && config.ghl.stageId) {
      contactData.pipelineId = config.ghl.pipelineId;
      contactData.stageId = config.ghl.stageId;
    }

    console.log('📧 [SUBSCRIBE] Sending to GoHighLevel:', { email, source, timestamp });
    
    // Debug environment variables in detail
    console.log('🔍 [SUBSCRIBE] Environment Debug:', {
      GHL_API_KEY: !!process.env.GHL_API_KEY,
      GHL_KEY: !!process.env.GHL_KEY,
      GHL_LOCATION_ID: !!process.env.GHL_LOCATION_ID,
      GHL_LOCATION: !!process.env.GHL_LOCATION,
      GHL_API_URL: !!process.env.GHL_API_URL,
      GHL_URL: !!process.env.GHL_URL,
      nodeEnv: process.env.NODE_ENV
    });
    
    // Check for potential issues with the API key
    console.log('🔍 [SUBSCRIBE] API Key Debug:', {
      keyExists: !!process.env.GHL_API_KEY,
      keyLength: process.env.GHL_API_KEY ? process.env.GHL_API_KEY.length : 0,
      keyStartsWith: process.env.GHL_API_KEY ? process.env.GHL_API_KEY.substring(0, 5) : 'none',
      hasWhitespace: process.env.GHL_API_KEY ? /\s/.test(process.env.GHL_API_KEY) : false,
      isString: typeof process.env.GHL_API_KEY
    });
    
    console.log('🔧 [SUBSCRIBE] GHL Config:', {
      hasApiKey: !!config.ghl.apiKey,
      apiKeyLength: config.ghl.apiKey ? config.ghl.apiKey.length : 0,
      apiKeyPrefix: config.ghl.apiKey ? config.ghl.apiKey.substring(0, 10) + '...' : 'none',
      apiUrl: config.ghl.apiUrl,
      hasLocation: !!config.ghl.locationId,
      locationId: config.ghl.locationId || 'not set',
      hasPipeline: !!config.ghl.pipelineId,
      hasStage: !!config.ghl.stageId,
      configSourceApiKey: config.ghl.apiKey === process.env.GHL_API_KEY ? 'direct' : 'fallback',
      configSourceLocation: config.ghl.locationId === process.env.GHL_LOCATION_ID ? 'direct' : 'fallback'
    });
    console.log('📦 [SUBSCRIBE] Contact Data:', JSON.stringify(contactData, null, 2));

    // Check if GHL is properly configured
    if (!config.ghl.apiKey) {
      console.error('❌ [SUBSCRIBE] GHL API key missing - email will not be sent to GoHighLevel');
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Successfully subscribed! Check your email for next steps.',
          debug: 'GHL_API_KEY missing - configure in Netlify environment variables'
        })
      };
    }

    // Back to sub-account API key approach (v1 format - no version header)
    console.log('🚀 [SUBSCRIBE] Using original sub-account API format (v1 - no version header)');
    
    const directApiKey = process.env.GHL_API_KEY;
    const directApiUrl = process.env.GHL_API_URL || 'https://services.leadconnectorhq.com';
    
    const ghlResponse = await fetch(`${directApiUrl}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${directApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(contactData),
    });

    // Process the API response
    const responseData = await ghlResponse.text();
    console.log('📬 [SUBSCRIBE] GHL API Response Status:', ghlResponse.status);
    console.log('📄 [SUBSCRIBE] GHL API Response Body:', responseData);
    console.log('📋 [SUBSCRIBE] GHL API Response Headers:', Object.fromEntries(ghlResponse.headers.entries()));

    if (!ghlResponse.ok) {
      console.error('❌ [SUBSCRIBE] GoHighLevel API error:', ghlResponse.status, responseData);
      
      // Still return success to user, but log the error
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Successfully subscribed! Check your email for next steps.',
          debug: `GHL API error: ${ghlResponse.status}`
        })
      };
    }

    // Success response
    console.log('✅ [SUBSCRIBE] Successfully added contact to GoHighLevel!');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Successfully subscribed! Check your email for next steps.',
        ghl_success: true
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: false, 
        message: 'Something went wrong. Please try again.' 
      })
    };
  }
};
