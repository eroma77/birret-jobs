// Master static arrays for professions and cities
// Encapsulated and immutable to prevent window pollution or mutability bugs

// Mapping of legacy/corrupted IDs to their new clean IDs for 100% backward compatibility
const LEGACY_ID_MAP = Object.freeze({
  "tehnolog_pischevogo_proi_vodstva": "tehnolog_pischevogo_proizvodstva",
  "administrator_maga_ina": "administrator_magazina",
  "supervai_er": "supervaizer",
  "merchandai_er": "merchandayzer",
  "menedzher_po_ra_vitiyu_bi_nesa": "menedzher_po_razvitiyu_biznesa",
  "vi_azhist": "vizazhist",
  "gru_chik": "gruzchik",
  "kal_yanschik": "kalyanschik",
  "somel_e": "somelye",
  "shokolat_e": "shokolatye",
  "prodavets_konsul_tant": "prodavets_konsultant",
  "direktor_maga_ina": "direktor_magazina",
  "spetsialist_po_akupkam": "spetsialist_po_zakupkam",
  "regional_nyi_menedzher": "regionalnyi_menedzher",
  "menedzher_po_li_ingu": "menedzher_po_lizingu",
  "kur_er": "kuryer",
  "kur_er_1": "kuryer_na_avto",
  "velokur_er": "velokuryer",
  "kur_er_na_samokate": "kuryer_na_samokate",
  "voditel_pogru_chika": "voditel_pogruzchika",
  "dal_noboischik": "dalnoboischik",
  "dispetcher_gru_operevo_ok": "dispetcher_gruzoperevozok",
  "sborschik_aka_ov": "sborschik_zakazov",
  "graficheskii_di_ainer": "graficheskii_dizainer",
  "frontend_ra_rabotchik": "frontend_razrabotchik",
  "backend_ra_rabotchik": "backend_razrabotchik",
  "fullstack_ra_rabotchik": "fullstack_razrabotchik",
  "mobil_nyi_ra_rabotchik": "mobilnyi_razrabotchik",
  "spetsialist_po_kiberbe_opasnosti": "spetsialist_po_kiberbezopasnosti",
  "ux_ui_di_ainer": "ux_ui_dizainer",
  "moushn_di_ainer": "moushn_dizainer",
  "geimdi_ainer": "geimdizainer",
  "ra_rabotchik_igr": "razrabotchik_igr",
  "spetsialist_po_kadrovomu_deloproi_vodstvu": "spetsialist_po_kadrovomu_deloproizvodstvu",
  "deloproi_voditel": "deloproizvoditel",
  "instruktor_po_ioge": "instruktor_po_yoge",
  "laborant_himicheskogo_anali_a": "laborant_himicheskogo_analiza",
  "o_elenitel": "ozelenitel",
  "di_ainer_inter_erov": "dizainer_interyerov",
  "fre_erovschik": "frezerovschik",
  "ga_osvarschik": "gazosvarschik",
  "i_olirovschik": "izolirovschik",
  "tara": "taraz",
  "ekibastu": "ekibastuz",
  "zhe_ka_gan": "zhezkazgan",
  "ky_ylorda": "kyzylorda",
  "zhanao_en": "zhanaozen",
  "ural_sk": "uralsk"
});

