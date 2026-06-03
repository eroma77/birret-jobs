// ---------------------------------------------------------------------------
// CENTRALIZED CONFIGURATION — infrastructure constants that are NOT translations
// ---------------------------------------------------------------------------
window.SUPPORT_WHATSAPP_URL = "https://wa.me/77754737619";

// ---------------------------------------------------------------------------
// TRANSLATIONS — single source of truth for all UI strings.
// Language is fixed to Russian (ru). Kazakh alphabet characters (әіңғүұқөһ)
// remain fully supported in USER INPUT (addresses, descriptions) via regexes —
// this file only removes the kk UI translation layer.
//
// Object is deep-frozen to prevent runtime mutation from third-party scripts.
// ---------------------------------------------------------------------------
window.TRANSLATIONS = Object.freeze({
  ru: Object.freeze({
    // ── Navigation / General ──────────────────────────────────────────────
    filterBtn: "Фильтр",
    feedTitle: "Вакансии",

    // ── Offline / Config banners ───────────────────────────────────────────
    offlineBannerText: "Соединение с интернетом потеряно. Ваши данные сохранены, попробуйте отправить позже",
    configErrorBannerText: "Не удалось загрузить конфигурацию приложения. Пожалуйста, проверьте интернет-соединение и перезагрузите страницу.",

    // ── Favorites view ────────────────────────────────────────────────────
    favTitle: "Избранные вакансии",
    favSubtitle: "Список сохраненных вами вакансий",
    favEmptyTitle: "Список избранного пуст",
    favEmptyDesc: "Нажмите на иконку сердечка на карточке вакансии, чтобы сохранить её здесь.",

    // ── Cabinet / Auth ────────────────────────────────────────────────────
    guestCabinetTitle: "Войдите в личный кабинет",
    guestCabinetDesc: "Зарегистрируйтесь, чтобы размещать новые объявления и управлять своими публикациями.",
    btnCabinetAuth: "Войти / Зарегистрироваться",
    btnGoogleAuth: "Войти через Google",
    profileTitle: "Кабинет",
    profileLogout: "Выйти",
    btnContactAuthor: "Связаться с автором",
    btnOpenForm: "Опубликовать вакансию",
    myJobsTitle: "Мои опубликованные вакансии",
    myJobsEmpty: "Вы еще не опубликовали ни одной вакансии.",
    btnEditAction: "Изменить",
    btnDeleteAction: "Удалить",

    // ── Auth modal ────────────────────────────────────────────────────────
    authModalTitle: "Требуется авторизация",
    authModalDesc: "Войдите через Google. Это абсолютно бесплатно и безопасно.",
    authModalFavDesc: "Войдите в систему, чтобы добавлять вакансии в список избранного.",
    authModalDetailsDesc: "Войдите в систему, чтобы смотреть детали вакансии и связываться с работодателями.",
    authModalFormDesc: "Войдите в систему, чтобы размещать новые объявления.",
    toastWelcome: "Добро пожаловать, {name}!",

    // ── Server error code → localized message ────────────────────────────
    serverErrorDefault: "Ошибка сервера. Попробуйте ещё раз.",
    serverErrorAuthRequired: "Сессия устарела или недействительна. Пожалуйста, войдите снова.",
    serverErrorForbidden: "У вас нет прав на это действие.",
    serverErrorNotFound: "Вакансия не найдена.",
    serverErrorInvalidProfession: "Некорректное название профессии.",
    serverErrorInvalidGender: "Некорректный пол.",
    serverErrorInvalidAgeRange: "Возраст должен быть от 15 до 50 лет.",
    serverErrorInvalidDescriptionLength: "Описание должно быть от 20 до 1000 символов.",
    serverErrorDescriptionContainsUrl: "Описание не должно содержать внешних ссылок.",
    serverErrorInvalidCity: "Необходимо указать город.",
    serverErrorInvalidAddress: "Адрес должен быть от 5 до 255 символов.",
    serverErrorInvalidPayment: "Оплата должна быть от 1 000 ₸ до 5 000 000 ₸.",
    serverErrorInvalidPhone: "Некорректный номер телефона (должно быть 10 цифр).",
    serverErrorInvalidJobType: "Некорректный тип работы.",
    serverErrorInvalidPaymentPeriod: "Некорректный период оплаты.",

    // ── Form ──────────────────────────────────────────────────────────────
    formTitleCreate: "Публикация новой вакансии",
    formTitleEdit: "Редактирование вакансии",
    formSubtitle: "Все поля, помеченные звездочкой, обязательны для заполнения",
    labelProfession: "Профессия",
    placeholderProfession: "Выберите профессию",
    errorProfession: "Необходимо выбрать профессию.",
    labelGender: "Требуемый пол",
    genderMale: "Мужской",
    genderFemale: "Женский",
    genderAny: "Неважно",
    labelJobType: "Тип работы",
    jobTypePermanent: "Постоянная работа",
    jobTypeProject: "Проектная работа",
    errorJobType: "Выберите тип работы.",
    periodMonth: "в месяц",
    periodDay: "в день",
    periodHour: "в час",
    periodShift: "за смену",
    labelAge: "Диапазон возраста",
    ageFrom: "От",
    ageTo: "До",
    ageFromLabel: "От",
    ageToLabel: "До",
    ageFromPrefix: "От ",
    ageToPrefix: "До ",
    errorAge: "Возрастной диапазон должен быть указан верно.",
    labelDescription: "Описание работы",
    descSymbolText: "символов",
    placeholderDescription: "Опишите требования к исполнителю, график, задачи и условия работы...",
    errorDescription: "Напишите не менее 20 символов и не используйте внешние ссылки.",
    labelCity: "Город",
    placeholderCity: "Выберите город",
    errorCity: "Необходимо выбрать город.",
    labelAddress: "Адрес",
    labelRemote: "Удаленно",
    placeholderAddress: "Например: Мкр. Жетысу-2, дом 45",
    errorAddress: "Адрес должен быть от 5 до 50 символов (буквы, цифры, точки, запятые).",
    labelPayment: "Оплата (₸)",
    labelNegotiable: "Договорная",
    placeholderPayment: "Например: 150 000",
    errorPayment: "Сумма должна быть от 1 000 ₸ до 5 000 000 ₸.",
    labelPhone: "Номер телефона WhatsApp",
    errorPhone: "Введите полный номер телефона (10 цифр).",
    btnPreview: "Предпросмотр",
    btnCancel: "Отмена",
    previewTitle: "Предварительный просмотр",
    btnPublish: "Опубликовать",
    btnPublishing: "Публикация...",
    btnEdit: "Редактировать",
    btnCheckWa: "Проверить WhatsApp",

    // ── Search inputs ─────────────────────────────────────────────────────
    placeholderSearch: "Поиск...",
    placeholderFormProfessionSearch: "Введите профессию...",
    placeholderFormCitySearch: "Введите город...",
    placeholderFilterExcludeSearch: "Поиск для исключения...",

    // ── Filters drawer ────────────────────────────────────────────────────
    filterTitle: "Фильтры",
    sortLabel: "Сортировка",
    sortNewest: "Сначала новые",
    sortOldest: "Сначала старые",
    sortHighestPayment: "По размеру оплаты (сначала высокая)",
    sortAlphabetical: "По алфавиту (А-Я)",
    filterProfessionLabel: "Поиск по профессиям",
    filterProfessionPlaceholder: "Введите профессию...",
    filterCityLabel: "Поиск по городам",
    filterCityPlaceholder: "Введите город...",
    filterExcludeLabel: "Исключить профессии",
    filterExcludePlaceholder: "Поиск для исключения...",
    filterAgeLabel: "Ваш возраст",
    filterAgePlaceholder: "Например: 25",
    filterAgeDesc: "Показывает только вакансии, которые подходят под ваш возраст",
    filterRemoteLabel: "Только удаленная работа",
    filterGenderLabel: "Пол соискателя",
    filterGenderAll: "Все",
    filterGenderMale: "Мужчина",
    filterGenderFemale: "Женщина",
    filterJobTypeLabel: "Тип работы",
    filterJobTypeAll: "Все",
    filterJobTypePermanent: "Постоянная",
    filterJobTypeProject: "Проектная",
    filterPaymentPeriodLabel: "Период оплаты",
    filterPaymentPeriodPlaceholder: "Любой период",
    tagPrefixJobType: "Тип: ",
    tagPrefixPaymentPeriod: "Оплата: ",
    btnApply: "Применить",
    btnReset: "Сбросить",
    selectedCount: "Выбрано: ",
    excludeModePlaceholder: "Какие вакансии скрыть",
    multiSelectPlaceholder: "Выбрать несколько",
    nothingFound: "Ничего не найдено",

    // ── Details modal ─────────────────────────────────────────────────────
    detailsOnPlace: "На месте",
    detailsPublished: "Опубликовано",
    detailsCriteria: "Требуемый пол",
    detailsCriteriaAge: "Возраст",
    detailsCriteriaYears: "лет",
    detailsCriteriaYearsTo: "до",
    btnContactWa: "Связаться по WhatsApp",

    // ── Vacancy card dynamic labels ───────────────────────────────────────
    today: "Сегодня",
    yesterday: "Вчера",
    negotiablePrice: "Договорная",
    remoteJob: "Удаленно",
    cardBadgeAge: "Возраст",
    cardBadgeAgeUnit: "лет",
    cardBadgeGender: "Пол",
    cardRemoteWorkLabel: "Удаленная работа",

    // ── Filter tag prefixes ───────────────────────────────────────────────
    tagPrefixExclude: "Скрыть: ",
    tagPrefixAge: "Возраст: ",

    // ── Dark mode ─────────────────────────────────────────────────────────
    darkModeToggleTitle: "Переключить тему",

    // ── Empty feed ────────────────────────────────────────────────────────
    emptyFeedTitle: "Вакансии не найдены",
    emptyFeedDesc: "Попробуйте изменить или сбросить настройки фильтра.",

    // ── Toast notifications ───────────────────────────────────────────────
    toastSessionRefresh: "Обновление сессии...",
    toastLoginSuccess: "Вы успешно вошли в систему!",
    toastLogoutSuccess: "Вы вышли из системы.",
    toastJobDeleted: "Вакансия удалена.",
    toastFiltersReset: "Фильтры сброшены.",
    toastFormErrors: "В форме допущены ошибки!",
    toastOffline: "Соединение с интернетом отсутствует! Действие невозможно.",
    toastJobUpdated: "Объявление успешно обновлено!",
    toastJobCreated: "Вакансия успешно опубликована!",
    toastConnectionRestored: "Соединение с интернетом восстановлено!",
    toastConnectionLost: "Соединение с интернетом потеряно!",
    toastPhoneError: "Некорректный номер телефона! Открыть WhatsApp невозможно.",
    toastWhatsAppContextLost: "Соединение потеряно! Открыть WhatsApp невозможно.",
    toastDeleteConfirm: "Вы действительно хотите удалить это объявление? Это действие нельзя отменить.",
    toastCancelConfirm: "Введенные данные не будут сохранены. Вы действительно хотите отменить?",
    toastRollbackFav: "Не удалось синхронизировать список избранного с сервером.",
    toastAuthServerConnectError: "Ошибка подключения к серверу авторизации.",
    toastServerUnavailable: "Сервер недоступен. Попробуйте позже.",
    toastDbError: "Ошибка подключения к БД. Загружены локальные данные.",
    toastPublishError: "Ошибка при публикации на сервере.",
    toastDeleteError: "Не удалось удалить вакансию. Попробуйте снова.",
    toastGoogleAuthError: "Ошибка входа через Google: ",
    toastConfigError: "Ошибка подключения к серверу. Пожалуйста, перезагрузите страницу.",
  })
});
