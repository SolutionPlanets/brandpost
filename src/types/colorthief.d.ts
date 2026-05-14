declare module 'colorthief' {
  export function getPalette(
    sourceImage: HTMLImageElement | string,
    colorCount?: number,
    quality?: number
  ): Promise<[number, number, number][]>;
}
