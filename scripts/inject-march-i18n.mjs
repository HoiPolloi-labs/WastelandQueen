/**
 * One-shot: add march_size signup-form keys + fill-mode plan-widget keys to
 * all 12 locales. WK game terms (Hub, Captain, Rally, Auto-Sort) stay
 * untranslated per CLAUDE.md.
 *
 * Safe to re-run — does nothing if the key already exists.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesDir = join(__dirname, '..', 'src', 'i18n', 'locales')

const data = {
  en: {
    signup: {
      march_label: 'March Size',
      march_placeholder: 'e.g. 350000',
      march_hint: 'Troops per single march. Optional — capacity-fill Auto-Sort uses it, falls back to rally size if blank.',
    },
    plan: {
      fill_mode_section: 'Defender allocation',
      fill_mode_fixed: 'Fixed',
      fill_mode_capacity: 'Capacity',
      fill_mode_capacity_hint: 'Hub & each turret fill until joiners’ march totals reach the captain’s rally cap. Surplus → reserve.',
    },
  },
  de: {
    signup: {
      march_label: 'Marsch-Größe',
      march_placeholder: 'z.B. 350000',
      march_hint: 'Truppen pro Marsch. Optional — wird im Kapazitäts-Auto-Sort verwendet, fällt zurück auf Rally-Size wenn leer.',
    },
    plan: {
      fill_mode_section: 'Defender-Verteilung',
      fill_mode_fixed: 'Fest',
      fill_mode_capacity: 'Kapazität',
      fill_mode_capacity_hint: 'Hub & jeder Turm wird aufgefüllt bis die Marsch-Summe der Joiner die Captain-Rally erreicht. Überschuss → Reserve.',
    },
  },
  ru: {
    signup: {
      march_label: 'Размер марша',
      march_placeholder: 'напр. 350000',
      march_hint: 'Войска за марш. Опционально — используется в режиме заполнения по ёмкости; запасной вариант — rally size.',
    },
    plan: {
      fill_mode_section: 'Распределение защитников',
      fill_mode_fixed: 'Фикс.',
      fill_mode_capacity: 'Ёмкость',
      fill_mode_capacity_hint: 'Хаб и каждая турель заполняются, пока сумма марша присоединившихся не достигнет cap rally капитана. Излишки → резерв.',
    },
  },
  zh: {
    signup: {
      march_label: '行军规模',
      march_placeholder: '例如 350000',
      march_hint: '每次行军兵力。可选 — 容量填充自动分配使用此值，为空时回退到 rally size。',
    },
    plan: {
      fill_mode_section: '防御者分配',
      fill_mode_fixed: '固定',
      fill_mode_capacity: '容量',
      fill_mode_capacity_hint: 'Hub 和每座炮塔填充直到加入者的行军总和达到队长的 rally 上限。多余 → 储备。',
    },
  },
  ko: {
    signup: {
      march_label: '행군 규모',
      march_placeholder: '예: 350000',
      march_hint: '행군 1회 당 병력. 선택 — 용량 채우기 자동 배치에서 사용, 비어 있으면 rally size로 폴백.',
    },
    plan: {
      fill_mode_section: '방어자 배치',
      fill_mode_fixed: '고정',
      fill_mode_capacity: '용량',
      fill_mode_capacity_hint: 'Hub와 각 포탑은 합류자의 행군 합계가 측틴의 rally 상한에 도달할 때까지 채워집니다. 초과 → 예비.',
    },
  },
  ja: {
    signup: {
      march_label: '行軍規模',
      march_placeholder: '例: 350000',
      march_hint: '1回の行軍兵力。任意 — 容量埋め自動配分が使用、空の場合は rally size にフォールバック。',
    },
    plan: {
      fill_mode_section: 'ディフェンダー配分',
      fill_mode_fixed: '固定',
      fill_mode_capacity: '容量',
      fill_mode_capacity_hint: 'Hub と各タレットは、参加者の行軍合計がキャプテンの rally 上限に達するまで埋められます。余剰 → リザーブ。',
    },
  },
  it: {
    signup: {
      march_label: 'Dimensione marcia',
      march_placeholder: 'es. 350000',
      march_hint: 'Truppe per marcia. Opzionale — usata dal Auto-Sort a capacità, ripiega su rally size se vuoto.',
    },
    plan: {
      fill_mode_section: 'Distribuzione difensori',
      fill_mode_fixed: 'Fissa',
      fill_mode_capacity: 'Capacità',
      fill_mode_capacity_hint: 'Hub e ogni torre si riempiono finché la somma delle marce degli aderenti raggiunge il cap rally del capitano. Eccedenza → riserva.',
    },
  },
  tr: {
    signup: {
      march_label: 'Yürüyüş büyüklüğü',
      march_placeholder: 'örn. 350000',
      march_hint: 'Marş başına asker. İsteğe bağlı — kapasite-dolum Auto-Sort kullanır, boşsa rally size’a düşer.',
    },
    plan: {
      fill_mode_section: 'Savunmacı dağılımı',
      fill_mode_fixed: 'Sabit',
      fill_mode_capacity: 'Kapasite',
      fill_mode_capacity_hint: 'Hub ve her kule, katılımcıların yürüyüş toplamı kaptanın rally üst sınırına ulaşana kadar dolar. Fazla → yedek.',
    },
  },
  fr: {
    signup: {
      march_label: 'Taille de marche',
      march_placeholder: 'ex. 350000',
      march_hint: 'Troupes par marche. Optionnel — utilisé par Auto-Sort capacité, repli sur rally size si vide.',
    },
    plan: {
      fill_mode_section: 'Répartition défenseurs',
      fill_mode_fixed: 'Fixe',
      fill_mode_capacity: 'Capacité',
      fill_mode_capacity_hint: 'Le Hub et chaque tourelle se remplissent jusqu’à ce que la somme des marches des rejoignants atteigne le plafond de rally du capitaine. Surplus → réserve.',
    },
  },
  uk: {
    signup: {
      march_label: 'Розмір маршу',
      march_placeholder: 'напр. 350000',
      march_hint: 'Війська за марш. Необов’язково — використовується в режимі заповнення за ємністю; резерв — rally size.',
    },
    plan: {
      fill_mode_section: 'Розподіл захисників',
      fill_mode_fixed: 'Фікс.',
      fill_mode_capacity: 'Ємність',
      fill_mode_capacity_hint: 'Хаб і кожна турель заповнюються, поки сума маршу приєднаних не сягне ліміту rally капітана. Надлишок → резерв.',
    },
  },
  el: {
    signup: {
      march_label: 'Μέγεθος πορείας',
      march_placeholder: 'π.χ. 350000',
      march_hint: 'Στρατεύματα ανά πορεία. Προαιρετικό — χρησιμοποιείται από Auto-Sort χωρητικότητας, επιστρέφει σε rally size αν κενό.',
    },
    plan: {
      fill_mode_section: 'Κατανομή αμυντικών',
      fill_mode_fixed: 'Σταθερό',
      fill_mode_capacity: 'Χωρητικότητα',
      fill_mode_capacity_hint: 'Το Hub και κάθε πύργος γεμίζουν μέχρι το άθροισμα πορειών των joiners να φτάσει το cap rally του captain. Πλεόνασμα → εφεδρεία.',
    },
  },
  es: {
    signup: {
      march_label: 'Tamaño de marcha',
      march_placeholder: 'p.ej. 350000',
      march_hint: 'Tropas por marcha. Opcional — usado por Auto-Sort por capacidad, recae en rally size si vacío.',
    },
    plan: {
      fill_mode_section: 'Distribución de defensores',
      fill_mode_fixed: 'Fijo',
      fill_mode_capacity: 'Capacidad',
      fill_mode_capacity_hint: 'Hub y cada torre se llenan hasta que la suma de marchas de los que se unen alcance el tope rally del capitán. Excedente → reserva.',
    },
  },
}

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      target[k] = deepMerge(target[k] ?? {}, v)
    } else if (!(k in target)) {
      target[k] = v
    }
  }
  return target
}

for (const [locale, additions] of Object.entries(data)) {
  const path = join(localesDir, `${locale}.json`)
  const json = JSON.parse(readFileSync(path, 'utf8'))
  deepMerge(json, additions)
  writeFileSync(path, JSON.stringify(json, null, 2) + '\n')
  console.log(`updated ${locale}`)
}
