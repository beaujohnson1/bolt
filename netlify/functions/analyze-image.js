const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Parse the JSON content from the environment variable
let googleCredentials;
try {
  googleCredentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
} catch (e) {
  console.error('Error parsing GOOGLE_APPLICATION_CREDENTIALS:', e);
  // In a production scenario, you might want more robust error handling here,
  // such as throwing an error that prevents the function from proceeding.
  // For now, we'll proceed, but the client initialization might fail.
}

// Initialize Google Vision client
const vision = new ImageAnnotatorClient({
  credentials: googleCredentials, // Use the parsed credentials object
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});


// Category mapping from Google Vision labels to our categories
const CATEGORY_MAPPING = {
  'clothing': ['clothing', 'shirt', 'dress', 'pants', 'jacket', 'sweater', 'blouse', 'skirt', 'coat', 'leather jacket', 'blazer', 'cardigan', 'hoodie', 'vest'],
  'shoes': ['shoe', 'boot', 'sneaker', 'sandal', 'heel', 'footwear'],
  'electronics': ['electronics', 'computer', 'phone', 'camera', 'television', 'laptop', 'tablet', 'headphones', 'speaker'],
  'home_garden': ['furniture', 'lamp', 'vase', 'plant', 'tool', 'kitchen', 'home', 'garden', 'appliance'],
  'toys_games': ['toy', 'game', 'doll', 'puzzle', 'board game', 'video game', 'action figure'],
  'books_media': ['book', 'magazine', 'cd', 'dvd', 'vinyl', 'record', 'media'],
  'jewelry': ['jewelry', 'necklace', 'ring', 'bracelet', 'earring', 'watch'],
  'accessories': ['bag', 'purse', 'wallet', 'belt', 'hat', 'scarf', 'sunglasses'],
  'sports_outdoors': ['sports', 'outdoor', 'bicycle', 'fitness', 'camping', 'hiking'],
  'collectibles': ['collectible', 'antique', 'vintage', 'art', 'coin', 'stamp']
};

// Brand detection patterns
const BRAND_PATTERNS = {
  // Electronics
  'apple': ['apple', 'iphone', 'ipad', 'macbook', 'airpods'],
  'samsung': ['samsung', 'galaxy'],
  'sony': ['sony', 'playstation'],
  'canon': ['canon', 'eos'],
  'nikon': ['nikon'],
  
  // Fashion brands
  'nike': ['nike', 'swoosh'],
  'adidas': ['adidas', 'three stripes'],
  'levi': ['levi', 'levis', 'levi\'s'],
  'coach': ['coach'],
  'gucci': ['gucci'],
  'prada': ['prada'],
  'louis vuitton': ['louis vuitton', 'lv'],
  'calvin klein': ['calvin klein', 'ck'],
  'tommy hilfiger': ['tommy hilfiger', 'tommy'],
  'polo ralph lauren': ['polo ralph lauren', 'polo', 'ralph lauren'],
  'gap': ['gap'],
  'old navy': ['old navy'],
  'banana republic': ['banana republic'],
  'j crew': ['j crew', 'j.crew'],
  'ann taylor': ['ann taylor'],
  'express': ['express'],
  'zara': ['zara'],
  'h&m': ['h&m', 'hm'],
  'uniqlo': ['uniqlo'],
  'forever 21': ['forever 21', 'f21'],
  'american eagle': ['american eagle', 'ae'],
  'abercrombie': ['abercrombie', 'a&f'],
  'hollister': ['hollister'],
  'patagonia': ['patagonia'],
  'north face': ['north face', 'northface', 'tnf'],
  'columbia': ['columbia'],
  'under armour': ['under armour', 'underarmour'],
  'lululemon': ['lululemon'],
  
  // Luxury brands
  'rolex': ['rolex'],
  'omega': ['omega'],
  'casio': ['casio'],
  'timex': ['timex'],
  'fossil': ['fossil'],
  'michael kors': ['michael kors', 'mk'],
  'kate spade': ['kate spade'],
  'tory burch': ['tory burch'],
  'marc jacobs': ['marc jacobs'],
  'versace': ['versace'],
  'armani': ['armani'],
  'hugo boss': ['hugo boss', 'boss'],
  'burberry': ['burberry']
};

