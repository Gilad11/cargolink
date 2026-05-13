import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer';
import { ManifestData } from '@/lib/types';

const S = StyleSheet.create({
  page:         { fontFamily: 'Helvetica', fontSize: 9, padding: 32, color: '#1e293b', backgroundColor: '#ffffff' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #1e40af' },
  logo:         { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e40af' },
  logoSub:      { fontSize: 8, color: '#64748b', marginTop: 2 },
  manifestNum:  { textAlign: 'right', fontSize: 8, color: '#64748b' },
  manifestVal:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginTop: 2 },

  section:      { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1e40af', marginBottom: 6, paddingBottom: 3, borderBottom: '1px solid #e2e8f0' },

  row:          { flexDirection: 'row', marginBottom: 3 },
  label:        { width: 120, color: '#64748b' },
  value:        { flex: 1, fontFamily: 'Helvetica-Bold', color: '#1e293b' },

  // Summary boxes
  summaryRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryBox:   { flex: 1, border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, backgroundColor: '#f8fafc' },
  summaryNum:   { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1e293b', marginBottom: 2 },
  summaryLabel: { fontSize: 7, color: '#64748b' },

  // Table
  table:        { marginBottom: 14 },
  tableHeader:  { flexDirection: 'row', backgroundColor: '#1e40af', color: 'white', padding: '5 6', borderRadius: '4 4 0 0' },
  tableRow:     { flexDirection: 'row', padding: '4 6', borderBottom: '1px solid #f1f5f9' },
  tableRowAlt:  { flexDirection: 'row', padding: '4 6', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' },
  tableFooter:  { flexDirection: 'row', padding: '5 6', backgroundColor: '#e2e8f0', borderRadius: '0 0 4 4' },
  th:           { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: 'white' },
  td:           { fontSize: 8, color: '#1e293b' },
  tdBold:       { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#1e293b' },

  // DG Section
  dgSection:    { marginBottom: 14, border: '1px solid #fecaca', borderRadius: 6, overflow: 'hidden' },
  dgHeader:     { backgroundColor: '#fef2f2', padding: '5 8', borderBottom: '1px solid #fecaca' },
  dgTitle:      { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#dc2626' },
  dgRow:        { flexDirection: 'row', padding: '4 8', borderBottom: '1px solid #fef2f2' },

  // Footer
  footer:       { position: 'absolute', bottom: 20, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 6 },
  footerText:   { fontSize: 7, color: '#94a3b8' },

  // Status badge
  approved:     { backgroundColor: '#dcfce7', color: '#166534', padding: '1 5', borderRadius: 3, fontSize: 7.5 },

  dgBadge:      { backgroundColor: '#fef2f2', color: '#dc2626', padding: '1 5', borderRadius: 3, fontSize: 7.5, fontFamily: 'Helvetica-Bold' },
});

// Column widths for cargo table
const COL = { num: '4%', desc: '26%', unit: '14%', cat: '12%', qty: '6%', dim: '14%', wt: '9%', dg: '5%', status: '10%' };

export function ManifestDocument({ data }: { data: ManifestData }) {
  const { flight, cargo, totalWeight, totalPackages, dgCount, generatedAt, manifestNumber } = data;
  const dgItems = cargo.filter(c => c.containsDG);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={S.page}>

        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.logo}>CargoLink</Text>
            <Text style={S.logoSub}>Israel ↔ UAE Cargo Management System</Text>
          </View>
          <View>
            <Text style={S.manifestNum}>MANIFEST NUMBER</Text>
            <Text style={S.manifestVal}>{manifestNumber}</Text>
            <Text style={[S.manifestNum, { marginTop: 4 }]}>Generated: {generatedAt}</Text>
          </View>
        </View>

        {/* Flight Information */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>FLIGHT INFORMATION</Text>
          <View style={{ flexDirection: 'row', gap: 40 }}>
            <View style={{ flex: 1 }}>
              <View style={S.row}><Text style={S.label}>Flight Number:</Text><Text style={S.value}>{flight.flightNumber}</Text></View>
              <View style={S.row}><Text style={S.label}>Aircraft Type:</Text><Text style={S.value}>{flight.aircraftType}</Text></View>
              <View style={S.row}><Text style={S.label}>Route:</Text><Text style={S.value}>{flight.departureAirport} → {flight.destinationAirport}</Text></View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={S.row}><Text style={S.label}>Departure Date:</Text><Text style={S.value}>{flight.departureDate}</Text></View>
              <View style={S.row}><Text style={S.label}>Departure Time:</Text><Text style={S.value}>{flight.departureTime} (UAE Time)</Text></View>
              {flight.arrivalTime ? <View style={S.row}><Text style={S.label}>Arrival Time:</Text><Text style={S.value}>{flight.arrivalTime} (UAE Time)</Text></View> : null}
              <View style={S.row}><Text style={S.label}>Coordinator:</Text><Text style={S.value}>{flight.coordinatorName || '—'}</Text></View>
            </View>
            <View style={{ flex: 1 }}>
              <View style={S.row}><Text style={S.label}>Status:</Text><Text style={S.value}>APPROVED</Text></View>
              <View style={S.row}><Text style={S.label}>Direction:</Text><Text style={S.value}>{flight.direction === 'IL_TO_UAE' ? 'Israel → UAE' : 'UAE → Israel'}</Text></View>
            </View>
          </View>
        </View>

        {/* Summary */}
        <View style={S.summaryRow}>
          <View style={S.summaryBox}>
            <Text style={S.summaryNum}>{cargo.length}</Text>
            <Text style={S.summaryLabel}>Total Cargo Items</Text>
          </View>
          <View style={S.summaryBox}>
            <Text style={S.summaryNum}>{totalWeight.toLocaleString()} KG</Text>
            <Text style={S.summaryLabel}>Total Weight</Text>
          </View>
          <View style={S.summaryBox}>
            <Text style={S.summaryNum}>{totalPackages}</Text>
            <Text style={S.summaryLabel}>Total Packages</Text>
          </View>
          <View style={[S.summaryBox, dgCount > 0 ? { backgroundColor: '#fef2f2', borderColor: '#fecaca' } : {}]}>
            <Text style={[S.summaryNum, dgCount > 0 ? { color: '#dc2626' } : {}]}>{dgCount}</Text>
            <Text style={S.summaryLabel}>Dangerous Goods</Text>
          </View>
        </View>

        {/* Cargo Table */}
        <View style={S.table}>
          <Text style={S.sectionTitle}>CARGO DETAILS</Text>
          {/* Table header */}
          <View style={S.tableHeader}>
            <Text style={[S.th, { width: COL.num }]}>#</Text>
            <Text style={[S.th, { width: COL.desc }]}>Cargo Description</Text>
            <Text style={[S.th, { width: COL.unit }]}>Unit / Org</Text>
            <Text style={[S.th, { width: COL.cat }]}>Category</Text>
            <Text style={[S.th, { width: COL.qty }]}>Qty</Text>
            <Text style={[S.th, { width: COL.dim }]}>Dimensions</Text>
            <Text style={[S.th, { width: COL.wt }]}>Weight</Text>
            <Text style={[S.th, { width: COL.dg }]}>DG</Text>
            <Text style={[S.th, { width: COL.status }]}>Status</Text>
          </View>
          {/* Rows */}
          {cargo.map((item, i) => (
            <View key={item.requestId} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
              <Text style={[S.td, { width: COL.num }]}>{i + 1}</Text>
              <Text style={[S.tdBold, { width: COL.desc }]}>{item.cargoDescription}</Text>
              <Text style={[S.td, { width: COL.unit }]}>{item.unit}</Text>
              <Text style={[S.td, { width: COL.cat }]}>{item.equipmentCategory}</Text>
              <Text style={[S.td, { width: COL.qty, textAlign: 'center' }]}>{item.packageCount}</Text>
              <Text style={[S.td, { width: COL.dim }]}>{item.packageDimensions}</Text>
              <Text style={[S.tdBold, { width: COL.wt }]}>{item.totalWeight} KG</Text>
              <Text style={[item.containsDG ? S.dgBadge : S.td, { width: COL.dg }]}>{item.containsDG ? 'YES' : 'No'}</Text>
              <Text style={[S.approved, { width: COL.status }]}>Approved</Text>
            </View>
          ))}
          {/* Footer total */}
          <View style={S.tableFooter}>
            <Text style={[S.tdBold, { flex: 1 }]}>TOTAL</Text>
            <Text style={[S.tdBold, { width: COL.wt, marginRight: '20%' }]}>{totalWeight.toLocaleString()} KG</Text>
          </View>
        </View>

        {/* DG Section */}
        {dgItems.length > 0 && (
          <View style={S.dgSection}>
            <View style={S.dgHeader}>
              <Text style={S.dgTitle}>⚠ DANGEROUS GOODS INFORMATION</Text>
            </View>
            {dgItems.map(item => (
              <View key={item.requestId} style={S.dgRow}>
                <Text style={[S.tdBold, { width: '30%' }]}>{item.cargoDescription}</Text>
                <Text style={[S.td, { width: '20%' }]}>Class: {item.dgClassification || '—'}</Text>
                <Text style={[S.td, { width: '30%' }]}>{item.dgDescription || '—'}</Text>
                <Text style={[S.td, { width: '20%', color: item.dgDocumentsUrl ? '#16a34a' : '#dc2626' }]}>
                  Docs: {item.dgDocumentsUrl ? 'Attached' : 'Missing'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>CargoLink — Israel ↔ UAE Cargo Management</Text>
          <Text style={S.footerText}>{manifestNumber} · {generatedAt}</Text>
          <Text style={S.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
