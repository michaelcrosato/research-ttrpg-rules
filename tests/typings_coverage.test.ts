import * as fs from 'fs';
import * as path from 'path';
import {
  SearchWorkerRequest,
  SearchWorkerResponse,
  GameRuleset,
  GameRulesetInternal,
  WorkerGame,
  InMemoryGameRuleset,
  RegistryData,
  RegistryNamesData,
  SearchFilters,
  WorkerStats,
  DatabaseStats,
  DictionaryGameEntry,
  CompactGameReference,
  DictionaryGameRef,
  DictionaryVectorMatch,
  AutocompleteGameResult,
  CompactGameSuggestion,
  DictionaryVectorEntry,
  DomainVectorGroup,
  DictionaryDomainResult,
  BGGSearchItem,
  BggMechanicMapping,
  HarvestState,
  InitRequest,
  SearchRequest,
  AutocompleteRequest,
  CompareRequest,
  DictionaryRequest,
  AddGameRequest,
  AddVectorRequest,
  ReadyResponse,
  SearchResultsResponse,
  AutocompleteResultsResponse,
  CompareResultsResponse,
  VectorDictionaryResultsResponse,
  DomainDictionaryResultsResponse,
  AddGameDoneResponse,
  ErrorResponse,
  SearchWorkerMessage,
} from '../src/types';

