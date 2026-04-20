/**
 * Topic categories for the FSP (Fachsprachenprüfung) for foreign doctors.
 * These represent the main medical content areas used for exam simulations.
 */

export interface TopicCategory {
  id: string;
  titleDe: string;
  titleTr: string;
  descriptionDe: string;
  descriptionTr: string;
  keywords: string[];
  icon: string;
}

export const TOPIC_CATEGORIES: TopicCategory[] = [
  {
    id: 'innere_medizin',
    titleDe: 'Innere Medizin',
    titleTr: 'İç Hastalıkları',
    descriptionDe: 'Kardiologie, Pneumologie, Gastroenterologie, Endokrinologie, Nephrologie',
    descriptionTr: 'Kardiyoloji, pnömoloji, gastroenteroloji, endokrinoloji, nefroloji',
    keywords: ['innere medizin', 'kardiologie', 'pneumologie', 'gastroenterologie', 'diabetes', 'herzinsuffizienz', 'copd'],
    icon: 'HeartPulse',
  },
  {
    id: 'chirurgie',
    titleDe: 'Chirurgie',
    titleTr: 'Cerrahi',
    descriptionDe: 'Allgemeinchirurgie, Unfallchirurgie, Viszeralchirurgie, prä-/postoperative Versorgung',
    descriptionTr: 'Genel cerrahi, travma cerrahisi, visseral cerrahi, pre/postoperatif bakım',
    keywords: ['chirurgie', 'operation', 'appendektomie', 'fraktur', 'wundversorgung', 'postoperativ'],
    icon: 'Scissors',
  },
  {
    id: 'neurologie',
    titleDe: 'Neurologie',
    titleTr: 'Nöroloji',
    descriptionDe: 'Schlaganfall, Epilepsie, Multiple Sklerose, Kopfschmerzen, Bewusstseinsstörungen',
    descriptionTr: 'İnme, epilepsi, multipl skleroz, baş ağrısı, bilinç bozuklukları',
    keywords: ['neurologie', 'schlaganfall', 'epilepsie', 'kopfschmerz', 'bewusstlosigkeit', 'lähmung'],
    icon: 'Brain',
  },
  {
    id: 'orthopaedie',
    titleDe: 'Orthopädie & Unfallchirurgie',
    titleTr: 'Ortopedi ve Travma Cerrahisi',
    descriptionDe: 'Frakturen, Gelenkerkrankungen, Rückenschmerzen, Sportverletzungen',
    descriptionTr: 'Kırıklar, eklem hastalıkları, sırt ağrısı, spor yaralanmaları',
    keywords: ['orthopädie', 'fraktur', 'gelenk', 'rückenschmerzen', 'prothese', 'arthrose'],
    icon: 'Bone',
  },
  {
    id: 'gynaekologie',
    titleDe: 'Gynäkologie & Geburtshilfe',
    titleTr: 'Jinekoloji ve Doğum',
    descriptionDe: 'Schwangerschaftsvorsorge, Geburt, gynäkologische Erkrankungen',
    descriptionTr: 'Gebelik takibi, doğum, jinekolojik hastalıklar',
    keywords: ['gynäkologie', 'geburtshilfe', 'schwangerschaft', 'geburt', 'vorsorge'],
    icon: 'Baby',
  },
  {
    id: 'paediatrie',
    titleDe: 'Pädiatrie',
    titleTr: 'Pediatri',
    descriptionDe: 'Kinderuntersuchungen, Infektionskrankheiten, Entwicklungsstörungen',
    descriptionTr: 'Çocuk muayeneleri, enfeksiyon hastalıkları, gelişim bozuklukları',
    keywords: ['pädiatrie', 'kinder', 'fieber', 'impfung', 'entwicklung', 'vorsorgeuntersuchung'],
    icon: 'Baby',
  },
  {
    id: 'notfallmedizin',
    titleDe: 'Notfallmedizin',
    titleTr: 'Acil Tıp',
    descriptionDe: 'Akutes Abdomen, Thoraxschmerz, Atemnot, Bewusstlosigkeit, Polytrauma',
    descriptionTr: 'Akut karın, göğüs ağrısı, nefes darlığı, bilinç kaybı, politravma',
    keywords: ['notfall', 'reanimation', 'schock', 'atemnot', 'thoraxschmerz', 'akutes abdomen'],
    icon: 'AlertTriangle',
  },
  {
    id: 'psychiatrie',
    titleDe: 'Psychiatrie & Psychosomatik',
    titleTr: 'Psikiyatri ve Psikosomatik',
    descriptionDe: 'Depression, Angststörungen, Suizidalität, Suchterkrankungen',
    descriptionTr: 'Depresyon, anksiyete bozuklukları, intihar eğilimi, bağımlılık hastalıkları',
    keywords: ['psychiatrie', 'depression', 'angst', 'suizidalität', 'sucht', 'psychosomatik'],
    icon: 'Brain',
  },
  {
    id: 'dermatologie',
    titleDe: 'Dermatologie',
    titleTr: 'Dermatoloji',
    descriptionDe: 'Hauterkrankungen, Allergien, Wundheilung',
    descriptionTr: 'Cilt hastalıkları, alerjiler, yara iyileşmesi',
    keywords: ['dermatologie', 'haut', 'allergie', 'ekzem', 'wundheilung'],
    icon: 'Scan',
  },
  {
    id: 'allgemeinmedizin',
    titleDe: 'Allgemeinmedizin',
    titleTr: 'Genel Tıp',
    descriptionDe: 'Hausärztliche Versorgung, Prävention, chronische Erkrankungen, Impfberatung',
    descriptionTr: 'Aile hekimliği, önleme, kronik hastalıklar, aşı danışmanlığı',
    keywords: ['allgemeinmedizin', 'hausarzt', 'prävention', 'chronisch', 'impfung', 'vorsorge'],
    icon: 'Stethoscope',
  },
];

