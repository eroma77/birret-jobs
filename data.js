// Список базовых профессий (на русском и казахском)
window.PROFESSIONS_RU = [
  "Программист",
  "Дизайнер",
  "Официант",
  "Шофер",
  "Водитель",
  "Повар",
  "Грузчик",
  "Охранник",
  "Учитель",
  "Продавец",
  "Парикмахер",
  "Курьер",
  "Уборщик",
  "Строитель",
  "Сантехник",
  "Электрик",
  "Копирайтер",
  "Переводчик",
  "Фотограф"
];

window.PROFESSIONS_KZ = [
  "Бағдарламашы",
  "Дизайнер",
  "Официант",
  "Шофер",
  "Жүргізуші",
  "Аспаз",
  "Грузчик",
  "Күзетші",
  "Мұғалім",
  "Сатушы",
  "Шаштараз",
  "Курьер",
  "Тазалықшы",
  "Құрылысшы",
  "Сантехник",
  "Электрик",
  "Копирайтер",
  "Аудармашы",
  "Фотограф"
];

// Список основных городов Казахстана
window.CITIES_RU = [
  "Актау",
  "Актобе",
  "Алматы",
  "Астана",
  "Атырау",
  "Кокшетау",
  "Караганда",
  "Костанай",
  "Кызылорда",
  "Павлодар",
  "Петропавловск",
  "Семей",
  "Талдыкорган",
  "Тараз",
  "Уральск",
  "Усть-Каменогорск",
  "Шымкент"
];

window.CITIES_KZ = [
  "Ақтау",
  "Ақтөбе",
  "Алматы",
  "Астана",
  "Атырау",
  "Көкшетау",
  "Қарағанды",
  "Қостанай",
  "Қызылорда",
  "Павлодар",
  "Петропавл",
  "Семей",
  "Талдықорған",
  "Тараз",
  "Орал",
  "Өскемен",
  "Шымкент"
];

// Fallback legacy variables to prevent crashes
window.PROFESSIONS = window.PROFESSIONS_RU;
window.CITIES = window.CITIES_RU;

// Функция получения исходных демонстрационных вакансий (в зависимости от языка)
const getPastDateString = (daysOffset, hoursOffset = 0, minsOffset = 0) => {
  const d = new Date(Date.now() - (daysOffset * 24 * 60 * 60 * 1000) - (hoursOffset * 60 * 60 * 1000) - (minsOffset * 60 * 1000));
  return d.toISOString();
};

window.INITIAL_JOBS_RU = [
  {
    id: "mock-1",
    profession: "Программист",
    gender: "Неважно",
    ageFrom: 20,
    ageTo: 35,
    description: "Нужен толковый программист для разработки лэндинг сайта. Требуется хорошее знание HTML, CSS и JS. Работа несложная и срочная.",
    city: "Алматы",
    address: "Мкр. Жетысу-2, дом 45, кв 123",
    isRemote: false,
    payment: 150000,
    isNegotiable: false,
    phone: "7771234567",
    createdAt: getPastDateString(0, 1, 30),
    authorId: "google-mock-employer-1"
  },
  {
    id: "mock-2",
    profession: "Дизайнер",
    gender: "Женский",
    ageFrom: 18,
    ageTo: 30,
    description: "Требуется специалист для оформления и дизайна Инстаграм страницы. Необходимо разработать как минимум 5-6 постов и сторис.",
    city: "Астана",
    address: "",
    isRemote: true,
    payment: 50000,
    isNegotiable: false,
    phone: "7078889900",
    createdAt: getPastDateString(0, 5, 0),
    authorId: "google-mock-employer-2"
  }
];

window.INITIAL_JOBS_KZ = [
  {
    id: "mock-1",
    profession: "Бағдарламашы",
    gender: "Маңызды емес",
    ageFrom: 20,
    ageTo: 35,
    description: "Лэндинг сайт жасайтын білікті бағдарламашы керек. HTML, CSS және JS жақсы білуі тиіс. Жұмыс жеңіл және тез арада істелуі керек.",
    city: "Алматы",
    address: "Мкр. Жетысу-2, дом 45, кв 123",
    isRemote: false,
    payment: 150000,
    isNegotiable: false,
    phone: "7771234567",
    createdAt: getPastDateString(0, 1, 30),
    authorId: "google-mock-employer-1"
  },
  {
    id: "mock-2",
    profession: "Дизайнер",
    gender: "Әйел",
    ageFrom: 18,
    ageTo: 30,
    description: "Инстаграм парақшасының дизайнын жасап безендіретін маман қажет. Кем дегенде 5-6 пост пен пост дизайны қажет.",
    city: "Астана",
    address: "",
    isRemote: true,
    payment: 50000,
    isNegotiable: false,
    phone: "7078889900",
    createdAt: getPastDateString(0, 5, 0),
    authorId: "google-mock-employer-2"
  }
];
