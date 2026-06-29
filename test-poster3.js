const fetch = require('node-fetch');
async function test() {
  // Get main category
  let url = "http://172.16.50.7/DHAKA-FLIX-7/3D%20Movies/?";
  let body = JSON.stringify({ action: 'get', items: { href: "/DHAKA-FLIX-7/3D%20Movies/", what: 1 } });
  let res = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: body });
  let json = await res.json();
  
  // Find a movie folder
  let folders = json.items.filter(i => i.size === null && i.href !== "/DHAKA-FLIX-7/3D%20Movies/" && i.href !== "/");
  if (folders.length === 0) return console.log("no subfolders");
  let folderHref = folders[0].href;
  
  console.log("Checking:", folderHref);
  
  let url2 = "http://172.16.50.7" + folderHref + "?";
  let body2 = JSON.stringify({ action: 'get', items: { href: folderHref, what: 1 } });
  let res2 = await fetch(url2, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: body2 });
  let json2 = await res2.json();
  json2.items.forEach(i => console.log(i.href));
}
test().catch(console.error);
