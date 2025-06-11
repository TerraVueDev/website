let allData = [];
let filteredData = [];
let currentFilter = "all";
let currentItem = null;

// Load data using Promise.all
async function loadData() {
  try {
    document.getElementById("loadingState").classList.remove("hidden");
    document.getElementById("resultsContainer").classList.add("hidden");
    document.getElementById("errorState").classList.add("hidden");

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

    // Combine the data
    allData = Object.entries(linksData).map(([website, categoryKey]) => {
      const category = categoriesData[categoryKey];
      return {
        website,
        categoryKey,
        category: category || {
          impact: "unknown",
          description: "No data available",
        },
      };
    });

    filteredData = [...allData];
    displayResults();

    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("resultsContainer").classList.remove("hidden");
  } catch (error) {
    console.error("Error loading data:", error);
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
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

// Display results
function displayResults() {
  const resultsGrid = document.getElementById("resultsGrid");
  const resultCount = document.getElementById("resultCount");

  resultCount.textContent = `Showing ${filteredData.length} digital services`;

  resultsGrid.innerHTML = filteredData
    .map(
      (item, index) => `
          <div class="search-item bg-white rounded-lg shadow-md p-6 border border-gray-200" onclick="openModal(${allData.indexOf(
            item
          )})">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 mb-1">${
                  item.website
                }</h3>
                <p class="text-sm text-gray-500 mb-2">${formatCategoryName(
                  item.categoryKey
                )}</p>
              </div>
              ${getImpactBadge(item.category.impact)}
            </div>
            
            <p class="text-gray-600 text-sm mb-4">${
              item.category.description
            }</p>
            
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Click for detailed impact data</span>
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </div>
          </div>
        `
    )
    .join("");
}

// Open modal with detailed information
function openModal(itemIndex) {
  currentItem = allData[itemIndex];
  const modal = document.getElementById("detailModal");

  // Populate modal content
  document.getElementById("modalTitle").textContent = currentItem.website;
  document.getElementById("modalCategory").textContent = formatCategoryName(
    currentItem.categoryKey
  );
  document.getElementById("modalImpactBadge").innerHTML = getImpactBadge(
    currentItem.category.impact
  );
  document.getElementById("modalDescription").textContent =
    currentItem.category.description;

  // Show/hide estimates section
  const estimatesSection = document.getElementById("modalEstimates");
  if (currentItem.category.annual_estimate) {
    estimatesSection.classList.remove("hidden");

    // Energy data
    document.getElementById("modalEnergyAmount").textContent =
      currentItem.category.annual_estimate.wh;
    document.getElementById("modalEnergyComparison").textContent =
      currentItem.category.annual_estimate["wh-comparison"];

    // CO2 data
    document.getElementById("modalCO2Amount").textContent =
      currentItem.category.annual_estimate.co2;
    document.getElementById("modalCO2Comparison").textContent =
      currentItem.category.annual_estimate["co2-comparison"];
  } else {
    estimatesSection.classList.add("hidden");
  }

  // Source link
  const sourceLink = document.getElementById("modalSource");
  if (currentItem.category.source) {
    sourceLink.href = currentItem.category.source;
    sourceLink.textContent = currentItem.category.source;
  } else {
    sourceLink.textContent = "Source not available";
    sourceLink.removeAttribute("href");
  }

  // Show modal
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

// Close modal
function closeModal() {
  const modal = document.getElementById("detailModal");
  modal.classList.add("hidden");
  document.body.style.overflow = "auto";
  currentItem = null;
}

// Visit website
function visitWebsite() {
  if (currentItem) {
    const url = currentItem.website.startsWith("http")
      ? currentItem.website
      : `https://${currentItem.website}`;
    window.open(url, "_blank");
  }
}

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
  }
});

// Filter by impact
function filterByImpact(impact) {
  currentFilter = impact;

  // Update active button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active", "bg-blue-500", "text-white");
    btn.classList.add("bg-gray-200", "text-gray-800");
  });
  event.target.classList.remove("bg-gray-200", "text-gray-800");
  event.target.classList.add("active", "bg-blue-500", "text-white");

  // Filter data
  if (impact === "all") {
    filteredData = [...allData];
  } else {
    filteredData = allData.filter((item) => item.category.impact === impact);
  }

  displayResults();
}

// Search functionality
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();

    let dataToFilter =
      currentFilter === "all"
        ? allData
        : allData.filter((item) => item.category.impact === currentFilter);

    if (query) {
      filteredData = dataToFilter.filter(
        (item) =>
          item.website.toLowerCase().includes(query) ||
          formatCategoryName(item.categoryKey).toLowerCase().includes(query) ||
          item.category.description.toLowerCase().includes(query)
      );
    } else {
      filteredData = dataToFilter;
    }

    displayResults();
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupSearch();
});
