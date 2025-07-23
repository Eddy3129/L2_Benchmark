/**
 * Fetches gas oracle data for multiple chains using the Etherscan V2 API.
 * This script demonstrates the correct V2 approach with a single endpoint.
 */
async function getMultiChainGasOracles() {
  // --- Configuration ---
  // IMPORTANT: Replace "YourApiKeyToken" with your actual Etherscan API key.
  const API_KEY = "P5YGMIHZ2WESP8YYTHQS9YAC5SV97E6DSN"; 
  const BASE_URL = "https://api.etherscan.io/v2/api";

  // List of chain IDs you want to query.
  const chainIds = [1, 10, 137, 8453, 59144, 747474, 534352, 324]; 

  // A helper map to give names to chain IDs for readability.
  const chainInfo = {
    1: "Ethereum",
    10: "Optimism",
    137: "Polygon",
    8453: "Base",
    59144: "Linea",
    534352: "Scroll",
    324: "zkSync Era",
    747474: "Katana",
    57073: "Ink"
  };

  console.log("Fetching gas oracle data using Etherscan V2 API...");

  // Create an array of fetch promises to run all requests concurrently.
  const promises = chainIds.map(async (chainId) => {
    // Construct the URL with the correct module, action, and parameters.
    const params = new URLSearchParams({
      module: 'gastracker',
      action: 'gasoracle',
      chainid: chainId.toString(),
      apikey: API_KEY
    });
    
    const url = `${BASE_URL}?${params.toString()}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      
      // Check the API's own status field.
      if (data.status === "1") {
        return { name: chainInfo[chainId] || `Unknown Chain`, chainId, data: data.result };
      } else {
        // Handle cases where the API returns an error message (e.g., endpoint not supported for the chain).
        return { name: chainInfo[chainId] || `Unknown Chain`, chainId, error: data.message };
      }
    } catch (error) {
      return { name: chainInfo[chainId] || `Unknown Chain`, chainId, error: error.message };
    }
  });

  // Wait for all the API calls to complete.
  const results = await Promise.all(promises);

  // --- Display the collected results ---
  console.log("\n--- Gas Oracle Results ---");
  results.forEach(result => {
    console.log(`\nChain: ${result.name} (ID: ${result.chainId})`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    } else {
      console.log(`  - Suggested Base Fee: ${result.data.suggestBaseFee} Gwei`);
      console.log(`  - Safe Gas Price (Priority Fee): ${result.data.SafeGasPrice} Gwei`);
      console.log(`  - Proposed Gas Price (Priority Fee): ${result.data.ProposeGasPrice} Gwei`);
      console.log(`  - Fast Gas Price (Priority Fee): ${result.data.FastGasPrice} Gwei`);
    }
  });
  console.log("\nNote: For L2s, 'Gas Price' values often represent the priority fee (tip) added to the base fee.");
}

// --- Run the script ---
getMultiChainGasOracles().catch(console.error);
