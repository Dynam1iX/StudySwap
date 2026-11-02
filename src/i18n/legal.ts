import type { Language } from '@/i18n';

/**
 * Terms of Use and Privacy Policy (/terms, /privacy). Written from what the app really
 * does: when the app changes (new data, new service), change these texts and LEGAL_UPDATED.
 * English is the source; Russian and Kazakh follow the same sections.
 */

export const LEGAL_UPDATED = '2026-11-02';
export const LEGAL_CONTACT = '260668@astanait.edu.kz';

export interface LegalSection {
  /** Anchor for links, e.g. /privacy#ai */
  id?: string;
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export type LegalKind = 'terms' | 'privacy';

const en: Record<LegalKind, LegalDoc> = {
  terms: {
    title: 'Terms of Use',
    intro:
      'StudySwap is a free platform where students and teachers of Astana IT University swap explanations: "I need help with one subject, I can explain another". It is a student project of the StudySwap team (group SE-2625) made for the ICT course; it is not an official service of the university. By signing in you accept these terms.',
    sections: [
      {
        heading: '1. Who can use StudySwap',
        list: [
          'Anyone with an @astanait.edu.kz e-mail. A 6-digit e-mail is a student account, any other is a teacher account.',
          'One account per person. Keep access to your e-mail safe: whoever can read it can sign in as you.',
          'The details you enter when you complete your profile (name, program, year) must be true.',
        ],
      },
      {
        heading: '2. What cards may contain',
        paragraphs: ['Allowed: asking for an explanation, explaining a topic, practising together, checking each other\'s work, photos or PDFs of tasks you are stuck on. Not allowed:'],
        list: [
          'swearing, insults, harassment, hate, sexual or 18+ content, violence, drugs, weapons;',
          'money in any form: prices, paid tutoring, buying or selling, advertising, links to channels, shops or other services;',
          'academic dishonesty: doing someone\'s homework, project or thesis for them, taking a quiz, test or exam instead of them, leaked questions or answers, ready-made solutions to hand in, plagiarism;',
          'spam, meaningless text, content that has nothing to do with studying or with the chosen subject;',
          'other people\'s personal data, and files you have no right to share.',
        ],
      },
      {
        id: 'moderation',
        heading: '3. AI check and moderation',
        list: [
          'Before a card is published, and when its topics or files are changed, an AI service (Google Gemini) checks it against the rules above. If it finds a problem, the card is not saved and you see the reason.',
          'The AI can be wrong. If it cannot check a card (for example, it is unavailable), the card is hidden until an administrator looks at it.',
          'To keep the service working for everyone, one account can run at most 10 AI checks per hour.',
          'Administrators can delete any card that breaks these rules. The reason is recorded.',
        ],
      },
      {
        heading: '4. Contacting other students',
        paragraphs: [
          'StudySwap only helps you find each other. Conversations and meetings happen outside the platform (Telegram or university e-mail) and are your own responsibility. Be respectful, and do not share more personal information than you need to.',
        ],
      },
      {
        heading: '5. Your account',
        paragraphs: [
          'You can download your data and delete your account at any time in Profile → Settings → Privacy and security. Deleting the account removes your profile, cards, files, likes and searches.',
        ],
      },
      {
        heading: '6. No guarantees',
        paragraphs: [
          'StudySwap is a study project and is provided as it is. It can be unavailable or contain mistakes, and we cannot guarantee that every card or every explanation is correct.',
        ],
      },
      {
        heading: '7. Changes',
        paragraphs: ['We may update these terms. The date of the latest version is shown at the top of this page.'],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      'This page explains what StudySwap stores about you, who can see it and which services process it. StudySwap is run by the StudySwap team (group SE-2625, Astana IT University).',
    sections: [
      {
        heading: '1. What we store',
        list: [
          'Account: your university e-mail and how you signed in (code by e-mail or Microsoft).',
          'Profile: first and last name, educational program, year of study (or "Teacher"), degree; optionally a profile photo (saved as a small 256×256 picture) and your Telegram username with your Telegram account number, if you link the bot.',
          'Cards: subjects, topic texts, the contact method you chose, status and date; photos or PDFs of tasks attached to them.',
          'Likes and your 10 most recent searches.',
          'The time of each AI check (only the time, kept for one day) for the hourly limit.',
          'In your browser: the sign-in session, language, theme and sound settings.',
        ],
      },
      {
        heading: '2. Who sees what',
        list: [
          'Only people signed in with an @astanait.edu.kz account can see StudySwap. They see your name, program, year, photo and your active cards with their files; your Telegram username, if you linked it; and your university e-mail, if you have an active card.',
          'A card link shared outside StudySwap shows only the subjects, the topics, your first name with the first letter of your last name, your program and year.',
          'Inactive cards, and cards waiting for a moderator, are visible only to you and to administrators.',
          'Administrators (the team) see all cards with the author\'s name and e-mail, to moderate them.',
        ],
      },
      {
        id: 'ai',
        heading: '3. Services that process the data',
        list: [
          'Supabase: database, sign-in and file storage.',
          'Vercel: hosts the website.',
          'Google Gemini API: when you publish or edit a card, its subjects, topic texts and newly attached files are sent to Google for the AI check. Your name, e-mail and other profile details are not sent. While StudySwap uses the free plan of the Gemini API, Google may use this content to improve its products, and people at Google may review it. Do not put personal information in topics or files.',
          'Microsoft: only if you sign in with Microsoft.',
          'Telegram: only if you link the StudySwap bot.',
        ],
        paragraphs: ['There are no ads and no tracking or analytics services.'],
      },
      {
        heading: '4. Why we use it',
        paragraphs: [
          'To run StudySwap: show cards, let students contact each other, check cards against the rules and moderate them, and protect the service from misuse. For the course project we also count totals (for example, cards per subject or per day) without names.',
        ],
      },
      {
        heading: '5. How long we keep it',
        paragraphs: [
          'As long as your account exists. When you delete your account, your profile, cards, files, likes and searches are deleted. If an administrator deleted one of your cards, its text and the reason stay in the moderation log.',
        ],
      },
      {
        heading: '6. Your choices',
        list: [
          'Download everything about you (JSON) or delete your account: Profile → Settings → Privacy and security.',
          'Change or remove your photo and unlink Telegram in your profile at any time.',
          'Questions, corrections or complaints: write to the contact below.',
        ],
      },
    ],
  },
};

const ru: Record<LegalKind, LegalDoc> = {
  terms: {
    title: 'Условия использования',
    intro:
      'StudySwap — бесплатная платформа, где студенты и преподаватели Astana IT University обмениваются объяснениями: «нужна помощь с одним предметом, могу объяснить другой». Это студенческий проект команды StudySwap (группа SE-2625) по курсу ICT, а не официальный сервис университета. Входя на сайт, вы принимаете эти условия.',
    sections: [
      {
        heading: '1. Кто может пользоваться',
        list: [
          'Любой владелец почты @astanait.edu.kz. Почта из 6 цифр — аккаунт студента, любая другая — аккаунт преподавателя.',
          'Один аккаунт на человека. Берегите доступ к почте: тот, кто может её читать, может войти от вашего имени.',
          'Данные, которые вы указываете при заполнении профиля (имя, программа, курс), должны быть правдивыми.',
        ],
      },
      {
        heading: '2. Что можно публиковать в карточках',
        paragraphs: ['Можно: просить объяснить тему, объяснять, разбирать задачи вместе, проверять работы друг друга, прикреплять фото или PDF заданий, с которыми нужна помощь. Нельзя:'],
        list: [
          'мат, оскорбления, травлю, ненависть, контент 18+, насилие, наркотики, оружие;',
          'деньги в любом виде: цены, платное репетиторство, покупку и продажу, рекламу, ссылки на каналы, магазины и другие сервисы;',
          'академическую нечестность: делать за кого-то домашнюю работу, проект или диплом, сдавать за кого-то квиз, тест или экзамен, сливать вопросы и ответы, готовые решения для сдачи, плагиат;',
          'спам, бессмысленный текст и всё, что не относится к учёбе или к выбранному предмету;',
          'чужие персональные данные и файлы, которыми вы не вправе делиться.',
        ],
      },
      {
        id: 'moderation',
        heading: '3. ИИ-проверка и модерация',
        list: [
          'Перед публикацией карточки и при изменении её тем или файлов ИИ-сервис (Google Gemini) проверяет её на соответствие правилам выше. Если он находит нарушение, карточка не сохраняется, и вы видите причину.',
          'ИИ может ошибаться. Если он не может проверить карточку (например, недоступен), карточка скрыта, пока её не посмотрит администратор.',
          'Чтобы сервис работал для всех, с одного аккаунта можно запустить не больше 10 ИИ-проверок в час.',
          'Администраторы могут удалить любую карточку, нарушающую эти правила. Причина записывается.',
        ],
      },
      {
        heading: '4. Общение с другими студентами',
        paragraphs: [
          'StudySwap только помогает найти друг друга. Переписка и встречи проходят вне платформы (в Telegram или по университетской почте), и за них вы отвечаете сами. Будьте вежливы и не сообщайте о себе больше, чем нужно.',
        ],
      },
      {
        heading: '5. Ваш аккаунт',
        paragraphs: [
          'Вы можете в любой момент скачать свои данные и удалить аккаунт: Профиль → Настройки → Конфиденциальность и безопасность. Вместе с аккаунтом удаляются профиль, карточки, файлы, лайки и поиски.',
        ],
      },
      {
        heading: '6. Без гарантий',
        paragraphs: [
          'StudySwap — учебный проект и предоставляется «как есть». Сайт может быть недоступен или содержать ошибки, и мы не гарантируем правильность каждой карточки и каждого объяснения.',
        ],
      },
      {
        heading: '7. Изменения',
        paragraphs: ['Мы можем обновлять эти условия. Дата последней версии указана вверху страницы.'],
      },
    ],
  },
  privacy: {
    title: 'Политика конфиденциальности',
    intro:
      'Здесь объясняется, что StudySwap хранит о вас, кто это видит и какие сервисы обрабатывают данные. StudySwap ведёт команда StudySwap (группа SE-2625, Astana IT University).',
    sections: [
      {
        heading: '1. Что мы храним',
        list: [
          'Аккаунт: университетская почта и способ входа (код на почту или Microsoft).',
          'Профиль: имя и фамилия, образовательная программа, курс (или «Преподаватель»), уровень обучения; по желанию — фото профиля (сохраняется маленьким, 256×256) и имя пользователя Telegram с номером аккаунта Telegram, если вы подключили бота.',
          'Карточки: предметы, тексты тем, выбранный способ связи, статус и дата; прикреплённые фото и PDF заданий.',
          'Лайки и 10 последних поисков.',
          'Время каждой ИИ-проверки (только время, хранится сутки) — для лимита в час.',
          'В вашем браузере: сессия входа, язык, тема и звук.',
        ],
      },
      {
        heading: '2. Кто что видит',
        list: [
          'StudySwap видят только те, кто вошёл с почтой @astanait.edu.kz. Они видят ваше имя, программу, курс, фото и активные карточки с файлами; имя пользователя Telegram, если вы его подключили; университетскую почту, если у вас есть активная карточка.',
          'Ссылка на карточку, отправленная вне StudySwap, показывает только предметы, темы, ваше имя с первой буквой фамилии, программу и курс.',
          'Неактивные карточки и карточки, ожидающие модератора, видите только вы и администраторы.',
          'Администраторы (команда) видят все карточки с именем и почтой автора — для модерации.',
        ],
      },
      {
        id: 'ai',
        heading: '3. Сервисы, которые обрабатывают данные',
        list: [
          'Supabase: база данных, вход и хранение файлов.',
          'Vercel: хостинг сайта.',
          'Google Gemini API: при публикации или изменении карточки её предметы, тексты тем и новые прикреплённые файлы отправляются в Google для ИИ-проверки. Имя, почта и другие данные профиля не отправляются. Пока StudySwap использует бесплатный тариф Gemini API, Google может использовать этот контент для улучшения своих продуктов, а сотрудники Google могут его просматривать. Не указывайте личные данные в темах и файлах.',
          'Microsoft: только если вы входите через Microsoft.',
          'Telegram: только если вы подключили бота StudySwap.',
        ],
        paragraphs: ['Рекламы, трекеров и сервисов аналитики нет.'],
      },
      {
        heading: '4. Зачем мы это используем',
        paragraphs: [
          'Чтобы StudySwap работал: показывать карточки, давать студентам связаться друг с другом, проверять карточки на соответствие правилам, модерировать их и защищать сервис от злоупотреблений. Для учебного проекта мы также считаем итоги (например, карточки по предметам или по дням) без имён.',
        ],
      },
      {
        heading: '5. Как долго мы храним данные',
        paragraphs: [
          'Пока существует ваш аккаунт. При удалении аккаунта удаляются профиль, карточки, файлы, лайки и поиски. Если администратор удалил вашу карточку, её текст и причина остаются в журнале модерации.',
        ],
      },
      {
        heading: '6. Ваши возможности',
        list: [
          'Скачать все данные о себе (JSON) или удалить аккаунт: Профиль → Настройки → Конфиденциальность и безопасность.',
          'Изменить или убрать фото и отвязать Telegram в профиле в любой момент.',
          'Вопросы, исправления или жалобы: пишите на контакт ниже.',
        ],
      },
    ],
  },
};

const kz: Record<LegalKind, LegalDoc> = {
  terms: {
    title: 'Пайдалану шарттары',
    intro:
      'StudySwap — Astana IT University студенттері мен оқытушылары түсіндірмелермен алмасатын тегін платформа: «бір пәннен көмек керек, басқа пәнді түсіндіре аламын». Бұл — ICT курсы бойынша StudySwap командасының (SE-2625 тобы) студенттік жобасы, университеттің ресми қызметі емес. Сайтқа кіре отырып, сіз осы шарттарды қабылдайсыз.',
    sections: [
      {
        heading: '1. Кім пайдалана алады',
        list: [
          '@astanait.edu.kz поштасы бар кез келген адам. 6 саннан тұратын пошта — студент аккаунты, басқасы — оқытушы аккаунты.',
          'Бір адамға бір аккаунт. Поштаңызға қолжетімділікті сақтаңыз: оны оқи алатын адам сіздің атыңыздан кіре алады.',
          'Профильді толтырғанда көрсеткен деректеріңіз (аты-жөні, бағдарлама, курс) шын болуы керек.',
        ],
      },
      {
        heading: '2. Карточкада не жариялауға болады',
        paragraphs: ['Болады: тақырыпты түсіндіруді сұрау, түсіндіру, есептерді бірге талдау, бір-біріңіздің жұмысыңызды тексеру, көмек керек тапсырмалардың фотосын немесе PDF-ін тіркеу. Болмайды:'],
        list: [
          'балағат сөз, қорлау, қудалау, өшпенділік, 18+ мазмұн, зорлық-зомбылық, есірткі, қару;',
          'кез келген түрдегі ақша: баға, ақылы сабақ, сату-сатып алу, жарнама, арналарға, дүкендерге және басқа қызметтерге сілтемелер;',
          'академиялық адалдықты бұзу: біреудің үй жұмысын, жобасын немесе дипломын орнына орындау, квизді, тестті немесе емтиханды орнына тапсыру, сұрақтар мен жауаптарды тарату, тапсыруға арналған дайын шешімдер, плагиат;',
          'спам, мағынасыз мәтін, оқуға немесе таңдалған пәнге қатысы жоқ мазмұн;',
          'басқа адамдардың жеке деректері және бөлісуге құқығыңыз жоқ файлдар.',
        ],
      },
      {
        id: 'moderation',
        heading: '3. ЖИ тексеруі және модерация',
        list: [
          'Карточка жарияланар алдында және оның тақырыптары немесе файлдары өзгергенде ЖИ қызметі (Google Gemini) оны жоғарыдағы ережелерге сәйкестігін тексереді. Бұзушылық тапса, карточка сақталмайды және сіз себебін көресіз.',
          'ЖИ қателесуі мүмкін. Егер ол карточканы тексере алмаса (мысалы, қолжетімсіз болса), әкімші қарағанша карточка жасырын тұрады.',
          'Қызмет бәріне жұмыс істеуі үшін бір аккаунттан сағатына 10-нан артық ЖИ тексеруін іске қосуға болмайды.',
          'Әкімшілер осы ережелерді бұзатын кез келген карточканы өшіре алады. Себебі жазылып қалады.',
        ],
      },
      {
        heading: '4. Басқа студенттермен байланыс',
        paragraphs: [
          'StudySwap тек бір-біріңізді табуға көмектеседі. Хат алмасу мен кездесулер платформадан тыс (Telegram-да немесе университет поштасы арқылы) өтеді және оларға өзіңіз жауаптысыз. Сыпайы болыңыз және өзіңіз туралы қажетінен артық ақпарат бермеңіз.',
        ],
      },
      {
        heading: '5. Сіздің аккаунтыңыз',
        paragraphs: [
          'Деректеріңізді жүктеп алуға және аккаунтты кез келген уақытта өшіруге болады: Профиль → Баптаулар → Құпиялылық және қауіпсіздік. Аккаунтпен бірге профиль, карточкалар, файлдар, лайктар мен іздеулер өшіріледі.',
        ],
      },
      {
        heading: '6. Кепілдік жоқ',
        paragraphs: [
          'StudySwap — оқу жобасы және «сол күйінде» ұсынылады. Сайт қолжетімсіз болуы немесе қателер болуы мүмкін, әр карточка мен әр түсіндірменің дұрыстығына кепілдік бере алмаймыз.',
        ],
      },
      {
        heading: '7. Өзгерістер',
        paragraphs: ['Бұл шарттарды жаңартуымыз мүмкін. Соңғы нұсқаның күні беттің жоғарғы жағында көрсетілген.'],
      },
    ],
  },
  privacy: {
    title: 'Құпиялылық саясаты',
    intro:
      'Бұл бетте StudySwap сіз туралы не сақтайтыны, оны кім көретіні және деректерді қандай қызметтер өңдейтіні түсіндіріледі. StudySwap-ты StudySwap командасы (SE-2625 тобы, Astana IT University) жүргізеді.',
    sections: [
      {
        heading: '1. Біз не сақтаймыз',
        list: [
          'Аккаунт: университет поштасы және кіру тәсілі (поштаға келген код немесе Microsoft).',
          'Профиль: аты-жөні, білім беру бағдарламасы, курс (немесе «Оқытушы»), оқу деңгейі; қаласаңыз — профиль фотосы (кішкентай, 256×256 болып сақталады) және ботты қоссаңыз, Telegram пайдаланушы аты мен Telegram аккаунтының нөмірі.',
          'Карточкалар: пәндер, тақырып мәтіндері, таңдалған байланыс тәсілі, күйі мен күні; тіркелген тапсырма фотолары мен PDF-тері.',
          'Лайктар және соңғы 10 іздеу.',
          'Әр ЖИ тексеруінің уақыты (тек уақыты, бір тәулік сақталады) — сағаттық лимит үшін.',
          'Браузеріңізде: кіру сессиясы, тіл, тақырып және дыбыс баптаулары.',
        ],
      },
      {
        heading: '2. Кім нені көреді',
        list: [
          'StudySwap-ты тек @astanait.edu.kz поштасымен кіргендер көреді. Олар сіздің атыңызды, бағдарламаңызды, курсыңызды, фотоңызды және файлдарымен бірге белсенді карточкаларыңызды; Telegram-ды қоссаңыз, Telegram пайдаланушы атыңызды; белсенді карточкаңыз болса, университет поштаңызды көреді.',
          'StudySwap-тан тыс жіберілген карточка сілтемесі тек пәндерді, тақырыптарды, атыңызды тегіңіздің бірінші әрпімен, бағдарламаңыз бен курсыңызды көрсетеді.',
          'Белсенді емес карточкаларды және модераторды күтіп тұрған карточкаларды тек сіз бен әкімшілер көресіз.',
          'Әкімшілер (команда) модерация үшін барлық карточкаларды авторының аты мен поштасымен көреді.',
        ],
      },
      {
        id: 'ai',
        heading: '3. Деректерді өңдейтін қызметтер',
        list: [
          'Supabase: дерекқор, кіру және файлдарды сақтау.',
          'Vercel: сайт хостингі.',
          'Google Gemini API: карточканы жариялағанда немесе өзгерткенде оның пәндері, тақырып мәтіндері және жаңа тіркелген файлдары ЖИ тексеруі үшін Google-ға жіберіледі. Атыңыз, поштаңыз және профильдің басқа деректері жіберілмейді. StudySwap Gemini API-дің тегін тарифін пайдаланып тұрғанда, Google бұл мазмұнды өз өнімдерін жақсарту үшін пайдалануы, ал Google қызметкерлері оны қарауы мүмкін. Тақырыптар мен файлдарда жеке деректерді көрсетпеңіз.',
          'Microsoft: тек Microsoft арқылы кірсеңіз.',
          'Telegram: тек StudySwap ботын қоссаңыз.',
        ],
        paragraphs: ['Жарнама, трекерлер және аналитика қызметтері жоқ.'],
      },
      {
        heading: '4. Не үшін пайдаланамыз',
        paragraphs: [
          'StudySwap жұмыс істеуі үшін: карточкаларды көрсету, студенттерге бір-бірімен байланысуға мүмкіндік беру, карточкаларды ережелерге сәйкестігін тексеру, модерациялау және қызметті теріс пайдаланудан қорғау. Оқу жобасы үшін біз қорытындыларды да (мысалы, пәндер немесе күндер бойынша карточкалар саны) атаусыз есептейміз.',
        ],
      },
      {
        heading: '5. Деректерді қанша уақыт сақтаймыз',
        paragraphs: [
          'Аккаунтыңыз бар болғанша. Аккаунтты өшіргенде профиль, карточкалар, файлдар, лайктар мен іздеулер өшіріледі. Егер әкімші карточкаңызды өшірсе, оның мәтіні мен себебі модерация журналында қалады.',
        ],
      },
      {
        heading: '6. Сіздің мүмкіндіктеріңіз',
        list: [
          'Өзіңіз туралы барлық деректерді (JSON) жүктеп алу немесе аккаунтты өшіру: Профиль → Баптаулар → Құпиялылық және қауіпсіздік.',
          'Фотоны кез келген уақытта өзгерту немесе алып тастау және Telegram-ды профильде ажырату.',
          'Сұрақтар, түзетулер немесе шағымдар: төмендегі байланысқа жазыңыз.',
        ],
      },
    ],
  },
};

export const LEGAL: Record<Language, Record<LegalKind, LegalDoc>> = { en, ru, kz };
