import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { AnnualReportData } from "@/lib/annualReport";

/**
 * X07 — Bulletin de notes ANNUELLES, calqué sur le modèle fourni par l'école
 * (École Privée Daouda Mariko, juillet 2026) : tableau des compositions,
 * total/moyenne annuelle, classement, repères de classe, conduite à cocher,
 * observations/absences/retards, trois signatures.
 *
 * Composant PUR : props (AnnualReportData sérialisable) → rendu. AUCUN accès DB.
 * Sobre et lisible en photocopie noir & blanc, comme BulletinPDF (S13).
 */

const LAMA_SKY = "#C3EBFA";
const GREY_BG = "#EFEFEF";

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9.5, fontFamily: "Helvetica", color: "#111" },

  // ---- En-tête
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 54, height: 54, objectFit: "contain" },
  title: {
    flexGrow: 1,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: GREY_BG,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  officialLine: { fontSize: 8, color: "#555", textAlign: "center" },

  // ---- Bandeau identité
  identityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    gap: 16,
  },
  identityLeft: { width: "48%", gap: 4 },
  identityLine: { fontSize: 10 },
  identityBold: { fontWeight: "bold" },
  identityBox: {
    width: "48%",
    backgroundColor: GREY_BG,
    borderRadius: 10,
    padding: 10,
    gap: 5,
  },
  identityBoxRow: { flexDirection: "row" },
  identityBoxLabel: { width: 78, fontSize: 10 },
  identityBoxValue: { fontSize: 10, fontWeight: "bold" },

  // ---- Tableau des compositions
  table: { marginTop: 14, borderWidth: 1, borderColor: "#333" },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  trLast: { flexDirection: "row" },
  th: {
    fontSize: 9,
    fontWeight: "bold",
    paddingVertical: 5,
    paddingHorizontal: 4,
    textAlign: "center",
    backgroundColor: GREY_BG,
    borderRightWidth: 1,
    borderRightColor: "#333",
  },
  td: {
    fontSize: 9,
    paddingVertical: 4.5,
    paddingHorizontal: 4,
    textAlign: "center",
    borderRightWidth: 1,
    borderRightColor: "#333",
  },
  cCompo: { width: "32%" },
  cMonth: { width: "20%" },
  cAvg: { width: "20%" },
  cAppr: { width: "28%", borderRightWidth: 0 },

  // ---- Synthèse (total, moyenne annuelle, rang, décision + repères de classe)
  summary: { marginTop: 10, flexDirection: "row", gap: 10 },
  summaryLeft: { width: "56%", borderWidth: 1, borderColor: "#333" },
  summaryRight: { width: "44%", borderWidth: 1, borderColor: "#333" },
  sRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  sRowLast: { flexDirection: "row" },
  sLabel: {
    width: "52%",
    fontSize: 9,
    fontWeight: "bold",
    padding: 5,
    backgroundColor: GREY_BG,
    borderRightWidth: 1,
    borderRightColor: "#333",
  },
  sValue: { width: "48%", fontSize: 10, padding: 5, textAlign: "center" },
  sValueStrong: { fontWeight: "bold", color: "#1A56A8" },

  // ---- Conduite (cases à cocher du modèle)
  conductRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  conductLabel: { fontSize: 10, fontWeight: "bold" },
  conductItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  checkbox: {
    width: 11,
    height: 11,
    borderWidth: 1,
    borderColor: "#333",
    textAlign: "center",
    fontSize: 8,
    paddingTop: 1,
  },
  conductText: { fontSize: 9 },

  // ---- Observations / absences / retards
  obsHeader: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  obsHeaderItem: { fontSize: 10, fontWeight: "bold" },
  obsBox: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    minHeight: 78,
    padding: 8,
  },
  obsText: { fontSize: 9.5, lineHeight: 1.4 },

  // ---- Signatures
  signatures: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signBox: { width: "31%", alignItems: "center" },
  signLabel: { fontSize: 10, fontWeight: "bold" },
  signName: { fontSize: 8, color: "#555", marginTop: 2 },

  footer: {
    marginTop: 16,
    fontSize: 7.5,
    color: "#888",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 6,
  },
  accentRule: {
    height: 2,
    backgroundColor: LAMA_SKY,
    marginTop: 6,
  },
});

