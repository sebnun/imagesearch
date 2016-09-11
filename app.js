const http = require('http');
const url = require('url');
const MongoClient = require('mongodb').MongoClient;
const Bing = require('node-bing-api')({ accKey: 'vn4uRDu3eRox2Fn8oqdXwElLqUEoL1FZkYTdRLga3Bw' });

const dburl = 'mongodb://localhost:27017/mydb';

http.createServer((req, res) => {
  const u = url.parse(req.url, true);

  if (u.path === '/' || u.path === '//') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<p>See <a href="https://github.com/sebnun/imagesearch">Image Search</a> for more info.</p>');
  } else if (u.path === '/latest/' || u.path === '//latest/') { // /latest is a search query
    MongoClient.connect(dburl, (err, db) => {
      if (err) throw err;

      db.collection('queries').find({}, { term: 1, when: 1, _id: 0 })
      .toArray((finderr, queries) => {
        if (finderr) throw finderr;

        res.writeHead(200, { 'Content-Type': 'text/json' });
        res.end(JSON.stringify(queries.reverse().map((q) => {
          const nq = q;
          nq.when = new Date(q.when);
          return nq;
        })));

        db.close();
      });
    });
  } else if (u.path !== '/favicon.ico' && u.path !== '//favicon.ico') {
    const query = decodeURI(u.pathname.substring(2));
    const off = u.query.offset ? u.query.offset * 10 : 0;
    console.log(query);
    console.log(off);

    MongoClient.connect(dburl, (err, db) => {
      if (err) throw err;

      db.collection('queries').insertOne({ term: query, when: Date.now() }, (inserterr) => {
        if (inserterr) throw err;
        db.close();
      });
    });

    Bing.images(query, { top: 10, skip: off }, (error, bres, body) => {
      res.writeHead(200, { 'Content-Type': 'text/json' });

      const results = [];

      body.d.results.forEach((r) => {
        const result = {
          url: encodeURI(r.MediaUrl),
          snippet: r.Title,
          thumbnail: encodeURI(r.Thumbnail.MediaUrl),
          context: encodeURI(r.SourceUrl),
        };
        results.push(result);
      });

      res.end(JSON.stringify(results));
    });
  }
}).listen(8083);
