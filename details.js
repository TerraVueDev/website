let currentWebsite = null;
let allData = {};

// Get impact badge HTML
function getImpactBadge(impact) {
  const badges = {
    high: '<span class="impact-badge inline-flex items-center px-4 py-2 rounded-full text-base font-medium bg-red-100 text-red-800">🔴 High Environmental Impact</span>',
    medium:
      '<span class="impact-badge inline-flex items-center px-4 py-2 rounded-full text-base font-medium bg-yellow-100 text-yellow-800">🟡 Medium Environmental Impact</span>',
    low: '<span class="impact-badge inline-flex items-center px-4 py-2 rounded-full text-base font-medium bg-green-100 text-green-800">🟢 Low Environmental Impact</span>',
    unknown:
      '<span class="impact-badge inline-flex items-center px-4 py-2 rounded-full text-base font-medium bg-gray-100 text-gray-800">❓ Impact Unknown</span>',
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

// Load data and display details
async function loadData() {
  try {
    document.getElementById("loadingState").classList.remove("hidden");
    document.getElementById("detailsContent").classList.add("hidden");
    document.getElementById("errorState").classList.add("hidden");

    // Get website from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentWebsite = urlParams.get("website");

    if (!currentWebsite) {
      throw new Error("No website specified");
    }

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

    // Find the category for the current website
    const categoryKey = linksData[currentWebsite];
    if (!categoryKey) {
      throw new Error("Website not found in database");
    }

    const category = categoriesData[categoryKey];
    if (!category) {
      throw new Error("Category data not found");
    }

    // Populate the page
    populateDetails(currentWebsite, categoryKey, category);

    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("detailsContent").classList.remove("hidden");
  } catch (error) {
    console.error("Error loading data:", error);
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
  }
}

// Populate details on the page
function populateDetails(website, categoryKey, category) {
  // Header information
  document.getElementById("websiteTitle").textContent = website;
  document.getElementById("websiteCategory").textContent =
    formatCategoryName(categoryKey);
  document.getElementById("impactBadge").innerHTML = getImpactBadge(
    category.impact
  );
  document.getElementById("websiteDescription").textContent =
    category.description;

  // Show/hide estimates section
  const estimatesSection = document.getElementById("estimatesSection");
  const noDataMessage = document.getElementById("noDataMessage");

  if (category.annual_estimate) {
    estimatesSection.classList.remove("hidden");
    noDataMessage.classList.add("hidden");

    // Energy data
    document.getElementById("energyAmount").textContent =
      category.annual_estimate.wh;
    document.getElementById("energyComparison").textContent =
      category.annual_estimate["wh-comparison"];

    // CO2 data
    document.getElementById("co2Amount").textContent =
      category.annual_estimate.co2;
    document.getElementById("co2Comparison").textContent =
      category.annual_estimate["co2-comparison"];
  } else {
    estimatesSection.classList.add("hidden");
    noDataMessage.classList.remove("hidden");
  }

  // Source link
  const sourceLink = document.getElementById("sourceLink");
  const noSourceText = document.getElementById("noSourceText");

  if (category.source) {
    sourceLink.href = category.source;
    sourceLink.textContent = category.source;
    sourceLink.classList.remove("hidden");
    noSourceText.classList.add("hidden");
  } else {
    sourceLink.classList.add("hidden");
    noSourceText.classList.remove("hidden");
  }

  // Update page title
  document.title = `${website} - Environmental Impact Details - Terravue`;
}

// Visit website
function visitWebsite() {
  if (currentWebsite) {
    const url = currentWebsite.startsWith("http")
      ? currentWebsite
      : `https://${currentWebsite}`;
    window.open(url, "_blank");
  }
}

// Share link
function shareLink() {
  if (navigator.share) {
    navigator.share({
      title: `${currentWebsite} - Environmental Impact`,
      text: `Check out the environmental impact of ${currentWebsite}`,
      url: window.location.href,
    });
  } else {
    // Fallback to copying URL
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert("Link copied to clipboard!");
    });
  }
}

// Go back to search
function goBack() {
  window.history.back();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadData();
});
