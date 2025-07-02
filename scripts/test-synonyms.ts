import { expandQueryWithSynonyms, containsSynonyms, getSuggestedTerms } from '../src/lib/synonymMappings';

// Test cases to verify synonym expansion works as expected
const testCases = [
  "I want to setup a salesforce connect",
  "How do I create a salesforce connector",
  "What is PXM?",
  "How to configure the admin panel",
  "Setting up authentication",
  "Create a promotion",
  "Building a cart integration",
  "Low-code solutions",
  "How to make a webhook",
  "API endpoint documentation",
  "Custom fields setup",
  "User management",
  "Organization structure",
  "Error handling",
  "Simple question without synonyms"
];

console.log('🔍 Testing Synonym Expansion System\n');
console.log('=' .repeat(80));

testCases.forEach((query, index) => {
  console.log(`\nTest ${index + 1}: "${query}"`);
  console.log('-'.repeat(60));
  
  const hasSynonyms = containsSynonyms(query);
  const expandedQuery = expandQueryWithSynonyms(query);
  const suggestions = getSuggestedTerms(query);
  
  console.log(`Contains synonyms: ${hasSynonyms}`);
  
  if (expandedQuery !== query) {
    console.log(`✅ Expanded: "${expandedQuery}"`);
  } else {
    console.log(`No expansion needed`);
  }
  
  if (suggestions.length > 0) {
    console.log(`💡 Suggested terms: ${suggestions.join(', ')}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('🎯 Testing the specific "salesforce connect" → "salesforce connector" case:');
console.log('-'.repeat(80));

const salesforceTest = "I want to setup a salesforce connect";
const salesforceExpanded = expandQueryWithSynonyms(salesforceTest);
const salesforceSuggestions = getSuggestedTerms(salesforceTest);

console.log(`Original: "${salesforceTest}"`);
console.log(`Expanded: "${salesforceExpanded}"`);
console.log(`Suggestions: ${salesforceSuggestions.join(', ')}`);

if (salesforceExpanded.includes('salesforce connector')) {
  console.log('✅ SUCCESS: "salesforce connect" correctly expanded to include "salesforce connector"');
} else {
  console.log('❌ FAILURE: "salesforce connect" was not expanded to include "salesforce connector"');
}

console.log('\n🚀 Synonym system test complete!'); 