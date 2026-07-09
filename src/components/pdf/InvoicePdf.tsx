import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export interface InvoicePdfData {
  school: {
    name: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    legalFooter?: string | null;
  };
  reference: string;
  status: string;
  issueDate: string | Date;
  dueDate: string | Date;
  schoolYear: string;
  student: {
    name: string;
    surname: string;
    className?: string | null;
    parentName?: string | null;
  };
  lines: {
    label: string;
    quantity: number;
    unitAmount: number;
  }[];
  total: number;
  paid: number;
  balance: number;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#C3EBFA",
  },
  schoolName: { fontSize: 18, fontWeight: "bold", marginBottom: 2 },
  schoolMeta: { fontSize: 9, color: "#666" },
  refBox: { textAlign: "right" },
  ref: { fontSize: 12, fontWeight: "bold" },
  status: { fontSize: 10, color: "#555", marginTop: 2 },
  meta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  metaCol: { width: "48%" },
  metaLabel: { fontSize: 9, color: "#888", marginBottom: 2 },
  metaValue: { fontSize: 11 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#F1F0FF",
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  cLabel: { width: "50%" },
  cQty: { width: "12%", textAlign: "right" },
  cPu: { width: "19%", textAlign: "right" },
  cTot: { width: "19%", textAlign: "right" },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: "50%", justifyContent: "space-between", paddingVertical: 3 },
  totalLabel: { color: "#555" },
  grand: { fontSize: 13, fontWeight: "bold" },
  footer: {
    marginTop: 40,
    fontSize: 9,
    color: "#888",
    textAlign: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
});

const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
const fdate = (d: string | Date) => new Date(d).toLocaleDateString("fr-FR");

const InvoicePdf = ({ data }: { data: InvoicePdfData }) => {
  const { school, student } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
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
          <View style={styles.refBox}>
            <Text style={styles.ref}>{data.reference}</Text>
            <Text style={styles.status}>Statut : {data.status}</Text>
          </View>
        </View>

        <View style={styles.meta}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Facturé à</Text>
            <Text style={styles.metaValue}>
              {student.surname} {student.name}
            </Text>
            {student.className ? (
              <Text style={styles.schoolMeta}>Classe : {student.className}</Text>
            ) : null}
            {student.parentName ? (
              <Text style={styles.schoolMeta}>Parent : {student.parentName}</Text>
            ) : null}
          </View>
          <View style={[styles.metaCol, { alignItems: "flex-end" }]}>
            <Text style={styles.metaLabel}>Année scolaire : {data.schoolYear}</Text>
            <Text style={styles.schoolMeta}>Émise le {fdate(data.issueDate)}</Text>
            <Text style={styles.schoolMeta}>Échéance : {fdate(data.dueDate)}</Text>
          </View>
        </View>

        <View style={styles.tableHead}>
          <Text style={styles.cLabel}>Libellé</Text>
          <Text style={styles.cQty}>Qté</Text>
          <Text style={styles.cPu}>PU</Text>
          <Text style={styles.cTot}>Total</Text>
        </View>
        {data.lines.map((l, i) => (
          <View style={styles.tableRow} key={i}>
            <Text style={styles.cLabel}>{l.label}</Text>
            <Text style={styles.cQty}>{l.quantity}</Text>
            <Text style={styles.cPu}>{fcfa(l.unitAmount)}</Text>
            <Text style={styles.cTot}>{fcfa(l.quantity * l.unitAmount)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.grand}>{fcfa(data.total)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Payé</Text>
            <Text>{fcfa(data.paid)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Solde restant</Text>
            <Text style={{ fontWeight: "bold" }}>{fcfa(data.balance)}</Text>
          </View>
        </View>

        {school.legalFooter ? (
          <Text style={styles.footer}>{school.legalFooter}</Text>
        ) : null}
      </Page>
    </Document>
  );
};

export default InvoicePdf;