const PROFESSIONS = Object.freeze([
  Object.freeze({ id: "driver", ru: "Водитель", kk: "Жүргізуші" }),
  Object.freeze({ id: "manager", ru: "Менеджер", kk: "Менеджер" }),
  Object.freeze({ id: "assistant", ru: "Ассистент", kk: "Ассистент" }),
  Object.freeze({ id: "administrator", ru: "Администратор", kk: "Әкімші" }),
  Object.freeze({ id: "marketolog", ru: "Маркетолог", kk: "Маркетолог" }),
  Object.freeze({ id: "gornichnaya", ru: "Горничная", kk: "Бөлме қызметкері" }),
  Object.freeze({ id: "videomontazher", ru: "Видеомонтажер", kk: "Видеомонтажер" }),
  Object.freeze({ id: "model", ru: "Модель", kk: "Модель" }),
  Object.freeze({ id: "konditer", ru: "Кондитер", kk: "Кондитер" }),
  Object.freeze({ id: "prepodavatel", ru: "Преподаватель", kk: "Оқытушы" }),
  Object.freeze({ id: "parkingist", ru: "Паркингист", kk: "Тұрақ қызметкері" }),
  Object.freeze({ id: "ranner", ru: "Раннер", kk: "Көмекші даяшы" }),
  Object.freeze({ id: "bufetchik", ru: "Буфетчик", kk: "Буфетші" }),
  Object.freeze({ id: "brovist", ru: "Бровист", kk: "Қас шебері" }),
  Object.freeze({ id: "pekar", ru: "Пекарь", kk: "Наубайшы" }),
  Object.freeze({ id: "barista", ru: "Бариста", kk: "Бариста" }),
  Object.freeze({ id: "ofitsiant", ru: "Официант", kk: "Даяшы" }),
  Object.freeze({ id: "barmen", ru: "Бармен", kk: "Бармен" }),
  Object.freeze({ id: "povar", ru: "Повар", kk: "Аспаз" }),
  Object.freeze({ id: "shef_povar", ru: "Шеф-повар", kk: "Шеф-аспаз" }),
  Object.freeze({ id: "su_shef", ru: "Су-шеф", kk: "Су-шеф" }),
  Object.freeze({ id: "sushist", ru: "Сушист", kk: "Сушист" }),
  Object.freeze({ id: "pitstsmeiker", ru: "Пиццмейкер", kk: "Пиццмейкер" }),
  Object.freeze({ id: "povar_na_mangal", ru: "Повар на мангал (Шашлычник)", kk: "Мангал аспазы" }),
  Object.freeze({ id: "donerschik", ru: "Донерщик", kk: "Дөнерші" }),
  Object.freeze({ id: "povar_holodnogo_tseha", ru: "Повар холодного цеха", kk: "Суық цех аспазы" }),
  Object.freeze({ id: "povar_goryachego_tseha", ru: "Повар горячего цеха", kk: "Ыстық цех аспазы" }),
  Object.freeze({ id: "shef_konditer", ru: "Шеф-кондитер", kk: "Шеф-кондитер" }),
  Object.freeze({ id: "posudomoischik", ru: "Посудомойщик", kk: "Ыдыс жуушы" }),
  Object.freeze({ id: "kuhonnyi_rabochii", ru: "Кухонный рабочий", kk: "Асүй жұмысшысы" }),
  Object.freeze({ id: "hostes", ru: "Хостес", kk: "Хостес" }),
  Object.freeze({ id: "kalyanschik", ru: "Кальянщик", kk: "Қорқоршы" }),
  Object.freeze({ id: "somelye", ru: "Сомелье", kk: "Сомелье" }),
  Object.freeze({ id: "administrator_restorana", ru: "Администратор ресторана", kk: "Мейрамхана әкімшісі" }),
  Object.freeze({ id: "metrdotel", ru: "Метрдотель", kk: "Метрдотель" }),
  Object.freeze({ id: "zagotovschik_produktov", ru: "Заготовщик продуктов", kk: "Өнім дайындаушы" }),
  Object.freeze({ id: "tehnolog_pischevogo_proizvodstva", ru: "Технолог пищевого производства", kk: "Тамақ өндірісінің технологы" }),
  Object.freeze({ id: "obvalschik_myasa", ru: "Обвальщик мяса", kk: "Ет бөлшектеуші" }),
  Object.freeze({ id: "myasnik", ru: "Мясник", kk: "Қасапшы" }),
  Object.freeze({ id: "shokolatye", ru: "Шоколатье", kk: "Шоколатье" }),
  Object.freeze({ id: "barbekyu_master", ru: "Барбекю-мастер", kk: "Барбекю шебері" }),
  Object.freeze({ id: "keiterer", ru: "Кейтерер", kk: "Кейтерер" }),
  Object.freeze({ id: "banketnyi_menedzher", ru: "Банкетный менеджер", kk: "Банкет менеджері" }),
  Object.freeze({ id: "kotlomoischik", ru: "Котломойщик", kk: "Қазан жуушы" }),
  Object.freeze({ id: "prodavets_konsultant", ru: "Продавец-консультант", kk: "Сатушы-консультант" }),
  Object.freeze({ id: "kassir", ru: "Кассир", kk: "Кассир" }),
  Object.freeze({ id: "kassir_torgovogo_zala", ru: "Кассир торгового зала", kk: "Сауда залының кассирі" }),
  Object.freeze({ id: "menedzher_po_prodazham", ru: "Менеджер по продажам", kk: "Сату менеджері" }),
  Object.freeze({ id: "torgovyi_predstavitel", ru: "Торговый представитель", kk: "Сауда өкілі" }),
  Object.freeze({ id: "merchandayzer", ru: "Мерчандайзер", kk: "Мерчандайзер" }),
  Object.freeze({ id: "florist", ru: "Флорист", kk: "Гүлші" }),
  Object.freeze({ id: "administrator_magazina", ru: "Администратор магазина", kk: "Дүкен әкімшісі" }),
  Object.freeze({ id: "supervaizer", ru: "Супервайзер", kk: "Супервайзер" }),
  Object.freeze({ id: "kategoriinyi_menedzher", ru: "Категорийный менеджер", kk: "Санат менеджері" }),
  Object.freeze({ id: "direktor_magazina", ru: "Директор магазина", kk: "Дүкен директоры" }),
  Object.freeze({ id: "spetsialist_po_zakupkam", ru: "Специалист по закупкам", kk: "Сатып алу жөніндегі маман" }),
  Object.freeze({ id: "torgovyi_broker", ru: "Торговый брокер", kk: "Сауда брокері" }),
  Object.freeze({ id: "prodavets_na_rynke", ru: "Продавец на рынке", kk: "Базар сатушысы" }),
  Object.freeze({ id: "menedzher_po_rabote_s_klientami", ru: "Менеджер по работе с клиентами", kk: "Клиенттермен жұмыс жөніндегі менеджер" }),
  Object.freeze({ id: "telemarketolog", ru: "Телемаркетолог", kk: "Телемаркетолог" }),
  Object.freeze({ id: "spetsialist_po_marketpleisam", ru: "Специалист по маркетплейсам", kk: "Маркетплейс маманы" }),
  Object.freeze({ id: "bayer", ru: "Байер", kk: "Байер" }),
  Object.freeze({ id: "prodavets_avtozapchastei", ru: "Продавец автозапчастей", kk: "Автобөлшектер сатушысы" }),
  Object.freeze({ id: "konsultant_po_kosmetike", ru: "Консультант по косметике", kk: "Косметика жөніндегі кеңесші" }),
  Object.freeze({ id: "prodavets_odezhdy", ru: "Продавец одежды", kk: "Киім сатушысы" }),
  Object.freeze({ id: "prodavets_yuvelirnyh_izdelii", ru: "Продавец ювелирных изделий", kk: "Зергерлік бұйымдар сатушысы" }),
  Object.freeze({ id: "menedzher_po_optovym_prodazham", ru: "Менеджер по оптовым продажам", kk: "Көтерме сауда менеджері" }),
  Object.freeze({ id: "torgovyi_agent", ru: "Торговый агент", kk: "Сауда агенті" }),
  Object.freeze({ id: "regionalnyi_menedzher", ru: "Региональный менеджер", kk: "Аймақтық менеджер" }),
  Object.freeze({ id: "promouter", ru: "Промоутер", kk: "Промоутер" }),
  Object.freeze({ id: "menedzher_po_razvitiyu_biznesa", ru: "Менеджер по развитию бизнеса", kk: "Бизнесті дамыту жөніндегі менеджер" }),
  Object.freeze({ id: "klyuchevoi_menedzher", ru: "Ключевой менеджер (KAM)", kk: "Негізгі клиенттермен жұмыс менеджері (KAM)" }),
  Object.freeze({ id: "prodavets_oformitel", ru: "Продавец-оформитель", kk: "Сатушы-оформитель" }),
  Object.freeze({ id: "menedzher_internet_magazina", ru: "Менеджер интернет-магазина", kk: "Интернет-дүкен менеджері" }),
  Object.freeze({ id: "tainyi_pokupatel", ru: "Тайный покупатель", kk: "Құпия сатып алушы" }),
  Object.freeze({ id: "otsenschik_v_lombard", ru: "Оценщик в ломбард", kk: "Ломбард бағалаушысы" }),
  Object.freeze({ id: "rieltor", ru: "Риелтор", kk: "Жылжымайтын мүлік агенті" }),
  Object.freeze({ id: "broker_po_nedvizhimosti", ru: "Брокер по недвижимости", kk: "Жылжымайтын мүлік брокері" }),
  Object.freeze({ id: "agent_po_arende", ru: "Агент по аренде", kk: "Жалдау жөніндегі агент" }),
  Object.freeze({ id: "menedzher_po_lizingu", ru: "Менеджер по лизингу", kk: "Лизинг менеджері" }),
  Object.freeze({ id: "strahovoi_agent", ru: "Страховой агент", kk: "Сақтандыру агенті" }),
  Object.freeze({ id: "kreditnyi_ekspert", ru: "Кредитный эксперт", kk: "Несие сарапшысы" }),
  Object.freeze({ id: "menedzher_po_prodazham_uslug", ru: "Менеджер по продажам услуг", kk: "Қызмет көрсетуді сату менеджері" }),
  Object.freeze({ id: "supervaizer_torgovyh_predstavitelei", ru: "Супервайзер торговых представителей", kk: "Сауда өкілдерінің супервайзері" }),
  Object.freeze({ id: "parikmaher", ru: "Парикмахер", kk: "Шаштараз" }),
  Object.freeze({ id: "stilist", ru: "Стилист", kk: "Стилист" }),
  Object.freeze({ id: "master_manikyura", ru: "Мастер маникюра", kk: "Маникюр шебері" }),
  Object.freeze({ id: "leshmeiker", ru: "Лэшмейкер", kk: "Кірпік өсіру шебері" }),
  Object.freeze({ id: "kosmetolog", ru: "Косметолог", kk: "Косметолог" }),
  Object.freeze({ id: "massazhist", ru: "Массажист", kk: "Уқалаушы" }),
  Object.freeze({ id: "administrator_salona_krasoty", ru: "Администратор салона красоты", kk: "Сұлулық салонының әкімшісі" }),
  Object.freeze({ id: "administrator_otelya", ru: "Администратор отеля", kk: "Қонақ үй әкімшісі" }),
  Object.freeze({ id: "kliner", ru: "Клинер / Уборщик", kk: "Клинер / Тазалықшы" }),
  Object.freeze({ id: "prachka", ru: "Прачка", kk: "Кір жуушы" }),
  Object.freeze({ id: "gladilschik", ru: "Гладильщик", kk: "Үтіктеуші" }),
  Object.freeze({ id: "ohrannik", ru: "Охранник", kk: "Күзетші" }),
  Object.freeze({ id: "master_pedikyura", ru: "Мастер педикюра", kk: "Педикюр шебері" }),
  Object.freeze({ id: "barber", ru: "Барбер", kk: "Ерлер шаштаразы" }),
  Object.freeze({ id: "vizazhist", ru: "Визажист", kk: "Бет әрлеуші" }),
  Object.freeze({ id: "tatu_master", ru: "Тату-мастер", kk: "Тату шебері" }),
  Object.freeze({ id: "master_pirsinga", ru: "Мастер пирсинга", kk: "Пирсинг шебері" }),
  Object.freeze({ id: "operator_raspechatki", ru: "Оператор печати", kk: "Көшірме жасаушы" }),
  Object.freeze({ id: "garderobschik", ru: "Гардеробщик", kk: "Гардеробшы" }),
  Object.freeze({ id: "shveitsar", ru: "Швейцар", kk: "Швейцар" }),
  Object.freeze({ id: "portye", ru: "Портье", kk: "Портье" }),
  Object.freeze({ id: "skornyak", ru: "Скорняк", kk: "Теріші" }),
  Object.freeze({ id: "shveya", ru: "Швея", kk: "Тігінші" }),
  Object.freeze({ id: "portnoi", ru: "Портной", kk: "Тігінші" }),
  Object.freeze({ id: "zakroischik", ru: "Закройщик", kk: "Пішуші" }),
  Object.freeze({ id: "master_po_remontu_obuvi", ru: "Мастер по ремонту обуви", kk: "Аяқ киім жөндеу шебері" }),
  Object.freeze({ id: "master_po_izgotovleniyu_klyuchei", ru: "Мастер по изготовлению ключей", kk: "Кілт жасау шебері" }),
  Object.freeze({ id: "master_po_remontu_chasov", ru: "Мастер по ремонту часов", kk: "Сағат жөндеу шебері" }),
  Object.freeze({ id: "master_permanentnogo_makiyazha", ru: "Мастер перманентного макияжа", kk: "Перманентті макияж шебері" }),
  Object.freeze({ id: "master_epilyatsii", ru: "Мастер эпиляции", kk: "Эпиляция шебері" }),
  Object.freeze({ id: "podolog", ru: "Подолог", kk: "Подолог" }),
  Object.freeze({ id: "grimer", ru: "Гример", kk: "Гримдеуші" }),
  Object.freeze({ id: "stilist_po_volosam", ru: "Стилист по волосам", kk: "Шаш стилисі" }),
  Object.freeze({ id: "master_po_naraschivaniyu_volos", ru: "Мастер по наращиванию волос", kk: "Шаш өсіру шебері" }),
  Object.freeze({ id: "kolor_master", ru: "Колор-мастер", kk: "Колор-шебері" }),
  Object.freeze({ id: "guvernantka", ru: "Гувернантка", kk: "Тәрбиеші" }),
  Object.freeze({ id: "dvoretskii", ru: "Дворецкий", kk: "Үй басқарушы" }),
  Object.freeze({ id: "sadovnik", ru: "Садовник", kk: "Бағбан" }),
  Object.freeze({ id: "chistilschik_basseinov", ru: "Чистильщик бассейнов", kk: "Бассейн тазалаушы" }),
  Object.freeze({ id: "moischik_kovrov", ru: "Мойщик ковров", kk: "Кілем жуушы" }),
  Object.freeze({ id: "kuryer", ru: "Курьер (пеший)", kk: "Курьер (жаяу)" }),
  Object.freeze({ id: "kuryer_na_avto", ru: "Курьер (на авто)", kk: "Курьер (автокөлікпен)" }),
  Object.freeze({ id: "velokuryer", ru: "Велокурьер", kk: "Велокурьер" }),
  Object.freeze({ id: "kuryer_na_samokate", ru: "Курьер на самокате", kk: "Самокаты бар курьер" }),
  Object.freeze({ id: "voditel_taksi", ru: "Водитель такси", kk: "Такси жүргізушісі" }),
  Object.freeze({ id: "lichnyi_voditel", ru: "Личный водитель", kk: "Жеке жүргізуші" }),
  Object.freeze({ id: "voditel_pogruzchika", ru: "Водитель погрузчика", kk: "Тиегіш жүргізушісі" }),
  Object.freeze({ id: "kladovschik", ru: "Кладовщик", kk: "Қоймашы" }),
  Object.freeze({ id: "komplektovschik", ru: "Комплектовщик", kk: "Жинақтаушы" }),
  Object.freeze({ id: "gruzchik", ru: "Грузчик", kk: "Жүк тасушы" }),
  Object.freeze({ id: "ekspeditor", ru: "Экспедитор", kk: "Экспедитор" }),
  Object.freeze({ id: "avtomehanik", ru: "Автомеханик", kk: "Автомеханик" }),
  Object.freeze({ id: "avtoelektrik", ru: "Автоэлектрик", kk: "Автоэлектрик" }),
  Object.freeze({ id: "shinomontazhnik", ru: "Шиномонтажник", kk: "Шиномонтажшы" }),
  Object.freeze({ id: "moischik_avtomobilei", ru: "Мойщик автомобилей", kk: "Автокөлік жуушы" }),
  Object.freeze({ id: "deteiler", ru: "Детейлер", kk: "Детейлер" }),
  Object.freeze({ id: "kolorist_avtoemalei", ru: "Колорист автоэмалей", kk: "Автоэмаль колорисі" }),
  Object.freeze({ id: "zhestyanschik", ru: "Жестянщик / Рихтовщик", kk: "Қаңылтыршы" }),
  Object.freeze({ id: "avtomalyar", ru: "Автомаляр", kk: "Көлік бояушы" }),
  Object.freeze({ id: "voditel_avtobusa", ru: "Водитель автобуса", kk: "Автобус жүргізушісі" }),
  Object.freeze({ id: "voditel_trolleibusa", ru: "Водитель троллейбуса", kk: "Троллейбус жүргізушісі" }),
  Object.freeze({ id: "dalnoboischik", ru: "Дальнобойщик", kk: "Алыс жол жүргізушісі" }),
  Object.freeze({ id: "voditel_samosvala", ru: "Водитель самосвала", kk: "Аударғыш машина жүргізушісі" }),
  Object.freeze({ id: "traktorist", ru: "Тракторист", kk: "Тракторшы" }),
  Object.freeze({ id: "mashinist_ekskavatora", ru: "Машинист экскаватора", kk: "Экскаватор машинисі" }),
  Object.freeze({ id: "mashinist_krana", ru: "Машинист крана", kk: "Кран машинисі" }),
  Object.freeze({ id: "dispetcher_taksi", ru: "Диспетчер такси", kk: "Такси диспетчері" }),
  Object.freeze({ id: "logist", ru: "Логист", kk: "Логист" }),
  Object.freeze({ id: "menedzher_po_ved", ru: "Менеджер по ВЭД", kk: "СІӘ менеджері" }),
  Object.freeze({ id: "dispetcher_gruzoperevozok", ru: "Диспетчер грузоперевозок", kk: "Жүк тасымалы диспетчері" }),
  Object.freeze({ id: "priemschik_tovara", ru: "Приемщик товара", kk: "Тауар қабылдаушы" }),
  Object.freeze({ id: "sborschik_zakazov", ru: "Сборщик заказов", kk: "Тапсырыс жинаушы" }),
  Object.freeze({ id: "zaveduyuschii_skladom", ru: "Заведующий складом", kk: "Қойма меңгерушісі" }),
  Object.freeze({ id: "markirovschik", ru: "Маркировщик / Стикеровщик", kk: "Маркировкалаушы" }),
  Object.freeze({ id: "upakovschik", ru: "Упаковщик", kk: "Қаптаушы" }),
  Object.freeze({ id: "vesovschik", ru: "Весовщик", kk: "Таразышы" }),
  Object.freeze({ id: "bortprovodnik", ru: "Бортпроводник", kk: "Бортсерік" }),
  Object.freeze({ id: "pilot_grazhdanskoi_aviatsii", ru: "Пилот гражданской авиации", kk: "Азаматтық авиация ұшқышы" }),
  Object.freeze({ id: "kapitan_sudna", ru: "Капитан судна", kk: "Кеме капитаны" }),
  Object.freeze({ id: "mashinist_poezda", ru: "Машинист поезда", kk: "Поезд машинисі" }),
  Object.freeze({ id: "provodnik_vagona", ru: "Проводник вагона", kk: "Вагон жолсерігі" }),
  Object.freeze({ id: "konduktor", ru: "Кондуктор", kk: "Кондуктор" }),
  Object.freeze({ id: "avtoslesar", ru: "Автослесарь", kk: "Автослесарь" }),
  Object.freeze({ id: "master_po_remontu_kpp", ru: "Мастер по ремонту КПП", kk: "БЖҚ (КПП) жөндеу шебері" }),
  Object.freeze({ id: "spetsialist_po_tyuningu_avto", ru: "Специалист по тюнингу авто", kk: "Автотюнинг маманы" }),
  Object.freeze({ id: "smm_menedzher", ru: "SMM-менеджер", kk: "SMM менеджері" }),
  Object.freeze({ id: "targetolog", ru: "Таргетолог", kk: "Таргетолог" }),
  Object.freeze({ id: "graficheskii_dizainer", ru: "Графический дизайнер", kk: "Графикалық дизайнер" }),
  Object.freeze({ id: "mobilograf", ru: "Мобилограф", kk: "Мобилограф" }),
  Object.freeze({ id: "kopiraiter", ru: "Копирайтер", kk: "Копирайтер" }),
  Object.freeze({ id: "web_programmist", ru: "Web-программист", kk: "Веб-бағдарламашы" }),
  Object.freeze({ id: "qa_testirovschik", ru: "QA-тестировщик", kk: "QA-тестілеуші" }),
  Object.freeze({ id: "tehnicheskii_pisatel", ru: "Технический писатель", kk: "Техникалық жазушы" }),
  Object.freeze({ id: "frontend_razrabotchik", ru: "Frontend-разработчик", kk: "Frontend әзірлеуші" }),
  Object.freeze({ id: "backend_razrabotchik", ru: "Backend-разработчик", kk: "Backend әзірлеуші" }),
  Object.freeze({ id: "fullstack_razrabotchik", ru: "Fullstack-разработчик", kk: "Fullstack әзірлеуші" }),
  Object.freeze({ id: "mobilnyi_razrabotchik", ru: "Мобильный разработчик", kk: "Мобильді әзірлеуші" }),
  Object.freeze({ id: "devops_inzhener", ru: "DevOps-инженер", kk: "DevOps инженері" }),
  Object.freeze({ id: "sistemnyi_administrator", ru: "Системный администратор", kk: "Жүйелік әкімші" }),
  Object.freeze({ id: "setevoi_inzhener", ru: "Сетевой инженер", kk: "Желілік инженер" }),
  Object.freeze({ id: "spetsialist_po_kiberbezopasnosti", ru: "Специалист по кибербезопасности", kk: "Киберқауіпсіздік маманы" }),
  Object.freeze({ id: "analitik_dannyh", ru: "Аналитик данных (Data Analyst)", kk: "Деректер талдаушысы (Data Analyst)" }),
  Object.freeze({ id: "data_scientist", ru: "Data Scientist", kk: "Data Scientist" }),
  Object.freeze({ id: "ux_ui_dizainer", ru: "UX/UI дизайнер", kk: "UX/UI дизайнер" }),
  Object.freeze({ id: "3d_modeller", ru: "3D-моделлер", kk: "3D моделдеуші" }),
  Object.freeze({ id: "moushn_dizainer", ru: "Моушн-дизайнер", kk: "Моушн-дизайнер" }),
  Object.freeze({ id: "illyustrator", ru: "Иллюстратор", kk: "Иллюстратор" }),
  Object.freeze({ id: "geimdizainer", ru: "Геймдизайнер", kk: "Геймдизайнер" }),
  Object.freeze({ id: "razrabotchik_igr", ru: "Разработчик игр", kk: "Ойын әзірлеуші" }),
  Object.freeze({ id: "stsenarist", ru: "Сценарист", kk: "Сценарист" }),
  Object.freeze({ id: "kontent_meiker", ru: "Контент-мейкер", kk: "Контент жасаушы" }),
  Object.freeze({ id: "prodyuser", ru: "Продюсер", kk: "Продюсер" }),
  Object.freeze({ id: "fotograf", ru: "Фотограф", kk: "Фотограф" }),
  Object.freeze({ id: "retusher", ru: "Ретушер", kk: "Ретушер" }),
  Object.freeze({ id: "zvukorezhisser", ru: "Звукорежиссер", kk: "Дыбыс режиссері" }),
  Object.freeze({ id: "didzhei", ru: "Диджей (DJ)", kk: "Диджей (DJ)" }),
  Object.freeze({ id: "veduschii_meropriyatii", ru: "Ведущий мероприятий", kk: "Шара жүргізушісі" }),
  Object.freeze({ id: "animator", ru: "Аниматор", kk: "Аниматор" }),
  Object.freeze({ id: "bloger", ru: "Блогер / Стример", kk: "Блогер" }),
  Object.freeze({ id: "zhurnalist", ru: "Журналист", kk: "Журналист" }),
  Object.freeze({ id: "reporter", ru: "Репортер", kk: "Тілші" }),
  Object.freeze({ id: "redaktor_lenty_novostei", ru: "Редактор ленты новостей", kk: "Жаңалықтар таспасының редакторы" }),
  Object.freeze({ id: "seo_spetsialist", ru: "SEO-специалист", kk: "SEO маманы" }),
  Object.freeze({ id: "spetsialist_po_kontekstnoi_reklame", ru: "Специалист по контекстной рекламе", kk: "Контекстік жарнама маманы" }),
  Object.freeze({ id: "email_marketolog", ru: "Email-маркетолог", kk: "Email-маркетолог" }),
  Object.freeze({ id: "pr_menedzher", ru: "PR-менеджер", kk: "PR менеджері" }),
  Object.freeze({ id: "project_manager", ru: "Project-менеджер (Project Manager)", kk: "Project менеджері (Project Manager)" }),
  Object.freeze({ id: "product_manager", ru: "Product-менеджер (Product Manager)", kk: "Product менеджері (Product Manager)" }),
  Object.freeze({ id: "timlid", ru: "Тимлид (Team Lead)", kk: "Тимлид (Team Lead)" }),
  Object.freeze({ id: "spetsialist_tehnicheskoi_podderzhki", ru: "Специалист технической поддержки", kk: "Техникалық қолдау маманы" }),
  Object.freeze({ id: "elektrik", ru: "Электрик", kk: "Электрик" }),
  Object.freeze({ id: "santehnik", ru: "Сантехник", kk: "Сантехник" }),
  Object.freeze({ id: "raznorabochii", ru: "Разнорабочий", kk: "Қосалқы жұмысшы" }),
  Object.freeze({ id: "montazhnik", ru: "Монтажник", kk: "Монтаждаушы" }),
  Object.freeze({ id: "svarschik", ru: "Сварщик", kk: "Дәнекерлеуші" }),
  Object.freeze({ id: "malyar", ru: "Маляр", kk: "Сырлаушы" }),
  Object.freeze({ id: "shtukatur", ru: "Штукатур", kk: "Сылақшы" }),
  Object.freeze({ id: "plitochnik", ru: "Плитоchnik", kk: "Плитка қалаушы" }),
  Object.freeze({ id: "kamenschik", ru: "Каменщик", kk: "Тас қалаушы" }),
  Object.freeze({ id: "krovelschik", ru: "Кровельщик", kk: "Шатыр жабушы" }),
  Object.freeze({ id: "betonschik", ru: "Бетонщик", kk: "Бетоншы" }),
  Object.freeze({ id: "armaturschik", ru: "Арматурщик", kk: "Арматурашы" }),
  Object.freeze({ id: "plotnik", ru: "Плотник", kk: "Ағаш ұстасы" }),
  Object.freeze({ id: "stolyar", ru: "Столяр", kk: "Столяр" }),
  Object.freeze({ id: "sborschik_mebeli", ru: "Сборщик мебели", kk: "Жиһаз жинаушы" }),
  Object.freeze({ id: "stekolschik", ru: "Стекольщик", kk: "Шыны салушы" }),
  Object.freeze({ id: "gipsokartonschik", ru: "Гипсокартонщик", kk: "Гипсокартоншы" }),
  Object.freeze({ id: "fasadchik", ru: "Фасадчик", kk: "Фасадшы" }),
  Object.freeze({ id: "stropalschik", ru: "Стропальщик", kk: "Стропальшы" }),
  Object.freeze({ id: "geodezist", ru: "Геодезист", kk: "Геодезист" }),
  Object.freeze({ id: "prorab", ru: "Прораб / Мастер участка", kk: "Учаске шебері" }),
  Object.freeze({ id: "inzhener_stroitel", ru: "Инженер-строитель", kk: "Құрылыс инженері" }),
  Object.freeze({ id: "arhitektor", ru: "Архитектор", kk: "Сәулетші" }),
  Object.freeze({ id: "dizainer_interyerov", ru: "Дизайнер интерьеров", kk: "Интерьер дизайнері" }),
  Object.freeze({ id: "smetchik", ru: "Сметчик", kk: "Баға есептеуші" }),
  Object.freeze({ id: "tokar", ru: "Токарь", kk: "Токарь" }),
  Object.freeze({ id: "frezerovschik", ru: "Фрезеровщик", kk: "Фрезеровщик" }),
  Object.freeze({ id: "slesar_instrumentalschik", ru: "Слесарь-инструментальщик", kk: "Слесарь-аспапшы" }),
  Object.freeze({ id: "operator_stankov_chpu", ru: "Оператор станков ЧПУ", kk: "СББ станоктарының операторы" }),
  Object.freeze({ id: "naladchik_oborudovaniya", ru: "Наладчик оборудования", kk: "Жабдықтарды баптаушы" }),
  Object.freeze({ id: "kranovschik_bashennogo_krana", ru: "Крановщик башенного крана", kk: "Мұнаралы кран машинисі" }),
  Object.freeze({ id: "burilschik", ru: "Бурильщик", kk: "Бұрғылаушы" }),
  Object.freeze({ id: "montazhnik_okonnyh_sistem", ru: "Монтажник оконных систем", kk: "Терезе жүйелерін монтаждаушы" }),
  Object.freeze({ id: "montazhnik_konditsionerov", ru: "Монтажник кондиционеров", kk: "Кондиционер монтаждаушы" }),
  Object.freeze({ id: "spetsialist_po_ventilyatsii", ru: "Специалист по вентиляции", kk: "Желдету маманы" }),
  Object.freeze({ id: "elektromontazhnik", ru: "Электромонтажник", kk: "Электромонтаждаушы" }),
  Object.freeze({ id: "gazosvarschik", ru: "Газосварщик", kk: "Газбен дәнекерлеуші" }),
  Object.freeze({ id: "izolirovschik", ru: "Изолировщик", kk: "Оқшаулағыш" }),
  Object.freeze({ id: "peskostruischik", ru: "Пескоструйщик", kk: "Құммен өңдеуші" }),
  Object.freeze({ id: "oboischik_mebeli", ru: "Обойщик мебели", kk: "Жиһаз қаптаушы" }),
  Object.freeze({ id: "formovschik", ru: "Формовщик", kk: "Қалыптаушы" }),
  Object.freeze({ id: "liteischik", ru: "Литейщик", kk: "Құюшы" }),
  Object.freeze({ id: "master_po_remontu_bytovoi_tehniki", ru: "Мастер по ремонту бытовой техники", kk: "Тұрмыстық техниканы жөндеу шебері" }),
  Object.freeze({ id: "servisnyi_inzhener_po_kotlam", ru: "Сервисный инженер по котлам", kk: "Қазандықтар бойынша сервистік инженер" }),
  Object.freeze({ id: "slesar_vodoprovodchik", ru: "Слесарь-водопроводчик", kk: "Слесарь-суқұбыршысы" }),
  Object.freeze({ id: "operator_call_tsentra", ru: "Оператор call-центра", kk: "Call-орталық операторы" }),
  Object.freeze({ id: "ofis_menedzher", ru: "Офис-менеджер", kk: "Кеңсе менеджері" }),
  Object.freeze({ id: "buhgalter", ru: "Бухгалтер", kk: "Бухгалтер" }),
  Object.freeze({ id: "repetitor", ru: "Репетитор", kk: "Репетитор" }),
  Object.freeze({ id: "perevodchik", ru: "Переводчик", kk: "Аудармашы" }),
  Object.freeze({ id: "nyanya", ru: "Няня", kk: "Бала күтушісі" }),
  Object.freeze({ id: "sidelka", ru: "Сиделка", kk: "Күтуші" }),
  Object.freeze({ id: "sekretar", ru: "Секретарь / Ресепшионист", kk: "Хатшы" }),
  Object.freeze({ id: "pomoschnik_rukovoditelya", ru: "Помощник руководителя", kk: "Басшы көмекшісі" }),
  Object.freeze({ id: "hr_menedzher", ru: "HR-менеджер / Рекрутер", kk: "HR-менеджер" }),
  Object.freeze({ id: "spetsialist_po_kadrovomu_deloproizvodstvu", ru: "Специалист по кадровому делопроизводству", kk: "Кадрлық іс қағаздарын жүргізу маманы" }),
  Object.freeze({ id: "ekonomist", ru: "Экономист", kk: "Экономист" }),
  Object.freeze({ id: "finansovyi_analitik", ru: "Финансовый аналитик", kk: "Қаржылық талдаушы" }),
  Object.freeze({ id: "glavnyi_buhgalter", ru: "Главный бухгалтер", kk: "Бас бухгалтер" }),
  Object.freeze({ id: "bank_teller", ru: "Bank Teller (Кассир в банк)", kk: "Банк кассирі" }),
  Object.freeze({ id: "yurist", ru: "Юрист", kk: "Заңгер" }),
  Object.freeze({ id: "yuriskonsult", ru: "Юрисконсульт", kk: "Заң кеңесшісі" }),
  Object.freeze({ id: "advokat", ru: "Адвокат", kk: "Адвокат" }),
  Object.freeze({ id: "notarius", ru: "Нотариус", kk: "Нотариус" }),
  Object.freeze({ id: "pomoschnik_yurista", ru: "Помощник юриста", kk: "Заңгер көмекшісі" }),
  Object.freeze({ id: "deloproizvoditel", ru: "Делопроизводитель", kk: "Іс қағаздарын жүргізуші" }),
  Object.freeze({ id: "arhivist", ru: "Архивист", kk: "Мұрағатшы" }),
  Object.freeze({ id: "tendernyi_spetsialist", ru: "Тендерный специалист (закупки)", kk: "Тендер маманы" }),
  Object.freeze({ id: "ofis_kliner", ru: "Офис-клинер", kk: "Кеңсе тазалаушысы" }),
  Object.freeze({ id: "tamozhennyi_broker", ru: "Таможенный брокер (декларант)", kk: "Кедендік брокер" }),
  Object.freeze({ id: "vrach_terapevt", ru: "Врач-терапевт", kk: "Терапевт дәрігер" }),
  Object.freeze({ id: "vrach_stomatolog", ru: "Врач-стоматолог", kk: "Стоматолог дәрігер" }),
  Object.freeze({ id: "medsestra", ru: "Медсестра / Медбрат", kk: "Медбике" }),
  Object.freeze({ id: "farmatsevt", ru: "Фармацевт / Провизор", kk: "Фармацевт" }),
  Object.freeze({ id: "veterinar", ru: "Ветеринар", kk: "Ветеринар" }),
  Object.freeze({ id: "assistent_veterinara", ru: "Ассистент ветеринара", kk: "Ветеринар ассистенті" }),
  Object.freeze({ id: "fitnes_trener", ru: "Фитнес-тренер", kk: "Фитнес жаттықтырушысы" }),
  Object.freeze({ id: "instruktor_po_yoge", ru: "Инструктор по йоге", kk: "Йога нұсқаушысы" }),
  Object.freeze({ id: "sportivnyi_sudya", ru: "Спортивный судья", kk: "Спорт төрешісі" }),
  Object.freeze({ id: "dietolog", ru: "Диетолог", kk: "Диетолог" }),
  Object.freeze({ id: "psiholog", ru: "Психолог", kk: "Психолог" }),
  Object.freeze({ id: "psihoterapevt", ru: "Психотерапевт", kk: "Психотерапевт" }),
  Object.freeze({ id: "kouch", ru: "Коуч / Ментор", kk: "Коуч" }),
  Object.freeze({ id: "grumer", ru: "Грумер", kk: "Жануарлар шаштаразы" }),
  Object.freeze({ id: "kinolog", ru: "Кинолог", kk: "Кинолог" }),
  Object.freeze({ id: "laborant_himicheskogo_analiza", ru: "Лаборант химического анализа", kk: "Химиялық талдау лаборанты" }),
  Object.freeze({ id: "agronom", ru: "Агроном", kk: "Агроном" }),
  Object.freeze({ id: "ozelenitel", ru: "Озеленитель", kk: "Көгалдандырушы" }),
  Object.freeze({ id: "lifter", ru: "Лифтер / Оператор лифтов", kk: "Лифтші" }),
  Object.freeze({ id: "dressirovschik_zhivotnyh", ru: "Дрессировщик животных", kk: "Жануарларды үйретуші" })
]);

