let currentWebsite = null;
let allData = {};
let aiSession = null;

const CACHE_KEY = "terraVueData";
const CACHE_DURATION = 30 * 60 * 1000;
const AI_CACHE_KEY = "terraVueAIDescriptions";
const AI_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

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

function getAIDescriptionFromCache(website) {
  try {
    const cached = localStorage.getItem(AI_CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();

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

async function generateWebsiteDescription(website, categoryKey, categoryData) {
  if (!("LanguageModel" in self)) {
    console.log("Language model not available");
    return null;
  }

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

    const description = await runPrompt(prompt, params);

    setAIDescriptionToCache(website, description);

    return description;
  } catch (error) {
    console.error("Failed to generate AI description:", error);
    return null;
  }
}

async function updateWebsiteDescriptionAsync(
  website,
  categoryKey,
  categoryData,
) {
  const descriptionElement = document.getElementById("websiteDescription");
  if (!descriptionElement) return;

  const actualCategoryData = categoryData.categoryData || categoryData;

  const fallbackDescription =
    categoryData.description ||
    actualCategoryData.description ||
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
    const aiDescription = await generateWebsiteDescription(
      website,
      categoryKey,
      actualCategoryData,
    );

    const indicator = document.getElementById("ai-loading-indicator");
    if (indicator) {
      indicator.remove();
    }

    if (aiDescription) {
      descriptionElement.style.opacity = "0.7";
      setTimeout(() => {
        descriptionElement.textContent = aiDescription;
        descriptionElement.style.opacity = "1";

        const successIndicator = document.createElement("div");
        successIndicator.className = "text-green-600 text-xs mt-1 opacity-50";
        successIndicator.innerHTML = "✓ Enhanced with Gemini Nano";
        descriptionElement.parentElement.appendChild(successIndicator);

        setTimeout(() => {
          if (successIndicator.parentElement) {
            successIndicator.remove();
          }
        }, 3000);
      }, 150);
    }
  } catch (error) {
    console.error("Error updating website description:", error);

    const indicator = document.getElementById("ai-loading-indicator");
    if (indicator) {
      indicator.remove();
    }
  }
}

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

function showToast(message, type = "success") {
  const existingToast = document.getElementById("toast-notification");
  if (existingToast) {
    existingToast.remove();
  }

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

  setTimeout(() => {
    toast.classList.remove("translate-x-full");
  }, 10);

  setTimeout(() => {
    hideToast();
  }, 3000);
}

function hideToast() {
  const toast = document.getElementById("toast-notification");
  if (toast) {
    toast.classList.add("translate-x-full");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
}

async function loadData() {
  try {
    document.getElementById("loadingState").classList.remove("hidden");
    document.getElementById("detailsContent").classList.add("hidden");
    document.getElementById("errorState").classList.add("hidden");

    const urlParams = new URLSearchParams(window.location.search);
    currentWebsite = urlParams.get("website");

    if (!currentWebsite) {
      throw new Error("No website specified");
    }

    const cachedData = getCachedData();
    if (cachedData) {
      const websiteData = cachedData[currentWebsite];
      if (websiteData) {
        populateDetails(
          currentWebsite,
          websiteData.category,
          websiteData,
          websiteData.icon,
        );

        document.getElementById("loadingState").classList.add("hidden");
        document.getElementById("detailsContent").classList.remove("hidden");

        updateWebsiteDescriptionAsync(
          currentWebsite,
          websiteData.category,
          websiteData,
        );
        return;
      }
    }

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

    const websiteInfo = linksData[currentWebsite];
    if (!websiteInfo) {
      throw new Error("Website not found in database");
    }

    const categoryKey = websiteInfo.categories;
    const iconKey = websiteInfo.icon;

    const category = categoriesData[categoryKey];
    if (!category) {
      throw new Error("Category data not found");
    }

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

    setCachedData(combinedData);

    populateDetails(currentWebsite, categoryKey, category, iconKey);

    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("detailsContent").classList.remove("hidden");

    updateWebsiteDescriptionAsync(currentWebsite, categoryKey, category);
  } catch (error) {
    console.error("Error loading data:", error);
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
  }
}

function populateDetails(website, categoryKey, category, iconKey) {
  const websiteTitleElement = document.getElementById("websiteTitle");
  const websiteIconElement = document.getElementById("websiteIcon");

  websiteTitleElement.textContent = website;
  document.getElementById("websiteCategory").textContent =
    formatCategoryName(categoryKey);
  document.getElementById("impactBadge").innerHTML = getImpactBadge(
    category.impact,
  );

  if (websiteIconElement) {
    if (iconKey && iconKey !== "none") {
      websiteIconElement.src = `https://cdn.simpleicons.org/${iconKey}`;
      websiteIconElement.alt = `${iconKey} icon`;

      websiteIconElement.onerror = function () {
        console.warn(
          `Simple Icons failed for: ${iconKey}, trying favicon fallback`,
        );
        setFallbackIcon(websiteIconElement, website);
      };
    } else {
      setFallbackIcon(websiteIconElement, website);
    }
  }

  const descriptionElement = document.getElementById("websiteDescription");
  if (descriptionElement) {
    const fallbackDescription =
      category.description ||
      `${website} is a ${formatCategoryName(
        categoryKey,
      ).toLowerCase()} service with ${category.impact} environmental impact.`;
    descriptionElement.textContent = fallbackDescription;
  }

  const actualCategoryData = category.categoryData || category;

  const estimatesSection = document.getElementById("estimatesSection");
  const noDataMessage = document.getElementById("noDataMessage");

  if (
    actualCategoryData.annual_estimate &&
    typeof actualCategoryData.annual_estimate === "object"
  ) {
    estimatesSection.classList.remove("hidden");
    noDataMessage.classList.add("hidden");

    const energyAmountEl = document.getElementById("energyAmount");
    const energyComparisonEl = document.getElementById("energyComparison");

    if (energyAmountEl && actualCategoryData.annual_estimate.wh) {
      energyAmountEl.textContent = actualCategoryData.annual_estimate.wh;
    }

    if (
      energyComparisonEl &&
      actualCategoryData.annual_estimate["wh-comparison"]
    ) {
      energyComparisonEl.textContent =
        actualCategoryData.annual_estimate["wh-comparison"];
    }

    const co2AmountEl = document.getElementById("co2Amount");
    const co2ComparisonEl = document.getElementById("co2Comparison");

    if (co2AmountEl && actualCategoryData.annual_estimate.co2) {
      co2AmountEl.textContent = actualCategoryData.annual_estimate.co2;
    }

    if (
      co2ComparisonEl &&
      actualCategoryData.annual_estimate["co2-comparison"]
    ) {
      co2ComparisonEl.textContent =
        actualCategoryData.annual_estimate["co2-comparison"];
    }
  } else {
    estimatesSection.classList.add("hidden");
    noDataMessage.classList.remove("hidden");
  }

  const sourceLink = document.getElementById("sourceLink");
  const noSourceText = document.getElementById("noSourceText");

  if (sourceLink && noSourceText) {
    if (actualCategoryData.source && actualCategoryData.source.trim() !== "") {
      sourceLink.href = actualCategoryData.source;
      sourceLink.textContent = actualCategoryData.source;
      sourceLink.classList.remove("hidden");
      noSourceText.classList.add("hidden");
    } else {
      sourceLink.classList.add("hidden");
      noSourceText.classList.remove("hidden");
    }
  } else {
    console.error("Source link elements not found in DOM");
  }

  document.title = `${website} - Environmental Impact Details - Terravue`;
}

function setFallbackIcon(iconElement, website) {
  const cleanDomain = website.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`;

  console.log(
    `Attempting to load favicon for ${website} from: ${googleFaviconUrl}`,
  );

  iconElement.src = googleFaviconUrl;
  iconElement.alt = `${website} favicon`;

  iconElement.onerror = function () {
    tryAlternativeFavicon(iconElement, cleanDomain, website);
  };
}

function tryAlternativeFavicon(iconElement, cleanDomain, website) {
  const duckDuckGoFaviconUrl = `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`;

  iconElement.src = duckDuckGoFaviconUrl;

  iconElement.onerror = function () {
    useLetterFallback(iconElement, website);
  };
}

function useLetterFallback(iconElement, website) {
  const firstLetter = website.charAt(0).toUpperCase();

  const letterSvg = `
    <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="12" fill="#10B981"/>
      <text x="32" y="40" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="bold" 
            text-anchor="middle" fill="white">${firstLetter}</text>
    </svg>
  `;

  const svgBase64 = btoa(letterSvg);
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  iconElement.src = dataUrl;
  iconElement.alt = `${website} letter icon`;
  iconElement.onerror = null;
}

function visitWebsite() {
  if (currentWebsite) {
    const url = currentWebsite.startsWith("http")
      ? currentWebsite
      : `https://${currentWebsite}`;
    window.open(url, "_blank");
  }
}

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
        if (error.name !== "AbortError") {
          copyToClipboard();
        }
      });
  } else {
    copyToClipboard();
  }
}

function copyToClipboard() {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        showToast("Link copied to clipboard!", "success");
      })
      .catch(() => {
        fallbackCopyToClipboard();
      });
  } else {
    fallbackCopyToClipboard();
  }
}

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

function goBack() {
  window.history.back();
}

function cleanup() {
  resetAISession();
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
});

window.addEventListener("beforeunload", cleanup);
