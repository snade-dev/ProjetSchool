import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { ReportCardData } from "@/lib/reportCard";
import { observationKindLabel } from "@/lib/observation";

/**
 * E20 — Bulletin scolaire PDF (durci, S13).
 * Composant PUR : props (ReportCardData sérialisable) → rendu. AUCUN accès DB ici.
 * Sobre : noir + un filet lamaSky (#C3EBFA), lisible en impression N&B.
 */

const LAMA_SKY = "#C3EBFA";
const LAMA_SKY_LIGHT = "#EDF9FD";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#111" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: LAMA_SKY,
    marginBottom: 10,
  },
  logo: { width: 48, height: 48, borderRadius: 24, objectFit: "cover" },
  headerText: { flexGrow: 1 },
  schoolName: { fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  schoolMeta: { fontSize: 8, color: "#555" },
  title: {
    textAlign: "center",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  identity: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: LAMA_SKY_LIGHT,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  identityItem: { flexDirection: "column", gap: 2 },
  identityLabel: { fontSize: 8, color: "#555" },
  identityValue: { fontSize: 11, fontWeight: "bold" },
  table: { borderWidth: 1, borderColor: "#999" },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#CCC",
    alignItems: "center",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: LAMA_SKY,
    borderBottomWidth: 1,
    borderBottomColor: "#999",
  },
  th: {
    fontSize: 8,
    fontWeight: "bold",
    paddingVertical: 5,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  td: {
    fontSize: 9,
    paddingVertical: 4,
    paddingHorizontal: 4,
    textAlign: "center",
  },
  colSubject: { width: "22%", textAlign: "left" },
  colNote: { width: "10%" },
  colAvg: { width: "12%" },
  colRank: { width: "10%" },
  colAppreciation: { width: "24%", textAlign: "left" },
  // W08 — variante pondérée : colonnes Coef et Moy. × coef (§2.1.6)
  colSubjectW: { width: "18%", textAlign: "left" },
  colNoteW: { width: "9%" },
  colAvgW: { width: "10%" },
  colCoefW: { width: "6%" },
  colRankW: { width: "9%" },
  colAppreciationW: { width: "19%", textAlign: "left" },
  emptyBox: {
    borderWidth: 1,
    borderColor: "#999",
    padding: 24,
    textAlign: "center",
    fontSize: 11,
    color: "#555",
  },
  summary: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#999",
    backgroundColor: LAMA_SKY_LIGHT,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: { flexDirection: "column", gap: 2, alignItems: "center" },
  summaryLabel: { fontSize: 8, color: "#555" },
  summaryValue: { fontSize: 13, fontWeight: "bold" },
  // W15 — encadré « Observations » (§2.3.7) : observations partagées de la période
  observations: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#999",
    padding: 8,
  },
  observationsTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  observationLine: { fontSize: 8.5, marginBottom: 3, color: "#222" },
  observationMeta: { fontSize: 7.5, color: "#666" },
  signatures: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signBox: { width: "35%", textAlign: "center" },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: "#555",
    marginTop: 34,
    paddingTop: 4,
    fontSize: 9,
    color: "#333",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#888",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 6,
  },
});

/** Format d'une note /20 : « 12,50 » ou « — » si absente (jamais NaN). */
const fmtNote = (n: number | null | undefined): string =>
  n == null || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

/** Format d'un rang : « 1er », « 3e », « — » si non classé. */
const fmtRank = (rank: number | null | undefined): string =>
  rank == null ? "—" : rank === 1 ? "1er" : `${rank}e`;

