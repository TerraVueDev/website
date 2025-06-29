let currentWebsite = null;
let allData = {};

// AI Session Management
let aiSession = null;

// Cache configuration (same as search.js)
const CACHE_KEY = "terraVueData";
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

// AI Description Cache
const AI_CACHE_KEY = "terraVueAIDescriptions";
const AI_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// AI Session Management Functions
async function getAISession(params) {
  if (!aiSession) {
    try {
      aiSession = await LanguageModel.create(params);
    } catch (e) {
      console.error("Failed to create AI session:", e);
      throw new Error("Language model not available.");
    }
  }
  return aiSession;
}

async function runPrompt(prompt, params) {
  try {
    const session = await getAISession(params);
    return await session.prompt(prompt);
  } catch (e) {
    console.error("Prompt execution failed:", e);
    resetAISession();
    throw e;
  }
}

function resetAISession() {
  if (aiSession) {
    aiSession.destroy();
    aiSession = null;
  }
}

// AI Description Cache Functions
function getAIDescriptionFromCache(website) {
  try {
    const cached = localStorage.getItem(AI_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > AI_CACHE_DURATION) {
      localStorage.removeItem(AI_CACHE_KEY);
      return null;
    }

    return data[website] || null;
  } catch (error) {
    console.warn("Error reading AI description from cache:", error);
    localStorage.removeItem(AI_CACHE_KEY);
    return null;
  }
}

function setAIDescriptionToCache(website, description) {
  try {
    let cached = localStorage.getItem(AI_CACHE_KEY);
    let cacheData = { data: {}, timestamp: Date.now() };

    if (cached) {
      const parsed = JSON.parse(cached);
      cacheData = {
        data: parsed.data || {},
        timestamp: parsed.timestamp || Date.now(),
      };
    }

    cacheData.data[website] = description;
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Error writing AI description to cache:", error);
  }
}

// Generate AI Description (async, non-blocking)
async function generateWebsiteDescription(website, categoryKey, categoryData) {
  // Check if AI is available
  if (!("LanguageModel" in self)) {
    console.log("Language model not available");
    return null;
  }

  // Check cache first
  const cachedDescription = getAIDescriptionFromCache(website);
  if (cachedDescription) {
    console.log("Using cached AI description for:", website);
    return cachedDescription;
  }

  try {
    const categoryName = formatCategoryName(categoryKey);
    const impactLevel = categoryData.impact;

    const prompt = `Generate a brief, informative description about ${website} and its environmental impact. The website belongs to the ${categoryName} category and has a ${impactLevel} environmental impact. 

    Focus on:
    - What the website/service does
    - Why it has environmental impact (energy usage, data centers, user behavior, etc.)
    - Keep it concise (2-3 sentences maximum)
    - Write in a neutral, informative tone
    - Don't use markdown formatting

    Start your response with: "${website} is"`;

    const params = {
      initialPrompts: [
        {
          role: "system",
          content:
            "You are an environmental impact analyst. Generate concise, factual descriptions about websites and their environmental impact. Do not use markdown formatting. Keep responses brief and informative.",
        },
      ],
    };

    console.log("Generating AI description for:", website);
    const description = await runPrompt(prompt, params);

    // Cache the generated description
    setAIDescriptionToCache(website, description);

    return description;
  } catch (error) {
    console.error("Failed to generate AI description:", error);
    return null;
  }
}

