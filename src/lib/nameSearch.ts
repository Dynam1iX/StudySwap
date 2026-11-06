/**
 * Name search that forgives spelling: "Алихан", "alikhan" and "Alihan" all become
 * "alihan". Cyrillic (Russian and Kazakh) is turned into Latin letters, then common Latin
 * spellings are folded together (kh → h, zh → j, y → i, double letters → one).
 * The database folds names with the same rules: private.name_key in
 * supabase/migrations/20261106120000_search_students.sql. Keep the two in step.
 */

const CYRILLIC: Record<string, string> = {
  а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'io', ж: 'j', з: 'z',
  и: 'i', й: 'i', к: 'k', қ: 'k', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ұ: 'u', ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'c', ч: 'c',
  ш: 's', щ: 's', ъ: '', ы: 'i', і: 'i', ь: '', э: 'e', ю: 'iu', я: 'ia',
};

/** In this order, exactly like private.name_key. */
const FOLDS: [string, string][] = [
  ['sch', 's'], ['kh', 'h'], ['zh', 'j'], ['ch', 'c'], ['sh', 's'], ['ts', 'c'], ['gh', 'g'],
  ['yu', 'iu'], ['ya', 'ia'], ['yo', 'io'], ['ye', 'e'], ['y', 'i'],
  ['q', 'k'], ['w', 'v'], ['x', 'ks'],
];

export function nameKey(text: string): string {
  let key = [...text.toLowerCase()].map((char) => CYRILLIC[char] ?? char).join('');
  key = key.replace(/[^a-z ]/g, '');
  for (const [from, to] of FOLDS) key = key.split(from).join(to);
  return key.replace(/(.)\1+/g, '$1');
}

/** Search words of at least 2 folded letters (at most 5), ready for the database. */
export function nameKeys(query: string): string[] {
  return query
    .split(/\s+/)
    .map(nameKey)
    .filter((key) => key.length >= 2)
    .slice(0, 5);
}
