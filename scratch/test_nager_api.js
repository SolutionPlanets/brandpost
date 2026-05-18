async function test() {
  const year = 2026;
  try {
    console.log(`Testing Nager.Date API for year ${year}...`);
    const nagerResponse = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
    if (nagerResponse.ok) {
      const nagerData = await nagerResponse.json();
      console.log(`SUCCESS: Found ${nagerData.length} holidays.`);
      console.log('Sample:', JSON.stringify(nagerData[0], null, 2));
    } else {
      console.error(`FAILED: HTTP Status ${nagerResponse.status}`);
    }
  } catch (err) {
    console.error('FAILED: Network error', err.message);
  }
}

test();