const CITIES = Object.freeze([
  Object.freeze({ id: "aktau", ru: "Актау", kk: "Ақтау" }),
  Object.freeze({ id: "aktobe", ru: "Актобе", kk: "Ақтөбе" }),
  Object.freeze({ id: "almaty", ru: "Алматы", kk: "Алматы" }),
  Object.freeze({ id: "astana", ru: "Астана", kk: "Астана" }),
  Object.freeze({ id: "atyrau", ru: "Атырау", kk: "Атырау" }),
  Object.freeze({ id: "balhash", ru: "Балхаш", kk: "Балқаш" }),
  Object.freeze({ id: "zhanaozen", ru: "Жанаозен", kk: "Жаңаөзен" }),
  Object.freeze({ id: "zhezkazgan", ru: "Жезказган", kk: "Жезқазған" }),
  Object.freeze({ id: "kokshetau", ru: "Кокшетау", kk: "Көкшетау" }),
  Object.freeze({ id: "konaev", ru: "Конаев", kk: "Қонаев" }),
  Object.freeze({ id: "kostanai", ru: "Костанай", kk: "Қостанай" }),
  Object.freeze({ id: "kyzylorda", ru: "Кызылорда", kk: "Қызылорда" }),
  Object.freeze({ id: "pavlodar", ru: "Павлодар", kk: "Павлодар" }),
  Object.freeze({ id: "petropavlovsk", ru: "Петропавловск", kk: "Петропавл" }),
  Object.freeze({ id: "rudnyi", ru: "Рудный", kk: "Рудный" }),
  Object.freeze({ id: "semei", ru: "Семей", kk: "Семей" }),
  Object.freeze({ id: "stepnogorsk", ru: "Степногорск", kk: "Степногорск" }),
  Object.freeze({ id: "taldykorgan", ru: "Талдыкорган", kk: "Талдықорған" }),
  Object.freeze({ id: "taraz", ru: "Тараз", kk: "Тараз" }),
  Object.freeze({ id: "temirtau", ru: "Темиртау", kk: "Теміртау" }),
  Object.freeze({ id: "turkestan", ru: "Туркестан", kk: "Түркістан" }),
  Object.freeze({ id: "uralsk", ru: "Уральск", kk: "Орал" }),
  Object.freeze({ id: "ust_kamenogorsk", ru: "Усть-Каменогорск", kk: "Өскемен" }),
  Object.freeze({ id: "shymkent", ru: "Шымкент", kk: "Шымкент" }),
  Object.freeze({ id: "ekibastuz", ru: "Экибастуз", kk: "Екібастұз" })
]);

