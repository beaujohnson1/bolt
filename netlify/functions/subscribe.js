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

    // Add location ID if available (required for some GHL operations)
    if (config.ghl.locationId) {
      contactData.locationId = config.ghl.locationId;
    }

    // Add to pipeline if configured
    if (config.ghl.pipelineId && config.ghl.stageId) {
      contactData.pipelineId = config.ghl.pipelineId;
      contactData.stageId = config.ghl.stageId;
    }

    console.log('📧 [SUBSCRIBE] Sending to GoHighLevel:', { email, source, timestamp });
    
    // Debug environment variables
    console.log('🔍 [SUBSCRIBE] Environment Debug:', {
      GHL_API_KEY: !!process.env.GHL_API_KEY,
      GHL_KEY: !!process.env.GHL_KEY,
      GHL_LOCATION_ID: !!process.env.GHL_LOCATION_ID,
      GHL_LOCATION: !!process.env.GHL_LOCATION,
      GHL_API_URL: !!process.env.GHL_API_URL,
      GHL_URL: !!process.env.GHL_URL,
      nodeEnv: process.env.NODE_ENV
    });
    
    console.log('🔧 [SUBSCRIBE] GHL Config:', {
      hasApiKey: !!config.ghl.apiKey,
      apiKeyLength: config.ghl.apiKey ? config.ghl.apiKey.length : 0,
      apiKeyPrefix: config.ghl.apiKey ? config.ghl.apiKey.substring(0, 10) + '...' : 'none',
      apiUrl: config.ghl.apiUrl,
      hasLocation: !!config.ghl.locationId,
      locationId: config.ghl.locationId || 'not set',
      hasPipeline: !!config.ghl.pipelineId,
      hasStage: !!config.ghl.stageId
    });
    console.log('📦 [SUBSCRIBE] Contact Data:', JSON.stringify(contactData, null, 2));

    // Check if GHL is properly configured
    if (!config.ghl.apiKey) {
      console.error('❌ [SUBSCRIBE] GHL API key missing - email will not be sent to GoHighLevel');
      
      // Still return success to user but don't actually send
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

    // Try the correct GHL API endpoint and headers
    // Use location-specific endpoint format for v2 API
    const apiEndpoint = config.ghl.locationId 
      ? `${config.ghl.apiUrl}/locations/${config.ghl.locationId}/contacts/`
      : `${config.ghl.apiUrl}/contacts/`;
    
    console.log('🚀 [SUBSCRIBE] Making API request to:', apiEndpoint);
    console.log('🔑 [SUBSCRIBE] Using location-specific endpoint:', !!config.ghl.locationId);
    
    const ghlResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ghl.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28' // Use v2 API instead of deprecated v1
      },
      body: JSON.stringify(contactData),
    });

    const responseData = await ghlResponse.text();
    console.log('📬 [SUBSCRIBE] GHL API Response Status:', ghlResponse.status);
    console.log('📄 [SUBSCRIBE] GHL API Response Body:', responseData);
    console.log('📋 [SUBSCRIBE] GHL API Response Headers:', Object.fromEntries(ghlResponse.headers.entries()));

    if (!ghlResponse.ok) {
      console.error('GoHighLevel API error:', ghlResponse.status, responseData);
      
      // Still return success to user, but log the error
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          success: true, 
          message: 'Successfully subscribed! Check your email for next steps.' 
        })
      };
    }

    // Success response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Successfully subscribed! Check your email for next steps.' 
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
