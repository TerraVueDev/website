let allData = {};
let filteredResults = [];

// Cache configuration
const CACHE_KEY = "terraVueData";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// Cache utility functions
function getCachedData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > CACHE_DURATION) {
      console.log("Cache expired, removing...");
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    // Check if cached data is actually valid (not empty)
    if (!data || Object.keys(data).length === 0) {
      console.log("Cache contains no data, removing...");
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Error reading from cache:", error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedData(data) {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry));
  } catch (error) {
    console.warn("Error writing to cache:", error);
  }
}

// Get impact badge HTML
function getImpactBadge(impact) {
  const badges = {
    high: '<span class="impact-badge inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">🔴 High Impact</span>',
    medium:
      '<span class="impact-badge inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">🟡 Medium Impact</span>',
    low: '<span class="impact-badge inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">🟢 Low Impact</span>',
    unknown:
      '<span class="impact-badge inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">❓ Unknown</span>',
  };
  return badges[impact] || badges.unknown;
}

// Format category name for display
function formatCategoryName(categoryKey) {
  return categoryKey
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Replace your loadData function with this fixed version
async function loadData() {
  try {
    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      allData = cachedData;
      console.log(
        "Data loaded from cache:",
        Object.keys(allData).length,
        "websites"
      );
      return;
    }

    // Clear any existing bad cache
    localStorage.removeItem(CACHE_KEY);

    console.log("🔍 Starting data fetch...");

    // Fetch both files
    const [linksResponse, categoriesResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/links.json"
      ),
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/categories.json"
      ),
    ]);

    if (!linksResponse.ok) {
      throw new Error(`Failed to fetch links: ${linksResponse.status}`);
    }
    if (!categoriesResponse.ok) {
      throw new Error(
        `Failed to fetch categories: ${categoriesResponse.status}`
      );
    }

    const [linksData, categoriesData] = await Promise.all([
      linksResponse.json(),
      categoriesResponse.json(),
    ]);

    // Process data and extract impact information
    allData = {};
    let processedCount = 0;
    let impactStats = { high: 0, medium: 0, low: 0, unknown: 0 };

    for (const [website, linkData] of Object.entries(linksData)) {
      processedCount++;

      // Get category key
      const categoryKey = linkData.categories || linkData.category || "unknown";

      // Get category info
      const categoryInfo = categoriesData[categoryKey] || {};

      // Extract impact - this is the key fix!
      let impact = "unknown";
      if (categoryInfo.impact) {
        impact = categoryInfo.impact.toLowerCase();
        // Validate impact value
        if (!["high", "medium", "low"].includes(impact)) {
          impact = "unknown";
        }
      }

      // Update stats
      impactStats[impact]++;

      // Create the data structure with correct impact
      allData[website] = {
        category: categoryKey,
        icon: linkData.icon || "default",
        impact: impact, // ← Now using the actual impact value!
        description:
          linkData.description ||
          categoryInfo.description ||
          `${formatCategoryName(categoryKey)} website`,
        // Optional: include additional category data
        categoryData: categoryInfo,
      };
    }

    // Log statistics
    console.log("✅ Data processing complete!");
    console.log("📊 Impact distribution:", impactStats);
    console.log("🌐 Total websites processed:", processedCount);

    // Cache the processed data
    setCachedData(allData);
    console.log(
      "Data loaded successfully:",
      Object.keys(allData).length,
      "websites"
    );
  } catch (error) {
    console.error("Error loading data:", error);
    showErrorMessage(`Failed to load data: ${error.message}`);
  }
}

// Show error message to user
function showErrorMessage(message) {
  const container = document.getElementById("resultsContainer");
  const grid = document.getElementById("resultsGrid");
  const noResults = document.getElementById("noResults");
  const popularSearches = document.getElementById("popularSearches");

  hideLoading();
  container.classList.add("hidden");
  popularSearches.classList.add("hidden");

  // Show error in no results section
  noResults.innerHTML = `
    <div class="text-center py-12">
      <div class="text-6xl mb-4">⚠️</div>
      <h3 class="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h3>
      <p class="text-gray-600 mb-4">${message}</p>
      <button onclick="location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
        Reload Page
      </button>
    </div>
  `;
  noResults.classList.remove("hidden");
}

