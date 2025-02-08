import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 30,
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  score: {
    fontSize: 18,
    color: "#4A5568",
  },
  questionBlock: {
    marginBottom: 15,
    borderBottom: "1px solid #E2E8F0",
    paddingBottom: 10,
  },
  questionText: {
    fontSize: 14,
    fontWeight: "semibold",
    marginBottom: 5,
  },
  answerText: {
    fontSize: 12,
    color: "#718096",
  },
  answerScore: {
    fontSize: 12,
    color: "#000",
  },
});

export default function ResultPDF({
  questions,
  score,
}: {
  questions: any[];
  score: number;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>La copie corriger</Text>
          <Text style={styles.score}>Note total: {score}/20</Text>
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
                Note:{" "} {question.StudentAnswer[0]?.score || "Aucune réponse"}
              </Text>
            </View>
          </View>
        ))}
      </Page>
    </Document>
  );
}
