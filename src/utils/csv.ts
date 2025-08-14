/**
 * Generates a CSV file from an array of objects and triggers a download.
 * @param name The desired filename for the downloaded CSV.
 * @param rows The array of data objects to convert to CSV.
 */
export function downloadCsv(name: string, rows: Record<string, any>[]) {
  if (!rows || rows.length === 0) {
    console.warn("CSV download cancelled: No data provided.");
    return;
  }

  // Extract headers from the first object's keys
  const headers = Object.keys(rows[0]);

  // Function to safely escape values containing commas, quotes, or newlines
  const escapeCsvValue = (value: any): string => {
    const stringValue = String(value ?? ''); // Handle null/undefined
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Convert data to CSV format
  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      headers.map(header => escapeCsvValue(row[header])).join(',')
    )
  ].join('\n');

  // Create a Blob and trigger the download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', name);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
