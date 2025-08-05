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
  'clothing': ['clothing', 'shirt', 'dress', 'pants', 'trousers', 'jeans', 'jacket', 'sweater', 'blouse', 'skirt', 'coat', 'leather jacket', 'blazer', 'cardigan', 'hoodie', 'vest', 'slacks', 'chinos', 'khakis', 'leggings', 'joggers'],
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

// Expanded brand patterns with more comprehensive coverage
const EXPANDED_BRAND_PATTERNS = {
  // Electronics & Tech
  'apple': ['apple', 'iphone', 'ipad', 'macbook', 'airpods', 'imac', 'apple watch'],
  'samsung': ['samsung', 'galaxy', 'note', 'tab'],
  'sony': ['sony', 'playstation', 'bravia', 'walkman'],
  'canon': ['canon', 'eos', 'powershot'],
  'nikon': ['nikon', 'd3500', 'd5600', 'd850'],
  'microsoft': ['microsoft', 'xbox', 'surface'],
  'dell': ['dell', 'inspiron', 'xps', 'alienware'],
  'hp': ['hp', 'hewlett packard', 'pavilion', 'envy'],
  'lenovo': ['lenovo', 'thinkpad', 'ideapad'],
  'asus': ['asus', 'rog', 'zenbook'],
  'lg': ['lg', 'oled', 'nanocell'],
  'panasonic': ['panasonic', 'lumix'],
  'bose': ['bose', 'quietcomfort', 'soundlink'],
  'beats': ['beats', 'by dre', 'studio', 'solo'],
  
  // Premium Fashion & Luxury
  'gucci': ['gucci', 'gg', 'guccissima'],
  'prada': ['prada', 'milano'],
  'louis vuitton': ['louis vuitton', 'lv', 'vuitton', 'monogram'],
  'chanel': ['chanel', 'coco', 'cc'],
  'hermes': ['hermes', 'birkin', 'kelly'],
  'dior': ['dior', 'christian dior'],
  'versace': ['versace', 'medusa'],
  'armani': ['armani', 'giorgio armani', 'emporio'],
  'dolce gabbana': ['dolce gabbana', 'd&g', 'dolce & gabbana'],
  'balenciaga': ['balenciaga'],
  'saint laurent': ['saint laurent', 'ysl', 'yves saint laurent'],
  'bottega veneta': ['bottega veneta'],
  'fendi': ['fendi'],
  'givenchy': ['givenchy'],
  'valentino': ['valentino'],
  'burberry': ['burberry', 'nova check'],
  
  // Popular Fashion Brands
  'nike': ['nike', 'swoosh', 'just do it', 'air jordan', 'air max'],
  'adidas': ['adidas', 'three stripes', 'originals', 'boost'],
  'puma': ['puma', 'suede', 'clyde'],
  'reebok': ['reebok', 'classic'],
  'converse': ['converse', 'chuck taylor', 'all star'],
  'vans': ['vans', 'off the wall'],
  'new balance': ['new balance', 'nb'],
  'asics': ['asics', 'gel', 'tiger'],
  
  // Denim & Casual
  'levi': ['levi', 'levis', 'levi\'s', '501', '511', '721'],
  'wrangler': ['wrangler'],
  'lee': ['lee jeans', 'lee'],
  'diesel': ['diesel'],
  'true religion': ['true religion'],
  'seven for all mankind': ['seven for all mankind', '7 for all mankind'],
  'citizens of humanity': ['citizens of humanity'],
  'ag jeans': ['ag jeans', 'ag'],
  
  // Department Store Brands
  'calvin klein': ['calvin klein', 'ck', 'calvin', 'klein'],
  'tommy hilfiger': ['tommy hilfiger', 'tommy', 'hilfiger', 'th'],
  'polo ralph lauren': ['polo ralph lauren', 'polo', 'ralph lauren', 'rl'],
  'lacoste': ['lacoste', 'crocodile'],
  'hugo boss': ['hugo boss', 'boss', 'hugo'],
  'brooks brothers': ['brooks brothers'],
  'banana republic': ['banana republic', 'br'],
  'j crew': ['j crew', 'j.crew', 'jcrew'],
  'gap': ['gap'],
  'old navy': ['old navy'],
  'ann taylor': ['ann taylor'],
  'loft': ['loft', 'ann taylor loft'],
  'express': ['express'],
  'the limited': ['the limited', 'limited'],
  
  // Fast Fashion
  'zara': ['zara'],
  'h&m': ['h&m', 'hm', 'hennes mauritz'],
  'uniqlo': ['uniqlo'],
  'forever 21': ['forever 21', 'f21'],
  'topshop': ['topshop'],
  'asos': ['asos'],
  'primark': ['primark'],
  'shein': ['shein'],
  
  // American Casual
  'american eagle': ['american eagle', 'ae', 'aeo'],
  'abercrombie': ['abercrombie', 'a&f', 'abercrombie & fitch'],
  'hollister': ['hollister', 'hco'],
  'aeropostale': ['aeropostale', 'aero'],
  'american apparel': ['american apparel'],
  
  // Outdoor & Athletic
  'patagonia': ['patagonia'],
  'north face': ['north face', 'northface', 'tnf', 'the north face'],
  'columbia': ['columbia', 'sportswear'],
  'rei': ['rei', 'co-op'],
  'll bean': ['ll bean', 'l.l. bean'],
  'eddie bauer': ['eddie bauer'],
  'under armour': ['under armour', 'underarmour', 'ua'],
  'lululemon': ['lululemon', 'lulu'],
  'athleta': ['athleta'],
  'outdoor research': ['outdoor research', 'or'],
  'arc\'teryx': ['arcteryx', 'arc\'teryx'],
  
  // Accessories & Bags
  'coach': ['coach', 'new york'],
  'michael kors': ['michael kors', 'mk', 'kors'],
  'kate spade': ['kate spade', 'spade'],
  'tory burch': ['tory burch'],
  'marc jacobs': ['marc jacobs'],
  'rebecca minkoff': ['rebecca minkoff'],
  'longchamp': ['longchamp', 'le pliage'],
  'fossil': ['fossil'],
  'dooney bourke': ['dooney bourke', 'dooney & bourke'],
  
  // Watches
  'rolex': ['rolex', 'submariner', 'datejust', 'daytona'],
  'omega': ['omega', 'speedmaster', 'seamaster'],
  'casio': ['casio', 'g-shock', 'edifice'],
  'timex': ['timex', 'weekender', 'expedition'],
  'seiko': ['seiko', 'prospex', 'presage'],
  'citizen': ['citizen', 'eco-drive'],
  'tissot': ['tissot'],
  'tag heuer': ['tag heuer', 'carrera', 'formula'],
  
  // Home & Lifestyle
  'ikea': ['ikea'],
  'pottery barn': ['pottery barn'],
  'west elm': ['west elm'],
  'crate barrel': ['crate barrel', 'crate & barrel'],
  'williams sonoma': ['williams sonoma'],
  'anthropologie': ['anthropologie'],
  'urban outfitters': ['urban outfitters'],
  'target': ['target', 'goodfellow', 'a new day', 'wild fable'],
  'walmart': ['walmart', 'great value', 'equate'],
  
  // Vintage & Designer
  'worthington': ['worthington'],
  'talbots': ['talbots'],
  'chicos': ['chicos', 'chico\'s'],
  'eileen fisher': ['eileen fisher'],
  'theory': ['theory'],
  'equipment': ['equipment'],
  'madewell': ['madewell'],
  'everlane': ['everlane'],
  'reformation': ['reformation'],
  'ganni': ['ganni']
};

