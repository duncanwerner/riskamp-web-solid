
import MiniSearch from 'minisearch';
import fm from 'front-matter';

interface HelpDoc {
    title: string;
    tags?: string[];
    [key: string]: any;
}

const modules = import.meta.glob('../../../docs.riskamp.com/docs-output/*.md', { 
  query: '?raw', 
  import: 'default', 
  eager: true 
}) as Record<string, string>;

if (Object.entries(modules).length === 0) {
  console.warn("importing docs returned 0 documents");
}

const documents = Object.entries(modules).map(([path, rawText], index) => {
    // fm(rawText) returns { attributes: { ... }, body: "..." }
    const { attributes, body } = fm<HelpDoc>(rawText);
    
    return {
        id: index,
        slug: path.split('/').pop()?.replace('.md', ''),
        content: body,           // Just the markdown content
        title: attributes.title, // Extracted from frontmatter
        section: attributes.section,
        description: attributes.description,
    };
});

// Now MiniSearch indexes both content AND frontmatter metadata
const ms = new MiniSearch({
    fields: ['title', 'content', 'description'], 
    storeFields: ['slug', 'title', 'content', 'description', 'section'],
    /*
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
    }
    */
});

ms.addAll(documents);

// console.info({documents});

// 3. Handle incoming search requests
onmessage = (e) => {
    const { query, combine } = e.data as { query: string; combine?: 'OR'|'AND' };
    const results = ms.search(query || '', {
      combineWith: combine || 'AND',
      boost: { title: 2 },
      fuzzy: (term) => (term.length > 3 ? 0.2 : false), // Only fuzzy for longer words
      prefix: (term) => (term.length > 2)              // Only prefix for 3+ chars
    });
    postMessage(results);
};