// Build static O(1) maps for fast lookup
const PROFESSIONS_BY_ID = new Map(PROFESSIONS.map(p => [p.id, p]));
const CITIES_BY_ID = new Map(CITIES.map(c => [c.id, c]));

const PROFESSIONS_BY_NAME = new Map();
PROFESSIONS.forEach(p => {
  PROFESSIONS_BY_NAME.set(p.ru.toLowerCase(), p);
  PROFESSIONS_BY_NAME.set(p.kk.toLowerCase(), p);
});

const CITIES_BY_NAME = new Map();
CITIES.forEach(c => {
  CITIES_BY_NAME.set(c.ru.toLowerCase(), c);
  CITIES_BY_NAME.set(c.kk.toLowerCase(), c);
});

// Helper lookup functions
function translateProfession(id, lang) {
  if (!id) return "";
  const cleanId = String(id).trim();
  
  // 1. Direct ID match
  let prof = PROFESSIONS_BY_ID.get(cleanId);
  if (prof) return lang === "kk" ? prof.kk : prof.ru;
  
  // 2. Legacy ID mapping
  const mappedId = LEGACY_ID_MAP[cleanId];
  if (mappedId) {
    prof = PROFESSIONS_BY_ID.get(mappedId);
    if (prof) return lang === "kk" ? prof.kk : prof.ru;
  }
  
  // 3. Name-based match (fallback for legacy text records in database)
  const nameKey = cleanId.toLowerCase();
  prof = PROFESSIONS_BY_NAME.get(nameKey);
  if (prof) return lang === "kk" ? prof.kk : prof.ru;
  
  return id;
}

