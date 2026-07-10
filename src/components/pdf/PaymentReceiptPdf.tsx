import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export interface PaymentReceiptData {
  receiptNo: string; // 8 premiers caractères du payment.id
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    legalFooter?: string | null;
  };
  student: { name: string; surname: string; className?: string | null };
  invoiceRef: string;
  amount: number; // FCFA
  methodLabel: string;
  date: string | Date;
  cashier: string;
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
  receiptTitle: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 14,
    marginBottom: 2,
  },
  receiptNo: {
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
    marginTop: 40,
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

const PaymentReceiptPdf = ({ data }: { data: PaymentReceiptData }) => {
  const { school, student } = data;
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

        <Text style={styles.receiptTitle}>REÇU DE PAIEMENT</Text>
        <Text style={styles.receiptNo}>N° {data.receiptNo}</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Élève</Text>
          <Text style={styles.value}>
            {student.surname} {student.name}
            {student.className ? `  (${student.className})` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Facture</Text>
          <Text style={styles.value}>{data.invoiceRef}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Date du paiement</Text>
          <Text style={styles.value}>{formatDate(data.date)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Méthode</Text>
          <Text style={styles.value}>{data.methodLabel}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Caissier</Text>
          <Text style={styles.value}>{data.cashier}</Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Montant encaissé</Text>
          <Text style={styles.amountValue}>{formatFCFA(data.amount)}</Text>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Le caissier</Text>
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLine}>Le payeur</Text>
          </View>
        </View>

        {school.legalFooter ? (
          <Text style={styles.footer}>{school.legalFooter}</Text>
        ) : null}
      </Page>
    </Document>
  );
};

export default PaymentReceiptPdf;
