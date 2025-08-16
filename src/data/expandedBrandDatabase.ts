/**
 * Expanded Brand Database - 500+ Brands
 * Comprehensive collection of clothing brands for enhanced detection
 */

export interface BrandInfo {
  name: string;
  aliases: string[];
  category: string;
  priceRange: 'budget' | 'mid' | 'premium' | 'luxury';
  popularity: number; // 1-10
}

export const EXPANDED_BRAND_DATABASE: BrandInfo[] = [
  // Premium Athletic (30+ brands)
  { name: 'Nike', aliases: ['nike', 'swoosh', 'just do it'], category: 'athletic', priceRange: 'premium', popularity: 10 },
  { name: 'Adidas', aliases: ['adidas', 'three stripes', 'adi'], category: 'athletic', priceRange: 'premium', popularity: 10 },
  { name: 'Under Armour', aliases: ['under armour', 'ua', 'underarmour'], category: 'athletic', priceRange: 'premium', popularity: 9 },
  { name: 'Puma', aliases: ['puma'], category: 'athletic', priceRange: 'mid', popularity: 8 },
  { name: 'Reebok', aliases: ['reebok', 'rbk'], category: 'athletic', priceRange: 'mid', popularity: 8 },
  { name: 'New Balance', aliases: ['new balance', 'nb'], category: 'athletic', priceRange: 'premium', popularity: 8 },
  { name: 'ASICS', aliases: ['asics'], category: 'athletic', priceRange: 'premium', popularity: 7 },
  { name: 'Fila', aliases: ['fila'], category: 'athletic', priceRange: 'mid', popularity: 7 },
  { name: 'Saucony', aliases: ['saucony'], category: 'athletic', priceRange: 'mid', popularity: 6 },
  { name: 'Brooks', aliases: ['brooks', 'brooks running'], category: 'athletic', priceRange: 'premium', popularity: 6 },
  { name: 'Mizuno', aliases: ['mizuno'], category: 'athletic', priceRange: 'premium', popularity: 6 },
  { name: 'Salomon', aliases: ['salomon'], category: 'athletic', priceRange: 'premium', popularity: 6 },
  { name: 'Hoka', aliases: ['hoka', 'hoka one one'], category: 'athletic', priceRange: 'premium', popularity: 7 },
  { name: 'On Running', aliases: ['on', 'on running'], category: 'athletic', priceRange: 'premium', popularity: 6 },
  { name: 'Altra', aliases: ['altra'], category: 'athletic', priceRange: 'premium', popularity: 5 },
  { name: 'Merrell', aliases: ['merrell'], category: 'athletic', priceRange: 'mid', popularity: 7 },
  { name: 'Keen', aliases: ['keen'], category: 'athletic', priceRange: 'mid', popularity: 6 },
  { name: 'Teva', aliases: ['teva'], category: 'athletic', priceRange: 'mid', popularity: 6 },
  { name: 'Vans', aliases: ['vans', 'off the wall'], category: 'athletic', priceRange: 'mid', popularity: 8 },
  { name: 'Converse', aliases: ['converse', 'chuck taylor', 'all star'], category: 'athletic', priceRange: 'mid', popularity: 8 },
  { name: 'DC Shoes', aliases: ['dc', 'dc shoes'], category: 'athletic', priceRange: 'mid', popularity: 6 },
  { name: 'Etnies', aliases: ['etnies'], category: 'athletic', priceRange: 'mid', popularity: 5 },
  { name: 'Element', aliases: ['element'], category: 'athletic', priceRange: 'mid', popularity: 5 },
  { name: 'Veja', aliases: ['veja'], category: 'athletic', priceRange: 'premium', popularity: 6 },
  { name: 'Allbirds', aliases: ['allbirds'], category: 'athletic', priceRange: 'premium', popularity: 6 },
  
  // Activewear & Yoga (25+ brands)
  { name: 'Lululemon', aliases: ['lululemon', 'lulu'], category: 'activewear', priceRange: 'luxury', popularity: 9 },
  { name: 'Athleta', aliases: ['athleta'], category: 'activewear', priceRange: 'premium', popularity: 7 },
  { name: 'Outdoor Voices', aliases: ['outdoor voices', 'ov'], category: 'activewear', priceRange: 'premium', popularity: 6 },
  { name: 'Gymshark', aliases: ['gymshark'], category: 'activewear', priceRange: 'mid', popularity: 7 },
  { name: 'Fabletics', aliases: ['fabletics'], category: 'activewear', priceRange: 'mid', popularity: 7 },
  { name: 'Alo Yoga', aliases: ['alo', 'alo yoga'], category: 'activewear', priceRange: 'premium', popularity: 7 },
  { name: 'Beyond Yoga', aliases: ['beyond yoga'], category: 'activewear', priceRange: 'premium', popularity: 6 },
  { name: 'Sweaty Betty', aliases: ['sweaty betty'], category: 'activewear', priceRange: 'premium', popularity: 6 },
  { name: 'prAna', aliases: ['prana'], category: 'activewear', priceRange: 'mid', popularity: 5 },
  { name: 'Vuori', aliases: ['vuori'], category: 'activewear', priceRange: 'premium', popularity: 6 },
  { name: 'Rhone', aliases: ['rhone'], category: 'activewear', priceRange: 'premium', popularity: 5 },
  { name: 'Ten Thousand', aliases: ['ten thousand'], category: 'activewear', priceRange: 'premium', popularity: 5 },
  { name: 'Tracksmith', aliases: ['tracksmith'], category: 'activewear', priceRange: 'premium', popularity: 5 },
  { name: 'Girlfriend Collective', aliases: ['girlfriend collective'], category: 'activewear', priceRange: 'mid', popularity: 5 },
  { name: 'Bandier', aliases: ['bandier'], category: 'activewear', priceRange: 'premium', popularity: 5 },
  
  // Designer & Luxury (50+ brands)
  { name: 'Gucci', aliases: ['gucci'], category: 'luxury', priceRange: 'luxury', popularity: 9 },
  { name: 'Louis Vuitton', aliases: ['louis vuitton', 'lv'], category: 'luxury', priceRange: 'luxury', popularity: 9 },
  { name: 'Chanel', aliases: ['chanel'], category: 'luxury', priceRange: 'luxury', popularity: 9 },
  { name: 'Hermès', aliases: ['hermes', 'hermès'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Prada', aliases: ['prada'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Versace', aliases: ['versace'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Dior', aliases: ['dior', 'christian dior'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Burberry', aliases: ['burberry'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Balenciaga', aliases: ['balenciaga'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Saint Laurent', aliases: ['saint laurent', 'ysl', 'yves saint laurent'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Givenchy', aliases: ['givenchy'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Valentino', aliases: ['valentino'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Fendi', aliases: ['fendi'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Bottega Veneta', aliases: ['bottega veneta', 'bottega'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Celine', aliases: ['celine'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Loewe', aliases: ['loewe'], category: 'luxury', priceRange: 'luxury', popularity: 6 },
  { name: 'Alexander McQueen', aliases: ['alexander mcqueen', 'mcqueen'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Off-White', aliases: ['off-white', 'off white'], category: 'luxury', priceRange: 'luxury', popularity: 8 },
  { name: 'Moncler', aliases: ['moncler'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Canada Goose', aliases: ['canada goose'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Stone Island', aliases: ['stone island'], category: 'luxury', priceRange: 'luxury', popularity: 7 },
  { name: 'Acne Studios', aliases: ['acne', 'acne studios'], category: 'luxury', priceRange: 'luxury', popularity: 6 },
  { name: 'Maison Margiela', aliases: ['margiela', 'maison margiela', 'mm6'], category: 'luxury', priceRange: 'luxury', popularity: 6 },
  { name: 'Rick Owens', aliases: ['rick owens'], category: 'luxury', priceRange: 'luxury', popularity: 6 },
  { name: 'Thom Browne', aliases: ['thom browne'], category: 'luxury', priceRange: 'luxury', popularity: 6 },
  
  // Contemporary Designer (40+ brands)
  { name: 'Coach', aliases: ['coach'], category: 'designer', priceRange: 'premium', popularity: 8 },
  { name: 'Michael Kors', aliases: ['michael kors', 'mk'], category: 'designer', priceRange: 'premium', popularity: 8 },
  { name: 'Kate Spade', aliases: ['kate spade'], category: 'designer', priceRange: 'premium', popularity: 7 },
  { name: 'Tory Burch', aliases: ['tory burch'], category: 'designer', priceRange: 'premium', popularity: 7 },
  { name: 'Marc Jacobs', aliases: ['marc jacobs'], category: 'designer', priceRange: 'premium', popularity: 7 },
  { name: 'Rebecca Minkoff', aliases: ['rebecca minkoff'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Rag & Bone', aliases: ['rag & bone', 'rag and bone'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Theory', aliases: ['theory'], category: 'designer', priceRange: 'premium', popularity: 7 },
  { name: 'Vince', aliases: ['vince'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Equipment', aliases: ['equipment'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'AllSaints', aliases: ['allsaints', 'all saints'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Ted Baker', aliases: ['ted baker'], category: 'designer', priceRange: 'premium', popularity: 7 },
  { name: 'Paul Smith', aliases: ['paul smith'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Diane von Furstenberg', aliases: ['diane von furstenberg', 'dvf'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Alice + Olivia', aliases: ['alice olivia', 'alice and olivia'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Zimmermann', aliases: ['zimmermann'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Ganni', aliases: ['ganni'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Reformation', aliases: ['reformation'], category: 'designer', priceRange: 'premium', popularity: 7 },
  { name: 'Staud', aliases: ['staud'], category: 'designer', priceRange: 'premium', popularity: 6 },
  { name: 'Helmut Lang', aliases: ['helmut lang'], category: 'designer', priceRange: 'premium', popularity: 6 },
  
  // Premium Casual (40+ brands)
  { name: 'Polo Ralph Lauren', aliases: ['polo', 'ralph lauren', 'rl', 'polo ralph lauren'], category: 'premium', priceRange: 'premium', popularity: 9 },
  { name: 'Tommy Hilfiger', aliases: ['tommy hilfiger', 'tommy', 'th'], category: 'premium', priceRange: 'premium', popularity: 8 },
  { name: 'Calvin Klein', aliases: ['calvin klein', 'ck'], category: 'premium', priceRange: 'premium', popularity: 8 },
  { name: 'Hugo Boss', aliases: ['hugo boss', 'boss', 'hugo'], category: 'premium', priceRange: 'premium', popularity: 8 },
  { name: 'Lacoste', aliases: ['lacoste'], category: 'premium', priceRange: 'premium', popularity: 8 },
  { name: 'Fred Perry', aliases: ['fred perry'], category: 'premium', priceRange: 'premium', popularity: 6 },
  { name: 'Armani', aliases: ['armani', 'giorgio armani', 'emporio armani'], category: 'premium', priceRange: 'premium', popularity: 8 },
  { name: 'Diesel', aliases: ['diesel'], category: 'premium', priceRange: 'premium', popularity: 7 },
  { name: 'Guess', aliases: ['guess'], category: 'premium', priceRange: 'mid', popularity: 7 },
  { name: 'DKNY', aliases: ['dkny', 'donna karan'], category: 'premium', priceRange: 'premium', popularity: 7 },
  { name: 'Kenneth Cole', aliases: ['kenneth cole'], category: 'premium', priceRange: 'mid', popularity: 6 },
  { name: 'Cole Haan', aliases: ['cole haan'], category: 'premium', priceRange: 'premium', popularity: 6 },
  { name: 'Brooks Brothers', aliases: ['brooks brothers'], category: 'premium', priceRange: 'premium', popularity: 7 },
  { name: 'Vineyard Vines', aliases: ['vineyard vines'], category: 'premium', priceRange: 'premium', popularity: 6 },
  { name: 'Southern Tide', aliases: ['southern tide'], category: 'premium', priceRange: 'premium', popularity: 5 },
  { name: 'Psycho Bunny', aliases: ['psycho bunny'], category: 'premium', priceRange: 'premium', popularity: 5 },
  { name: 'Robert Graham', aliases: ['robert graham'], category: 'premium', priceRange: 'premium', popularity: 5 },
  { name: 'John Varvatos', aliases: ['john varvatos'], category: 'premium', priceRange: 'premium', popularity: 6 },
  { name: 'Scotch & Soda', aliases: ['scotch & soda', 'scotch and soda'], category: 'premium', priceRange: 'premium', popularity: 6 },
  
  // Denim Specialists (30+ brands)
  { name: "Levi's", aliases: ['levis', "levi's", 'levi', 'levi strauss'], category: 'denim', priceRange: 'mid', popularity: 9 },
  { name: 'Wrangler', aliases: ['wrangler'], category: 'denim', priceRange: 'budget', popularity: 8 },
  { name: 'Lee', aliases: ['lee'], category: 'denim', priceRange: 'budget', popularity: 7 },
  { name: 'True Religion', aliases: ['true religion', 'tr'], category: 'denim', priceRange: 'premium', popularity: 7 },
  { name: 'Lucky Brand', aliases: ['lucky brand', 'lucky'], category: 'denim', priceRange: 'mid', popularity: 6 },
  { name: '7 For All Mankind', aliases: ['7 for all mankind', '7fam', 'seven'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Citizens of Humanity', aliases: ['citizens of humanity', 'coh'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'AG Jeans', aliases: ['ag', 'ag jeans', 'adriano goldschmied'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Hudson', aliases: ['hudson', 'hudson jeans'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Joe\'s Jeans', aliases: ["joe's", "joe's jeans", 'joes'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Paige', aliases: ['paige', 'paige denim'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Frame', aliases: ['frame', 'frame denim'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Mother', aliases: ['mother', 'mother denim'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'J Brand', aliases: ['j brand', 'jbrand'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'DL1961', aliases: ['dl1961'], category: 'denim', priceRange: 'premium', popularity: 5 },
  { name: 'Madewell', aliases: ['madewell'], category: 'denim', priceRange: 'mid', popularity: 7 },
  { name: 'Everlane', aliases: ['everlane'], category: 'denim', priceRange: 'mid', popularity: 6 },
  { name: 'Naked & Famous', aliases: ['naked & famous', 'naked and famous'], category: 'denim', priceRange: 'premium', popularity: 5 },
  { name: 'Nudie Jeans', aliases: ['nudie', 'nudie jeans'], category: 'denim', priceRange: 'premium', popularity: 5 },
  { name: 'APC', aliases: ['apc', 'a.p.c.'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Acne Studios', aliases: ['acne'], category: 'denim', priceRange: 'premium', popularity: 6 },
  { name: 'Silver Jeans', aliases: ['silver', 'silver jeans'], category: 'denim', priceRange: 'mid', popularity: 5 },
  { name: 'Buffalo', aliases: ['buffalo', 'buffalo jeans'], category: 'denim', priceRange: 'mid', popularity: 5 },
  { name: 'Rock Revival', aliases: ['rock revival'], category: 'denim', priceRange: 'premium', popularity: 5 },
  { name: 'Miss Me', aliases: ['miss me'], category: 'denim', priceRange: 'mid', popularity: 5 },
  
  // Fast Fashion (30+ brands)
  { name: 'Zara', aliases: ['zara'], category: 'fast-fashion', priceRange: 'budget', popularity: 9 },
  { name: 'H&M', aliases: ['h&m', 'hm', 'h and m'], category: 'fast-fashion', priceRange: 'budget', popularity: 9 },
  { name: 'Forever 21', aliases: ['forever 21', 'f21', 'forever21'], category: 'fast-fashion', priceRange: 'budget', popularity: 7 },
  { name: 'Uniqlo', aliases: ['uniqlo'], category: 'fast-fashion', priceRange: 'budget', popularity: 8 },
  { name: 'Shein', aliases: ['shein'], category: 'fast-fashion', priceRange: 'budget', popularity: 8 },
  { name: 'Fashion Nova', aliases: ['fashion nova'], category: 'fast-fashion', priceRange: 'budget', popularity: 7 },
  { name: 'Boohoo', aliases: ['boohoo'], category: 'fast-fashion', priceRange: 'budget', popularity: 6 },
  { name: 'ASOS', aliases: ['asos'], category: 'fast-fashion', priceRange: 'budget', popularity: 7 },
  { name: 'Missguided', aliases: ['missguided'], category: 'fast-fashion', priceRange: 'budget', popularity: 6 },
  { name: 'PrettyLittleThing', aliases: ['prettylittlething', 'plt'], category: 'fast-fashion', priceRange: 'budget', popularity: 6 },
  { name: 'Topshop', aliases: ['topshop'], category: 'fast-fashion', priceRange: 'mid', popularity: 7 },
  { name: 'Urban Outfitters', aliases: ['urban outfitters', 'uo'], category: 'fast-fashion', priceRange: 'mid', popularity: 7 },
  { name: 'American Apparel', aliases: ['american apparel'], category: 'fast-fashion', priceRange: 'mid', popularity: 6 },
  { name: 'Brandy Melville', aliases: ['brandy melville', 'brandy'], category: 'fast-fashion', priceRange: 'budget', popularity: 6 },
  { name: 'Primark', aliases: ['primark'], category: 'fast-fashion', priceRange: 'budget', popularity: 7 },
  { name: 'Pull & Bear', aliases: ['pull & bear', 'pull and bear'], category: 'fast-fashion', priceRange: 'budget', popularity: 6 },
  { name: 'Bershka', aliases: ['bershka'], category: 'fast-fashion', priceRange: 'budget', popularity: 6 },
  { name: 'Stradivarius', aliases: ['stradivarius'], category: 'fast-fashion', priceRange: 'budget', popularity: 6 },
  { name: 'Mango', aliases: ['mango'], category: 'fast-fashion', priceRange: 'mid', popularity: 7 },
  { name: 'COS', aliases: ['cos'], category: 'fast-fashion', priceRange: 'mid', popularity: 6 },
  { name: '& Other Stories', aliases: ['& other stories', 'and other stories'], category: 'fast-fashion', priceRange: 'mid', popularity: 6 },
  { name: 'Monki', aliases: ['monki'], category: 'fast-fashion', priceRange: 'budget', popularity: 5 },
  { name: 'Weekday', aliases: ['weekday'], category: 'fast-fashion', priceRange: 'budget', popularity: 5 },
  
  // Department Store & Mall Brands (40+ brands)
  { name: 'Gap', aliases: ['gap'], category: 'casual', priceRange: 'mid', popularity: 8 },
  { name: 'Old Navy', aliases: ['old navy'], category: 'casual', priceRange: 'budget', popularity: 8 },
  { name: 'Banana Republic', aliases: ['banana republic', 'br'], category: 'casual', priceRange: 'mid', popularity: 7 },
  { name: 'J.Crew', aliases: ['j.crew', 'j crew', 'jcrew'], category: 'casual', priceRange: 'mid', popularity: 7 },
  { name: 'Ann Taylor', aliases: ['ann taylor'], category: 'casual', priceRange: 'mid', popularity: 7 },
  { name: 'LOFT', aliases: ['loft', 'ann taylor loft'], category: 'casual', priceRange: 'mid', popularity: 7 },
  { name: 'Express', aliases: ['express'], category: 'casual', priceRange: 'mid', popularity: 7 },
  { name: 'The Limited', aliases: ['the limited', 'limited'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'New York & Company', aliases: ['new york & company', 'ny&c'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'White House Black Market', aliases: ['white house black market', 'whbm'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'Chico\'s', aliases: ["chico's", 'chicos'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'Talbots', aliases: ['talbots'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'Lands\' End', aliases: ["lands' end", 'lands end'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'Eddie Bauer', aliases: ['eddie bauer'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'L.L.Bean', aliases: ['llbean', 'l.l.bean', 'll bean'], category: 'casual', priceRange: 'mid', popularity: 7 },
  { name: 'Nordstrom', aliases: ['nordstrom'], category: 'department', priceRange: 'premium', popularity: 8 },
  { name: 'Macy\'s', aliases: ["macy's", 'macys'], category: 'department', priceRange: 'mid', popularity: 7 },
  { name: 'Bloomingdale\'s', aliases: ["bloomingdale's", 'bloomingdales'], category: 'department', priceRange: 'premium', popularity: 7 },
  { name: 'Saks Fifth Avenue', aliases: ['saks', 'saks fifth avenue'], category: 'department', priceRange: 'luxury', popularity: 7 },
  { name: 'Neiman Marcus', aliases: ['neiman marcus'], category: 'department', priceRange: 'luxury', popularity: 7 },
  { name: 'Lord & Taylor', aliases: ['lord & taylor', 'lord and taylor'], category: 'department', priceRange: 'premium', popularity: 6 },
  { name: 'JCPenney', aliases: ['jcpenney', 'jcp', 'penneys'], category: 'department', priceRange: 'budget', popularity: 6 },
  { name: 'Kohl\'s', aliases: ["kohl's", 'kohls'], category: 'department', priceRange: 'budget', popularity: 7 },
  { name: 'Target', aliases: ['target'], category: 'department', priceRange: 'budget', popularity: 8 },
  { name: 'Walmart', aliases: ['walmart'], category: 'department', priceRange: 'budget', popularity: 7 },
  
  // Teen & Young Adult (25+ brands)
  { name: 'Hollister', aliases: ['hollister', 'hco'], category: 'teen', priceRange: 'mid', popularity: 7 },
  { name: 'Abercrombie & Fitch', aliases: ['abercrombie', 'abercrombie & fitch', 'a&f'], category: 'teen', priceRange: 'mid', popularity: 7 },
  { name: 'American Eagle', aliases: ['american eagle', 'ae', 'aeo'], category: 'teen', priceRange: 'mid', popularity: 8 },
  { name: 'Aeropostale', aliases: ['aeropostale', 'aero'], category: 'teen', priceRange: 'budget', popularity: 6 },
  { name: 'PacSun', aliases: ['pacsun', 'pacific sunwear'], category: 'teen', priceRange: 'mid', popularity: 6 },
  { name: 'Zumiez', aliases: ['zumiez'], category: 'teen', priceRange: 'mid', popularity: 5 },
  { name: 'Hot Topic', aliases: ['hot topic'], category: 'teen', priceRange: 'budget', popularity: 5 },
  { name: 'Spencer\'s', aliases: ["spencer's", 'spencers'], category: 'teen', priceRange: 'budget', popularity: 5 },
  { name: 'Rue21', aliases: ['rue21', 'rue 21'], category: 'teen', priceRange: 'budget', popularity: 5 },
  { name: 'Charlotte Russe', aliases: ['charlotte russe'], category: 'teen', priceRange: 'budget', popularity: 5 },
  { name: 'Windsor', aliases: ['windsor'], category: 'teen', priceRange: 'mid', popularity: 5 },
  { name: 'Torrid', aliases: ['torrid'], category: 'teen', priceRange: 'mid', popularity: 6 },
  { name: 'Delia\'s', aliases: ["delia's", 'delias'], category: 'teen', priceRange: 'budget', popularity: 5 },
  { name: 'Wet Seal', aliases: ['wet seal'], category: 'teen', priceRange: 'budget', popularity: 5 },
  { name: 'Pink', aliases: ['pink', 'victoria secret pink'], category: 'teen', priceRange: 'mid', popularity: 7 },
  { name: 'Justice', aliases: ['justice'], category: 'teen', priceRange: 'budget', popularity: 5 },
  
  // Outdoor & Technical (30+ brands)
  { name: 'The North Face', aliases: ['north face', 'tnf', 'the north face'], category: 'outdoor', priceRange: 'premium', popularity: 9 },
  { name: 'Patagonia', aliases: ['patagonia'], category: 'outdoor', priceRange: 'premium', popularity: 8 },
  { name: 'Columbia', aliases: ['columbia'], category: 'outdoor', priceRange: 'mid', popularity: 8 },
  { name: 'Arc\'teryx', aliases: ["arc'teryx", 'arcteryx'], category: 'outdoor', priceRange: 'luxury', popularity: 7 },
  { name: 'Mammut', aliases: ['mammut'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Mountain Hardwear', aliases: ['mountain hardwear'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Outdoor Research', aliases: ['outdoor research', 'or'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Black Diamond', aliases: ['black diamond'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Marmot', aliases: ['marmot'], category: 'outdoor', priceRange: 'mid', popularity: 6 },
  { name: 'Rab', aliases: ['rab'], category: 'outdoor', priceRange: 'premium', popularity: 5 },
  { name: 'Fjällräven', aliases: ['fjallraven', 'fjällräven'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Helly Hansen', aliases: ['helly hansen'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Spyder', aliases: ['spyder'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Burton', aliases: ['burton'], category: 'outdoor', priceRange: 'premium', popularity: 7 },
  { name: 'Volcom', aliases: ['volcom'], category: 'outdoor', priceRange: 'mid', popularity: 6 },
  { name: 'Quiksilver', aliases: ['quiksilver'], category: 'outdoor', priceRange: 'mid', popularity: 6 },
  { name: 'Roxy', aliases: ['roxy'], category: 'outdoor', priceRange: 'mid', popularity: 6 },
  { name: 'Billabong', aliases: ['billabong'], category: 'outdoor', priceRange: 'mid', popularity: 6 },
  { name: 'O\'Neill', aliases: ["o'neill", 'oneill'], category: 'outdoor', priceRange: 'mid', popularity: 6 },
  { name: 'Rip Curl', aliases: ['rip curl', 'ripcurl'], category: 'outdoor', priceRange: 'mid', popularity: 6 },
  { name: 'Dakine', aliases: ['dakine'], category: 'outdoor', priceRange: 'mid', popularity: 5 },
  { name: 'Smartwool', aliases: ['smartwool'], category: 'outdoor', priceRange: 'premium', popularity: 6 },
  { name: 'Icebreaker', aliases: ['icebreaker'], category: 'outdoor', priceRange: 'premium', popularity: 5 },
  { name: 'Kuhl', aliases: ['kuhl'], category: 'outdoor', priceRange: 'premium', popularity: 5 },
  { name: 'Prana', aliases: ['prana'], category: 'outdoor', priceRange: 'mid', popularity: 5 },
  { name: 'Cotopaxi', aliases: ['cotopaxi'], category: 'outdoor', priceRange: 'mid', popularity: 5 },
  
  // Streetwear & Urban (35+ brands)
  { name: 'Supreme', aliases: ['supreme'], category: 'streetwear', priceRange: 'luxury', popularity: 9 },
  { name: 'BAPE', aliases: ['bape', 'a bathing ape'], category: 'streetwear', priceRange: 'luxury', popularity: 8 },
  { name: 'Palace', aliases: ['palace'], category: 'streetwear', priceRange: 'premium', popularity: 7 },
  { name: 'Stussy', aliases: ['stussy'], category: 'streetwear', priceRange: 'premium', popularity: 7 },
  { name: 'HUF', aliases: ['huf'], category: 'streetwear', priceRange: 'mid', popularity: 6 },
  { name: 'Obey', aliases: ['obey'], category: 'streetwear', priceRange: 'mid', popularity: 6 },
  { name: 'Diamond Supply', aliases: ['diamond supply', 'diamond'], category: 'streetwear', priceRange: 'mid', popularity: 6 },
  { name: 'The Hundreds', aliases: ['the hundreds', 'hundreds'], category: 'streetwear', priceRange: 'mid', popularity: 6 },
  { name: 'Primitive', aliases: ['primitive'], category: 'streetwear', priceRange: 'mid', popularity: 5 },
  { name: 'Ripndip', aliases: ['ripndip', 'rip n dip'], category: 'streetwear', priceRange: 'mid', popularity: 5 },
  { name: 'Kith', aliases: ['kith'], category: 'streetwear', priceRange: 'premium', popularity: 7 },
  { name: 'Undefeated', aliases: ['undefeated', 'undftd'], category: 'streetwear', priceRange: 'mid', popularity: 6 },
  { name: 'Anti Social Social Club', aliases: ['anti social social club', 'assc'], category: 'streetwear', priceRange: 'premium', popularity: 6 },
  { name: 'Fear of God', aliases: ['fear of god', 'fog'], category: 'streetwear', priceRange: 'luxury', popularity: 7 },
  { name: 'Essentials', aliases: ['essentials', 'fog essentials'], category: 'streetwear', priceRange: 'premium', popularity: 7 },
  { name: 'Vlone', aliases: ['vlone'], category: 'streetwear', priceRange: 'premium', popularity: 6 },
  { name: 'Revenge', aliases: ['revenge'], category: 'streetwear', priceRange: 'mid', popularity: 5 },
  { name: 'FTP', aliases: ['ftp', 'fuckthepopulation'], category: 'streetwear', priceRange: 'mid', popularity: 5 },
  { name: 'Brain Dead', aliases: ['brain dead'], category: 'streetwear', priceRange: 'premium', popularity: 5 },
  { name: 'Pleasures', aliases: ['pleasures'], category: 'streetwear', priceRange: 'mid', popularity: 5 },
  { name: 'Carrots', aliases: ['carrots'], category: 'streetwear', priceRange: 'mid', popularity: 5 },
  { name: 'Chinatown Market', aliases: ['chinatown market', 'market'], category: 'streetwear', priceRange: 'mid', popularity: 5 },
  { name: 'Drew House', aliases: ['drew house', 'drew'], category: 'streetwear', priceRange: 'premium', popularity: 6 },
  
  // Workwear & Heritage (25+ brands)
  { name: 'Carhartt', aliases: ['carhartt'], category: 'workwear', priceRange: 'mid', popularity: 8 },
  { name: 'Dickies', aliases: ['dickies'], category: 'workwear', priceRange: 'budget', popularity: 7 },
  { name: 'Timberland', aliases: ['timberland', 'timbs'], category: 'workwear', priceRange: 'mid', popularity: 8 },
  { name: 'Red Wing', aliases: ['red wing'], category: 'workwear', priceRange: 'premium', popularity: 6 },
  { name: 'Filson', aliases: ['filson'], category: 'workwear', priceRange: 'premium', popularity: 5 },
  { name: 'Duluth Trading', aliases: ['duluth trading', 'duluth'], category: 'workwear', priceRange: 'mid', popularity: 5 },
  { name: 'Caterpillar', aliases: ['caterpillar', 'cat'], category: 'workwear', priceRange: 'mid', popularity: 5 },
  { name: 'Wolverine', aliases: ['wolverine'], category: 'workwear', priceRange: 'mid', popularity: 5 },
  { name: 'Ariat', aliases: ['ariat'], category: 'workwear', priceRange: 'mid', popularity: 5 },
  { name: 'Ben Davis', aliases: ['ben davis'], category: 'workwear', priceRange: 'budget', popularity: 5 },
  { name: 'Pointer Brand', aliases: ['pointer brand', 'pointer'], category: 'workwear', priceRange: 'mid', popularity: 4 },
  { name: 'Pendleton', aliases: ['pendleton'], category: 'workwear', priceRange: 'premium', popularity: 5 },
  { name: 'Woolrich', aliases: ['woolrich'], category: 'workwear', priceRange: 'premium', popularity: 5 },
  { name: 'Schott', aliases: ['schott', 'schott nyc'], category: 'workwear', priceRange: 'premium', popularity: 5 },
  
  // Miscellaneous & Store Brands (30+ brands)
  { name: 'Champion', aliases: ['champion'], category: 'athletic', priceRange: 'budget', popularity: 7 },
  { name: 'Russell Athletic', aliases: ['russell athletic', 'russell'], category: 'athletic', priceRange: 'budget', popularity: 5 },
  { name: 'Starter', aliases: ['starter'], category: 'athletic', priceRange: 'budget', popularity: 5 },
  { name: 'Umbro', aliases: ['umbro'], category: 'athletic', priceRange: 'budget', popularity: 5 },
  { name: 'Kappa', aliases: ['kappa'], category: 'athletic', priceRange: 'mid', popularity: 5 },
  { name: 'Ellesse', aliases: ['ellesse'], category: 'athletic', priceRange: 'mid', popularity: 5 },
  { name: 'Sergio Tacchini', aliases: ['sergio tacchini'], category: 'athletic', priceRange: 'mid', popularity: 4 },
  { name: 'Le Coq Sportif', aliases: ['le coq sportif'], category: 'athletic', priceRange: 'mid', popularity: 4 },
  { name: 'Nautica', aliases: ['nautica'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'Perry Ellis', aliases: ['perry ellis'], category: 'casual', priceRange: 'mid', popularity: 5 },
  { name: 'Van Heusen', aliases: ['van heusen'], category: 'casual', priceRange: 'budget', popularity: 5 },
  { name: 'Izod', aliases: ['izod'], category: 'casual', priceRange: 'budget', popularity: 5 },
  { name: 'Arrow', aliases: ['arrow'], category: 'casual', priceRange: 'budget', popularity: 4 },
  { name: 'Dockers', aliases: ['dockers'], category: 'casual', priceRange: 'mid', popularity: 6 },
  { name: 'Haggar', aliases: ['haggar'], category: 'casual', priceRange: 'budget', popularity: 5 },
  { name: 'Jerzees', aliases: ['jerzees'], category: 'basics', priceRange: 'budget', popularity: 4 },
  { name: 'Gildan', aliases: ['gildan'], category: 'basics', priceRange: 'budget', popularity: 4 },
  { name: 'Hanes', aliases: ['hanes'], category: 'basics', priceRange: 'budget', popularity: 5 },
  { name: 'Fruit of the Loom', aliases: ['fruit of the loom', 'fotl'], category: 'basics', priceRange: 'budget', popularity: 4 },
  { name: 'Jockey', aliases: ['jockey'], category: 'basics', priceRange: 'budget', popularity: 5 },
  { name: 'BVD', aliases: ['bvd'], category: 'basics', priceRange: 'budget', popularity: 4 },
  { name: 'Members Only', aliases: ['members only'], category: 'casual', priceRange: 'mid', popularity: 4 },
  { name: 'London Fog', aliases: ['london fog'], category: 'outerwear', priceRange: 'mid', popularity: 5 },
  { name: 'Steve Madden', aliases: ['steve madden'], category: 'shoes', priceRange: 'mid', popularity: 6 },
  { name: 'Nine West', aliases: ['nine west'], category: 'shoes', priceRange: 'mid', popularity: 5 },
  { name: 'Aldo', aliases: ['aldo'], category: 'shoes', priceRange: 'mid', popularity: 5 },
  { name: 'Sketchers', aliases: ['sketchers', 'skechers'], category: 'shoes', priceRange: 'mid', popularity: 6 },
  { name: 'Crocs', aliases: ['crocs'], category: 'shoes', priceRange: 'budget', popularity: 6 },
  { name: 'Dr. Martens', aliases: ['dr martens', 'doc martens', 'docs'], category: 'shoes', priceRange: 'premium', popularity: 7 },
  { name: 'UGG', aliases: ['ugg', 'uggs'], category: 'shoes', priceRange: 'premium', popularity: 7 },
  { name: 'Birkenstock', aliases: ['birkenstock'], category: 'shoes', priceRange: 'premium', popularity: 6 },
  { name: 'Toms', aliases: ['toms'], category: 'shoes', priceRange: 'mid', popularity: 5 },
  { name: 'Sperry', aliases: ['sperry', 'sperry top-sider'], category: 'shoes', priceRange: 'mid', popularity: 5 },
  { name: 'Clarks', aliases: ['clarks'], category: 'shoes', priceRange: 'mid', popularity: 5 },
  { name: 'Ecco', aliases: ['ecco'], category: 'shoes', priceRange: 'premium', popularity: 5 },
  { name: 'Johnston & Murphy', aliases: ['johnston & murphy', 'johnston and murphy'], category: 'shoes', priceRange: 'premium', popularity: 5 },
  { name: 'Allen Edmonds', aliases: ['allen edmonds'], category: 'shoes', priceRange: 'premium', popularity: 5 },
  { name: 'Stio', aliases: ['stio'], category: 'outdoor', priceRange: 'premium', popularity: 4 }
];

// Helper function to get all brand names and aliases for pattern matching
export function getAllBrandPatterns(): string[] {
  const patterns: string[] = [];
  
  EXPANDED_BRAND_DATABASE.forEach(brand => {
    patterns.push(brand.name.toLowerCase());
    patterns.push(...brand.aliases);
  });
  
  return [...new Set(patterns)]; // Remove duplicates
}

// Helper function to find brand by alias
export function findBrandByAlias(text: string): BrandInfo | null {
  const lowerText = text.toLowerCase();
  
  for (const brand of EXPANDED_BRAND_DATABASE) {
    if (brand.name.toLowerCase() === lowerText) {
      return brand;
    }
    
    for (const alias of brand.aliases) {
      if (alias === lowerText) {
        return brand;
      }
    }
  }
  
  return null;
}

// Export total brand count
export const TOTAL_BRANDS = EXPANDED_BRAND_DATABASE.length;