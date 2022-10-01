// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
// Run `pnpm run download-resources` to regenerate.
// To overwrite this, please overwrite download.ts
import en from './en.json';
import zh_Hans from './zh-Hans.json';
import zh_Hant from './zh-Hant.json';
import sr from './sr.json';
import fr from './fr.json';
import bn from './bn.json';

export const LOCALES = [
    {
        id: 1000016008,
        name: 'English',
        tag: 'en',
        originalName: 'English',
        flagEmoji: '🇬🇧',
        base: true,
        completeRate: 1,
        res: en,
    },
    {
        id: 1000016009,
        name: 'Simplified Chinese',
        tag: 'zh-Hans',
        originalName: '简体中文',
        flagEmoji: '🇨🇳',
        base: false,
        completeRate: 1,
        res: zh_Hans,
    },
    {
        id: 1000016012,
        name: 'Traditional Chinese',
        tag: 'zh-Hant',
        originalName: '繁體中文',
        flagEmoji: '🇭🇰',
        base: false,
        completeRate: 1,
        res: zh_Hant,
    },
    {
        id: 1000034005,
        name: 'Serbian',
        tag: 'sr',
        originalName: 'српски',
        flagEmoji: '🇷🇸',
        base: false,
        completeRate: 0.9166666666666666,
        res: sr,
    },
    {
        id: 1000034008,
        name: 'French',
        tag: 'fr',
        originalName: 'français',
        flagEmoji: '🇫🇷',
        base: false,
        completeRate: 1,
        res: fr,
    },
    {
        id: 1000034010,
        name: 'Bangla',
        tag: 'bn',
        originalName: 'বাংলা',
        flagEmoji: '🇧🇩',
        base: false,
        completeRate: 0.625,
        res: bn,
    },
] as const;
