import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { TransferCertificateData } from "@/lib/transferCertificate";

/**
 * X08 — Certificat de transfert, calqué sur le modèle fourni par l'école
 * (École Privée Daouda Mariko, juillet 2026) : logo + tutelle à gauche, devise
 * de la République à droite, titre souligné, corps rédigé, liste à puces des
 * appréciations, mention NB, lieu/date et signature du chef d'établissement.
 *
 * Composant PUR : props sérialisables → rendu. AUCUN accès DB.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#111",
    lineHeight: 1.5,
  },

  logoRow: { alignItems: "flex-start" },
  logo: { width: 62, height: 62, objectFit: "contain" },

  headings: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  headBlock: { width: "48%", alignItems: "center" },
  headStrong: {
    fontSize: 10.5,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 1.35,
  },
  headMeta: { fontSize: 9, textAlign: "center", color: "#333" },

  title: {
    marginTop: 26,
    marginBottom: 20,
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "center",
    textDecoration: "underline",
  },

  paragraph: { marginBottom: 9, textAlign: "left" },
  bold: { fontWeight: "bold" },

  bullets: { marginTop: 4, marginBottom: 10, paddingLeft: 14 },
  bulletRow: { flexDirection: "row", marginBottom: 4 },
  bulletDot: { width: 12, fontSize: 11 },
  bulletLabel: { fontWeight: "bold" },

  nb: { marginTop: 8, fontSize: 10.5, lineHeight: 1.45 },

  place: { marginTop: 26, textAlign: "right", fontSize: 11 },
  signature: {
    marginTop: 14,
    alignItems: "flex-end",
  },
  signTitle: { fontSize: 11, fontWeight: "bold" },
  signName: { fontSize: 10, color: "#333", marginTop: 2 },
  reference: {
    position: "absolute",
    bottom: 22,
    left: 48,
    fontSize: 8,
    color: "#999",
  },
});

/** « 9,04/20 » — virgule décimale des documents officiels FR. */
const fmtAverage = (n: number | null) =>
  n == null ? "—" : `${n.toFixed(2).replace(".", ",")}/20`;

/** Rang au féminin/masculin selon le sexe de l'élève : « 1ère » / « 1er ». */
const fmtRank = (rank: number | null, sex: string) => {
  if (rank == null) return "—";
  if (rank === 1) return sex === "FEMALE" ? "1ère" : "1er";
  return `${rank}ème`;
};

const TransferCertificatePdf = ({
  data,
}: {
  data: TransferCertificateData;
}) => {
  const { school, student } = data;
  const female = student.sex === "FEMALE";
  // « certifie que la nommée » / « le nommé »
  const named = female ? "la nommée" : "le nommé";
  // « Fille de X et de Y » / « Fils de … »
  const child = female ? "Fille" : "Fils";

  const bullets: { label: string; value: string | null }[] = [
    { label: "Travail", value: data.workAppreciation },
    { label: "Conduite", value: data.conduct },
    {
      label: "Nombre d'années de scolarité",
      value: `${data.yearsAttended} an${data.yearsAttended > 1 ? "s" : ""}`,
    },
    { label: "Décision du conseil des maîtres", value: data.decision },
    { label: "Motif de transfert", value: data.reason },
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {school?.logo ? (
          <View style={styles.logoRow}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={school.logo} style={styles.logo} />
          </View>
        ) : null}

        {/* ---- Tutelle à gauche, devise de la République à droite */}
        <View style={styles.headings}>
          <View style={styles.headBlock}>
            {school?.ministry ? (
              <Text style={styles.headStrong}>{school.ministry}</Text>
            ) : null}
            {school?.academy ? (
              <Text style={styles.headStrong}>{school.academy}</Text>
            ) : null}
            <Text style={styles.headStrong}>{school?.name ?? ""}</Text>
            {school?.address ? (
              <Text style={styles.headMeta}>{school.address}</Text>
            ) : null}
            {school?.phone ? (
              <Text style={styles.headMeta}>Tél. : {school.phone}</Text>
            ) : null}
          </View>
          <View style={styles.headBlock}>
            {school?.countryLine1 ? (
              <Text style={styles.headStrong}>{school.countryLine1}</Text>
            ) : null}
            {school?.countryLine2 ? (
              <Text style={styles.headMeta}>{school.countryLine2}</Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.title}>CERTIFICAT DE TRANSFERT</Text>

        <Text style={styles.paragraph}>
          Je soussigné(e){" "}
          <Text style={styles.bold}>{school?.directorName ?? "…"}</Text>,{" "}
          {school?.directorTitle ?? "Chef d'établissement"} de{" "}
          {school?.name ?? "l'établissement"}, certifie que {named} :{" "}
          <Text style={styles.bold}>
            {student.surname} {student.name}
          </Text>
        </Text>

        <Text style={styles.paragraph}>
          Né(e) le <Text style={styles.bold}>{student.birthday}</Text>
          {student.birthPlace ? (
            <>
              {" à "}
              <Text style={styles.bold}>{student.birthPlace}</Text>
            </>
          ) : null}
          .
        </Text>

        {data.father || data.mother ? (
          <Text style={styles.paragraph}>
            {child} de <Text style={styles.bold}>{data.father ?? "…"}</Text> et
            de <Text style={styles.bold}>{data.mother ?? "…"}</Text>
          </Text>
        ) : null}

        <Text style={styles.paragraph}>
          A fréquenté mon établissement du{" "}
          <Text style={styles.bold}>{data.attendedFrom}</Text> au{" "}
          <Text style={styles.bold}>{data.attendedTo}</Text>
        </Text>

        <Text style={styles.paragraph}>
          Classe : <Text style={styles.bold}>{data.className}</Text>. Moyenne
          annuelle : <Text style={styles.bold}>{fmtAverage(data.annualAverage)}</Text>
          {data.annualRank != null ? (
            <>
              {" rang : "}
              <Text style={styles.bold}>
                {fmtRank(data.annualRank, student.sex)}
              </Text>
              {data.classSize ? ` sur ${data.classSize}` : ""}
            </>
          ) : null}
        </Text>

        <View style={styles.bullets}>
          {bullets
            .filter((b) => b.value)
            .map((b) => (
              <View key={b.label} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>▪</Text>
                <Text>
                  <Text style={styles.bulletLabel}>{b.label}</Text> : {b.value}
                </Text>
              </View>
            ))}
        </View>

        <Text style={styles.nb}>
          NB : Ce certificat sert uniquement pour l&apos;admission provisoire de
          l&apos;enfant, l&apos;inscription n&apos;intervient qu&apos;après
          réception du dossier scolaire.
        </Text>

        <Text style={styles.place}>
          Fait à {school?.city ?? "…"}, le {data.issuedAt}
        </Text>

        <View style={styles.signature}>
          <Text style={styles.signTitle}>
            {school?.directorTitle ?? "Le Chef d'établissement"}
          </Text>
          {school?.directorName ? (
            <Text style={styles.signName}>{school.directorName}</Text>
          ) : null}
        </View>

        <Text style={styles.reference} fixed>
          Réf. {data.reference}
        </Text>
      </Page>
    </Document>
  );
};

export default TransferCertificatePdf;
