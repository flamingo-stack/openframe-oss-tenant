/**
 * MeshCentral File Manager Binary Protocol Handler
 */

export class FileBinaryProtocol {
  private buffer = new Uint8Array(0);

  /**
   * Push new binary data into the accumulator and invoke callback for each full chunk.
   */
  push(data: ArrayBuffer, onChunk: (payload: Uint8Array, isFinal: boolean) => void): void {
    if (!data || (data.byteLength ?? 0) === 0) return;

    const incoming = new Uint8Array(data);
    const merged = new Uint8Array(this.buffer.length + incoming.length);
    merged.set(this.buffer);
    merged.set(incoming, this.buffer.length);
    this.buffer = merged;

    this.consume(onChunk);
  }

  private consume(onChunk: (payload: Uint8Array, isFinal: boolean) => void): void {
    while (this.buffer.length >= 4) {
      const headerValue = this.readHeader(this.buffer.subarray(0, 4));
      const totalLength = 4 + headerValue.length;

      if (this.buffer.length < totalLength) {
        return;
      }

      const payload = this.buffer.slice(4, totalLength);
      onChunk(payload, headerValue.final);
      this.buffer = this.buffer.slice(totalLength);
    }
  }

  private readHeader(headerBytes: Uint8Array): { length: number; final: boolean } {
    if (headerBytes.length < 4) {
      throw new Error('Incomplete binary header');
    }

    // Original protocol: bits 1-31 = length, bit 0 = final
    const raw = headerBytes[0] | (headerBytes[1] << 8) | (headerBytes[2] << 16) | (headerBytes[3] << 24);

    const final = (raw & 1) === 1;
    const length = raw >>> 1;

    return { length, final };
  }

  reset(): void {
    this.buffer = new Uint8Array(0);
  }

  /**
   * Helper to check if payload is binary
   */
  isBinaryData(data: any): boolean {
    return (
      data instanceof ArrayBuffer ||
      data instanceof Uint8Array ||
      (data && data.constructor && data.constructor.name === 'ArrayBuffer')
    );
  }
}
