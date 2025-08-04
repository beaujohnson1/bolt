const { ImageAnnotatorClient } = require('@google-cloud/vision');

// Initialize Google Vision client
const vision = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});

// Category mapping from Google Vision labels to our categories
const CATEGORY_MAPPING = {
  'clothing': ['clothing', 'shirt', 'dress', 'pants', 'jacket', 'sweater', 'blouse', 'skirt', 'coat'],
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
const BRAND_PATTERNS = [
  'apple', 'samsung', 'nike', 'adidas', 'levi', 'sony', 'canon', 'nikon',
  'coach', 'gucci', 'prada', 'louis vuitton', 'rolex', 'omega', 'casio'
];

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
    const { imageData, imageUrl } = JSON.parse(event.body);
    
    if (!imageData && !imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image data or URL required' })
      };
    }

    console.log('Analyzing image with Google Vision API...');

    // Prepare image for Vision API
    const image = imageData 
      ? { content: imageData.replace(/^data:image\/[a-z]+;base64,/, '') }
      : { source: { imageUri: imageUrl } };

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

    console.log('Vision API response received');

    // Extract data from Vision API response
    const labels = result.labelAnnotations || [];
    const webDetection = result.webDetection || {};
    const textAnnotations = result.textAnnotations || [];
    const objects = result.localizedObjectAnnotations || [];

    // Determine category
    const category = determineCategory(labels, objects);
    
    // Extract brand information
    const brand = extractBrand(labels, webDetection.webEntities || [], textAnnotations);
    
    // Determine condition (basic heuristic)
    const condition = determineCondition(labels, textAnnotations);
    
    // Generate title and description
    const { title, description, keyFeatures } = generateTitleAndDescription(
      labels, 
      webDetection.webEntities || [], 
      brand, 
      category
    );
    
    // Estimate pricing based on category and detected features
    const { suggestedPrice, priceRange } = estimatePrice(category, brand, condition, labels);

    // Calculate overall confidence
    const confidence = calculateConfidence(labels, webDetection.webEntities || []);

    const analysisResult = {
      category,
      confidence,
      labels: labels.map(label => ({
        description: label.description,
        score: label.score,
        mid: label.mid
      })),
      webEntities: (webDetection.webEntities || []).map(entity => ({
        entityId: entity.entityId,
        score: entity.score,
        description: entity.description
      })),
      textAnnotations: textAnnotations.map(text => ({
        description: text.description,
        boundingPoly: text.boundingPoly
      })),
      brand,
      condition,
      suggestedTitle: title,
      suggestedDescription: description,
      keyFeatures,
      suggestedPrice,
      priceRange
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: analysisResult
      })
    };

  } catch (error) {
    console.error('Vision API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to analyze image',
        details: error.message
      })
    };
  }
};

// Helper functions
function determineCategory(labels, objects) {
  const allDescriptions = [
    ...labels.map(l => l.description.toLowerCase()),
    ...objects.map(o => o.name.toLowerCase())
  ];

  for (const [category, keywords] of Object.entries(CATEGORY_MAPPING)) {
    for (const keyword of keywords) {
      if (allDescriptions.some(desc => desc.includes(keyword))) {
        return category;
      }
    }
  }
  
  return 'other';
}

function extractBrand(labels, webEntities, textAnnotations) {
  // Check web entities first (most reliable)
  for (const entity of webEntities) {
    const description = entity.description.toLowerCase();
    for (const brand of BRAND_PATTERNS) {
      if (description.includes(brand)) {
        return entity.description;
      }
    }
  }
  
  // Check text annotations
  for (const text of textAnnotations) {
    const description = text.description.toLowerCase();
    for (const brand of BRAND_PATTERNS) {
      if (description.includes(brand)) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
  }
  
  // Check labels as fallback
  for (const label of labels) {
    const description = label.description.toLowerCase();
    for (const brand of BRAND_PATTERNS) {
      if (description.includes(brand)) {
        return label.description;
      }
    }
  }
  
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
  const topLabels = labels.slice(0, 5).map(l => l.description);
  const entityDescriptions = webEntities.slice(0, 3).map(e => e.description);
  
  // Generate title
  let title = '';
  if (brand) {
    title = `${brand} `;
  }
  
  if (entityDescriptions.length > 0) {
    title += entityDescriptions[0];
  } else if (topLabels.length > 0) {
    title += topLabels[0];
  } else {
    title += category.replace('_', ' ');
  }
  
  // Generate description
  const keyFeatures = [...new Set([...topLabels, ...entityDescriptions])].slice(0, 6);
  
  const description = `${title} in good condition. Features include: ${keyFeatures.join(', ').toLowerCase()}. Perfect for collectors or everyday use.`;
  
  return {
    title: title.trim(),
    description,
    keyFeatures
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