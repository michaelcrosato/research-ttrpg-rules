const https = require('https');

https.get(
  'https://raw.githubusercontent.com/inaimathi/all-boardgames-ever/master/tiny.json',
  (res) => {
    let d = '';
    res.on('data', chunk => {
      d += chunk;
      // Stop downloading if we have enough to inspect (e.g. 5000 characters)
      if (d.length > 5000) {
        console.log("Snippet:", d.substring(0, 1000));
        res.destroy();
      }
    });
  }
).on('error', console.error);
