// Synonym mappings for user query preprocessing
// This helps users find relevant content even when they use different terminology

interface SynonymGroup {
  canonical: string; // The preferred term used in documentation
  synonyms: string[]; // Alternative terms users might use
  context?: string; // Optional context for disambiguation
}

// Define synonym groups for Elastic Path terminology
const SYNONYM_GROUPS: SynonymGroup[] = [
  // Salesforce integration terms
  {
    canonical: "salesforce connector",
    synonyms: ["salesforce connect", "salesforce connection", "salesforce integration", "salesforce sync", "salesforce plugin"],
    context: "integration"
  },
  
  // Product Experience Manager variations
  {
    canonical: "Product Experience Manager",
    synonyms: ["PXM", "product manager", "product experience", "catalog management"],
    context: "product"
  },
  
  // Commerce Manager variations
  {
    canonical: "Commerce Manager",
    synonyms: ["admin panel", "admin interface", "management console", "backend", "dashboard"],
    context: "management"
  },
  
  // Promotions variations
  {
    canonical: "Promotions Builder",
    synonyms: ["promotion", "discount", "coupon", "promo code", "sale", "marketing campaign"],
    context: "promotions"
  },
  
  // Authentication variations
  {
    canonical: "authentication",
    synonyms: ["auth", "login", "signin", "sign in", "user access", "security"],
    context: "security"
  },
  
  // API variations
  {
    canonical: "API",
    synonyms: ["endpoint", "service", "web service", "REST", "integration point"],
    context: "technical"
  },
  
  // Cart and checkout variations
  {
    canonical: "cart",
    synonyms: ["shopping cart", "basket", "bag"],
    context: "commerce"
  },
  
  {
    canonical: "checkout",
    synonyms: ["purchase", "payment", "order completion", "buy"],
    context: "commerce"
  },
  
  // Custom data variations
  {
    canonical: "Flows",
    synonyms: ["custom fields", "metadata", "attributes", "extensions"],
    context: "data"
  },
  
  // Integration variations
  {
    canonical: "integration",
    synonyms: ["connector", "plugin", "extension", "connection", "sync", "webhook"],
    context: "technical"
  },
  
  // Catalog variations
  {
    canonical: "catalog",
    synonyms: ["product catalog", "inventory", "products", "merchandise"],
    context: "product"
  },
  
  // Customer variations
  {
    canonical: "customer",
    synonyms: ["user", "account", "buyer", "shopper"],
    context: "user"
  },
  
  // Organization variations
  {
    canonical: "organization",
    synonyms: ["org", "company", "business", "enterprise", "tenant"],
    context: "structure"
  },
  
  // Composer variations
  {
    canonical: "Composer",
    synonyms: ["low-code", "no-code", "builder", "workflow", "automation"],
    context: "development"
  },
  
  // Setup and configuration variations
  {
    canonical: "setup",
    synonyms: ["configure", "config", "install", "initialize", "create", "build"],
    context: "setup"
  },
  
  // Common action variations
  {
    canonical: "create",
    synonyms: ["make", "build", "setup", "add", "new", "generate"],
    context: "action"
  },
  
  {
    canonical: "configure",
    synonyms: ["setup", "config", "set up", "customize", "modify"],
    context: "action"
  },
  
  // Error handling variations
  {
    canonical: "error",
    synonyms: ["issue", "problem", "bug", "failure", "exception"],
    context: "troubleshooting"
  }
];

// Build lookup maps for efficient searching
const createSynonymMaps = () => {
  const synonymToCanonical = new Map<string, string>();
  const canonicalToSynonyms = new Map<string, string[]>();
  
  SYNONYM_GROUPS.forEach(group => {
    // Map each synonym to its canonical form
    group.synonyms.forEach(synonym => {
      synonymToCanonical.set(synonym.toLowerCase(), group.canonical);
    });
    
    // Map canonical to all its synonyms
    canonicalToSynonyms.set(group.canonical.toLowerCase(), group.synonyms);
  });
  
  return { synonymToCanonical, canonicalToSynonyms };
};

const { synonymToCanonical, canonicalToSynonyms } = createSynonymMaps();

/**
 * Expands a user query with relevant synonyms to improve search results
 * @param query - The original user query
 * @returns Enhanced query with synonyms
 */
export function expandQueryWithSynonyms(query: string): string {
  if (!query || query.trim().length === 0) {
    return query;
  }
  
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  const expandedTerms = new Set<string>();
  
  // Add original query
  expandedTerms.add(query);
  
  // Check for multi-word synonyms first (longer matches take priority)
  const sortedSynonyms = Array.from(synonymToCanonical.keys()).sort((a, b) => b.length - a.length);
  
  for (const synonym of sortedSynonyms) {
    if (lowerQuery.includes(synonym)) {
      const canonical = synonymToCanonical.get(synonym);
      if (canonical) {
        expandedTerms.add(canonical);
        
        // Also add related synonyms
        const relatedSynonyms = canonicalToSynonyms.get(canonical.toLowerCase());
        if (relatedSynonyms) {
          relatedSynonyms.forEach(related => {
            if (related.toLowerCase() !== synonym) {
              expandedTerms.add(related);
            }
          });
        }
      }
    }
  }
  
  // Check individual words
  words.forEach(word => {
    const canonical = synonymToCanonical.get(word);
    if (canonical) {
      expandedTerms.add(canonical);
      
      // Add a few key synonyms to broaden search
      const relatedSynonyms = canonicalToSynonyms.get(canonical.toLowerCase());
      if (relatedSynonyms && relatedSynonyms.length > 0) {
        // Add up to 2 most relevant synonyms to avoid query bloat
        relatedSynonyms.slice(0, 2).forEach(related => {
          expandedTerms.add(related);
        });
      }
    }
  });
  
  // Combine all terms into an enhanced query
  const expandedQuery = Array.from(expandedTerms).join(' ');
  
  // Log for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    if (expandedQuery !== query) {
      console.log(`🔍 Query expansion: "${query}" → "${expandedQuery}"`);
    }
  }
  
  return expandedQuery;
}

/**
 * Checks if a query contains any known synonyms
 * @param query - The user query to check
 * @returns boolean indicating if synonyms were found
 */
export function containsSynonyms(query: string): boolean {
  if (!query) return false;
  
  const lowerQuery = query.toLowerCase();
  
  // Check for exact synonym matches
  for (const synonym of synonymToCanonical.keys()) {
    if (lowerQuery.includes(synonym)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Gets suggested canonical terms for a given query
 * @param query - The user query
 * @returns Array of suggested canonical terms
 */
export function getSuggestedTerms(query: string): string[] {
  if (!query) return [];
  
  const lowerQuery = query.toLowerCase();
  const suggestions = new Set<string>();
  
  // Find all canonical terms that match
  for (const [synonym, canonical] of synonymToCanonical.entries()) {
    if (lowerQuery.includes(synonym)) {
      suggestions.add(canonical);
    }
  }
  
  return Array.from(suggestions);
}

export { SYNONYM_GROUPS }; 