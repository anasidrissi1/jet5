/**
 * exportExcel
 * @param {string} filename - name of the generated file (example: 'clients.xlsx')
 * @param {Array<Object>} data - array of objects to export (keys become columns)
 * @param {string} sheetName - optional worksheet name
 */
export default function exportExcel(filename, data = [], sheetName = 'Sheet1') {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('Export Excel: No data to export');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {
      import('xlsx')
        .then((XLSX) => {
          const worksheet = XLSX.utils.json_to_sheet(data);
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
          XLSX.writeFile(workbook, filename);
          resolve();
        })
        .catch((err) => {
          console.error('Erreur lors du chargement du module Excel:', err);
          reject(err);
        });
    } catch (err) {
      console.error('Erreur lors de l\'export Excel:', err);
      reject(err);
    }
  });
}
