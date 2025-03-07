import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface Grade {
  subject: string;
  score: number;
  classscore: number | null;
}

interface BulletinPDFProps {
  studentName: string;
  studentUserName: string;
  grades: Grade[];
  className: string;
  semesterName: string;
}

const BulletinPDF = ({
  studentName,
  studentUserName,
  grades,
  className,
  semesterName,
}: BulletinPDFProps) => {
  const average =
    grades.length > 0
      ? (
          grades.reduce(
            (sum, grade) => sum + (grade.score || 0) + (grade.classscore || 0),
            0
          ) / (grades.length * 2)
        ).toFixed(2)
      : "N/A";

  return (
    <Document>
      <Page style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerR}>
            <Text style={styles.schoolName}>École LS_School</Text>
            <Text style={styles.slogan}>Excellence et Innovation</Text>
            <Text style={styles.schoolInfo}>Bamako, Mali</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.title}>BULLETIN SCOLAIRE</Text>

        <View style={styles.studentInfo}>
          <Text style={styles.infoText}>Nom: {studentName}</Text>
          <Text style={styles.infoText}>Classe: {className}</Text>
          <Text style={styles.infoText}>Semestre: {semesterName}</Text>
          <Text style={styles.infoText}>
            Date: {new Date().toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>RÉSULTATS ACADÉMIQUES</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Matière</Text>
            <Text style={styles.tableHeaderCell}>Examen</Text>
            <Text style={styles.tableHeaderCell}>Classe</Text>
          </View>
          {grades.map((grade, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{grade.subject}</Text>
              <Text style={styles.tableCell}>{grade.score ?? "-"}</Text>
              <Text style={styles.tableCell}>{grade.classscore ?? "-"}</Text>
            </View>
          ))}
          <View style={styles.tableFooter}>
            <Text style={styles.tableFooterCell}>Moyenne Générale</Text>
            <Text style={styles.tableFooterCell}>{average}</Text>
          </View>
        </View>

        <View style={styles.signatureSection}>
          <Text style={styles.signatureText}>Le Directeur Pédagogique,</Text>
          {/* <Text style={styles.signatureText}>Dr. Lamine Dembele</Text> */}
          <View style={styles.signatureLine} />
        </View>
      </Page>
    </Document>
  );
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    backgroundColor: "#2B3A67",
    padding: 20,
    borderRadius: 8,
    color: "#FFFFFF",
    gap: 4,
  },
  headerR: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2B3A67",
    padding: 20,
    borderRadius: 8,
    color: "#FFFFFF",
  },
  schoolName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  slogan: {
    fontSize: 12,
    color: "#D6E4FF",
    fontStyle: "italic",
  },
  schoolInfo: {
    fontSize: 12,
    color: "#D6E4FF",
  },
  divider: {
    height: 2,
    backgroundColor: "#2B3A67",
    marginVertical: 15,
  },
  title: {
    fontSize: 28,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 20,
    color: "#2B3A67",
    textTransform: "uppercase",
  },
  studentInfo: {
    padding: 15,
    backgroundColor: "#F8FAFF",
    borderRadius: 6,
    borderLeftWidth: 5,
    borderLeftColor: "#2B3A67",
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: "#2D3748",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2B3A67",
    textAlign: "center",
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#2B3A67",
    padding: 10,
  },
  tableHeaderCell: {
    width: "33.33%",
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
  },
  tableCell: {
    width: "33.33%",
    textAlign: "center",
    color: "#4A5568",
    fontSize: 12,
  },
  tableFooter: {
    flexDirection: "row",
    backgroundColor: "#2B3A67",
    paddingVertical: 10,
  },
  tableFooterCell: {
    width: "50%",
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },
  signatureSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#CBD5E0",
  },
  signatureText: {
    fontSize: 12,
    color: "#4A5568",
    marginBottom: 5,
  },
  signatureLine: {
    width: 150,
    height: 1,
    backgroundColor: "#4A5568",
    marginTop: 10,
  },
});

export default BulletinPDF;