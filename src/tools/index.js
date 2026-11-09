import { lazy } from 'react';
import PosterSplitter from './PosterSplitter';
const PdfMerge = lazy(() => import('./pdf-merge'));

// Yeni araç eklemek: klasör aç, buraya kayıt ekle. ready:false olanlar ana sayfada "Yakında" görünür.
export const tools = [
  { id: 'poster', path: '/poster-bolucu', titleKey: 'tool.poster.title', descKey: 'tool.poster.desc', component: PosterSplitter, ready: true },
  { id: 'pdf-merge', path: '/pdf-birlestirici', titleKey: 'tool.pdfMerge.title', descKey: 'tool.pdfMerge.desc', component: PdfMerge, ready: true },
  { id: 'crop', path: '/gorsel-kirpma', titleKey: 'tool.crop.title', descKey: 'tool.crop.desc', ready: false },
  { id: 'dpi', path: '/dpi', titleKey: 'tool.dpi.title', descKey: 'tool.dpi.desc', ready: false },
  { id: 'collage', path: '/kolaj', titleKey: 'tool.collage.title', descKey: 'tool.collage.desc', ready: false },
  { id: 'frame', path: '/cerceve', titleKey: 'tool.frame.title', descKey: 'tool.frame.desc', ready: false },
];
