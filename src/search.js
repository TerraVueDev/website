let allData = {};
let filteredResults = [];

const CACHE_KEY = "terraVueData";
const CACHE_DURATION = 30 * 60 * 1000;

function getCachedData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    if (now - timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    if (!data || Object.keys(data).length === 0) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
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

function formatCategoryName(categoryKey) {
  return categoryKey
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function loadData() {
  try {
    const cachedData = getCachedData();
    if (cachedData) {
      allData = cachedData;
      console.log(
        "Data loaded from cache:",
        Object.keys(allData).length,
        "websites",
      );
      return;
    }

    localStorage.removeItem(CACHE_KEY);

    const [linksResponse, categoriesResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/links.json",
      ),
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/categories.json",
      ),
    ]);

    if (!linksResponse.ok) {
      throw new Error(`Failed to fetch links: ${linksResponse.status}`);
    }
    if (!categoriesResponse.ok) {
      throw new Error(
        `Failed to fetch categories: ${categoriesResponse.status}`,
      );
    }

    const [linksData, categoriesData] = await Promise.all([
      linksResponse.json(),
      categoriesResponse.json(),
    ]);

    allData = {};
    let processedCount = 0;
    let impactStats = { high: 0, medium: 0, low: 0, unknown: 0 };

    for (const [website, linkData] of Object.entries(linksData)) {
      processedCount++;

      const categoryKey = linkData.categories || linkData.category || "unknown";

      const categoryInfo = categoriesData[categoryKey] || {};

      let impact = "unknown";
      if (categoryInfo.impact) {
        impact = categoryInfo.impact.toLowerCase();
        if (!["high", "medium", "low"].includes(impact)) {
          impact = "unknown";
        }
      }

      impactStats[impact]++;

      allData[website] = {
        category: categoryKey,
        icon: linkData.icon || "default",
        impact: impact,
        description:
          linkData.description ||
          categoryInfo.description ||
          `${formatCategoryName(categoryKey)} website`,
        categoryData: categoryInfo,
      };
    }

    setCachedData(allData);
  } catch (error) {
    console.error("Error loading data:", error);
    showErrorMessage(`Failed to load data: ${error.message}`);
  }
}

function showErrorMessage(message) {
  const container = document.getElementById("resultsContainer");
  const grid = document.getElementById("resultsGrid");
  const noResults = document.getElementById("noResults");
  const popularSearches = document.getElementById("popularSearches");

  hideLoading();
  container.classList.add("hidden");
  popularSearches.classList.add("hidden");

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

function performSearch(query) {
  if (!query.trim()) {
    showPopularSearches();
    return;
  }

  if (Object.keys(allData).length === 0) {
    showErrorMessage(
      "No data loaded. Please check your internet connection and reload the page.",
    );
    return;
  }

  showLoading();

  setTimeout(() => {
    const results = searchData(query.toLowerCase());
    displayResults(results, query);
  }, 500);
}

function searchData(query) {
  const results = [];

  for (const [website, data] of Object.entries(allData)) {
    let score = 0;

    if (website.toLowerCase() === query) {
      score += 100;
    } else if (website.toLowerCase().includes(query)) {
      score += 50;
    } else if (data.category && data.category.toLowerCase().includes(query)) {
      score += 30;
    } else if (
      data.description &&
      data.description.toLowerCase().includes(query)
    ) {
      score += 20;
    } else if (data.icon && data.icon.toLowerCase().includes(query)) {
      score += 15;
    }

    if (score > 0) {
      results.push({
        website,
        score,
        ...data,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

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
    document.querySelector("#resultsContainer h2").innerHTML =
      `Search Results <span id="resultCount" class="text-green-600">(${results.length})</span>`;
  } else {
    resultCount.textContent = `(${results.length})`;
    document.querySelector("#resultsContainer h2").innerHTML =
      `All Websites <span id="resultCount" class="text-green-600">(${results.length})</span>`;
  }

  grid.innerHTML = "";

  results.forEach((result) => {
    const card = createResultCard(result);
    grid.appendChild(card);
  });

  container.classList.remove("hidden");
  noResults.classList.add("hidden");
  popularSearches.classList.add("hidden");

  setTimeout(() => {
    container.classList.add("fade-in");
  }, 50);
}

function createResultCard(result) {
  const card = document.createElement("div");
  card.className =
    "result-card bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col";

  card.addEventListener("click", () => {
    window.location.href = `details.html?website=${encodeURIComponent(
      result.website,
    )}`;
  });

  card.innerHTML = `
          <div class="flex items-start space-x-4 mb-4">
            <div class="flex-1">
              <h3 class="text-xl font-semibold text-gray-900 mb-1">${
                result.website
              }</h3>
              <p class="text-gray-600 text-sm">${formatCategoryName(
                result.category,
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

function showLoading() {
  document.getElementById("loadingState").classList.remove("hidden");
  document.getElementById("resultsContainer").classList.add("hidden");
  document.getElementById("noResults").classList.add("hidden");
  document.getElementById("popularSearches").classList.add("hidden");
}

function hideLoading() {
  document.getElementById("loadingState").classList.add("hidden");
}

function showPopularSearches() {
  document.getElementById("resultsContainer").classList.add("hidden");
  document.getElementById("noResults").classList.add("hidden");
  document.getElementById("popularSearches").classList.remove("hidden");
  hideLoading();
}

function displayAllLinks() {
  if (Object.keys(allData).length === 0) {
    console.warn("No data to display");
    showErrorMessage("No websites loaded. Please check your data source.");
    return;
  }

  const allResults = Object.entries(allData).map(([website, data]) => ({
    website,
    score: 0,
    ...data,
  }));

  allResults.sort((a, b) => a.website.localeCompare(b.website));

  displayResults(allResults, "");
}

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

function showSuggestions(suggestions) {
  const container = document.getElementById("searchSuggestions");

  if (suggestions.length === 0) {
    container.classList.add("hidden");
    return;
  }

  container.innerHTML = suggestions
    .map(
      (suggestion) =>
        `<div class="suggestion-item" data-suggestion="${suggestion}">${suggestion}</div>`,
    )
    .join("");

  container.classList.remove("hidden");
}

function hideSuggestions() {
  document.getElementById("searchSuggestions").classList.add("hidden");
}

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
    default:
      sortedResults.sort((a, b) => b.score - a.score);
  }

  const grid = document.getElementById("resultsGrid");
  grid.innerHTML = "";
  sortedResults.forEach((result) => {
    const card = createResultCard(result);
    grid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  window.clearCache = function () {
    localStorage.removeItem(CACHE_KEY);
    console.log("Cache cleared! Reloading...");
    location.reload();
  };

  await loadData();

  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const sortSelect = document.getElementById("sortSelect");

  searchButton.addEventListener("click", () => {
    performSearch(searchInput.value);
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      performSearch(searchInput.value);
      hideSuggestions();
    }
  });

  searchInput.addEventListener("input", (e) => {
    const suggestions = generateSuggestions(e.target.value);
    showSuggestions(suggestions);
  });

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

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortResults(e.target.value);
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("popular-search-btn")) {
      const searchTerm = e.target.dataset.search;
      searchInput.value = searchTerm;
      performSearch(searchTerm);
    }
  });

  if (Object.keys(allData).length === 0) {
    showPopularSearches();
  } else {
    displayAllLinks();
  }
});
