/**
 * Find the common prefix of multiple strings
 */
export function findCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    if (strings.length === 1) return strings[0];

    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        while (strings[i].indexOf(prefix) !== 0) {
            prefix = prefix.substring(0, prefix.length - 1);
            if (prefix === '') return '';
        }
    }
    return prefix.trim();
}

/**
 * Extract base filename without extension
 */
export function getBaseName(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
}

/**
 * Generate filename-safe string
 */
export function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9_\-]/gi, '_');
}