// Perform search
function performSearch(query) {
  console.log("Performing search for:", query);
  console.log("Total data available:", Object.keys(allData).length);

  if (!query.trim()) {
    showPopularSearches();
    return;
  }

  // Check if data is loaded
  if (Object.keys(allData).length === 0) {
    console.warn("No data available for search");
    showErrorMessage(
      "No data loaded. Please check your internet connection and reload the page."
    );
    return;
  }

  showLoading();

  // Simulate slight delay for better UX
  setTimeout(() => {
    const results = searchData(query.toLowerCase());
    console.log("Search results:", results.length, "found");
    displayResults(results, query);
  }, 500);
}

// Search through the data
function searchData(query) {
  console.log("Searching for:", query);
  const results = [];

  for (const [website, data] of Object.entries(allData)) {
    let score = 0;

    // Debug: log what we're checking
    console.log(`Checking ${website}:`, {
      category: data.category,
      description: data.description,
      icon: data.icon,
    });

    // Exact match gets highest score
    if (website.toLowerCase() === query) {
      score += 100;
      console.log(`Exact match found: ${website}`);
    }
    // Website name contains query
    else if (website.toLowerCase().includes(query)) {
      score += 50;
      console.log(`Partial match found: ${website}`);
    }
    // Category name contains query
    else if (data.category && data.category.toLowerCase().includes(query)) {
      score += 30;
      console.log(`Category match found: ${website} (${data.category})`);
    }
    // Description contains query (if available)
    else if (
      data.description &&
      data.description.toLowerCase().includes(query)
    ) {
      score += 20;
      console.log(`Description match found: ${website}`);
    }
    // Icon name contains query
    else if (data.icon && data.icon.toLowerCase().includes(query)) {
      score += 15;
      console.log(`Icon match found: ${website} (${data.icon})`);
    }

    if (score > 0) {
      results.push({
        website,
        score,
        ...data,
      });
    }
  }

  console.log("Search completed. Results:", results.length);
  // Sort by score (relevance)
  return results.sort((a, b) => b.score - a.score);
}

// Display search results
function displayResults(results, query) {
  const container = document.getElementById("resultsContainer");
  const grid = document.getElementById("resultsGrid");
  const noResults = document.getElementById("noResults");
  const popularSearches = document.getElementById("popularSearches");
  const resultCount = document.getElementById("resultCount");

  hideLoading();

  if (results.length === 0) {
    container.classList.add("hidden");
    noResults.classList.remove("hidden");
    popularSearches.classList.remove("hidden");
    return;
  }

  // Store results for sorting
  filteredResults = results;

  // Update result count and title
  if (query) {
    resultCount.textContent = `(${results.length})`;
    document.querySelector(
      "#resultsContainer h2"
    ).innerHTML = `Search Results <span id="resultCount" class="text-green-600">(${results.length})</span>`;
  } else {
    resultCount.textContent = `(${results.length})`;
    document.querySelector(
      "#resultsContainer h2"
    ).innerHTML = `All Websites <span id="resultCount" class="text-green-600">(${results.length})</span>`;
  }

  // Clear previous results
  grid.innerHTML = "";

  // Create result cards
  results.forEach((result) => {
    const card = createResultCard(result);
    grid.appendChild(card);
  });

  // Show results
  container.classList.remove("hidden");
  noResults.classList.add("hidden");
  popularSearches.classList.add("hidden");

  // Trigger fade-in animation
  setTimeout(() => {
    container.classList.add("fade-in");
  }, 50);
}

// Create result card
function createResultCard(result) {
  const card = document.createElement("div");
  card.className =
    "result-card bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col";

  // Add click handler to navigate to details page
  card.addEventListener("click", () => {
    window.location.href = `details.html?website=${encodeURIComponent(
      result.website
    )}`;
  });

  card.innerHTML = `
          <div class="flex items-start space-x-4 mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-semibold text-gray-900 mb-1">${
                result.website
              }</h3>
              <p class="text-gray-600 text-sm">${formatCategoryName(
                result.category
              )}</p>
            </div>
          </div>
          
          <div class="mb-4">
            ${getImpactBadge(result.impact)}
          </div>
       <div class="mt-auto flex justify-between items-center pt-4 border-t border-gray-100">
    <span class="text-sm text-gray-500">Click for details</span>
    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
    </svg>
  </div>
`;

  return card;
}

// Show loading state
function showLoading() {
  document.getElementById("loadingState").classList.remove("hidden");
  document.getElementById("resultsContainer").classList.add("hidden");
  document.getElementById("noResults").classList.add("hidden");
  document.getElementById("popularSearches").classList.add("hidden");
}

