import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#FFF",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    textAlign: "center",
  },
  schoolName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "normal",
    color: "#555",
  },
  infoTable: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#F9F9F9",
    borderRadius: 4,
    border: "1px solid #E0E0E0",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  infoLabel: {
    width: "40%",
    fontWeight: "bold",
    color: "#333",
  },
  infoValue: {
    width: "60%",
    color: "#666",
  },
  questionBlock: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  questionText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  answerText: {
    fontSize: 12,
    color: "#555",
    marginBottom: 3,
  },
  answerScore: {
    fontSize: 12,
    color: "#888",
  },
});

export default function ResultPDF({
  questions,
  score,
  studentName,
  studentSurName,
}: {
  questions: any[];
  score: number;
  studentName: string;
  studentSurName: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>LSschool</Text>
          <Text style={styles.title}>La copie corrigée</Text>
        </View>

        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom de l'élève:</Text>
            <Text style={styles.infoValue}>
              {studentSurName} {studentName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Note totale:</Text>
            <Text style={styles.infoValue}>{score}/20</Text>
          </View>
        </View>

        {questions.map((question, index) => (
          <View key={question.id} style={styles.questionBlock} wrap={false}>
            <Text style={styles.questionText}>Question {index + 1}:</Text>
            <Text style={styles.questionText}>{question.questionText}</Text>
            <View>
              <Text style={styles.answerText}>
                Réponse:{" "}
                {question.StudentAnswer[0]?.answerText || "Aucune réponse"}
              </Text>
              <Text style={styles.answerScore}>
                Note: {question.StudentAnswer[0]?.score || "Aucune réponse"}
              </Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