function translateCity(id, lang) {
  if (!id) return "";
  const cleanId = String(id).trim();
  
  // 1. Direct ID match
  let city = CITIES_BY_ID.get(cleanId);
  if (city) return lang === "kk" ? city.kk : city.ru;
  
  // 2. Legacy ID mapping
  const mappedId = LEGACY_ID_MAP[cleanId];
  if (mappedId) {
    city = CITIES_BY_ID.get(mappedId);
    if (city) return lang === "kk" ? city.kk : city.ru;
  }
  
  // 3. Name-based match (fallback for legacy text records in database)
  const nameKey = cleanId.toLowerCase();
  city = CITIES_BY_NAME.get(nameKey);
  if (city) return lang === "kk" ? city.kk : city.ru;
  
  return id;
}

function translateGender(gender, lang) {
  const isKk = lang === "kk";
  const normalized = String(gender).toLowerCase().trim();
  
  if (normalized === "male" || normalized === "мужской" || normalized === "ер") {
    return isKk ? "Ер" : "Мужской";
  }
  if (normalized === "female" || normalized === "женский" || normalized === "әйел") {
    return isKk ? "Әйел" : "Женский";
  }
  return isKk ? "Маңызды емес" : "Неважно";
}

// Memory caching for lists to avoid Garbage Collection (GC) churn
let professionsListRu = null;
let professionsListKk = null;
let citiesListRu = null;
let citiesListKk = null;