// Size detection patterns
const SIZE_PATTERNS = {
  // Clothing sizes
  clothing: [
    // Letter sizes
    /\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/gi,
    /\b(Extra Small|Small|Medium|Large|Extra Large)\b/gi,
    // Numeric sizes
    /\b(0|2|4|6|8|10|12|14|16|18|20|22|24|26|28)\b/g,
    // Alphanumeric sizes (like 8A, 1A found on clothing tags)
    /\b(\d+[A-Z])\b/g,
    // Plus sizes
    /\b(1X|2X|3X|4X|5X)\b/gi,
    // International sizes
    /\b(US|UK|EU|FR|IT|DE|JP)\s*(\d+)\b/gi,
    // Petite/Tall
    /\b(Petite|Tall|Short|Regular)\b/gi,
    /\b(P|T|S|R)\s*(XS|S|M|L|XL|XXL)\b/gi
  ],
  // Pants/Jeans sizes
  pants: [
    /\b(\d{2,3})\s*[xX×]\s*(\d{2,3})\b/g, // 32x34, 30X32
    /\b(\d{2,3})\s*[\/\\]\s*(\d{2,3})\b/g, // 32/34, 30\32
    /\bW\s*(\d{2,3})\s*L\s*(\d{2,3})\b/gi, // W32 L34
    /\b(\d{2,3})\s*(W|Waist)\b/gi, // 32W, 32 Waist
    /\b(\d{2,3})\s*(L|Length|Inseam)\b/gi // 34L, 34 Length
  ],
  // Shoe sizes
  shoes: [
    /\b(US|UK|EU|FR|IT|JP|CM)\s*(\d+(?:\.\d+)?)\b/gi,
    /\bSize\s*(\d+(?:\.\d+)?)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(US|UK|EU|D|B|C|E|EE|EEE|EEEE|W|WW|WWW)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(Wide|Narrow|Medium)\b/gi
  ],
  // Bra sizes
  bra: [
    /\b(\d{2,3})\s*([A-K]{1,3})\b/gi, // 34B, 36DD, 38DDD
    /\b(AA|A|B|C|D|DD|DDD|E|F|G|H|I|J|K)\s*(\d{2,3})\b/gi // B34, DD36
  ],
  // Ring sizes
  ring: [
    /\bSize\s*(\d+(?:\.\d+)?)\b/gi,
    /\b(\d+(?:\.\d+)?)\s*(US|UK|EU|JP)\b/gi
  ],
  // One size
  onesize: [
    /\b(One Size|OS|OSFA|One Size Fits All|Free Size|Universal)\b/gi
  ]
};

