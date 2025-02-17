import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// Définition des types pour les props
interface Grade {
  subject: string;
  score: number;
  hasScore: boolean; // Nouveau champ pour indiquer si la note existe
}

interface BulletinPDFProps {
  studentName: string;
  grades: Grade[];
  className: string;
  semesterName: string;
}

// Composant pour générer le document PDF
const BulletinPDF = ({
  studentName,
  grades,
  className,
  semesterName,
}: BulletinPDFProps) => {
  // Calculer la moyenne uniquement avec les notes existantes
  const validGrades = grades.filter((g) => g.hasScore);
  const average =
    validGrades.length > 0
      ? (
          validGrades.reduce((sum, grade) => sum + grade.score, 0) /
          validGrades.length
        ).toFixed(2)
      : "N/A";

  return (
    <Document>
      <Page style={styles.page}>
        {/* En-tête avec logo et informations de l'école */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              style={styles.logo}
              src="/logo.png" // Assurez-vous que le chemin est correct
            />
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.schoolName}>École Lama Academy</Text>
            <Text style={styles.slogan}>Excellence et Innovation</Text>
            <Text style={styles.schoolInfo}>Dakar, Sénégal</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.title}>Bulletin Scolaire</Text>

        <View style={styles.section}>
          <Text>Nom de l&apos;élève : {studentName}</Text>
          <Text>Classe : {className}</Text>
          <Text>Semestre : {semesterName}</Text>
          <Text>Date : {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeader}>Notes :</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCell}>Matière</Text>
              <Text style={styles.tableCell}>Note</Text>
            </View>
            {grades.map((grade, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{grade.subject}</Text>
                <Text
                  style={{
                    ...styles.tableCell,
                    ...(grade.hasScore ? {} : styles.missingGrade),
                  }}
                >
                  {grade.hasScore ? grade.score : "Non noté"}
                </Text>
              </View>
            ))}
            <View style={styles.tableRow}>
              <Text style={styles.tableCell}>Moyenne générale</Text>
              <Text style={styles.tableCell}>{average}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Styles pour le PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  header: {
    flexDirection: "row",
    marginBottom: 20,
    paddingBottom: 10,
  },
  headerLeft: {
    width: 100,
    marginRight: 20,
  },
  headerRight: {
    flex: 1,
    justifyContent: "center",
  },
  logo: {
    width: 80,
    height: 80,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2563eb", // Bleu
  },
  slogan: {
    fontSize: 12,
    color: "#4b5563", // Gris
    marginTop: 4,
    fontStyle: "italic",
  },
  schoolInfo: {
    fontSize: 10,
    color: "#4b5563",
    marginTop: 4,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    fontWeight: "bold",
    marginBottom: 20,
  },
  subHeader: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 20,
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableCell: {
    width: "50%",
    borderRightWidth: 1,
    padding: 5,
  },
  missingGrade: {
    color: "#666",
    fontStyle: "italic",
  },
});

export default BulletinPDF;