// Update website description with AI or fallback (async, non-blocking)
async function updateWebsiteDescriptionAsync(
  website,
  categoryKey,
  categoryData,
) {
  const descriptionElement = document.getElementById("websiteDescription");
  if (!descriptionElement) return;

  // Fix: Access the actual category data - check if it's nested in categoryData
  const actualCategoryData = categoryData.categoryData || categoryData;

  // Set fallback description immediately so page is not blocked
  const fallbackDescription =
    categoryData.description || // Try the direct description first
    actualCategoryData.description || // Then try nested description
    `${website} is a ${formatCategoryName(
      categoryKey,
    ).toLowerCase()} service with ${categoryData.impact} environmental impact.`;

  descriptionElement.textContent = fallbackDescription;

  // Show loading indicator in a subtle way
  const loadingIndicator = document.createElement("div");
  loadingIndicator.id = "ai-loading-indicator";
  loadingIndicator.className = "flex items-center text-gray-400 text-sm mt-2";
  loadingIndicator.innerHTML = `
    <div class="animate-spin rounded-full h-3 w-3 border border-gray-300 border-t-green-500 mr-2"></div>
    Generating enhanced description...
  `;
  descriptionElement.parentElement.appendChild(loadingIndicator);

  try {
    // Generate AI description asynchronously
    const aiDescription = await generateWebsiteDescription(
      website,
      categoryKey,
      actualCategoryData,
    );

    // Remove loading indicator
    const indicator = document.getElementById("ai-loading-indicator");
    if (indicator) {
      indicator.remove();
    }

    if (aiDescription) {
      // Smoothly update with AI description
      descriptionElement.style.opacity = "0.7";
      setTimeout(() => {
        descriptionElement.textContent = aiDescription;
        descriptionElement.style.opacity = "1";

        // Add a subtle success indicator
        const successIndicator = document.createElement("div");
        successIndicator.className = "text-green-600 text-xs mt-1 opacity-50";
        successIndicator.innerHTML = "✓ Enhanced with Gemini Nano";
        descriptionElement.parentElement.appendChild(successIndicator);

        // Remove success indicator after 3 seconds
        setTimeout(() => {
          if (successIndicator.parentElement) {
            successIndicator.remove();
          }
        }, 3000);
      }, 150);
    }
  } catch (error) {
    console.error("Error updating website description:", error);

    // Remove loading indicator on error
    const indicator = document.getElementById("ai-loading-indicator");
    if (indicator) {
      indicator.remove();
    }

    // Description remains as fallback, no need to change anything
  }
}

// Cache utility functions
function getCachedData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - timestamp > CACHE_DURATION) {
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

  const bgColor = type === "success" ? "bg-green-600" : "bg-blue-500";
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

// Load data and display details with caching
// Load data and display details with caching
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

    console.log("Loading data for website:", currentWebsite);

    // Check cache first
    const cachedData = getCachedData();
    if (cachedData) {
      console.log("Using cached data for details page");
      console.log("Cached data structure:", cachedData);

      // Find the website data in cache
      const websiteData = cachedData[currentWebsite];
      if (websiteData) {
        console.log("Website data found in cache:", websiteData);

        // Populate details immediately (non-blocking)
        populateDetails(
          currentWebsite,
          websiteData.category,
          websiteData,
          websiteData.icon,
        );

        // Show content immediately
        document.getElementById("loadingState").classList.add("hidden");
        document.getElementById("detailsContent").classList.remove("hidden");

        // Update AI description asynchronously (non-blocking)
        updateWebsiteDescriptionAsync(
          currentWebsite,
          websiteData.category,
          websiteData,
        );

        return;
      } else {
        console.log("Website not found in cache, fetching from API");
      }
    } else {
      console.log("No cache found, fetching fresh data from API");
    }

    // Fetch from API if no cache or website not in cache
    const [linksResponse, categoriesResponse] = await Promise.all([
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/links.json",
      ),
      fetch(
        "https://raw.githubusercontent.com/TerraVueDev/assets/refs/heads/main/categories.json",
      ),
    ]);

    if (!linksResponse.ok || !categoriesResponse.ok) {
      throw new Error("Failed to fetch data");
    }

    const linksData = await linksResponse.json();
    const categoriesData = await categoriesResponse.json();

    console.log("Links data loaded:", linksData);
    console.log("Categories data loaded:", categoriesData);

    // Find the website data in links.json
    const websiteInfo = linksData[currentWebsite];
    if (!websiteInfo) {
      throw new Error("Website not found in database");
    }

    console.log("Website info from links.json:", websiteInfo);

    // Get category key and icon from website info
    const categoryKey = websiteInfo.categories;
    const iconKey = websiteInfo.icon;

    const category = categoriesData[categoryKey];
    if (!category) {
      throw new Error("Category data not found");
    }

    console.log("Category data from categories.json:", category);

    // Build combined data structure for caching
    const combinedData = {};
    for (const [website, websiteData] of Object.entries(linksData)) {
      const catKey = websiteData.categories;
      if (categoriesData[catKey]) {
        combinedData[website] = {
          category: catKey,
          icon: websiteData.icon,
          ...categoriesData[catKey],
        };
      }
    }

    console.log("Combined data structure:", combinedData);

    // Cache the processed data
    setCachedData(combinedData);

    // Populate the page immediately (non-blocking)
    populateDetails(currentWebsite, categoryKey, category, iconKey);

    // Show content immediately
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("detailsContent").classList.remove("hidden");

    // Update AI description asynchronously (non-blocking)
    updateWebsiteDescriptionAsync(currentWebsite, categoryKey, category);
  } catch (error) {
    console.error("Error loading data:", error);
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
  }
}

