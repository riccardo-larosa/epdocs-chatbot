# RFP Bot Architecture & Collection Isolation

## 🏗️ Architecture Overview

The RFP bot uses a **multi-collection retrieval system** that provides comprehensive access to all relevant information while maintaining strict isolation between different bot types.

## 📊 Collection Structure

### **Storage Collections** (Separate & Isolated)
```
chat_docs_prod      - Main documentation (general product info)
openapis_prod       - API documentation (technical specs)
epcc_docs_prod      - EPCC documentation (commerce features)
rfp_docs_prod       - RFP-specific content (pricing, proposals, etc.)
```

### **Bot Access Patterns**
```
EPCC Bot (/ask)     → Only epcc_docs_prod collection
EPSM Bot (/ask)     → Only epsm_docs_prod collection
API Bot             → Only openapis_prod collection  
Main Bot (/ask)     → Only chat_docs_prod collection
RFP Bot (/rfp)      → 4 collections (RFP, EPCC, API, Main - NO EPSM)
```

## 🔒 Collection Isolation

### **No Cross-Contamination**
- **EPCC bot** cannot access RFP content (keeps EPCC docs clean)
- **EPSM bot** cannot access RFP content (keeps EPSM docs clean)
- **API bot** cannot access RFP content (keeps API docs clean)
- **Main bot** cannot access RFP content (keeps main docs clean)
- **RFP bot** can access 4 collections (RFP, EPCC, API, Main - excludes EPSM)

### **RFP Content Privacy**
- RFP-specific content (pricing, proposals, internal info) stays in `rfp_docs_prod`
- Other bots cannot accidentally expose sensitive RFP information
- RFP bot can still access public information from other collections

## 🔍 RFP Bot Multi-Collection Retrieval

### **Search Strategy**
When in RFP mode, the bot searches **4 collections** (EPSM excluded) with intelligent weighting:

1. **RFP Collection** (2.0x weight) - Highest priority
   - RFP-specific content
   - Pricing information
   - Proposal templates
   - Implementation timelines
   - Customer success stories

2. **EPCC Collection** (1.5x weight) - High priority
   - Commerce features
   - Product capabilities
   - Technical specifications
   - Integration details

3. **API Collection** (1.0x weight) - Standard priority
   - API documentation
   - Technical specifications
   - Integration guides

4. **Main Collection** (1.0x weight) - Standard priority
   - General product information
   - Company information
   - Basic documentation

### **No Embedding Regeneration**
- **Reuses existing embeddings** from all collections
- **No duplicate storage** of content
- **Efficient retrieval** across multiple sources
- **Real-time combination** of results

## 🚀 Environment Variables

```bash
# Collection Configuration
MONGODB_COLLECTION_NAME=chat_docs_prod
MONGODB_API_COLLECTION_NAME=openapis_prod
MONGODB_EPCC_COLLECTION_NAME=epcc_docs_prod
MONGODB_EPSM_COLLECTION_NAME=epsm_docs_prod
MONGODB_RFP_COLLECTION_NAME=rfp_docs_prod

# Required for all operations
MONGODB_CONNECTION_URI=your_mongodb_atlas_connection_string
MONGODB_DATABASE_NAME=your_database_name
OPENAI_API_KEY=your_openai_api_key
```

## 📝 Setup Commands

```bash
# Update each collection separately
npm run update-rfp          # RFP-specific content
npm run update-epcc-docs    # EPCC documentation
npm run update-epsm-docs    # EPSM documentation
npm run update-api-docs     # API documentation
npm run update-docs         # Main documentation
```

## 🎯 Benefits

### **For RFP Bot**
- ✅ Access to ALL relevant information
- ✅ RFP content gets highest priority
- ✅ EPCC features get elevated priority
- ✅ Technical specs from API docs
- ✅ General info from main docs
- ✅ Web scraping for current information

### **For Other Bots**
- ✅ Clean, focused content
- ✅ No RFP information pollution
- ✅ Fast, single-collection queries
- ✅ Maintains content boundaries

### **For Organization**
- ✅ Secure separation of sensitive content
- ✅ Efficient storage (no duplication)
- ✅ Easy content management
- ✅ Scalable architecture

## 💡 Example RFP Questions & Sources

| Question | Primary Source | Secondary Sources |
|----------|----------------|-------------------|
| "What are your pricing tiers?" | RFP collection | EPCC + web scraping |
| "What commerce features do you offer?" | EPCC collection | RFP + main docs |
| "What APIs are available?" | API collection | RFP content |
| "What is your implementation timeline?" | RFP collection | Main docs |
| "What security certifications do you have?" | All collections | Web scraping |

## 🔧 Technical Implementation

### **Multi-Collection Search Process**
1. **Identify mode** (RFP vs other)
2. **For RFP mode**: Search 4 collections in parallel
3. **Weight results** based on collection and content relevance
4. **Combine and sort** by relevance score
5. **Return top results** from all sources

### **Isolation Mechanism**
- **Mode-based routing** determines collection access
- **Single collection queries** for non-RFP modes
- **No shared state** between different bot types
- **Clean separation** maintained at query level

## ✅ Security & Privacy

- **RFP content isolated** in dedicated collection
- **Other bots cannot access** RFP-specific information
- **Public content remains accessible** to RFP bot
- **No data leakage** between bot types
- **Granular access control** through collection separation 