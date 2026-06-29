import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { fetchDirectory } from '../api';
import type { H5aiItem } from '../types';
import MovieCard from '../components/MovieCard';

const COLORS = {
  bg: '#0D0D0D',
  surface: '#181818',
  border: '#2A2A2A',
  red: '#E50914',
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
};

// Start searching from these root directories
const ROOT_DIRS = [
  '/DHAKA-FLIX-7/English Movies/',
  '/DHAKA-FLIX-14/Hindi Movies/',
  '/DHAKA-FLIX-7/Animation Movies/',
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<H5aiItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [scannedFolders, setScannedFolders] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    // Cancel previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setIsSearching(true);
    setResults([]);
    setScannedFolders(0);

    const lowerQuery = searchQuery.toLowerCase();
    const foundItems = new Set<string>();
    
    // A simple queue for breadth-first traversal
    let queue: string[] = [...ROOT_DIRS];
    let activeRequests = 0;
    const MAX_CONCURRENT = 3; // Keep it low for 2GB RAM safety!

    return new Promise<void>((resolve) => {
      const processQueue = async () => {
        if (signal.aborted) {
          resolve();
          return;
        }

        if (queue.length === 0 && activeRequests === 0) {
          resolve();
          return;
        }

        while (queue.length > 0 && activeRequests < MAX_CONCURRENT && !signal.aborted) {
          const currentDir = queue.shift()!;
          activeRequests++;

          fetchDirectory(currentDir, signal, false)
            .then((items) => {
              if (signal.aborted) return;
              
              setScannedFolders(prev => prev + 1);

              const newResults: H5aiItem[] = [];
              const newFolders: string[] = [];

              for (const item of items) {
                const name = decodeURIComponent(item.href.split('/').filter(Boolean).pop() || '');
                
                // If it's a folder, we check if it matches the search, AND we might crawl it
                // We only crawl if it's not a root dir (already crawled)
                if (item.size === null) {
                  // Only push to queue if we haven't gone too deep.
                  // For movies, usually depth is Category -> Year -> Movie
                  const depth = item.href.split('/').filter(Boolean).length;
                  if (depth <= 4) { 
                     newFolders.push(item.href);
                  }

                  // If it's a movie folder and matches the search query!
                  if (name.toLowerCase().includes(lowerQuery) && !foundItems.has(item.href)) {
                     foundItems.add(item.href);
                     newResults.push(item);
                  }
                } else {
                  // It's a file. If it matches, we can add it (optional)
                  if (name.toLowerCase().includes(lowerQuery) && !foundItems.has(item.href)) {
                     foundItems.add(item.href);
                     newResults.push(item);
                  }
                }
              }

              if (newResults.length > 0) {
                setResults(prev => [...prev, ...newResults]);
              }

              // Add new subfolders to the front of the queue (DFS-ish behavior for faster perceived results)
              queue.unshift(...newFolders);
            })
            .catch(() => {
              // Ignore errors (e.g. 404s or aborts)
            })
            .finally(() => {
              activeRequests--;
              if (!signal.aborted) {
                processQueue(); // trigger next
              }
            });
        }
      };

      // Kick off the queue processors
      for (let i = 0; i < MAX_CONCURRENT; i++) {
        processQueue();
      }
    }).then(() => {
      if (!signal.aborted) {
        setIsSearching(false);
      }
    });
  }, []);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => {
      startSearch(query);
    }, 800);
    return () => clearTimeout(timer);
  }, [query, startSearch]);

  const handleItemPress = (item: H5aiItem) => {
    // If it's a movie folder, open it in the browse screen
    if (item.size === null) {
      const parts = item.href.split('/').filter(Boolean);
      const builtPath = '/browse/' + parts.join('/');
      router.push(builtPath as any);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={22} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search all movies..."
            placeholderTextColor={COLORS.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress / Status */}
      {query.length > 0 && (
        <View style={styles.statusContainer}>
          {isSearching ? (
             <View style={styles.searchingRow}>
               <ActivityIndicator size="small" color={COLORS.red} />
               <Text style={styles.statusText}>
                 Searching... (Scanned {scannedFolders} folders)
               </Text>
             </View>
          ) : (
             <Text style={styles.statusText}>
               Found {results.length} results
             </Text>
          )}
        </View>
      )}

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={item => item.href}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const name = decodeURIComponent(item.href.split('/').filter(Boolean).pop() || '');
          if (item.size === null) {
            return (
              <View style={styles.listItemWrapper}>
                <MovieCard 
                  href={item.href} 
                  title={name} 
                  onPress={() => handleItemPress(item)} 
                  width="100%"
                  height={100}
                  layout="list"
                />
              </View>
            );
          }
          // If it's a file, just render text or something (or use FileItem)
          return (
             <View style={styles.fileItem}>
                <MaterialCommunityIcons name="file-video" size={24} color="#29B6F6" />
                <Text style={styles.fileText} numberOfLines={1}>{name}</Text>
             </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    marginLeft: 8,
    height: '100%',
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  listContent: {
    padding: 12,
    paddingBottom: 40,
  },
  listItemWrapper: {
    marginBottom: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  fileText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  }
});