/// Populate details on the page (synchronous, immediate)
function populateDetails(website, categoryKey, category, iconKey) {
  console.log("Populating details for:", website);
  console.log("Category data:", category);
  console.log("Category key:", categoryKey);
  console.log("Icon key:", iconKey);

  // Header information with icon
  const websiteTitleElement = document.getElementById("websiteTitle");
  const websiteIconElement = document.getElementById("websiteIcon");

  websiteTitleElement.textContent = website;
  document.getElementById("websiteCategory").textContent =
    formatCategoryName(categoryKey);
  document.getElementById("impactBadge").innerHTML = getImpactBadge(
    category.impact,
  );

  // Update website icon with fallback hierarchy
  if (websiteIconElement) {
    if (iconKey && iconKey !== "none") {
      // Use Simple Icons CDN
      websiteIconElement.src = `https://cdn.simpleicons.org/${iconKey}`;
      websiteIconElement.alt = `${iconKey} icon`;

      // Add error handling - fallback to favicon if Simple Icons fails
      websiteIconElement.onerror = function () {
        console.warn(
          `Simple Icons failed for: ${iconKey}, trying favicon fallback`,
        );
        setFallbackIcon(websiteIconElement, website);
      };

      websiteIconElement.onload = function () {
        console.log(`Simple Icons loaded successfully for: ${iconKey}`);
      };
    } else {
      // If iconKey is "none" or not provided, use favicon fallback
      console.log(
        `Icon key is "${iconKey}" for ${website}, using favicon fallback`,
      );
      setFallbackIcon(websiteIconElement, website);
    }
  }

  // Set initial fallback description (will be updated by AI async)
  const descriptionElement = document.getElementById("websiteDescription");
  if (descriptionElement) {
    const fallbackDescription =
      category.description ||
      `${website} is a ${formatCategoryName(
        categoryKey,
      ).toLowerCase()} service with ${category.impact} environmental impact.`;
    descriptionElement.textContent = fallbackDescription;
  }

  // Fix: Access the actual category data - check if it's nested in categoryData
  const actualCategoryData = category.categoryData || category;
  console.log("Actual category data for estimates:", actualCategoryData);
  console.log("Annual estimate data:", actualCategoryData.annual_estimate);

  // Show/hide estimates section with better error handling
  const estimatesSection = document.getElementById("estimatesSection");
  const noDataMessage = document.getElementById("noDataMessage");

  if (
    actualCategoryData.annual_estimate &&
    typeof actualCategoryData.annual_estimate === "object"
  ) {
    console.log("Annual estimate found, populating data...");

    estimatesSection.classList.remove("hidden");
    noDataMessage.classList.add("hidden");

    // Energy data with null checks
    const energyAmountEl = document.getElementById("energyAmount");
    const energyComparisonEl = document.getElementById("energyComparison");

    if (energyAmountEl && actualCategoryData.annual_estimate.wh) {
      energyAmountEl.textContent = actualCategoryData.annual_estimate.wh;
      console.log("Energy amount set:", actualCategoryData.annual_estimate.wh);
    } else {
      console.warn("Energy amount element not found or data missing");
    }

    if (
      energyComparisonEl &&
      actualCategoryData.annual_estimate["wh-comparison"]
    ) {
      energyComparisonEl.textContent =
        actualCategoryData.annual_estimate["wh-comparison"];
      console.log(
        "Energy comparison set:",
        actualCategoryData.annual_estimate["wh-comparison"],
      );
    } else {
      console.warn("Energy comparison element not found or data missing");
    }

    // CO2 data with null checks
    const co2AmountEl = document.getElementById("co2Amount");
    const co2ComparisonEl = document.getElementById("co2Comparison");

    if (co2AmountEl && actualCategoryData.annual_estimate.co2) {
      co2AmountEl.textContent = actualCategoryData.annual_estimate.co2;
      console.log("CO2 amount set:", actualCategoryData.annual_estimate.co2);
    } else {
      console.warn("CO2 amount element not found or data missing");
    }

    if (
      co2ComparisonEl &&
      actualCategoryData.annual_estimate["co2-comparison"]
    ) {
      co2ComparisonEl.textContent =
        actualCategoryData.annual_estimate["co2-comparison"];
      console.log(
        "CO2 comparison set:",
        actualCategoryData.annual_estimate["co2-comparison"],
      );
    } else {
      console.warn("CO2 comparison element not found or data missing");
    }
  } else {
    console.log("No annual estimate data found, showing no data message");
    estimatesSection.classList.add("hidden");
    noDataMessage.classList.remove("hidden");
  }

  // Source link with better error handling - also check nested data
  const sourceLink = document.getElementById("sourceLink");
  const noSourceText = document.getElementById("noSourceText");

  console.log("Source data:", actualCategoryData.source);

  if (sourceLink && noSourceText) {
    if (actualCategoryData.source && actualCategoryData.source.trim() !== "") {
      sourceLink.href = actualCategoryData.source;
      sourceLink.textContent = actualCategoryData.source;
      sourceLink.classList.remove("hidden");
      noSourceText.classList.add("hidden");
      console.log("Source link set:", actualCategoryData.source);
    } else {
      sourceLink.classList.add("hidden");
      noSourceText.classList.remove("hidden");
      console.log("No source data available");
    }
  } else {
    console.error("Source link elements not found in DOM");
  }

  // Update page title
  document.title = `${website} - Environmental Impact Details - Terravue`;
}

