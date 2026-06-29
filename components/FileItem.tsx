import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { H5aiItem } from '../types';

// ─────────────────────────────────────────────
// Colour palette
// ─────────────────────────────────────────────
const COLORS = {
  bg: '#0D0D0D',
  surface: '#181818',
  surfaceHover: '#222222',
  border: '#2A2A2A',
  red: '#E50914',
  textPrimary: '#FFFFFF',
  textSecondary: '#9E9E9E',
  folderIcon: '#FFB300',
  videoIcon: '#29B6F6',
  fileIcon: '#66BB6A',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Format a Unix ms timestamp into a readable locale string */
function formatDate(unixMs: number): string {
  if (!unixMs) return '—';
  const d = new Date(unixMs);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

/** Format bytes into KB / MB / GB */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Extract the name portion from an href path */
function nameFromHref(href: string): string {
  // Remove trailing slash, then grab last segment
  const stripped = href.endsWith('/') ? href.slice(0, -1) : href;
  const rawName = stripped.split('/').filter(Boolean).pop() ?? href;
  try {
    return decodeURIComponent(rawName);
  } catch {
    return rawName;
  }
}

/** Detect if this is a video file by extension */
const VIDEO_EXTS = new Set([
  'mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'ts', 'mpg', 'mpeg',
]);
function isVideoFile(href: string): boolean {
  const ext = href.split('.').pop()?.toLowerCase() ?? '';
  return VIDEO_EXTS.has(ext);
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface FileItemProps {
  item: H5aiItem;
  onPress: (item: H5aiItem) => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const FileItem = React.memo<FileItemProps>(({ item, onPress }) => {
  const isFolder = item.size === null;
  const name = nameFromHref(item.href);
  const isVideo = !isFolder && isVideoFile(item.href);

  const iconName: React.ComponentProps<typeof MaterialCommunityIcons>['name'] = isFolder
    ? 'folder'
    : isVideo
    ? 'file-video'
    : 'file-document';

  const iconColor = isFolder ? COLORS.folderIcon : isVideo ? COLORS.videoIcon : COLORS.fileIcon;

  const handlePress = useCallback(() => onPress(item), [onPress, item]);

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.containerPressed]}
      onPress={handlePress}
      android_ripple={{ color: 'rgba(229,9,20,0.15)', borderless: false }}
    >
      {/* Icon container */}
      <View style={[styles.iconWrap, { backgroundColor: iconColor + '22' }]}>
        <MaterialCommunityIcons name={iconName} size={26} color={iconColor} />
      </View>

      {/* Text content */}
      <View style={styles.textWrap}>
        <Text style={styles.name} numberOfLines={2} ellipsizeMode="tail">
          {name}
        </Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="clock-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.meta}>{formatDate(item.time)}</Text>
          {!isFolder && item.size !== null && (
            <>
              <View style={styles.dot} />
              <MaterialCommunityIcons name="harddisk" size={12} color={COLORS.textSecondary} />
              <Text style={styles.meta}>{formatSize(item.size)}</Text>
            </>
          )}
          {isFolder && (
            <>
              <View style={styles.dot} />
              <Text style={[styles.meta, { color: COLORS.folderIcon }]}>Folder</Text>
            </>
          )}
        </View>
      </View>

      {/* Chevron */}
      {isFolder && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={COLORS.textSecondary}
          style={styles.chevron}
        />
      )}
    </Pressable>
  );
});

FileItem.displayName = 'FileItem';
export default FileItem;

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  containerPressed: {
    backgroundColor: COLORS.surfaceHover,
    transform: [{ scale: 0.985 }],
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  textWrap: {
    flex: 1,
    gap: 5,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textSecondary,
    marginHorizontal: 2,
  },
  chevron: {
    marginLeft: 8,
  },
});