// Color detection patterns
const COLOR_PATTERNS = [
  'black', 'white', 'gray', 'grey', 'brown', 'tan', 'beige', 'cream', 'ivory', 'taupe', 'khaki', 'stone', 'charcoal',
  'red', 'pink', 'rose', 'burgundy', 'maroon', 'wine',
  'blue', 'navy', 'royal', 'teal', 'turquoise', 'aqua', 'cyan',
  'green', 'olive', 'forest', 'lime', 'mint', 'sage',
  'yellow', 'gold', 'mustard', 'amber',
  'orange', 'coral', 'peach', 'salmon',
  'purple', 'violet', 'lavender', 'plum', 'magenta',
  'silver', 'bronze', 'copper', 'metallic',
  'multicolor', 'multi-color', 'rainbow', 'floral', 'striped', 'plaid', 'checkered'
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
    
    // Extract size information
    const size = extractSize(textAnnotations);
    console.log('📏 [VISION] Extracted size:', size);
    
    // Extract color information
    const color = extractColor(labels, textAnnotations);
    console.log('🎨 [VISION] Extracted color:', color);
    
    // Determine condition (basic heuristic)
    const condition = determineCondition(labels, textAnnotations);
    console.log('📋 [VISION] Determined condition:', condition);
    
    // Generate title and description
    const { title, description, keyFeatures } = generateTitleAndDescription(
      labels, 
      webDetection.webEntities || [], 
      brand, 
      category,
      color,
      textAnnotations
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
      size,
      color,
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
            // Give extra boost for pants-related keywords
            const pantsKeywords = ['pants', 'trousers', 'jeans', 'slacks', 'chinos', 'khakis'];
            const boost = pantsKeywords.includes(keyword) ? 5 : 3;
            categoryScores[category] += boost;
          } else {
            // Give extra boost for pants-related partial matches
            const pantsKeywords = ['pants', 'trousers', 'jeans', 'slacks', 'chinos', 'khakis'];
            const boost = pantsKeywords.some(pk => description.includes(pk)) ? 2 : 1;
            categoryScores[category] += boost;
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
  console.log('🏢 [VISION] Starting brand extraction...');
  
  // Combine all text sources
  const labelText = labels.map(l => l.description.toLowerCase()).join(' ');
  const webEntityText = webEntities.map(e => e.description.toLowerCase()).join(' ');
  const ocrText = textAnnotations.map(t => t.description.toLowerCase()).join(' ');
  const allText = `${labelText} ${webEntityText} ${ocrText}`;
  
  console.log('🔍 [VISION] Text sources for brand detection:', {
    labelText: labelText.substring(0, 100) + '...',
    webEntityText: webEntityText.substring(0, 100) + '...',
    ocrText: ocrText.substring(0, 100) + '...'
  });
  
  // Create brand scoring system
  const brandScores = {};
  
  // Score brands based on different text sources (OCR text gets highest priority)
  const scoreBrand = (brandName, patterns, source, multiplier = 1) => {
    for (const pattern of patterns) {
      if (source.includes(pattern.toLowerCase())) {
        const score = (pattern === brandName ? 3 : 1) * multiplier;
        brandScores[brandName] = (brandScores[brandName] || 0) + score;
        console.log(`🏢 [VISION] Brand match: "${pattern}" -> ${brandName} (score: +${score})`);
      }
    }
  };
  
  // Score brands from different sources with different priorities
  for (const [brandName, patterns] of Object.entries(EXPANDED_BRAND_PATTERNS)) {
    scoreBrand(brandName, patterns, ocrText, 3);        // OCR text (tags) - highest priority
    scoreBrand(brandName, patterns, webEntityText, 2);  // Web entities - medium priority  
    scoreBrand(brandName, patterns, labelText, 1);      // Labels - lowest priority
  }
  
  // Find the brand with the highest score
  let bestBrand = null;
  let bestScore = 0;
  
  for (const [brandName, score] of Object.entries(brandScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestBrand = brandName;
    }
  }
  
  if (bestBrand && bestScore >= 2) { // Require minimum confidence
    const formattedBrand = bestBrand.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    console.log('🏢 [VISION] Best brand detected:', formattedBrand, 'with score:', bestScore);
    return formattedBrand;
  }
  
  console.log('🏢 [VISION] No confident brand match found');
  return null;
}

function extractSize(textAnnotations) {
  console.log('📏 [VISION] Starting size extraction...');
  
  if (!textAnnotations || textAnnotations.length === 0) {
    console.log('📏 [VISION] No text annotations available for size detection');
    return null;
  }
  
  // Combine all OCR text
  const allText = textAnnotations.map(t => t.description).join(' ');
  console.log('📏 [VISION] OCR text for size detection:', allText);
  
  const foundSizes = [];
  
  // Check each size pattern category
  for (const [category, patterns] of Object.entries(SIZE_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = allText.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanMatch = match.trim();
          if (cleanMatch && !foundSizes.includes(cleanMatch)) {
            foundSizes.push(cleanMatch);
            console.log(`📏 [VISION] Size found (${category}):`, cleanMatch);
          }
        });
      }
    }
  }
  
  // Return the most likely size (prioritize alphanumeric then standard clothing sizes)
  if (foundSizes.length > 0) {
    // Prioritize alphanumeric sizes (like 8A, 1A) first, then standard clothing sizes
    const alphanumericSizes = foundSizes.filter(size => /^\d+[A-Z]$/.test(size));
    const clothingSizes = foundSizes.filter(size => 
      /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d+|One Size|OS)$/i.test(size)
    );
    
    const finalSize = alphanumericSizes.length > 0 ? alphanumericSizes[0] : 
                     clothingSizes.length > 0 ? clothingSizes[0] : foundSizes[0];
    console.log('📏 [VISION] Final size selected:', finalSize);
    return finalSize;
  }
  
  console.log('📏 [VISION] No size detected');
  return null;
}

