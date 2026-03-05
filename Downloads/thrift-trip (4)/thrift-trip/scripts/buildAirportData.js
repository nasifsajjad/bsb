#!/usr/bin/env node
/**
 * Download and process the OpenFlights airport dataset.
 * Run once: node scripts/buildAirportData.js
 * Output: client/src/data/airportData.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SOURCE_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';

// Country code → ISO 4217 currency code mapping
const COUNTRY_CURRENCY = {
  'United States': 'USD', 'Canada': 'CAD', 'United Kingdom': 'GBP',
  'Germany': 'EUR', 'France': 'EUR', 'Italy': 'EUR', 'Spain': 'EUR',
  'Netherlands': 'EUR', 'Belgium': 'EUR', 'Austria': 'EUR', 'Portugal': 'EUR',
  'Ireland': 'EUR', 'Finland': 'EUR', 'Greece': 'EUR', 'Luxembourg': 'EUR',
  'Japan': 'JPY', 'Australia': 'AUD', 'Switzerland': 'CHF', 'China': 'CNY',
  'Hong Kong': 'HKD', 'Singapore': 'SGD', 'Sweden': 'SEK', 'Norway': 'NOK',
  'Denmark': 'DKK', 'New Zealand': 'NZD', 'Mexico': 'MXN', 'Brazil': 'BRL',
  'South Africa': 'ZAR', 'India': 'INR', 'South Korea': 'KRW', 'Thailand': 'THB',
  'Malaysia': 'MYR', 'Indonesia': 'IDR', 'Philippines': 'PHP', 'Turkey': 'TRY',
  'United Arab Emirates': 'AED', 'Saudi Arabia': 'SAR', 'Qatar': 'QAR',
  'Egypt': 'EGP', 'Kenya': 'KES', 'Nigeria': 'NGN', 'Colombia': 'COP',
  'Peru': 'PEN', 'Argentina': 'ARS', 'Chile': 'CLP', 'Poland': 'PLN',
  'Czech Republic': 'CZK', 'Hungary': 'HUF', 'Romania': 'RON',
  'Ukraine': 'UAH', 'Israel': 'ILS', 'Pakistan': 'PKR', 'Bangladesh': 'BDT',
  'Vietnam': 'VND', 'Myanmar': 'MMK', 'Sri Lanka': 'LKR', 'Nepal': 'NPR',
  'Russia': 'RUB', 'Morocco': 'MAD', 'Tunisia': 'TND', 'Algeria': 'DZD',
  'Ghana': 'GHS', 'Tanzania': 'TZS', 'Uganda': 'UGX', 'Ethiopia': 'ETB',
};

function fetchData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseLine(line) {
  // CSV with potential quoted fields containing commas
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function main() {
  console.log('Downloading OpenFlights airport data...');
  const csv = await fetchData(SOURCE_URL);
  const lines = csv.trim().split('\n');
  
  const airports = [];
  
  for (const line of lines) {
    const f = parseLine(line);
    // OpenFlights format:
    // 0:ID, 1:Name, 2:City, 3:Country, 4:IATA, 5:ICAO, 6:Lat, 7:Lon, 8:Alt, 9:TZ, 10:DST, 11:TZ, 12:Type, 13:Source
    
    const iata = f[4];
    const type = f[12];
    
    // Skip if no valid IATA code
    if (!iata || iata === '\\N' || iata === '' || iata.length !== 3) continue;
    
    // Skip military/private
    if (type && (type.includes('military') || type.includes('closed'))) continue;
    
    const country = f[3] || '';
    
    airports.push({
      iata: iata.toUpperCase(),
      name: f[1] || '',
      city: f[2] || '',
      country,
      lat: parseFloat(f[6]) || 0,
      lon: parseFloat(f[7]) || 0,
      currency: COUNTRY_CURRENCY[country] || 'USD',
    });
  }
  
  console.log(`Processed ${airports.length} airports with valid IATA codes`);
  
  const outPath = path.join(__dirname, '../client/src/data/airportData.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(airports, null, 0));
  
  console.log(`Written to ${outPath}`);
}

main().catch(console.error);
