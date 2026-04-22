import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

interface ComprobanteProps {
  usuario: { nombre: string; apellido: string; correo: string };
  compras: any[];
  numeroRecibo: string; 
  fecha: string;
  logoBase64: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', backgroundColor: '#ffffff' },
  receiptBox: {
    border: '1pt solid #000',
    flexDirection: 'row',
    height: 320, // Altura fija para imitar el bloque del ejemplo
  },
  sidebar: {
    width: 40,
    borderRight: '1pt solid #000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarText: {
    transform: 'rotate(-90deg)', // Texto vertical
    fontSize: 12,
    letterSpacing: 2,
    color: '#000',
  },
  mainContent: {
    flex: 1,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottom: '1pt solid #eaeaea',
    paddingBottom: 15,
    marginBottom: 20,
  },
  logoBox: { width: 140 },
  logo: { width: '100%' },
  headerInfo: { alignItems: 'flex-end' },
  title: { fontSize: 14 },
  subtitle: { fontSize: 10, color: '#666', marginTop: 2 },
  infoText: { fontSize: 11, marginTop: 8 },
  bodyContent: { flex: 1 },
  row: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
  label: { fontSize: 11, color: '#333', marginRight: 10 },
  value: { fontSize: 11 },
  observacionesBox: {
    border: '1pt solid #000',
    padding: 15,
    marginTop: 'auto',
    justifyContent: 'center',
  },
  observacionesText: { fontSize: 11 }
});

export const ComprobantePDF = ({ usuario, compras, numeroRecibo, fecha, logoBase64 }: ComprobanteProps) => {
  const plataforma = compras[0].plataforma || 'Plataforma de pago';
  const moneda = compras[0].moneda || 'ARS';
  const total = compras.reduce((acc, curr) => acc + Number(curr.montoCobrado), 0);
  const cursosNombres = compras.map(c => c.categoria?.titulo || 'Clase Flex Studio').join(', ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.receiptBox}>
          
          {/* Barra lateral con texto vertical */}
          <View style={styles.sidebar}>
            <Text style={styles.sidebarText}>Recibo original</Text>
          </View>

          {/* Contenido Principal */}
          <View style={styles.mainContent}>
            
            {/* Cabecera */}
            <View style={styles.headerRow}>
              <View style={styles.logoBox}>
                {logoBase64 ? (
                  <Image src={logoBase64} style={styles.logo} />
                ) : (
                  <Text style={{ fontSize: 18, fontWeight: 'bold' }}>FLEX STUDIO</Text>
                )}
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.title}>Comprobante interno de pago</Text>
                <Text style={styles.subtitle}>(no válido como factura)</Text>
                <Text style={styles.infoText}>Recibo N°:   {numeroRecibo}</Text>
                <Text style={styles.infoText}>Fecha:   {fecha}</Text>
              </View>
            </View>

            {/* Datos del pago */}
            <View style={styles.bodyContent}>
              <View style={styles.row}>
                <Text style={styles.label}>Nombre del alumno: </Text>
                <Text style={styles.value}>{usuario.nombre} {usuario.apellido}</Text>
              </View>

              <View style={{ ...styles.row, justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.label}>Plataforma: </Text>
                  <Text style={styles.value}>{plataforma}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.label}>Importe: </Text>
                  <Text style={styles.value}>${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })} {moneda}</Text>
                </View>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Curso: </Text>
                <Text style={styles.value}>{cursosNombres}</Text>
              </View>
            </View>

            {/* Caja de Observaciones */}
            <View style={styles.observacionesBox}>
              <Text style={styles.observacionesText}>
                Observaciones: Pago ingresado mediante {plataforma} a favor de Flex Studio.
              </Text>
            </View>

          </View>
        </View>
      </Page>
    </Document>
  );
};