// Condition keywords
const CONDITION_KEYWORDS = {
  'like_new': ['new', 'mint', 'perfect', 'excellent', 'pristine'],
  'good': ['good', 'fine', 'nice', 'decent', 'solid'],
  'fair': ['fair', 'okay', 'average', 'worn', 'used'],
  'poor': ['poor', 'damaged', 'broken', 'cracked', 'torn']
};

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔍 [VISION] Starting image analysis...');
    console.log('🔧 [VISION] Environment check:', {
      hasGoogleCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credsLength: process.env.GOOGLE_APPLICATION_CREDENTIALS ? process.env.GOOGLE_APPLICATION_CREDENTIALS.length : 0
    });

    const { imageUrl } = JSON.parse(event.body);
    
    if (!imageUrl) {
      console.log('❌ [VISION] No image URL provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL required' })
      };
    }

    console.log('📸 [VISION] Image URL received:', {
      imageUrl: imageUrl,
      urlLength: imageUrl.length
    });

    // Prepare image for Vision API
    const image = { source: { imageUri: imageUrl } };

    console.log('🔄 [VISION] Calling Google Vision API...');

    // Call Google Vision API with multiple features
    const [result] = await vision.annotateImage({
      image,
      features: [
        { type: 'LABEL_DETECTION', maxResults: 20 },
        { type: 'WEB_DETECTION', maxResults: 10 },
        { type: 'TEXT_DETECTION', maxResults: 10 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
      ]
    });

    console.log('✅ [VISION] Vision API response received successfully');
    console.log('📊 [VISION] Response summary:', {
      labelsCount: result.labelAnnotations?.length || 0,
      webEntitiesCount: result.webDetection?.webEntities?.length || 0,
      textAnnotationsCount: result.textAnnotations?.length || 0,
      objectsCount: result.localizedObjectAnnotations?.length || 0
    });

    // Extract data from Vision API response
    const labels = result.labelAnnotations || [];
    const webDetection = result.webDetection || {};
    const textAnnotations = result.textAnnotations || [];
    const objects = result.localizedObjectAnnotations || [];

    // Determine category
    const category = determineCategory(labels, objects);
    console.log('🏷️ [VISION] Determined category:', category);
    
    // Extract brand information
    const brand = extractBrand(labels, webDetection.webEntities || [], textAnnotations);
    console.log('🏢 [VISION] Extracted brand:', brand);
    
    // Determine condition (basic heuristic)
    const condition = determineCondition(labels, textAnnotations);
    console.log('📋 [VISION] Determined condition:', condition);
    
    // Generate title and description
    const { title, description, keyFeatures } = generateTitleAndDescription(
      labels, 
      webDetection.webEntities || [], 
      brand, 
      category
    );
    console.log('📝 [VISION] Generated content:', { title, keyFeatures });
    
    // Estimate pricing based on category and detected features
    const { suggestedPrice, priceRange } = estimatePrice(category, brand, condition, labels);
    console.log('💰 [VISION] Price estimation:', { suggestedPrice, priceRange });

    // Calculate overall confidence
    const confidence = calculateConfidence(labels, webDetection.webEntities || []);
    console.log('🎯 [VISION] Confidence score:', confidence);

    const analysisResult = {
      category,
      confidence,
      brand,
      condition,
      suggestedTitle: title,
      suggestedDescription: description,
      keyFeatures,
      suggestedPrice,
      priceRange
    };

    console.log('🎉 [VISION] Analysis completed successfully');
    console.log('📦 [VISION] Response size (chars):', JSON.stringify(analysisResult).length);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: analysisResult
      })
    };

  } catch (error) {
    console.error('❌ [VISION] Critical error occurred:', {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    // Check for specific Google Cloud errors
    if (error.message?.includes('credentials')) {
      console.error('🔑 [VISION] Credentials error - check GOOGLE_APPLICATION_CREDENTIALS');
    }
    if (error.message?.includes('project')) {
      console.error('📁 [VISION] Project error - check GOOGLE_CLOUD_PROJECT_ID');
    }
    if (error.message?.includes('Vision API')) {
      console.error('👁️ [VISION] Vision API not enabled or quota exceeded');
    }
    if (error.message?.includes('permission')) {
      console.error('🚫 [VISION] Permission denied - check service account permissions');
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to analyze image',
        details: error.message,
        errorType: error.name,
        errorCode: error.code || error.status || error.statusCode
      })
    };
  }
};

