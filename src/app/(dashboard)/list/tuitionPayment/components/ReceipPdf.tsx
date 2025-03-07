import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Styles modernisés
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 12,
    color: "#555",
  },
  section: {
    marginBottom: 15,
    paddingBottom: 5,
    borderBottom: "1px solid #ddd",
  },
  studentInfo: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  table: {
    marginTop: 10,
    border: "1px solid #ddd",
    borderRadius: 5,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    flexDirection: "row",
    padding: 8,
    fontWeight: "bold",
    borderBottom: "1px solid #ddd",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #eee",
  },
  tableCell: {
    flex: 1,
    textAlign: "center",
  },
  total: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "right",
  },
});

// Définition des types
interface TuitionPayment {
  month: number;
  amount: number;
  paymentDate: Date;
}

interface StudentInfo {
  name: string;
  surname: string;
  className: string;
}

interface ReceiptPDFProps {
  student: StudentInfo;
  payments: TuitionPayment[];
  year: number;
}

const monthNames = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const ReceiptPDF = ({ student, payments, year }: ReceiptPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>École Primaire Lama</Text>
        <Text style={styles.subtitle}>Reçu de paiement de scolarité</Text>
        <Text style={styles.subtitle}>Année scolaire : {year}</Text>
      </View>

      {/* Informations de l'élève */}
      <View style={styles.section}>
        <Text style={styles.studentInfo}>
          {student.surname} {student.name}
        </Text>
        <Text>Classe : {student.className}</Text>
      </View>

      {/* Tableau des paiements */}
      <View style={styles.table}>
        {/* En-tête du tableau */}
        <View style={styles.tableHeader}>
          <Text style={styles.tableCell}>Date</Text>
          <Text style={styles.tableCell}>Mois</Text>
          <Text style={styles.tableCell}>Montant</Text>
        </View>

        {/* Lignes des paiements */}
        {payments.map((payment, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCell}>
              {new Date(payment.paymentDate).toLocaleDateString("fr-FR")}
            </Text>
            <Text style={styles.tableCell}>
              {monthNames[payment.month - 1]}
            </Text>
            <Text style={styles.tableCell}>
              {payment.amount} FCFA
            </Text>
          </View>
        ))}
      </View>

      {/* Total payé */}
      <Text style={styles.total}>
        Total payé :{" "}
        {payments.reduce((sum, p) => sum + p.amount, 0)} FCFA
      </Text>
    </Page>
  </Document>
);

export default ReceiptPDF;
