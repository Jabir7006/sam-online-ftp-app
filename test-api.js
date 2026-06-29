const fetch = require('node-fetch');
fetch("http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/?", {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ action: 'get', items: { href: '/DHAKA-FLIX-7/English%20Movies/', what: 1 } })
}).then(res => res.json()).then(async json => {
    const folders = json.items.filter(i => i.size === null && i.href !== '/' && i.href !== '/DHAKA-FLIX-7/English%20Movies/');
    const firstFolder = folders[0];
    if (!firstFolder) { console.log("No subfolders"); return; }
    console.log("Checking folder:", firstFolder.href);
    
    const res2 = await fetch("http://172.16.50.7" + firstFolder.href + "?", {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ action: 'get', items: { href: firstFolder.href, what: 1 } })
    });
    const json2 = await res2.json();
    console.log("Contents:", json2.items.map(i => i.href));
}).catch(console.error);