// Set fallback icon using website favicon
function setFallbackIcon(iconElement, website) {
  // Clean the website URL (remove protocol if present)
  const cleanDomain = website.replace(/^https?:\/\//, "").replace(/^www\./, "");

  // Try Google's favicon service first (most reliable)
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`;

  console.log(
    `Attempting to load favicon for ${website} from: ${googleFaviconUrl}`,
  );

  // Set the favicon URL
  iconElement.src = googleFaviconUrl;
  iconElement.alt = `${website} favicon`;

  // Add error handling for favicon loading
  iconElement.onerror = function () {
    console.warn(`Google favicon failed for ${website}, trying alternative`);
    tryAlternativeFavicon(iconElement, cleanDomain, website);
  };

  iconElement.onload = function () {
    console.log(`Favicon loaded successfully for ${website}`);
  };
}

// Try alternative favicon services if Google fails
function tryAlternativeFavicon(iconElement, cleanDomain, website) {
  // Try DuckDuckGo's favicon service as backup
  const duckDuckGoFaviconUrl = `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;

  console.log(
    `Trying DuckDuckGo favicon for ${website}: ${duckDuckGoFaviconUrl}`,
  );

  iconElement.src = duckDuckGoFaviconUrl;

  iconElement.onerror = function () {
    console.warn(
      `DuckDuckGo favicon failed for ${website}, using letter fallback`,
    );
    useLetterFallback(iconElement, website);
  };

  iconElement.onload = function () {
    console.log(`DuckDuckGo favicon loaded successfully for ${website}`);
  };
}

// Final fallback: letter-based icon
function useLetterFallback(iconElement, website) {
  console.log(`Using letter fallback for ${website}`);

  const firstLetter = website.charAt(0).toUpperCase();

  // Create an SVG with the first letter
  const letterSvg = `
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="12" fill="#10B981"/>
      <text x="32" y="40" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="bold" 
            text-anchor="middle" fill="white">${firstLetter}</text>
    </svg>
  `;

  // Convert SVG to base64 data URL
  const svgBase64 = btoa(letterSvg);
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  iconElement.src = dataUrl;
  iconElement.alt = `${website} letter icon`;
  iconElement.onerror = null; // Remove error handler to prevent infinite loop
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

// Cleanup function for AI session
function cleanup() {
  resetAISession();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadData();
});

// Cleanup on page unload
window.addEventListener("beforeunload", cleanup);