const CONDUCT_OPTIONS = [
  "Très-bonne",
  "Bonne",
  "Assez-bonne",
  "À améliorer",
  "Avertissement",
];

/** "8,89" — les documents officiels FR utilisent la virgule décimale. */
const fmt = (n: number | null | undefined, digits = 2) =>
  n == null ? "—" : n.toFixed(digits).replace(".", ",");

/** « 1er », « 2ème »… */
const ordinal = (n: number) => (n === 1 ? "1er" : `${n}ème`);

const AnnualBulletinPdf = ({ data }: { data: AnnualReportData }) => {
  const { school, student } = data;
  // La conduite saisie est comparée sans casse ni accent superflu : le libellé
  // stocké vient du même référentiel que CONDUCT_OPTIONS (formulaire X07).
  const conductNorm = (data.conduct ?? "").trim().toLowerCase();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ---- En-tête : logo + titre encadré */}
        <View style={styles.topBar}>
          {school?.logo ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={school.logo} style={styles.logo} />
          ) : (
            <View style={styles.logo} />
          )}
          <Text style={styles.title}>
            BULLETIN DE NOTES ANNUELLES {data.schoolYearName}
          </Text>
        </View>
        {school?.ministry || school?.academy ? (
          <Text style={styles.officialLine}>
            {[school?.ministry, school?.academy, school?.name]
              .filter(Boolean)
              .join(" — ")}
          </Text>
        ) : null}
        <View style={styles.accentRule} />

        {/* ---- Identité */}
        <View style={styles.identityRow}>
          <View style={styles.identityLeft}>
            <Text style={styles.identityLine}>
              <Text style={styles.identityBold}>Année Scolaire : </Text>
              {data.schoolYearName}
            </Text>
            <Text style={styles.identityLine}>
              <Text style={styles.identityBold}>Classe : </Text>
              {data.className}
            </Text>
            <Text style={styles.identityLine}>
              <Text style={styles.identityBold}>Prof. Titulaire : </Text>
              {data.mainTeacher ?? "—"}
            </Text>
          </View>
          <View style={styles.identityBox}>
            <View style={styles.identityBoxRow}>
              <Text style={styles.identityBoxLabel}>PRENOM :</Text>
              <Text style={styles.identityBoxValue}>{student.surname}</Text>
            </View>
            <View style={styles.identityBoxRow}>
              <Text style={styles.identityBoxLabel}>NOM :</Text>
              <Text style={styles.identityBoxValue}>{student.name}</Text>
            </View>
            <View style={styles.identityBoxRow}>
              <Text style={styles.identityBoxLabel}>N° Matricule :</Text>
              <Text style={styles.identityBoxValue}>{student.username}</Text>
            </View>
          </View>
        </View>

        {/* ---- Tableau des compositions / trimestres */}
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.cCompo]}>Compositions</Text>
            <Text style={[styles.th, styles.cMonth]}>Mois</Text>
            <Text style={[styles.th, styles.cAvg]}>Moyenne Obtenue</Text>
            <Text style={[styles.th, styles.cAppr]}>Appréciation</Text>
          </View>
          {data.periods.map((p, i) => {
            const last = i === data.periods.length - 1;
            return (
              <View key={p.semesterId} style={last ? styles.trLast : styles.tr}>
                <Text style={[styles.td, styles.cCompo]}>{p.name}</Text>
                <Text style={[styles.td, styles.cMonth]}>{p.month ?? "—"}</Text>
                <Text style={[styles.td, styles.cAvg]}>{fmt(p.average)}</Text>
                <Text style={[styles.td, styles.cAppr]}>
                  {p.appreciation ?? "—"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ---- Synthèse */}
        <View style={styles.summary}>
          <View style={styles.summaryLeft}>
            <View style={styles.sRow}>
              <Text style={styles.sLabel}>TOTAL ({data.gradedPeriods})</Text>
              <Text style={styles.sValue}>{fmt(data.total)}</Text>
            </View>
            <View style={styles.sRow}>
              <Text style={styles.sLabel}>Moyenne Annuelle de l&apos;élève</Text>
              <Text style={[styles.sValue, styles.sValueStrong]}>
                {fmt(data.annualAverage)}
              </Text>
            </View>
            <View style={styles.sRow}>
              <Text style={styles.sLabel}>Classement général</Text>
              <Text style={styles.sValue}>
                {data.rank != null
                  ? `${ordinal(data.rank)} sur ${data.gradedStudentCount}`
                  : "—"}
              </Text>
            </View>
            <View style={styles.sRowLast}>
              <Text style={styles.sLabel}>Décision</Text>
              <Text style={[styles.sValue, styles.sValueStrong]}>
                {data.annualDecision ?? "—"}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRight}>
            <View style={styles.sRow}>
              <Text style={styles.sLabel}>MOY. Plus forte</Text>
              <Text style={styles.sValue}>{fmt(data.classBest)}</Text>
            </View>
            <View style={styles.sRow}>
              <Text style={styles.sLabel}>MOY. Plus faible</Text>
              <Text style={styles.sValue}>{fmt(data.classWorst)}</Text>
            </View>
            <View style={styles.sRow}>
              <Text style={styles.sLabel}>MOY. de la Classe</Text>
              <Text style={styles.sValue}>{fmt(data.classAverage)}</Text>
            </View>
            <View style={styles.sRowLast}>
              <Text style={styles.sLabel}>Mention</Text>
              <Text style={styles.sValue}>{data.mention ?? "—"}</Text>
            </View>
          </View>
        </View>

        {/* ---- Conduite (cases à cocher, la saisie coche la bonne) */}
        <View style={styles.conductRow}>
          <Text style={styles.conductLabel}>Conduite :</Text>
          {CONDUCT_OPTIONS.map((opt) => (
            <View key={opt} style={styles.conductItem}>
              <Text style={styles.conductText}>{opt}</Text>
              <Text style={styles.checkbox}>
                {conductNorm === opt.toLowerCase() ? "X" : " "}
              </Text>
            </View>
          ))}
        </View>

        {/* ---- Observations / absences / retards */}
        <View style={styles.obsHeader}>
          <Text style={styles.obsHeaderItem}>Observations</Text>
          <Text style={styles.obsHeaderItem}>
            | Absences : {data.absences}
            {data.justifiedAbsences > 0
              ? ` (dont ${data.justifiedAbsences} justifiée${data.justifiedAbsences > 1 ? "s" : ""})`
              : ""}
          </Text>
          <Text style={styles.obsHeaderItem}>
            | Retards : {data.lateCount ?? "—"}
          </Text>
        </View>
        <View style={styles.obsBox}>
          <Text style={styles.obsText}>{data.annualObservation ?? ""}</Text>
        </View>

        {/* ---- Signatures */}
        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>Le Maître</Text>
            {data.mainTeacher ? (
              <Text style={styles.signName}>{data.mainTeacher}</Text>
            ) : null}
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>
              {school?.directorTitle ?? "La Direction"}
            </Text>
            {school?.directorName ? (
              <Text style={styles.signName}>{school.directorName}</Text>
            ) : null}
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>Le Parent</Text>
          </View>
        </View>

        {school?.legalFooter ? (
          <Text style={styles.footer}>{school.legalFooter}</Text>
        ) : (
          <Text style={styles.footer}>Édité le {data.generatedAt}</Text>
        )}
      </Page>
    </Document>
  );
};

export default AnnualBulletinPdf;
