import crowd from '../../../../public/images/Concert-Quoc-Gia.jpg';
import stage from '../../../../public/images/083A0326-Web.jpg';
import arena from '../../../../public/images/atsh-concert-1753259796-8984-1753260121-2839-4949.jpg';
import type { StaticImageData } from 'next/image';
const placeholders: Record<string, StaticImageData> = {
  '/images/Concert-Quoc-Gia.jpg': crowd,
  '/images/083A0326-Web.jpg': stage,
  '/images/atsh-concert-1753259796-8984-1753260121-2839-4949.jpg': arena,
};
export function imageBlur(src: string) {
  return placeholders[src]?.blurDataURL;
}
