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
  { id: 'beginner', labelDe: 'Einsteiger', labelTr: 'Başlangıç', color: 'bg-green-500/10 text-green-700', badgeVariant: 'secondary' as const },
  { id: 'intermediate', labelDe: 'Mittel', labelTr: 'Orta', color: 'bg-blue-500/10 text-blue-700', badgeVariant: 'default' as const },
  { id: 'advanced', labelDe: 'Fortgeschritten', labelTr: 'İleri', color: 'bg-orange-500/10 text-orange-700', badgeVariant: 'destructive' as const },
];

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
    shortDe: 'Anamnese',
    shortTr: 'Öykü Alma',
    descriptionDe: 'Führen Sie ein Anamnesegespräch mit einem Patienten in laienverständlicher Sprache. Verstehen, Sprechen und Empathie unter Zeitdruck.',
    descriptionTr: 'Bir hasta ile anlaşılır dilde öykü görüşmesi yapın. Anlama, konuşma ve empati, zaman baskısı altında.',
    icon: 'Users',
    timeLimitMin: 20,
  },
  {
    id: 'documentation',
    labelDe: 'Teil 2: Dokumentation',
    labelTr: 'Bölüm 2: Dokümantasyon',
    shortDe: 'Dokumentation',
    shortTr: 'Dokümantasyon',
    descriptionDe: 'Erstellen Sie eine schnelle Kurzdokumentation (Halbsätze) und einen ausführlichen Aufnahmebericht (ganze Sätze). Verdachtsdiagnose in Fachsprache.',
    descriptionTr: 'Hızlı kısa dokümantasyon (yarım cümleler) ve ayrıntılı kabul raporu (tam cümleler) oluşturun. Ön tanı tıbbi terminoloji ile.',
    icon: 'ClipboardList',
    timeLimitMin: 20,
  },
  {
    id: 'doctor_conversation',
    labelDe: 'Teil 3: Arzt-Arzt-Gespräch',
    labelTr: 'Bölüm 3: Doktor-Doktor Görüşmesi',
    shortDe: 'Übergabe',
    shortTr: 'Devir Teslim',
    descriptionDe: 'Stellen Sie einem Kollegen den Patientenfall in medizinischer Fachsprache vor. Strukturierte Übergabe wie im Klinikalltag.',
    descriptionTr: 'Bir meslektaşınıza hasta vakasını tıbbi terminoloji ile sunun. Klinik günlük pratiğindeki gibi yapılandırılmış devir teslim.',
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
