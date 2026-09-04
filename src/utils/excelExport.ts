import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

/**
 * Utility helper to export tabular data to CSV (Excel Compatible with UTF-8 BOM).
 * Directly opens native OS Share sheet so users can instantly send via WhatsApp,
 * open in Excel/Google Sheets, or save to Files/Drive without system folder prompts.
 */
export const exportToExcel = async (
  filename: string,
  headers: string[],
  rows: (string | number | undefined | null)[][]
) => {
  try {
    if (!rows || rows.length === 0) {
      Alert.alert('Export Excel', 'Tidak ada data untuk diekspor ke Excel.');
      return;
    }

    // Include UTF-8 BOM (\uFEFF) so Excel opens it with correct character encoding and columns
    const csvContent = '\uFEFF' + [
      headers.map(h => `"${String(h ?? '').replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    const file = new File(Paths.cache, `${sanitizedFilename}.csv`);
    file.write(csvContent);

    // Directly open native Share sheet (WhatsApp, Excel, Google Sheets, Save to Files, Email)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: `Export Excel - ${filename}`,
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Export Berhasil', `File CSV/Excel telah berhasil dibuat:\n${file.uri}`);
    }
  } catch (e: any) {
    Alert.alert('Error Export', e.message || 'Gagal mengekspor data ke Excel.');
  }
};
