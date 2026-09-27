import { CommandLanguage } from '@voice2flow/shared';
import { LanguagePack } from './types.js';
import { enLanguagePack } from './en/index.js';

export * from './types.js';
export { enLanguagePack };

const packs: Record<string, LanguagePack> = {
  en: enLanguagePack,
};

export function getLanguagePack(language: CommandLanguage = 'en'): LanguagePack {
  return packs[language] || enLanguagePack;
}
