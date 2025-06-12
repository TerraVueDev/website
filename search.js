let allData = {};
let filteredResults = [];

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

// Load data from GitHub
async function loadData() {
  try {
    const [linksResponse, categoriesResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/links.json"
      ),
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/categories.json"
      ),
    ]);

    if (!linksResponse.ok || !categoriesResponse.ok) {
      throw new Error("Failed to fetch data");
    }

    const linksData = await linksResponse.json();
    const categoriesData = await categoriesResponse.json();

    // Combine data for easier searching
    allData = {};
    for (const [website, categoryKey] of Object.entries(linksData)) {
      if (categoriesData[categoryKey]) {
        allData[website] = {
          category: categoryKey,
          ...categoriesData[categoryKey],
        };
      }
    }

    console.log(
      "Data loaded successfully:",
      Object.keys(allData).length,
      "websites"
    );
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Perform search
function performSearch(query) {
  if (!query.trim()) {
    showPopularSearches();
    return;
  }

  showLoading();

  // Simulate slight delay for better UX
  setTimeout(() => {
    const results = searchData(query.toLowerCase());
    displayResults(results, query);
  }, 500);
}

// Search through the data
function searchData(query) {
  const results = [];

  for (const [website, data] of Object.entries(allData)) {
    let score = 0;

    // Exact match gets highest score
    if (website.toLowerCase() === query) {
      score += 100;
    }
    // Website name contains query
    else if (website.toLowerCase().includes(query)) {
      score += 50;
    }
    // Category name contains query
    else if (data.category.toLowerCase().includes(query)) {
      score += 30;
    }
    // Description contains query
    else if (data.description.toLowerCase().includes(query)) {
      score += 20;
    }

    if (score > 0) {
      results.push({
        website,
        score,
        ...data,
      });
    }
  }

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
          <div class="flex items-center space-x-4 mb-4">
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
          
          <p class="text-gray-700 text-sm mb-4 line-clamp-3">${
            result.description
          }</p>
          
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
  const allResults = Object.entries(allData).map(([website, data]) => ({
    website,
    score: 0, // Default score for sorting
    ...data,
  }));

  // Sort alphabetically by default
  allResults.sort((a, b) => a.website.localeCompare(b.website));

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
  sortSelect.addEventListener("change", (e) => {
    sortResults(e.target.value);
  });

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
  }

  // Initialize by showing all links
  displayAllLinks();
});