// Helper functions
function determineCategory(labels, objects) {
  // Get all descriptions and convert to lowercase
  let allDescriptions = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase())
  ];
  
  console.log('🔍 [VISION] All detected labels/objects:', allDescriptions);
  
  // Create a scoring system for categories
  const categoryScores = {};
  
  // Initialize scores
  Object.keys(CATEGORY_MAPPING).forEach(category => {
    categoryScores[category] = 0;
  });
  
  // Score each category based on keyword matches
  for (const [category, keywords] of Object.entries(CATEGORY_MAPPING)) {
    for (const keyword of keywords) {
      for (const description of allDescriptions) {
        if (description.includes(keyword)) {
          // Give higher scores for exact matches
          if (description === keyword) {
            categoryScores[category] += 3;
          } else {
            categoryScores[category] += 1;
          }
        }
      }
    }
  }
  
  console.log('📊 [VISION] Category scores:', categoryScores);
  
  // Find the category with the highest score
  let bestCategory = 'other';
  let bestScore = 0;
  
  for (const [category, score] of Object.entries(categoryScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }
  
  console.log('🏆 [VISION] Best category:', bestCategory, 'with score:', bestScore);
  
  return bestCategory;
}


function extractBrand(labels, webEntities, textAnnotations) {
  const allText = [
    ...labels.map(l => l.description.toLowerCase()),
    ...webEntities.map(e => e.description.toLowerCase()),
    ...textAnnotations.map(t => t.description.toLowerCase())
  ].join(' ');
  
  console.log('🔍 [VISION] All text for brand detection:', allText);
  
  // Check web entities first (most reliable)
  for (const entity of webEntities) {
    const description = entity.description.toLowerCase();
    for (const [brandName, patterns] of Object.entries(BRAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (description.includes(pattern)) {
          console.log('🏢 [VISION] Brand found in web entities:', brandName);
          return brandName.charAt(0).toUpperCase() + brandName.slice(1);
        }
      }
    }
  }
  
  // Check text annotations
  for (const text of textAnnotations) {
    const description = text.description.toLowerCase();
    for (const [brandName, patterns] of Object.entries(BRAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (description.includes(pattern)) {
          console.log('🏢 [VISION] Brand found in text:', brandName);
          return brandName.charAt(0).toUpperCase() + brandName.slice(1);
        }
      }
    }
  }
  
  // Check labels as fallback
  for (const label of labels) {
    const description = label.description.toLowerCase();
    for (const [brandName, patterns] of Object.entries(BRAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (description.includes(pattern)) {
          console.log('🏢 [VISION] Brand found in labels:', brandName);
          return brandName.charAt(0).toUpperCase() + brandName.slice(1);
        }
      }
    }
  }
  
  console.log('🏢 [VISION] No brand detected');
  return null;
}

function determineCondition(labels, textAnnotations) {
  const allText = [
    ...labels.map(l => l.description.toLowerCase()),
    ...textAnnotations.map(t => t.description.toLowerCase())
  ].join(' ');

  for (const [condition, keywords] of Object.entries(CONDITION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (allText.includes(keyword)) {
        return condition;
      }
    }
  }
  
  return 'good'; // Default condition
}

