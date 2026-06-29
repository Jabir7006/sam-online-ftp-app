/**
 * Represents a single item (file or folder) returned by the h5ai server.
 */
export interface H5aiItem {
  /** The URL path of the item (e.g. "/DHAKA-FLIX-7/Movies/") */
  href: string;
  /** Unix timestamp (in milliseconds) of the item's last modification */
  time: number;
  /** File size in bytes. `null` for directories. */
  size: number | null;
  /** Whether the item is managed by h5ai */
  managed: boolean;
  /** Whether the item has been fetched/indexed */
  fetched: boolean;
}

/**
 * Raw shape of the h5ai JSON API response.
 */
export interface H5aiApiResponse {
  items: H5aiItem[];
}
