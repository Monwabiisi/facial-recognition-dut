// src/services/embeddingsStore.ts
export type EmbeddingEntry = {
  userId: string;
  embeddings: number[][];
};

export interface EmbeddingsStore {
  addEmbedding(userId: string, embedding: number[]): Promise<void>;
  getEmbeddings(userId: string): Promise<number[][] | null>;
  getAllEmbeddings(): Promise<EmbeddingEntry[]>;
  clearEmbeddings(userId: string): Promise<void>;
}
