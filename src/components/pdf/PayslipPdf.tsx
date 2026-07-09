import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export interface PayslipData {
  payslipNo: string; // 8 premiers caractères du salaryPayment.id
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    legalFooter?: string | null;
  };
  employee: { name: string; surname: string; position: string };
  monthLabel: string; // "Janvier"
  year: number;
  baseAmount: number;
  bonuses: number;
  deductions: number;
  netAmount: number;
  methodLabel: string;
  paidAt?: string | Date | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12, fontFamily: "Helvetica" },
  header: {
    textAlign: "center",
    marginBottom: 6,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#C3EBFA",
  },
  schoolName: { fontSize: 20, fontWeight: "bold", marginBottom: 2 },
  schoolMeta: { fontSize: 10, color: "#666" },
  title: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 2,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 11,
    color: "#555",
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  label: { color: "#555" },
  value: { fontWeight: "bold" },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 4,
  },
  amountBox: {
    marginTop: 22,
    padding: 14,
    backgroundColor: "#EDF9FD",
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 12, color: "#333" },
  amountValue: { fontSize: 18, fontWeight: "bold" },
  deductionValue: { fontWeight: "bold", color: "#B91C1C" },
  footer: {
    marginTop: 40,
    fontSize: 9,
    color: "#888",
    textAlign: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  signatures: {
    marginTop: 50,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signBox: { width: "40%", textAlign: "center" },
  signLine: {
    borderTopWidth: 1,
    borderTopColor: "#999",
    marginTop: 30,
    paddingTop: 4,
    fontSize: 10,
    color: "#555",
  },
});

const formatFCFA = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("fr-FR");

const PayslipPdf = ({ data }: { data: PayslipData }) => {
  const { school, employee } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{school.name}</Text>
          {school.address ? (
            <Text style={styles.schoolMeta}>{school.address}</Text>
          ) : null}
          {school.phone || school.email ? (
            <Text style={styles.schoolMeta}>
              {[school.phone, school.email].filter(Boolean).join("  ·  ")}
            </Text>
          ) : null}
        </View>

        <Text style={styles.title}>BULLETIN DE PAIE</Text>
        <Text style={styles.subtitle}>
          {data.monthLabel} {data.year} — N° {data.payslipNo}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Employé</Text>
          <Text style={styles.value}>
            {employee.surname} {employee.name}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Poste</Text>
          <Text style={styles.value}>{employee.position}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Période</Text>
          <Text style={styles.value}>
            {data.monthLabel} {data.year}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Détail de la rémunération</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Salaire de base</Text>
          <Text style={styles.value}>{formatFCFA(data.baseAmount)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Primes</Text>
          <Text style={styles.value}>+ {formatFCFA(data.bonuses)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Retenues</Text>
          <Text style={styles.deductionValue}>
            − {formatFCFA(data.deductions)}
          </Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Net à payer</Text>
          <Text style={styles.amountValue}>{formatFCFA(data.netAmount)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Paiement</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Méthode</Text>
          <Text style={styles.value}>{data.methodLabel}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date de paiement</Text>
          <Text style={styles.value}>
            {data.paidAt ? formatDate(data.paidAt) : "—"}
          </Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>L'employeur</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>L'employé</Text>
          </View>
        </View>

        {school.legalFooter ? (
          <Text style={styles.footer}>{school.legalFooter}</Text>
        ) : null}
      </Page>
    </Document>
  );
};

export default PayslipPdf;
