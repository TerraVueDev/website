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

// Show toast notification
function showToast(message, type = "success") {
  // Remove existing toast if any
  const existingToast = document.getElementById("toast-notification");
  if (existingToast) {
    existingToast.remove();
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.id = "toast-notification";

  const bgColor = type === "success" ? "bg-green-500" : "bg-blue-500";
  const iconColor = type === "success" ? "text-green-200" : "text-blue-200";
  const icon = type === "success" ? "✓" : "ℹ";

  toast.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50 transform translate-x-full transition-transform duration-300 ease-out`;

  toast.innerHTML = `
    <span class="${iconColor} text-lg font-bold">${icon}</span>
    <span class="font-medium">${message}</span>
    <button onclick="hideToast()" class="ml-2 text-white hover:text-gray-200 text-lg leading-none">&times;</button>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  setTimeout(() => {
    toast.classList.remove("translate-x-full");
  }, 10);

  // Auto hide after 3 seconds
  setTimeout(() => {
    hideToast();
  }, 3000);
}

// Hide toast notification
function hideToast() {
  const toast = document.getElementById("toast-notification");
  if (toast) {
    toast.classList.add("translate-x-full");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
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
    navigator
      .share({
        title: `${currentWebsite} - Environmental Impact`,
        text: `Check out the environmental impact of ${currentWebsite}`,
        url: window.location.href,
      })
      .then(() => {
        showToast("Shared successfully!", "success");
      })
      .catch((error) => {
        // If native sharing fails, fall back to copying
        if (error.name !== "AbortError") {
          copyToClipboard();
        }
      });
  } else {
    // Fallback to copying URL
    copyToClipboard();
  }
}

// Copy link to clipboard
function copyToClipboard() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        showToast("Link copied to clipboard!", "success");
      })
      .catch(() => {
        // Fallback for older browsers
        fallbackCopyToClipboard();
      });
  } else {
    // Fallback for older browsers
    fallbackCopyToClipboard();
  }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard() {
  const textArea = document.createElement("textarea");
  textArea.value = window.location.href;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
    showToast("Link copied to clipboard!", "success");
  } catch (err) {
    showToast("Unable to copy link", "info");
  }

  document.body.removeChild(textArea);
}

// Go back to search
function goBack() {
  window.history.back();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadData();
});
