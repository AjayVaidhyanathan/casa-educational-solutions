import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from './firebase';

export const DOC_TYPES = [
  { key: 'passport',    label: 'Passport / ID',           hint: 'Colour scan, all pages' },
  { key: 'studentId',   label: 'Student ID',              hint: 'Front side visible' },
  { key: 'enrolment',   label: 'Proof of Enrolment',      hint: 'Issued by your university' },
  { key: 'incomeProof', label: 'Proof of Income / Funds', hint: 'Bank statement or scholarship letter' },
] as const;

export type DocKey = (typeof DOC_TYPES)[number]['key'];

export interface DocRecord {
  url: string;
  name: string;
  uploadedAt: string;
  size: number;
}

export type DocsMap = Partial<Record<DocKey, DocRecord>>;

export function uploadDocument(
  uid: string,
  docKey: DocKey,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<DocRecord> {
  const storageRef = ref(storage, `documents/${uid}/${docKey}/${Date.now()}_${file.name}`);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          const record: DocRecord = {
            url,
            name: file.name,
            uploadedAt: new Date().toISOString(),
            size: file.size,
          };
          await updateDoc(doc(db, 'users', uid), { [`documents.${docKey}`]: record });
          resolve(record);
        } catch (e) {
          reject(e);
        }
      },
    );
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
