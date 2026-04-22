/**
 * FSP (Fachsprachenprüfung) – Prüfungsteile und Konfiguration
 * 
 * Die FSP für ausländische Ärzte in Deutschland hat DREI Teile:
 * 1. Arzt-Patienten-Gespräch (Anamnese) – Verstehen & Sprechen in Laiensprache
 * 2. Dokumentation – Schnelle Kurznotizen (Halbsätze) + ausführlicher Arztbrief (ganze Sätze)
 * 3. Arzt-Arzt-Gespräch (Übergabe) – Fallvorstellung an einen Kollegen in Fachsprache
 * 
 * Es geht NICHT um medizinisches Fachwissen, sondern um SPRACHKOMPETENZ
 * im klinischen Alltag (Notaufnahme / stationäre Aufnahme).
 */

export const DIFFICULTY_LEVELS = [
  { id: 'beginner', labelDe: 'Einsteiger', labelTr: 'Başlangıç', labelEn: 'Beginner', color: 'bg-green-500/10 text-green-700', badgeVariant: 'secondary' as const },
  { id: 'intermediate', labelDe: 'Mittel', labelTr: 'Orta', labelEn: 'Intermediate', color: 'bg-blue-500/10 text-blue-700', badgeVariant: 'default' as const },
  { id: 'advanced', labelDe: 'Fortgeschritten', labelTr: 'İleri', labelEn: 'Advanced', color: 'bg-orange-500/10 text-orange-700', badgeVariant: 'destructive' as const },
];

/**
 * Helper: pick language-specific value with safe fallback to German.
 */
export function pickLang<T>(lang: string, de: T, tr: T, en?: T): T {
  if (lang === 'tr') return tr;
  if (lang === 'en' && en !== undefined) return en;
  return de;
}

/**
 * Die drei Teile der Fachsprachenprüfung (FSP).
 * 
 * Teil 1: Arzt-Patienten-Gespräch (Anamnese)
 *   - Der Arzt führt ein Aufnahmegespräch mit einem Patienten
 *   - Laienverständliche Sprache ist Pflicht
 *   - Systematische Anamnese unter Zeitdruck
 *   - Empathie und Eingehen auf Patientensorgen
 * 
 * Teil 2: Dokumentation
 *   - Schnelle Dokumentation (Halbsätze, Stichworte) – wie auf Station
 *   - Ausführlicher Arztbrief (ganze Sätze) – Aufnahmebericht
 *   - Verdachtsdiagnose in Fachsprache
 * 
 * Teil 3: Arzt-Arzt-Gespräch (Übergabe)
 *   - Strukturierte Fallvorstellung an einen Kollegen
 *   - Fachsprache ist hier gefordert
 *   - Medizinische Fehler werden NICHT bewertet, nur Sprachkompetenz
 */
export const SIMULATION_TYPES = [
  {
    id: 'patient_conversation',
    labelDe: 'Teil 1: Arzt-Patienten-Gespräch',
    labelTr: 'Bölüm 1: Doktor-Hasta Görüşmesi',
    labelEn: 'Part 1: Doctor–Patient conversation',
    shortDe: 'Anamnese',
    shortTr: 'Öykü Alma',
    shortEn: 'History taking',
    descriptionDe: 'Führen Sie ein Anamnesegespräch mit einem Patienten in laienverständlicher Sprache. Verstehen, Sprechen und Empathie unter Zeitdruck.',
    descriptionTr: 'Bir hasta ile anlaşılır dilde öykü görüşmesi yapın. Anlama, konuşma ve empati, zaman baskısı altında.',
    descriptionEn: 'Conduct a history-taking conversation with a patient in plain language. Listening, speaking and empathy under time pressure.',
    icon: 'Users',
    timeLimitMin: 20,
  },
  {
    id: 'documentation',
    labelDe: 'Teil 2: Dokumentation',
    labelTr: 'Bölüm 2: Dokümantasyon',
    labelEn: 'Part 2: Documentation',
    shortDe: 'Dokumentation',
    shortTr: 'Dokümantasyon',
    shortEn: 'Documentation',
    descriptionDe: 'Erstellen Sie eine schnelle Kurzdokumentation (Halbsätze) und einen ausführlichen Aufnahmebericht (ganze Sätze). Verdachtsdiagnose in Fachsprache.',
    descriptionTr: 'Hızlı kısa dokümantasyon (yarım cümleler) ve ayrıntılı kabul raporu (tam cümleler) oluşturun. Ön tanı tıbbi terminoloji ile.',
    descriptionEn: 'Create a quick short documentation (sentence fragments) and a detailed admission report (full sentences). Suspected diagnosis in medical terminology.',
    icon: 'ClipboardList',
    timeLimitMin: 20,
  },
  {
    id: 'doctor_conversation',
    labelDe: 'Teil 3: Arzt-Arzt-Gespräch',
    labelTr: 'Bölüm 3: Doktor-Doktor Görüşmesi',
    labelEn: 'Part 3: Doctor–Doctor conversation',
    shortDe: 'Übergabe',
    shortTr: 'Devir Teslim',
    shortEn: 'Handover',
    descriptionDe: 'Stellen Sie einem Kollegen den Patientenfall in medizinischer Fachsprache vor. Strukturierte Übergabe wie im Klinikalltag.',
    descriptionTr: 'Bir meslektaşınıza hasta vakasını tıbbi terminoloji ile sunun. Klinik günlük pratiğindeki gibi yapılandırılmış devir teslim.',
    descriptionEn: 'Present the patient case to a colleague in medical technical language. Structured handover like in clinical everyday practice.',
    icon: 'Stethoscope',
    timeLimitMin: 20,
  },
];

/**
 * Get the time limit for a simulation type in minutes.
 */
export function getTimeLimitForType(typeId: string): number {
  const type = SIMULATION_TYPES.find(t => t.id === typeId);
  return type?.timeLimitMin ?? 20;
}