function getProfessionsList(lang) {
  if (lang === "kk") {
    if (!professionsListKk) {
      professionsListKk = Object.freeze(PROFESSIONS.map(p => Object.freeze({ id: p.id, name: p.kk })));
    }
    return professionsListKk;
  } else {
    if (!professionsListRu) {
      professionsListRu = Object.freeze(PROFESSIONS.map(p => Object.freeze({ id: p.id, name: p.ru })));
    }
    return professionsListRu;
  }
}

function getCitiesList(lang) {
  if (lang === "kk") {
    if (!citiesListKk) {
      citiesListKk = Object.freeze(CITIES.map(c => Object.freeze({ id: c.id, name: c.kk })));
    }
    return citiesListKk;
  } else {
    if (!citiesListRu) {
      citiesListRu = Object.freeze(CITIES.map(c => Object.freeze({ id: c.id, name: c.ru })));
    }
    return citiesListRu;
  }
}

// Timezone-anchored date generator for initial mock vacancies (UTC+5 local timezone)
const getPastDateString = (daysOffset, hoursOffset = 0, minsOffset = 0) => {
  const now = new Date();
  // Get current timestamp in UTC (timezone offset in minutes * 60000 ms)
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  // Shift to UTC+5 (Kazakhstan time)
  const kzTime = new Date(utcTime + (5 * 60 * 60 * 1000));
  
  // Subtract offsets in Kazakhstan local context
  kzTime.setDate(kzTime.getDate() - daysOffset);
  kzTime.setHours(kzTime.getHours() - hoursOffset);
  kzTime.setMinutes(kzTime.getMinutes() - minsOffset);
  
  // Convert back to absolute UTC time representation
  const resolvedUtcTime = kzTime.getTime() - (5 * 60 * 60 * 1000);
  return new Date(resolvedUtcTime).toISOString();
};