export const DIFFICULTY_LEVELS = [
  { id: 'beginner', labelDe: 'Einsteiger', labelTr: 'Başlangıç', color: 'bg-green-500/10 text-green-700', badgeVariant: 'secondary' as const },
  { id: 'intermediate', labelDe: 'Mittel', labelTr: 'Orta', color: 'bg-blue-500/10 text-blue-700', badgeVariant: 'default' as const },
  { id: 'advanced', labelDe: 'Fortgeschritten', labelTr: 'İleri', color: 'bg-orange-500/10 text-orange-700', badgeVariant: 'destructive' as const },
];

/**
 * FSP Exam Parts:
 * 1. Verständnistest (vocab_test) - Fachsprache ↔ Patientensprache / Latein
 * 2. Freies Gespräch (free_conversation) - Allgemeines ärztliches Gespräch
 * 3. Arzt-Patient-Gespräch (patient_conversation) - Anamnesegespräch
 * 4. Dokumentation (documentation) - Anamnesebogen schreiben
 * 5. Textverständnis (comprehension) - Arztbriefe lesen, Telefonanrufe
 * 6. Arzt-Arzt-Gespräch (doctor_conversation) - Fachsprachliches Kollegengespräch
 */
export const SIMULATION_TYPES = [
  { id: 'vocab_test', labelDe: 'Vokabeltest (Teil 1)', labelTr: 'Kelime Testi (Bölüm 1)', icon: 'BookOpen', timeLimitMin: 25 },
  { id: 'free_conversation', labelDe: 'Freies Gespräch (Teil 2)', labelTr: 'Serbest Görüşme (Bölüm 2)', icon: 'MessageCircle', timeLimitMin: 15 },
  { id: 'patient_conversation', labelDe: 'Arzt-Patient-Gespräch (Teil 3)', labelTr: 'Doktor-Hasta Görüşmesi (Bölüm 3)', icon: 'Users', timeLimitMin: 20 },
  { id: 'documentation', labelDe: 'Dokumentation (Teil 4)', labelTr: 'Dokümantasyon (Bölüm 4)', icon: 'ClipboardList', timeLimitMin: 25 },
  { id: 'comprehension', labelDe: 'Textverständnis (Teil 5)', labelTr: 'Metin Anlama (Bölüm 5)', icon: 'FileText', timeLimitMin: 20 },
  { id: 'doctor_conversation', labelDe: 'Arzt-Arzt-Gespräch (Teil 6)', labelTr: 'Doktor-Doktor Görüşmesi (Bölüm 6)', icon: 'Stethoscope', timeLimitMin: 20 },
];

/**
 * Get the time limit for a simulation type in minutes.
 */
export function getTimeLimitForType(typeId: string): number {
  const type = SIMULATION_TYPES.find(t => t.id === typeId);
  return type?.timeLimitMin ?? 20;
}
