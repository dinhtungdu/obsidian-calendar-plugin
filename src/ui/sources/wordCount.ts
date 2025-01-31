import type { Moment } from "moment";
import { App, Setting, TFile } from "obsidian";
import { get } from "svelte/store";

import CalendarPlugin from "src/main";

import { getWordCount } from "../utils";
import { filledDot, filledDots } from "./utils";
import type {
  Granularity,
  ICalendarSource,
  IEvaluatedMetadata,
  ISourceSettings,
} from "../types";

const DEFAULT_WORDS_PER_DOT = 250;

interface IWordCountSettings extends ISourceSettings {
  wordsPerDot: number;
}

export async function getFileWordCount(note: TFile): Promise<number> {
  if (!note) {
    return 0;
  }
  const fileContents = await window.app.vault.cachedRead(note);
  return getWordCount(fileContents);
}

export class WordCountSource implements ICalendarSource {
  public id: string = "wordCount";
  public name: string = "Words";
  public description: string = "Visualize the word count of your daily note.";

  constructor(readonly app: App, readonly plugin: CalendarPlugin) {}

  public defaultSettings = Object.freeze({
    color: "var(--text-muted)",
    enabled: true,
    wordsPerDot: DEFAULT_WORDS_PER_DOT,
  });

  async getMetadata(granularity: Granularity, date: Moment): Promise<IEvaluatedMetadata> {
    const periodicNotes = this.app.plugins.getPlugin("periodic-notes");
    const exactMatch = periodicNotes.getPeriodicNote(granularity, date);
    const value: IEvaluatedMetadata = {
      dots: [],
      value: 0,
    };
    if (exactMatch) {
      const wordsPerDot =
        get(this.plugin.settings).sourceSettings["wordCount"]?.wordsPerDot ||
        DEFAULT_WORDS_PER_DOT;
      const wordCount = await getFileWordCount(exactMatch);
      const numDots = Math.floor(wordCount / wordsPerDot);
      if (numDots > 0) {
        value.dots.push(...filledDots(numDots));
      } else {
        value.dots.push(filledDot());
      }
    }
    return value;
  }
  public registerSettings(
    containerEl: HTMLElement,
    sourceSettings: IWordCountSettings,
    saveSettings: (settings: Partial<IWordCountSettings>) => void
  ) {
    new Setting(containerEl)
      .setName("Words per dot")
      .setDesc("How many words should be represented by a single dot?")
      .addText((textfield) => {
        textfield.inputEl.type = "number";
        textfield.setValue(String(sourceSettings.wordsPerDot));
        textfield.setPlaceholder(`e.g. ${DEFAULT_WORDS_PER_DOT}`);
        textfield.onChange((val) => {
          saveSettings({ wordsPerDot: val ? parseInt(val, 10) : DEFAULT_WORDS_PER_DOT });
        });
      });
  }
}
