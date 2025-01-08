import React from 'react';
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
} from '@react-pdf/renderer';

// Définition des types pour les props
interface Grade {
  subject: string;
  score: number;
}

interface BulletinPDFProps {
  studentName: string;
  grades: Grade[];
}



// Composant pour générer le document PDF
const BulletinPDF = ({ studentName, grades }: BulletinPDFProps) => (
  <Document>
    <Page style={styles.page}>
      <Text style={styles.header}>Bulletin Scolaire</Text>

      <View style={styles.section}>
        <Text>Nom de l&apos;élève : {studentName}</Text>
        <Text>Date : {new Date().toLocaleDateString()}</Text>
      </View>

      <View style={styles.section}>
        <Text>Notes :</Text>
        <View style={styles.table}>
          <View style={[styles.row, { fontWeight: 'bold' }]}>
            <Text style={styles.cell}>Matière</Text>
            <Text style={styles.cell}>Note</Text>
            <Text style={styles.cell}>Commentaires</Text>
          </View>
          {grades.map((grade, index) => (
            <View key={index} style={styles.row}>
              <Text style={styles.cell}>{grade.subject}</Text>
              <Text style={styles.cell}>{grade.score}</Text>
            </View>
          ))}
        </View>
      </View>
    </Page>
  </Document>
);

// Styles pour le PDF
const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: 12,
    },
    header: {
      fontSize: 16,
      marginBottom: 10,
      textAlign: 'center',
      fontWeight: 'bold',
    },
    section: {
      marginBottom: 15,
    },
    table: {
      display: 'flex',
      flexDirection: 'column',
      marginTop: 10,
    },
    row: {
      flexDirection: 'row',
      borderBottom: '1px solid #ddd',
      paddingBottom: 4,
      marginBottom: 4,
    },
    cell: {
      flex: 1,
      textAlign: 'center',
    },
  });

export default BulletinPDF;
