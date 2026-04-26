import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Note: Users are now managed by Supabase Auth.
  // Profiles are auto-created on first login via getAuthUser().

  // ============================================
  // Clean up old templates that no longer match
  // Only delete templates that have no associated simulations
  // ============================================
  try {
    // Find templates with no simulations attached
    const oldTemplates = await prisma.simulationTemplate.findMany({
      where: {
        OR: [
          { domain: 'nursing' },
          { type: { in: ['vocab_test', 'free_conversation', 'comprehension'] } },
        ],
      },
      include: { _count: { select: { simulations: true } } },
    });
    const deletableIds = oldTemplates
      .filter(t => t._count.simulations === 0)
      .map(t => t.id);
    if (deletableIds.length > 0) {
      await prisma.simulationTemplate.deleteMany({ where: { id: { in: deletableIds } } });
      console.log(`Deleted ${deletableIds.length} old templates without simulations.`);
    }
  } catch (e) {
    console.log('Cleanup skipped (non-critical):', (e as any)?.message);
  }
  await prisma.glossaryTerm.deleteMany({ where: { id: { not: { startsWith: 'glossary-' } } } });

  // ============================================
  // FSP Simulation Templates (3 Prüfungsteile)
  // ============================================

  // Teil 1: Arzt-Patienten-Gespräch (Anamnese)
  const t1Id = 'fsp-teil1-anamnese-bauchschmerzen';
  await prisma.simulationTemplate.upsert({
    where: { id: t1Id },
    update: {},
    create: {
      id: t1Id,
      domain: 'medicine',
      type: 'patient_conversation',
      difficulty: 'intermediate',
      titleDe: 'Anamnese: Bauchschmerzen in der Notaufnahme',
      titleTr: 'Öykü Alma: Acil Serviste Karın Ağrısı',
      descriptionDe: 'Frau Müller (52 J.) kommt mit Bauchschmerzen in die Notaufnahme. Führen Sie eine systematische Anamnese durch. Sprechen Sie in laienverständlicher Sprache – keine Fachbegriffe gegenüber der Patientin! Erfragen Sie: aktuelle Beschwerden, Vorerkrankungen, Medikamente, Allergien, Sozialanamnese.',
      descriptionTr: 'Bayan Müller (52 yaş) karın ağrısı ile acil servise geliyor. Sistematik bir öykü alın. Anlaşılır dil kullanın – hastaya karşı tıbbi terim kullanmayın! Sorun: mevcut şikayetler, önceki hastalıklar, ilaçlar, alerjiler, sosyal öykü.',
      systemPrompt: `Du spielst die Patientin Frau Sabine Müller, 52 Jahre alt. Du bist in der Notaufnahme und hast Angst.

DEINE BESCHWERDEN & INFORMATIONEN:
- Seit 3 Tagen krampfartige Bauchschmerzen rechts oben
- Schmerzen kommen in Wellen, besonders nach dem Essen
- Strahlen manchmal in die rechte Schulter aus
- Übelkeit, besonders nach fettigem Essen
- Einmal erbrochen (gestern)
- Leicht erhöhte Temperatur ("Ich fühle mich warm")
- Stuhlgang normal

VORERKRANKUNGEN:
- Bluthochdruck seit 5 Jahren
- Ramipril 5mg morgens

ALLERGIEN:
- Penicillin (Hautausschlag) – erwähne das NUR wenn direkt nach Allergien gefragt wird!

FAMILIE:
- Mutter hatte Gallensteine und wurde operiert

SOZIAL:
- Verheiratet, 2 erwachsene Kinder
- Büroangestellte
- Isst gerne fettig, wenig Gemüse
- Gelegentlich ein Glas Wein, Nichtraucherin

DEINE SORGEN (bringe sie von selbst ein!):
- "Muss ich operiert werden? Meine Mutter wurde auch operiert wegen sowas."
- "Ist das was Schlimmes? Ich hab sowas im Internet gelesen..."

WICHTIGE REGELN:
- Sprich IMMER als Laie, NIEMALS in Fachsprache
- Gib Informationen nur preis, wenn DIREKT danach gefragt wird
- Wenn der Arzt Fachbegriffe benutzt, frage nach: "Was meinen Sie damit?"
- Sei emotional – du hast Angst und Schmerzen
- Stelle Zwischenfragen: "Muss ich Blut abnehmen lassen?" / "Bekomme ich was gegen die Schmerzen?"
- Antworte nicht auf Fragen, die nicht gestellt wurden`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'anam-greeting', textDe: 'Begrüßung und Vorstellung', category: 'Gesprächsführung', weight: 1 },
        { id: 'anam-chief', textDe: 'Hauptbeschwerde systematisch erfragt', category: 'Anamnese', weight: 3 },
        { id: 'anam-pain', textDe: 'Schmerzanamnese vollständig (Lokalisation, Charakter, Intensität, Auslöser)', category: 'Anamnese', weight: 3 },
        { id: 'anam-history', textDe: 'Vorerkrankungen und Medikamente erfragt', category: 'Anamnese', weight: 2 },
        { id: 'anam-allergy', textDe: 'Allergien erfragt', category: 'Anamnese', weight: 3 },
        { id: 'anam-family', textDe: 'Familienanamnese erfragt', category: 'Anamnese', weight: 1 },
        { id: 'anam-social', textDe: 'Sozial- und Genussmittelanamnese erfragt', category: 'Anamnese', weight: 1 },
        { id: 'anam-patient-lang', textDe: 'Laienverständliche Sprache verwendet (KEINE Fachbegriffe)', category: 'Sprache', weight: 3 },
        { id: 'anam-flexibility', textDe: 'Auf Patientenfragen und -sorgen eingegangen', category: 'Gesprächsführung', weight: 3 },
        { id: 'anam-empathy', textDe: 'Empathisches Verhalten und Beruhigung', category: 'Empathie', weight: 2 },
      ]),
      maxTurns: 12,
    },
  });

  // Teil 2: Dokumentation
  const t2Id = 'fsp-teil2-dokumentation-bauchschmerzen';
  await prisma.simulationTemplate.upsert({
    where: { id: t2Id },
    update: {},
    create: {
      id: t2Id,
      domain: 'medicine',
      type: 'documentation',
      difficulty: 'intermediate',
      titleDe: 'Dokumentation: Aufnahmebericht Bauchschmerzen',
      titleTr: 'Dokümantasyon: Karın Ağrısı Kabul Raporu',
      descriptionDe: 'Dokumentieren Sie den Fall von Frau Müller (52 J., Bauchschmerzen rechter Oberbauch). Erstellen Sie zuerst eine schnelle Kurzdokumentation (Halbsätze/Stichworte) und dann den ausführlichen Aufnahmebericht (ganze Sätze). Die Verdachtsdiagnose muss in Fachsprache formuliert werden!',
      descriptionTr: 'Bayan Müller vakasını (52 yaş, sağ üst karın ağrısı) dokümante edin. Önce hızlı kısa dokümantasyon (yarım cümleler/anahtar kelimeler), sonra ayrıntılı kabul raporu (tam cümleler). Ön tanı tıbbi terminoloji ile!',
      systemPrompt: `Du bist ein Prüfer für die Fachsprachenprüfung (FSP).

TEIL 2: DOKUMENTATION (20 Minuten)

Der Kandidat soll basierend auf einem Patientenfall dokumentieren.

Gib dem Kandidaten diese Aufgabe:

"Sie haben gerade das Anamnesegespräch mit Frau Müller (52 J.) geführt. Hier die Zusammenfassung:
- Krampfartige Bauchschmerzen rechter Oberbauch seit 3 Tagen
- Wellen, verstärkt nach dem Essen, Ausstrahlung rechte Schulter
- Übelkeit nach fettigem Essen, einmal Erbrechen
- Leicht erhöhte Temperatur
- Vorerkrankung: Bluthochdruck (Ramipril 5mg)
- Allergie: Penicillin (Hautausschlag)
- FA: Mutter Gallensteine
- Sozial: verheiratet, 2 Kinder, Büroangestellte, gelegentlich Wein, Nichtraucherin

Aufgabe A – SCHNELLE KURZDOKUMENTATION:
Schreiben Sie eine Kurzdokumentation in Halbsätzen/Stichworten, wie Sie sie auf Station schnell anfertigen würden.

Aufgabe B – AUSFÜHRLICHER AUFNAHMEBERICHT:
Schreiben Sie den Aufnahmebericht in ganzen Sätzen mit:
1. Patientendaten
2. Aktuelle Anamnese (ganze Sätze!)
3. Vorerkrankungen, Medikation
4. Allergien/Unverträglichkeiten
5. Sozialanamnese
6. Familienanamnese
7. Verdachtsdiagnose(n) – IN FACHSPRACHE
8. Vorgeschlagene Diagnostik"

Bewerte:
- Aufgabe A: Halbsätze, schnell, alle wichtigen Infos
- Aufgabe B: Ganze Sätze, ausführlich, strukturiert
- Verdachtsdiagnose MUSS in Fachsprache sein
- Patientenaussagen dürfen NICHT in Fachsprache übersetzt werden
- Klare Trennung zwischen Kurzdoku und Aufnahmebericht`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'doc-short-complete', textDe: 'Kurzdokumentation enthält alle relevanten Infos', category: 'Kurzdokumentation', weight: 2 },
        { id: 'doc-short-style', textDe: 'Kurzdoku in Halbsätzen/Stichworten (nicht zu ausführlich)', category: 'Kurzdokumentation', weight: 2 },
        { id: 'doc-full-sentences', textDe: 'Aufnahmebericht in ganzen Sätzen geschrieben', category: 'Aufnahmebericht', weight: 3 },
        { id: 'doc-completeness', textDe: 'Alle Anamnesepunkte vollständig dokumentiert', category: 'Aufnahmebericht', weight: 3 },
        { id: 'doc-diagnosis-fachsprache', textDe: 'Verdachtsdiagnose in Fachsprache (z.B. Cholezystolithiasis)', category: 'Fachsprache', weight: 3 },
        { id: 'doc-no-translation', textDe: 'Patientenaussagen NICHT in Fachsprache übersetzt', category: 'Fachsprache', weight: 2 },
        { id: 'doc-diagnostics', textDe: 'Sinnvolle Diagnostik vorgeschlagen', category: 'Aufnahmebericht', weight: 1 },
        { id: 'doc-structure', textDe: 'Klare Struktur und Zuordnung', category: 'Struktur', weight: 2 },
      ]),
      maxTurns: 8,
    },
  });

  // Teil 3: Arzt-Arzt-Gespräch (Übergabe)
  const t3Id = 'fsp-teil3-uebergabe-bauchschmerzen';
  await prisma.simulationTemplate.upsert({
    where: { id: t3Id },
    update: {},
    create: {
      id: t3Id,
      domain: 'medicine',
      type: 'doctor_conversation',
      difficulty: 'advanced',
      titleDe: 'Übergabe: Fallvorstellung Bauchschmerzen',
      titleTr: 'Devir Teslim: Karın Ağrısı Vaka Sunumu',
      descriptionDe: 'Stellen Sie der Oberärztin den Fall von Frau Müller in medizinischer Fachsprache vor. Hier ist Fachsprache ausdrücklich gefordert! Strukturierte Übergabe: Patientenvorstellung, Anamnese, Befund, Verdachtsdiagnose, Procedere. Medizinische Fehler werden NICHT bewertet – nur Ihre Sprachkompetenz.',
      descriptionTr: 'Başasistana Bayan Müller vakasını tıbbi terminoloji ile sunun. Burada tıbbi terimler açıkça beklenir! Yapılandırılmış devir teslim: Hasta sunumu, öykü, bulgu, ön tanı, işlem planı. Tıbbi hatalar değerlendirilmez – sadece dil yetkinliğiniz.',
      systemPrompt: `Du spielst die Oberärztin Dr. Schmidt. Du erwartest eine strukturierte Fallvorstellung IN FACHSPRACHE.

Sage zu Beginn:
"Guten Tag, Kollegin/Kollege. Ich höre, Sie haben eine neue Patientin aufgenommen. Bitte stellen Sie mir den Fall vor."

DER FALL (den der Kandidat kennen sollte):
- Frau Müller, 52 J., Notaufnahme
- Krampfartige Oberbauchschmerzen rechts seit 3 Tagen
- Postprandiale Verstärkung, Ausstrahlung in die rechte Schulter
- Nausea, einmaliges Emesis, subfebrile Temperatur
- VE: Arterielle Hypertonie (Ramipril 5mg)
- Allergie: Penicillin
- FA: Mutter Cholezystolithiasis
- V.a. Cholezystolithiasis / akute Cholezystitis

DEINE RÜCKFRAGEN (stelle sie im Gespräch):
- "Welche Differentialdiagnosen kämen in Frage?"
- "Welche Diagnostik haben Sie angeordnet?"
- "Gibt es Kontraindikationen für die Medikation?"
- "Wie ist Ihr Procedere?"

BEWERTUNGSFOKUS:
- Fachsprache ist hier GEFORDERT und ERWARTET
- Strukturierte Vorstellung (nicht chaotisch)
- Flüssiger Vortrag
- Korrekter Einsatz von Fachtermini
- Medizinische Fehler werden NICHT bewertet, nur Sprachkompetenz

WICHTIG:
- Sei professionell und kollegial
- Stelle gezielt Nachfragen
- Wenn der Kandidat Laiensprache benutzt, weise freundlich darauf hin: "Können Sie das bitte in Fachsprache formulieren?"`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'ueberg-structure', textDe: 'Strukturierte Fallvorstellung (Patient, Anamnese, Befund, Diagnose, Procedere)', category: 'Struktur', weight: 3 },
        { id: 'ueberg-fachsprache', textDe: 'Durchgehend Fachsprache verwendet', category: 'Fachsprache', weight: 3 },
        { id: 'ueberg-fluency', textDe: 'Flüssiger Vortrag ohne lange Pausen', category: 'Sprachkompetenz', weight: 2 },
        { id: 'ueberg-terminology', textDe: 'Korrekte medizinische Terminologie (Nausea, Emesis, subfebrile Temp.)', category: 'Fachsprache', weight: 3 },
        { id: 'ueberg-completeness', textDe: 'Alle relevanten Fallinformationen übergeben', category: 'Vollständigkeit', weight: 2 },
        { id: 'ueberg-questions', textDe: 'Rückfragen der Oberärztin kompetent beantwortet', category: 'Kommunikation', weight: 2 },
        { id: 'ueberg-diagnosis', textDe: 'Verdachtsdiagnose in korrekter Fachsprache', category: 'Fachsprache', weight: 3 },
      ]),
      maxTurns: 10,
    },
  });

  // ============================================
  // Medizinisches Glossar für FSP
  // ============================================
  const glossaryTerms = [
    // Anatomie
    { termDe: 'Abdomen', termTr: 'Karın', contextDe: 'Bauch / Bauchraum (lat.)', contextTr: 'Karın bölgesi' },
    { termDe: 'Thorax', termTr: 'Göğüs', contextDe: 'Brustkorb (lat.)', contextTr: 'Göğüs kafesi' },
    { termDe: 'Hepar', termTr: 'Karaciğer', contextDe: 'Leber (griech.)', contextTr: 'Karaciğer' },
    { termDe: 'Antebrachium', termTr: 'Dirsek-bilek arası', contextDe: 'Unterarm (lat.)', contextTr: 'Ön kol' },
    { termDe: 'Extremität', termTr: 'Uzuv', contextDe: 'Gliedmaße (Arm oder Bein)', contextTr: 'Kol veya bacak' },
    // Symptome
    { termDe: 'Cephalgie', termTr: 'Baş ağrısı', contextDe: 'Kopfschmerzen (Fachsprache)', contextTr: 'Baş ağrısı (tıbbi terim)' },
    { termDe: 'Dyspnoe', termTr: 'Nefes darlığı', contextDe: 'Atemnot / Luftnot', contextTr: 'Nefes alamama, solunum güçlüğü' },
    { termDe: 'Emesis', termTr: 'Kusma', contextDe: 'Erbrechen (Fachsprache)', contextTr: 'Kusma (tıbbi terim)' },
    { termDe: 'Nausea', termTr: 'Bulantı', contextDe: 'Übelkeit (Fachsprache)', contextTr: 'Mide bulanması' },
    { termDe: 'Obstipation', termTr: 'Kabızlık', contextDe: 'Verstopfung (Stuhlgang)', contextTr: 'Dışkılama güçlüğü' },
    // Diagnosen
    { termDe: 'Hypertonie', termTr: 'Yüksek tansiyon', contextDe: 'Bluthochdruck (art. Hypertonie)', contextTr: 'Yüksek kan basıncı' },
    { termDe: 'Cholezystitis', termTr: 'Safra kesesi iltihaı', contextDe: 'Gallenblasenentzündung', contextTr: 'Safra kesesi yangısı' },
    { termDe: 'Pneumonie', termTr: 'Zatürre', contextDe: 'Lungenentzündung', contextTr: 'Akciğer iltihaı' },
    { termDe: 'Appendizitis', termTr: 'Apandisit', contextDe: 'Blinddarmentzündung', contextTr: 'Apandis iltihaı' },
    { termDe: 'Fraktur', termTr: 'Kırık', contextDe: 'Knochenbruch', contextTr: 'Kemik kırığı' },
    // Verfahren
    { termDe: 'Cholezystektomie', termTr: 'Safra kesesi ameliyatı', contextDe: 'Operative Entfernung der Gallenblase', contextTr: 'Safra kesesi alınması' },
    { termDe: 'Laparoskopie', termTr: 'Karın dürbünü', contextDe: 'Bauchspiegelung (minimalinvasiv)', contextTr: 'Karın içi görüntüleme' },
    { termDe: 'Sonographie', termTr: 'Ultrason', contextDe: 'Ultraschalluntersuchung', contextTr: 'Ses dalgalarıyla görüntüleme' },
    // Anamnese
    { termDe: 'Anamnese', termTr: 'Öykü alma', contextDe: 'Systematische Befragung des Patienten', contextTr: 'Hastanın tıbbi geçmişinin sorgulanması' },
    { termDe: 'Verdachtsdiagnose', termTr: 'Ön tanı', contextDe: 'Vorläufige Diagnose vor Abschluss der Diagnostik', contextTr: 'Tanısal süreç tamamlanmadan önce konulan geçici tanı' },
  ];

  for (const term of glossaryTerms) {
    const stableId = 'glossary-' + term.termDe.toLowerCase().replace(/[^a-z0-9äöüß]/g, '-');
    await prisma.glossaryTerm.upsert({
      where: { id: stableId },
      update: { ...term },
      create: { id: stableId, ...term },
    });
  }

  console.log('FSP-Assistent Seed completed successfully! (3 Prüfungsteile)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
