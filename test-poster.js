const fetch = require('node-fetch');
async function test() {
  const url1 = "http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/%282024%29/?";
  const body1 = JSON.stringify({ action: 'get', items: { href: '/DHAKA-FLIX-7/English%20Movies/%282024%29/', what: 1 } });
  
  const res1 = await fetch(url1, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: body1 });
  const json1 = await res1.json();
  const movieFolders = json1.items.filter(i => i.size === null && i.href.length > '/DHAKA-FLIX-7/English%20Movies/%282024%29/'.length);
  
  if (movieFolders.length === 0) { console.log("No movie folders found in 2024"); return; }
  
  console.log("Movie Folder:", movieFolders[0].href);
  
  const url2 = "http://172.16.50.7" + movieFolders[0].href + "?";
  const body2 = JSON.stringify({ action: 'get', items: { href: movieFolders[0].href, what: 1 } });
  
  const res2 = await fetch(url2, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: body2 });
  const json2 = await res2.json();
  console.log("Contents of movie folder:");
  json2.items.forEach(i => console.log(i.href));
}
test().catch(console.error);
