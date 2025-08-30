import { app } from 'electron';
import { join } from 'path';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';

export class IconCache {
  private cacheDir: string;

  constructor() {
    // Create cache directory in user data folder
    this.cacheDir = join(app.getPath('userData'), 'icon-cache');
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private getIconFileName(url: string): string {
    // Create a hash of the URL to use as filename
    const hash = createHash('md5').update(url).digest('hex');
    const extension = this.getFileExtension(url);
    return `${hash}${extension}`;
  }

  private getFileExtension(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      
      if (pathname.includes('.jpg') || pathname.includes('.jpeg')) return '.jpg';
      if (pathname.includes('.png')) return '.png';
      if (pathname.includes('.gif')) return '.gif';
      if (pathname.includes('.webp')) return '.webp';
      if (pathname.includes('.svg')) return '.svg';
      
      // Default to .jpg if no extension found
      return '.jpg';
    } catch {
      return '.jpg';
    }
  }

  private getCachedIconPath(url: string): string {
    const fileName = this.getIconFileName(url);
    return join(this.cacheDir, fileName);
  }

  async getCachedIcon(url: string): Promise<string | null> {
    if (!url) return null;

    const cachedPath = this.getCachedIconPath(url);
    
    try {
      // Check if cached file exists
      await fs.access(cachedPath);
      
      // Return file:// URL for the cached icon
      return `file://${cachedPath}`;
    } catch {
      // File doesn't exist in cache
      return null;
    }
  }

  async downloadAndCacheIcon(url: string): Promise<string | null> {
    if (!url) return null;

    try {
      console.log('Downloading icon:', url);
      
      // Download the icon
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to download icon: ${response.status} ${response.statusText}`);
        return null;
      }

      const buffer = await response.arrayBuffer();
      const cachedPath = this.getCachedIconPath(url);

      // Save to cache
      await fs.writeFile(cachedPath, Buffer.from(buffer));
      
      console.log('Icon cached:', cachedPath);
      
      // Return file:// URL for the cached icon
      return `file://${cachedPath}`;
    } catch (error) {
      console.error('Error downloading/caching icon:', error);
      return null;
    }
  }

  async getOrDownloadIcon(url: string): Promise<string | null> {
    if (!url) return null;

    // First, try to get from cache
    const cachedIcon = await this.getCachedIcon(url);
    if (cachedIcon) {
      return cachedIcon;
    }

    // If not in cache, download and cache it
    return await this.downloadAndCacheIcon(url);
  }

  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      await Promise.all(
        files.map(file => fs.unlink(join(this.cacheDir, file)))
      );
      console.log('Icon cache cleared');
    } catch (error) {
      console.error('Error clearing icon cache:', error);
    }
  }

  async getCacheSize(): Promise<{ files: number; sizeBytes: number }> {
    try {
      const files = await fs.readdir(this.cacheDir);
      let totalSize = 0;

      for (const file of files) {
        const filePath = join(this.cacheDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return {
        files: files.length,
        sizeBytes: totalSize
      };
    } catch (error) {
      console.error('Error getting cache size:', error);
      return { files: 0, sizeBytes: 0 };
    }
  }
}
