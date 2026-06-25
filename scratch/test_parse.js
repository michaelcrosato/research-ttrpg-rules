const https = require('https');

https.get(
  'https://en.wikipedia.org/w/api.php?action=parse&page=Timeline_of_tabletop_role-playing_games&format=json&prop=text',
  { headers: { 'User-Agent': 'Mozilla/5.0' } },
  (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(d);
        const html = parsed.parse.text['*'];
        
        const parts = html.split(/<h[234] id="/);
        console.log("Parts count:", parts.length);
        
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          const yearMatch = part.match(/^(\d{4})/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1], 10);
            const games = [];
            
            // Extract items in lists
            const itemRegex = /<li>([\s\S]*?)<\/li>/g;
            let itemMatch;
            // Let's only scan until the next main section if any
            const content = part.split(/<div class="mw-heading/)[0]; // stop at next section
            
            while ((itemMatch = itemRegex.exec(content)) !== null) {
              const itemHtml = itemMatch[1];
              // Match <i><a ...>Title</a></i> or <i>Title</i>
              const linkMatch = itemHtml.match(/<i><a[^>]*>([^<]+)<\/a><\/i>/);
              if (linkMatch) {
                games.push(linkMatch[1].trim());
              } else {
                const plainMatch = itemHtml.match(/<i>([^<]+)<\/i>/);
                if (plainMatch) {
                  games.push(plainMatch[1].trim());
                }
              }
            }
            if (games.length > 0) {
              console.log(`${year}: Found ${games.length} games. Sample: ${games.slice(0, 3).join(', ')}`);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
  }
);
