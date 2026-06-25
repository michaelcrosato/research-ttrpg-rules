/// <reference lib="webworker" />

import type { GameRuleset, EmbeddingsWorkerRequest, EmbeddingsWorkerResponse } from './types';

const worker = self as unknown as DedicatedWorkerGlobalScope;

declare var transformers: any;

if (typeof importScripts !== 'undefined') {
  try {
    importScripts('transformers.min.js');
  } catch (err) {
    console.warn('Failed to load transformers.min.js:', err);
  }
}

function getCombinedText(game: GameRuleset): string {
  const titleRep = `${game.title} ${game.title} ${game.title}`;
  const desc = game.description || '';
  const subgenres = game.subgenres ? game.subgenres.join(' ') : '';
  const vectorKeys = game.governed_vectors ? game.governed_vectors.join(' ') : '';
  const explanations = game.vector_explanations ? Object.values(game.vector_explanations).join(' ') : '';
  return `${titleRep} ${desc} ${subgenres} ${vectorKeys} ${explanations}`;
}

class TFIDFEngine {
  private documents: Array<{ gameId: string; tokens: string[] }> = [];
  private idf: Map<string, number> = new Map();
  private documentVectors: Map<string, Map<string, number>> = new Map();
  private stopWords: Set<string> = new Set([
    'a',
    'about',
    'above',
    'after',
    'again',
    'against',
    'all',
    'am',
    'an',
    'and',
    'any',
    'are',
    'arent',
    'as',
    'at',
    'be',
    'because',
    'been',
    'before',
    'being',
    'below',
    'between',
    'both',
    'but',
    'by',
    'cant',
    'cannot',
    'could',
    'couldnt',
    'did',
    'didnt',
    'do',
    'does',
    'doesnt',
    'doing',
    'dont',
    'down',
    'during',
    'each',
    'few',
    'for',
    'from',
    'further',
    'had',
    'hadnt',
    'has',
    'hasnt',
    'have',
    'havent',
    'having',
    'he',
    'hed',
    'hell',
    'hes',
    'her',
    'here',
    'heres',
    'hers',
    'herself',
    'him',
    'himself',
    'his',
    'how',
    'hows',
    'i',
    'id',
    'ill',
    'im',
    'ive',
    'if',
    'in',
    'into',
    'is',
    'isnt',
    'it',
    'its',
    'itself',
    'lets',
    'me',
    'more',
    'most',
    'mustnt',
    'my',
    'myself',
    'no',
    'nor',
    'not',
    'of',
    'off',
    'on',
    'once',
    'only',
    'or',
    'other',
    'ought',
    'our',
    'ours',
    'ourselves',
    'out',
    'over',
    'own',
    'same',
    'shant',
    'she',
    'shed',
    'shell',
    'shes',
    'should',
    'shouldnt',
    'so',
    'some',
    'such',
    'than',
    'that',
    'thats',
    'the',
    'their',
    'theirs',
    'them',
    'themselves',
    'then',
    'there',
    'theres',
    'these',
    'they',
    'theyd',
    'theyll',
    'theyre',
    'theyve',
    'this',
    'those',
    'through',
    'to',
    'too',
    'under',
    'until',
    'up',
    'very',
    'was',
    'wasnt',
    'we',
    'wed',
    'well',
    'were',
    'weve',
    'werent',
    'what',
    'whats',
    'when',
    'whens',
    'where',
    'wheres',
    'which',
    'while',
    'who',
    'whos',
    'whom',
    'why',
    'whys',
    'with',
    'wont',
    'would',
    'wouldnt',
    'you',
    'youd',
    'youll',
    'youre',
    'youve',
    'your',
    'yours',
    'yourself',
    'yourselves',
  ]);

  tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s\.]/g, ' ')
      .split(/[\s]+/)
      .filter((t) => t.length > 1 && !this.stopWords.has(t));
  }

  addDocuments(games: GameRuleset[]): void {
    this.documents = [];
    this.idf.clear();
    this.documentVectors.clear();

    const df: Map<string, number> = new Map();

    const docTokensList = games.map((game) => {
      const titleRep = `${game.title} ${game.title} ${game.title}`;
      const desc = game.description || '';
      const subgenres = game.subgenres ? game.subgenres.join(' ') : '';
      const vectorKeys = game.governed_vectors ? game.governed_vectors.join(' ') : '';
      const explanations = game.vector_explanations ? Object.values(game.vector_explanations).join(' ') : '';

      const combinedText = `${titleRep} ${desc} ${subgenres} ${vectorKeys} ${explanations}`;
      const tokens = this.tokenize(combinedText);

      const uniqueTerms = new Set(tokens);
      uniqueTerms.forEach((term) => {
        df.set(term, (df.get(term) || 0) + 1);
      });

      return {
        gameId: game.game_id,
        tokens,
      };
    });

    const N = games.length;
    df.forEach((count, term) => {
      this.idf.set(term, Math.log(1 + N / (1 + count)));
    });

    docTokensList.forEach((doc) => {
      const termCounts: Map<string, number> = new Map();
      doc.tokens.forEach((token) => {
        termCounts.set(token, (termCounts.get(token) || 0) + 1);
      });

      const vector: Map<string, number> = new Map();
      let l2Sum = 0;

      termCounts.forEach((count, term) => {
        const tf = count;
        const idfVal = this.idf.get(term) || 0;
        const tfidf = tf * idfVal;
        vector.set(term, tfidf);
        l2Sum += tfidf * tfidf;
      });

      const l2Norm = Math.sqrt(l2Sum);

      const normalizedVector: Map<string, number> = new Map();
      if (l2Norm > 0) {
        vector.forEach((val, term) => {
          normalizedVector.set(term, val / l2Norm);
        });
      }

      this.documentVectors.set(doc.gameId, normalizedVector);
      this.documents.push(doc);
    });
  }

  query(queryText: string, topK: number = 10): Array<{ gameId: string; similarity: number }> {
    const queryTokens = this.tokenize(queryText);
    if (queryTokens.length === 0) {
      return [];
    }

    const queryTermCounts: Map<string, number> = new Map();
    queryTokens.forEach((token) => {
      queryTermCounts.set(token, (queryTermCounts.get(token) || 0) + 1);
    });

    const queryVector: Map<string, number> = new Map();
    let queryL2Sum = 0;

    queryTermCounts.forEach((count, term) => {
      const tf = count;
      const idfVal = this.idf.get(term) || 0;
      const tfidf = tf * idfVal;
      queryVector.set(term, tfidf);
      queryL2Sum += tfidf * tfidf;
    });

    const queryL2Norm = Math.sqrt(queryL2Sum);
    if (queryL2Norm === 0) {
      return [];
    }

    const normalizedQueryVector: Map<string, number> = new Map();
    queryVector.forEach((val, term) => {
      normalizedQueryVector.set(term, val / queryL2Norm);
    });

    const scores: Array<{ gameId: string; similarity: number }> = [];

    this.documentVectors.forEach((docVec, gameId) => {
      let dotProduct = 0;
      normalizedQueryVector.forEach((qVal, term) => {
        const dVal = docVec.get(term) || 0;
        dotProduct += qVal * dVal;
      });

      if (dotProduct > 0) {
        scores.push({ gameId, similarity: dotProduct });
      }
    });

    scores.sort((a, b) => b.similarity - a.similarity);

    return scores.slice(0, topK);
  }
}

const engine = new TFIDFEngine();
let initialized = false;
let extractor: any = null;
let useTransformers = false;
const gameEmbeddings: Array<{ gameId: string; embedding: number[] }> = [];

function dotProduct(a: number[], b: number[]): number {
  let dot = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

function l2Normalize(v: number[]): number[] {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  const norm = Math.sqrt(sum);
  if (norm === 0) return v;
  return v.map((x) => x / norm);
}

worker.onmessage = async (e: MessageEvent) => {
  const data = e.data || {};
  const type = data.type;

  if (type === 'init') {
    try {
      let registryData = data.registryData;
      if (!registryData) {
        try {
          const response = await fetch('../registry.json');
          if (response.ok) {
            registryData = await response.json();
          } else {
            const resp2 = await fetch('registry.json');
            if (resp2.ok) {
              registryData = await resp2.json();
            } else {
              throw new Error(`fetch status: ${response.status}`);
            }
          }
        } catch (fetchErr) {
          throw new Error(
            `Failed to load registry: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`
          );
        }
      }

      if (registryData) {
        const gamesList: GameRuleset[] = [];
        if (registryData.ttrpg) gamesList.push(...registryData.ttrpg);
        if (registryData.board_game) gamesList.push(...registryData.board_game);

        try {
          if (typeof transformers !== 'undefined') {
            transformers.env.allowLocalModels = false;
            extractor = await transformers.pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

            gameEmbeddings.length = 0;
            for (const game of gamesList) {
              const text = getCombinedText(game);
              const output = await extractor(text, { pooling: 'mean', normalize: true });
              const embedding = l2Normalize(Array.from(output.data) as number[]);
              gameEmbeddings.push({ gameId: game.game_id, embedding });
            }
            useTransformers = true;
          } else {
            throw new Error('transformers is undefined');
          }
        } catch (transErr) {
          console.warn('Failed to load transformers, falling back to TF-IDF engine:', transErr);
          useTransformers = false;
          engine.addDocuments(gamesList);
        }

        initialized = true;
        worker.postMessage({ type: 'ready' });
      } else {
        throw new Error('No registry data found to initialize semantic search worker.');
      }
    } catch (err: any) {
      worker.postMessage({ type: 'error', message: err.message || String(err) });
    }
  } else if (type === 'query') {
    if (!initialized) {
      worker.postMessage({ type: 'error', message: 'Embeddings worker is not initialized.' });
      return;
    }
    const queryText = data.queryText || '';
    const topK = data.topK || 10;

    if (useTransformers && extractor) {
      try {
        const output = await extractor(queryText, { pooling: 'mean', normalize: true });
        const queryEmbedding = l2Normalize(Array.from(output.data) as number[]);

        const matches = gameEmbeddings.map((ge) => {
          const similarity = dotProduct(queryEmbedding, ge.embedding);
          return { gameId: ge.gameId, similarity };
        });

        matches.sort((a, b) => b.similarity - a.similarity);
        worker.postMessage({ type: 'queryResults', matches: matches.slice(0, topK) });
      } catch (queryErr: any) {
        console.warn('Transformers query failed, falling back to TF-IDF:', queryErr);
        const matches = engine.query(queryText, topK);
        worker.postMessage({ type: 'queryResults', matches });
      }
    } else {
      const matches = engine.query(queryText, topK);
      worker.postMessage({ type: 'queryResults', matches });
    }
  }
};

export {};
