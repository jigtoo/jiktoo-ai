
import fetch from 'node-fetch';

async function verifyNyseFix() {
    const ticker = 'NYCB';
    const market = 'US';
    // Using the same heuristic logic I added to dataService.ts
    // market=US and extraParams='&excd=NYS'

    // Note: dataService sends market=${requestMarket} which I set to 'US' (or whatever passed)
    // and appends extraParams.
    // My fix: requestMarket='US', extraParams='&excd=NYS' (if length <= 3)

    const url = `http://127.0.0.1:8080/rt-snapshot?ticker=${ticker}&market=${market}&fields=quote&excd=NYS`;

    console.log(`Testing Fix URL: ${url}`);
    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        if (res.status === 200) {
            console.log('✅ Success! KIS Proxy accepted NYCB with excd=NYS');
            console.log(text.substring(0, 200));
        } else {
            console.log('❌ Failed.');
            console.log(text.substring(0, 200));
        }
    } catch (e) {
        console.error(e);
    }
}

verifyNyseFix();
