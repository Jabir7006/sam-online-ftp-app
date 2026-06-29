const fetch = require('node-fetch');
async function test() {
  const url = "http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/%281960-1994%29/Terminator%202-Judgment%20Day%20%281991%29%20720p/?";
  const body = JSON.stringify({ action: 'get', items: { href: "/DHAKA-FLIX-7/English%20Movies/%281960-1994%29/Terminator%202-Judgment%20Day%20%281991%29%20720p/", what: 1 } });
  
  const res = await fetch(url, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: body });
  const text = await res.text();
  try {
     const json = JSON.parse(text);
     json.items.forEach(i => console.log(i.href));
  } catch(e) { console.log(text.substring(0, 100)); }
}
test().catch(console.error);
