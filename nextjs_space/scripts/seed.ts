import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Note: Users are now managed by Supabase Auth.
  // Profiles are auto-created on first login via getAuthUser().

  // ============================================
  // Clean up old nursing templates & glossary
  // ============================================
  await prisma.simulationTemplate.deleteMany({ where: { domain: 'nursing' } });
  await prisma.glossaryTerm.deleteMany({ where: { id: { not: { startsWith: 'glossary-' } } } });

  // ============================================
  // FSP Simulation Templates (6 Prüfungsteile)
  // ============================================

  // Teil 1: Verständnistest (Vokabeln + Körperschema)
  const t1Id = 'fsp-teil1-vokabel-beginner';
  await prisma.simulationTemplate.upsert({
    where: { id: t1Id },
    update: {},
    create: {
      id: t1Id,
      domain: 'medicine',
      type: 'vocab_test',
      difficulty: 'beginner',
      titleDe: 'Verständnistest: Fachsprache ↔ Patientensprache',
      titleTr: 'Anlama Testi: Tıbbi Dil ↔ Hasta Dili',
      descriptionDe: 'Übersetzen Sie medizinische Fachbegriffe in die Patientensprache und umgekehrt. Sie haben 20 Minuten für 20 Begriffspaare und 5 Minuten für das Körperschema.',
      descriptionTr: 'Tıbbi terimleri hasta diline ve tersine çevirin. 20 terim çifti için 20 dakikanız ve vücut şeması için 5 dakikanız var.',
      systemPrompt: `Du bist ein Prüfer für die Fachsprachenprüfung (FSP) für Ärzte in Deutschland.\n\nTEIL 1: VERSTÄNDNISTEST\n\nAufgabe A: Gib dem Kandidaten medizinische Fachbegriffe, die er in die verständliche Patientensprache übersetzen soll.\nAufgabe B: Gib dem Kandidaten deutsche Begriffe, die er in die lateinisch/griechische Fachsprache übersetzen soll.\n\nBeginne mit 5 Begriffen aus Aufgabe A, dann 5 aus Aufgabe B. Bewerte die Antworten sofort und gib korrektes Feedback.\n\nBeispiele Aufgabe A (Fachsprache \u2192 Patientensprache):\n- Cephalgie = Kopfschmerzen\n- Emesis = Erbrechen\n- Dyspnoe = Atemnot/Luftnot\n- Hypertonie = Bluthochdruck\n- Obstipation = Verstopfung\n\nBeispiele Aufgabe B (Deutsch \u2192 Latein/Griechisch):\n- Unterarm = Antebrachium\n- Leber = Hepar\n- Bauchspiegelung = Laparoskopie\n- Gallenblase = Vesica biliaris/fellea\n- Lungenentzündung = Pneumonie\n\nWICHTIG:\n- Fordere Übersetzungen, KEINE Erklärungen\n- Akzeptiere mehrere korrekte Übersetzungen\n- Gib nach jeder Antwort Feedback\n- Frage nacheinander, nicht alle auf einmal`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'vocab-a-correct', textDe: 'Fachsprache \u2192 Patientensprache korrekt', category: 'Vokabeln', weight: 2 },
        { id: 'vocab-b-correct', textDe: 'Deutsch \u2192 Latein/Griechisch korrekt', category: 'Vokabeln', weight: 2 },
        { id: 'vocab-precision', textDe: 'Präzise Übersetzung (nicht Erklärung)', category: 'Präzision', weight: 1 },
        { id: 'vocab-speed', textDe: 'Zügige Beantwortung', category: 'Tempo', weight: 1 },
      ]),
      maxTurns: 12,
    },
  });

  // Teil 2: Freies Gespräch
  const t2Id = 'fsp-teil2-freies-gespraech';
  await prisma.simulationTemplate.upsert({
    where: { id: t2Id },
    update: {},
    create: {
      id: t2Id,
      domain: 'medicine',
      type: 'free_conversation',
      difficulty: 'intermediate',
      titleDe: 'Freies ärztliches Gespräch',
      titleTr: 'Serbest Tıbbi Görüşme',
      descriptionDe: 'Die Prüfer stellen Ihnen allgemeine Fragen zu Ihrem beruflichen Werdegang, Ihrer Motivation und zu medizinischen Themen. Es geht um richtiges Verstehen und flüssiges Sprechen.',
      descriptionTr: 'Sınav komisyonu size mesleki geçmişiniz, motivasyonunuz ve tıbbi konular hakkında genel sorular sorar. Doğru anlama ve akıcı konuşma değerlendirilir.',
      systemPrompt: `Du bist ein Prüfer für die Fachsprachenprüfung (FSP).\n\nTEIL 2: FREIES GESPRÄCH (10-15 Minuten)\n\nFühre ein teilweise ärztliches Gespräch mit dem Kandidaten. Stelle Fragen zu:\n\n1. Beruflicher Werdegang: \"Wo haben Sie studiert? In welchem Fach möchten Sie sich spezialisieren?\"\n2. Motivation: \"Warum möchten Sie in Deutschland arbeiten? Was reizt Sie an der deutschen Medizin?\"\n3. Klinische Erfahrung: \"Erzählen Sie von einem interessanten Fall aus Ihrer bisherigen Arbeit.\"\n4. Medizinisches Thema: \"Was wissen Sie über das deutsche Gesundheitssystem? Wie unterscheidet es sich?\"\n5. Alltagsfragen: \"Wie organisieren Sie sich auf Station? Wie gehen Sie mit Stress um?\"\n\nBewerte:\n- Sprachliches Verständnis (Versteht der Kandidat die Fragen?)\n- Ausdrucksfähigkeit (Formuliert er verständliche, vollständige Antworten?)\n- Flüssigkeit (Spricht er flüssig oder stockend?)\n\nWICHTIG:\n- Sei freundlich aber professionell\n- Stelle Nachfragen, wenn Antworten unklar sind\n- Variiere Themen zwischen persönlich und fachlich`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'free-understanding', textDe: 'Versteht Fragen richtig', category: 'Verstehen', weight: 3 },
        { id: 'free-fluency', textDe: 'Spricht flüssig und zusammenhängend', category: 'Sprechen', weight: 3 },
        { id: 'free-grammar', textDe: 'Korrekte Grammatik und Satzbau', category: 'Grammatik', weight: 2 },
        { id: 'free-vocabulary', textDe: 'Angemessener Wortschatz', category: 'Wortschatz', weight: 2 },
        { id: 'free-medical', textDe: 'Kann über medizinische Themen sprechen', category: 'Fachsprache', weight: 2 },
      ]),
      maxTurns: 10,
    },
  });

  // Teil 3: Arzt-Patient-Gespräch (Anamnese)
  const t3Id = 'fsp-teil3-anamnese-grundlagen';
  await prisma.simulationTemplate.upsert({
    where: { id: t3Id },
    update: {},
    create: {
      id: t3Id,
      domain: 'medicine',
      type: 'patient_conversation',
      difficulty: 'intermediate',
      titleDe: 'Anamnesegespräch: Bauchschmerzen',
      titleTr: 'Öykü Alma: Karın Ağrısı',
      descriptionDe: 'Sie führen ein Anamnesegespräch mit Frau Müller (52 J.), die über Bauchschmerzen klagt. Erfragen Sie die aktuelle Anamnese in laienverständlicher Sprache. Reagieren Sie flexibel auf Patientenfragen!',
      descriptionTr: 'Bayan Müller (52 yaş) ile karın ağrısı şikayeti olan bir öykü görüşmesi yapıyorsunuz. Güncel öyküyü anlaşılır bir dille alın. Hasta sorularına esnek tepki verin!',
      systemPrompt: `Du bist ein Prüfer für die Fachsprachenprüfung (FSP).\n\nTEIL 3: ARZT-PATIENT-GESPRÄCH (20 Minuten)\n\nDEINE ROLLE: Du spielst die Patientin Frau Müller, 52 Jahre. Du sprichst als Laie, NICHT in Fachsprache.\n\nPATIENTENINFORMATIONEN:\n- Name: Sabine Müller, 52 Jahre\n- Hauptbeschwerde: Bauchschmerzen seit 3 Tagen, rechter Oberbauch\n- Schmerzcharakter: Krampfartig, kommt in Wellen, besonders nach dem Essen\n- Ausstrahlung: Manchmal in die rechte Schulter\n- Übelkeit: Ja, besonders nach fettigem Essen\n- Erbrechen: Einmal gestern\n- Fieber: Leicht erhöht (37.8\u00b0C)\n- Stuhlgang: Normal, kein Blut\n- Vorerkrankungen: Bluthochdruck seit 5 Jahren\n- Medikamente: Ramipril 5mg\n- Allergien: Penicillin (Hautausschlag)\n- Familienanamnese: Mutter hatte Gallensteine\n- Ernährung: Isst gerne fettig, wenig Gemüse\n- Alkohol: Gelegentlich ein Glas Wein\n- Rauchen: Nein\n- Sozial: Verheiratet, 2 Kinder, Büroangestellte\n\nDEINE ANGST/SORGE:\n- \"Ist das was Schlimmes? Meine Nachbarin hatte auch solche Schmerzen und wurde operiert.\"\n- \"Muss ich ins Krankenhaus?\"\n\nWICHTIG:\n- Antworte immer als Patientin in einfacher Sprache\n- Stelle Zwischenfragen und äußere Sorgen MITTEN im Gespräch\n- Gib Informationen nur preis, wenn direkt gefragt\n- Wenn der Arzt Fachbegriffe nutzt, frage: \"Was bedeutet das?\"\n- Erwähne die Penicillin-Allergie NUR wenn nach Allergien gefragt wird`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'anam-greeting', textDe: 'Angemessene Begrüßung und Vorstellung', category: 'Gesprächsführung', weight: 1 },
        { id: 'anam-chief', textDe: 'Hauptbeschwerde systematisch erfragt', category: 'Anamnese', weight: 3 },
        { id: 'anam-pain', textDe: 'Schmerzanamnese vollständig (Lokalisation, Charakter, Intensität)', category: 'Anamnese', weight: 3 },
        { id: 'anam-history', textDe: 'Vorerkrankungen und Medikamente erfragt', category: 'Anamnese', weight: 2 },
        { id: 'anam-allergy', textDe: 'Allergien erfragt', category: 'Anamnese', weight: 3 },
        { id: 'anam-family', textDe: 'Familienanamnese erfragt', category: 'Anamnese', weight: 1 },
        { id: 'anam-social', textDe: 'Sozial- und Genussmittelanamnese erfragt', category: 'Anamnese', weight: 1 },
        { id: 'anam-patient-lang', textDe: 'Laienverständliche Sprache verwendet (KEINE Fachsprache)', category: 'Sprache', weight: 3 },
        { id: 'anam-flexibility', textDe: 'Auf Patientenfragen sofort eingegangen', category: 'Gesprächsführung', weight: 3 },
        { id: 'anam-empathy', textDe: 'Empathisches Verhalten und Beruhigung', category: 'Empathie', weight: 2 },
      ]),
      maxTurns: 12,
    },
  });

  // Teil 4: Dokumentation
  const t4Id = 'fsp-teil4-dokumentation';
  await prisma.simulationTemplate.upsert({
    where: { id: t4Id },
    update: {},
    create: {
      id: t4Id,
      domain: 'medicine',
      type: 'documentation',
      difficulty: 'intermediate',
      titleDe: 'Dokumentation: Anamnesebogen ausfüllen',
      titleTr: 'Dokümantasyon: Anamnez Formu Doldurma',
      descriptionDe: 'Füllen Sie basierend auf dem vorangegangenen Anamnesegespräch den Anamnesebogen aus. Notieren Sie: Aktuelle Anamnese (ganze Sätze auf Seite 1), Vorerkrankungen, Allergien, Sozialanamnese, Verdachtsdiagnose (Fachsprache!) und Untersuchungsanforderungen.',
      descriptionTr: 'Önceki öykü görüşmesine dayanarak anamnez formunu doldurun. Not edin: Güncel öykü (1. sayfada tam cümleler), önceki hastalıklar, alerjiler, sosyal öykü, ön tanı (tıbbi terimlerle!) ve tetkik istemleri.',
      systemPrompt: `Du bist ein Prüfer für die Fachsprachenprüfung (FSP).\n\nTEIL 4: DOKUMENTATION (25 Minuten)\n\nDer Kandidat soll einen Anamnesebogen basierend auf einem Patientengespräch ausfüllen.\n\nGib dem Kandidaten diese Aufgabe:\n\"Sie haben gerade ein Anamnesegespräch mit Frau Müller (52 J.) geführt, die über krampfartige Bauchschmerzen im rechten Oberbauch klagt, besonders nach dem Essen. Sie hatte einmal Erbrechen, leichtes Fieber und eine Penicillin-Allergie. Vorerkrankung: Hypertonie.\n\nFüllen Sie bitte den Anamnesebogen aus:\n1. Patientendaten\n2. Aktuelle Anamnese (ganze Sätze!)\n3. Vorerkrankungen, Medikation\n4. Allergien/Unverträglichkeiten\n5. Sozialanamnese, Genussmittel\n6. Familienanamnese\n7. Verdachtsdiagnose(n) - IN FACHSPRACHE\n8. Untersuchungsanforderungen\"\n\nBewerte die Antworten auf:\n- Vollständigkeit der Dokumentation\n- Aktuelle Anamnese in ganzen Sätzen (Seite 1)\n- Ab Seite 2: Stichpunkte erlaubt (Zeitgewinn)\n- Verdachtsdiagnose in FACHSPRACHE\n- Keine Übersetzung der Patientenangaben in Fachsprache bei der Anamnese\n- Korrekte Zuordnung der Informationen`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'doc-patient-data', textDe: 'Patientendaten vollständig', category: 'Dokumentation', weight: 1 },
        { id: 'doc-current-full-sentences', textDe: 'Aktuelle Anamnese in ganzen Sätzen', category: 'Dokumentation', weight: 3 },
        { id: 'doc-completeness', textDe: 'Alle relevanten Informationen dokumentiert', category: 'Dokumentation', weight: 3 },
        { id: 'doc-diagnosis', textDe: 'Verdachtsdiagnose in Fachsprache', category: 'Fachsprache', weight: 3 },
        { id: 'doc-no-translation', textDe: 'Patientenangaben NICHT in Fachsprache übersetzt', category: 'Fachsprache', weight: 2 },
        { id: 'doc-exam-requests', textDe: 'Untersuchungsanforderungen korrekt', category: 'Dokumentation', weight: 2 },
        { id: 'doc-structure', textDe: 'Klare Struktur und Zuordnung', category: 'Struktur', weight: 2 },
      ]),
      maxTurns: 8,
    },
  });

  // Teil 5: Textverständnis
  const t5Id = 'fsp-teil5-textverstaendnis';
  await prisma.simulationTemplate.upsert({
    where: { id: t5Id },
    update: {},
    create: {
      id: t5Id,
      domain: 'medicine',
      type: 'comprehension',
      difficulty: 'intermediate',
      titleDe: 'Textverständnis: Arztbrief und Befunde',
      titleTr: 'Metin Anlama: Epikriz ve Bulgular',
      descriptionDe: 'Sie erhalten einen Arztbrief/Befundbericht. Beantworten Sie die Fragen dazu kurz und präzise. Zusätzlich erhalten Sie telefonische Informationen, die Sie korrekt erfassen müssen.',
      descriptionTr: 'Bir epikriz/bulgu raporu alacaksınız. Soruları kısa ve öz yanıtlayın. Ayrıca telefonla verilen bilgileri doğru bir şekilde kaydetmeniz gerekecek.',
      systemPrompt: `Du bist ein Prüfer für die Fachsprachenprüfung (FSP).\n\nTEIL 5: TEXTVERSTÄNDNIS (20 Minuten)\n\nGib dem Kandidaten folgenden ARZTBRIEF:\n\n---\nEntlassungsbrief\nPat.: Müller, Hans, geb. 15.03.1958\nStation: Innere Medizin\nAufnahme: 10.01.2026 | Entlassung: 17.01.2026\n\nDiagnosen:\n1. Akute Cholezystitis bei Cholelithiasis\n2. Art. Hypertonie\n3. Diabetes mellitus Typ 2\n\nAnamnese: Der Patient stellte sich mit seit 3 Tagen bestehenden rechtsseitigen Oberbauchschmerzen vor. Die Schmerzen verstärkten sich postprandial. Begleitend bestanden Übelkeit und einmaliges Erbrechen. Temp. bei Aufnahme 38.2\u00b0C.\n\nBefunde: Sono Abdomen: Gallenblase verdickt (5mm), multiple Konkremente, pericholezystitisches Ödem. Labor: Leukozyten 14.200/\u00b5l, CRP 85 mg/l, GGT 120 U/l, AP 180 U/l.\n\nTherapie: Laparoskopische Cholezystektomie am 12.01.2026 ohne Komplikationen. Postop. Verlauf unauffällig.\n\nMedikation bei Entlassung: Ramipril 5mg 1-0-0, Metformin 1000mg 1-0-1, Ibuprofen 400mg bei Bedarf.\n\nWeitere Empfehlungen: Wiedervorstellung beim Hausarzt in 1 Woche, fädenziehende Nachsorge.\n---\n\nStelle dann 3 Fragen zum Brief:\n1. \"Welche Hauptdiagnose führte zur stationären Aufnahme?\"\n2. \"Welche Befunde bestätigten die Diagnose?\"\n3. \"Welche Therapie wurde durchgeführt und wie war der Verlauf?\"\n\nDANN simuliere einen Telefonanruf:\n\"Hier spricht Dr. Weber vom Labor. Die histologische Untersuchung der Gallenblase von Herrn Müller zeigt eine chronische Cholezystitis mit Cholesterolsteinen. Kein Hinweis auf Malignität. Der Befund ist unauffällig.\"\n\nFrage: \"Bitte fassen Sie den Telefonanruf zusammen.\"\n\nBewerte: Richtiges Verständnis, kurze präzise Antworten, keine überflüssigen Informationen.`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'comp-q1-correct', textDe: 'Frage 1 korrekt beantwortet', category: 'Textverständnis', weight: 2 },
        { id: 'comp-q2-correct', textDe: 'Frage 2 korrekt beantwortet', category: 'Textverständnis', weight: 2 },
        { id: 'comp-q3-correct', textDe: 'Frage 3 korrekt beantwortet', category: 'Textverständnis', weight: 2 },
        { id: 'comp-concise', textDe: 'Antworten kurz und präzise (kein überflüssiger Text)', category: 'Präzision', weight: 2 },
        { id: 'comp-phone', textDe: 'Telefonanruf korrekt zusammengefasst', category: 'Akustisches Verständnis', weight: 3 },
        { id: 'comp-terminology', textDe: 'Korrekte medizinische Terminologie verwendet', category: 'Fachsprache', weight: 2 },
      ]),
      maxTurns: 8,
    },
  });

  // Teil 6: Arzt-Arzt-Gespräch
  const t6Id = 'fsp-teil6-arzt-arzt';
  await prisma.simulationTemplate.upsert({
    where: { id: t6Id },
    update: {},
    create: {
      id: t6Id,
      domain: 'medicine',
      type: 'doctor_conversation',
      difficulty: 'advanced',
      titleDe: 'Arzt-Arzt-Gespräch: Fallvorstellung',
      titleTr: 'Doktor-Doktor Görüşmesi: Vaka Sunumu',
      descriptionDe: 'Stellen Sie der Oberärztin/dem Oberarzt einen Patientenfall in medizinischer Fachsprache vor. Hier ist die Fachsprache ausdrücklich gefordert. Medizinische Fehler werden NICHT bewertet – nur Ihre sprachliche Kompetenz.',
      descriptionTr: 'Başasistana bir hasta vakasını tıbbi terminoloji ile sunun. Burada tıbbi terimler açıkça beklenir. Tıbbi hatalar değerlendirilmez – sadece dil yetkinliğiniz.',
      systemPrompt: `Du bist ein Prüfer für die Fachsprachenprüfung (FSP).\n\nTEIL 6: ARZT-ARZT-GESPRÄCH (15-20 Minuten)\n\nDEINE ROLLE: Du spielst die Oberärztin Dr. Schmidt. Du erwartest eine strukturierte Fallvorstellung IN FACHSPRACHE.\n\nGib dem Kandidaten die Aufgabe:\n\"Bitte stellen Sie mir den Fall von Frau Müller vor. Sie hatten vorhin das Anamnesegespräch mit ihr. Berichten Sie mir bitte über die Patientin – in Fachsprache, wie Sie es unter Kollegen tun würden.\"\n\nERWARTETE INFORMATIONEN (in Fachsprache):\n- Patientenvorstellung: \"52-jährige Patientin, Vorstellung mit seit 3 Tagen bestehenden rechtsseitigen Oberbauchschmerzen...\"\n- Anamnese: Kolikartige Beschwerden, postprandiale Verstärkung, Ausstrahlung in die rechte Schulter\n- Begleitsymptome: Nausea, einmaliges Emesis, subfebrile Temperatur\n- Vorerkrankungen: Arterielle Hypertonie\n- Medikation: Ramipril 5mg\n- Allergien: Penicillinallergie\n- Verdachtsdiagnose: V.a. Cholezystolithiasis/akute Cholezystitis\n- Vorgeschlagene Diagnostik: Sonographie Abdomen, Labor (BB, CRP, Lipase, GGT, AP, Bilirubin)\n\nDEINE RÜCKFRAGEN:\n- \"Welche Differentialdiagnosen kämen noch in Frage?\"\n- \"Welche Bildgebung würden Sie anordnen?\"\n- \"Wie würden Sie die Patientin weiter behandeln?\"\n\nWICHTIG:\n- Bewerte NUR die sprachliche Kompetenz, NICHT das medizinische Wissen\n- Fachsprache ist hier GEFORDERT\n- Bewerte Flüssigkeit, Strukturiertheit, korrekten Einsatz von Fachtermini`,
      evaluationCriteria: JSON.stringify([]),
      checklist: JSON.stringify([
        { id: 'doc-conv-structure', textDe: 'Strukturierte Fallvorstellung', category: 'Struktur', weight: 3 },
        { id: 'doc-conv-terminology', textDe: 'Korrekte medizinische Fachsprache', category: 'Fachsprache', weight: 3 },
        { id: 'doc-conv-fluency', textDe: 'Flüssiges Sprechen', category: 'Sprachkompetenz', weight: 2 },
        { id: 'doc-conv-completeness', textDe: 'Vollständige Fallinformationen', category: 'Vollständigkeit', weight: 2 },
        { id: 'doc-conv-questions', textDe: 'Fachfragen verständlich beantwortet', category: 'Kommunikation', weight: 2 },
        { id: 'doc-conv-diagnosis', textDe: 'Verdachtsdiagnose in korrekter Fachsprache', category: 'Fachsprache', weight: 3 },
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
    { termDe: 'Cholezystitis', termTr: 'Safra kesesi iltihabı', contextDe: 'Gallenblasenentzündung', contextTr: 'Safra kesesi yangısı' },
    { termDe: 'Pneumonie', termTr: 'Zatürre', contextDe: 'Lungenentzündung', contextTr: 'Akciğer iltihabı' },
    { termDe: 'Appendizitis', termTr: 'Apandisit', contextDe: 'Blinddarmentzündung', contextTr: 'Apandis iltihabı' },
    { termDe: 'Fraktur', termTr: 'Kırık', contextDe: 'Knochenbruch', contextTr: 'Kemik kırığı' },
    // Verfahren
    { termDe: 'Cholezystektomie', termTr: 'Safra kesesi ameliyatı', contextDe: 'Operative Entfernung der Gallenblase', contextTr: 'Safra kesesi alınması' },
    { termDe: 'Laparoskopie', termTr: 'Karın dürbini', contextDe: 'Bauchspiegelung (minimalinvasiv)', contextTr: 'Karın içi görüntüleme' },
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

  console.log('FSP-Assistent Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
