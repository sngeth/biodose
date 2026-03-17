#!/usr/bin/env node

/**
 * BioDose - Daily Health Optimization Article Fetcher
 * Fetches peer-reviewed articles from PubMed focused on health optimization
 */

const https = require('https');
const fs = require('fs');

// Anthropic API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Health optimization keywords to search for
const KEYWORDS = [
  'sleep quality OR circadian rhythm',
  'cognitive performance OR nootropics',
  'longevity OR anti-aging',
  'metabolic health OR insulin sensitivity',
  'exercise recovery OR performance',
  'nutrition optimization OR dietary intervention',
  'stress reduction OR cortisol',
  'mitochondrial function OR energy metabolism'
];

// PubMed API configuration
const PUBMED_API = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const EMAIL = 'biodose@example.com'; // Required by PubMed

/**
 * Search PubMed for recent articles
 */
async function searchPubMed(query, maxResults = 10) {
  return new Promise((resolve, reject) => {
    // Search for articles from last 30 days, peer-reviewed, free full text
    const searchQuery = encodeURIComponent(
      `(${query}) AND (hasabstract[text]) AND (free full text[filter]) AND ("last 30 days"[PDat])`
    );

    const url = `${PUBMED_API}/esearch.fcgi?db=pubmed&term=${searchQuery}&retmax=${maxResults}&retmode=json&email=${EMAIL}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.esearchresult.idlist || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch article details by PubMed ID
 */
async function fetchArticleDetails(pmids) {
  return new Promise((resolve, reject) => {
    const ids = pmids.join(',');
    const url = `${PUBMED_API}/esummary.fcgi?db=pubmed&id=${ids}&retmode=json&email=${EMAIL}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result.result);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch full abstract for a PubMed ID
 */
async function fetchAbstract(pmid) {
  return new Promise((resolve, reject) => {
    const url = `${PUBMED_API}/efetch.fcgi?db=pubmed&id=${pmid}&retmode=xml&email=${EMAIL}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          // Extract abstract text from XML
          const abstractMatch = data.match(/<AbstractText[^>]*>([^<]+)<\/AbstractText>/i);
          if (abstractMatch) {
            resolve(abstractMatch[1].trim());
          } else {
            // Try to get it without tags
            const simpleMatch = data.match(/<Abstract>([\s\S]*?)<\/Abstract>/i);
            if (simpleMatch) {
              const text = simpleMatch[1]
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              resolve(text);
            } else {
              resolve('');
            }
          }
        } catch (e) {
          resolve('');
        }
      });
    }).on('error', () => resolve(''));
  });
}

/**
 * Score article relevance based on optimization focus
 */
function scoreArticle(article) {
  let score = 0;
  const text = (article.title + ' ' + article.abstract).toLowerCase();

  // Boost for optimization keywords
  const boostWords = ['improve', 'optimize', 'enhance', 'increase', 'boost', 'benefit', 'effectiveness', 'intervention', 'randomized'];
  boostWords.forEach(word => {
    if (text.includes(word)) score += 2;
  });

  // Boost for study types
  if (text.includes('randomized controlled trial')) score += 10;
  if (text.includes('meta-analysis')) score += 8;
  if (text.includes('systematic review')) score += 6;

  // Boost for recent
  const year = parseInt(article.pubdate);
  if (year >= 2024) score += 5;

  return score;
}

/**
 * Generate key takeaways using Claude
 */
async function generateKeyTakeaways(article) {
  return new Promise((resolve, reject) => {
    const prompt = `You are a health optimization expert analyzing peer-reviewed medical research for a general audience interested in evidence-based health improvements.

Study Title: ${article.title}
Journal: ${article.journal}
Authors: ${article.authors}
Publication Date: ${article.pubdate}
Abstract: ${article.abstract}

Generate 3-5 concise, actionable key takeaways from this study. Each takeaway should:
- Be specific and practical (not generic advice like "consult a doctor")
- Include quantitative details when available (e.g., "20 minutes daily", "improved by 15%")
- Be evidence-based and directly from the study findings
- Be understandable to a health-conscious general audience
- Focus on what was actually measured/found, not speculation

Return ONLY a JSON array of strings, like:
["Takeaway 1 with specific details", "Takeaway 2 with numbers/duration", "Takeaway 3 about the mechanism"]

IMPORTANT: Return ONLY the JSON array, no markdown formatting, no explanations.`;

    const requestData = JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.type === 'error') {
            reject(new Error(`API Error: ${response.error.message}`));
            return;
          }

          if (response.content && response.content[0] && response.content[0].text) {
            const text = response.content[0].text;
            const jsonMatch = text.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
              const takeaways = JSON.parse(jsonMatch[0]);
              resolve(takeaways);
            } else {
              reject(new Error('No valid JSON array found in response'));
            }
          } else {
            console.error('Full API response:', JSON.stringify(response, null, 2));
            reject(new Error('Unexpected API response format'));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(requestData);
    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Searching PubMed for health optimization articles...\n');

  const allPmids = new Set();

  // Search across all keyword categories
  for (const keyword of KEYWORDS) {
    console.log(`Searching: ${keyword.substring(0, 50)}...`);
    const pmids = await searchPubMed(keyword, 5);
    pmids.forEach(id => allPmids.add(id));
    // Rate limiting - be nice to PubMed API
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n📚 Found ${allPmids.size} unique articles\n`);

  if (allPmids.size === 0) {
    console.log('No articles found. Using fallback...');
    // Fallback to broader search
    const fallbackPmids = await searchPubMed('health optimization', 10);
    fallbackPmids.forEach(id => allPmids.add(id));
  }

  // Fetch details
  console.log('📖 Fetching article details...\n');
  const details = await fetchArticleDetails(Array.from(allPmids));

  // Parse and score articles
  const articles = [];
  for (const [pmid, data] of Object.entries(details)) {
    if (pmid === 'uids') continue;

    const article = {
      pmid: pmid,
      title: data.title || 'Untitled',
      authors: data.authors?.slice(0, 3).map(a => a.name).join(', ') || 'Unknown',
      journal: data.source || 'Unknown Journal',
      pubdate: data.pubdate || 'Unknown',
      abstract: '', // Will need separate call for abstract
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      score: 0
    };

    article.score = scoreArticle(article);
    articles.push(article);
  }

  // Sort by score and pick the best
  articles.sort((a, b) => b.score - a.score);
  const topArticle = articles[0];

  // Fetch full abstract for the top article
  console.log('📄 Fetching full abstract...\n');
  topArticle.abstract = await fetchAbstract(topArticle.pmid);

  console.log('🏆 Top article selected:');
  console.log(`   Title: ${topArticle.title}`);
  console.log(`   Journal: ${topArticle.journal}`);
  console.log(`   Score: ${topArticle.score}`);
  console.log(`   Abstract: ${topArticle.abstract.substring(0, 150)}...`);
  console.log(`   URL: ${topArticle.url}\n`);

  // Generate key takeaways with Claude
  console.log('💡 Generating key takeaways with Claude...\n');
  let keyTakeaways = null;
  if (ANTHROPIC_API_KEY) {
    try {
      keyTakeaways = await generateKeyTakeaways(topArticle);
      console.log('✅ Key takeaways generated\n');
    } catch (err) {
      console.error('⚠️  Failed to generate takeaways:', err.message);
      console.log('   Continuing without takeaways...\n');
    }
  } else {
    console.log('⚠️  ANTHROPIC_API_KEY not set, skipping takeaway generation\n');
  }

  // Save to JSON
  const output = {
    date: new Date().toISOString().split('T')[0],
    article: topArticle,
    alternates: articles.slice(1, 5)
  };

  fs.writeFileSync('latest-article.json', JSON.stringify(output, null, 2));
  console.log('✅ Saved to latest-article.json\n');

  // Save to archive
  const archiveDir = 'archive';
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir);
  }
  const archiveFile = `${archiveDir}/${output.date}.json`;
  fs.writeFileSync(archiveFile, JSON.stringify(output, null, 2));
  console.log(`✅ Saved to ${archiveFile}\n`);

  // Save key takeaways to separate file if available
  if (keyTakeaways) {
    const takeawaysFile = `${archiveDir}/${output.date}-takeaways.json`;
    const takeawaysData = {
      date: output.date,
      pmid: topArticle.pmid,
      articleTitle: topArticle.title,
      takeaways: keyTakeaways
    };
    fs.writeFileSync(takeawaysFile, JSON.stringify(takeawaysData, null, 2));
    console.log(`✅ Saved key takeaways to ${takeawaysFile}\n`);
  }

  // Generate archive index
  const archiveFiles = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();

  const archiveIndex = {
    lastUpdated: new Date().toISOString(),
    articles: archiveFiles.map(file => {
      const data = JSON.parse(fs.readFileSync(`${archiveDir}/${file}`, 'utf8'));
      return {
        date: data.date,
        article: {
          title: data.article.title,
          authors: data.article.authors,
          journal: data.article.journal,
          url: data.article.url
        }
      };
    })
  };

  fs.writeFileSync('archive-index.json', JSON.stringify(archiveIndex, null, 2));
  console.log('✅ Updated archive-index.json\n');

  return output;
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