describe('TypeScript Typings Coverage and Verification', () => {
  const workerFilePath = path.join(__dirname, '../src/search-worker.ts');
  let workerContent = '';

  beforeAll(() => {
    workerContent = fs.readFileSync(workerFilePath, 'utf8');
  });

  test('Static Analysis: SearchWorkerRequest discriminated union covers all request types handled in search-worker.js', () => {
    // Locate the onmessage switch statement
    const switchRegex = /switch\s*\(\s*type\s*\)\s*\{([\s\S]*?)\}/;
    const match = workerContent.match(switchRegex);
    expect(match).toBeTruthy();
    const switchBody = match![1];

    // Find all cases: case 'xxx':
    const caseRegex = /case\s+'([^']+)'/g;
    let caseMatch;
    const handledRequestTypes: string[] = [];
    while ((caseMatch = caseRegex.exec(switchBody)) !== null) {
      handledRequestTypes.push(caseMatch[1]);
    }

    expect(handledRequestTypes.length).toBeGreaterThan(0);

    // List of allowed request types from SearchWorkerRequest union
    const allowedRequestTypes: SearchWorkerRequest['type'][] = [
      'init',
      'search',
      'autocomplete',
      'compare',
      'dictionary',
      'addGame',
      'addVector',
    ];

    // Assert that every handled request type in search-worker.js is present in the TS types union
    for (const requestType of handledRequestTypes) {
      expect(allowedRequestTypes).toContain(requestType);
    }

    // Verify all allowed types are handled
    for (const allowedType of allowedRequestTypes) {
      expect(handledRequestTypes).toContain(allowedType);
    }
  });

  test('Static Analysis: SearchWorkerResponse discriminated union covers all response types sent in search-worker.js', () => {
    // Find all occurrences of postMessage({ type: 'xxx' })
    const postMessageRegex = /postMessage\s*\(\s*\{\s*type:\s*'([^']+)'/g;
    let pmMatch;
    const sentResponseTypes = new Set<string>();
    while ((pmMatch = postMessageRegex.exec(workerContent)) !== null) {
      sentResponseTypes.add(pmMatch[1]);
    }

    expect(sentResponseTypes.size).toBeGreaterThan(0);

    const allowedResponseTypes: SearchWorkerResponse['type'][] = [
      'ready',
      'searchResults',
      'autocompleteResults',
      'compareResults',
      'dictionaryResults',
      'addGameDone',
      'error',
    ];

    for (const responseType of sentResponseTypes) {
      expect(allowedResponseTypes).toContain(responseType);
    }

    for (const allowedType of allowedResponseTypes) {
      expect(sentResponseTypes.has(allowedType)).toBe(true);
    }
  });

  test('Type-level Compatibility: SearchWorkerRequest assignability', () => {
    // The following declarations will cause compilation errors if type safety is violated.
    const initReq: InitRequest = {
      type: 'init',
      action: 'init',
      dbUrl: 'registry.json',
      payload: {
        dbUrl: 'registry.json',
        url: 'registry.json',
      },
    };
    const searchReq: SearchRequest = {
      type: 'search',
      action: 'search',
      filters: {
        searchTerm: 'D&D',
        medium: 'ttrpg',
        genre: 'Fantasy',
        minYear: 1974,
        maxYear: 2024,
        sort: 'title-asc',
      },
    };
    const autocompleteReq: AutocompleteRequest = {
      type: 'autocomplete',
      action: 'autocomplete',
      query: 'combat',
      autocompleteType: 'vector',
      payload: {
        query: 'combat',
        type: 'vector',
      },
    };
    const compareReq: CompareRequest = {
      type: 'compare',
      action: 'compare',
      gameIdA: 'dnd_1974',
      gameIdB: 'pathfinder_2009',
      payload: {
        gameIdA: 'dnd_1974',
        gameIdB: 'pathfinder_2009',
      },
    };
    const dictionaryReq: DictionaryRequest = {
      type: 'dictionary',
      action: 'dictionary',
      domain: 'combat',
      vector: 'combat.melee',
      payload: {
        domain: 'combat',
        vector: 'combat.melee',
      },
    };
    const addGameReq: AddGameRequest = {
      type: 'addGame',
      action: 'addGame',
      game: {
        game_id: 'test_game',
        title: 'Test Game',
        year: 2026,
        medium: 'ttrpg',
        primary_genre: 'Fantasy',
        subgenres: ['Adventure'],
        governed_vectors: ['combat.melee'],
        vector_explanations: { 'combat.melee': 'Test explanation' },
        description: 'Test desc',
        extract: 'Test ext',
      },
    };
    const addVectorReq: AddVectorRequest = {
      type: 'addVector',
      action: 'addVector',
      vector: 'combat.melee.tactical',
      payload: {
        vector: 'combat.melee.tactical',
      },
    };

    // Assigning to the union request types
    let unionRequest: SearchWorkerRequest;
    unionRequest = initReq;
    unionRequest = searchReq;
    unionRequest = autocompleteReq;
    unionRequest = compareReq;
    unionRequest = dictionaryReq;
    unionRequest = addGameReq;
    unionRequest = addVectorReq;

    // Verify alias SearchWorkerMessage is assignable
    const unionMessage: SearchWorkerMessage = unionRequest;
    expect(unionMessage.type).toBeDefined();
  });

  test('Type-level Compatibility: SearchWorkerResponse assignability', () => {
    const readyRes: ReadyResponse = {
      type: 'ready',
      action: 'init',
      success: true,
      stats: {
        totalGames: 10,
        totalTtrpgs: 5,
        totalBoardgames: 5,
        uniqueVectorsCount: 20,
        ttrpgCount: 5,
        boardGameCount: 5,
        uniqueVectors: 20,
      },
    };

    const dummyGame: GameRulesetInternal = {
      game_id: 'test_game',
      title: 'Test Game',
      year: 2026,
      medium: 'ttrpg',
      primary_genre: 'Fantasy',
      subgenres: ['Adventure'],
      governed_vectors: ['combat.melee'],
      vector_explanations: { 'combat.melee': 'Test explanation' },
      governed_vectors_set: new Set(['combat.melee']),
      description: 'Test desc',
      extract: 'Test ext',
    };

    const searchRes: SearchResultsResponse = {
      type: 'searchResults',
      action: 'search',
      results: [dummyGame],
      totalCount: 1,
      total: 1,
      latencyMs: 12.34,
    };

    const autocompleteRes: AutocompleteResultsResponse = {
      type: 'autocompleteResults',
      action: 'autocomplete',
      suggestions: ['combat.melee'],
      results: ['combat.melee'],
      latencyMs: 1.2,
    };

    const compareRes: CompareResultsResponse = {
      type: 'compareResults',
      action: 'compare',
      gameA: dummyGame,
      gameB: dummyGame,
      shared: ['combat.melee'],
      onlyA: [],
      onlyB: [],
      latencyMs: 0.5,
    };

    const dictVectorRes: VectorDictionaryResultsResponse = {
      type: 'dictionaryResults',
      action: 'dictionary',
      vector: 'combat.melee',
      results: [{ game_id: 'test', title: 'Test', medium: 'ttrpg', year: 2020 }],
      vectors: [{ game_id: 'test', title: 'Test', medium: 'ttrpg', year: 2020 }],
    };

    const dictDomainRes: DomainDictionaryResultsResponse = {
      type: 'dictionaryResults',
      action: 'dictionary',
      domain: 'combat',
      activeDomain: 'combat',
      results: [{ vector: 'combat.melee', games: [{ game_id: 'test', title: 'Test', medium: 'ttrpg', year: 2020 }] }],
      vectors: [{ vector: 'combat.melee', games: [{ game_id: 'test', title: 'Test', medium: 'ttrpg', year: 2020 }] }],
    };

    const addGameDoneRes: AddGameDoneResponse = {
      type: 'addGameDone',
      action: 'addGame',
      success: true,
      game: dummyGame,
      updatedStats: {
        totalGames: 11,
        totalTtrpgs: 6,
        totalBoardgames: 5,
        uniqueVectorsCount: 21,
      },
      stats: {
        totalGames: 11,
        uniqueVectors: 21,
      },
    };

    const errorRes: ErrorResponse = {
      type: 'error',
      action: 'search',
      error: 'Something went wrong',
    };

    // Assigning to union response types
    let unionResponse: SearchWorkerResponse;
    unionResponse = readyRes;
    unionResponse = searchRes;
    unionResponse = autocompleteRes;
    unionResponse = compareRes;
    unionResponse = dictVectorRes;
    unionResponse = dictDomainRes;
    unionResponse = addGameDoneRes;
    unionResponse = errorRes;

    expect(unionResponse.type).toBeDefined();
  });

  test('Alias coverage verification', () => {
    // Assert aliases point to the correct structures
    const workerGame: WorkerGame = {
      game_id: 'a',
      title: 'A',
      year: 2000,
      primary_genre: 'G',
      subgenres: [],
      governed_vectors: [],
      vector_explanations: {},
      governed_vectors_set: new Set(),
    };
    const inMemoryGame: InMemoryGameRuleset = workerGame;
    expect(inMemoryGame).toBe(workerGame);

    const stats: DatabaseStats = {
      totalGames: 1,
      totalTtrpgs: 1,
      totalBoardgames: 0,
      uniqueVectorsCount: 0,
      ttrpgCount: 1,
      boardGameCount: 0,
      uniqueVectors: 0,
    };
    const workerStats: WorkerStats = stats;
    expect(workerStats).toBe(stats);

    const compactRef: CompactGameReference = {
      game_id: 'a',
      title: 'A',
      medium: 'ttrpg',
      year: 2000,
    };
    const dictRef: DictionaryGameRef = compactRef;
    const vecMatch: DictionaryVectorMatch = compactRef;
    const dictGameEntry: DictionaryGameEntry = compactRef;
    expect(dictRef).toBe(compactRef);
    expect(vecMatch).toBe(compactRef);
    expect(dictGameEntry).toBe(compactRef);

    const suggestion: CompactGameSuggestion = {
      game_id: 'a',
      title: 'A',
    };
    const autoResult: AutocompleteGameResult = suggestion;
    expect(autoResult).toBe(suggestion);

    const domainGroup: DomainVectorGroup = {
      vector: 'v',
      games: [compactRef],
    };
    const dictDomainResult: DictionaryDomainResult = domainGroup;
    const dictVecEntry: DictionaryVectorEntry = domainGroup;
    expect(dictDomainResult).toBe(domainGroup);
    expect(dictVecEntry).toBe(domainGroup);
  });
});
