const fs = require('fs');
const path = require('path');
const https = require('https');

const portsFilePath = path.join(__dirname, 'ports.js');
let content = fs.readFileSync(portsFilePath, 'utf-8');

// Basic regex to find port objects
const portRegex = /{([^}]+)}/g;

async function geocode(portName) {
  // Extract just the city/country part to make search easier
  let search = portName.replace('Cảng ', '').replace(/\(.*?\)/g, '').trim() + ' port';
  return new Promise((resolve) => {
    https.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search)}&limit=1`, {
      headers: { 'User-Agent': 'CargoOps-Agent/1.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.length > 0) {
            resolve({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function main() {
  const lines = content.split('\n');
  const outLines = [];
  for (let line of lines) {
    if (line.includes('value:') && !line.includes('lat:')) {
      const match = line.match(/value:\s*'([^']+)'/);
      if (match) {
        const portName = match[1];
        console.log('Geocoding:', portName);
        let coords = await geocode(portName);
        if (!coords) {
             // Fallback search without "port"
             let s2 = portName.replace('Cảng ', '').replace(/\(.*?\)/g, '').trim();
             coords = await geocode(s2);
        }
        if (coords) {
          line = line.replace(/}\s*,$/, `, lat: ${coords.lat}, lng: ${coords.lng} },`);
        } else {
          // Fallback if not found, just add 0,0
          line = line.replace(/}\s*,$/, `, lat: 0, lng: 0 },`);
        }
        await new Promise(r => setTimeout(r, 1000)); // rate limit nominatim 1 req/sec
      }
    }
    outLines.push(line);
  }
  fs.writeFileSync(portsFilePath, outLines.join('\n'));
  console.log('Done!');
}

main();
