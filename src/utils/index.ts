//ADDED
import { getDatabase, getPages } from "@/lib/notion/client";
import { siteConfig } from "@/site.config";
import type { Block, BlockTypes } from "@/lib/interfaces";
import { PAGE_COLLECTION } from "@/constants";
import { slugify } from ".";

export { getFormattedDate } from "./date";
export { elementHasClass, toggleClass, rootHasDarkClass } from "./domElement";
// export { getAllPosts, sortMDByDate, getUniqueTags, getUniqueTagsWithCount } from "./post";
// export { generateToc } from "./generateToc";
export { generateToc, buildHeadings, slugify } from "./generateToc";
export type { TocItem } from "./generateToc";
export { getWebmentionsForUrl } from "./webmentions";

//utils.ts from otoyo's personal blog in lib has just one export of pathjoin that i moved here

export const pathJoin = (path: string, subPath: string) => {
  return (
    '/' +
    path
      .split('/')
      .concat(subPath.split('/'))
      .filter((p) => p)
      .join('/')
  )
}

//ADDED FROM HERE ON

export async function getCollections() {
  const { propertiesRaw } = await getDatabase();

  return propertiesRaw.Collection.select!.options.map(({ name }) => name).filter(
    (name) => name !== PAGE_COLLECTION,
  );
}


export async function getMenu(): Promise<{ title: string; path: string }[]> {
  const pages = await getPages();
  const collections = await getCollections();

  const collectionLinks = collections.map((name) => ({
    title: name,
    path: `/posts/collection/${slugify(name)}`,
  }));

  const pageLinks = pages
    .filter((page) => page.Rank) // Removes page with No Rank or Rank 0
    .sort((a, b) => a.Rank - b.Rank)
    .map((page) => ({
      title: page.Title,
      path: page.Slug === siteConfig.homePageSlug ? "/" : `/${page.Slug}`,
    }));

  return [...pageLinks, ...collectionLinks];
}

const BLOCKS_FOR_WORD_COUNT: BlockTypes[] = [
  "heading_1",
  "heading_2",
  "heading_3",
  "paragraph",
  "bulleted_list_item",
  "numbered_list_item",
  "to_do",
  "callout",
  "quote",
];

type ContentBlock = {
  content: string;
  children: ContentBlock[];
};
function getSupportedBlocks(blocks: Block[]): ContentBlock[] {
  return blocks
    .filter((block) => BLOCKS_FOR_WORD_COUNT.includes(block.Type))
    .map((block) => {
      if (block.Type === "heading_1" && block.Heading1) {
        return {
          content: block.Heading1.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.Heading1?.Children || []),
        };
      }
      if (block.Type === "heading_2" && block.Heading2) {
        return {
          content: block.Heading2.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.Heading2?.Children || []),
        };
      }
      if (block.Type === "heading_3" && block.Heading3) {
        return {
          content: block.Heading3.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.Heading3?.Children || []),
        };
      }
      if (block.Type === "paragraph" && block.Paragraph) {
        return {
          content: block.Paragraph.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.Paragraph?.Children || []),
        };
      }
      if (block.Type === "bulleted_list_item" && block.BulletedListItem) {
        return {
          content: block.BulletedListItem.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.BulletedListItem?.Children || []),
        };
      }
      if (block.Type === "numbered_list_item" && block.NumberedListItem) {
        return {
          content: block.NumberedListItem.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.NumberedListItem?.Children || []),
        };
      }
      if (block.Type === "to_do" && block.ToDo) {
        return {
          content: block.ToDo.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.ToDo?.Children || []),
        };
      }
      if (block.Type === "callout" && block.Callout) {
        return {
          content: block.Callout.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.Callout?.Children || []),
        };
      }
      if (block.Type === "quote" && block.Quote) {
        return {
          content: block.Quote.RichTexts.map((text) => text.PlainText).join(" "),
          children: getSupportedBlocks(block.Quote?.Children || []),
        };
      }

      return { content: "", children: [] };
    });
}

function generateTexts(contentBlocks: ContentBlock[]): string {
  return contentBlocks
    .map((block) => {
      return block.content + "\n" + generateTexts(block.children);
    })
    .join("\n");
}

export function getPageStats(blocks: Block[]) {
  const supportedBlocks = getSupportedBlocks(blocks);
  const pageText = generateTexts(supportedBlocks);

  const wordCount = pageText.split(" ").length;

  return {
    wordCount,
    readTime: `${Math.round((wordCount / 250) * 100) / 100} min`,
  };
}

