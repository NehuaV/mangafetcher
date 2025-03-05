export type Chapter = {
  url: string;
  index: number;
  name: string;
};

export type ChapterImage = Chapter & {
  imageName: string;
  retryCount?: number;
};
