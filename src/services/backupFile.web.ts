export async function saveBackupFile(json: string, fileName: string): Promise<boolean> {
  const url = URL.createObjectURL(
    new Blob(
      [
        json,
      ],
      {
        type: 'application/json',
      },
    ),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) file.text().then(resolve, reject);
      else resolve(null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

// The browser has no app folder to keep a copy in
export function saveSafetyCopy(_json: string): void {}
