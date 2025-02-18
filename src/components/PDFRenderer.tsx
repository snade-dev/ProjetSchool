"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

interface PDFRendererProps {
  studentName: string;
  grades: Array<{
    subject: string;
    score: number;
    hasScore: boolean;
  }>;
  className: string;
  semesterName: string;
}

const PDFRenderer = ({
  studentName,
  grades,
  className,
  semesterName,
}: PDFRendererProps) => {
  const styles = StyleSheet.create({
    // vos styles existants
  });

  return (
    <Document>
      <Page>
        <View>
          <Text>Student Report Card</Text>
          <Text>Student: {studentName}</Text>
          <Text>Class: {className}</Text>
          <Text>Semester: {semesterName}</Text>
          
          {grades.map((grade, index) => (
            <View key={index}>
              <Text>{grade.subject}: {grade.hasScore ? `${grade.score}%` : 'N/A'}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export default PDFRenderer;