function generateTitleAndDescription(labels, webEntities, brand, category) {
  const topLabels = labels.slice(0, 8).map(l => l.description.toLowerCase());
  const entityDescriptions = webEntities.slice(0, 5).map(e => e.description.toLowerCase());
  
  console.log('📝 [VISION] Top labels for title generation:', topLabels);
  console.log('📝 [VISION] Entity descriptions:', entityDescriptions);
  
  // Prioritize clothing-specific terms for title generation
  const clothingTerms = [
    'leather jacket', 'jacket', 'blazer', 'coat', 'sweater', 'hoodie', 'cardigan',
    'shirt', 'blouse', 'dress', 'pants', 'jeans', 'skirt', 'shorts', 'vest'
  ];
  
  const accessoryTerms = [
    'bag', 'purse', 'wallet', 'belt', 'hat', 'scarf', 'sunglasses', 'watch'
  ];
  
  const shoeTerms = [
    'shoes', 'boots', 'sneakers', 'sandals', 'heels', 'flats', 'loafers'
  ];
  
  // Find the most specific item type
  let itemType = '';
  let foundTerms = [];
  
  // Check for clothing terms first
  if (category === 'clothing') {
    for (const term of clothingTerms) {
      if (topLabels.some(label => label.includes(term)) || 
          entityDescriptions.some(entity => entity.includes(term))) {
        foundTerms.push(term);
      }
    }
    
    // Prioritize more specific terms
    if (foundTerms.includes('leather jacket')) {
      itemType = 'Leather Jacket';
    } else if (foundTerms.includes('jacket')) {
      itemType = 'Jacket';
    } else if (foundTerms.includes('blazer')) {
      itemType = 'Blazer';
    } else if (foundTerms.includes('coat')) {
      itemType = 'Coat';
    } else if (foundTerms.length > 0) {
      itemType = foundTerms[0].split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  } else if (category === 'accessories') {
    for (const term of accessoryTerms) {
      if (topLabels.some(label => label.includes(term)) || 
          entityDescriptions.some(entity => entity.includes(term))) {
        itemType = term.charAt(0).toUpperCase() + term.slice(1);
        break;
      }
    }
  } else if (category === 'shoes') {
    for (const term of shoeTerms) {
      if (topLabels.some(label => label.includes(term)) || 
          entityDescriptions.some(entity => entity.includes(term))) {
        itemType = term.charAt(0).toUpperCase() + term.slice(1);
        break;
      }
    }
  }
  
  // Fallback to category name if no specific type found
  if (!itemType) {
    if (entityDescriptions.length > 0) {
      itemType = entityDescriptions[0].charAt(0).toUpperCase() + entityDescriptions[0].slice(1);
    } else if (topLabels.length > 0) {
      itemType = topLabels[0].charAt(0).toUpperCase() + topLabels[0].slice(1);
    } else {
      itemType = category.replace('_', ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }
  
  // Generate title
  let title = '';
  if (brand) {
    title = `${brand} `;
  }
  title += itemType;
  
  // Generate description
  const keyFeatures = [...new Set([...foundTerms, ...topLabels.slice(0, 4), ...entityDescriptions.slice(0, 3)])].slice(0, 6);
  
  const description = `${title} in good condition. Features include: ${keyFeatures.join(', ')}. Perfect for collectors or everyday use.`;
  
  console.log('📝 [VISION] Generated title:', title);
  console.log('📝 [VISION] Key features:', keyFeatures);
  
  return {
    title: title.trim(),
    description,
    keyFeatures: keyFeatures.map(feature => 
      feature.charAt(0).toUpperCase() + feature.slice(1)
    )
  };
}

function estimatePrice(category, brand, condition, labels) {
  // Base prices by category
  const basePrices = {
    'electronics': 150,
    'clothing': 25,
    'shoes': 35,
    'jewelry': 45,
    'home_garden': 30,
    'toys_games': 20,
    'books_media': 12,
    'accessories': 25,
    'sports_outdoors': 40,
    'collectibles': 60,
    'other': 25
  };
  
  let basePrice = basePrices[category] || 25;
  
  // Brand multiplier
  const premiumBrands = ['apple', 'rolex', 'gucci', 'prada', 'louis vuitton'];
  if (brand && premiumBrands.some(b => brand.toLowerCase().includes(b))) {
    basePrice *= 2.5;
  } else if (brand) {
    basePrice *= 1.3;
  }
  
  // Condition multiplier
  const conditionMultipliers = {
    'like_new': 0.9,
    'good': 0.7,
    'fair': 0.5,
    'poor': 0.3
  };
  
  basePrice *= conditionMultipliers[condition] || 0.7;
  
  // Add some randomness for market variation
  const variation = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2
  const suggestedPrice = Math.round(basePrice * variation);
  
  return {
    suggestedPrice,
    priceRange: {
      min: Math.round(suggestedPrice * 0.8),
      max: Math.round(suggestedPrice * 1.3)
    }
  };
}

function calculateConfidence(labels, webEntities) {
  if (labels.length === 0) return 0.3;
  
  const avgLabelScore = labels.reduce((sum, label) => sum + label.score, 0) / labels.length;
  const hasWebEntities = webEntities.length > 0;
  const webEntityBonus = hasWebEntities ? 0.2 : 0;
  
  return Math.min(0.95, avgLabelScore + webEntityBonus);
}