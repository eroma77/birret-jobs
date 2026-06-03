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
      remoteOnly: false
    },
    formState: {
      profession: "",
      gender: "Неважно",
      ageFrom: 15,
      ageTo: 50,
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

  // --- INITIALIZATION ---
  async function init() {
    // Set initial language from storage or default to Russian
    window.currentLanguage = localStorage.getItem("birret_lang") || "ru";

    // 1. Use the Supabase client that was created synchronously in <head>
    //    This is critical: the client MUST exist before getSession() is called
    //    so it can parse the #access_token hash from OAuth redirect.
    if (window.__BIRRET_SUPABASE) {
      supabaseClient = window.__BIRRET_SUPABASE;
      console.log("[Birret] Using pre-initialized Supabase client.");
      initSupabaseAuth();
    } else {
      // Fallback: try fetching config from server (old path)
      try {
        const configRes = await fetch("/api/config");
        const config = await configRes.json();
        supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
        initSupabaseAuth();
      } catch (err) {
        console.error("Failed to initialize Supabase:", err);
        showToast(window.TRANSLATIONS[window.currentLanguage].toastAuthServerConnectError, "error");
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


  function escapeHTML(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }


  // --- BILINGUAL TRANSLATION ENGINE ---
  function applyLanguage(lang) {
    window.currentLanguage = lang;
    localStorage.setItem("birret_lang", lang);
    
    const langBtn = document.getElementById("btnLangToggle");
    if (langBtn) {
      // Show "KZ" for Kazakh (kk), "RU" for Russian - user-friendly labels
      langBtn.textContent = lang === "kk" ? "KZ" : "RU";
    }
    
    document.documentElement.lang = lang;

    const elements = document.querySelectorAll("[data-i18n]");
    const dict = window.TRANSLATIONS[lang];
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

    // Refresh translation place holders for dropdown inputs
    const pSearch = document.getElementById("formProfessionSearch");
    if (pSearch) pSearch.placeholder = lang === "kk" ? "Іздеу..." : "Поиск...";
    const cSearch = document.getElementById("formCitySearch");
    if (cSearch) cSearch.placeholder = lang === "kk" ? "Іздеу..." : "Поиск...";
    
    const filterP = document.getElementById("filterProfessionSearch");
    if (filterP) filterP.placeholder = lang === "kk" ? "Мамандықты жазыңыз..." : "Введите профессию...";
    const filterC = document.getElementById("filterCitySearch");
    if (filterC) filterC.placeholder = lang === "kk" ? "Қаланы жазыңыз..." : "Введите город...";
    const filterE = document.getElementById("filterExcludeSearch");
    if (filterE) filterE.placeholder = lang === "kk" ? "Шектеу үшін іздеу..." : "Поиск для исключения...";

    // Dynamic age placeholders
    const fromText = document.getElementById("formAgeFromText");
    const toText = document.getElementById("formAgeToText");
    if (fromText && !fromText.classList.contains("has-value")) {
      fromText.textContent = lang === "kk" ? "Бастап" : "От";
    }
    if (toText && !toText.classList.contains("has-value")) {
      toText.textContent = lang === "kk" ? "Дейін" : "До";
    }

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

      // Close modal & show welcome on any sign-in event (including our INITIAL_SESSION fallback)
      const isNewLogin = (event === "SIGNED_IN" || event === "INITIAL_SESSION");
      if (isNewLogin) {
        const modal = document.getElementById("authModal");
        if (modal) modal.classList.remove("active");

        showToast(
          window.currentLanguage === "kk"
            ? `Сәлем, ${displayName}! Жүйеге сәтті кірдіңіз.`
            : `Добро пожаловать, ${displayName}!`,
          "success"
        );

        // Execute any pending action that required auth
        if (state.authRedirect) {
          const redirect = state.authRedirect;
          state.authRedirect = null;
          setTimeout(() => executeRedirectAction(redirect), 300);
        }
      }
    } else {
      state.user = null;
    }

    updateAuthUI();
  }


  // --- GOOGLE OAUTH AUTHENTICATION ---
  async function handleGoogleSignIn() {
    if (!supabaseClient) {
      showToast(window.currentLanguage === "kk" ? "Сервермен байланыс жоқ. Қайталаңыз." : "Сервер недоступен. Попробуйте позже.", "error");
      return;
    }
    if (!navigator.onLine) {
      showToast(window.currentLanguage === "kk" ? "Интернет байланысы жоқ! Әрекет мүмкін емес." : "Отсутствие интернета! Действие невозможно.", "error");
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
      showToast(
        (window.currentLanguage === "kk" ? "Google арқылы кіру қатесі: " : "Ошибка входа через Google: ") + err.message,
        "error"
      );
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
      showToast(window.currentLanguage === "kk" ? "Жүйеден шықтыңыз." : "Вы вышли из системы.", "info");
    } catch (err) {
      console.error(err);
    }
  }

  function updateAuthUI() {
    const guestState = document.getElementById("cabinetGuestState");
    const authState = document.getElementById("cabinetAuthState");
    
    if (state.user) {
      guestState.style.display = "none";
      authState.style.display = "block";
      
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
      guestState.style.display = "flex";
      authState.style.display = "none";
    }
  }


  // --- DATABASE SERVER HELPERS ---
  async function loadJobsFromServer() {
    renderSkeletons();
    try {
      const response = await fetch("/api/jobs");
      if (!response.ok) throw new Error("Не удалось получить вакансии с сервера");
      
      state.jobs = await response.json();
      localStorage.setItem("birret_jobs", JSON.stringify(state.jobs));
      applyFiltersAndRender(false);
    } catch (err) {
      console.error("Database connection error:", err);
      showToast(window.currentLanguage === "kk" ? "Деректер қорына қосылу қатесі. Локальді мәліметтер жүктелді." : "Ошибка подключения к БД. Загружены локальные данные.", "error");
      
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
      data: () => (window.currentLanguage === "kk" ? window.PROFESSIONS_KZ : window.PROFESSIONS_RU),
      placeholder: "Выберите профессию",
      onSelect: (value) => {
        state.formState.profession = value;
        validateField("profession");
        checkFormValidity();
      },
      searchFilter: (item, query) => item.toLowerCase().includes(query.toLowerCase())
    });

    // 2. Create Job Form - City Dropdown
    setupSingleSelectDropdown({
      triggerId: "formCityTrigger",
      menuId: "formCityMenu",
      searchId: "formCitySearch",
      listId: "formCityList",
      data: () => (window.currentLanguage === "kk" ? window.CITIES_KZ : window.CITIES_RU),
      placeholder: "Выберите город",
      onSelect: (value) => {
        state.formState.city = value;
        validateField("city");
        checkFormValidity();
      },
      searchFilter: (item, query) => item.toLowerCase().startsWith(query.toLowerCase())
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
      data: () => (window.currentLanguage === "kk" ? window.PROFESSIONS_KZ : window.PROFESSIONS_RU),
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
      searchFilter: (item, query) => item.toLowerCase().includes(query.toLowerCase())
    });

    // 5. Filters - City (Multi-select)
    setupMultiSelectDropdown({
      triggerId: "filterCityTrigger",
      menuId: "filterCityMenu",
      searchId: "filterCitySearch",
      listId: "filterCityList",
      tagsContainerId: "filterCityTags",
      data: () => (window.currentLanguage === "kk" ? window.CITIES_KZ : window.CITIES_RU),
      selectedState: state.filters.cities,
      onChanged: () => {
        updateFilterBadge();
      },
      searchFilter: (item, query) => item.toLowerCase().startsWith(query.toLowerCase())
    });

    // 6. Filters - Exclude Profession (Multi-select)
    setupMultiSelectDropdown({
      triggerId: "filterExcludeTrigger",
      menuId: "filterExcludeMenu",
      searchId: "filterExcludeSearch",
      listId: "filterExcludeList",
      tagsContainerId: "filterExcludeTags",
      data: () => (window.currentLanguage === "kk" ? window.PROFESSIONS_KZ : window.PROFESSIONS_RU),
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
      searchFilter: (item, query) => item.toLowerCase().includes(query.toLowerCase())
    });
  }

  function setupSingleSelectDropdown({ triggerId, menuId, searchId, listId, data, placeholder, onSelect, searchFilter }) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const search = document.getElementById(searchId);
    const list = document.getElementById(listId);
    const triggerText = trigger.querySelector(".dropdown-trigger-text");

    const renderList = (query = "") => {
      list.innerHTML = "";
      const getArray = () => (typeof data === "function" ? data() : data);
      const filtered = getArray().filter(item => searchFilter(item, query));
      
      if (filtered.length === 0) {
        list.innerHTML = `<div class="dropdown-option" style="color: var(--color-text-light); pointer-events: none;">Ничего не найдено</div>`;
        return;
      }

      filtered.forEach(item => {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        option.textContent = item;
        
        if (triggerText.textContent === item) {
          option.classList.add("selected");
        }

        option.addEventListener("click", () => {
          triggerText.textContent = item;
          triggerText.classList.add("has-value");
          menu.classList.remove("show");
          trigger.classList.remove("open");
          onSelect(item);
        });
        list.appendChild(option);
      });
    };

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(menuId);
      const isOpen = menu.classList.toggle("show");
      trigger.classList.toggle("open", isOpen);
      if (isOpen) {
        if (search) {
          search.value = "";
          search.focus();
        }
        renderList();
      }
    });

    if (search) {
      search.addEventListener("input", (e) => {
        renderList(e.target.value);
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
        option.textContent = age;
        if (state.formState.ageFrom === age) option.classList.add("selected");

        option.addEventListener("click", () => {
          state.formState.ageFrom = age;
          fromText.textContent = window.currentLanguage === "kk" ? `Бастап ${age}` : `От ${age}`;
          fromText.classList.add("has-value");
          fromMenu.classList.remove("show");
          fromTrigger.classList.remove("open");
          
          if (state.formState.ageTo < age) {
            state.formState.ageTo = age;
            toText.textContent = window.currentLanguage === "kk" ? `Дейін ${age}` : `До ${age}`;
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
        option.textContent = age;
        if (state.formState.ageTo === age) option.classList.add("selected");

        option.addEventListener("click", () => {
          state.formState.ageTo = age;
          toText.textContent = window.currentLanguage === "kk" ? `Дейін ${age}` : `До ${age}`;
          toText.classList.add("has-value");
          toMenu.classList.remove("show");
          toTrigger.classList.remove("open");
          
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
      if (isOpen) renderFrom();
    });

    toTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns("formAgeToMenu");
      const isOpen = toMenu.classList.toggle("show");
      toTrigger.classList.toggle("open", isOpen);
      if (isOpen) renderTo();
    });
  }

  function setupMultiSelectDropdown({ triggerId, menuId, searchId, listId, tagsContainerId, data, selectedState, onChanged, excludeMode = false, searchFilter }) {
    const trigger = document.getElementById(triggerId);
    const menu = document.getElementById(menuId);
    const search = document.getElementById(searchId);
    const list = document.getElementById(listId);
    const tagsContainer = document.getElementById(tagsContainerId);
    const triggerText = trigger.querySelector(".dropdown-trigger-text");

    const dropdownKey = triggerId.replace("Trigger", "");
    window[`syncMultiTags_${dropdownKey}`] = renderTagsAndList;

    function renderTagsAndList() {
      tagsContainer.innerHTML = "";
      if (selectedState.length > 0) {
        triggerText.textContent = window.currentLanguage === "kk" ? `Таңдалды: ${selectedState.length}` : `Выбрано: ${selectedState.length}`;
        triggerText.classList.add("has-value");
      } else {
        triggerText.textContent = excludeMode 
          ? (window.currentLanguage === "kk" ? "Қай жұмысты жасыру керек" : "Какие вакансии скрыть") 
          : (window.currentLanguage === "kk" ? "Бірнешеуін таңдау" : "Выбрать несколько");
        triggerText.classList.remove("has-value");
      }

      selectedState.forEach(val => {
        const tag = document.createElement("div");
        tag.className = `filter-tag ${excludeMode ? 'tag-excluded' : ''}`;
        tag.textContent = val;

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

      const query = search ? search.value : "";
      list.innerHTML = "";
      const getArray = () => (typeof data === "function" ? data() : data);
      const filtered = getArray().filter(item => searchFilter(item, query));

      if (filtered.length === 0) {
        list.innerHTML = `<div class="dropdown-option" style="color: var(--color-text-light); pointer-events: none;">Ничего не найдено</div>`;
        return;
      }

      filtered.forEach(item => {
        const option = document.createElement("div");
        option.className = "dropdown-option";
        option.textContent = item;
        
        const isSelected = selectedState.includes(item);
        if (isSelected) {
          option.classList.add("selected");
        }

        option.innerHTML = `
          <span>${item}</span>
          <svg class="checkbox-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width: 16px; height: 16px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        `;

        option.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = selectedState.indexOf(item);
          if (idx !== -1) {
            selectedState.splice(idx, 1);
          } else {
            selectedState.push(item);
          }
          onChanged();
          renderTagsAndList();
        });

        list.appendChild(option);
      });
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns(menuId);
      const isOpen = menu.classList.toggle("show");
      trigger.classList.toggle("open", isOpen);
      if (isOpen) {
        if (search) {
          search.value = "";
          search.focus();
        }
        renderTagsAndList();
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
    if (window[`syncMultiTags_${prefix}`]) {
      window[`syncMultiTags_${prefix}`]();
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
      const cleanVal = rawVal.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s.,№-]/g, "");
      if (rawVal !== cleanVal) {
        e.target.value = cleanVal;
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
      const digitsOnly = val.replace(/\D/g, "");
      
      if (digitsOnly) {
        const rawNum = parseInt(digitsOnly);
        state.formState.payment = rawNum;
        e.target.value = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      } else {
        state.formState.payment = "";
        e.target.value = "";
      }
      
      state.isDirty = true;
      validateField("payment");
      checkFormValidity();
    });

    formPhone.addEventListener("input", (e) => {
      const val = e.target.value;
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
      
      e.target.value = formatted;
      validateField("phone");
      checkFormValidity();
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
          isValid = !isNaN(pay) && pay >= 1000 && pay <= 1000000;
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
          silentValid = state.formState.isNegotiable || (Number(state.formState.payment) >= 1000 && Number(state.formState.payment) <= 1000000);
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
      gender: "Неважно",
      ageFrom: 15,
      ageTo: 50,
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
    document.getElementById("formAgeFromText").textContent = "От";
    document.getElementById("formAgeFromText").classList.remove("has-value");
    document.getElementById("formAgeToText").textContent = "До";
    document.getElementById("formAgeToText").classList.remove("has-value");
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
    document.getElementById("cabinetDashboard").style.display = "none";
    document.getElementById("cabinetFormContainer").style.display = "block";
    document.getElementById("cabinetPreviewContainer").style.display = "none";
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
    
    document.getElementById("formProfessionText").textContent = job.profession;
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

    document.getElementById("formCityText").textContent = job.city;
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

    document.getElementById("cabinetDashboard").style.display = "none";
    document.getElementById("cabinetFormContainer").style.display = "block";
    document.getElementById("cabinetPreviewContainer").style.display = "none";
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

    formContainer.style.display = "none";
    previewContainer.style.display = "block";
  }

  // PostgreSQL POST API Integration
  async function handlePublishVacancy() {
    if (!navigator.onLine) {
      showToast(window.TRANSLATIONS[window.currentLanguage].toastOffline, "error");
      return;
    }

    const publishBtn = document.getElementById("btnPreviewPublish");
    publishBtn.disabled = true;
    publishBtn.textContent = window.currentLanguage === "kk" ? "Жариялануда..." : "Публикация...";

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
      createdAt: new Date().toISOString(),
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
        throw new Error(errorData.error || "Сервер не смог сохранить вакансию");
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
  function toggleFavorite(jobId) {
    if (!state.user) {
      document.getElementById("authModalText").textContent = "Войдите в систему, чтобы добавлять вакансии в список избранного.";
      document.getElementById("authModal").classList.add("active");
      state.authRedirect = { type: "favorite", jobId: jobId };
      return;
    }

    const idx = state.favorites.indexOf(jobId);
    const isAdding = (idx === -1);
    
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

    const successRate = 0.95;
    const syncSuccess = Math.random() < successRate;

    setTimeout(() => {
      if (syncSuccess) {
        saveFavoritesToStorage();
        if (state.currentView === "favorites") {
          renderFavorites();
        }
      } else {
        // Rollback optimistic change
        const rollbackIdx = state.favorites.indexOf(jobId);
        if (isAdding && rollbackIdx !== -1) {
          state.favorites.splice(rollbackIdx, 1);
        } else if (!isAdding && rollbackIdx === -1) {
          state.favorites.push(jobId);
        }
        
        heartBtns.forEach(btn => {
          btn.classList.toggle("active", !isAdding);
        });

        if (state.currentView === "favorites") {
          renderFavorites();
        }

        showToast(window.TRANSLATIONS[window.currentLanguage].toastRollbackFav, "error");
      }
    }, 800);
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

    if (state.filters.age !== null && state.filters.age !== "") {
      const userAge = Number(state.filters.age);
      result = result.filter(job => job.ageFrom <= userAge && userAge <= job.ageTo);
    }

    if (state.filters.sort === "newest") {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (state.filters.sort === "oldest") {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (state.filters.sort === "highest_payment") {
      result.sort((a, b) => {
        const payA = a.isNegotiable ? 0 : a.payment;
        const payB = b.isNegotiable ? 0 : b.payment;
        return payB - payA;
      });
    } else if (state.filters.sort === "alphabetical") {
      result.sort((a, b) => a.profession.localeCompare(b.profession, "ru"));
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
          <h3 class="empty-state-title">Вакансии не найдены</h3>
          <p class="empty-state-desc">Попробуйте изменить или сбросить настройки фильтра.</p>
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
          <h3 class="empty-state-title">Список избранного пуст</h3>
          <p class="empty-state-desc">Нажмите на иконку сердечка на карточке вакансии, чтобы сохранить её сюда.</p>
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
        ? (window.currentLanguage === "kk" ? "Келісімді" : "Договорная")
        : `${String(job.payment).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
      const timeLabel = getJobDateLabel(job.createdAt);

      item.innerHTML = `
        <div class="my-job-info">
          <span class="my-job-title">${escapeHTML(job.profession)}</span>
          <div class="my-job-meta">
            <span>${payLabel}</span>
            <span>${escapeHTML(job.city)} (${timeLabel})</span>
          </div>
        </div>
        <div class="my-job-actions">
          <button class="btn-my-job-action edit" data-edit-id="${job.id}">Изменить</button>
          <button class="btn-my-job-action delete" data-delete-id="${job.id}">Удалить</button>
        </div>
      `;

      item.querySelector(".edit").addEventListener("click", () => editJob(job.id));
      item.querySelector(".delete").addEventListener("click", () => deleteMyJob(job.id));

      list.appendChild(item);
    });
  }

  function translateGender(gender) {
    if (window.currentLanguage === "kk") {
      if (gender === "Мужской") return "Ер";
      if (gender === "Женский") return "Әйел";
      return "Маңызды емес";
    }
    return gender;
  }

  function createVacancyCardHTML(job, isPreview = false) {
    const isFav = state.favorites.includes(job.id);
    const timeLabel = getJobDateLabel(job.createdAt);
    const payLabel = job.isNegotiable 
      ? (window.currentLanguage === "kk" ? "Келісімді" : "Договорная") 
      : `${String(job.payment).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
    const remoteLabel = job.isRemote 
      ? (window.currentLanguage === "kk" ? "Қашықтан" : "Удаленно") 
      : escapeHTML(job.city);
    
    return `
      <div class="vacancy-card-header">
        <span class="vacancy-profession">${escapeHTML(job.profession)}</span>
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
        ${job.isRemote ? `<span class="badge badge-remote">${window.currentLanguage === "kk" ? "Қашықтан" : "Удаленно"}</span>` : ''}
        <span class="badge">${window.currentLanguage === "kk" ? "Жас" : "Возраст"}: ${job.ageFrom} - ${job.ageTo} ${window.currentLanguage === "kk" ? "жас" : "лет"}</span>
        <span class="badge">${window.currentLanguage === "kk" ? "Жынысы" : "Пол"}: ${translateGender(job.gender)}</span>
      </div>

      <div class="vacancy-description">${escapeHTML(job.description).replace(/\n/g, "<br>")}</div>

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
          <a class="btn-whatsapp-link" href="${generateWhatsAppLink(job.phone, job.profession)}" target="_blank">
            <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.012 2c-5.506 0-9.989 4.478-9.989 9.984a9.96 9.96 0 001.37 5.028L2 22l5.13-1.346a9.928 9.928 0 004.877 1.277h.005c5.505 0 9.989-4.478 9.99-9.985A9.972 9.972 0 0012.012 2zm5.72 13.917c-.246.696-1.423 1.269-1.95 1.34-.486.066-.994.095-2.203-.393a8.946 8.946 0 01-3.69-2.43 9.773 9.773 0 01-1.89-2.732c-.39-.68-.135-1.04.167-1.36.223-.238.486-.532.658-.77.165-.246.216-.402.324-.67.108-.268.043-.512-.02-.67-.066-.16-.583-1.4-.803-1.925-.213-.514-.452-.455-.62-.464-.15-.008-.323-.008-.495-.008a.952.952 0 00-.687.323c-.237.26-.902.883-.902 2.15 0 1.268.923 2.493 1.053 2.671.13.178 1.817 2.776 4.4 3.887.615.264 1.094.42 1.468.54.618.196 1.18.17 1.626.104.498-.074 1.53-.624 1.745-1.229.215-.604.215-1.12.15-1.229-.064-.11-.237-.17-.487-.294z"/>
            </svg>
            <span>${window.currentLanguage === "kk" ? "WhatsApp-ты тексеру" : "Проверить WhatsApp"}</span>
          </a>
        </div>
      ` : ''}
    `;
  }

  function getJobDateLabel(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return window.currentLanguage === "kk" ? "Бүгін" : "Сегодня";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return window.currentLanguage === "kk" ? "Кеше" : "Вчера";
    } else {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${day}.${month}`;
    }
  }

  function generateWhatsAppLink(phoneNum, professionName) {
    const cleanPhone = "7" + phoneNum.replace(/\D/g, "");
    const message = `Здравствуйте, я пишу по поводу вакансии "${professionName}" на вашем сайте.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  function openWhatsAppLink(jobId) {
    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;
    const url = generateWhatsAppLink(job.phone, job.profession);
    window.open(url, "_blank");
  }

  // --- DETAIL MODAL & GUEST BLOCKS ---
  function openJobDetails(jobId) {
    if (!state.user) {
      document.getElementById("authModalText").textContent = window.currentLanguage === "kk"
        ? "Жұмыстың толық мәліметтерін көру және хабарласу үшін тіркелуіңіз қажет."
        : "Войдите в систему, чтобы смотреть детали вакансии и связываться с работодателями.";
      document.getElementById("authModal").classList.add("active");
      state.authRedirect = { type: "viewDetails", jobId: jobId };
      return;
    }

    const job = state.jobs.find(j => j.id === jobId);
    if (!job) return;

    document.getElementById("detailProfession").textContent = job.profession;
    
    const favBtn = document.getElementById("detailFavoriteBtn");
    favBtn.setAttribute("data-favorite-id", job.id);
    favBtn.classList.toggle("active", state.favorites.includes(job.id));
    
    const payLabel = job.isNegotiable 
      ? (window.currentLanguage === "kk" ? "Келісімді" : "Договорная") 
      : `${String(job.payment).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ₸`;
      
    document.getElementById("detailBadges").innerHTML = `
      <span class="badge badge-payment">${payLabel}</span>
      ${job.isRemote ? `<span class="badge badge-remote">${window.currentLanguage === "kk" ? "Қашықтан" : "Удаленно"}</span>` : ""}
      <span class="badge">${window.currentLanguage === "kk" ? "Жас" : "Возраст"}: ${job.ageFrom} - ${job.ageTo} ${window.currentLanguage === "kk" ? "жас" : "лет"}</span>
      <span class="badge">${window.currentLanguage === "kk" ? "Жынысы" : "Пол"}: ${translateGender(job.gender)}</span>
    `;

    document.getElementById("detailDescription").textContent = job.description;
    
    const remoteLabel = job.isRemote 
      ? (window.currentLanguage === "kk" ? "Қашықтан жұмыс" : "Удаленная работа") 
      : `${job.city}, ${job.address}`;
    document.getElementById("detailAddress").textContent = remoteLabel;
    
    document.getElementById("detailTime").textContent = window.currentLanguage === "kk"
      ? `Жарияланған уақыты: ${getJobDateLabel(job.createdAt)}`
      : `Опубликовано: ${getJobDateLabel(job.createdAt)}`;
    
    document.getElementById("detailCriteria").textContent = window.currentLanguage === "kk"
      ? `Қажетті жыныс: ${translateGender(job.gender)} | Жас: ${job.ageFrom} - ${job.ageTo} жас`
      : `Требуемый пол: ${job.gender} | Возраст: от ${job.ageFrom} до ${job.ageTo} лет`;

    const waBtn = document.getElementById("detailWhatsAppBtn");
    
    waBtn.onclick = (e) => {
      e.preventDefault();
      
      if (!state.user) {
        document.getElementById("authModal").classList.add("active");
        state.authRedirect = { type: "contact", jobId: job.id };
        return;
      }

      if (job.phone.length !== 10) {
        showToast(window.currentLanguage === "kk" ? "Қате телефон нөмірі! WhatsApp-қа өту мүмкін емес." : "Некорректный номер телефона! Открыть WhatsApp невозможно.", "error");
        return;
      }
      
      if (!navigator.onLine) {
        showToast(window.currentLanguage === "kk" ? "Интернет байланысы жоқ! WhatsApp-қа өту мүмкін емес." : "Соединение с интернетом потеряно! Не удалось запустить WhatsApp.", "error");
        return;
      }

      const url = generateWhatsAppLink(job.phone, job.profession);
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
      document.getElementById("cabinetDashboard").style.display = "block";
      document.getElementById("cabinetFormContainer").style.display = "none";
      document.getElementById("cabinetPreviewContainer").style.display = "none";
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

    if (count > 0) {
      badge.textContent = count;
      badge.style.display = "inline-flex";
    } else {
      badge.style.display = "none";
    }
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    document.getElementById("navVacancies").addEventListener("click", () => showView("vacancies"));
    document.getElementById("navFavorites").addEventListener("click", () => showView("favorites"));
    document.getElementById("navCabinet").addEventListener("click", () => showView("cabinet"));

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
        remoteOnly: false
      };

      document.getElementById("filterSort").value = "newest";
      document.getElementById("filterAge").value = "";
      document.getElementById("filterRemoteOnly").checked = false;

      syncMultiSelectTags("filterProfession");
      syncMultiSelectTags("filterCity");
      syncMultiSelectTags("filterExclude");
      
      updateFilterBadge();
      closeFilter();
      applyFiltersAndRender();
      renderActiveFilterTags();
      showToast(window.currentLanguage === "kk" ? "Сүзгілер тазаланды." : "Фильтры сброшены.", "info");
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
      document.getElementById("cabinetPreviewContainer").style.display = "none";
      document.getElementById("cabinetFormContainer").style.display = "block";
    });

    document.getElementById("btnPreviewPublish").addEventListener("click", handlePublishVacancy);

    // Language Toggler
    const langBtn = document.getElementById("btnLangToggle");
    if (langBtn) {
      langBtn.addEventListener("click", () => {
        const nextLang = window.currentLanguage === "ru" ? "kk" : "ru";
        applyLanguage(nextLang);
      });
    }

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
          }

          updateFilterBadge();
          applyFiltersAndRender();
          renderActiveFilterTags();
        }, 200);
      });

      tag.appendChild(removeBtn);
      tagsContainer.appendChild(tag);
    };

    state.filters.professions.forEach(p => addTag(p, "profession", p));
    state.filters.cities.forEach(c => addTag(c, "city", c));
    state.filters.excludeProfessions.forEach(p => addTag(`Скрыть: ${p}`, "exclude", p));
    if (state.filters.age) {
      addTag(`Возраст: ${state.filters.age}`, "age");
    }
    if (state.filters.remoteOnly) {
      addTag("Удаленно", "remote");
    }
  }

  init();
});