function extractColor(labels, textAnnotations) {
  console.log('🎨 [VISION] Starting color extraction...');
  
  const allText = [
    ...labels.map(l => l.description.toLowerCase()),
    ...textAnnotations.map(t => t.description.toLowerCase())
  ].join(' ');
  
  console.log('🎨 [VISION] Text for color detection:', allText.substring(0, 200) + '...');
  
  const foundColors = [];
  
  for (const color of COLOR_PATTERNS) {
    if (allText.includes(color.toLowerCase())) {
      foundColors.push(color);
      console.log('🎨 [VISION] Color detected:', color);
    }
  }
  
  // Return the first detected color, or null if none found
  if (foundColors.length > 0) {
    const finalColor = foundColors[0].charAt(0).toUpperCase() + foundColors[0].slice(1);
    console.log('🎨 [VISION] Final color selected:', finalColor);
    return finalColor;
  }
  
  console.log('🎨 [VISION] No color detected');
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

function generateTitleAndDescription(labels, webEntities, brand, category, color, textAnnotations = []) {
  const topLabels = labels.slice(0, 8).map(l => l.description.toLowerCase());
  const entityDescriptions = webEntities.slice(0, 5).map(e => e.description.toLowerCase());
  const ocrText = textAnnotations.map(t => t.description.toLowerCase()).join(' ');
  
  console.log('📝 [VISION] Top labels for title generation:', topLabels);
  console.log('📝 [VISION] Entity descriptions:', entityDescriptions);
  console.log('📝 [VISION] OCR text for title generation:', ocrText.substring(0, 100) + '...');
  
  // Enhanced clothing-specific terms for title generation
  const clothingTerms = [
    'leather jacket', 'denim jacket', 'bomber jacket', 'blazer', 'sport coat', 'suit jacket',
    'jacket', 'coat', 'trench coat', 'pea coat', 'overcoat', 'windbreaker',
    'sweater', 'pullover', 'cardigan', 'hoodie', 'sweatshirt',
    'shirt', 'dress shirt', 'polo shirt', 't-shirt', 'tank top', 'blouse', 'tunic',
    'dress', 'maxi dress', 'midi dress', 'mini dress', 'cocktail dress', 'evening gown',
    'dress pants', 'work pants', 'casual pants', 'straight leg pants', 'bootcut pants', 'wide leg pants', 'skinny pants', 'slim fit pants', 'relaxed fit pants',
    'pants', 'trousers', 'jeans', 'chinos', 'khakis', 'leggings', 'joggers', 'slacks',
    'skirt', 'mini skirt', 'maxi skirt', 'pencil skirt', 'a-line skirt',
    'shorts', 'bermuda shorts', 'cargo shorts', 'denim shorts',
    'vest', 'waistcoat', 'gilet'
  ];
  
  const accessoryTerms = [
    'handbag', 'purse', 'tote bag', 'crossbody bag', 'clutch', 'backpack', 'messenger bag',
    'wallet', 'coin purse', 'card holder',
    'belt', 'leather belt', 'chain belt',
    'hat', 'cap', 'beanie', 'fedora', 'baseball cap',
    'scarf', 'shawl', 'wrap', 'pashmina',
    'sunglasses', 'eyeglasses', 'reading glasses',
    'watch', 'smartwatch', 'wristwatch',
    'jewelry', 'necklace', 'bracelet', 'earrings', 'ring'
  ];
  
  const shoeTerms = [
    'sneakers', 'running shoes', 'athletic shoes', 'basketball shoes',
    'boots', 'ankle boots', 'knee boots', 'combat boots', 'hiking boots', 'rain boots',
    'dress shoes', 'oxford shoes', 'loafers', 'boat shoes', 'moccasins',
    'heels', 'high heels', 'stilettos', 'pumps', 'wedges',
    'flats', 'ballet flats', 'slip-ons',
    'sandals', 'flip-flops', 'slides', 'espadrilles',
    'clogs', 'mules'
  ];
  
  // Find the most specific item type
  let itemType = '';
  let foundTerms = [];
  
  // Enhanced category-specific detection
  if (category === 'clothing') {
    for (const term of clothingTerms) {
      if (topLabels.some(label => label.includes(term)) || 
          entityDescriptions.some(entity => entity.includes(term)) ||
          ocrText.includes(term)) {
        foundTerms.push(term);
      }
    }
    
    // Prioritize more specific terms with better hierarchy, especially pants
    if (foundTerms.some(term => term.includes('pants')) || foundTerms.includes('trousers') || foundTerms.includes('slacks')) {
      // Determine pants style
      if (foundTerms.includes('dress pants') || foundTerms.includes('work pants')) {
        itemType = 'Dress Pants';
      } else if (foundTerms.includes('straight leg pants')) {
        itemType = 'Straight Leg Pants';
      } else if (foundTerms.includes('bootcut pants')) {
        itemType = 'Bootcut Pants';
      } else if (foundTerms.includes('wide leg pants')) {
        itemType = 'Wide Leg Pants';
      } else if (foundTerms.includes('skinny pants')) {
        itemType = 'Skinny Pants';
      } else if (foundTerms.includes('slim fit pants')) {
        itemType = 'Slim Fit Pants';
      } else if (foundTerms.includes('relaxed fit pants')) {
        itemType = 'Relaxed Fit Pants';
      } else if (foundTerms.includes('casual pants')) {
        itemType = 'Casual Pants';
      } else if (foundTerms.includes('trousers')) {
        itemType = 'Trousers';
      } else if (foundTerms.includes('slacks')) {
        itemType = 'Slacks';
      } else {
        itemType = 'Pants';
      }
    } else if (foundTerms.includes('leather jacket')) {
      itemType = 'Leather Jacket';
    } else if (foundTerms.includes('denim jacket')) {
      itemType = 'Denim Jacket';
    } else if (foundTerms.includes('bomber jacket')) {
      itemType = 'Bomber Jacket';
    } else if (foundTerms.includes('jacket')) {
      itemType = 'Jacket';
    } else if (foundTerms.includes('blazer')) {
      itemType = 'Blazer';
    } else if (foundTerms.includes('sport coat')) {
      itemType = 'Sport Coat';
    } else if (foundTerms.includes('coat')) {
      itemType = 'Coat';
    } else if (foundTerms.includes('dress shirt')) {
      itemType = 'Dress Shirt';
    } else if (foundTerms.includes('polo shirt')) {
      itemType = 'Polo Shirt';
    } else if (foundTerms.includes('t-shirt')) {
      itemType = 'T-Shirt';
    } else if (foundTerms.length > 0) {
      itemType = foundTerms[0].split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  } else if (category === 'accessories') {
    for (const term of accessoryTerms) {
      if (topLabels.some(label => label.includes(term)) || 
          entityDescriptions.some(entity => entity.includes(term))) {
        itemType = term.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        break;
      }
    }
  } else if (category === 'shoes') {
    for (const term of shoeTerms) {
      if (topLabels.some(label => label.includes(term)) || 
          entityDescriptions.some(entity => entity.includes(term))) {
        itemType = term.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        break;
      }
    }
  }
  
  // Fallback to category name if no specific type found
  if (!itemType) {
    if (entityDescriptions.length > 0) {
      // Filter out generic terms and brand-like terms that shouldn't be item types
      const filteredEntities = entityDescriptions.filter(entity => 
        !entity.includes('label') && 
        !entity.includes('.com') && 
        !entity.includes('brand') &&
        entity.length > 2
      );
      if (filteredEntities.length > 0) {
        itemType = filteredEntities[0].charAt(0).toUpperCase() + filteredEntities[0].slice(1);
      }
    }
    
    if (!itemType && topLabels.length > 0) {
      // Filter out generic terms from labels too
      const filteredLabels = topLabels.filter(label => 
        !label.includes('label') && 
        !label.includes('brand') &&
        label.length > 2
      );
      if (filteredLabels.length > 0) {
        itemType = filteredLabels[0].charAt(0).toUpperCase() + filteredLabels[0].slice(1);
      }
    }
    
    if (!itemType) {
      itemType = category.replace('_', ' ').split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }
  }
  
  // Extract size from OCR for title inclusion
  const detectedSize = extractSizeFromText(ocrText);
  
  // Generate title with better order: Brand + Size + Color + Item Type
  let title = '';
  if (brand && !brand.toLowerCase().includes('label')) {
    title = `${brand} `;
  }
  if (detectedSize) {
    title += `Size ${detectedSize} `;
  }
  if (color && !itemType.toLowerCase().includes(color.toLowerCase())) {
    title += `${color} `;
  }
  title += itemType;
  
  // Clean up title - remove redundant words
  title = title.replace(/\s+/g, ' ').trim();
  
  // Generate description
  const keyFeatures = [...new Set([
    ...foundTerms, 
    ...topLabels.slice(0, 4), 
    ...entityDescriptions.slice(0, 3)
  ])].filter(feature => 
    !feature.includes('label') && 
    !feature.includes('.com') &&
    feature.length > 2
  ).slice(0, 6);
  
  let description = `${title} in good condition.`;
  if (keyFeatures.length > 0) {
    description += ` Features include: ${keyFeatures.join(', ')}.`;
  }
  description += ` Perfect for collectors or everyday use.`;
  
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

// Helper function to extract size from text
function extractSizeFromText(text) {
  const sizePatterns = [
    /\b(\d+[A-Z])\b/g, // 8A, 1A
    /\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/gi,
    /\b(\d+)\b/g // Simple numbers
  ];
  
  for (const pattern of sizePatterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Return first match that looks like a clothing size
      const match = matches[0];
      if (/^\d+[A-Z]$/.test(match) || /^(XXS|XS|S|M|L|XL|XXL|XXXL)$/i.test(match)) {
        return match.toUpperCase();
      }
      // For simple numbers, only return if they're reasonable clothing sizes
      if (/^\d+$/.test(match)) {
        const num = parseInt(match);
        if (num >= 0 && num <= 28) {
          return match;
        }
      }
    }
  }
  return null;
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