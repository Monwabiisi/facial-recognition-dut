// src/services/embeddingsStore.firestore.ts
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { EmbeddingsStore, EmbeddingEntry } from './embeddingsStore';

export class FirestoreEmbeddingsStore implements EmbeddingsStore {
  private collection = collection(db, 'embeddings');

  async addEmbedding(userId: string, embedding: number[]): Promise<void> {
    const userDoc = doc(this.collection, userId);
    const existingDoc = await getDoc(userDoc);
    
    if (existingDoc.exists()) {
      const data = existingDoc.data();
      const embeddings = data.embeddings || [];
      embeddings.push(embedding);
      await setDoc(userDoc, { embeddings });
    } else {
      await setDoc(userDoc, { embeddings: [embedding] });
    }
  }

  async getEmbeddings(userId: string): Promise<number[][] | null> {
    const userDoc = await getDoc(doc(this.collection, userId));
    if (!userDoc.exists()) return null;
    return userDoc.data().embeddings;
  }

  async getAllEmbeddings(): Promise<EmbeddingEntry[]> {
    const snapshot = await getDocs(this.collection);
    return snapshot.docs.map(doc => ({
      userId: doc.id,
      embeddings: doc.data().embeddings
    }));
  }

  async clearEmbeddings(userId: string): Promise<void> {
    await deleteDoc(doc(this.collection, userId));
  }
}
