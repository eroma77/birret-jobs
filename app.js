/**
 * app.js - Project-based Job Platform (Kazakhstan)
 * Pure JavaScript application logic with Supabase Auth & Postgres database
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- APPLICATION STATE ---
  const state = {
    jobs: [],
    favorites: [],
    user: null,
    currentView: "vacancies", // vacancies | favorites | cabinet
    authMode: "signin", // signin | signup
    filters: {
      sort: "newest",
      professions: [],
      cities: [],
      excludeProfessions: [],
      age: null,
      remoteOnly: false,
      gender: "all"
    },
    formState: {
      profession: "",
      gender: "any",
      ageFrom: 18,
      ageTo: 30,
      description: "",
      city: "",
      address: "",
      isRemote: false,
      payment: "",
      isNegotiable: false,
      phone: ""
    },
    editingJobId: null, // If editing an existing job
    authRedirect: null,  // Holds pending action for guest users
    isDirty: false       // Tracks if job form has unsaved changes
  };

  let supabaseClient = null;
  const multiSelectSyncRegistry = {};

  // ---------------------------------------------------------------------------
  // i18n SHORTHAND — always reads the active language at call time
  // Usage: t("keyName")  — never cache the result across language switches
  // ---------------------------------------------------------------------------
  function t(key) {
    const dict = window.TRANSLATIONS && window.TRANSLATIONS[window.currentLanguage];
    if (!dict) return key; // Graceful degradation: return key name instead of crashing
    const value = dict[key];
    if (value === undefined) {
      console.warn(`[i18n] Missing translation key: "${key}" for lang="${window.currentLanguage}"`);
      return key;
    }
    return value;
  }

  // ---------------------------------------------------------------------------
  // SERVER ERROR CODE → LOCALIZED TOAST
  // Maps machine-readable `code` from server.js error responses to
  // the active locale's human-readable string in translations.js.
  // Falls back to null so the caller can use the raw server message.
  // ---------------------------------------------------------------------------
  function serverCodeToast(code) {
    const codeMap = {
      AUTH_REQUIRED:               "serverErrorAuthRequired",
      FORBIDDEN:                   "serverErrorForbidden",
      NOT_FOUND:                   "serverErrorNotFound",
      INVALID_PROFESSION:          "serverErrorInvalidProfession",
      INVALID_GENDER:              "serverErrorInvalidGender",
      INVALID_AGE_RANGE:           "serverErrorInvalidAgeRange",
      INVALID_DESCRIPTION_LENGTH:  "serverErrorInvalidDescriptionLength",
      DESCRIPTION_CONTAINS_URL:    "serverErrorDescriptionContainsUrl",
      INVALID_CITY:                "serverErrorInvalidCity",
      INVALID_ADDRESS:             "serverErrorInvalidAddress",
      INVALID_PAYMENT:             "serverErrorInvalidPayment",
      INVALID_PHONE:               "serverErrorInvalidPhone",
    };
    const translationKey = codeMap[code];
    return translationKey ? t(translationKey) : null;
  }

  // --- INITIALIZATION ---
  async function init() {
    // Set initial language fixed to Russian (Cyrillic Kazakh still valid in regex validation)
    window.currentLanguage = "ru";

    // Apply saved theme (Dark Mode)
    const savedTheme = localStorage.getItem("birret_theme") || "light";
    if (savedTheme === "dark") {
      document.documentElement.setAttribute("data-theme", "dark");
      const sun = document.getElementById("iconSun");
      const moon = document.getElementById("iconMoon");
      if (sun) sun.classList.remove("hidden");
      if (moon) moon.classList.add("hidden");
    }

    // Wait for Supabase config fetch to finish (resolving race condition)
    if (window.__BIRRET_CONFIG_PROMISE) {
      try {
        supabaseClient = await window.__BIRRET_CONFIG_PROMISE;
        console.log("[Birret] Supabase client initialized via early config promise.");
        initSupabaseAuth();
      } catch (err) {
        console.error("Failed to initialize Supabase via promise:", err);
        showConfigErrorState();
      }
    } else {
      // Fallback: try fetching config from server (old path)
      try {
        const configRes = await fetch("/api/config");
        const config = await configRes.json();
        supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.log("[Birret] Supabase client initialized via fallback config fetch.");
        initSupabaseAuth();
      } catch (err) {
        console.error("Failed to initialize Supabase:", err);
        showConfigErrorState();
      }
    }

    loadFavorites();
    initVirtualKeyboardDetection();
    initDropdowns();
    initFormHandlers();
    bindEvents();
    applyLanguage(window.currentLanguage);
    showView("vacancies");
    loadJobsFromServer();
  }

  function showConfigErrorState() {
    // Display config error banner
    const banner = document.getElementById("configErrorBanner");
    if (banner) {
      banner.classList.remove("hidden");
      // Trigger CSS transition
      setTimeout(() => banner.classList.add("active"), 10);
    }
    
    // Disable primary interactive elements
    const buttonsToDisable = [
      "btnOpenCreateForm",
      "btnGoogleSignIn",
      "btnPreviewPublish",
      "btnFilterApply"
    ];
    buttonsToDisable.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      }
    });

    showToast(t("toastConfigError"), "error");
  }


  function escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDescriptionHTML(text) {
    if (!text) return "";
    let html = escapeHTML(text);
    
    // Support markdown bold: **text** or __text__ -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");
    
    // Support markdown italic: *text* or _text_ -> <em>text</em>
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    html = html.replace(/_(.*?)_/g, "<em>$1</em>");
    
    // Preserve lists and newlines
    html = html.replace(/\n/g, "<br>");
    
    return html;
  }


  // --- TRANSLATION ENGINE (Fixed to RU) ---
  function applyLanguage(lang) {
    const fixedLang = "ru";
    window.currentLanguage = fixedLang;
    
    document.documentElement.lang = fixedLang;

    const elements = document.querySelectorAll("[data-i18n]");
    const dict = window.TRANSLATIONS[fixedLang];
    if (dict) {
      elements.forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) {
          if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
            el.placeholder = dict[key];
          } else {
            el.textContent = dict[key];
          }
        }
      });
    }

    // Translate the platform support link in the cabinet profile card
    const supportBtn = document.querySelector(".btn-contact-author");
    if (supportBtn && dict && dict.supportWhatsApp) {
      supportBtn.href = dict.supportWhatsApp;
    }

    // Refresh translation placeholders for dropdown inputs
    const pSearch = document.getElementById("formProfessionSearch");
    if (pSearch && dict.placeholderSearch) pSearch.placeholder = dict.placeholderSearch;
    const cSearch = document.getElementById("formCitySearch");
    if (cSearch && dict.placeholderSearch) cSearch.placeholder = dict.placeholderSearch;
    
    const filterP = document.getElementById("filterProfessionSearch");
    if (filterP && dict.placeholderFormProfessionSearch) filterP.placeholder = dict.placeholderFormProfessionSearch;
    const filterC = document.getElementById("filterCitySearch");
    if (filterC && dict.placeholderFormCitySearch) filterC.placeholder = dict.placeholderFormCitySearch;
    const filterE = document.getElementById("filterExcludeSearch");
    if (filterE && dict.placeholderFilterExcludeSearch) filterE.placeholder = dict.placeholderFilterExcludeSearch;

    // Dynamic age placeholders
    const fromText = document.getElementById("formAgeFromText");
    const toText = document.getElementById("formAgeToText");
    if (fromText && !fromText.classList.contains("has-value")) {
      fromText.textContent = dict.ageFrom || (lang === "kk" ? "Бастап" : "От");
    }
    if (toText && !toText.classList.contains("has-value")) {
      toText.textContent = dict.ageTo || (lang === "kk" ? "Дейін" : "До");
    }

    // Sync all multi-select tag representations in the new language
    syncMultiSelectTags("filterProfession");
    syncMultiSelectTags("filterCity");
    syncMultiSelectTags("filterExclude");

    // Re-render components with translated static values
    applyFiltersAndRender(false);
    updateAuthUI();
  }

  // --- SUPABASE AUTH INITIALIZATION ---
  function initSupabaseAuth() {
    if (!supabaseClient) return;

    // Register the auth handler so future onAuthStateChange events call it directly
    window.__BIRRET_AUTH_HANDLER = function (event, session) {
      console.log("[Auth] Handling event:", event, "| user:", session?.user?.email || "none");
      handleAuthSession(session, event);
      if (event === "SIGNED_IN" && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        console.log("[Auth] ✅ URL hash cleared.");
      }
    };

    // If supabaseClient is a duplicate client, subscribe it to auth state changes
    if (supabaseClient !== window.__BIRRET_SUPABASE) {
      console.log("[Auth] Subscribing new Supabase client instance to onAuthStateChange.");
      supabaseClient.auth.onAuthStateChange((event, session) => {
        window.__BIRRET_AUTH_HANDLER(event, session);
      });
    }

    // Drain any auth events that fired BEFORE app.js was ready (queued in <head>)
    const queue = window.__BIRRET_AUTH_QUEUE || [];
    if (queue.length > 0) {
      console.log("[Auth] Draining", queue.length, "queued auth event(s).");
      queue.forEach(function ({ event, session }) {
        window.__BIRRET_AUTH_HANDLER(event, session);
      });
      window.__BIRRET_AUTH_QUEUE = [];
    }

    // Fallback A: getSession() — SDK may have parsed the hash internally
    supabaseClient.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("[Auth] getSession error:", error.message);
      }
      console.log("[Auth] getSession:", session ? "✅ " + session.user.email : "❌ no session");
      if (session && !state.user) {
        handleAuthSession(session, "INITIAL_SESSION");
        if (window.location.hash.includes("access_token")) {
          window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
        }
      } else if (!session && window.location.hash.includes("access_token")) {
        // Fallback B: SDK didn't find session — manually parse hash and call setSession
        console.warn("[Auth] SDK missed the hash — attempting manual setSession...");
        tryManualHashAuth();
      }
    });
  }

  // Last-resort: parse access_token + refresh_token from URL hash manually
  async function tryManualHashAuth() {
    try {
      const hash = window.location.hash.substring(1); // remove leading #
      const params = new URLSearchParams(hash);
      const accessToken  = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (!accessToken) {
        console.warn("[Auth] No access_token in hash — nothing to do.");
        return;
      }

      console.log("[Auth] Manual setSession with token from hash...");
      const { data, error } = await supabaseClient.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken || ""
      });

      if (error) {
        console.error("[Auth] Manual setSession failed:", error.message);
        return;
      }

      if (data?.session) {
        console.log("[Auth] ✅ Manual setSession succeeded:", data.session.user.email);
        handleAuthSession(data.session, "SIGNED_IN");
        window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }
    } catch (e) {
      console.error("[Auth] tryManualHashAuth exception:", e);
    }
  }





  function handleAuthSession(session, event) {
    if (session && session.user) {
      const u    = session.user;
      const meta = u.user_metadata || {};

      // Prefer Google display name; fall back to email prefix
      const displayName = meta.full_name || meta.name || u.email.split('@')[0];
      const avatarUrl   = meta.avatar_url || meta.picture || null;

      state.user = {
        id:        u.id,
        email:     u.email,
        name:      displayName,
        avatar:    displayName.charAt(0).toUpperCase(),
        avatarUrl: avatarUrl
      };

      // Sync favorites from user metadata (cloud-based) to memory state
      if (meta.favorites && Array.isArray(meta.favorites)) {
        state.favorites = meta.favorites;
        saveFavoritesToStorage();
      } else {
        loadFavorites();
      }

      // Close modal & show welcome on any sign-in event (including our INITIAL_SESSION fallback)
      const isNewLogin = (event === "SIGNED_IN" || event === "INITIAL_SESSION");
      if (isNewLogin) {
        const modal = document.getElementById("authModal");
        if (modal) modal.classList.remove("active");

        // Welcome toast disabled to prevent UX overlapping and overlapping with filter close button
        // showToast(t("toastWelcome").replace("{name}", displayName), "success");

        // Execute any pending action that required auth
        if (state.authRedirect) {
          const redirect = state.authRedirect;
          state.authRedirect = null;
          setTimeout(() => executeRedirectAction(redirect), 300);
        }
      }
    } else {
      state.user = null;
      state.favorites = [];
      saveFavoritesToStorage();
    }

    updateAuthUI();
  }


  // --- GOOGLE OAUTH AUTHENTICATION ---
  async function handleGoogleSignIn() {
    if (!supabaseClient) {
      showToast(t("toastServerUnavailable"), "error");
      return;
    }
    if (!navigator.onLine) {
      showToast(t("toastOffline"), "error");
      return;
    }

    const btn = document.getElementById("btnGoogleSignIn");
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = "0.7";
    }

    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
      // Browser will redirect to Google — no further action needed here
    } catch (err) {
      console.error("Google OAuth error:", err);
      showToast(t("toastGoogleAuthError") + err.message, "error");
      if (btn) { btn.disabled = false; btn.style.opacity = "1"; }
    }
  }

  function executeRedirectAction(redirect) {
    if (redirect.type === "favorite") {
      toggleFavorite(redirect.jobId);
    } else if (redirect.type === "contact") {
      openWhatsAppLink(redirect.jobId);
    } else if (redirect.type === "publishForm") {
      showView("cabinet");
      openJobForm();
    } else if (redirect.type === "viewDetails") {
      openJobDetails(redirect.jobId);
    }
  }

  async function handleLogout() {
    try {
      if (supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      state.user = null;
      updateAuthUI();
      showView("vacancies");
      showToast(t("toastLogoutSuccess"), "info");
    } catch (err) {
      console.error(err);
    }
  }

  function updateAuthUI() {
    const guestState = document.getElementById("cabinetGuestState");
    const authState = document.getElementById("cabinetAuthState");
    
    if (state.user) {
      guestState.classList.add("hidden");
      authState.classList.remove("hidden");
      
      document.getElementById("profileName").textContent = state.user.name;
      document.getElementById("profileEmail").textContent = state.user.email;

      // Show Google profile photo if available, otherwise show initial letter
      const avatarEl = document.getElementById("profileAvatar");
      if (state.user.avatarUrl) {
        avatarEl.innerHTML = `<img src="${state.user.avatarUrl}" alt="avatar"
          style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
        avatarEl.textContent = "";
      } else {
        avatarEl.innerHTML = "";
        avatarEl.textContent = state.user.avatar;
      }
      
      renderMyJobs();
    } else {
      guestState.classList.remove("hidden");
      authState.classList.add("hidden");
    }
  }


  // --- DATABASE SERVER HELPERS ---
  async function loadJobsFromServer() {
    renderSkeletons();
    try {
      const response = await fetch("/api/jobs");
      if (!response.ok) throw new Error("server_error");
      
      state.jobs = await response.json();
      localStorage.setItem("birret_jobs", JSON.stringify(state.jobs));
      applyFiltersAndRender(false);
    } catch (err) {
      console.error("Database connection error:", err);
      showToast(t("toastDbError"), "error");
      
      const savedJobs = localStorage.getItem("birret_jobs");
      if (savedJobs) {
        state.jobs = JSON.parse(savedJobs);
      } else {
        state.jobs = window.currentLanguage === "kk" ? [...window.INITIAL_JOBS_KZ] : [...window.INITIAL_JOBS_RU];
      }
      applyFiltersAndRender(false);
    }
  }

  function loadFavorites() {
    const savedFavs = localStorage.getItem("birret_favorites");
    if (savedFavs) {
      state.favorites = JSON.parse(savedFavs);
    } else {
      state.favorites = [];
    }
  }

  function saveFavoritesToStorage() {
    localStorage.setItem("birret_favorites", JSON.stringify(state.favorites));
  }

  // --- VIRTUAL KEYBOARD DETECTION (MOBILE PORTRAIT ONLY) ---
  function initVirtualKeyboardDetection() {
    const inputs = document.querySelectorAll("input, textarea, select");
    
    inputs.forEach(input => {
      input.addEventListener("focus", () => {
        if (window.innerWidth < 768) {
          document.body.classList.add("keyboard-active");
        }
      });
      
      input.addEventListener("blur", () => {
        document.body.classList.remove("keyboard-active");
      });
    });

    if (window.visualViewport) {
      let initialHeight = window.visualViewport.height;
      window.visualViewport.addEventListener("resize", () => {
        if (window.innerWidth < 768) {
          const currentHeight = window.visualViewport.height;
          if (initialHeight - currentHeight > 150) {
            document.body.classList.add("keyboard-active");
          } else {
            document.body.classList.remove("keyboard-active");
          }
        }
      });
    }
  }

  // --- CUSTOM SEARCHABLE DROPDOWNS ENGINE ---
  function initDropdowns() {
    // 1. Create Job Form - Profession Dropdown
    setupSingleSelectDropdown({
      triggerId: "formProfessionTrigger",
      menuId: "formProfessionMenu",
      searchId: "formProfessionSearch",
      listId: "formProfessionList",
      data: () => window.getProfessionsList(window.currentLanguage),
      placeholder: "Выберите профессию",
      isSelected: (id) => state.formState.profession === id,
      onSelect: (value) => {
        state.formState.profession = value;
        state.isDirty = true;
        validateField("profession");
        checkFormValidity();
      },
      searchFilter: (item, query) => item.name.toLowerCase().includes(query.toLowerCase())
    });

    // 2. Create Job Form - City Dropdown
    setupSingleSelectDropdown({
      triggerId: "formCityTrigger",
      menuId: "formCityMenu",
      searchId: "formCitySearch",
      listId: "formCityList",
      data: () => window.getCitiesList(window.currentLanguage),
      placeholder: "Выберите город",
      isSelected: (id) => state.formState.city === id,
      onSelect: (value) => {
        state.formState.city = value;
        state.isDirty = true;
        validateField("city");
        checkFormValidity();
      },
      searchFilter: (item, query) => item.name.toLowerCase().startsWith(query.toLowerCase())
    });

    // 3. Create Job Form - Age "From" & "To" Dropdowns
    setupAgeDropdowns();

    // 4. Filters - Profession (Multi-select)
    setupMultiSelectDropdown({
      triggerId: "filterProfessionTrigger",
      menuId: "filterProfessionMenu",
      searchId: "filterProfessionSearch",
      listId: "filterProfessionList",
      tagsContainerId: "filterProfessionTags",
      data: () => window.getProfessionsList(window.currentLanguage),
      translate: (id) => window.translateProfession(id, window.currentLanguage),
      selectedState: state.filters.professions,
      onChanged: () => {
        state.filters.professions.forEach(prof => {
          const idx = state.filters.excludeProfessions.indexOf(prof);
          if (idx !== -1) {
            state.filters.excludeProfessions.splice(idx, 1);
          }
        });
        syncMultiSelectTags("filterExclude");
        updateFilterBadge();
      },
      searchFilter: (item, query) => item.name.toLowerCase().includes(query.toLowerCase())
    });

    // 5. Filters - City (Multi-select)
    setupMultiSelectDropdown({
      triggerId: "filterCityTrigger",
      menuId: "filterCityMenu",
      searchId: "filterCitySearch",
      listId: "filterCityList",
      tagsContainerId: "filterCityTags",
      data: () => window.getCitiesList(window.currentLanguage),
      translate: (id) => window.translateCity(id, window.currentLanguage),
      selectedState: state.filters.cities,
      onChanged: () => {
        updateFilterBadge();
      },
      searchFilter: (item, query) => item.name.toLowerCase().startsWith(query.toLowerCase())
    });

    // 6. Filters - Exclude Profession (Multi-select)
    setupMultiSelectDropdown({
      triggerId: "filterExcludeTrigger",
      menuId: "filterExcludeMenu",
      searchId: "filterExcludeSearch",
      listId: "filterExcludeList",
      tagsContainerId: "filterExcludeTags",
      data: () => window.getProfessionsList(window.currentLanguage),
      translate: (id) => window.translateProfession(id, window.currentLanguage),
      selectedState: state.filters.excludeProfessions,
      onChanged: () => {
        state.filters.excludeProfessions.forEach(prof => {
          const idx = state.filters.professions.indexOf(prof);
          if (idx !== -1) {
            state.filters.professions.splice(idx, 1);
          }
        });
        syncMultiSelectTags("filterProfession");
        updateFilterBadge();
      },
      excludeMode: true,
      searchFilter: (item, query) => item.name.toLowerCase().includes(query.toLowerCase())
    });
  }

  function setupSingleSelectDropdown({ triggerId, menuId, searchId, listId, data, placeholder, isSelected, onSelect, searchFilter }) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const search = document.getElementById(searchId);
    const list = document.getElementById(listId);
    const triggerText = trigger.querySelector(".dropdown-trigger-text");

    // Add listbox ARIA role to dropdown menu list
    if (list) list.setAttribute("role", "listbox");

    let lastRenderedLanguage = null;

    const buildOptions = () => {
      list.innerHTML = "";
      const getArray = () => (typeof data === "function" ? data() : data);
      const items = getArray();
      
      items.forEach(item => {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        option.setAttribute("role", "option");
        
        const itemId = item.id !== undefined ? item.id : item;
        const itemName = item.name !== undefined ? item.name : item;

        option.textContent = itemName;
        option.dataset.value = itemId;

        option.addEventListener("click", () => {
          triggerText.textContent = itemName;
          triggerText.classList.add("has-value");
          menu.classList.remove("show");
          trigger.classList.remove("open");
          trigger.setAttribute("aria-expanded", "false");
          onSelect(itemId);
        });
        list.appendChild(option);
      });

      const noResults = document.createElement("div");
      noResults.className = "dropdown-option dropdown-no-results hidden";
      noResults.style.color = "var(--color-text-light)";
      noResults.style.pointerEvents = "none";
      noResults.setAttribute("role", "presentation");
      noResults.textContent = (window.TRANSLATIONS[window.currentLanguage] && window.TRANSLATIONS[window.currentLanguage].nothingFound) || "Ничего не найдено";
      list.appendChild(noResults);

      lastRenderedLanguage = window.currentLanguage;
    };

    const filterList = (query = "") => {
      if (lastRenderedLanguage !== window.currentLanguage) {
        buildOptions();
      }

      const getArray = () => (typeof data === "function" ? data() : data);
      const items = getArray();
      let visibleCount = 0;

      const options = list.querySelectorAll(".dropdown-option:not(.dropdown-no-results)");
      options.forEach(option => {
        const itemId = option.dataset.value;
        const item = items.find(i => (i.id !== undefined ? String(i.id) : String(i)) === String(itemId));
        if (item) {
          const matches = searchFilter(item, query);
          if (matches) {
            option.classList.remove("hidden");
            visibleCount++;
            
            const isSel = isSelected ? isSelected(itemId) : (triggerText.textContent === (item.name !== undefined ? item.name : item));
            option.setAttribute("aria-selected", isSel ? "true" : "false");
            option.classList.toggle("selected", isSel);
          } else {
            option.classList.add("hidden");
          }
        } else {
          option.classList.add("hidden");
        }
      });

      const noResultsEl = list.querySelector(".dropdown-no-results");
      if (noResultsEl) {
        noResultsEl.textContent = (window.TRANSLATIONS[window.currentLanguage] && window.TRANSLATIONS[window.currentLanguage].nothingFound) || "Ничего не найдено";
        noResultsEl.classList.toggle("hidden", visibleCount > 0);
      }
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(menuId);
      const isOpen = menu.classList.toggle("show");
      trigger.classList.toggle("open", isOpen);
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        if (search) {
          search.value = "";
          search.focus();
        }
        filterList("");
      }
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger.click();
      }
    });

    if (search) {
      search.addEventListener("input", (e) => {
        filterList(e.target.value);
      });
      search.addEventListener("click", e => e.stopPropagation());
    }
  }

  function setupAgeDropdowns() {
    const fromTrigger = document.getElementById("formAgeFromTrigger");
    const fromMenu = document.getElementById("formAgeFromMenu");
    const fromList = document.getElementById("formAgeFromList");
    const fromText = document.getElementById("formAgeFromText");

    const toTrigger = document.getElementById("formAgeToTrigger");
    const toMenu = document.getElementById("formAgeToMenu");
    const toList = document.getElementById("formAgeToList");
    const toText = document.getElementById("formAgeToText");

    const renderFrom = () => {
      fromList.innerHTML = "";
      for (let age = 15; age <= 50; age++) {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        option.setAttribute("role", "option");
        option.textContent = age;
        if (state.formState.ageFrom === age) {
          option.classList.add("selected");
          option.setAttribute("aria-selected", "true");
        } else {
          option.setAttribute("aria-selected", "false");
        }

        option.addEventListener("click", () => {
          state.formState.ageFrom = age;
          state.isDirty = true;
          const prefix = t("ageFromPrefix");
          fromText.textContent = prefix + age;
          fromText.classList.add("has-value");
          fromMenu.classList.remove("show");
          fromTrigger.classList.remove("open");
          fromTrigger.setAttribute("aria-expanded", "false");
          
          if (state.formState.ageTo < age) {
            state.formState.ageTo = age;
            const toPrefix = t("ageToPrefix");
            toText.textContent = toPrefix + age;
            toText.classList.add("has-value");
          }
          
          validateField("age");
          checkFormValidity();
        });
        fromList.appendChild(option);
      }
    };

    const renderTo = () => {
      toList.innerHTML = "";
      const startAge = state.formState.ageFrom || 15;
      for (let age = startAge; age <= 50; age++) {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        option.setAttribute("role", "option");
        option.textContent = age;
        if (state.formState.ageTo === age) {
          option.classList.add("selected");
          option.setAttribute("aria-selected", "true");
        } else {
          option.setAttribute("aria-selected", "false");
        }

        option.addEventListener("click", () => {
          state.formState.ageTo = age;
          state.isDirty = true;
          const prefix = t("ageToPrefix");
          toText.textContent = prefix + age;
          toText.classList.add("has-value");
          toMenu.classList.remove("show");
          toTrigger.classList.remove("open");
          toTrigger.setAttribute("aria-expanded", "false");
          
          validateField("age");
          checkFormValidity();
        });
        toList.appendChild(option);
      }
    };

    fromTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns("formAgeFromMenu");
      const isOpen = fromMenu.classList.toggle("show");
      fromTrigger.classList.toggle("open", isOpen);
      fromTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) renderFrom();
    });

    fromTrigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fromTrigger.click();
      }
    });

    toTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns("formAgeToMenu");
      const isOpen = toMenu.classList.toggle("show");
      toTrigger.classList.toggle("open", isOpen);
      toTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) renderTo();
    });

    toTrigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toTrigger.click();
      }
    });
  }

  function setupMultiSelectDropdown({ triggerId, menuId, searchId, listId, tagsContainerId, data, translate, selectedState, onChanged, excludeMode = false, searchFilter }) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const search = document.getElementById(searchId);
    const list = document.getElementById(listId);
    const tagsContainer = document.getElementById(tagsContainerId);
    const triggerText = trigger.querySelector(".dropdown-trigger-text");

    const dropdownKey = triggerId.replace("Trigger", "");
    multiSelectSyncRegistry[dropdownKey] = renderTagsAndList;

    if (list) list.setAttribute("role", "listbox");

    let lastRenderedLanguage = null;

    const buildOptions = () => {
      list.innerHTML = "";
      const getArray = () => (typeof data === "function" ? data() : data);
      const items = getArray();

      items.forEach(item => {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        option.setAttribute("role", "option");

        const itemId = item.id !== undefined ? item.id : item;
        const itemName = item.name !== undefined ? item.name : item;

        option.dataset.value = itemId;
        option.innerHTML = `
          <span>${itemName}</span>
          <svg class="checkbox-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 16px; height: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        `;

        option.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = selectedState.indexOf(itemId);
          if (idx !== -1) {
            selectedState.splice(idx, 1);
          } else {
            selectedState.push(itemId);
          }
          onChanged();
          renderTagsAndList();
        });

        list.appendChild(option);
      });

      const noResults = document.createElement("div");
      noResults.className = "dropdown-option dropdown-no-results hidden";
      noResults.style.color = "var(--color-text-light)";
      noResults.style.pointerEvents = "none";
      noResults.setAttribute("role", "presentation");
      noResults.textContent = (window.TRANSLATIONS[window.currentLanguage] && window.TRANSLATIONS[window.currentLanguage].nothingFound) || "Ничего не найдено";
      list.appendChild(noResults);

      lastRenderedLanguage = window.currentLanguage;
    };

    function renderTagsAndList() {
      tagsContainer.innerHTML = "";
      const dict = window.TRANSLATIONS[window.currentLanguage] || {};
      if (selectedState.length > 0) {
        triggerText.textContent = (dict.selectedCount || "Выбрано: ") + selectedState.length;
        triggerText.classList.add("has-value");
      } else {
        triggerText.textContent = excludeMode 
          ? (dict.excludeModePlaceholder || "Какие вакансии скрыть") 
          : (dict.multiSelectPlaceholder || "Выбрать несколько");
        triggerText.classList.remove("has-value");
      }

      selectedState.forEach(val => {
        const tag = document.createElement("div");
        tag.className = `filter-tag ${excludeMode ? 'tag-excluded' : ''}`;
        tag.textContent = translate ? translate(val) : val;

        const closeBtn = document.createElement("button");
        closeBtn.className = "btn-remove-tag";
        closeBtn.innerHTML = `
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        `;
        closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          tag.classList.add("tag-removing");
          setTimeout(() => {
            const idx = selectedState.indexOf(val);
            if (idx !== -1) {
              selectedState.splice(idx, 1);
              onChanged();
              renderTagsAndList();
            }
          }, 200);
        });

        tag.appendChild(closeBtn);
        tagsContainer.appendChild(tag);
      });

      if (lastRenderedLanguage !== window.currentLanguage) {
        buildOptions();
      }

      const query = search ? search.value : "";
      const getArray = () => (typeof data === "function" ? data() : data);
      const items = getArray();
      let visibleCount = 0;

      const options = list.querySelectorAll(".dropdown-option:not(.dropdown-no-results)");
      options.forEach(option => {
        const itemId = option.dataset.value;
        const item = items.find(i => (i.id !== undefined ? String(i.id) : String(i)) === String(itemId));
        if (item) {
          const matches = searchFilter(item, query);
          if (matches) {
            option.classList.remove("hidden");
            visibleCount++;

            const isSel = selectedState.includes(itemId);
            option.setAttribute("aria-selected", isSel ? "true" : "false");
            option.classList.toggle("selected", isSel);
          } else {
            option.classList.add("hidden");
          }
        } else {
          option.classList.add("hidden");
        }
      });

      const noResultsEl = list.querySelector(".dropdown-no-results");
      if (noResultsEl) {
        noResultsEl.textContent = dict.nothingFound || "Ничего не найдено";
        noResultsEl.classList.toggle("hidden", visibleCount > 0);
      }
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(menuId);
      const isOpen = menu.classList.toggle("show");
      trigger.classList.toggle("open", isOpen);
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (isOpen) {
        if (search) {
          search.value = "";
          search.focus();
        }
        renderTagsAndList();
      }
    });

    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        trigger.click();
      }
    });

    if (search) {
      search.addEventListener("input", () => {
        renderTagsAndList();
      });
      search.addEventListener("click", e => e.stopPropagation());
    }
  }

  function syncMultiSelectTags(prefix) {
    if (multiSelectSyncRegistry[prefix]) {
      multiSelectSyncRegistry[prefix]();
    }
  }

  function closeAllDropdowns(exceptId = null) {
    const menus = document.querySelectorAll(".dropdown-menu");
    const triggers = document.querySelectorAll(".dropdown-trigger");
    
    menus.forEach(menu => {
      if (menu.id !== exceptId) {
        menu.classList.remove("show");
      }
    });

    triggers.forEach(trigger => {
      const targetMenuId = trigger.id.replace("Trigger", "Menu");
      if (targetMenuId !== exceptId) {
        trigger.classList.remove("open");
        if (trigger.hasAttribute("aria-expanded")) {
          trigger.setAttribute("aria-expanded", "false");
        }
      }
    });
  }

  document.addEventListener("click", () => {
    closeAllDropdowns();
  });

  // --- JOB FORM LOGICS & VALIDATIONS ---
  function initFormHandlers() {
    const formDescription = document.getElementById("formDescription");
    const formIsRemote = document.getElementById("formIsRemote");
    const formAddress = document.getElementById("formAddress");
    const formIsNegotiable = document.getElementById("formIsNegotiable");
    const formPayment = document.getElementById("formPayment");
    const formPhone = document.getElementById("formPhone");

    formDescription.addEventListener("input", (e) => {
      const text = e.target.value;
      document.getElementById("descCharCount").textContent = text.length;
      state.formState.description = text;
      state.isDirty = true;
      validateField("description");
      checkFormValidity();
    });

    formIsRemote.addEventListener("change", (e) => {
      const checked = e.target.checked;
      state.formState.isRemote = checked;
      state.isDirty = true;
      
      if (checked) {
        formAddress.disabled = true;
        formAddress.value = "";
        state.formState.address = "";
        document.getElementById("group-address").classList.remove("has-error");
      } else {
        formAddress.disabled = false;
      }
      validateField("address");
      checkFormValidity();
    });

    formAddress.addEventListener("input", (e) => {
      const rawVal = e.target.value;
      const cleanVal = rawVal.replace(/[^a-zA-Zа-яА-ЯёЁәіңғүұқөһӘІҢҒҮҰҚӨҺ0-9\s.,№-]/g, "");
      if (rawVal !== cleanVal) {
        const selectionStart = e.target.selectionStart;
        const selectionEnd = e.target.selectionEnd;
        e.target.value = cleanVal;
        const diff = rawVal.length - cleanVal.length;
        e.target.setSelectionRange(Math.max(0, selectionStart - diff), Math.max(0, selectionEnd - diff));
      }
      state.formState.address = cleanVal;
      state.isDirty = true;
      validateField("address");
      checkFormValidity();
    });

    formIsNegotiable.addEventListener("change", (e) => {
      const checked = e.target.checked;
      state.formState.isNegotiable = checked;
      state.isDirty = true;
      
      if (checked) {
        formPayment.disabled = true;
        formPayment.value = "";
        state.formState.payment = "";
        document.getElementById("group-payment").classList.remove("has-error");
      } else {
        formPayment.disabled = false;
      }
      validateField("payment");
      checkFormValidity();
    });

    formPayment.addEventListener("input", (e) => {
      const val = e.target.value;
      const selectionStart = e.target.selectionStart;
      const digitsBeforeCursor = val.substring(0, selectionStart).replace(/\D/g, "").length;
      
      const digitsOnly = val.replace(/\D/g, "");
      
      let formatted = "";
      if (digitsOnly) {
        let rawNum = parseInt(digitsOnly);
        if (rawNum > 5000000) {
          rawNum = 5000000;
        }
        state.formState.payment = rawNum;
        formatted = String(rawNum).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      } else {
        state.formState.payment = "";
        formatted = "";
      }
      
      let newCursorPos = 0;
      let digitCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (digitCount === digitsBeforeCursor) {
          break;
        }
        if (/\d/.test(formatted[i])) {
          digitCount++;
        }
        newCursorPos++;
      }
      
      e.target.value = formatted;
      if (val) {
        e.target.setSelectionRange(newCursorPos, newCursorPos);
      }
      
      state.isDirty = true;
      validateField("payment");
      checkFormValidity();
    });

    formPayment.addEventListener("blur", (e) => {
      validateField("payment");
      checkFormValidity();
    });

    formPhone.addEventListener("input", (e) => {
      const val = e.target.value;
      const selectionStart = e.target.selectionStart;
      const digitsBeforeCursor = val.substring(0, selectionStart).replace(/\D/g, "").length;
      
      let digitsOnly = val.replace(/\D/g, "");
      
      if (digitsOnly.length > 0 && (digitsOnly.startsWith("7") || digitsOnly.startsWith("8")) && digitsOnly.length > 10) {
        digitsOnly = digitsOnly.substring(1);
      }
      
      digitsOnly = digitsOnly.substring(0, 10);
      state.formState.phone = digitsOnly;
      state.isDirty = true;

      let formatted = "";
      if (digitsOnly.length > 0) {
        formatted += digitsOnly.substring(0, 3);
      }
      if (digitsOnly.length > 3) {
        formatted += " " + digitsOnly.substring(3, 6);
      }
      if (digitsOnly.length > 6) {
        formatted += " " + digitsOnly.substring(6, 10);
      }
      
      let newCursorPos = 0;
      let digitCount = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (digitCount === digitsBeforeCursor) {
          break;
        }
        if (/\d/.test(formatted[i])) {
          digitCount++;
        }
        newCursorPos++;
      }
      
      e.target.value = formatted;
      if (val) {
        e.target.setSelectionRange(newCursorPos, newCursorPos);
      }
      
      validateField("phone");
      checkFormValidity();
    });

    // Explicit paste event listeners to force immediate validation and UI update on paste (Ctrl+V or long-tap)
    const triggerInputEvent = (element) => {
      element.dispatchEvent(new Event("input", { bubbles: true }));
    };

    formDescription.addEventListener("paste", () => {
      setTimeout(() => {
        const text = formDescription.value;
        document.getElementById("descCharCount").textContent = text.length;
        state.formState.description = text;
        state.isDirty = true;
        validateField("description");
        checkFormValidity();
      }, 50);
    });

    formAddress.addEventListener("paste", () => {
      setTimeout(() => {
        const rawVal = formAddress.value;
        const cleanVal = rawVal.replace(/[^a-zA-Zа-яА-ЯёЁәіңғүұқөһӘІҢҒҮҰҚӨҺ0-9\s.,№-]/g, "");
        formAddress.value = cleanVal;
        state.formState.address = cleanVal;
        state.isDirty = true;
        validateField("address");
        checkFormValidity();
      }, 50);
    });

    formPhone.addEventListener("paste", () => {
      setTimeout(() => {
        triggerInputEvent(formPhone);
      }, 50);
    });

    formPayment.addEventListener("paste", () => {
      setTimeout(() => {
        triggerInputEvent(formPayment);
      }, 50);
    });

    const genderRadios = document.getElementsByName("requiredGender");
    genderRadios.forEach(radio => {
      radio.addEventListener("change", (e) => {
        if (e.target.checked) {
          state.formState.gender = e.target.value;
          state.isDirty = true;
          checkFormValidity();
        }
      });
    });

    window.addEventListener("beforeunload", (e) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = "Введенные данные не будут сохранены. Вы действительно хотите покинуть страницу?";
        return e.returnValue;
      }
    });
  }

  function validateField(fieldName) {
    let isValid = true;
    const errorGroup = document.getElementById(`group-${fieldName}`);
    if (!errorGroup) return true;

    switch (fieldName) {
      case "profession":
        isValid = !!state.formState.profession;
        break;
      case "age":
        isValid = state.formState.ageFrom >= 15 && 
                  state.formState.ageTo <= 50 && 
                  state.formState.ageFrom <= state.formState.ageTo;
        break;
      case "description":
        const desc = state.formState.description.trim();
        const correctLength = desc.length >= 20 && desc.length <= 1000;
        const containsUrl = /http:\/\/|https:\/\/|www\./gi.test(desc);
        
        isValid = correctLength && !containsUrl;
        
        const errorMsg = document.getElementById("descError");
        if (containsUrl) {
          errorMsg.textContent = "В описании работы нельзя оставлять внешние ссылки (реклама, спам)!";
        } else if (desc.length < 20) {
          errorMsg.textContent = "Напишите не менее 20 символов.";
        } else {
          errorMsg.textContent = "Длина описания не должна превышать 1000 символов.";
        }
        break;
      case "city":
        isValid = !!state.formState.city;
        break;
      case "address":
        if (state.formState.isRemote) {
          isValid = true;
        } else {
          const addr = state.formState.address.trim();
          isValid = addr.length >= 5 && addr.length <= 50;
        }
        break;
      case "payment":
        if (state.formState.isNegotiable) {
          isValid = true;
        } else {
          const pay = Number(state.formState.payment);
          isValid = !isNaN(pay) && pay >= 1000 && pay <= 5000000;
        }
        break;
      case "phone":
        isValid = state.formState.phone.length === 10;
        break;
    }

    if (isValid) {
      errorGroup.classList.remove("has-error");
    } else {
      errorGroup.classList.add("has-error");
    }
    return isValid;
  }

  function checkFormValidity() {
    const fields = ["profession", "age", "description", "city", "address", "payment", "phone"];
    let allValid = true;
    
    fields.forEach(field => {
      let silentValid = true;
      switch (field) {
        case "profession":
          silentValid = !!state.formState.profession;
          break;
        case "age":
          silentValid = state.formState.ageFrom >= 15 && state.formState.ageTo <= 50 && state.formState.ageFrom <= state.formState.ageTo;
          break;
        case "description":
          const desc = state.formState.description.trim();
          silentValid = desc.length >= 20 && desc.length <= 1000 && !(/http:\/\/|https:\/\/|www\./gi.test(desc));
          break;
        case "city":
          silentValid = !!state.formState.city;
          break;
        case "address":
          silentValid = state.formState.isRemote || (state.formState.address.trim().length >= 5 && state.formState.address.trim().length <= 50);
          break;
        case "payment":
          silentValid = state.formState.isNegotiable || (Number(state.formState.payment) >= 1000 && Number(state.formState.payment) <= 5000000);
          break;
        case "phone":
          silentValid = state.formState.phone.length === 10;
          break;
      }
      if (!silentValid) allValid = false;
    });

    const previewBtn = document.getElementById("btnFormPreview");
    previewBtn.disabled = !allValid;
    return allValid;
  }

  function clearJobForm() {
    state.formState = {
      profession: "",
      gender: "any",
      ageFrom: 18,
      ageTo: 30,
      description: "",
      city: "",
      address: "",
      isRemote: false,
      payment: "",
      isNegotiable: false,
      phone: ""
    };
    state.editingJobId = null;
    state.isDirty = false;

    document.getElementById("jobForm").reset();
    document.getElementById("formProfessionText").textContent = "Выберите профессию";
    document.getElementById("formProfessionText").classList.remove("has-value");
    document.getElementById("formCityText").textContent = "Выберите город";
    document.getElementById("formCityText").classList.remove("has-value");
    document.getElementById("formAgeFromText").textContent = "От 18";
    document.getElementById("formAgeFromText").classList.add("has-value");
    document.getElementById("formAgeToText").textContent = "До 30";
    document.getElementById("formAgeToText").classList.add("has-value");
    document.getElementById("descCharCount").textContent = "0";

    document.getElementById("formAddress").disabled = false;
    document.getElementById("formPayment").disabled = false;

    const errorGroups = document.querySelectorAll(".form-group");
    errorGroups.forEach(g => g.classList.remove("has-error"));

    checkFormValidity();
  }

  function openJobForm() {
    clearJobForm();
    document.getElementById("formActionTitle").textContent = "Публикация новой вакансии";
    document.getElementById("cabinetDashboard").classList.add("hidden");
    document.getElementById("cabinetFormContainer").classList.remove("hidden");
    document.getElementById("cabinetPreviewContainer").classList.add("hidden");
  }

  function editJob(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    state.editingJobId = jobId;
    state.formState = {
      profession: job.profession,
      gender: job.gender,
      ageFrom: job.ageFrom,
      ageTo: job.ageTo,
      description: job.description,
      city: job.city,
      address: job.address,
      isRemote: job.isRemote,
      payment: job.payment,
      isNegotiable: job.isNegotiable,
      phone: job.phone
    };

    document.getElementById("formActionTitle").textContent = "Редактирование вакансии";
    
    document.getElementById("formProfessionText").textContent = window.translateProfession(job.profession, window.currentLanguage);
    document.getElementById("formProfessionText").classList.add("has-value");
    
    const genderRadios = document.getElementsByName("requiredGender");
    genderRadios.forEach(radio => {
      if (radio.value === job.gender) radio.checked = true;
    });

    document.getElementById("formAgeFromText").textContent = `От ${job.ageFrom}`;
    document.getElementById("formAgeFromText").classList.add("has-value");
    document.getElementById("formAgeToText").textContent = `До ${job.ageTo}`;
    document.getElementById("formAgeToText").classList.add("has-value");

    const descTextarea = document.getElementById("formDescription");
    descTextarea.value = job.description;
    document.getElementById("descCharCount").textContent = job.description.length;

    document.getElementById("formCityText").textContent = window.translateCity(job.city, window.currentLanguage);
    document.getElementById("formCityText").classList.add("has-value");

    const addressInput = document.getElementById("formAddress");
    const isRemoteCheck = document.getElementById("formIsRemote");
    isRemoteCheck.checked = job.isRemote;
    if (job.isRemote) {
      addressInput.value = "";
      addressInput.disabled = true;
    } else {
      addressInput.value = job.address;
      addressInput.disabled = false;
    }

    const paymentInput = document.getElementById("formPayment");
    const isNegotiableCheck = document.getElementById("formIsNegotiable");
    isNegotiableCheck.checked = job.isNegotiable;
    if (job.isNegotiable) {
      paymentInput.value = "";
      paymentInput.disabled = true;
    } else {
      paymentInput.value = String(job.payment).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      paymentInput.disabled = false;
    }

    const phoneInput = document.getElementById("formPhone");
    let formatted = "";
    if (job.phone.length > 0) formatted += job.phone.substring(0, 3);
    if (job.phone.length > 3) formatted += " " + job.phone.substring(3, 6);
    if (job.phone.length > 6) formatted += " " + job.phone.substring(6, 10);
    phoneInput.value = formatted;

    state.isDirty = false;
    checkFormValidity();

    document.getElementById("cabinetDashboard").classList.add("hidden");
    document.getElementById("cabinetFormContainer").classList.remove("hidden");
    document.getElementById("cabinetPreviewContainer").classList.add("hidden");
  }

  // --- PREVIEW SCREEN & PUBLISH LOGIC ---
  function showFormPreview() {
    const fields = ["profession", "age", "description", "city", "address", "payment", "phone"];
    let isValid = true;
    fields.forEach(field => {
      if (!validateField(field)) isValid = false;
    });

    if (!isValid) {
      showToast(window.TRANSLATIONS[window.currentLanguage].toastFormErrors, "error");
      return;
    }

    const previewContainer = document.getElementById("cabinetPreviewContainer");
    const formContainer = document.getElementById("cabinetFormContainer");
    const previewCardContent = document.getElementById("previewCardContent");

    const mockJobCard = createVacancyCardHTML({
      id: state.editingJobId || "preview-id",
      profession: state.formState.profession,
      gender: state.formState.gender,
      ageFrom: state.formState.ageFrom,
      ageTo: state.formState.ageTo,
      description: state.formState.description,
      city: state.formState.city,
      address: state.formState.address,
      isRemote: state.formState.isRemote,
      payment: state.formState.payment ? Number(state.formState.payment) : 0,
      isNegotiable: state.formState.isNegotiable,
      phone: state.formState.phone,
      createdAt: new Date().toISOString()
    }, true);

    previewCardContent.innerHTML = mockJobCard;

    formContainer.classList.add("hidden");
    previewContainer.classList.remove("hidden");
  }

  // PostgreSQL POST API Integration
  async function handlePublishVacancy() {
    if (!navigator.onLine) {
      showToast(window.TRANSLATIONS[window.currentLanguage].toastOffline, "error");
      return;
    }

    const publishBtn = document.getElementById("btnPreviewPublish");
    publishBtn.disabled = true;
    publishBtn.textContent = t("btnPublishing");

    const rawDesc = state.formState.description;
    const cleanDesc = rawDesc.replace(/<\/?[^>]+(>|$)/g, "");

    const newJob = {
      id: state.editingJobId || "job-" + Math.random().toString(36).substr(2, 9),
      profession: state.formState.profession,
      gender: state.formState.gender,
      ageFrom: state.formState.ageFrom,
      ageTo: state.formState.ageTo,
      description: cleanDesc,
      city: state.formState.city,
      address: state.formState.isRemote ? "" : state.formState.address,
      isRemote: state.formState.isRemote,
      payment: state.formState.isNegotiable ? 0 : Number(state.formState.payment),
      isNegotiable: state.formState.isNegotiable,
      phone: state.formState.phone,
      createdAt: state.editingJobId
        ? (state.jobs.find(j => j.id === state.editingJobId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      authorId: state.user.id
    };

    try {
      const session = supabaseClient ? (await supabaseClient.auth.getSession()).data.session : null;
      const headers = { "Content-Type": "application/json" };
      if (session) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: headers,
        body: JSON.stringify(newJob)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(serverCodeToast(errorData.code) || errorData.error || t("toastPublishError"));
      }
      
      const savedJob = await response.json();

      // Sync local state list
      if (state.editingJobId) {
        const idx = state.jobs.findIndex(j => j.id === state.editingJobId);
        if (idx !== -1) state.jobs[idx] = savedJob;
        showToast(window.TRANSLATIONS[window.currentLanguage].toastJobUpdated, "success");
      } else {
        state.jobs.unshift(savedJob);
        showToast(window.TRANSLATIONS[window.currentLanguage].toastJobCreated, "success");
      }

      state.isDirty = false;
      clearJobForm();

      publishBtn.disabled = false;
      publishBtn.textContent = window.TRANSLATIONS[window.currentLanguage].btnPublish;

      showView("vacancies");
      applyFiltersAndRender(false);
    } catch (err) {
      console.error(err);
      showToast(window.TRANSLATIONS[window.currentLanguage].toastPublishError, "error");
      publishBtn.disabled = false;
      publishBtn.textContent = window.TRANSLATIONS[window.currentLanguage].btnPublish;
    }
  }

  // PostgreSQL DELETE API Integration
  async function deleteMyJob(jobId) {
    const confirmText = window.TRANSLATIONS[window.currentLanguage].toastDeleteConfirm;
    if (confirm(confirmText)) {
      try {
        const session = supabaseClient ? (await supabaseClient.auth.getSession()).data.session : null;
        const headers = {};
        if (session) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/jobs/${jobId}`, { 
          method: "DELETE",
          headers: headers
        });
        if (!response.ok) throw new Error("Не удалось удалить вакансию на сервере");

        // Sync local memory state
        state.jobs = state.jobs.filter(j => j.id !== jobId);
        state.favorites = state.favorites.filter(id => id !== jobId);
        saveFavoritesToStorage();

        showToast(window.TRANSLATIONS[window.currentLanguage].toastJobDeleted, "info");
        renderMyJobs();
        applyFiltersAndRender(false);
      } catch (err) {
        console.error(err);
        showToast(window.TRANSLATIONS[window.currentLanguage].toastDeleteError, "error");
      }
    }
  }

  // --- OPTIMISTIC FAVORITES (HEART ICON TOGGLE) ---
  async function toggleFavorite(jobId) {
    if (!state.user) {
      document.getElementById("authModalText").textContent = (window.TRANSLATIONS[window.currentLanguage] && window.TRANSLATIONS[window.currentLanguage].authModalFavDesc) || "Войдите в систему, чтобы добавлять вакансии в список избранного.";
      document.getElementById("authModal").classList.add("active");
      state.authRedirect = { type: "favorite", jobId: jobId };
      return;
    }

    const idx = state.favorites.indexOf(jobId);
    const isAdding = (idx === -1);
    const previousFavorites = [...state.favorites];

    // --- OPTIMISTIC UI UPDATE ---
    if (isAdding) {
      state.favorites.push(jobId);
    } else {
      state.favorites.splice(idx, 1);
    }

    const heartBtns = document.querySelectorAll(`[data-favorite-id="${jobId}"]`);
    heartBtns.forEach(btn => {
      btn.classList.toggle("active", isAdding);
    });

    if (state.currentView === "favorites") {
      renderFavorites();
    }

    try {
      // Sync favorites to user metadata on Supabase auth server
      const { data, error } = await supabaseClient.auth.updateUser({
        data: { favorites: state.favorites }
      });

      if (error) throw error;

      saveFavoritesToStorage();
    } catch (err) {
      console.error("[Favorites] Sync failed, rolling back:", err);
      
      // Rollback optimistic change
      state.favorites = previousFavorites;
      
      heartBtns.forEach(btn => {
        btn.classList.toggle("active", !isAdding);
      });

      if (state.currentView === "favorites") {
        renderFavorites();
      }

      showToast((window.TRANSLATIONS[window.currentLanguage] && window.TRANSLATIONS[window.currentLanguage].toastRollbackFav) || "Не удалось синхронизировать список избранного с сервером.", "error");
    }
  }

  // --- FILTER SYSTEM APPLICATOR & RENDERER ---
  function applyFiltersAndRender(simulateSkeleton = true) {
    if (simulateSkeleton) {
      renderSkeletons();
      setTimeout(() => {
        const filteredJobs = filterJobsLogic();
        renderVacanciesFeed(filteredJobs);
      }, 500);
    } else {
      const filteredJobs = filterJobsLogic();
      renderVacanciesFeed(filteredJobs);
    }
  }

  function filterJobsLogic() {
    let result = [...state.jobs];

    if (state.filters.excludeProfessions.length > 0) {
      result = result.filter(job => !state.filters.excludeProfessions.includes(job.profession));
    }

    if (state.filters.professions.length > 0) {
      result = result.filter(job => state.filters.professions.includes(job.profession));
    }

    if (state.filters.cities.length > 0) {
      result = result.filter(job => state.filters.cities.includes(job.city));
    }

    if (state.filters.remoteOnly) {
      result = result.filter(job => job.isRemote);
    }

    if (state.filters.gender === "male") {
      result = result.filter(job => job.gender === "male" || job.gender === "any");
    } else if (state.filters.gender === "female") {
      result = result.filter(job => job.gender === "female" || job.gender === "any");
    }

    if (state.filters.age !== null && state.filters.age !== "") {
      const userAge = Number(state.filters.age);
      result = result.filter(job => job.ageFrom <= userAge && userAge <= job.ageTo);
    }

    if (state.filters.sort === "newest") {
      const mapped = result.map((job, idx) => ({ idx, val: new Date(job.createdAt).getTime() }));
      mapped.sort((a, b) => b.val - a.val);
      result = mapped.map(item => result[item.idx]);
    } else if (state.filters.sort === "oldest") {
      const mapped = result.map((job, idx) => ({ idx, val: new Date(job.createdAt).getTime() }));
      mapped.sort((a, b) => a.val - b.val);
      result = mapped.map(item => result[item.idx]);
    } else if (state.filters.sort === "highest_payment") {
      result.sort((a, b) => {
        const payA = a.isNegotiable ? 0 : a.payment;
        const payB = b.isNegotiable ? 0 : b.payment;
        return payB - payA;
      });
    } else if (state.filters.sort === "alphabetical") {
      const lang = window.currentLanguage;
      const mapped = result.map((job, idx) => ({
        idx,
        val: window.translateProfession(job.profession, lang)
      }));
      mapped.sort((a, b) => a.val.localeCompare(b.val, lang));
      result = mapped.map(item => result[item.idx]);
    }

    return result;
  }

  function renderSkeletons() {
    const feed = document.getElementById("vacanciesFeed");
    let skeletonHTML = "";
    
    for (let i = 0; i < 3; i++) {
      skeletonHTML += `
        <div class="skeleton-card">
          <div class="skeleton-title skeleton"></div>
          <div style="display: flex; gap: 8px;">
            <div class="skeleton-text skeleton" style="width: 60px;"></div>
            <div class="skeleton-text skeleton" style="width: 80px;"></div>
          </div>
          <div class="skeleton-line skeleton"></div>
          <div class="skeleton-line skeleton"></div>
          <div class="skeleton-line-short skeleton"></div>
          <div class="skeleton-meta" style="display: flex; justify-content: space-between; margin-top: 10px;">
            <div class="skeleton-text skeleton" style="width: 100px;"></div>
            <div class="skeleton-text skeleton" style="width: 50px;"></div>
          </div>
        </div>
      `;
    }
    feed.innerHTML = skeletonHTML;
  }

  function renderVacanciesFeed(jobsList) {
    const feed = document.getElementById("vacanciesFeed");
    feed.innerHTML = "";

    if (jobsList.length === 0) {
      feed.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 class="empty-state-title" data-i18n="emptyFeedTitle">${window.TRANSLATIONS[window.currentLanguage].emptyFeedTitle}</h3>
          <p class="empty-state-desc" data-i18n="emptyFeedDesc">${window.TRANSLATIONS[window.currentLanguage].emptyFeedDesc}</p>
        </div>
      `;
      return;
    }

    jobsList.forEach(job => {
      const card = document.createElement("div");
      card.className = "vacancy-card";
      card.innerHTML = createVacancyCardHTML(job);
      
      const favBtn = card.querySelector(".vacancy-favorite-btn");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(job.id);
      });

      card.addEventListener("click", () => {
        openJobDetails(job.id);
      });

      feed.appendChild(card);
    });
  }

  function renderFavorites() {
    const feed = document.getElementById("favoritesFeed");
    feed.innerHTML = "";

    const favJobs = state.jobs.filter(j => state.favorites.includes(j.id));

    if (favJobs.length === 0) {
      feed.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
          <h3 class="empty-state-title" data-i18n="favEmptyTitle">${window.TRANSLATIONS[window.currentLanguage].favEmptyTitle}</h3>
          <p class="empty-state-desc" data-i18n="favEmptyDesc">${window.TRANSLATIONS[window.currentLanguage].favEmptyDesc}</p>
        </div>
      `;
      return;
    }

    favJobs.forEach(job => {
      const card = document.createElement("div");
      card.className = "vacancy-card";
      card.innerHTML = createVacancyCardHTML(job);
      
      const favBtn = card.querySelector(".vacancy-favorite-btn");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(job.id);
      });

      card.addEventListener("click", () => {
        openJobDetails(job.id);
      });

      feed.appendChild(card);
    });
  }

  function renderMyJobs() {
    const list = document.getElementById("myJobsList");
    const countBadge = document.getElementById("myJobsCount");
    list.innerHTML = "";

    if (!state.user) return;

    const myJobs = state.jobs.filter(j => j.authorId === state.user.id);
    countBadge.textContent = myJobs.length;

    if (myJobs.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 24px 16px;">
          <p class="empty-state-desc" data-i18n="myJobsEmpty">${window.TRANSLATIONS[window.currentLanguage].myJobsEmpty}</p>
        </div>
      `;
      return;
    }

    myJobs.forEach(job => {
      const item = document.createElement("div");
      item.className = "my-job-item";
      
      const payLabel = job.isNegotiable 
        ? t("negotiablePrice")
        : `${String(job.payment).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
      const timeLabel = getJobDateLabel(job.createdAt);

      item.innerHTML = `
        <div class="my-job-info">
          <span class="my-job-title">${escapeHTML(window.translateProfession(job.profession, window.currentLanguage))}</span>
          <div class="my-job-meta">
            <span>${payLabel}</span>
            <span>${escapeHTML(window.translateCity(job.city, window.currentLanguage))} (${timeLabel})</span>
          </div>
        </div>
        <div class="my-job-actions">
          <button class="btn-my-job-action edit" data-edit-id="${job.id}">${window.TRANSLATIONS[window.currentLanguage].btnEditAction}</button>
          <button class="btn-my-job-action delete" data-delete-id="${job.id}">${window.TRANSLATIONS[window.currentLanguage].btnDeleteAction}</button>
        </div>
      `;

      item.querySelector(".edit").addEventListener("click", () => editJob(job.id));
      item.querySelector(".delete").addEventListener("click", () => deleteMyJob(job.id));

      list.appendChild(item);
    });
  }

  function translateGender(gender) {
    return window.translateGender(gender, window.currentLanguage);
  }

  function createVacancyCardHTML(job, isPreview = false) {
    const isFav = state.favorites.includes(job.id);
    const timeLabel = getJobDateLabel(job.createdAt);
    const payLabel = job.isNegotiable 
      ? t("negotiablePrice") 
      : `${String(job.payment).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
    const remoteLabel = job.isRemote 
      ? t("remoteJob") 
      : `${escapeHTML(window.translateCity(job.city, window.currentLanguage))}${job.address ? `, ${escapeHTML(job.address)}` : ''}`;
    
    return `
      <div class="vacancy-card-header">
        <span class="vacancy-profession">${escapeHTML(window.translateProfession(job.profession, window.currentLanguage))}</span>
        ${!isPreview ? `
          <button class="vacancy-favorite-btn ${isFav ? 'active' : ''}" data-favorite-id="${job.id}">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>
        ` : ''}
      </div>
      
      <div class="vacancy-badges">
        <span class="badge badge-payment">${payLabel}</span>
        ${job.isRemote ? `<span class="badge badge-remote">${t("remoteJob")}</span>` : ''}
        <span class="badge">${t("cardBadgeAge")}: ${job.ageFrom} - ${job.ageTo} ${t("cardBadgeAgeUnit")}</span>
        <span class="badge">${t("cardBadgeGender")}: ${translateGender(job.gender)}</span>
      </div>
 
      <div class="vacancy-description">${formatDescriptionHTML(job.description)}</div>
 
      <div class="vacancy-meta">
        <div class="vacancy-meta-left">
          <span class="vacancy-location">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25A7.5 7.5 0 1119.5 10.5z" />
            </svg>
            <span>${remoteLabel}</span>
          </span>
        </div>
        <span>${timeLabel}</span>
      </div>
      
      ${isPreview ? `
        <div style="margin-top: 14px;">
          <a class="btn-whatsapp-link" href="${generateWhatsAppLink(job.phone, window.translateProfession(job.profession, window.currentLanguage))}" target="_blank">
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.989 9.984a9.96 9.96 0 001.37 5.028L2 22l5.13-1.346a9.928 9.928 0 004.877 1.277h.005c5.505 0 9.989-4.478 9.99-9.985A9.972 9.972 0 0012.012 2zm5.72 13.917c-.246.696-1.423 1.269-1.95 1.34-.486.066-.994.095-2.203-.393a8.946 8.946 0 01-3.69-2.43 9.773 9.773 0 01-1.89-2.732c-.39-.68-.135-1.04.167-1.36.223-.238.486-.532.658-.77.165-.246.216-.402.324-.67.108-.268.043-.512-.02-.67-.066-.16-.583-1.4-.803-1.925-.213-.514-.452-.455-.62-.464-.15-.008-.323-.008-.495-.008a.952.952 0 00-.687.323c-.237.26-.902.883-.902 2.15 0 1.268.923 2.493 1.053 2.671.13.178 1.817 2.776 4.4 3.887.615.264 1.094.42 1.468.54.618.196 1.18.17 1.626.104.498-.074 1.53-.624 1.745-1.229.215-.604.215-1.12.15-1.229-.064-.11-.237-.17-.487-.294z"/>
            </svg>
            <span>${t("btnCheckWa")}</span>
          </a>
        </div>
      ` : ''}
    `;
  }

  function getLocalDateInUTC5(dateOrStr) {
    const date = new Date(dateOrStr);
    // Shift date to UTC+5 representation
    const utc5Time = date.getTime() + (5 * 60 * 60 * 1000);
    const d = new Date(utc5Time);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      day: d.getUTCDate()
    };
  }

  function getJobDateLabel(dateStr) {
    const jobDate = getLocalDateInUTC5(dateStr);
    const todayDate = getLocalDateInUTC5(new Date());
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayDate = getLocalDateInUTC5(yesterday);
    
    if (jobDate.year === todayDate.year && jobDate.month === todayDate.month && jobDate.day === todayDate.day) {
      return t("today");
    } else if (jobDate.year === yesterdayDate.year && jobDate.month === yesterdayDate.month && jobDate.day === yesterdayDate.day) {
      return t("yesterday");
    } else {
      const day = String(jobDate.day).padStart(2, '0');
      const month = String(jobDate.month + 1).padStart(2, '0');
      return `${day}.${month}`;
    }
  }

  function generateWhatsAppLink(phoneNum, professionName) {
    const cleanPhone = "7" + phoneNum.replace(/\D/g, "");
    const message = window.currentLanguage === "kk"
      ? `Сәлеметсіз бе, мен сіздің сайтыңыздағы "${professionName}" бос жұмыс орны бойынша жазып тұрмын.`
      : `Здравствуйте, я пишу по поводу вакансии "${professionName}" на вашем сайте.`; // whatsapp greeting — intentionally untranslated (WA deep-link, not UI)
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  function openWhatsAppLink(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    const url = generateWhatsAppLink(job.phone, window.translateProfession(job.profession, window.currentLanguage));
    window.open(url, "_blank");
  }

  // --- DETAIL MODAL & GUEST BLOCKS ---
  function openJobDetails(jobId) {
    if (!state.user) {
      document.getElementById("authModalText").textContent = t("authModalDetailsDesc");
      document.getElementById("authModal").classList.add("active");
      state.authRedirect = { type: "viewDetails", jobId: jobId };
      return;
    }

    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    document.getElementById("detailProfession").textContent = window.translateProfession(job.profession, window.currentLanguage);
    
    const favBtn = document.getElementById("detailFavoriteBtn");
    favBtn.setAttribute("data-favorite-id", job.id);
    favBtn.classList.toggle("active", state.favorites.includes(job.id));
    
    const payLabel = job.isNegotiable 
      ? t("negotiablePrice") 
      : `${String(job.payment).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
      
    document.getElementById("detailBadges").innerHTML = `
      <span class="badge badge-payment">${payLabel}</span>
      ${job.isRemote ? `<span class="badge badge-remote">${t("remoteJob")}</span>` : ""}
      <span class="badge">${t("cardBadgeAge")}: ${job.ageFrom} - ${job.ageTo} ${t("cardBadgeAgeUnit")}</span>
      <span class="badge">${t("cardBadgeGender")}: ${translateGender(job.gender)}</span>
    `;

    document.getElementById("detailDescription").innerHTML = formatDescriptionHTML(job.description);
    
    const remoteLabel = job.isRemote 
      ? t("cardRemoteWorkLabel") 
      : `${window.translateCity(job.city, window.currentLanguage)}, ${job.address}`;
    document.getElementById("detailAddress").textContent = remoteLabel;
    
    document.getElementById("detailTime").textContent =
      `${t("detailsPublished")}: ${getJobDateLabel(job.createdAt)}`;

    const waBtn = document.getElementById("detailWhatsAppBtn");
    
    waBtn.onclick = (e) => {
      e.preventDefault();
      
      if (!state.user) {
        document.getElementById("authModal").classList.add("active");
        state.authRedirect = { type: "contact", jobId: job.id };
        return;
      }

      if (job.phone.length !== 10) {
        showToast(t("toastPhoneError"), "error");
        return;
      }
      
      if (!navigator.onLine) {
        showToast(t("toastWhatsAppContextLost"), "error");
        return;
      }

      const url = generateWhatsAppLink(job.phone, window.translateProfession(job.profession, window.currentLanguage));
      window.open(url, "_blank");
    };

    closeAllDropdowns();
    document.getElementById("detailModal").classList.add("active");
  }

  // --- ROUTER VIEW CHANGER ---
  function showView(viewName) {
    state.currentView = viewName;
    
    const views = ["viewVacancies", "viewFavorites", "viewCabinet"];
    views.forEach(v => {
      const viewDom = document.getElementById(v);
      if (v === "view" + viewName.charAt(0).toUpperCase() + viewName.slice(1)) {
        viewDom.classList.add("active");
      } else {
        viewDom.classList.remove("active");
      }
    });

    const navItems = ["navVacancies", "navFavorites", "navCabinet"];
    navItems.forEach(n => {
      const navDom = document.getElementById(n);
      if (n === "nav" + viewName.charAt(0).toUpperCase() + viewName.slice(1)) {
        navDom.classList.add("active");
      } else {
        navDom.classList.remove("active");
      }
    });

    if (viewName === "cabinet") {
      document.getElementById("cabinetDashboard").classList.remove("hidden");
      document.getElementById("cabinetFormContainer").classList.add("hidden");
      document.getElementById("cabinetPreviewContainer").classList.add("hidden");
      renderMyJobs();
    }

    if (viewName === "favorites") {
      renderFavorites();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // --- SYSTEM TOAST NOTIFICATIONS ---
  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    
    let icon = "";
    if (type === "success") {
      icon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === "error") {
      icon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else {
      icon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = "fade-out 0.2s forwards";
      setTimeout(() => {
        toast.remove();
      }, 200);
    }, 3000);
  }

  // --- FILTER DISPLAY BADGE ---
  function updateFilterBadge() {
    const badge = document.getElementById("filterBadge");
    let count = 0;

    if (state.filters.professions.length > 0) count++;
    if (state.filters.cities.length > 0) count++;
    if (state.filters.excludeProfessions.length > 0) count++;
    if (state.filters.age !== null && state.filters.age !== "") count++;
    if (state.filters.remoteOnly) count++;
    if (state.filters.gender && state.filters.gender !== "all") count++;

    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    const handleNavClick = (viewName) => {
      if (state.isDirty) {
        if (!confirm(window.TRANSLATIONS[window.currentLanguage].toastCancelConfirm)) {
          return;
        }
      }
      state.isDirty = false;
      showView(viewName);
    };

    document.getElementById("navVacancies").addEventListener("click", () => handleNavClick("vacancies"));
    document.getElementById("navFavorites").addEventListener("click", () => handleNavClick("favorites"));
    document.getElementById("navCabinet").addEventListener("click", () => handleNavClick("cabinet"));

    const filterPanel = document.getElementById("filterPanel");
    const filterBackdrop = document.getElementById("filterBackdrop");

    document.getElementById("btnFilterTrigger").addEventListener("click", () => {
      filterPanel.classList.add("open");
      filterBackdrop.classList.add("active");
      document.getElementById("btnFilterTrigger").classList.add("active");
    });

    const closeFilter = () => {
      filterPanel.classList.remove("open");
      filterBackdrop.classList.remove("active");
      document.getElementById("btnFilterTrigger").classList.remove("active");
    };

    document.getElementById("btnCloseFilter").addEventListener("click", closeFilter);
    filterBackdrop.addEventListener("click", closeFilter);

    document.getElementById("btnFilterApply").addEventListener("click", () => {
      state.filters.sort = document.getElementById("filterSort").value;
      state.filters.age = document.getElementById("filterAge").value;
      state.filters.remoteOnly = document.getElementById("filterRemoteOnly").checked;
      
      closeFilter();
      applyFiltersAndRender();
      renderActiveFilterTags();
    });

    document.getElementById("btnFilterReset").addEventListener("click", () => {
      state.filters = {
        sort: "newest",
        professions: [],
        cities: [],
        excludeProfessions: [],
        age: null,
        remoteOnly: false,
        gender: "all"
      };

      document.getElementById("filterSort").value = "newest";
      document.getElementById("filterAge").value = "";
      document.getElementById("filterRemoteOnly").checked = false;

      document.querySelectorAll("#filterGenderGroup .gender-seg-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.gender === "all");
      });

      syncMultiSelectTags("filterProfession");
      syncMultiSelectTags("filterCity");
      syncMultiSelectTags("filterExclude");
      
      updateFilterBadge();
      closeFilter();
      applyFiltersAndRender();
      renderActiveFilterTags();
      showToast(t("toastFiltersReset"), "info");
    });

    document.getElementById("btnOpenCreateForm").addEventListener("click", () => {
      if (!state.user) {
        document.getElementById("authModalText").textContent = window.TRANSLATIONS[window.currentLanguage].authModalFormDesc;
        document.getElementById("authModal").classList.add("active");
        state.authRedirect = { type: "publishForm" };
        return;
      }
      openJobForm();
    });

    document.getElementById("btnFormCancel").addEventListener("click", () => {
      if (state.isDirty) {
        if (!confirm(window.TRANSLATIONS[window.currentLanguage].toastCancelConfirm)) {
          return;
        }
      }
      state.isDirty = false;
      showView("cabinet");
    });

    document.getElementById("btnFormPreview").addEventListener("click", showFormPreview);

    document.getElementById("btnPreviewEdit").addEventListener("click", () => {
      document.getElementById("cabinetPreviewContainer").classList.add("hidden");
      document.getElementById("cabinetFormContainer").classList.remove("hidden");
    });

    document.getElementById("btnPreviewPublish").addEventListener("click", handlePublishVacancy);

    // Dark Mode Toggler
    const btnDarkMode = document.getElementById("btnDarkMode");
    if (btnDarkMode) {
      btnDarkMode.addEventListener("click", () => {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        if (isDark) {
          document.documentElement.removeAttribute("data-theme");
          localStorage.setItem("birret_theme", "light");
          document.getElementById("iconSun").classList.add("hidden");
          document.getElementById("iconMoon").classList.remove("hidden");
        } else {
          document.documentElement.setAttribute("data-theme", "dark");
          localStorage.setItem("birret_theme", "dark");
          document.getElementById("iconSun").classList.remove("hidden");
          document.getElementById("iconMoon").classList.add("hidden");
        }
      });
    }

    // Gender filter buttons handling
    document.querySelectorAll("#filterGenderGroup .gender-seg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll("#filterGenderGroup .gender-seg-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.filters.gender = btn.dataset.gender;
      });
    });

    // Google OAuth Button
    const googleBtn = document.getElementById("btnGoogleSignIn");
    if (googleBtn) {
      googleBtn.addEventListener("click", handleGoogleSignIn);
    }

    // Also attach Google sign-in to cabinet guest button
    document.querySelectorAll(".btn-auth-trigger").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("authModal").classList.add("active");
      });
    });

    document.getElementById("btnLogout").addEventListener("click", handleLogout);
    
    document.getElementById("btnAuthClose").addEventListener("click", () => {
      document.getElementById("authModal").classList.remove("active");
      state.authRedirect = null;
    });

    document.getElementById("authModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("authModal")) {
        document.getElementById("authModal").classList.remove("active");
        state.authRedirect = null;
      }
    });

    document.getElementById("btnDetailClose").addEventListener("click", () => {
      document.getElementById("detailModal").classList.remove("active");
    });

    document.getElementById("detailModal").addEventListener("click", (e) => {
      if (e.target === document.getElementById("detailModal")) {
        document.getElementById("detailModal").classList.remove("active");
      }
    });

    document.getElementById("detailFavoriteBtn").addEventListener("click", () => {
      const jobId = document.getElementById("detailFavoriteBtn").getAttribute("data-favorite-id");
      toggleFavorite(jobId);
      
      setTimeout(() => {
        document.getElementById("detailFavoriteBtn").classList.toggle("active", state.favorites.includes(jobId));
      }, 50);
    });

    window.addEventListener("online", () => {
      document.getElementById("offlineBanner").classList.remove("active");
      showToast(window.TRANSLATIONS[window.currentLanguage].toastConnectionRestored, "success");
      const publishBtn = document.getElementById("btnPreviewPublish");
      if (publishBtn) publishBtn.disabled = false;
    });

    window.addEventListener("offline", () => {
      document.getElementById("offlineBanner").classList.add("active");
      showToast(window.TRANSLATIONS[window.currentLanguage].toastConnectionLost, "error");
    });
  }

  // --- RENDER SELECTED FILTERS AS REMOVABLE TAGS ---
  function renderActiveFilterTags() {
    const tagsContainer = document.getElementById("activeFiltersTags");
    tagsContainer.innerHTML = "";

    const addTag = (text, type, value) => {
      const tag = document.createElement("div");
      tag.className = `filter-tag ${type === 'exclude' ? 'tag-excluded' : ''}`;
      tag.textContent = text;

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn-remove-tag";
      removeBtn.innerHTML = `
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;

      removeBtn.addEventListener("click", () => {
        tag.classList.add("tag-removing");
        setTimeout(() => {
          if (type === "profession") {
            state.filters.professions = state.filters.professions.filter(p => p !== value);
            syncMultiSelectTags("filterProfession");
          } else if (type === "city") {
            state.filters.cities = state.filters.cities.filter(c => c !== value);
            syncMultiSelectTags("filterCity");
          } else if (type === "exclude") {
            state.filters.excludeProfessions = state.filters.excludeProfessions.filter(p => p !== value);
            syncMultiSelectTags("filterExclude");
          } else if (type === "age") {
            state.filters.age = null;
            document.getElementById("filterAge").value = "";
          } else if (type === "remote") {
            state.filters.remoteOnly = false;
            document.getElementById("filterRemoteOnly").checked = false;
          } else if (type === "gender") {
            state.filters.gender = "all";
            document.querySelectorAll("#filterGenderGroup .gender-seg-btn").forEach(b => {
              b.classList.toggle("active", b.dataset.gender === "all");
            });
          }

          updateFilterBadge();
          applyFiltersAndRender();
          renderActiveFilterTags();
        }, 200);
      });

      tag.appendChild(removeBtn);
      tagsContainer.appendChild(tag);
    };

    state.filters.professions.forEach(p => addTag(window.translateProfession(p, window.currentLanguage), "profession", p));
    state.filters.cities.forEach(c => addTag(window.translateCity(c, window.currentLanguage), "city", c));
    state.filters.excludeProfessions.forEach(p => {
      addTag(`${t("tagPrefixExclude")}${window.translateProfession(p, window.currentLanguage)}`, "exclude", p);
    });
    if (state.filters.age) {
      addTag(`${t("tagPrefixAge")}${state.filters.age}`, "age");
    }
    if (state.filters.remoteOnly) {
      addTag(t("remoteJob"), "remote");
    }
    if (state.filters.gender && state.filters.gender !== "all") {
      const genderText = state.filters.gender === "male" ? t("filterGenderMale") : t("filterGenderFemale");
      addTag(genderText, "gender");
    }
  }

  init();
});
