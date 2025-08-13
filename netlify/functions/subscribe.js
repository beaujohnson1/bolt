// GoHighLevel API Integration Function for Netlify
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

    // Add to pipeline if configured
    if ((process.env.GHL_PIPELINE || process.env.GHL_PIPELINE_ID) && (process.env.GHL_STAGE || process.env.GHL_STAGE_ID)) {
      contactData.pipelineId = (process.env.GHL_PIPELINE || process.env.GHL_PIPELINE_ID);
      contactData.stageId = (process.env.GHL_STAGE || process.env.GHL_STAGE_ID);
    }

    console.log('Sending to GoHighLevel:', { email, source, timestamp });

    // Send to GoHighLevel API
    const ghlResponse = await fetch(`${(process.env.GHL_URL || process.env.GHL_API_URL)}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(process.env.GHL_KEY || process.env.GHL_API_KEY)}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify(contactData),
    });

    const responseData = await ghlResponse.text();
    console.log('GHL Response:', ghlResponse.status, responseData);

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
