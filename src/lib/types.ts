export type Category = 'CS & Dev' | 'Mathematics' | 'Humanities' | 'Languages';

export interface Subject {
  id: number;
  code: string;
  name: string;
  category: Category;
}

export interface BarterPost {
  id: string;
  authorName: string;
  telegramHandle: string;
  neededSubject: Subject;
  offeredSubject: Subject;
  description: string;
  createdAt: string;
}

export const SUBJECTS: Subject[] = [
  // CS & Dev (Холодный синий)
  { id: 1, code: 'ITP 1', name: 'Intro to Programming 1', category: 'CS & Dev' },
  { id: 2, code: 'ITP 2', name: 'Intro to Programming 2', category: 'CS & Dev' },
  { id: 3, code: 'OOP', name: 'Object-Oriented Programming', category: 'CS & Dev' },
  { id: 4, code: 'ADS', name: 'Algorithms & Data Structures', category: 'CS & Dev' },
  { id: 5, code: 'DMS', name: 'Database Management Systems', category: 'CS & Dev' },
  { id: 6, code: 'COA', name: 'Computer Architecture', category: 'CS & Dev' },
  { id: 7, code: 'ICT', name: 'Information & Comm. Tech', category: 'CS & Dev' },
  { id: 8, code: 'EP', name: 'Education Practice', category: 'CS & Dev' },

  // Mathematics (Лавандовый)
  { id: 9, code: 'CAL 1', name: 'Calculus I', category: 'Mathematics' },
  { id: 10, code: 'CAL 2', name: 'Calculus II', category: 'Mathematics' },
  { id: 11, code: 'LA', name: 'Linear Algebra', category: 'Mathematics' },
  { id: 12, code: 'DM', name: 'Discrete Mathematics', category: 'Mathematics' },

  // Humanities (Теплый янтарь)
  { id: 13, code: 'HK', name: 'History of Kazakhstan', category: 'Humanities' },
  { id: 14, code: 'CS', name: 'Cultural Studies', category: 'Humanities' },
  { id: 15, code: 'SOC', name: 'Sociology', category: 'Humanities' },
  { id: 16, code: 'PS', name: 'Political Science', category: 'Humanities' },
  { id: 17, code: 'PSYC', name: 'Psychology', category: 'Humanities' },

  // Languages (Пудрово-коралловый)
  { id: 18, code: 'ENG-B1', name: 'English (B1)', category: 'Languages' },
  { id: 19, code: 'ENG-B2', name: 'English (B2)', category: 'Languages' },
  { id: 20, code: 'ENG-C1', name: 'English (C1)', category: 'Languages' },
  { id: 21, code: 'CHN', name: 'Chinese Language', category: 'Languages' },
  { id: 22, code: 'GER', name: 'German Language', category: 'Languages' },
  { id: 23, code: 'KOR', name: 'Korean Language', category: 'Languages' },
];

export const INITIAL_POSTS: BarterPost[] = [
  {
    id: '1',
    authorName: 'Alzhan Y.',
    telegramHandle: 'dynam1ix',
    neededSubject: SUBJECTS[8], // CAL 1
    offeredSubject: SUBJECTS[0], // ITP 1
    description: 'Нужна помощь с пределами и интегралами к мидтерму. Взамен объясню основы C++ и помогу с лабораторными.',
    createdAt: '15 минут назад'
  },
  {
    id: '2',
    authorName: 'Nursat T.',
    telegramHandle: 'nursat_t',
    neededSubject: SUBJECTS[10], // LA
    offeredSubject: SUBJECTS[4], // DMS
    description: 'Ищу напарника разобрать метод Гаусса и матрицы. В ответ научу проектировать SQL схемы и писать запросы.',
    createdAt: '1 час назад'
  },
  {
    id: '3',
    authorName: 'Amanzhan N.',
    telegramHandle: 'amanzhan_n',
    neededSubject: SUBJECTS[3], // ADS
    offeredSubject: SUBJECTS[18], // ENG-B2
    description: 'Помогу подготовиться к спикингу B2, взамен помогите разобраться со структурами данных и деревьями поиска.',
    createdAt: '3 часа назад'
  }
];