// Hide loading state
function hideLoading() {
  document.getElementById("loadingState").classList.add("hidden");
}

// Show popular searches
function showPopularSearches() {
  document.getElementById("resultsContainer").classList.add("hidden");
  document.getElementById("noResults").classList.add("hidden");
  document.getElementById("popularSearches").classList.remove("hidden");
  hideLoading();
}

// Display all links by default
function displayAllLinks() {
  console.log(
    "Displaying all links. Data available:",
    Object.keys(allData).length
  );

  if (Object.keys(allData).length === 0) {
    console.warn("No data to display");
    showErrorMessage("No websites loaded. Please check your data source.");
    return;
  }

  const allResults = Object.entries(allData).map(([website, data]) => ({
    website,
    score: 0, // Default score for sorting
    ...data,
  }));

  // Sort alphabetically by default
  allResults.sort((a, b) => a.website.localeCompare(b.website));

  console.log("Displaying", allResults.length, "websites");
  displayResults(allResults, "");
}

// Generate search suggestions
function generateSuggestions(query) {
  if (!query.trim()) return [];

  const suggestions = [];
  const queryLower = query.toLowerCase();

  for (const website of Object.keys(allData)) {
    if (website.toLowerCase().includes(queryLower) && suggestions.length < 5) {
      suggestions.push(website);
    }
  }

  return suggestions;
}

// Show search suggestions
function showSuggestions(suggestions) {
  const container = document.getElementById("searchSuggestions");

  if (suggestions.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.innerHTML = suggestions
    .map(
      (suggestion) =>
        `<div class="suggestion-item" data-suggestion="${suggestion}">${suggestion}</div>`
    )
    .join("");

  container.classList.remove("hidden");
}

// Hide search suggestions
function hideSuggestions() {
  document.getElementById("searchSuggestions").classList.add("hidden");
}

// Sort results
function sortResults(sortBy) {
  if (!filteredResults.length) return;

  let sortedResults = [...filteredResults];

  switch (sortBy) {
    case "impact-high":
      sortedResults.sort((a, b) => {
        const order = { high: 3, medium: 2, low: 1, unknown: 0 };
        return order[b.impact] - order[a.impact];
      });
      break;
    case "impact-low":
      sortedResults.sort((a, b) => {
        const order = { high: 3, medium: 2, low: 1, unknown: 0 };
        return order[a.impact] - order[b.impact];
      });
      break;
    case "alphabetical":
      sortedResults.sort((a, b) => a.website.localeCompare(b.website));
      break;
    case "category":
      sortedResults.sort((a, b) => a.category.localeCompare(b.category));
      break;
    default: // relevance
      sortedResults.sort((a, b) => b.score - a.score);
  }

  // Re-render results
  const grid = document.getElementById("resultsGrid");
  grid.innerHTML = "";
  sortedResults.forEach((result) => {
    const card = createResultCard(result);
    grid.appendChild(card);
  });
}

// Event listeners
document.addEventListener("DOMContentLoaded", async () => {
  // Clear cache button for debugging (you can remove this later)
  console.log("Adding debug clear cache function to window");
  window.clearCache = function () {
    localStorage.removeItem(CACHE_KEY);
    console.log("Cache cleared! Reloading...");
    location.reload();
  };

  await loadData();

  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const sortSelect = document.getElementById("sortSelect");

  // Search functionality
  searchButton.addEventListener("click", () => {
    performSearch(searchInput.value);
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch(searchInput.value);
      hideSuggestions();
    }
  });

  // Search suggestions
  searchInput.addEventListener("input", (e) => {
    const suggestions = generateSuggestions(e.target.value);
    showSuggestions(suggestions);
  });

  // Handle suggestion clicks
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-item")) {
      const suggestion = e.target.dataset.suggestion;
      searchInput.value = suggestion;
      performSearch(suggestion);
      hideSuggestions();
    } else if (!e.target.closest(".search-container")) {
      hideSuggestions();
    }
  });

  // Sort functionality
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortResults(e.target.value);
    });
  }

  // Popular search buttons
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("popular-search-btn")) {
      const searchTerm = e.target.dataset.search;
      searchInput.value = searchTerm;
      performSearch(searchTerm);
    }
  });

  // Show popular searches initially if no data
  if (Object.keys(allData).length === 0) {
    showPopularSearches();
  } else {
    // Initialize by showing all links
    displayAllLinks();
  }
});