// Initial Mock Vacancies with unique IDs and language-neutral parameters
const INITIAL_JOBS = Object.freeze([
  Object.freeze({
    id: "mock-job-ru-1",
    profession: "web_programmist",
    gender: "any",
    ageFrom: 20,
    ageTo: 35,
    description: "Нужен программист для разработки лэндинг-страницы. Требуется хорошее знание HTML, CSS и JS. Работа срочная.",
    city: "almaty",
    address: "Мкр. Жетысу-2, дом 45",
    isRemote: false,
    payment: 150000,
    isNegotiable: false,
    phone: "7771234567",
    createdAt: getPastDateString(0, 1, 30),
    authorId: "google-mock-1"
  }),
  Object.freeze({
    id: "mock-job-ru-2",
    profession: "graficheskii_dizainer",
    gender: "any",
    ageFrom: 18,
    ageTo: 30,
    description: "Требуется дизайнер для оформления Instagram-страницы. Минимум 5–6 постов и Stories.",
    city: "astana",
    address: "",
    isRemote: true,
    payment: 50000,
    isNegotiable: false,
    phone: "7078889900",
    createdAt: getPastDateString(0, 5, 0),
    authorId: "google-mock-2"
  })
]);

// Exports list object
const exportsObject = {
  PROFESSIONS,
  CITIES,
  translateProfession,
  translateCity,
  translateGender,
  getProfessionsList,
  getCitiesList,
  INITIAL_JOBS
};

// Bind to window scope for browsers
if (typeof window !== "undefined") {
  Object.keys(exportsObject).forEach(key => {
    Object.defineProperty(window, key, {
      value: exportsObject[key],
      writable: false,
      configurable: false
    });
  });
  
  // Read-only getters for backwards compatibility
  Object.defineProperty(window, 'PROFESSIONS_RU', { get: () => PROFESSIONS.map(p => p.ru), configurable: false });
  Object.defineProperty(window, 'PROFESSIONS_KZ', { get: () => PROFESSIONS.map(p => p.kk), configurable: false });
  Object.defineProperty(window, 'CITIES_RU', { get: () => CITIES.map(c => c.ru), configurable: false });
  Object.defineProperty(window, 'CITIES_KZ', { get: () => CITIES.map(c => c.kk), configurable: false });
  Object.defineProperty(window, 'INITIAL_JOBS_RU', { get: () => INITIAL_JOBS, configurable: false });
  Object.defineProperty(window, 'INITIAL_JOBS_KZ', { get: () => INITIAL_JOBS, configurable: false });
}

// Bind to module exports for Node.js test suites
if (typeof module !== "undefined" && module.exports) {
  module.exports = exportsObject;
}