const BulletinPDF = ({ data }: { data: ReportCardData }) => {
  const { school, student } = data;
  const hasGrades = data.subjects.length > 0;
  // W08 — bulletin pondéré (TRIMESTER…) : colonnes Coef et Moy. × coef.
  // Les classes MONTHLY (compositions sans coefficient, §2.3.1) gardent le
  // rendu d'origine.
  const weighted = data.weighted;
  const colSubject = weighted ? styles.colSubjectW : styles.colSubject;
  const colNote = weighted ? styles.colNoteW : styles.colNote;
  const colAvg = weighted ? styles.colAvgW : styles.colAvg;
  const colRank = weighted ? styles.colRankW : styles.colRank;
  const colAppreciation = weighted
    ? styles.colAppreciationW
    : styles.colAppreciation;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* En-tête établissement (SchoolSettings passé en props) */}
        <View style={styles.header}>
          {school?.logo ? (
            /* eslint-disable-next-line jsx-a11y/alt-text */
            <Image src={school.logo} style={styles.logo} />
          ) : null}
          <View style={styles.headerText}>
            <Text style={styles.schoolName}>
              {school?.name ?? "Établissement"}
            </Text>
            {school?.address ? (
              <Text style={styles.schoolMeta}>{school.address}</Text>
            ) : null}
            {school?.phone || school?.email ? (
              <Text style={styles.schoolMeta}>
                {[school?.phone, school?.email].filter(Boolean).join("  ·  ")}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.title}>
          {data.semester.title}
          {data.schoolYearName ? ` — ${data.schoolYearName}` : ""}
        </Text>

        {/* Bloc identité élève */}
        <View style={styles.identity}>
          <View style={styles.identityItem}>
            <Text style={styles.identityLabel}>Élève</Text>
            <Text style={styles.identityValue}>
              {student.surname} {student.name}
            </Text>
          </View>
          <View style={styles.identityItem}>
            <Text style={styles.identityLabel}>Classe</Text>
            <Text style={styles.identityValue}>{data.className}</Text>
          </View>
          <View style={styles.identityItem}>
            <Text style={styles.identityLabel}>Effectif</Text>
            <Text style={styles.identityValue}>{data.classSize} élèves</Text>
          </View>
          <View style={styles.identityItem}>
            <Text style={styles.identityLabel}>Édité le</Text>
            <Text style={styles.identityValue}>{data.generatedAt}</Text>
          </View>
        </View>

        {/* W09 — barème devoirs/composition affiché quand il diffère du 50/50
            historique (bulletins pondérés uniquement, §2.3.1 système 2/3) */}
        {weighted && data.homeworkWeight !== 50 ? (
          <Text style={{ fontSize: 7, color: "#888", marginBottom: 4 }}>
            Moyenne par matière : devoirs {data.homeworkWeight} % · composition{" "}
            {100 - data.homeworkWeight} %
          </Text>
        ) : null}

        {/* Tableau des matières */}
        {hasGrades ? (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, colSubject]}>Matière</Text>
              <Text style={[styles.th, colNote]}>Note classe</Text>
              <Text style={[styles.th, colNote]}>Note examen</Text>
              <Text style={[styles.th, colAvg]}>Moyenne /20</Text>
              {weighted && (
                <Text style={[styles.th, styles.colCoefW]}>Coef</Text>
              )}
              {weighted && (
                <Text style={[styles.th, styles.colAvgW]}>Moy. × coef</Text>
              )}
              <Text style={[styles.th, colAvg]}>Moy. classe</Text>
              <Text style={[styles.th, colRank]}>Rang</Text>
              <Text style={[styles.th, colAppreciation]}>Appréciation</Text>
            </View>
            {data.subjects.map((s) => (
              <View key={s.subjectId} style={styles.tableRow}>
                <Text style={[styles.td, colSubject]}>{s.subjectName}</Text>
                <Text style={[styles.td, colNote]}>
                  {fmtNote(s.classScore)}
                </Text>
                <Text style={[styles.td, colNote]}>
                  {fmtNote(s.examScore)}
                </Text>
                <Text style={[styles.td, colAvg, { fontWeight: "bold" }]}>
                  {fmtNote(s.average)}
                </Text>
                {weighted && (
                  <Text style={[styles.td, styles.colCoefW]}>
                    {s.coefficient}
                  </Text>
                )}
                {weighted && (
                  <Text style={[styles.td, styles.colAvgW]}>
                    {fmtNote(s.weightedAverage)}
                  </Text>
                )}
                <Text style={[styles.td, colAvg]}>
                  {fmtNote(s.classAverage)}
                </Text>
                <Text style={[styles.td, colRank]}>
                  {s.rank != null
                    ? `${fmtRank(s.rank)} / ${s.gradedCount}`
                    : "—"}
                </Text>
                <Text style={[styles.td, colAppreciation]}>
                  {s.appreciation ?? "—"}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyBox}>
            <Text>
              Aucune note enregistrée pour ce semestre dans cette classe.
            </Text>
          </View>
        )}

        {/* Pied : moyenne générale (pondérée si W08), rang général, mention */}
        <View style={styles.summary}>
          {weighted && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total coefficients</Text>
              <Text style={styles.summaryValue}>
                {data.totalCoefficient ?? "—"}
              </Text>
            </View>
          )}
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Moyenne générale</Text>
            <Text style={styles.summaryValue}>
              {fmtNote(data.generalAverage)} / 20
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Rang général</Text>
            <Text style={styles.summaryValue}>
              {data.generalRank != null
                ? `${fmtRank(data.generalRank)} / ${data.gradedStudentCount}`
                : "—"}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Mention</Text>
            <Text style={styles.summaryValue}>{data.mention ?? "—"}</Text>
          </View>
        </View>

        {/* W15 — Observations partagées de la période (§2.3.7) — jamais les
            confidentielles (filtrées en amont dans reportCard.ts, §2.7.8) */}
        {data.observations.length > 0 && (
          <View style={styles.observations}>
            <Text style={styles.observationsTitle}>Observations</Text>
            {data.observations.map((o, i) => (
              <Text key={i} style={styles.observationLine}>
                <Text style={styles.observationMeta}>
                  {o.date} · {observationKindLabel(o.kind)} —{" "}
                </Text>
                {o.content}
              </Text>
            ))}
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Le Directeur</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Le Parent</Text>
          </View>
        </View>

        {school?.legalFooter ? (
          <Text style={styles.footer}>{school.legalFooter}</Text>
        ) : null}
      </Page>
    </Document>
  );
};

export default BulletinPDF;
